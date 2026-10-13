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

test('commerce order processing is admin-only, guarded, and recorded once', async () => {
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
    app.use('/staff', require('../dist/api/admin/middlewares/jwt-auth').verifyJWT, require('../dist/modules/commerce/admin/route').default);
    server = app.listen(0, '127.0.0.1');
    await new Promise((resolve) => server.once('listening', resolve));
    const root = `http://127.0.0.1:${server.address().port}`;
    function token(role) { return jwt.sign({ id: staff[role], type: 'BMS_STAFF' }, config.jwt.secretKey, { audience: 'bms-admin', expiresIn: '1h' }); }
    async function update(id, role, status = 'PROCESSING') {
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
    assert.equal(changed.body.data.order.order_status, 'PROCESSING');
    assert.equal((await update(ready, 'ADMIN')).status, 409);
    const saved = await db('vsq_orders').where({ public_id: ready }).first();
    const history = await db('vsq_order_status_history').where({ order_id: saved.id });
    assert.equal(history.length, 1);
    assert.equal(history[0].from_status, 'CONFIRMED');
    assert.equal(history[0].to_status, 'PROCESSING');
    assert.equal(history[0].reason, 'Preparing order');
    assert.equal(Number(history[0].actor_id), staff.ADMIN);
  } finally {
    if (server) await new Promise((resolve) => server.close(resolve));
    if (db) await db.destroy();
    delete global.knexInstance;
    await admin.query(`DROP DATABASE IF EXISTS \`${database}\``);
    await admin.end();
  }
});
