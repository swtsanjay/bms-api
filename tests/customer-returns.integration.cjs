// Run after npm run build. All writes are confined to a random local MySQL schema.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const path = require('node:path');
const express = require('express');
const jwt = require('jsonwebtoken');
const knex = require('knex');
const mysql = require('mysql2/promise');
require('dotenv').config();

test('customer return eligibility, concurrency, ownership and staff review are isolated and auditable', async () => {
  const host = process.env.DB_HOSTNAME;
  assert.ok(['localhost', '127.0.0.1', '::1'].includes(host), 'Only local MySQL is permitted');
  const database = `returns_test_${crypto.randomBytes(5).toString('hex')}`;
  const connection = { host, user: process.env.DB_USER, password: process.env.DB_PASSWORD };
  const admin = await mysql.createConnection(connection);
  let db;
  let server;
  let auth;
  let originalVerify;
  try {
    await admin.query(`CREATE DATABASE \`${database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
    db = knex({ client: 'mysql2', connection: { ...connection, database }, pool: { min: 0, max: 12 }, migrations: { directory: path.resolve(__dirname, '../dist/db-migrations') } });
    global.knexInstance = db;
    await db.migrate.latest();
    async function customer(email) {
      const [id] = await db('vsq_customers').insert({ public_id: crypto.randomUUID(), email, email_normalized: email, status: 'ACTIVE' });
      return Number(id);
    }
    const owner = await customer('return-owner@example.test');
    const other = await customer('return-other@example.test');
    async function order(customerId, name) {
      const [cartId] = await db('vsq_carts').insert({ public_id: crypto.randomUUID(), customer_id: customerId });
      const [sessionId] = await db('vsq_checkout_sessions').insert({ public_id: crypto.randomUUID(), cart_id: cartId, customer_id: customerId, status: 'COMPLETED', expires_at: new Date(Date.now() + 86400000) });
      const publicId = crypto.randomUUID();
      const [id] = await db('vsq_orders').insert({ public_id: publicId, order_number: name, customer_id: customerId, checkout_session_id: sessionId,
        email_snapshot: `${name}@example.test`, order_status: 'CONFIRMED', financial_status: 'PAID', fulfillment_status: 'PARTIALLY_FULFILLED',
        placed_at: new Date(Date.now() - 20 * 86400000) });
      return { id: Number(id), publicId };
    }
    const own = await order(owner, 'RETURN-OWNER');
    const foreign = await order(other, 'RETURN-OTHER');
    async function item(orderId, title, quantity, refunded = 0) {
      const [id] = await db('vsq_order_items').insert({ order_id: orderId, product_title_snapshot: title, quantity, fulfilled_quantity: quantity, refunded_quantity: refunded });
      return Number(id);
    }
    const first = await item(own.id, 'First item', 5);
    const second = await item(own.id, 'Second item', 3, 1);
    const undelivered = await item(own.id, 'Not delivered', 1);
    const foreignItem = await item(foreign.id, 'Foreign item', 1);
    async function shipment(orderId, entries, deliveredAt, status = 'DELIVERED') {
      const [id] = await db('vsq_shipments').insert({ public_id: crypto.randomUUID(), order_id: orderId, status, delivered_at: deliveredAt });
      await db('vsq_shipment_items').insert(entries.map(([orderItemId, quantity]) => ({ shipment_id: id, order_item_id: orderItemId, quantity })));
    }
    await shipment(own.id, [[first, 3], [second, 3]], new Date(Date.now() - 6 * 86400000));
    await shipment(own.id, [[first, 2]], new Date(Date.now() - 8 * 86400000));
    await shipment(own.id, [[undelivered, 1]], new Date(), 'SHIPPED');
    await shipment(foreign.id, [[foreignItem, 1]], new Date());
    const staff = {};
    for (const role of ['ADMIN', 'EMPLOYEE', 'CHECKER', 'SALES_MAN', 'VENDOR', 'CUSTOMER']) {
      const [id] = await db('users').insert({ name: role, email: `${role.toLowerCase()}@example.test`, user_type: role });
      staff[role] = Number(id);
    }
    auth = require('../dist/modules/commerce/customer/auth-service').default;
    originalVerify = auth.verifyAccessToken;
    auth.verifyAccessToken = (token) => {
      const id = { owner, other }[token];
      if (!id) throw new Error('Invalid token');
      return { id, public_id: 'test', email: 'test@example.test', session_id: 'test' };
    };
    const staffAuth = require('../dist/api/admin/middlewares/jwt-auth');
    const config = require('../dist/config').default;
    const app = express();
    app.use(express.json());
    app.use('/customer', require('../dist/modules/commerce/checkout/route').default);
    app.use('/staff', staffAuth.verifyJWT, require('../dist/modules/commerce/admin/route').default);
    server = app.listen(0, '127.0.0.1');
    await new Promise((resolve) => server.once('listening', resolve));
    const root = `http://127.0.0.1:${server.address().port}`;
    function staffToken(role) { return jwt.sign({ id: staff[role], type: 'BMS_STAFF' }, config.jwt.secretKey, { audience: 'bms-admin', expiresIn: '1h' }); }
    async function request(route, token, method = 'GET', body) {
      const response = await fetch(`${root}${route}`, { method, headers: { Authorization: `Bearer ${token}`, ...(body ? { 'content-type': 'application/json' } : {}) }, body: body ? JSON.stringify(body) : undefined });
      return { status: response.status, body: await response.json() };
    }
    const customerPath = `/customer/orders/${own.publicId}/returns`;
    const initial = await request(customerPath, 'owner');
    assert.equal(initial.status, 200);
    assert.deepEqual(initial.body.data.eligibility.items.map((row) => row.eligible_quantity), [3, 2, 0]);
    assert.equal((await request(customerPath, 'other')).status, 404);
    assert.equal((await request(`/customer/orders/${foreign.publicId}/returns`, 'owner')).status, 404);
    assert.equal((await request(customerPath, 'invalid')).status, 401);
    assert.equal((await fetch(`${root}${customerPath}`)).status, 401);
    const payload = (orderItemId, quantity) => ({ items: [{ order_item_id: orderItemId, quantity }], reason_code: 'SIZE_ISSUE', customer_note: 'Too small' });
    assert.equal((await request(customerPath, 'owner', 'POST', payload(foreignItem, 1))).status, 409);
    assert.equal((await request(customerPath, 'other', 'POST', payload(first, 1))).status, 404);
    assert.equal((await request(customerPath, 'owner', 'POST', payload(first, 4))).status, 409);
    assert.equal((await request(customerPath, 'owner', 'POST', payload(second, 3))).status, 409);
    assert.equal((await request(customerPath, 'owner', 'POST', payload(undelivered, 1))).status, 409);
    const made = await request(customerPath, 'owner', 'POST', payload(first, 2));
    assert.equal(made.status, 201);
    assert.equal(made.body.data.request.status, 'REQUESTED');
    assert.equal((await request(customerPath, 'owner', 'POST', payload(first, 2))).status, 409);
    const [parallelA, parallelB] = await Promise.all([
      request(customerPath, 'owner', 'POST', payload(first, 1)), request(customerPath, 'owner', 'POST', payload(first, 1))
    ]);
    assert.deepEqual([parallelA.status, parallelB.status].sort(), [201, 409]);
    const created = [parallelA, parallelB].find((response) => response.status === 201).body.data.request;
    const history = await request('/customer/orders', 'owner');
    assert.equal(history.body.data.orders[0].return_requests.length, 2);
    assert.equal((await request('/customer/orders', 'other')).body.data.orders[0].return_requests.length, 0);

    const staffPath = `/staff/returns/${made.body.data.request.public_id}`;
    assert.equal((await request('/staff/returns', staffToken('CHECKER'))).status, 200);
    assert.equal((await request(staffPath, staffToken('CHECKER'))).status, 200);
    assert.equal((await request('/staff/returns', staffToken('SALES_MAN'))).status, 403);
    assert.equal((await request('/staff/returns', staffToken('VENDOR'))).status, 401);
    assert.equal((await request('/staff/returns', staffToken('CUSTOMER'))).status, 401);
    assert.equal((await request(`${staffPath}/decision`, staffToken('CHECKER'), 'PATCH', { decision: 'APPROVED', note: 'Reviewed' })).status, 403);
    assert.equal((await request(`${staffPath}/decision`, staffToken('SALES_MAN'), 'PATCH', { decision: 'APPROVED', note: 'Reviewed' })).status, 403);
    const approved = await request(`${staffPath}/decision`, staffToken('EMPLOYEE'), 'PATCH', { decision: 'APPROVED', note: 'Items accepted for review' });
    assert.equal(approved.status, 200);
    assert.deepEqual(approved.body.data.request.history.map((row) => row.to_status), ['REQUESTED', 'APPROVED']);
    assert.ok(approved.body.data.deliveries.some((row) => row.order_item_id === first && row.delivered_at));
    assert.equal((await request(`${staffPath}/decision`, staffToken('ADMIN'), 'PATCH', { decision: 'REJECTED', note: 'No' })).status, 409);
    const customerAfterReview = await request(customerPath, 'owner');
    assert.equal(customerAfterReview.body.data.requests.find((entry) => entry.public_id === made.body.data.request.public_id).status, 'APPROVED');
    assert.equal(customerAfterReview.body.data.requests.find((entry) => entry.public_id === made.body.data.request.public_id).admin_note, undefined);
    assert.equal(customerAfterReview.body.data.requests.find((entry) => entry.public_id === made.body.data.request.public_id).history, undefined);
    assert.equal((await request(`/staff/returns/${created.public_id}/decision`, staffToken('ADMIN'), 'PATCH', { decision: 'REJECTED', note: 'Not eligible after review' })).status, 200);
    assert.equal((await request(customerPath, 'owner', 'POST', payload(first, 1))).status, 201);
    const final = await request(customerPath, 'owner');
    assert.equal(final.body.data.requests.length, 3);
    assert.equal(final.body.data.eligibility.items[0].eligible_quantity, 0);
    assert.equal((await db('vsq_refunds').where({ order_id: own.id }).count({ count: '*' }).first()).count, 0);
    assert.equal((await db('vsq_inventory_movements').count({ count: '*' }).first()).count, 0);
    const unchanged = await db('vsq_orders').where({ id: own.id }).first();
    assert.equal(unchanged.order_status, 'CONFIRMED');
    assert.equal(unchanged.financial_status, 'PAID');
    assert.equal(unchanged.fulfillment_status, 'PARTIALLY_FULFILLED');
    assert.equal((await request(customerPath, 'owner', 'POST', payload(second, 1))).status, 201);
    assert.equal((await request(customerPath, 'owner', 'POST', payload(second, 1))).status, 409);
  } finally {
    if (server) await new Promise((resolve) => server.close(resolve));
    if (auth) auth.verifyAccessToken = originalVerify;
    if (db) await db.destroy();
    await admin.query(`DROP DATABASE IF EXISTS \`${database}\``);
    await admin.end();
  }
});
