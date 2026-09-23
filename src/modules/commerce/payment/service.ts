import crypto from 'crypto';
import type { Knex } from 'knex';
import CommerceCheckoutService, { orderDto } from '../checkout/service';
import { fromMinorUnits, toMinorUnits } from './money';
import {
    createProviderOrder,
    findProviderOrderByReceipt,
    fetchProviderOrder,
    fetchProviderPayment,
    publicKeyId,
    verifyCheckoutSignature
} from './razorpay-provider';
import { creditReferralForPaidOrder, refundCreditRedemptionForOrder, reverseReferralForRefund } from '../referral/service';

type ProviderEntity = Record<string, unknown>;

export class CommercePaymentError extends Error {
    constructor(message: string, public readonly statusCode: number) {
        super(message);
        this.name = 'CommercePaymentError';
    }
}

function stringValue(value: unknown) {
    return typeof value === 'string' ? value : String(value ?? '');
}

function numberValue(value: unknown) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
}

async function paymentContextForCustomer(orderPublicId: string, customerId: number) {
    const context = await knexInstance('vsq_orders as o')
        .join('vsq_payment_attempts as p', 'p.order_id', 'o.id')
        .leftJoin('vsq_customers as c', 'c.id', 'o.customer_id')
        .select(
            'o.id as order_id', 'o.public_id as order_public_id', 'o.order_number',
            'o.customer_id', 'o.email_snapshot', 'o.phone_snapshot', 'o.grand_total',
            'o.currency', 'o.order_status', 'o.financial_status', 'o.payment_method',
            'p.id as payment_attempt_id', 'p.public_id as payment_attempt_public_id',
            'p.provider', 'p.provider_order_id', 'p.provider_payment_id',
            'p.status as payment_status', 'p.amount as payment_amount',
            'p.currency as payment_currency', 'c.first_name', 'c.last_name'
        )
        .where({ 'o.public_id': orderPublicId, 'o.customer_id': customerId, 'p.provider': 'RAZORPAY' })
        .orderBy('p.id', 'desc')
        .first();
    if (!context) throw new CommercePaymentError('Razorpay order was not found', 404);
    return context;
}

export async function paymentSessionForCustomer(orderPublicId: string, customerId: number) {
    const context = await paymentContextForCustomer(orderPublicId, customerId);
    if (!context.provider_order_id) {
        throw new CommercePaymentError('Razorpay order is not ready', 409);
    }
    if (context.financial_status === 'PAID') {
        throw new CommercePaymentError('Order is already paid', 409);
    }
    if (context.order_status === 'CANCELLED') {
        throw new CommercePaymentError('Order is no longer payable', 409);
    }
    return {
        provider: 'RAZORPAY',
        key_id: publicKeyId(),
        provider_order_id: context.provider_order_id,
        amount: toMinorUnits(context.payment_amount),
        currency: context.payment_currency,
        order_public_id: context.order_public_id,
        order_number: context.order_number,
        customer: {
            name: [context.first_name, context.last_name].filter(Boolean).join(' '),
            email: context.email_snapshot,
            contact: context.phone_snapshot || ''
        }
    };
}

export async function initializeRazorpayOrder(orderPublicId: string, customerId: number) {
    let context = await paymentContextForCustomer(orderPublicId, customerId);
    if (context.provider_order_id) return paymentSessionForCustomer(orderPublicId, customerId);

    const persistProviderOrder = async (providerOrder: ProviderEntity) => {
        const providerOrderId = stringValue(providerOrder.id);
        if (!providerOrderId) throw new Error('Razorpay did not return an order id');
        const expectedAmount = toMinorUnits(context.payment_amount);
        if (
            numberValue(providerOrder.amount) !== expectedAmount
            || stringValue(providerOrder.currency) !== stringValue(context.payment_currency)
        ) {
            throw new Error('Razorpay order amount or currency does not match');
        }
        await knexInstance('vsq_payment_attempts').where({ id: context.payment_attempt_id }).update({
            provider_order_id: providerOrderId,
            provider_receipt: String(context.order_number).slice(0, 40),
            provider_status: stringValue(providerOrder.status) || 'created',
            status: 'CREATED',
            failure_message: null,
            provider_metadata: JSON.stringify({
                amount: numberValue(providerOrder.amount),
                currency: providerOrder.currency,
                created_at: providerOrder.created_at
            }),
            updated_at: new Date()
        });
    };

    if (context.payment_status === 'CREATE_UNKNOWN') {
        try {
            const recovered = await findProviderOrderByReceipt(String(context.order_number));
            if (recovered) {
                await persistProviderOrder(recovered as unknown as ProviderEntity);
                return paymentSessionForCustomer(orderPublicId, customerId);
            }
            await knexInstance('vsq_payment_attempts').where({ id: context.payment_attempt_id }).update({
                status: 'CREATING', failure_message: null, updated_at: new Date()
            });
            context = await paymentContextForCustomer(orderPublicId, customerId);
        } catch {
            throw new CommercePaymentError('Unable to recover Razorpay checkout safely', 502);
        }
    }

    const claimed = await knexInstance('vsq_payment_attempts')
        .where({ id: context.payment_attempt_id, provider_order_id: null, status: 'CREATING' })
        .update({ status: 'PROVIDER_REQUESTED', updated_at: new Date() });
    if (!claimed) {
        context = await paymentContextForCustomer(orderPublicId, customerId);
        if (context.provider_order_id) return paymentSessionForCustomer(orderPublicId, customerId);
        throw new CommercePaymentError('Razorpay order is being initialized', 409);
    }

    try {
        const providerOrder = await createProviderOrder({
            amount: toMinorUnits(context.payment_amount),
            currency: String(context.payment_currency),
            receipt: String(context.order_number),
            notes: {
                vastriqo_order_id: String(context.order_public_id),
                payment_attempt_id: String(context.payment_attempt_public_id)
            }
        }) as unknown as ProviderEntity;
        await persistProviderOrder(providerOrder);
        return paymentSessionForCustomer(orderPublicId, customerId);
    } catch (error) {
        try {
            const recovered = await findProviderOrderByReceipt(String(context.order_number));
            if (recovered) {
                await persistProviderOrder(recovered as unknown as ProviderEntity);
                return paymentSessionForCustomer(orderPublicId, customerId);
            }
        } catch {
            // The unknown state is persisted below and retried through receipt reconciliation.
        }
        await knexInstance('vsq_payment_attempts').where({ id: context.payment_attempt_id }).update({
            status: 'CREATE_UNKNOWN',
            failure_message: error instanceof Error ? error.message.slice(0, 500) : 'Razorpay order creation failed',
            updated_at: new Date()
        });
        throw new CommercePaymentError('Unable to initialize Razorpay checkout', 502);
    }
}

async function insertTransaction(
    trx: Knex.Transaction,
    input: {
        paymentAttemptId: number;
        type: string;
        status: string;
        providerTransactionId: string;
        amount: unknown;
        currency: string;
        metadata?: Record<string, unknown>;
    }
) {
    await trx('vsq_payment_transactions')
        .insert({
            public_id: crypto.randomUUID(),
            payment_attempt_id: input.paymentAttemptId,
            type: input.type,
            status: input.status,
            provider_transaction_id: input.providerTransactionId,
            amount: input.amount,
            currency: input.currency,
            processed_at: new Date(),
            provider_metadata: JSON.stringify(input.metadata || {}),
            created_at: new Date(),
            updated_at: new Date()
        })
        .onConflict(['payment_attempt_id', 'provider_transaction_id', 'type'])
        .merge(['status', 'provider_metadata', 'processed_at', 'updated_at']);
}

async function markPaymentReview(
    trx: Knex.Transaction,
    payment: Record<string, unknown>,
    order: Record<string, unknown>,
    reason: string
) {
    const now = new Date();
    await trx('vsq_payment_attempts').where({ id: payment.id }).update({
        status: 'REVIEW',
        failure_message: reason.slice(0, 500),
        last_verified_at: now,
        updated_at: now
    });
    if (order.financial_status !== 'PAYMENT_REVIEW') {
        await trx('vsq_orders').where({ id: order.id }).update({
            financial_status: 'PAYMENT_REVIEW',
            updated_at: now,
            version: trx.raw('version + 1')
        });
        await creditReferralForPaidOrder(trx, Number(order.id));
        await trx('vsq_order_status_history').insert({
            order_id: order.id,
            status_type: 'FINANCIAL',
            from_status: order.financial_status,
            to_status: 'PAYMENT_REVIEW',
            reason,
            actor_type: 'SYSTEM',
            created_at: now
        });
    }
}

export async function finalizeCapturedPayment(input: {
    providerOrderId: string;
    providerPaymentId: string;
    amount: number;
    currency: string;
    method?: string;
    source: 'CALLBACK' | 'WEBHOOK' | 'RECONCILIATION';
}) {
    return knexInstance.transaction(async (trx) => {
        const payment = await trx('vsq_payment_attempts')
            .where({ provider: 'RAZORPAY', provider_order_id: input.providerOrderId })
            .forUpdate()
            .first();
        if (!payment) throw new CommercePaymentError('Payment attempt was not found', 404);

        const order = await trx('vsq_orders').where({ id: payment.order_id }).forUpdate().first();
        if (!order) throw new CommercePaymentError('Order was not found', 404);
        if (payment.status === 'CAPTURED' && payment.provider_payment_id === input.providerPaymentId) {
            return orderDto(trx, Number(order.id));
        }
        if (payment.status === 'CAPTURED' && payment.provider_payment_id !== input.providerPaymentId) {
            await markPaymentReview(trx, payment, order, 'Unexpected second captured payment for Razorpay order');
            return orderDto(trx, Number(order.id));
        }
        if (order.financial_status === 'PAID') {
            return orderDto(trx, Number(order.id));
        }

        const expectedAmount = toMinorUnits(payment.amount);
        if (expectedAmount !== input.amount || String(payment.currency) !== input.currency) {
            await markPaymentReview(trx, payment, order, 'Razorpay amount or currency mismatch');
            return orderDto(trx, Number(order.id));
        }

        const reservations = await trx('vsq_inventory_reservations')
            .where({ order_id: order.id, status: 'ACTIVE' })
            .forUpdate();
        if (!reservations.length) {
            const now = new Date();
            await insertTransaction(trx, {
                paymentAttemptId: Number(payment.id),
                type: 'CAPTURE',
                status: 'SUCCEEDED',
                providerTransactionId: input.providerPaymentId,
                amount: payment.amount,
                currency: input.currency,
                metadata: { method: input.method || null, source: input.source, fulfillment: 'REFUND_REQUIRED' }
            });
            await trx('vsq_payment_attempts').where({ id: payment.id }).update({
                provider_payment_id: input.providerPaymentId,
                provider_status: 'captured',
                status: 'CAPTURED',
                last_verified_at: now,
                updated_at: now
            });
            const existingRefund = await trx('vsq_refunds')
                .where({ order_id: order.id, payment_attempt_id: payment.id, provider: 'RAZORPAY' })
                .whereIn('status', ['PENDING', 'PROCESSING', 'COMPLETED'])
                .first();
            if (!existingRefund) {
                await trx('vsq_refunds').insert({
                    public_id: crypto.randomUUID(),
                    order_id: order.id,
                    payment_attempt_id: payment.id,
                    provider: 'RAZORPAY',
                    status: 'PENDING',
                    amount: payment.amount,
                    currency: payment.currency,
                    reason: 'Payment captured after inventory reservation expired or order was cancelled',
                    created_at: now,
                    updated_at: now
                });
            }
            await trx('vsq_orders').where({ id: order.id }).update({
                order_status: 'CANCELLED',
                financial_status: 'REFUND_PENDING',
                cancellation_reason: order.cancellation_reason || 'Inventory reservation unavailable when payment was captured',
                cancelled_at: order.cancelled_at || now,
                updated_at: now,
                version: trx.raw('version + 1')
            });
            await trx('vsq_order_status_history').insert([
                ...(order.order_status === 'CANCELLED' ? [] : [{
                    order_id: order.id,
                    status_type: 'ORDER',
                    from_status: order.order_status,
                    to_status: 'CANCELLED',
                    reason: 'Payment captured without an active inventory reservation',
                    actor_type: 'SYSTEM',
                    created_at: now
                }]),
                {
                    order_id: order.id,
                    status_type: 'FINANCIAL',
                    from_status: order.financial_status,
                    to_status: 'REFUND_PENDING',
                    reason: 'Captured payment queued for automatic refund',
                    actor_type: 'SYSTEM',
                    created_at: now
                }
            ]);
            await trx('vsq_checkout_sessions').where({ id: order.checkout_session_id }).update({
                status: 'EXPIRED', updated_at: now
            });
            return orderDto(trx, Number(order.id));
        }

        const now = new Date();
        for (const reservation of reservations) {
            const level = await trx('vsq_inventory_levels')
                .where({ variant_id: reservation.variant_id, location_id: reservation.location_id })
                .forUpdate()
                .first();
            const quantity = Number(reservation.quantity);
            if (!level || Number(level.reserved) < quantity || Number(level.on_hand) < quantity) {
                await markPaymentReview(trx, payment, order, 'Reserved inventory is unavailable for captured payment');
                return orderDto(trx, Number(order.id));
            }
            const balanceAfter = Number(level.on_hand) - quantity;
            await trx('vsq_inventory_levels')
                .where({ variant_id: reservation.variant_id, location_id: reservation.location_id })
                .update({
                    on_hand: balanceAfter,
                    reserved: Number(level.reserved) - quantity,
                    version: trx.raw('version + 1'),
                    updated_at: now
                });
            await trx('vsq_inventory_movements').insert({
                variant_id: reservation.variant_id,
                location_id: reservation.location_id,
                type: 'SALE',
                quantity_delta: -quantity,
                balance_after: balanceAfter,
                reference_type: 'ORDER',
                reference_id: order.public_id,
                reason: 'Razorpay payment captured',
                actor_type: 'SYSTEM',
                created_at: now
            });
        }

        await trx('vsq_inventory_reservations')
            .whereIn('id', reservations.map((item) => item.id))
            .update({ status: 'CONSUMED', updated_at: now });
        await insertTransaction(trx, {
            paymentAttemptId: Number(payment.id),
            type: 'CAPTURE',
            status: 'SUCCEEDED',
            providerTransactionId: input.providerPaymentId,
            amount: payment.amount,
            currency: input.currency,
            metadata: { method: input.method || null, source: input.source }
        });
        await trx('vsq_payment_attempts').where({ id: payment.id }).update({
            provider_payment_id: input.providerPaymentId,
            provider_status: 'captured',
            method: String(input.method || 'ONLINE').toUpperCase(),
            status: 'CAPTURED',
            failure_code: null,
            failure_message: null,
            last_verified_at: now,
            updated_at: now
        });
        await trx('vsq_orders').where({ id: order.id }).update({
            financial_status: 'PAID',
            order_status: 'CONFIRMED',
            paid_at: now,
            updated_at: now,
            version: trx.raw('version + 1')
        });
        await trx('vsq_checkout_sessions').where({ id: order.checkout_session_id }).update({
            status: 'COMPLETED', completed_at: now, updated_at: now
        });
        await trx('vsq_order_status_history').insert([
            {
                order_id: order.id,
                status_type: 'FINANCIAL',
                from_status: order.financial_status,
                to_status: 'PAID',
                reason: `Razorpay payment captured via ${input.source.toLowerCase()}`,
                actor_type: 'SYSTEM',
                created_at: now
            },
            {
                order_id: order.id,
                status_type: 'ORDER',
                from_status: order.order_status,
                to_status: 'CONFIRMED',
                reason: 'Payment captured',
                actor_type: 'SYSTEM',
                created_at: now
            }
        ]);
        await trx('vsq_outbox_events').insert({
            event_key: `payment.captured:${input.providerPaymentId}`,
            aggregate_type: 'ORDER',
            aggregate_id: order.public_id,
            event_type: 'commerce.payment.captured',
            event_version: 1,
            payload: JSON.stringify({
                order_public_id: order.public_id,
                provider: 'RAZORPAY',
                provider_payment_id: input.providerPaymentId
            }),
            occurred_at: now
        }).onConflict('event_key').ignore();

        return orderDto(trx, Number(order.id));
    });
}

export async function markAuthorizedPayment(entity: ProviderEntity, source: string) {
    const providerOrderId = stringValue(entity.order_id);
    const providerPaymentId = stringValue(entity.id);
    if (!providerOrderId || !providerPaymentId) return null;
    return knexInstance.transaction(async (trx) => {
        const payment = await trx('vsq_payment_attempts')
            .where({ provider: 'RAZORPAY', provider_order_id: providerOrderId })
            .forUpdate()
            .first();
        if (!payment || payment.status === 'CAPTURED') return null;
        const expectedAmount = toMinorUnits(payment.amount);
        if (expectedAmount !== numberValue(entity.amount) || payment.currency !== entity.currency) {
            const order = await trx('vsq_orders').where({ id: payment.order_id }).forUpdate().first();
            if (order) await markPaymentReview(trx, payment, order, 'Razorpay authorization amount mismatch');
            return null;
        }
        await insertTransaction(trx, {
            paymentAttemptId: Number(payment.id),
            type: 'AUTHORIZATION',
            status: 'SUCCEEDED',
            providerTransactionId: providerPaymentId,
            amount: payment.amount,
            currency: String(payment.currency),
            metadata: { source, method: entity.method || null }
        });
        await trx('vsq_payment_attempts').where({ id: payment.id }).update({
            provider_status: 'authorized',
            status: 'AUTHORIZED',
            last_verified_at: new Date(),
            updated_at: new Date()
        });
        return payment.order_id;
    });
}

export async function markFailedPayment(entity: ProviderEntity, source: string) {
    const providerOrderId = stringValue(entity.order_id);
    const providerPaymentId = stringValue(entity.id);
    if (!providerOrderId || !providerPaymentId) return null;
    return knexInstance.transaction(async (trx) => {
        const payment = await trx('vsq_payment_attempts')
            .where({ provider: 'RAZORPAY', provider_order_id: providerOrderId })
            .forUpdate()
            .first();
        if (!payment || payment.status === 'CAPTURED') return null;
        await insertTransaction(trx, {
            paymentAttemptId: Number(payment.id),
            type: 'PAYMENT_ATTEMPT',
            status: 'FAILED',
            providerTransactionId: providerPaymentId,
            amount: payment.amount,
            currency: String(payment.currency),
            metadata: {
                source,
                error_code: entity.error_code || null,
                error_description: entity.error_description || null
            }
        });
        await trx('vsq_payment_attempts').where({ id: payment.id }).update({
            provider_status: 'failed',
            status: 'PENDING_RETRY',
            failure_code: stringValue(entity.error_code).slice(0, 100) || null,
            failure_message: stringValue(entity.error_description).slice(0, 500) || 'Payment attempt failed',
            last_verified_at: new Date(),
            updated_at: new Date()
        });
        return payment.order_id;
    });
}

export async function syncRazorpayRefund(entity: ProviderEntity, source: string) {
    const providerPaymentId = stringValue(entity.payment_id);
    const providerRefundId = stringValue(entity.id);
    const providerStatus = stringValue(entity.status).toLowerCase();
    const amountMinor = numberValue(entity.amount);
    if (!providerPaymentId || !providerRefundId || amountMinor <= 0) return null;

    return knexInstance.transaction(async (trx) => {
        const payment = await trx('vsq_payment_attempts')
            .where({ provider: 'RAZORPAY', provider_payment_id: providerPaymentId })
            .forUpdate()
            .first();
        if (!payment) return null;
        if (String(entity.currency || payment.currency) !== String(payment.currency)) {
            throw new Error('Razorpay refund currency does not match the payment');
        }

        let refund = await trx('vsq_refunds')
            .where({ provider: 'RAZORPAY', provider_refund_id: providerRefundId })
            .forUpdate()
            .first();
        if (!refund) {
            refund = await trx('vsq_refunds')
                .where({ provider: 'RAZORPAY', payment_attempt_id: payment.id })
                .whereNull('provider_refund_id')
                .whereIn('status', ['PENDING', 'REQUESTING', 'PROCESSING'])
                .orderBy('id', 'asc')
                .forUpdate()
                .first();
        }

        const localStatus = providerStatus === 'processed'
            ? 'COMPLETED'
            : providerStatus === 'failed' ? 'FAILED' : 'PROCESSING';
        const amount = fromMinorUnits(amountMinor);
        const now = new Date();
        if (refund) {
            await trx('vsq_refunds').where({ id: refund.id }).update({
                provider_refund_id: providerRefundId,
                status: localStatus,
                amount,
                processed_at: localStatus === 'COMPLETED' ? now : null,
                provider_metadata: JSON.stringify({ source, status: providerStatus }),
                updated_at: now
            });
        } else {
            const order = await trx('vsq_orders').where({ id: payment.order_id }).first();
            if (!order) return null;
            const [refundId] = await trx('vsq_refunds').insert({
                public_id: crypto.randomUUID(),
                order_id: payment.order_id,
                payment_attempt_id: payment.id,
                provider: 'RAZORPAY',
                provider_refund_id: providerRefundId,
                status: localStatus,
                amount,
                currency: payment.currency,
                reason: 'Razorpay refund notification',
                processed_at: localStatus === 'COMPLETED' ? now : null,
                provider_metadata: JSON.stringify({ source, status: providerStatus }),
                created_at: now,
                updated_at: now
            });
            refund = { id: refundId };
        }

        await insertTransaction(trx, {
            paymentAttemptId: Number(payment.id),
            type: 'REFUND',
            status: localStatus === 'COMPLETED' ? 'SUCCEEDED' : localStatus,
            providerTransactionId: providerRefundId,
            amount,
            currency: String(payment.currency),
            metadata: { source, provider_status: providerStatus }
        });

        const order = await trx('vsq_orders').where({ id: payment.order_id }).forUpdate().first();
        if (!order) return null;
        if (localStatus === 'FAILED') {
            await trx('vsq_orders').where({ id: order.id }).update({
                financial_status: 'REFUND_FAILED', updated_at: now, version: trx.raw('version + 1')
            });
            if (order.financial_status !== 'REFUND_FAILED') {
                await trx('vsq_order_status_history').insert({
                    order_id: order.id,
                    status_type: 'FINANCIAL',
                    from_status: order.financial_status,
                    to_status: 'REFUND_FAILED',
                    reason: 'Razorpay refund failed and requires review',
                    actor_type: 'SYSTEM',
                    created_at: now
                });
            }
            return order.id;
        }
        if (localStatus === 'COMPLETED') {
            const completed = await trx('vsq_refunds')
                .where({ order_id: order.id, status: 'COMPLETED' })
                .sum({ amount: 'amount' })
                .first();
            if (toMinorUnits(completed?.amount || 0) >= toMinorUnits(order.grand_total)) {
                await trx('vsq_payment_attempts').where({ id: payment.id }).update({
                    status: 'REFUNDED', provider_status: providerStatus, updated_at: now
                });
                await trx('vsq_orders').where({ id: order.id }).update({
                    financial_status: 'REFUNDED', updated_at: now, version: trx.raw('version + 1')
                });
                await trx('vsq_order_items').where({ order_id: order.id }).update({
                    refunded_quantity: trx.ref('quantity'), updated_at: now
                });
                if (order.financial_status !== 'REFUNDED') {
                    await trx('vsq_order_status_history').insert({
                        order_id: order.id,
                        status_type: 'FINANCIAL',
                        from_status: order.financial_status,
                        to_status: 'REFUNDED',
                        reason: 'Razorpay refund processed',
                        actor_type: 'SYSTEM',
                        created_at: now
                    });
                }
                await refundCreditRedemptionForOrder(trx, Number(order.id), 'Order payment fully refunded');
            }
            await reverseReferralForRefund(trx, Number(order.id), providerRefundId);
        }
        return order.id;
    });
}

export async function verifyCustomerPayment(input: {
    customerId: number;
    orderPublicId: string;
    providerPaymentId: string;
    signature: string;
}) {
    const context = await paymentContextForCustomer(input.orderPublicId, input.customerId);
    const providerOrderId = String(context.provider_order_id || '');
    if (!providerOrderId || !verifyCheckoutSignature(providerOrderId, input.providerPaymentId, input.signature)) {
        throw new CommercePaymentError('Payment signature is invalid', 400);
    }

    const [paymentResponse, orderResponse] = await Promise.all([
        fetchProviderPayment(input.providerPaymentId),
        fetchProviderOrder(providerOrderId)
    ]);
    const payment = paymentResponse as unknown as ProviderEntity;
    const providerOrder = orderResponse as unknown as ProviderEntity;
    if (stringValue(payment.order_id) !== providerOrderId) {
        throw new CommercePaymentError('Payment does not belong to this order', 409);
    }
    const expectedAmount = toMinorUnits(context.payment_amount);
    if (
        numberValue(payment.amount) !== expectedAmount
        || stringValue(payment.currency) !== context.payment_currency
        || numberValue(providerOrder.amount) !== expectedAmount
    ) {
        throw new CommercePaymentError('Payment amount verification failed', 409);
    }

    if (payment.status === 'captured' && providerOrder.status === 'paid') {
        const order = await finalizeCapturedPayment({
            providerOrderId,
            providerPaymentId: input.providerPaymentId,
            amount: numberValue(payment.amount),
            currency: stringValue(payment.currency),
            method: stringValue(payment.method),
            source: 'CALLBACK'
        });
        return {
            order,
            status: order?.financial_status === 'PAID' ? 'PAID' : 'REFUND_PENDING'
        };
    }
    if (payment.status === 'authorized') {
        await markAuthorizedPayment(payment, 'CALLBACK');
        return { order: await CommerceCheckoutService.adminOrderById(Number(context.order_id)), status: 'PENDING' };
    }
    if (payment.status === 'failed') {
        await markFailedPayment(payment, 'CALLBACK');
        return { order: await CommerceCheckoutService.adminOrderById(Number(context.order_id)), status: 'FAILED' };
    }
    return { order: await CommerceCheckoutService.adminOrderById(Number(context.order_id)), status: 'PENDING' };
}

export async function paymentStatusForCustomer(orderPublicId: string, customerId: number) {
    const context = await paymentContextForCustomer(orderPublicId, customerId);
    return {
        status: context.financial_status === 'PAID' ? 'PAID' : context.payment_status,
        order: await CommerceCheckoutService.adminOrderById(Number(context.order_id))
    };
}
