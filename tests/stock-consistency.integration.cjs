// Run after npm run build. Creates and drops only a random local MySQL schema.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const path = require('node:path');
const express = require('express');
const jwt = require('jsonwebtoken');
const knex = require('knex');
const mysql = require('mysql2/promise');
require('dotenv').config();

test('stock edits, payment, release and checkout concurrency preserve on-hand reservations', async () => {
  const host = process.env.DB_HOSTNAME;
  assert.ok(['localhost', '127.0.0.1', '::1'].includes(host), 'Only local MySQL is permitted');
  const database = `stock_consistency_test_${crypto.randomBytes(5).toString('hex')}`;
  const connection = { host, user: process.env.DB_USER, password: process.env.DB_PASSWORD };
  const adminConnection = await mysql.createConnection(connection);
  let db;
  let server;
  try {
    await adminConnection.query(`CREATE DATABASE \`${database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
    db = knex({ client: 'mysql2', connection: { ...connection, database }, pool: { min: 0, max: 12 }, migrations: { directory: path.resolve(__dirname, '../dist/db-migrations') } });
    global.knexInstance = db;
    await db.migrate.latest();
    const Admin = require('../dist/modules/commerce/admin/service').default;
    const Checkout = require('../dist/modules/commerce/checkout/service').default;
    const Maintenance = require('../dist/modules/commerce/maintenance/service').default;
    const { finalizeCapturedPayment } = require('../dist/modules/commerce/payment/service');
    const config = require('../dist/config').default;
    const [staffId] = await db('users').insert({ name: 'Stock Admin', email: 'stock-admin@example.test', user_type: 'ADMIN' });
    const product = await Admin.saveProduct({ title: 'Stock fixture', status: 'ACTIVE', variants: [{ title: 'Default', price: 100, inventory_quantity: 10 }] }, staffId);
    const variant = (await Admin.product(product.public_id)).variants[0];
    const location = await db('vsq_inventory_locations').where({ code: 'PRIMARY' }).first();
    const [customerId] = await db('vsq_customers').insert({ public_id: crypto.randomUUID(), email: 'stock-fixture@example.test', email_normalized: 'stock-fixture@example.test', status: 'ACTIVE' });
    const [zoneId] = await db('vsq_shipping_zones').insert({ name: 'India', status: 'ACTIVE', cod_enabled: true, created_at: new Date(), updated_at: new Date() });
    const method = await db('vsq_shipping_methods').where({ code: 'STANDARD_MANUAL' }).first();
    await db('vsq_shipping_rates').where({ method_id: method.id }).delete();
    await db('vsq_shipping_rates').insert({ zone_id: zoneId, method_id: method.id, amount: 0, status: 'ACTIVE', created_at: new Date(), updated_at: new Date() });
    async function place(quantity, paymentMethod = 'MANUAL') {
      const cartPublicId = crypto.randomUUID();
      const [cartId] = await db('vsq_carts').insert({ public_id: cartPublicId, customer_id: customerId, status: 'ACTIVE', subtotal: 100 * quantity, grand_total: 100 * quantity, created_at: new Date(), updated_at: new Date() });
      await db('vsq_cart_items').insert({ cart_id: cartId, variant_id: variant.id, quantity, unit_price: 100, line_total: 100 * quantity, created_at: new Date(), updated_at: new Date() });
      return Checkout.placeOrder({ cartPublicId, customerId, shippingAddress: { first_name: 'Stock', address_line_1: '1 Test', city: 'Delhi', state: 'Delhi', postcode: '110001' }, shippingMethodCode: 'STANDARD_MANUAL', paymentMethod, idempotencyKey: crypto.randomUUID() });
    }
    async function save(stock, overrides = {}) {
      return Admin.saveProduct({ public_id: product.public_id, title: 'Stock fixture', status: 'ACTIVE', variants: [{ public_id: variant.public_id, title: variant.title, price: 100, ...(stock === undefined ? {} : { inventory_quantity: stock }) }], ...overrides }, staffId);
    }
    async function level() { return db('vsq_inventory_levels').where({ variant_id: variant.id, location_id: location.id }).first(); }
    async function assertInvariant() { const row = await level(); assert.ok(Number(row.reserved) <= Number(row.on_hand), JSON.stringify(row)); return row; }
    async function movements() { return db('vsq_inventory_movements').where({ variant_id: variant.id }).orderBy('id'); }

    const order = await place(2);
    assert.equal(order.order_status, 'PENDING_PAYMENT');
    const before = await assertInvariant();
    assert.equal(Number(before.on_hand), 10);
    assert.equal(Number(before.reserved), 2);
    assert.deepEqual((await movements()).map((item) => Number(item.quantity_delta)), [10]);

    await save(12);
    assert.equal(Number((await assertInvariant()).on_hand), 12);
    await db('vsq_inventory_levels').where({ variant_id: variant.id, location_id: location.id }).update({ safety_stock: 3 });
    await save(2);
    const atReserved = await assertInvariant();
    assert.equal(Number(atReserved.on_hand), 2);
    assert.equal(Number(atReserved.reserved), 2);
    assert.equal(Number(atReserved.safety_stock), 3, 'safety stock stays a sales threshold, not a reservation');
    await assert.rejects(place(1), /does not have enough stock/, 'checkout still applies the safety-stock threshold');
    const movementCount = (await movements()).length;
    await assert.rejects(save(1, { title: 'Should roll back', variants: [{ public_id: variant.public_id, title: variant.title, price: 2, inventory_quantity: 1 }] }),
      (error) => error.statusCode === 422 && /2 units are reserved/.test(error.message));
    const app = express();
    app.use(express.json());
    app.use('/staff', require('../dist/api/admin/middlewares/jwt-auth').verifyJWT, require('../dist/modules/commerce/admin/route').default);
    server = app.listen(0, '127.0.0.1');
    await new Promise((resolve) => server.once('listening', resolve));
    const token = jwt.sign({ id: staffId, type: 'BMS_STAFF' }, config.jwt.secretKey, { audience: 'bms-admin', expiresIn: '1h' });
    const response = await fetch(`http://127.0.0.1:${server.address().port}/staff/products/${product.public_id}`, {
      method: 'PUT', headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
      body: JSON.stringify({ title: 'HTTP should roll back', variants: [{ public_id: variant.public_id, title: variant.title, price: 3, inventory_quantity: 1 }] })
    });
    assert.equal(response.status, 422);
    assert.match((await response.json()).message, /2 units are reserved/);
    assert.equal((await Admin.product(product.public_id)).title, 'Stock fixture');
    assert.equal((await Admin.product(product.public_id)).variants[0].price, 100);
    assert.equal((await movements()).length, movementCount);
    assert.equal(Number((await assertInvariant()).on_hand), 2);
    await save(undefined);
    assert.equal(Number((await assertInvariant()).on_hand), 2, 'omitting stock retains on-hand quantity');
    assert.equal((await movements()).length, movementCount);
    assert.deepEqual((await movements()).map((item) => [item.type, Number(item.quantity_delta), Number(item.balance_after)]),
      [['ADJUSTMENT', 10, 10], ['ADJUSTMENT', 2, 12], ['ADJUSTMENT', -10, 2]]);
    const adjustment = (await movements())[1];
    assert.equal(adjustment.actor_type, 'STAFF');
    assert.equal(Number(adjustment.actor_id), Number(staffId));
    assert.equal(adjustment.reference_type, 'PRODUCT');
    assert.equal(adjustment.reference_id, product.public_id);

    const reservation = await db('vsq_inventory_reservations').where({ order_id: (await db('vsq_orders').where({ public_id: order.public_id }).first()).id }).first();
    await db('vsq_inventory_reservations').where({ id: reservation.id }).update({ expires_at: new Date(Date.now() - 1000) });
    assert.equal(await Maintenance.releaseExpiredReservations(), 1);
    assert.equal(Number((await assertInvariant()).reserved), 0);
    assert.equal(Number((await level()).on_hand), 2);
    await save(0);
    assert.equal(Number((await assertInvariant()).on_hand), 0);

    await db('vsq_inventory_levels').where({ variant_id: variant.id, location_id: location.id }).update({ safety_stock: 0 });
    await save(6);
    const priorPayments = config.razorpay.enabled;
    config.razorpay.enabled = true;
    let online;
    try { online = await place(2, 'RAZORPAY'); }
    finally { config.razorpay.enabled = priorPayments; }
    assert.equal(Number((await assertInvariant()).reserved), 2);
    const onlineOrder = await db('vsq_orders').where({ public_id: online.public_id }).first();
    await db('vsq_payment_attempts').where({ order_id: onlineOrder.id }).update({ provider_order_id: 'isolated-provider-order' });
    await save(2);
    const paid = await finalizeCapturedPayment({ providerOrderId: 'isolated-provider-order', providerPaymentId: 'isolated-provider-payment',
      amount: Math.round(online.grand_total * 100), currency: 'INR', source: 'WEBHOOK' });
    assert.equal(paid.financial_status, 'PAID');
    const afterPayment = await assertInvariant();
    assert.equal(Number(afterPayment.on_hand), 0);
    assert.equal(Number(afterPayment.reserved), 0);
    assert.equal((await movements()).at(-1).type, 'SALE');

    await Admin.updateOrderStatus(online.public_id, 'ACCEPTED', staffId);
    const prepared = await Admin.createShipment(online.public_id, { courier_type: 'OTHER', courier_name: 'DTDC', tracking_number: 'PREPARED-ONLY' }, staffId);
    assert.equal(prepared.order_status, 'ACCEPTED');
    assert.equal(prepared.shipments[0].status, 'PREPARING');
    assert.equal(Number((await assertInvariant()).on_hand), 0, 'AWB preparation does not alter sold inventory');
    const cancelled = await Admin.cancelOrder(online.public_id, staffId, 'Cancelled before courier handover');
    assert.equal(cancelled.order_status, 'CANCELLED');
    assert.equal(cancelled.financial_status, 'REFUND_PENDING');
    assert.equal(cancelled.shipments[0].status, 'CANCELLED');
    assert.equal(Number((await assertInvariant()).on_hand), 2, 'unshipped sold stock is restored once');
    assert.equal((await db('vsq_refunds').where({ order_id: onlineOrder.id }).first()).status, 'PENDING');
    await Admin.cancelOrder(online.public_id, staffId, 'Duplicate cancellation');
    assert.equal(Number((await assertInvariant()).on_hand), 2);

    await save(4);
    const [checkoutResult, editResult] = await Promise.allSettled([place(3), save(2)]);
    assert.notEqual(checkoutResult.status, editResult.status, 'only checkout or the conflicting edit can commit');
    const concurrent = await assertInvariant();
    assert.ok([2, 4].includes(Number(concurrent.on_hand)));
    assert.ok([0, 3].includes(Number(concurrent.reserved)));
    assert.ok(Number(concurrent.on_hand) - Number(concurrent.reserved) >= 0);
  } finally {
    if (server) await new Promise((resolve) => server.close(resolve));
    if (db) await db.destroy();
    await adminConnection.query(`DROP DATABASE IF EXISTS \`${database}\``);
    await adminConnection.end();
  }
});
