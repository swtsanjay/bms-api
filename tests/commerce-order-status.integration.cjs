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

test('acceptance, one-parcel manual handover, courier rules and cancellation are guarded', async () => {
  const host = process.env.DB_HOSTNAME;
  assert.ok(['localhost', '127.0.0.1', '::1'].includes(host), 'Only local MySQL is permitted');
  const database = `commerce_status_test_${crypto.randomBytes(5).toString('hex')}`;
  const connection = { host, user: process.env.DB_USER, password: process.env.DB_PASSWORD };
  const admin = await mysql.createConnection(connection);
  let db;
  let server;
  try {
    await admin.query(`CREATE DATABASE \`${database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
    db = knex({ client: 'mysql2', connection: { ...connection, database }, pool: { min: 0, max: 8 }, migrations: { directory: path.resolve(__dirname, '../dist/db-migrations') } });
    global.knexInstance = db;
    await db.migrate.latest();
    const staff = {};
    for (const role of ['ADMIN', 'EMPLOYEE', 'CHECKER']) {
      const [id] = await db('users').insert({ name: role, email: `${role.toLowerCase()}@example.test`, user_type: role });
      staff[role] = Number(id);
    }
    const [customerId] = await db('vsq_customers').insert({ public_id: crypto.randomUUID(), email: 'buyer@example.test', email_normalized: 'buyer@example.test', status: 'ACTIVE' });
    async function makeOrder(status, financial, method) {
      const [cartId] = await db('vsq_carts').insert({ public_id: crypto.randomUUID(), customer_id: customerId });
      const [sessionId] = await db('vsq_checkout_sessions').insert({ public_id: crypto.randomUUID(), cart_id: cartId, customer_id: customerId, status: 'COMPLETED', expires_at: new Date(Date.now() + 86400000) });
      const publicId = crypto.randomUUID();
      await db('vsq_orders').insert({ public_id: publicId, order_number: `TEST-${crypto.randomBytes(4).toString('hex')}`, customer_id: customerId, checkout_session_id: sessionId,
        email_snapshot: 'buyer@example.test', order_status: status, financial_status: financial, fulfillment_status: 'UNFULFILLED', payment_method: method, placed_at: new Date() });
      return publicId;
    }
    const ready = await makeOrder('CONFIRMED', 'PAID', 'MANUAL');
    const unpaid = await makeOrder('PENDING_PAYMENT', 'PENDING', 'MANUAL');
    const config = require('../dist/config').default;
    const app = express();
    app.use(express.json());
    let failNextCancellationResponse = false;
    app.use((req, res, next) => {
      if (req.method === 'POST' && req.path.endsWith('/cancel')) {
        const sendJson = res.json.bind(res);
        res.json = (payload) => {
          if (failNextCancellationResponse && payload?.success === true) {
            failNextCancellationResponse = false;
            throw new Error('Injected response error after cancellation commit');
          }
          return sendJson(payload);
        };
      }
      next();
    });
    app.use('/staff', require('../dist/api/admin/middlewares/jwt-auth').verifyJWT, require('../dist/modules/commerce/admin/route').default);
    server = app.listen(0, '127.0.0.1');
    await new Promise((resolve) => server.once('listening', resolve));
    const root = `http://127.0.0.1:${server.address().port}`;
    function token(role) { return jwt.sign({ id: staff[role], type: 'BMS_STAFF' }, config.jwt.secretKey, { audience: 'bms-admin', expiresIn: '1h' }); }
    async function update(id, role, status = 'ACCEPTED') {
      const response = await fetch(`${root}/staff/orders/${id}/status`, { method: 'PATCH', headers: { authorization: `Bearer ${token(role)}`, 'content-type': 'application/json' }, body: JSON.stringify({ status, note: 'Preparing order' }) });
      const text = await response.text();
      return { status: response.status, body: text.startsWith('{') ? JSON.parse(text) : null };
    }
    assert.equal((await update(ready, 'EMPLOYEE')).status, 403);
    assert.equal((await update(ready, 'CHECKER')).status, 403);
    assert.notEqual((await update(ready, 'ADMIN', 'COMPLETED')).status, 200);
    assert.equal((await update(unpaid, 'ADMIN')).status, 409);
    const changed = await update(ready, 'ADMIN');
    assert.equal(changed.status, 200);
    assert.equal(changed.body.data.order.order_status, 'ACCEPTED');
    assert.equal((await update(ready, 'ADMIN')).status, 409);
    const saved = await db('vsq_orders').where({ public_id: ready }).first();
    const history = await db('vsq_order_status_history').where({ order_id: saved.id });
    assert.equal(history.length, 1);
    assert.equal(history[0].from_status, 'CONFIRMED');
    assert.equal(history[0].to_status, 'ACCEPTED');
    assert.equal(history[0].reason, 'Preparing order');
    assert.equal(Number(history[0].actor_id), staff.ADMIN);

    async function call(id, path, method, body) {
      const response = await fetch(`${root}/staff/orders/${id}${path}`, {
        method, headers: { authorization: `Bearer ${token('ADMIN')}`, 'content-type': 'application/json' }, body: JSON.stringify(body)
      });
      const text = await response.text();
      return { status: response.status, body: text.startsWith('{') ? JSON.parse(text) : null };
    }
    const [firstItem] = await db('vsq_order_items').insert({ order_id: saved.id, product_title_snapshot: 'First', quantity: 2 });
    const [secondItem] = await db('vsq_order_items').insert({ order_id: saved.id, product_title_snapshot: 'Second', quantity: 1 });
    const invalidUrl = await call(ready, '/shipments', 'POST', { courier_type: 'OTHER', courier_name: 'DTDC', tracking_url: 'javascript:alert(1)' });
    assert.notEqual(invalidUrl.status, 201);
    const partial = await call(ready, '/shipments', 'POST', { courier_type: 'OTHER', courier_name: 'DTDC', items: [{ order_item_id: firstItem, quantity: 1 }] });
    assert.notEqual(partial.status, 201);
    const prepared = await call(ready, '/shipments', 'POST', { courier_type: 'OTHER', courier_name: 'DTDC', tracking_number: 'AWB-TEST-1' });
    assert.equal(prepared.status, 201);
    assert.equal(prepared.body.data.order.shipments[0].status, 'PREPARING');
    assert.equal(prepared.body.data.order.shipments[0].shipped_at, null);
    assert.equal(prepared.body.data.order.order_status, 'ACCEPTED');
    assert.equal(prepared.body.data.order.fulfillment_status, 'UNFULFILLED');
    assert.equal(prepared.body.data.order.shipments.length, 1);
    assert.equal(prepared.body.data.order.shipments[0].provider, 'OTHER_MANUAL');
    assert.deepEqual(prepared.body.data.order.shipments[0].items.map((item) => [item.order_item_id, item.quantity]), [[firstItem, 2], [secondItem, 1]]);
    assert.equal(prepared.body.data.order.shipments[0].tracking_number, 'AWB-TEST-1');
    assert.deepEqual(prepared.body.data.order.items.map((item) => item.fulfilled_quantity), [0, 0]);
    assert.equal((await call(ready, '/shipments', 'POST', { courier_type: 'SHIPROCKET' })).status, 409);
    const shipment = prepared.body.data.order.shipments[0].public_id;
    const changedDetails = await call(ready, `/shipments/${shipment}/details`, 'PATCH', { courier_name: 'DTDC', tracking_number: 'AWB-TEST-1', tracking_url: 'https://www.dtdc.com/track-your-shipment/' });
    assert.equal(changedDetails.status, 200);
    assert.equal(changedDetails.body.data.order.shipments[0].status, 'PREPARING');
    assert.equal(changedDetails.body.data.order.shipments[0].tracking_url, 'https://www.dtdc.com/track-your-shipment/');
    assert.notEqual((await call(ready, `/shipments/${shipment}/details`, 'PATCH', { courier_name: '' })).status, 200);
    assert.equal((await call(ready, `/shipments/${shipment}`, 'PATCH', { status: 'DELIVERED' })).status, 409);
    const handed = await call(ready, `/shipments/${shipment}`, 'PATCH', { status: 'SHIPPED' });
    assert.equal(handed.status, 200);
    assert.equal(handed.body.data.order.order_status, 'SHIPPED');
    assert.equal(handed.body.data.order.fulfillment_status, 'FULFILLED');
    assert.deepEqual(handed.body.data.order.items.map((item) => item.fulfilled_quantity), [2, 1]);
    assert.equal((await call(ready, `/shipments/${shipment}/details`, 'PATCH', { courier_name: 'Changed' })).status, 409);
    assert.equal((await call(ready, `/shipments/${shipment}`, 'PATCH', { status: 'SHIPPED' })).status, 409);
    assert.equal((await call(ready, '/cancel', 'POST', { reason: 'Too late' })).status, 409);
    assert.equal((await call(ready, '/cancel-request', 'POST', { reason: 'Intercept if possible' })).status, 200);
    assert.equal((await call(ready, '/cancel-request', 'POST', { reason: 'Duplicate' })).status, 200);
    assert.equal((await db('vsq_order_status_history').where({ order_id: saved.id, status_type: 'CANCELLATION' })).length, 1);
    assert.equal((await call(ready, `/shipments/${shipment}`, 'PATCH', { status: 'IN_TRANSIT' })).status, 200);
    assert.equal((await call(ready, `/shipments/${shipment}`, 'PATCH', { status: 'OUT_FOR_DELIVERY' })).status, 200);
    assert.equal((await call(ready, `/shipments/${shipment}`, 'PATCH', { status: 'DELIVERY_ISSUE' })).status, 200);
    assert.equal((await call(ready, `/shipments/${shipment}`, 'PATCH', { status: 'IN_TRANSIT' })).status, 200);
    const deliveredAll = await call(ready, `/shipments/${shipment}`, 'PATCH', { status: 'DELIVERED' });
    assert.equal(deliveredAll.body.data.order.order_status, 'COMPLETED');
    assert.equal(deliveredAll.body.data.order.fulfillment_status, 'DELIVERED');
    assert.equal((await call(ready, `/shipments/${shipment}`, 'PATCH', { status: 'IN_TRANSIT' })).status, 409);

    const beforeHandover = await makeOrder('CONFIRMED', 'PENDING', 'COD');
    assert.equal((await update(beforeHandover, 'ADMIN')).status, 200);
    const beforeRow = await db('vsq_orders').where({ public_id: beforeHandover }).first();
    await db('vsq_order_items').insert({ order_id: beforeRow.id, product_title_snapshot: 'COD item', quantity: 1 });
    assert.equal((await call(beforeHandover, '/shipments', 'POST', { courier_type: 'OTHER', courier_name: 'DTDC' })).status, 409);
    const codPrepared = await call(beforeHandover, '/shipments', 'POST', { courier_type: 'SHIPROCKET', tracking_number: 'AWB-TEST-2' });
    assert.notEqual(codPrepared.status, 201);
    await db.schema.alterTable('vsq_shipments', (table) => table.dropColumn('integration_state'));
    assert.equal((await call(beforeHandover, '/cancel', 'POST', { reason: 'Before handover' })).status, 200);
    assert.equal(await db('vsq_shipments').where({ order_id: beforeRow.id }).first(), undefined);

    const uncertain = await makeOrder('ACCEPTED', 'UNPAID', 'COD');
    const uncertainRow = await db('vsq_orders').where({ public_id: uncertain }).first();
    await db('vsq_shipments').insert({ public_id: crypto.randomUUID(), order_id: uncertainRow.id, provider: 'SHIPROCKET', status: 'PREPARING' });
    const blocked = await call(uncertain, '/cancel', 'POST', { reason: 'Unverified courier state' });
    assert.equal(blocked.status, 409);
    assert.match(blocked.body.message, /verify the Shiprocket booking/);
    assert.equal((await db('vsq_orders').where({ id: uncertainRow.id }).first()).order_status, 'ACCEPTED');
    assert.equal((await db('vsq_order_status_history').where({ order_id: uncertainRow.id, to_status: 'CANCELLED' })).length, 0);
    assert.equal((await call(uncertain, '/cancel-request', 'POST', { reason: 'Review the booking' })).status, 200);
    assert.equal((await call(uncertain, '/cancel-request', 'POST', { reason: 'Duplicate request' })).status, 200);
    assert.equal((await db('vsq_order_status_history').where({ order_id: uncertainRow.id, status_type: 'CANCELLATION' })).length, 1);

    const responseLost = await makeOrder('ACCEPTED', 'PAID', 'MANUAL');
    const responseLostRow = await db('vsq_orders').where({ public_id: responseLost }).first();
    await db('vsq_order_items').insert({ order_id: responseLostRow.id, product_title_snapshot: 'Prepared item', quantity: 1 });
    assert.equal((await call(responseLost, '/shipments', 'POST', { courier_type: 'OTHER', courier_name: 'DTDC' })).status, 201);
    failNextCancellationResponse = true;
    const lost = await call(responseLost, '/cancel', 'POST', { reason: 'Before handover' });
    assert.equal(lost.status, 500);
    assert.match(lost.body.message, /was recorded.*Refresh the order/);
    assert.equal((await db('vsq_orders').where({ id: responseLostRow.id }).first()).order_status, 'CANCELLED');
    assert.equal((await db('vsq_orders').where({ id: responseLostRow.id }).first()).financial_status, 'REFUND_PENDING');
    assert.equal((await call(responseLost, '/cancel', 'POST', { reason: 'Retry after lost response' })).status, 200);
    assert.equal((await db('vsq_order_status_history').where({ order_id: responseLostRow.id, to_status: 'CANCELLED' })).length, 1);
    assert.equal((await db('vsq_shipment_events').where({ status: 'CANCELLED' })).length, 1);

    const adminService = require('../dist/modules/commerce/admin/service').default;
    const method = await db('vsq_shipping_methods').where({ code: 'STANDARD_MANUAL' }).first();
    const [zoneId] = await db('vsq_shipping_zones').insert({ name: 'Response test zone', status: 'ACTIVE', cod_enabled: true });
    const [rateId] = await db('vsq_shipping_rates').insert({ zone_id: zoneId, method_id: method.id, amount: 20, status: 'ACTIVE' });
    const updatedRate = await adminService.updateShippingRate(rateId, { amount: 35, free_above_amount: 100 });
    assert.equal(Number(updatedRate.amount), 35);
    assert.equal(Number(updatedRate.free_above_amount), 100);
    await assert.rejects(adminService.updateShippingRate(99999999, { amount: 50 }), (error) => error.statusCode === 404);

    const schemaFailure = await makeOrder('ACCEPTED', 'UNPAID', 'COD');
    const schemaFailureRow = await db('vsq_orders').where({ public_id: schemaFailure }).first();
    await db.schema.alterTable('vsq_order_status_history', (table) => table.dropColumn('reason'));
    const incompatible = await call(schemaFailure, '/cancel', 'POST', { reason: 'Schema error should roll back' });
    assert.equal(incompatible.status, 503);
    assert.match(incompatible.body.message, /database schema is incompatible/);
    assert.equal((await db('vsq_orders').where({ id: schemaFailureRow.id }).first()).order_status, 'ACCEPTED');
    assert.equal((await db('vsq_order_status_history').where({ order_id: schemaFailureRow.id })).length, 0);
  } finally {
    if (server) await new Promise((resolve) => server.close(resolve));
    if (db) await db.destroy();
    delete global.knexInstance;
    await admin.query(`DROP DATABASE IF EXISTS \`${database}\``);
    await admin.end();
  }
});
