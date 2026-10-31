// npm run build && node --test tests/bill-rewards.integration.cjs
// Disposable local MySQL schema; private storage is stubbed. No application data touched.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const path = require('node:path');
const knex = require('knex');
const mysql = require('mysql2/promise');
const express = require('express');
const jwt = require('jsonwebtoken');
require('dotenv').config({ quiet: true });

test('authenticated bill claims and atomic once-only reviews', async (t) => {
  assert.ok(['localhost', '127.0.0.1', '::1'].includes(process.env.DB_HOSTNAME), 'Local MySQL required');
  const database = `vsq_bill_test_${crypto.randomBytes(5).toString('hex')}`;
  const connection = { host: process.env.DB_HOSTNAME, user: process.env.DB_USER, password: process.env.DB_PASSWORD };
  const root = await mysql.createConnection(connection);
  let db, server;
  try {
    await root.query(`CREATE DATABASE \`${database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
    db = knex({ client: 'mysql2', connection: { ...connection, database }, pool: { min: 0, max: 10 }, migrations: { directory: path.resolve(__dirname, '../dist/db-migrations') } });
    global.knexInstance = db; await db.migrate.latest();
    const config = require('../dist/config').default;
    config.aws.s3PrivateDesignBucketName = 'test-private-bills'; config.aws.s3BucketName = 'test-public';
    const storage = require('../dist/lib/S3Service').default;
    const objects = new Map();
    let failStorage = false;
    // Model the actual scoped private-bucket policy at the SDK boundary. The
    // previous bill prefix is denied; the established private namespace works.
    storage.s3Client.send = async (command) => {
      const { Key, Body } = command.input;
      if (command.constructor.name === 'PutObjectCommand') {
        if (failStorage || !/(?:^|\/)commerce\/designs\//.test(Key)) {
          const error = new Error('private-path credential=must-not-leak');
          error.name = 'AccessDenied'; error.$metadata = { httpStatusCode: 403, requestId: 'test-provider-request' }; throw error;
        }
        objects.set(Key, Body); return {};
      }
      if (command.constructor.name === 'DeleteObjectCommand') { objects.delete(Key); return {}; }
      throw new Error('Unexpected storage operation');
    };
    storage.privateDesignReviewUrl = async (key) => { assert.ok(objects.has(key)); return `https://private.example.test/${key}?signed=yes`; };
    const service = require('../dist/modules/commerce/bills/service');
    const [actor] = await db('users').insert({ name: 'Bill reviewer', email: 'reviewer@example.test', user_type: 'ADMIN' });
    async function customer(email) {
      const public_id = crypto.randomUUID();
      const [id] = await db('vsq_customers').insert({ public_id, email, email_normalized: email, first_name: 'Test', status: 'ACTIVE' });
      return { id, token: jwt.sign({ id, public_id, email, session_id: crypto.randomUUID(), type: 'VSQ_CUSTOMER' }, config.jwt.secretKey, { expiresIn: 600 }) };
    }
    const buyer = await customer('buyer@example.test'), other = await customer('other@example.test');
    const image = await require('sharp')({ create: { width: 4, height: 4, channels: 3, background: '#fff' } }).png().toBuffer();
    const app = express(); app.use(express.json());
    app.use('/bills', require('../dist/modules/commerce/bills/route').default);
    app.use('/designs', require('../dist/modules/commerce/design/route').default);
    app.use('/admin', (req, _res, next) => { if (req.headers['x-test-role']) req.user = { id: actor, user_type: req.headers['x-test-role'] }; next(); }, require('../dist/modules/commerce/bills/admin-route').default);
    server = app.listen(0, '127.0.0.1'); await new Promise((resolve) => server.once('listening', resolve));
    const url = `http://127.0.0.1:${server.address().port}`;
    async function request(route, options = {}) { const response = await fetch(url + route, options); return { status: response.status, body: await response.json() }; }
    async function upload(reward, upi = '', requestId = crypto.randomUUID(), token = buyer.token, buffer = image, mime = 'image/png') {
      const body = new FormData(); body.set('file', new Blob([buffer], { type: mime }), 'bill.png'); body.set('reward', reward); body.set('upi_id', upi); body.set('request_id', requestId);
      return request('/bills/submissions', { method: 'POST', headers: token ? { authorization: `Bearer ${token}` } : {}, body });
    }
    async function uploadDesign(token = null, phone = '9999999999', buffer = image, extra = false) {
      const body = new FormData(); body.set('file', new Blob([buffer], { type: 'image/png' }), 'design.png');
      body.set('phone', phone); body.set('marketing_permission', 'false'); if (extra) body.set('unexpected', 'field');
      return request('/designs/submissions', { method: 'POST', headers: token ? { authorization: `Bearer ${token}` } : {}, body });
    }
    const adminHeaders = { 'content-type': 'application/json', 'x-test-role': 'ADMIN' };
    const review = (id, action, reward_rupees) => request(`/admin/${id}/review`, { method: 'POST', headers: adminHeaders, body: JSON.stringify({ action, reward_rupees, note: 'Manually verified' }) });
    const balance = async () => Number((await db('vsq_credit_accounts').where({ customer_id: buyer.id }).first())?.available_balance_minor || 0);
    let cashId, walletId;
    await t.test('login for both choices, UPI requirement, file validation', async () => {
      for (const reward of ['CASH', 'WALLET']) assert.equal((await upload(reward, 'buyer@bank', undefined, null)).status, 401);
      assert.equal(objects.size, 0);
      for (const upi of ['', 'not-an-id', 'x@bad id']) assert.equal((await upload('CASH', upi)).status, 422);
      assert.equal((await upload('WALLET', '', undefined, buyer.token, image, 'image/jpeg')).status, 422);
      assert.equal((await upload('WALLET', '', undefined, buyer.token, Buffer.from('%PDF-1.7\n/JavaScript alert(1)\n%%EOF'), 'application/pdf')).status, 422);
      assert.equal((await upload('OTHER')).status, 422);
    });
    await t.test('pending private claims and idempotent concurrent upload/retry', async () => {
      const id = crypto.randomUUID();
      const [a, b] = await Promise.all([upload('CASH', 'buyer@bank', id), upload('CASH', 'buyer@bank', id)]);
      assert.equal(a.status, 201); assert.equal(b.status, 201);
      cashId = a.body.data.submission.public_id;
      assert.equal(cashId, b.body.data.submission.public_id); assert.equal(a.body.data.submission.status, 'PENDING');
      assert.equal(a.body.data.submission.object_key, undefined); assert.equal(objects.size, 1);
      assert.equal((await upload('WALLET', '', id)).status, 409);
      const wallet = await upload('WALLET', 'ignored@bank'); walletId = wallet.body.data.submission.public_id;
      assert.equal(wallet.body.data.submission.upi_id, null); assert.equal(await balance(), 0);
      assert.equal((await db('vsq_credit_transactions')).length, 0);
    });
    await t.test('owner-only previews and admin-only review access with claim/customer details', async () => {
      const route = `/bills/submissions/${cashId}/preview`;
      assert.equal((await request(route)).status, 401);
      assert.equal((await request(route, { headers: { authorization: `Bearer ${other.token}` } })).status, 404);
      assert.match((await request(route, { headers: { authorization: `Bearer ${buyer.token}` } })).body.data.url, /signed=yes/);
      for (const role of [undefined, 'EMPLOYEE', 'CHECKER']) assert.equal((await request('/admin', { headers: role ? { 'x-test-role': role } : {} })).status, 403);
      const list = await request('/admin?status=ALL', { headers: adminHeaders }); assert.equal(list.status, 200); assert.equal(list.body.data.total, 2);
      const row = list.body.data.submissions.find((item) => item.public_id === cashId);
      assert.equal(row.customer_email, 'buyer@example.test'); assert.equal(row.upi_id, 'buyer@bank');
      assert.equal((await request(`/admin/${cashId}/file`, { headers: adminHeaders })).status, 200);
      assert.equal((await request('/admin?page=-1', { headers: adminHeaders })).status, 422);
    });
    await t.test('cash completion is once-only and has no wallet effects', async () => {
      assert.equal((await review(cashId, 'GRANT_CREDITS', 100)).status, 422);
      const results = await Promise.all([review(cashId, 'MARK_SENT'), review(cashId, 'MARK_SENT')]);
      assert.deepEqual(results.map((r) => r.status).sort(), [200, 409]);
      assert.equal(results.find((r) => r.status === 200).body.data.submission.status, 'SENT');
      assert.equal(await balance(), 0); assert.equal((await db('vsq_credit_transactions')).length, 0);
      assert.equal((await review(cashId, 'REJECT')).status, 409);
    });
    await t.test('positive amount, cap and paise precision enforced server-side', async () => {
      for (const amount of [undefined, null, 0, -1, 100.01, 101, 'Infinity', 'oops', 1.001, 0.001]) assert.equal((await review(walletId, 'GRANT_CREDITS', amount)).status, 422, `Reject ${amount}`);
      assert.equal((await review(walletId, 'MARK_SENT')).status, 422); assert.equal(await balance(), 0);
    });
    await t.test('default ₹100 and lower amount credit exactly once to existing wallet', async () => {
      const results = await Promise.all([review(walletId, 'GRANT_CREDITS', 100), review(walletId, 'GRANT_CREDITS', 100)]);
      assert.deepEqual(results.map((r) => r.status).sort(), [200, 409]); assert.equal(await balance(), 10000);
      assert.equal(results.find((r) => r.status === 200).body.data.submission.granted_amount_minor, 10000);
      assert.equal((await review(walletId, 'GRANT_CREDITS', 10)).status, 409);
      const id = (await upload('WALLET')).body.data.submission.public_id;
      assert.equal((await review(id, 'GRANT_CREDITS', 37.25)).body.data.submission.granted_amount_minor, 3725); assert.equal(await balance(), 13725);
      assert.equal((await db('vsq_credit_transactions').where({ source: 'BILL_REWARD' })).length, 2);
    });
    await t.test('claim completion failure rolls balance and ledger back', async () => {
      const id = (await upload('WALLET')).body.data.submission.public_id;
      await db.raw("CREATE TRIGGER fail_bill_completion BEFORE UPDATE ON vsq_bill_claims FOR EACH ROW SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'test rollback'");
      await assert.rejects(() => service.reviewBill(id, 'GRANT_CREDITS', 50, '', actor), /test rollback/);
      assert.equal(await balance(), 13725); assert.equal((await db('vsq_credit_transactions').where({ idempotency_key: `bill-reward:${id}` })).length, 0);
      assert.equal((await db('vsq_bill_claims').where({ public_id: id }).first()).status, 'PENDING');
      await db.raw('DROP TRIGGER fail_bill_completion');
      assert.equal((await review(id, 'REJECT')).status, 200); assert.equal(await balance(), 13725); assert.equal((await review(id, 'GRANT_CREDITS', 100)).status, 409);
    });
    await t.test('design guest/authenticated uploads retain their own flow, validation and claim behavior', async () => {
      const guest = await uploadDesign(); assert.equal(guest.status, 201); assert.equal(guest.body.data.submission.status, 'PENDING');
      assert.match(guest.body.data.submission.claim_token, /^[A-Za-z0-9_-]{43}$/);
      const signedIn = await uploadDesign(buyer.token); assert.equal(signedIn.status, 201); assert.equal(signedIn.body.data.submission.claim_token, null);
      assert.equal((await uploadDesign('invalid-token')).status, 401);
      assert.equal((await uploadDesign(null, 'bad')).status, 422);
      assert.equal((await uploadDesign(null, '9999999999', Buffer.from('not an image'))).status, 422);
      assert.equal((await uploadDesign(null, '9999999999', image, true)).status, 400);
      const malformed = await request('/designs/submissions', { method: 'POST', headers: { 'content-type': 'multipart/form-data' }, body: 'missing boundary' });
      assert.equal(malformed.status, 400); assert.equal(malformed.body.error_code, 'SUBMISSION_INVALID');
      assert.ok(!(await db('vsq_bill_claims')).some((row) => row.original_filename === 'design.png'));
    });
    await t.test('storage denial is recoverable, safe and flow-specific; no submission is inserted', async () => {
      const beforeBills = Number((await db('vsq_bill_claims').count('* as total').first()).total);
      const beforeDesigns = Number((await db('vsq_design_submissions').count('* as total').first()).total);
      const originalLog = console.error; const logs = []; console.error = (...values) => logs.push(values);
      failStorage = true;
      try {
        for (const response of [await upload('WALLET'), await uploadDesign()]) {
          assert.equal(response.status, 503); assert.equal(response.body.error_code, 'UPLOAD_STORAGE_UNAVAILABLE');
          assert.match(response.body.message, /try again later/i); assert.equal(response.body.data, null);
          assert.doesNotMatch(JSON.stringify(response.body), /private-path|credential|AccessDenied|stack|query/i);
        }
        assert.deepEqual(logs.map((entry) => entry[1].flow), ['bill', 'design']);
        assert.ok(logs.every((entry) => entry[1].name === 'AccessDenied' && entry[1].provider_request_id === 'test-provider-request'));
        assert.doesNotMatch(JSON.stringify(logs), /private-path|credential=must-not-leak/);
      } finally { failStorage = false; console.error = originalLog; }
      assert.equal(Number((await db('vsq_bill_claims').count('* as total').first()).total), beforeBills);
      assert.equal(Number((await db('vsq_design_submissions').count('* as total').first()).total), beforeDesigns);
    });
    await t.test('unexpected database errors do not leak and uploaded test objects are cleaned up', async () => {
      const originalLog = console.error; const logs = []; console.error = (...values) => logs.push(values);
      try {
        for (const [table, flow, send] of [['vsq_bill_claims', 'bill', () => upload('WALLET')], ['vsq_design_submissions', 'design', () => uploadDesign()]]) {
          const before = objects.size;
          await db.raw(`CREATE TRIGGER fail_submission BEFORE INSERT ON ${table} FOR EACH ROW SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'private database credential must-not-leak'`);
          try {
            const response = await send(); assert.equal(response.status, 500); assert.equal(response.body.error_code, 'SUBMISSION_FAILED');
            assert.match(response.body.message, new RegExp(flow)); assert.match(response.body.message, /try again/i);
            assert.doesNotMatch(JSON.stringify(response.body), /database|credential|SIGNAL|SQL|stack|must-not-leak/i);
            if (flow === 'design') assert.doesNotMatch(response.body.message, /bill/i);
            assert.equal(objects.size, before);
          } finally { await db.raw('DROP TRIGGER fail_submission'); }
        }
        assert.deepEqual(logs.map((entry) => entry[1].flow), ['bill', 'design']);
      } finally { console.error = originalLog; }
    });
    await t.test('history and completed filters persist statuses and granted amount', async () => {
      const mine = await request('/bills/submissions/mine', { headers: { authorization: `Bearer ${buyer.token}` } }); assert.equal(mine.body.data.total, 4);
      assert.ok(mine.body.data.submissions.some((row) => row.status === 'CREDITED' && row.granted_amount_minor === 3725));
      const sent = await request('/admin?status=SENT', { headers: adminHeaders }); assert.equal(sent.body.data.total, 1); assert.equal(sent.body.data.submissions[0].public_id, cashId);
    });
  } finally {
    if (server) await new Promise((resolve) => server.close(resolve));
    if (db) await db.destroy();
    await root.query(`DROP DATABASE IF EXISTS \`${database}\``); await root.end();
  }
});
