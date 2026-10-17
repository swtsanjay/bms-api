// Run after npm run build. Creates and destroys a disposable local MySQL schema.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const path = require('node:path');
const knex = require('knex');
const mysql = require('mysql2/promise');
require('dotenv').config();

test('clean launch removes Vastriqo commerce data while preserving users, catalog and BMS orders', async () => {
  const host = process.env.DB_HOSTNAME;
  assert.ok(['localhost', '127.0.0.1', '::1'].includes(host), 'Only local MySQL is permitted');
  const name = `vsq_clean_launch_${crypto.randomBytes(5).toString('hex')}`;
  const connection = { host, user: process.env.DB_USER, password: process.env.DB_PASSWORD };
  const root = await mysql.createConnection(connection);
  let db;
  try {
    await root.query(`CREATE DATABASE \`${name}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
    db = knex({ client: 'mysql2', connection: { ...connection, database: name }, pool: { min: 0, max: 8 }, migrations: { directory: path.resolve(__dirname, '../dist/db-migrations') } });
    await db.migrate.latest();
    const cleanup = require('../dist/db-migrations/20261017160000_vsq_clean_launch');
    const [staffId] = await db('users').insert({ name: 'Staff', email: 'staff@example.test', user_type: 'ADMIN' });
    const [bmsOrderId] = await db('orders').insert({ user_id: staffId, client_id: staffId, created_by: staffId });
    const [customerId] = await db('vsq_customers').insert({ public_id: crypto.randomUUID(), email: 'buyer@example.test', email_normalized: 'buyer@example.test' });
    const [referrerId] = await db('vsq_customers').insert({ public_id: crypto.randomUUID(), email: 'referrer@example.test', email_normalized: 'referrer@example.test' });
    await db('vsq_customer_credentials').insert({ customer_id: customerId, password_hash: 'hash' });
    await db('vsq_customer_addresses').insert({ public_id: crypto.randomUUID(), customer_id: customerId, first_name: 'Buyer', address_line_1: 'Address', city: 'Delhi', state: 'Delhi', postcode: '110001' });
    const [productId] = await db('vsq_products').insert({ public_id: crypto.randomUUID(), slug: 'launch-shirt', title: 'Launch shirt' });
    const [variantId] = await db('vsq_product_variants').insert({ public_id: crypto.randomUUID(), product_id: productId, title: 'Default' });
    const [locationId] = await db('vsq_inventory_locations').insert({ code: 'LAUNCH', name: 'Launch warehouse' });
    await db('vsq_inventory_levels').insert({ variant_id: variantId, location_id: locationId, on_hand: 7, reserved: 2 });
    const [cartId] = await db('vsq_carts').insert({ public_id: crypto.randomUUID(), customer_id: customerId });
    await db('vsq_cart_items').insert({ cart_id: cartId, variant_id: variantId, quantity: 1, unit_price: 100, line_total: 100 });
    const [checkoutId] = await db('vsq_checkout_sessions').insert({ public_id: crypto.randomUUID(), cart_id: cartId, customer_id: customerId, status: 'COMPLETED', expires_at: new Date(Date.now() + 86400000) });
    const orderPublicId = crypto.randomUUID();
    const [orderId] = await db('vsq_orders').insert({ public_id: orderPublicId, order_number: 'VSQ-OLD-1', customer_id: customerId, checkout_session_id: checkoutId, email_snapshot: 'buyer@example.test' });
    const [itemId] = await db('vsq_order_items').insert({ order_id: orderId, variant_id: variantId, product_title_snapshot: 'Launch shirt', quantity: 1 });
    await db('vsq_order_addresses').insert({ order_id: orderId, type: 'SHIPPING', address_json: '{}' });
    await db('vsq_order_status_history').insert({ order_id: orderId, status_type: 'ORDER', to_status: 'ACCEPTED' });
    const [attemptId] = await db('vsq_payment_attempts').insert({ public_id: crypto.randomUUID(), order_id: orderId, idempotency_key: 'old-checkout' });
    await db('vsq_payment_transactions').insert({ public_id: crypto.randomUUID(), payment_attempt_id: attemptId, type: 'CAPTURE', status: 'SUCCESS' });
    const [shipmentId] = await db('vsq_shipments').insert({ public_id: crypto.randomUUID(), order_id: orderId });
    await db('vsq_shipment_items').insert({ shipment_id: shipmentId, order_item_id: itemId, quantity: 1 });
    await db('vsq_shipment_events').insert({ shipment_id: shipmentId, status: 'IN_TRANSIT', occurred_at: new Date() });
    const [returnId] = await db('vsq_returns').insert({ public_id: crypto.randomUUID(), return_number: 'RET-OLD-1', order_id: orderId });
    await db('vsq_return_items').insert({ return_id: returnId, order_item_id: itemId, quantity: 1 });
    await db('vsq_return_status_history').insert({ return_id: returnId, to_status: 'APPROVED', actor_type: 'ADMIN', actor_id: staffId });
    const [refundId] = await db('vsq_refunds').insert({ public_id: crypto.randomUUID(), order_id: orderId, return_id: returnId, payment_attempt_id: attemptId });
    await db('vsq_refund_items').insert({ refund_id: refundId, order_item_id: itemId, quantity: 1 });
    await db('vsq_inventory_reservations').insert({ variant_id: variantId, location_id: locationId, cart_id: cartId, checkout_session_id: checkoutId, order_id: orderId, quantity: 2, expires_at: new Date(Date.now() + 86400000), idempotency_key: 'old-reservation' });
    await db('vsq_inventory_movements').insert({ variant_id: variantId, location_id: locationId, type: 'SALE', quantity_delta: -1, balance_after: 7, reference_type: 'ORDER', reference_id: orderPublicId });
    const [discountId] = await db('vsq_discount_codes').insert({ public_id: crypto.randomUUID(), code: 'LAUNCH10', title: 'Old sale', discount_type: 'PERCENTAGE', value: 10, used_count: 1 });
    await db('vsq_order_discounts').insert({ order_id: orderId, discount_code_id: discountId, title_snapshot: 'Old sale' });
    await db('vsq_customer_referral_profiles').insert({ customer_id: customerId, referral_code: 'VSQBUYER', default_referrer_customer_id: referrerId, default_attributed_at: new Date() });
    await db('vsq_customer_referral_profiles').insert({ customer_id: referrerId, referral_code: 'VSQREFERRER' });
    const [claimId] = await db('vsq_referral_claims').insert({ public_id: crypto.randomUUID(), customer_id: customerId, referrer_customer_id: referrerId, referral_code_snapshot: 'VSQREFERRER', source: 'CHECKOUT', expires_at: new Date(Date.now() + 86400000) });
    const [referralId] = await db('vsq_order_referrals').insert({ public_id: crypto.randomUUID(), order_id: orderId, buyer_customer_id: customerId, referrer_customer_id: referrerId, referral_claim_id: claimId, referral_code_snapshot: 'VSQREFERRER', attribution_type: 'OVERRIDE' });
    await db('vsq_credit_accounts').insert({ customer_id: customerId, pending_balance_minor: 50, available_balance_minor: 100 });
    await db('vsq_credit_transactions').insert({ public_id: crypto.randomUUID(), customer_id: customerId, order_id: orderId, order_referral_id: referralId, type: 'ADMIN_ADJUSTMENT', available_delta_minor: 100, idempotency_key: 'old-credit' });
    await db('vsq_credit_redemptions').insert({ public_id: crypto.randomUUID(), customer_id: customerId, order_id: orderId, amount_minor: 100 });
    const [purchaseId] = await db('vsq_gift_purchases').insert({ public_id: crypto.randomUUID(), buyer_customer_id: customerId, amount_minor: 10000, status: 'PAID', idempotency_key: 'old-gift' });
    await db('vsq_wallet_codes').insert({ public_id: crypto.randomUUID(), code_hash: 'a'.repeat(64), kind: 'GIFT', amount_minor: 10000, purchase_id: purchaseId });
    const [designId] = await db('vsq_design_submissions').insert({ public_id: crypto.randomUUID(), customer_id: customerId, phone: '9000000000', original_filename: 'design.png', mime_type: 'image/png', byte_size: 10, checksum_sha256: 'b'.repeat(64), object_key: 'old-design', status: 'APPROVED' });
    await db('vsq_design_rewards').insert({ customer_id: customerId, submission_id: designId });
    await db('vsq_design_review_events').insert({ submission_id: designId, actor_id: staffId, from_status: 'PENDING', to_status: 'APPROVED' });
    await db('vsq_product_reviews').insert({ public_id: crypto.randomUUID(), product_id: productId, customer_id: customerId, order_item_id: itemId, reviewer_name: 'Buyer', rating: 5, body: 'Old review', verified_purchase: true });
    await db('inquiries').insert({ name: 'Buyer', email: 'buyer@example.test', phone: '9000000000', requirements: 'Old order', commerce_order_id: orderId });
    await db('vsq_email_outbox').insert([{ public_id: crypto.randomUUID(), event_key: 'old-order-email', template: 'ORDER_PLACED', recipient_email: 'buyer@example.test', payload_json: '{}' }, { public_id: crypto.randomUUID(), event_key: 'welcome-email', template: 'WELCOME', recipient_email: 'buyer@example.test', payload_json: '{}' }]);
    await db('vsq_provider_webhook_events').insert({ provider: 'RAZORPAY', provider_event_id: 'old-payment-event', event_type: 'payment.captured', payload_json: '{}' });
    await db('vsq_outbox_events').insert([{ event_key: 'old-order-event', aggregate_type: 'ORDER', aggregate_id: orderPublicId, event_type: 'commerce.order.placed', payload: '{}' }, { event_key: 'keep-product-event', aggregate_type: 'PRODUCT', aggregate_id: String(productId), event_type: 'commerce.product.saved', payload: '{}' }]);
    await db('vsq_commerce_audit_logs').insert({ actor_type: 'ADMIN', action: 'PACKAGE_CODE_REVEALED', entity_type: 'PACKAGE_CODE', entity_id: 'old-code' });

    await cleanup.up(db);
    for (const table of ['vsq_orders', 'vsq_order_items', 'vsq_payment_attempts', 'vsq_payment_transactions', 'vsq_shipments', 'vsq_shipment_events', 'vsq_returns', 'vsq_refunds', 'vsq_credit_transactions', 'vsq_credit_redemptions', 'vsq_order_referrals', 'vsq_referral_claims', 'vsq_design_submissions', 'vsq_design_rewards', 'vsq_wallet_codes', 'vsq_gift_purchases', 'vsq_product_reviews', 'vsq_checkout_sessions', 'vsq_carts', 'vsq_inventory_reservations', 'vsq_provider_webhook_events', 'vsq_inventory_movements', 'vsq_commerce_audit_logs']) {
      assert.equal(Number((await db(table).count({ total: '*' }).first()).total), 0, table);
    }
    assert.equal(Number((await db('vsq_customers').count({ total: '*' }).first()).total), 2);
    assert.equal(Number((await db('users').count({ total: '*' }).first()).total), 1);
    assert.ok(await db('orders').where({ id: bmsOrderId }).first());
    assert.ok(await db('vsq_products').where({ id: productId }).first());
    assert.ok(await db('vsq_customer_credentials').where({ customer_id: customerId }).first());
    assert.ok(await db('vsq_customer_addresses').where({ customer_id: customerId }).first());
    const stock = await db('vsq_inventory_levels').where({ variant_id: variantId, location_id: locationId }).first();
    assert.equal(stock.on_hand, 7);
    assert.equal(stock.reserved, 0);
    assert.equal(Number((await db('vsq_credit_accounts').where({ customer_id: customerId }).first()).available_balance_minor), 0);
    assert.equal(Number((await db('vsq_discount_codes').where({ id: discountId }).first()).used_count), 0);
    assert.equal((await db('vsq_customer_referral_profiles').where({ customer_id: customerId }).first()).default_referrer_customer_id, null);
    assert.equal((await db('inquiries').first()).commerce_order_id, null);
    assert.deepEqual((await db('vsq_email_outbox').pluck('template')), ['WELCOME']);
    assert.deepEqual((await db('vsq_outbox_events').pluck('aggregate_type')), ['PRODUCT']);
    await cleanup.up(db); // Safe if invoked again before migration bookkeeping is written.
  } finally {
    if (db) await db.destroy();
    await root.query(`DROP DATABASE IF EXISTS \`${name}\``);
    await root.end();
  }
});
