import type { Knex } from 'knex';

// One-time launch reset. Keep customer and staff accounts, the catalog, and
// store configuration. The deployment stops the API before this transaction.
export async function up(knex: Knex): Promise<void> {
    await knex.transaction(async (trx) => {
        // Remove references without deleting the customers' support inquiries.
        await trx('inquiries').whereNotNull('commerce_order_id').update({ commerce_order_id: null });

        // Clear messages and provider events from the discarded launch data.
        // Account security and welcome email records belong to retained users.
        await trx('vsq_email_outbox').whereIn('template', [
            'ORDER_PLACED', 'PAYMENT_CONFIRMED', 'DESIGN_REWARD', 'CREDIT_GRANT', 'GIFT_CODE_PURCHASE'
        ]).del();
        await trx('vsq_provider_webhook_events').del();
        await trx('vsq_outbox_events').where({ aggregate_type: 'ORDER' }).del();
        await trx('vsq_idempotency_keys').del();

        await trx('vsq_commerce_audit_logs').where({ entity_type: 'ORDER' }).del();
        await trx('vsq_commerce_audit_logs').where({ entity_type: 'PACKAGE_CODE' }).del();
        await trx('vsq_commerce_audit_logs').where({ entity_type: 'PRODUCT_REVIEW' })
            .whereIn('entity_id', trx('vsq_product_reviews').select('public_id')
                .whereNotNull('order_item_id').orWhere({ verified_purchase: true })).del();
        await trx('vsq_product_reviews').whereNotNull('order_item_id').orWhere({ verified_purchase: true }).del();

        // Keep referral codes, but clear old claims and attribution. Reset all
        // credits, including grants, redemptions, gift codes, and design rewards.
        await trx('vsq_credit_transactions').del();
        await trx('vsq_credit_redemptions').del();
        await trx('vsq_order_referrals').del();
        await trx('vsq_referral_claims').del();
        await trx('vsq_customer_referral_profiles').update({
            default_referrer_customer_id: null,
            default_attributed_at: null
        });
        await trx('vsq_credit_accounts').update({
            pending_balance_minor: 0,
            available_balance_minor: 0,
            version: trx.raw('version + 1'),
            updated_at: trx.fn.now()
        });
        await trx('vsq_design_rewards').del();
        await trx('vsq_design_submissions').del(); // design review events cascade
        await trx('vsq_wallet_codes').del();
        await trx('vsq_gift_purchases').del();

        // Retain coupon definitions while removing old-order usage.
        await trx('vsq_discount_codes').whereNot({ used_count: 0 }).update({
            used_count: 0,
            updated_at: trx.fn.now()
        });

        // References to items/returns/payments must go before their parents.
        await trx('vsq_refunds').del(); // refund items cascade
        await trx('vsq_return_status_history').del();
        await trx('vsq_returns').del(); // return items cascade
        await trx('vsq_shipments').del(); // shipment items and events cascade
        await trx('vsq_payment_transactions').del();
        await trx('vsq_payment_attempts').del();
        await trx('vsq_inventory_movements').where({ reference_type: 'ORDER' }).del();
        await trx('vsq_inventory_reservations').del();
        // On-hand stock already reflects past sales; only reservation holds end.
        await trx('vsq_inventory_levels').whereNot({ reserved: 0 }).update({
            reserved: 0,
            version: trx.raw('version + 1'),
            updated_at: trx.fn.now()
        });
        await trx('vsq_orders').del(); // order items, addresses, discounts, history cascade
        await trx('vsq_checkout_sessions').del(); // shipping quotes cascade
        await trx('vsq_carts').del(); // cart items cascade
    });
}

export async function down(): Promise<void> {
    throw new Error('The Vastriqo clean-launch data reset cannot be rolled back. Restore a pre-deployment database backup.');
}
