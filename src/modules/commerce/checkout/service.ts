import crypto from 'crypto';
import type { Knex } from 'knex';

export class CommerceCheckoutError extends Error {
    constructor(message: string, public readonly statusCode: number) {
        super(message);
        this.name = 'CommerceCheckoutError';
    }
}

export type CheckoutAddress = {
    first_name: string;
    last_name?: string;
    company?: string;
    address_line_1: string;
    address_line_2?: string;
    city: string;
    state: string;
    state_code?: string;
    postcode: string;
    country?: string;
    country_code?: string;
    phone?: string;
};

type CheckoutInput = {
    cartPublicId: string;
    cartToken?: string | null;
    customerId: number;
    shippingAddress: CheckoutAddress;
    billingAddress?: CheckoutAddress | null;
    shippingMethodCode: string;
    paymentMethod: 'MANUAL' | 'COD';
    idempotencyKey: string;
};

function hash(value: string) {
    return crypto.createHash('sha256').update(value).digest('hex');
}

function orderNumber() {
    const date = new Date();
    const datePart = [date.getUTCFullYear(), String(date.getUTCMonth() + 1).padStart(2, '0'), String(date.getUTCDate()).padStart(2, '0')].join('');
    return `VSQ-${datePart}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
}

function normalizeAddress(address: CheckoutAddress): CheckoutAddress {
    return {
        first_name: address.first_name.trim(),
        last_name: address.last_name?.trim() || '',
        company: address.company?.trim() || '',
        address_line_1: address.address_line_1.trim(),
        address_line_2: address.address_line_2?.trim() || '',
        city: address.city.trim(),
        state: address.state.trim(),
        state_code: address.state_code?.trim() || '',
        postcode: address.postcode.trim(),
        country: address.country?.trim() || 'India',
        country_code: address.country_code?.trim().toUpperCase() || 'IN',
        phone: address.phone?.trim() || ''
    };
}

async function orderDto(db: Knex | Knex.Transaction, orderId: number) {
    const order = await db('vsq_orders').where({ id: orderId }).first();
    if (!order) return null;
    const [items, addresses, shipping, payments, shipments, history] = await Promise.all([
        db('vsq_order_items').where({ order_id: orderId }).orderBy('id', 'asc'),
        db('vsq_order_addresses').where({ order_id: orderId }),
        db('vsq_order_shipping_lines').where({ order_id: orderId }).orderBy('id', 'asc'),
        db('vsq_payment_attempts').where({ order_id: orderId }).orderBy('id', 'desc'),
        db('vsq_shipments').where({ order_id: orderId }).orderBy('id', 'desc'),
        db('vsq_order_status_history').where({ order_id: orderId }).orderBy('created_at', 'asc')
    ]);
    const numeric = (value: unknown) => Number(value || 0);
    return {
        public_id: order.public_id,
        order_number: order.order_number,
        email: order.email_snapshot,
        phone: order.phone_snapshot,
        currency: order.currency,
        order_status: order.order_status,
        financial_status: order.financial_status,
        fulfillment_status: order.fulfillment_status,
        payment_method: order.payment_method,
        subtotal: numeric(order.subtotal),
        discount_total: numeric(order.discount_total),
        shipping_total: numeric(order.shipping_total),
        tax_total: numeric(order.tax_total),
        grand_total: numeric(order.grand_total),
        placed_at: order.placed_at,
        paid_at: order.paid_at,
        cancelled_at: order.cancelled_at,
        items: items.map((item) => ({
            id: Number(item.id),
            sku: item.sku_snapshot,
            product_title: item.product_title_snapshot,
            variant_title: item.variant_title_snapshot,
            options: typeof item.options_snapshot === 'string' ? JSON.parse(item.options_snapshot) : item.options_snapshot,
            image_url: item.image_url_snapshot,
            quantity: Number(item.quantity),
            unit_price: numeric(item.unit_price),
            discount_total: numeric(item.discount_total),
            tax_total: numeric(item.tax_total),
            line_total: numeric(item.line_total),
            fulfilled_quantity: Number(item.fulfilled_quantity),
            refunded_quantity: Number(item.refunded_quantity)
        })),
        addresses: addresses.reduce<Record<string, unknown>>((result, row) => {
            result[String(row.type).toLowerCase()] = typeof row.address_json === 'string'
                ? JSON.parse(row.address_json)
                : row.address_json;
            return result;
        }, {}),
        shipping: shipping.map((line) => ({
            code: line.method_code_snapshot,
            name: line.method_name_snapshot,
            provider: line.provider_snapshot,
            amount: numeric(line.amount),
            currency: line.currency,
            estimated_min_days: line.estimated_min_days,
            estimated_max_days: line.estimated_max_days
        })),
        payments: payments.map((payment) => ({
            public_id: payment.public_id,
            provider: payment.provider,
            method: payment.method,
            status: payment.status,
            amount: numeric(payment.amount),
            currency: payment.currency,
            failure_message: payment.failure_message
        })),
        shipments: shipments.map((shipment) => ({
            public_id: shipment.public_id,
            courier_name: shipment.courier_name,
            tracking_number: shipment.tracking_number,
            tracking_url: shipment.tracking_url,
            status: shipment.status,
            shipped_at: shipment.shipped_at,
            delivered_at: shipment.delivered_at
        })),
        status_history: history
    };
}

export default class CommerceCheckoutService {
    static async adminOrderById(orderId: number, db: Knex | Knex.Transaction = knexInstance) {
        return orderDto(db, orderId);
    }

    static async placeOrder(input: CheckoutInput) {
        const idempotencyKey = `checkout:${hash(`${input.customerId}:${input.idempotencyKey}`)}`;
        const existingPayment = await knexInstance('vsq_payment_attempts')
            .select('order_id')
            .where({ idempotency_key: idempotencyKey })
            .first();
        if (existingPayment) {
            return orderDto(knexInstance, Number(existingPayment.order_id));
        }

        try {
            return await knexInstance.transaction(async (trx) => {
            const customer = await trx('vsq_customers')
                .where({ id: input.customerId, status: 'ACTIVE' })
                .whereNull('deleted_at')
                .first();
            if (!customer) throw new CommerceCheckoutError('Customer account is unavailable', 403);

            const cart = await trx('vsq_carts')
                .where({ public_id: input.cartPublicId, status: 'ACTIVE' })
                .forUpdate()
                .first();
            if (!cart) throw new CommerceCheckoutError('Cart is unavailable', 404);

            if (cart.customer_id && Number(cart.customer_id) !== input.customerId) {
                throw new CommerceCheckoutError('Cart access denied', 403);
            }
            if (!cart.customer_id) {
                if (!input.cartToken || hash(input.cartToken) !== cart.anonymous_token_hash) {
                    throw new CommerceCheckoutError('Cart access denied', 403);
                }
                await trx('vsq_carts').where({ id: cart.id }).update({
                    customer_id: input.customerId,
                    anonymous_token_hash: null,
                    updated_at: new Date()
                });
            }

            const items = await trx('vsq_cart_items as ci')
                .join('vsq_product_variants as v', 'v.id', 'ci.variant_id')
                .join('vsq_products as p', 'p.id', 'v.product_id')
                .leftJoin('vsq_tax_categories as tc', 'tc.id', 'p.tax_category_id')
                .leftJoin('vsq_variant_prices as vp', function () {
                    this.on('vp.variant_id', '=', 'v.id')
                        .andOn('vp.price_list_id', '=', trx.raw('(SELECT id FROM vsq_price_lists WHERE code = ? LIMIT 1)', ['INR_DEFAULT']));
                })
                .leftJoin('vsq_variant_media as vm', function () {
                    this.on('vm.variant_id', '=', 'v.id').andOn('vm.position', '=', trx.raw('0'));
                })
                .leftJoin('vsq_media_assets as vma', 'vma.id', 'vm.media_asset_id')
                .leftJoin('vsq_product_media as pm', function () {
                    this.on('pm.product_id', '=', 'p.id').andOn('pm.position', '=', trx.raw('0'));
                })
                .leftJoin('vsq_media_assets as pma', 'pma.id', 'pm.media_asset_id')
                .select(
                    'ci.id as cart_item_id', 'ci.variant_id', 'ci.quantity',
                    'v.public_id as variant_public_id', 'v.title as variant_title', 'v.sku',
                    'p.title as product_title', 'tc.hsn_sac', 'vp.amount as current_price',
                    trx.raw('COALESCE(vma.public_url, pma.public_url) as image_url')
                )
                .where('ci.cart_id', cart.id)
                .where('v.status', 'ACTIVE')
                .whereNull('v.deleted_at')
                .where('p.status', 'ACTIVE')
                .whereNull('p.deleted_at');
            if (!items.length) throw new CommerceCheckoutError('Cart is empty', 422);

            const optionRows = await trx('vsq_variant_option_values as vov')
                .join('vsq_product_option_values as pov', 'pov.id', 'vov.product_option_value_id')
                .join('vsq_product_options as po', 'po.id', 'pov.product_option_id')
                .select('vov.variant_id', 'po.name', 'pov.value')
                .whereIn('vov.variant_id', items.map((item) => item.variant_id));

            let subtotal = 0;
            const allocations: Array<{ variantId: number; locationId: number; quantity: number }> = [];
            for (const item of items) {
                if (item.current_price === null) throw new CommerceCheckoutError(`${item.product_title} has no active price`, 409);
                const quantity = Number(item.quantity);
                const unitPrice = Number(item.current_price);
                subtotal += unitPrice * quantity;

                const levels = await trx('vsq_inventory_levels as il')
                    .join('vsq_inventory_locations as loc', 'loc.id', 'il.location_id')
                    .select('il.*')
                    .where('il.variant_id', item.variant_id)
                    .where('loc.status', 'ACTIVE')
                    .orderBy('loc.priority', 'desc')
                    .forUpdate();
                const level = levels.find((row) => (
                    Number(row.on_hand) - Number(row.reserved) - Number(row.safety_stock)
                ) >= quantity);
                if (!level) throw new CommerceCheckoutError(`${item.product_title} does not have enough stock`, 409);
                allocations.push({ variantId: Number(item.variant_id), locationId: Number(level.location_id), quantity });
            }

            const shippingMethod = await trx('vsq_shipping_methods as sm')
                .join('vsq_shipping_rates as sr', 'sr.method_id', 'sm.id')
                .join('vsq_shipping_zones as sz', 'sz.id', 'sr.zone_id')
                .select(
                    'sm.id', 'sm.code', 'sm.name', 'sm.provider', 'sm.min_delivery_days', 'sm.max_delivery_days',
                    'sr.amount', 'sr.free_above_amount', 'sr.currency', 'sz.cod_enabled'
                )
                .where('sm.code', input.shippingMethodCode)
                .where('sm.status', 'ACTIVE')
                .where('sr.status', 'ACTIVE')
                .where('sz.status', 'ACTIVE')
                .orderBy('sz.priority', 'desc')
                .first();
            if (!shippingMethod) throw new CommerceCheckoutError('Shipping method is unavailable', 422);
            if (input.paymentMethod === 'COD' && !shippingMethod.cod_enabled) {
                throw new CommerceCheckoutError('Cash on delivery is unavailable for this shipping method', 422);
            }

            const shippingTotal = shippingMethod.free_above_amount !== null
                && subtotal >= Number(shippingMethod.free_above_amount)
                ? 0
                : Number(shippingMethod.amount);
            const taxTotal = 0;
            const grandTotal = subtotal + shippingTotal + taxTotal;
            const now = new Date();
            const shippingAddress = normalizeAddress(input.shippingAddress);
            const billingAddress = normalizeAddress(input.billingAddress || input.shippingAddress);
            const pricingFingerprint = hash(JSON.stringify({
                items: items.map((item) => [item.variant_id, item.quantity, Number(item.current_price)]),
                shippingMethod: shippingMethod.code,
                shippingTotal,
                taxTotal,
                grandTotal
            }));

            const [checkoutId] = await trx('vsq_checkout_sessions').insert({
                public_id: crypto.randomUUID(),
                cart_id: cart.id,
                customer_id: input.customerId,
                status: 'COMPLETED',
                shipping_address_json: JSON.stringify(shippingAddress),
                billing_address_json: JSON.stringify(billingAddress),
                shipping_method_id: shippingMethod.id,
                payment_method: input.paymentMethod,
                currency: 'INR',
                subtotal,
                discount_total: 0,
                shipping_total: shippingTotal,
                tax_total: taxTotal,
                grand_total: grandTotal,
                pricing_fingerprint: pricingFingerprint,
                expires_at: new Date(Date.now() + 30 * 60 * 1000),
                completed_at: now,
                created_at: now,
                updated_at: now
            });

            const reservationIds: number[] = [];
            for (const allocation of allocations) {
                await trx('vsq_inventory_levels')
                    .where({ variant_id: allocation.variantId, location_id: allocation.locationId })
                    .update({
                        reserved: trx.raw('reserved + ?', [allocation.quantity]),
                        version: trx.raw('version + 1'),
                        updated_at: now
                    });
                const [reservationId] = await trx('vsq_inventory_reservations').insert({
                    variant_id: allocation.variantId,
                    location_id: allocation.locationId,
                    cart_id: cart.id,
                    checkout_session_id: checkoutId,
                    quantity: allocation.quantity,
                    status: 'ACTIVE',
                    idempotency_key: `checkout:${checkoutId}:${allocation.variantId}`,
                    expires_at: new Date(Date.now() + 30 * 60 * 1000),
                    created_at: now,
                    updated_at: now
                });
                reservationIds.push(Number(reservationId));
            }

            const orderPublicId = crypto.randomUUID();
            const [orderId] = await trx('vsq_orders').insert({
                public_id: orderPublicId,
                order_number: orderNumber(),
                customer_id: input.customerId,
                checkout_session_id: checkoutId,
                email_snapshot: customer.email,
                phone_snapshot: customer.phone,
                currency: 'INR',
                order_status: input.paymentMethod === 'COD' ? 'CONFIRMED' : 'PENDING_PAYMENT',
                financial_status: 'UNPAID',
                fulfillment_status: 'UNFULFILLED',
                payment_method: input.paymentMethod,
                subtotal,
                discount_total: 0,
                shipping_total: shippingTotal,
                tax_total: taxTotal,
                grand_total: grandTotal,
                placed_at: now,
                created_at: now,
                updated_at: now
            });

            for (const item of items) {
                const options = optionRows
                    .filter((option) => Number(option.variant_id) === Number(item.variant_id))
                    .map((option) => ({ name: option.name, value: option.value }));
                const quantity = Number(item.quantity);
                const unitPrice = Number(item.current_price);
                await trx('vsq_order_items').insert({
                    order_id: orderId,
                    variant_id: item.variant_id,
                    sku_snapshot: item.sku,
                    product_title_snapshot: item.product_title,
                    variant_title_snapshot: item.variant_title,
                    options_snapshot: JSON.stringify(options),
                    image_url_snapshot: item.image_url,
                    hsn_sac_snapshot: item.hsn_sac,
                    quantity,
                    unit_price: unitPrice,
                    discount_total: 0,
                    tax_total: 0,
                    line_total: unitPrice * quantity,
                    created_at: now,
                    updated_at: now
                });
            }

            await trx('vsq_order_addresses').insert([
                { order_id: orderId, type: 'SHIPPING', address_json: JSON.stringify(shippingAddress), created_at: now, updated_at: now },
                { order_id: orderId, type: 'BILLING', address_json: JSON.stringify(billingAddress), created_at: now, updated_at: now }
            ]);
            await trx('vsq_order_shipping_lines').insert({
                order_id: orderId,
                shipping_method_id: shippingMethod.id,
                method_code_snapshot: shippingMethod.code,
                method_name_snapshot: shippingMethod.name,
                provider_snapshot: shippingMethod.provider,
                amount: shippingTotal,
                currency: shippingMethod.currency,
                estimated_min_days: shippingMethod.min_delivery_days,
                estimated_max_days: shippingMethod.max_delivery_days,
                created_at: now,
                updated_at: now
            });
            await trx('vsq_order_status_history').insert({
                order_id: orderId,
                status_type: 'ORDER',
                from_status: null,
                to_status: input.paymentMethod === 'COD' ? 'CONFIRMED' : 'PENDING_PAYMENT',
                reason: 'Order placed through storefront checkout',
                actor_id: input.customerId,
                actor_type: 'CUSTOMER',
                actor_snapshot: customer.email,
                created_at: now
            });
            await trx('vsq_payment_attempts').insert({
                public_id: crypto.randomUUID(),
                order_id: orderId,
                provider: input.paymentMethod === 'COD' ? 'COD' : 'MANUAL',
                idempotency_key: idempotencyKey,
                method: input.paymentMethod,
                status: input.paymentMethod === 'COD' ? 'PENDING_COLLECTION' : 'PENDING',
                amount: grandTotal,
                currency: 'INR',
                created_at: now,
                updated_at: now
            });
            await trx('vsq_inventory_reservations').whereIn('id', reservationIds).update({
                order_id: orderId,
                updated_at: now
            });

            if (input.paymentMethod === 'COD') {
                for (const allocation of allocations) {
                    await trx('vsq_inventory_levels')
                        .where({ variant_id: allocation.variantId, location_id: allocation.locationId })
                        .update({
                            on_hand: trx.raw('on_hand - ?', [allocation.quantity]),
                            reserved: trx.raw('reserved - ?', [allocation.quantity]),
                            version: trx.raw('version + 1'),
                            updated_at: now
                        });
                    const balance = await trx('vsq_inventory_levels')
                        .select('on_hand')
                        .where({ variant_id: allocation.variantId, location_id: allocation.locationId })
                        .first();
                    await trx('vsq_inventory_movements').insert({
                        variant_id: allocation.variantId,
                        location_id: allocation.locationId,
                        type: 'SALE',
                        quantity_delta: -allocation.quantity,
                        balance_after: Number(balance?.on_hand || 0),
                        reference_type: 'ORDER',
                        reference_id: orderPublicId,
                        reason: 'COD order confirmed',
                        actor_id: input.customerId,
                        actor_type: 'CUSTOMER',
                        created_at: now
                    });
                }
                await trx('vsq_inventory_reservations').whereIn('id', reservationIds).update({
                    status: 'CONSUMED',
                    updated_at: now
                });
            }

            await trx('vsq_carts').where({ id: cart.id }).update({
                status: 'CONVERTED',
                updated_at: now,
                version: trx.raw('version + 1')
            });
            await trx('vsq_outbox_events').insert({
                event_key: `order.placed:${orderPublicId}`,
                aggregate_type: 'ORDER',
                aggregate_id: orderPublicId,
                event_type: 'commerce.order.placed',
                event_version: 1,
                payload: JSON.stringify({ order_public_id: orderPublicId, customer_id: input.customerId }),
                occurred_at: now
            });

            return orderDto(trx, Number(orderId));
            });
        } catch (error: any) {
            if (error?.code === 'ER_DUP_ENTRY') {
                const completed = await knexInstance('vsq_payment_attempts').select('order_id').where({ idempotency_key: idempotencyKey }).first();
                if (completed) return orderDto(knexInstance, Number(completed.order_id));
            }
            throw error;
        }
    }

    static async orderForCustomer(publicId: string, customerId: number) {
        const row = await knexInstance('vsq_orders')
            .select('id')
            .where({ public_id: publicId, customer_id: customerId })
            .first();
        return row ? orderDto(knexInstance, Number(row.id)) : null;
    }

    static async ordersForCustomer(customerId: number, limit = 20) {
        const rows = await knexInstance('vsq_orders')
            .select('id')
            .where({ customer_id: customerId })
            .orderBy('placed_at', 'desc')
            .limit(Math.min(Math.max(limit, 1), 100));
        return await Promise.all(rows.map((row) => orderDto(knexInstance, Number(row.id))));
    }
}
