// Run after npm run build. The test creates and drops its own schema on local MySQL only.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const path = require('node:path');
const express = require('express');
const knex = require('knex');
const mysql = require('mysql2/promise');
require('dotenv').config();

test('admin design and gift lists page every row with stable boundaries and record-specific actions', async () => {
  const host = process.env.DB_HOSTNAME;
  assert.ok(['localhost', '127.0.0.1', '::1'].includes(host), 'Only local MySQL is permitted');
  const database = `admin_lists_test_${crypto.randomBytes(5).toString('hex')}`;
  const connection = { host, user: process.env.DB_USER, password: process.env.DB_PASSWORD };
  const rootConnection = await mysql.createConnection(connection);
  let db;
  let server;
  try {
    await rootConnection.query(`CREATE DATABASE \`${database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
    db = knex({ client: 'mysql2', connection: { ...connection, database }, pool: { min: 0, max: 8 }, migrations: { directory: path.resolve(__dirname, '../dist/db-migrations') } });
    global.knexInstance = db;
    await db.migrate.latest();
    const [staffId] = await db('users').insert({ name: 'List reviewer', email: 'list-reviewer@example.test', user_type: 'ADMIN' });
    const [customerId] = await db('vsq_customers').insert({ public_id: crypto.randomUUID(), email: 'buyer@example.test', email_normalized: 'buyer@example.test', status: 'ACTIVE' });
    const created = new Date('2026-01-02T03:04:05Z');
    const designs = Array.from({ length: 125 }, (_, index) => ({
      public_id: crypto.randomUUID(), customer_id: null, phone: '9000000000', original_filename: `design-${index}.pdf`,
      mime_type: 'application/pdf', byte_size: 100, checksum_sha256: 'a'.repeat(64), object_key: `test/${index}.pdf`,
      status: index % 2 ? 'APPROVED' : 'PENDING', created_at: created, updated_at: created
    }));
    const purchases = Array.from({ length: 125 }, (_, index) => ({
      public_id: crypto.randomUUID(), buyer_customer_id: customerId, amount_minor: 10000, status: 'PAID',
      idempotency_key: `list-${index}`, created_at: created, updated_at: created
    }));
    for (let start = 0; start < 125; start += 25) {
      await db('vsq_design_submissions').insert(designs.slice(start, start + 25));
      await db('vsq_gift_purchases').insert(purchases.slice(start, start + 25));
    }
    const laterPurchase = purchases[4]; // newest ID is first; this purchase appears on the final page
    const purchaseRow = await db('vsq_gift_purchases').where({ public_id: laterPurchase.public_id }).first();
    await db('vsq_wallet_codes').insert({ public_id: crypto.randomUUID(), code_hash: 'b'.repeat(64), kind: 'GIFT', amount_minor: 10000,
      status: 'ISSUED', purchase_id: purchaseRow.id });

    const app = express();
    app.use(express.json());
    app.use((req, _res, next) => { req.user = { id: staffId, user_type: req.headers['x-test-role'] || 'ADMIN' }; next(); });
    app.use('/designs', require('../dist/modules/commerce/design/admin-route').default);
    app.use('/wallet', require('../dist/modules/commerce/wallet/admin-route').default);
    server = app.listen(0, '127.0.0.1');
    await new Promise((resolve) => server.once('listening', resolve));
    const root = `http://127.0.0.1:${server.address().port}`;
    async function request(route, options) { const response = await fetch(root + route, options); return { status: response.status, body: await response.json() }; }
    async function collect(route, field) {
      const ids = [];
      let total;
      for (let page = 1; page <= 7; page++) {
        const response = await request(`${route}${route.includes('?') ? '&' : '?'}page=${page}`);
        assert.equal(response.status, 200);
        assert.equal(response.body.data.page, page);
        assert.equal(response.body.data.page_size, 20);
        total = response.body.data.total;
        ids.push(...response.body.data[field].map((row) => row.public_id));
      }
      assert.equal(ids.length, total);
      assert.equal(new Set(ids).size, total);
      return ids;
    }
    const designIds = await collect('/designs?status=ALL', 'submissions');
    const purchaseIds = await collect('/wallet/purchases', 'purchases');
    assert.equal(designIds.length, 125);
    assert.equal(purchaseIds.length, 125);
    assert.equal(designIds[100], designs[24].public_id);
    assert.equal(purchaseIds[100], purchases[24].public_id);
    const pending = await collect('/designs?status=PENDING', 'submissions');
    const approved = await collect('/designs?status=APPROVED', 'submissions');
    assert.equal(pending.length, 63);
    assert.equal(approved.length, 62);
    assert.deepEqual(new Set([...pending, ...approved]), new Set(designIds));
    for (const route of ['/designs?status=ALL', '/wallet/purchases']) {
      for (const value of ['0', '-1', '1.5', 'abc', '100001', '']) {
        const result = await request(`${route}${route.includes('?') ? '&' : '?'}page=${encodeURIComponent(value)}`);
        assert.equal(result.status, 422, `${route} page=${value}`);
      }
    }
    assert.equal((await request('/designs?status=ALL&page=1', { headers: { 'x-test-role': 'EMPLOYEE' } })).status, 403);
    assert.equal((await request('/wallet/purchases?page=1', { headers: { 'x-test-role': 'EMPLOYEE' } })).status, 403);

    const laterDesign = pending.at(-1);
    const review = await request(`/designs/${laterDesign}/review`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ status: 'REJECTED', note: 'Disposable list test' }) });
    assert.equal(review.status, 200);
    assert.equal((await db('vsq_design_submissions').where({ public_id: laterDesign }).first()).status, 'REJECTED');
    const events = await request(`/designs/${laterDesign}/events`);
    assert.equal(events.body.data.events.length, 1);
    assert.equal((await request('/designs?status=PENDING&page=4')).body.data.total, 62);

    const service = require('../dist/modules/commerce/wallet/service');
    const originalRefund = service.requestGiftRefund;
    let targetedPurchase;
    service.requestGiftRefund = async (publicId) => { targetedPurchase = publicId; return { public_id: publicId, status: 'REFUND_PENDING' }; };
    try {
      const lastPage = await request('/wallet/purchases?page=7');
      assert.ok(lastPage.body.data.purchases.some((row) => row.public_id === laterPurchase.public_id && row.code_status === 'ISSUED'));
      const refund = await request(`/wallet/purchases/${laterPurchase.public_id}/refund`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ reason: 'Test only' }) });
      assert.equal(refund.status, 200);
      assert.equal(targetedPurchase, laterPurchase.public_id);
    } finally { service.requestGiftRefund = originalRefund; }
  } finally {
    if (server) await new Promise((resolve) => server.close(resolve));
    if (db) await db.destroy();
    await rootConnection.query(`DROP DATABASE IF EXISTS \`${database}\``);
    await rootConnection.end();
  }
});
