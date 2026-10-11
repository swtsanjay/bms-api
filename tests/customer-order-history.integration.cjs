// Run after npm run build. Inserts records only into a random local MySQL schema; no order placement runs.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const path = require('node:path');
const express = require('express');
const knex = require('knex');
const mysql = require('mysql2/promise');
require('dotenv').config();

test('customer order history paginates stably and summarizes the full owned history', async () => {
  const host = process.env.DB_HOSTNAME;
  assert.ok(['localhost', '127.0.0.1', '::1'].includes(host), 'Only local MySQL is permitted');
  const database = `order_history_test_${crypto.randomBytes(5).toString('hex')}`;
  const connection = { host, user: process.env.DB_USER, password: process.env.DB_PASSWORD };
  const admin = await mysql.createConnection(connection);
  let db;
  let server;
  let auth;
  let originalVerify;
  try {
    await admin.query(`CREATE DATABASE \`${database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
    db = knex({ client: 'mysql2', connection: { ...connection, database }, pool: { min: 0, max: 10 }, migrations: { directory: path.resolve(__dirname, '../dist/db-migrations') } });
    global.knexInstance = db;
    await db.migrate.latest();
    async function customer(email) {
      const [id] = await db('vsq_customers').insert({ public_id: crypto.randomUUID(), email, email_normalized: email, status: 'ACTIVE' });
      return Number(id);
    }
    const owner = await customer('history-owner@example.test');
    const other = await customer('history-other@example.test');
    const empty = await customer('history-empty@example.test');
    const placedAt = new Date('2026-01-01T10:00:00.000Z');
    const statuses = [
      ['UNFULFILLED', 'UNPAID'], ['FULFILLED', 'PAID'], ['UNFULFILLED', 'EXPIRED'],
      ['REQUEST_DECLINED', 'PAID'], ['FULFILLED', 'VOIDED'], ['SCHEDULED', 'PAID'],
      ['RESTOCKED', 'PAID'], ['PARTIALLY_FULFILLED', 'PARTIALLY_PAID'], ['IN_PROGRESS', 'PAID'],
      ['ON_HOLD', 'PAID'], ['OPEN', 'PAID'], ['PENDING_FULFILLMENT', 'PAID'], ['FULFILLED', 'PAID']
    ];
    async function insertOrder(customerId, index, fulfillment, financial) {
      const [cartId] = await db('vsq_carts').insert({ public_id: crypto.randomUUID(), customer_id: customerId });
      const [sessionId] = await db('vsq_checkout_sessions').insert({ public_id: crypto.randomUUID(), cart_id: cartId, customer_id: customerId, status: 'COMPLETED', expires_at: new Date('2027-01-01T00:00:00.000Z') });
      const publicId = crypto.randomUUID();
      await db('vsq_orders').insert({ public_id: publicId, order_number: `HISTORY-${customerId}-${index}`, customer_id: customerId, checkout_session_id: sessionId,
        email_snapshot: 'fixture@example.test', order_status: 'CONFIRMED', fulfillment_status: fulfillment, financial_status: financial, placed_at: placedAt });
      return publicId;
    }
    const ownIds = [];
    for (let index = 0; index < statuses.length; index++) ownIds.push(await insertOrder(owner, index + 1, ...statuses[index]));
    const otherId = await insertOrder(other, 1, 'FULFILLED', 'PAID');

    auth = require('../dist/modules/commerce/customer/auth-service').default;
    originalVerify = auth.verifyAccessToken;
    auth.verifyAccessToken = (token) => {
      const id = { owner, other, empty }[token];
      if (!id) throw new Error('Invalid token');
      return { id, public_id: 'test', email: 'test@example.test', session_id: 'test' };
    };
    const app = express();
    app.use('/checkout', require('../dist/modules/commerce/checkout/route').default);
    server = app.listen(0);
    const root = `http://127.0.0.1:${server.address().port}/checkout/orders`;
    async function history(query = '', token = 'owner') {
      const response = await fetch(`${root}${query}`, { headers: { Authorization: `Bearer ${token}` } });
      return { status: response.status, body: await response.json() };
    }

    assert.equal((await fetch(root)).status, 401);
    assert.equal((await history('', 'invalid')).status, 401);
    const first = await history('?page=1&limit=10');
    const second = await history('?page=2&limit=10');
    assert.equal(first.status, 200);
    assert.equal(second.status, 200);
    assert.deepEqual(first.body.data.orders.map((row) => row.public_id), ownIds.slice(3).reverse());
    assert.deepEqual(second.body.data.orders.map((row) => row.public_id), ownIds.slice(0, 3).reverse());
    assert.equal(new Set([...first.body.data.orders, ...second.body.data.orders].map((row) => row.public_id)).size, 13);
    assert.equal(first.body.data.pagination.total, 13);
    assert.equal(first.body.data.pagination.total_pages, 2);
    assert.equal(first.body.data.pagination.has_previous, false);
    assert.equal(first.body.data.pagination.has_next, true);
    assert.equal(second.body.data.pagination.page, 2);
    assert.equal(second.body.data.pagination.has_previous, true);
    assert.equal(second.body.data.pagination.has_next, false);
    assert.deepEqual(first.body.data.summary, { total_orders: 13, processing: 7, delivered: 3, pending_action: 3 });
    assert.deepEqual(second.body.data.summary, first.body.data.summary);
    assert.ok(!first.body.data.orders.concat(second.body.data.orders).some((row) => row.public_id === otherId));

    const otherHistory = await history('?page=1&limit=10', 'other');
    assert.equal(otherHistory.body.data.pagination.total, 1);
    assert.deepEqual(otherHistory.body.data.orders.map((row) => row.public_id), [otherId]);
    assert.deepEqual(otherHistory.body.data.summary, { total_orders: 1, processing: 0, delivered: 1, pending_action: 0 });
    const emptyHistory = await history('', 'empty');
    assert.deepEqual(emptyHistory.body.data.orders, []);
    assert.deepEqual(emptyHistory.body.data.pagination, { page: 1, limit: 20, total: 0, total_pages: 0, has_previous: false, has_next: false });
    assert.deepEqual(emptyHistory.body.data.summary, { total_orders: 0, processing: 0, delivered: 0, pending_action: 0 });

    for (const query of ['?page=0', '?page=-1', '?page=1.5', '?page=10001', '?page=abc', '?page=1&page=2', '?limit=0', '?limit=101', '?limit=abc', '?limit=1&limit=2']) {
      const invalid = await history(query);
      assert.equal(invalid.status, 422, query);
    }
  } finally {
    if (server) await new Promise((resolve) => server.close(resolve));
    if (auth) auth.verifyAccessToken = originalVerify;
    if (db) await db.destroy();
    await admin.query(`DROP DATABASE IF EXISTS \`${database}\``);
    await admin.end();
  }
});
