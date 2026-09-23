import crypto from 'crypto';
import type { Knex } from 'knex';
import config from '../../../config';
import {
    createProviderRefund,
    findProviderOrderByReceipt,
    fetchProviderOrder,
    fetchProviderOrderPayments,
    fetchProviderPaymentRefunds,
    fetchProviderRefund,
    verifyWebhookSignature
} from './razorpay-provider';
import {
    finalizeCapturedPayment,
    markAuthorizedPayment,
    markFailedPayment,
    syncRazorpayRefund
} from './service';
import { refundCreditRedemptionForOrder, voidReferralForOrder } from '../referral/service';
import { toMinorUnits } from './money';

type JsonRecord = Record<string, unknown>;

function record(value: unknown): JsonRecord {
    return value && typeof value === 'object' ? value as JsonRecord : {};
}

function paymentEntity(payload: JsonRecord) {
    const payloadRecord = record(payload.payload);
    return record(record(payloadRecord.payment).entity);
}

function normalizedPayload(payload: JsonRecord) {
    const payment = paymentEntity(payload);
    const order = record(record(record(payload.payload).order).entity);
    const refund = record(record(record(payload.payload).refund).entity);
    return {
        event: payload.event,
        account_id: payload.account_id,
        created_at: payload.created_at,
        payment: Object.keys(payment).length ? {
            id: payment.id,
            order_id: payment.order_id,
            amount: payment.amount,
            currency: payment.currency,
            status: payment.status,
            method: payment.method,
            captured: payment.captured,
            error_code: payment.error_code,
            error_description: payment.error_description,
            created_at: payment.created_at
        } : null,
        order: Object.keys(order).length ? {
            id: order.id,
            amount: order.amount,
            amount_paid: order.amount_paid,
            currency: order.currency,
            status: order.status
        } : null,
        refund: Object.keys(refund).length ? {
            id: refund.id,
            payment_id: refund.payment_id,
            amount: refund.amount,
            currency: refund.currency,
            status: refund.status
        } : null
    };
}

export async function acceptRazorpayWebhook(input: {
    rawBody: Buffer;
    signature: string;
    eventId: string;
}) {
    if (!config.razorpay.enabled) throw new Error('Razorpay payments are unavailable');
    if (!verifyWebhookSignature(input.rawBody, input.signature)) {
        const error = new Error('Razorpay webhook signature is invalid');
        Object.assign(error, { statusCode: 400 });
        throw error;
    }

    const payload = JSON.parse(input.rawBody.toString('utf8')) as JsonRecord;
    const eventType = String(payload.event || 'unknown');
    const checksum = crypto.createHash('sha256').update(input.rawBody).digest('hex');
    try {
        await knexInstance('vsq_provider_webhook_events').insert({
            provider: 'RAZORPAY',
            provider_event_id: input.eventId,
            event_type: eventType,
            signature_status: 'VALID',
            processing_status: 'PENDING',
            headers_json: JSON.stringify({ event_id: input.eventId }),
            payload_json: JSON.stringify(normalizedPayload(payload)),
            payload_checksum: checksum,
            attempts: 0,
            available_at: new Date(),
            created_at: new Date(),
            updated_at: new Date()
        });
        return { duplicate: false };
    } catch (error: unknown) {
        if (record(error).code === 'ER_DUP_ENTRY') return { duplicate: true };
        throw error;
    }
}

async function processEvent(row: JsonRecord) {
    const payload = typeof row.payload_json === 'string'
        ? JSON.parse(row.payload_json) as JsonRecord
        : record(row.payload_json);
    const payment = record(payload.payment);
    const eventType = String(row.event_type);

    if (eventType === 'payment.captured' || eventType === 'order.paid') {
        if (!payment.id || !payment.order_id) throw new Error('Captured payment payload is incomplete');
        await finalizeCapturedPayment({
            providerOrderId: String(payment.order_id),
            providerPaymentId: String(payment.id),
            amount: Number(payment.amount),
            currency: String(payment.currency),
            method: String(payment.method || ''),
            source: 'WEBHOOK'
        });
        return;
    }
    if (eventType === 'payment.authorized') {
        await markAuthorizedPayment(payment, 'WEBHOOK');
        return;
    }
    if (eventType === 'payment.failed') {
        await markFailedPayment(payment, 'WEBHOOK');
        return;
    }
    if (['refund.created', 'refund.processed', 'refund.failed'].includes(eventType)) {
        await syncRazorpayRefund(record(payload.refund), 'WEBHOOK');
    }
}

export async function processPendingRazorpayWebhooks(limit = 50) {
    const rows = await knexInstance('vsq_provider_webhook_events')
        .where({ provider: 'RAZORPAY', processing_status: 'PENDING', signature_status: 'VALID' })
        .where((builder) => builder.whereNull('available_at').orWhere('available_at', '<=', new Date()))
        .orderBy('id', 'asc')
        .limit(limit);
    for (const row of rows) {
        const claimed = await knexInstance('vsq_provider_webhook_events')
            .where({ id: row.id, processing_status: 'PENDING' })
            .update({ processing_status: 'PROCESSING', attempts: Number(row.attempts) + 1, updated_at: new Date() });
        if (!claimed) continue;
        try {
            await processEvent(row);
            await knexInstance('vsq_provider_webhook_events').where({ id: row.id }).update({
                processing_status: 'PROCESSED',
                processed_at: new Date(),
                last_error: null,
                updated_at: new Date()
            });
        } catch (error) {
            const attempts = Number(row.attempts) + 1;
            await knexInstance('vsq_provider_webhook_events').where({ id: row.id }).update({
                processing_status: attempts >= 10 ? 'FAILED' : 'PENDING',
                available_at: new Date(Date.now() + Math.min(60, 2 ** attempts) * 1000),
                last_error: error instanceof Error ? error.message.slice(0, 1000) : 'Webhook processing failed',
                updated_at: new Date()
            });
        }
    }
    return rows.length;
}

async function releaseExpiredRazorpayOrder(orderId: number) {
    return knexInstance.transaction(async (trx: Knex.Transaction) => {
        const order = await trx('vsq_orders')
            .where({ id: orderId, payment_method: 'RAZORPAY', order_status: 'PENDING_PAYMENT' })
            .forUpdate()
            .first();
        if (!order || order.financial_status === 'PAID') return false;
        const reservations = await trx('vsq_inventory_reservations')
            .where({ order_id: orderId, status: 'ACTIVE' })
            .where('expires_at', '<=', new Date())
            .forUpdate();
        if (!reservations.length) return false;
        const now = new Date();
        for (const reservation of reservations) {
            await trx('vsq_inventory_levels')
                .where({ variant_id: reservation.variant_id, location_id: reservation.location_id })
                .update({
                    reserved: trx.raw('GREATEST(0, reserved - ?)', [Number(reservation.quantity)]),
                    version: trx.raw('version + 1'),
                    updated_at: now
                });
        }
        await trx('vsq_inventory_reservations').whereIn('id', reservations.map((item) => item.id)).update({
            status: 'EXPIRED', updated_at: now
        });
        await trx('vsq_payment_attempts').where({ order_id: orderId }).whereNot('status', 'CAPTURED').update({
            status: 'EXPIRED', updated_at: now
        });
        await trx('vsq_orders').where({ id: orderId }).update({
            order_status: 'CANCELLED',
            financial_status: 'VOIDED',
            cancellation_reason: 'Razorpay payment window expired',
            cancelled_at: now,
            updated_at: now,
            version: trx.raw('version + 1')
        });
        await voidReferralForOrder(trx, orderId, 'Razorpay payment window expired');
        await refundCreditRedemptionForOrder(trx, orderId, 'Razorpay payment window expired');
        await trx('vsq_checkout_sessions').where({ id: order.checkout_session_id }).update({
            status: 'EXPIRED', updated_at: now
        });
        await trx('vsq_order_status_history').insert([
            {
                order_id: orderId,
                status_type: 'ORDER',
                from_status: 'PENDING_PAYMENT',
                to_status: 'CANCELLED',
                reason: 'Razorpay payment window expired',
                actor_type: 'SYSTEM',
                created_at: now
            },
            {
                order_id: orderId,
                status_type: 'FINANCIAL',
                from_status: order.financial_status,
                to_status: 'VOIDED',
                reason: 'Razorpay payment window expired',
                actor_type: 'SYSTEM',
                created_at: now
            }
        ]);
        return true;
    });
}

export async function reconcilePendingRazorpayPayments(limit = 50) {
    if (!config.razorpay.enabled) return 0;
    const attempts = await knexInstance('vsq_payment_attempts as p')
        .join('vsq_orders as o', 'o.id', 'p.order_id')
        .select('p.*', 'o.order_number', 'o.order_status', 'o.financial_status')
        .where({ 'p.provider': 'RAZORPAY', 'o.order_status': 'PENDING_PAYMENT' })
        .whereNot('o.financial_status', 'PAID')
        .orderBy('p.updated_at', 'asc')
        .limit(limit);
    for (const attempt of attempts) {
        try {
            let providerOrderId = attempt.provider_order_id ? String(attempt.provider_order_id) : '';
            if (!providerOrderId) {
                const recovered = await findProviderOrderByReceipt(String(attempt.order_number));
                if (recovered) {
                    const recoveredRecord = recovered as unknown as JsonRecord;
                    if (
                        Number(recoveredRecord.amount) !== toMinorUnits(attempt.amount)
                        || String(recoveredRecord.currency) !== String(attempt.currency)
                    ) {
                        throw new Error('Recovered Razorpay order amount does not match');
                    }
                    providerOrderId = String(recoveredRecord.id);
                    await knexInstance('vsq_payment_attempts').where({ id: attempt.id }).update({
                        provider_order_id: providerOrderId,
                        provider_receipt: String(attempt.order_number).slice(0, 40),
                        provider_status: String(recoveredRecord.status || 'created'),
                        status: 'CREATED',
                        failure_message: null,
                        updated_at: new Date()
                    });
                }
            }

            const providerOrder = providerOrderId
                ? await fetchProviderOrder(providerOrderId) as unknown as JsonRecord
                : null;
            if (providerOrder && ['paid', 'attempted'].includes(String(providerOrder.status))) {
                const payments = await fetchProviderOrderPayments(providerOrderId) as unknown as JsonRecord;
                const items = Array.isArray(payments.items) ? payments.items.map(record) : [];
                const captured = items.find((item) => item.status === 'captured');
                if (captured) {
                    await finalizeCapturedPayment({
                        providerOrderId,
                        providerPaymentId: String(captured.id),
                        amount: Number(captured.amount),
                        currency: String(captured.currency),
                        method: String(captured.method || ''),
                        source: 'RECONCILIATION'
                    });
                    continue;
                }
                const authorized = items.find((item) => item.status === 'authorized');
                if (authorized) {
                    await markAuthorizedPayment(authorized, 'RECONCILIATION');
                    continue;
                }
            }
            const expired = await knexInstance('vsq_inventory_reservations')
                .where({ order_id: attempt.order_id, status: 'ACTIVE' })
                .where('expires_at', '<=', new Date())
                .first();
            if (expired) await releaseExpiredRazorpayOrder(Number(attempt.order_id));
        } catch {
            // Leave the attempt pending; the next reconciliation run retries it.
        }
    }
    return attempts.length;
}

export async function processPendingRazorpayRefunds(limit = 25) {
    if (!config.razorpay.enabled) return 0;
    const refunds = await knexInstance('vsq_refunds as r')
        .join('vsq_payment_attempts as p', 'p.id', 'r.payment_attempt_id')
        .join('vsq_orders as o', 'o.id', 'r.order_id')
        .select(
            'r.id', 'r.public_id', 'r.provider_refund_id', 'r.status', 'r.updated_at', 'r.amount', 'r.currency',
            'p.provider_payment_id', 'o.public_id as order_public_id'
        )
        .where({ 'r.provider': 'RAZORPAY' })
        .whereIn('r.status', ['PENDING', 'REQUESTING', 'PROCESSING'])
        .whereNotNull('p.provider_payment_id')
        .orderBy('r.updated_at', 'asc')
        .limit(limit);

    for (const refund of refunds) {
        try {
            const paymentId = String(refund.provider_payment_id);
            if (refund.provider_refund_id) {
                const providerRefund = await fetchProviderRefund(paymentId, String(refund.provider_refund_id));
                await syncRazorpayRefund(providerRefund as unknown as JsonRecord, 'RECONCILIATION');
                continue;
            }

            if (refund.status === 'PENDING') {
                const claimed = await knexInstance('vsq_refunds')
                    .where({ id: refund.id, status: 'PENDING' })
                    .update({ status: 'REQUESTING', updated_at: new Date() });
                if (!claimed) continue;
            } else if (
                refund.status === 'REQUESTING'
                && Date.now() - new Date(refund.updated_at).getTime() < 2 * 60 * 1000
            ) {
                continue;
            }

            const existing = await fetchProviderPaymentRefunds(paymentId) as unknown as JsonRecord;
            const items = Array.isArray(existing.items) ? existing.items.map(record) : [];
            const matched = items.find((item) => (
                item.receipt === refund.public_id
                || record(item.notes).vastriqo_refund_id === refund.public_id
            ));
            const providerRefund = matched || record(await createProviderRefund({
                paymentId,
                amount: toMinorUnits(refund.amount),
                receipt: String(refund.public_id),
                notes: {
                    vastriqo_refund_id: String(refund.public_id),
                    vastriqo_order_id: String(refund.order_public_id)
                }
            }));
            await syncRazorpayRefund(providerRefund, 'REFUND_WORKER');
        } catch {
            // Preserve the durable refund row for the next reconciliation pass.
        }
    }
    return refunds.length;
}
