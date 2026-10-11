// Run after npm run build. Creates and drops only a random local MySQL schema.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const path = require('node:path');
const express = require('express');
const knex = require('knex');
const mysql = require('mysql2/promise');
const jwt = require('jsonwebtoken');
require('dotenv').config();

test('commerce inquiries use verified commerce ownership while legacy and staff paths stay separate', async () => {
  const host = process.env.DB_HOSTNAME;
  assert.ok(['localhost', '127.0.0.1', '::1'].includes(host), 'Only local MySQL is permitted');
  const name = `inquiry_ownership_test_${crypto.randomBytes(5).toString('hex')}`;
  const connection = { host, user: process.env.DB_USER, password: process.env.DB_PASSWORD };
  const admin = await mysql.createConnection(connection);
  let db;
  let server;
  try {
    await admin.query(`CREATE DATABASE \`${name}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
    db = knex({ client: 'mysql2', connection: { ...connection, database: name }, pool: { min: 0, max: 5 }, migrations: { directory: path.resolve(__dirname, '../dist/db-migrations') } });
    global.knexInstance = db;
    await db.migrate.latest();
    process.env.JWT_SECRET_KEY = 'isolated-inquiry-ownership-test-secret';
    process.env.AWS_ACCESS_KEY_ID = 'isolated-test-key';
    process.env.AWS_SECRET_ACCESS_KEY = 'isolated-test-secret';
    process.env.AWS_S3_BUCKET_NAME = 'isolated-test-bucket';
    process.env.RAZORPAY_ENABLED = 'false';
    process.env.MAILGUN_ENABLED = 'false';

    const app = express();
    app.use(express.json());
    app.use('/front', require('../dist/api/front').default);
    app.use('/admin', require('../dist/api/admin').default);
    app.use((error, _req, res, _next) => res.status(400).json({ success: false, message: error.message }));
    server = app.listen(0, '127.0.0.1');
    await new Promise((resolve) => server.once('listening', resolve));
    const base = `http://127.0.0.1:${server.address().port}`;

    async function legacyUser(role, label) {
      const email = `${label}@example.test`;
      const [id] = await db('users').insert({ name: label, email, phone: '1111111111', user_type: role, password: 'unused' });
      return { id, email, role };
    }
    const legacy = await legacyUser('CUSTOMER', 'legacy');
    const adminUser = await legacyUser('ADMIN', 'admin');
    const salesman = await legacyUser('SALES_MAN', 'salesman');
    const otherSalesman = await legacyUser('SALES_MAN', 'other-salesman');

    async function commerceCustomer(id, label) {
      const publicId = crypto.randomUUID();
      const sessionId = crypto.randomUUID();
      const email = `${label}@example.test`;
      await db('vsq_customers').insert({ id, public_id: publicId, email, email_normalized: email, status: 'ACTIVE' });
      await db('vsq_customer_sessions').insert({ public_id: sessionId, customer_id: id,
        refresh_token_hash: crypto.randomBytes(32).toString('hex'), expires_at: new Date(Date.now() + 86400000) });
      return { id, publicId, sessionId, email };
    }
    const commerce = await commerceCustomer(legacy.id, 'commerce');
    const otherCommerce = await commerceCustomer(adminUser.id, 'other-commerce');
    assert.equal(commerce.id, legacy.id, 'numeric customer IDs deliberately overlap');

    const signCommerce = (customer, overrides = {}) => jwt.sign({ id: customer.id, public_id: customer.publicId,
      email: customer.email, session_id: customer.sessionId, type: 'VSQ_CUSTOMER', ...overrides }, process.env.JWT_SECRET_KEY, { expiresIn: '1h' });
    const commerceToken = signCommerce(commerce);
    const otherCommerceToken = signCommerce(otherCommerce);
    const legacyToken = jwt.sign({ id: legacy.id, email: legacy.email, user_type: legacy.role }, process.env.JWT_SECRET_KEY, { expiresIn: '1h' });
    const staffToken = (user) => jwt.sign({ id: user.id, type: 'BMS_STAFF' }, process.env.JWT_SECRET_KEY, { audience: 'bms-admin', expiresIn: '1h' });

    async function request(route, token, method = 'GET', body) {
      const headers = token === undefined ? {} : { authorization: `Bearer ${token}` };
      const response = await fetch(`${base}${route}`, { method, headers: {
        ...headers, ...(body && !(body instanceof FormData) ? { 'content-type': 'application/json' } : {})
      }, ...(body ? { body: body instanceof FormData ? body : JSON.stringify(body) } : {}) });
      const data = await response.json();
      return { status: response.status, data };
    }
    function form(overrides = {}) {
      const data = new FormData();
      for (const [key, value] of Object.entries({ name: 'Same name', email: legacy.email,
        phone: '1111111111', requirements: 'Same contact details', ...overrides })) data.append(key, String(value));
      return data;
    }
    async function submit(token, overrides) {
      return request('/front/inquiry/submit', token, 'POST', form(overrides));
    }

    const commerceSubmit = await submit(commerceToken, { user_id: legacy.id, commerce_customer_id: otherCommerce.id, assigned_staff_id: salesman.id, ownership_source: 'LEGACY_FRONT' });
    assert.equal(commerceSubmit.status, 200, JSON.stringify(commerceSubmit.data));
    const commerceInquiryId = commerceSubmit.data.data;
    const commerceRow = await db('inquiries').where({ id: commerceInquiryId }).first();
    assert.equal(Number(commerceRow.commerce_customer_id), commerce.id);
    assert.equal(commerceRow.ownership_source, 'COMMERCE_CUSTOMER');
    assert.equal(commerceRow.user_id, null);
    assert.equal(commerceRow.assigned_staff_id, null);

    const legacySubmit = await submit(legacyToken);
    assert.equal(legacySubmit.status, 200);
    const legacyInquiryId = legacySubmit.data.data;
    const legacyRow = await db('inquiries').where({ id: legacyInquiryId }).first();
    assert.equal(Number(legacyRow.user_id), legacy.id);
    assert.equal(legacyRow.ownership_source, 'LEGACY_FRONT');
    assert.equal(legacyRow.commerce_customer_id, null);

    const guestSubmit = await submit(undefined, { user_id: legacy.id, commerce_customer_id: commerce.id, ownership_source: 'COMMERCE_CUSTOMER' });
    assert.equal(guestSubmit.status, 200);
    const guestInquiryId = guestSubmit.data.data;
    const guestRow = await db('inquiries').where({ id: guestInquiryId }).first();
    assert.equal(guestRow.user_id, null);
    assert.equal(guestRow.commerce_customer_id, null);
    assert.equal(guestRow.ownership_source, 'GUEST');

    const [historicalInquiryId] = await db('inquiries').insert({ user_id: legacy.id, name: 'Historical',
      email: commerce.email, phone: '1111111111', requirements: 'Ambiguous old row', status: 'new' });
    const historicalRow = await db('inquiries').where({ id: historicalInquiryId }).first();
    assert.equal(historicalRow.commerce_customer_id, null);
    assert.equal(historicalRow.ownership_source, null);

    const commerceList = await request(`/front/inquiry/list?user_id=${legacy.id}&commerce_customer_id=${otherCommerce.id}&ownership_source=LEGACY_FRONT`, commerceToken);
    assert.equal(commerceList.status, 200);
    assert.deepEqual(commerceList.data.data.map((row) => row.id), [commerceInquiryId]);
    assert.equal((await request(`/front/inquiry/details/${commerceInquiryId}`, commerceToken)).status, 200);
    for (const id of [legacyInquiryId, historicalInquiryId, guestInquiryId]) {
      assert.equal((await request(`/front/inquiry/details/${id}`, commerceToken)).status, 404, `commerce cannot read inquiry ${id}`);
    }
    assert.equal((await request(`/front/inquiry/details/${commerceInquiryId}`, otherCommerceToken)).status, 404);
    const otherSubmit = await submit(otherCommerceToken);
    assert.equal(otherSubmit.status, 200);
    assert.deepEqual((await request('/front/inquiry/list', otherCommerceToken)).data.data.map((row) => row.id), [otherSubmit.data.data]);
    assert.equal((await request(`/front/inquiry/details/${commerceInquiryId}`, legacyToken)).status, 404);
    assert.equal((await request(`/front/inquiry/details/${historicalInquiryId}`, legacyToken)).status, 404);
    assert.deepEqual((await request('/front/inquiry/list', legacyToken)).data.data.map((row) => row.id), [legacyInquiryId]);

    assert.equal((await request('/front/inquiry/list', undefined)).status, 401);
    assert.equal((await request(`/front/inquiry/details/${commerceInquiryId}`, undefined)).status, 401);
    assert.equal((await submit('invalid.token')).status, 401);
    assert.equal((await request('/front/inquiry/list', 'invalid.token')).status, 401);
    assert.equal((await request('/front/inquiry/list', jwt.sign({ id: commerce.id, public_id: commerce.publicId,
      session_id: commerce.sessionId, type: 'VSQ_CUSTOMER' }, process.env.JWT_SECRET_KEY, { expiresIn: -1 }))).status, 401);
    assert.equal((await request('/front/inquiry/list', signCommerce(commerce, { session_id: crypto.randomUUID() }))).status, 401);
    assert.equal((await request('/front/inquiry/list', staffToken(adminUser))).status, 401);

    assert.equal((await request('/admin/inquiry/list', staffToken(adminUser))).data.data.length, 5);
    assert.equal((await request('/admin/inquiry/assign', staffToken(adminUser), 'POST',
      { id: commerceInquiryId, assigned_staff_id: salesman.id })).status, 200);
    assert.deepEqual((await request('/admin/inquiry/list', staffToken(salesman))).data.data.map((row) => row.id), [commerceInquiryId]);
    assert.equal((await request(`/admin/inquiry/details/${commerceInquiryId}`, staffToken(salesman))).status, 200);
    assert.equal((await request(`/admin/inquiry/details/${commerceInquiryId}`, staffToken(otherSalesman))).status, 404);
    assert.equal((await request('/admin/inquiry/assign', staffToken(salesman), 'POST',
      { id: legacyInquiryId, assigned_staff_id: salesman.id })).status, 403);
    assert.equal((await db('inquiries').where({ id: commerceInquiryId }).first()).commerce_customer_id, commerce.id);
    await db('vsq_customer_sessions').where({ public_id: commerce.sessionId }).update({ revoked_at: new Date() });
    assert.equal((await request('/front/inquiry/list', commerceToken)).status, 401, 'revoked commerce session is rejected');
    await db('users').where({ id: legacy.id }).update({ deleted_at: new Date() });
    assert.equal((await request('/front/inquiry/list', legacyToken)).status, 401, 'deleted legacy account is rejected');
  } finally {
    if (server) await new Promise((resolve) => server.close(resolve));
    if (db) await db.destroy();
    await admin.query(`DROP DATABASE IF EXISTS \`${name}\``);
    await admin.end();
  }
});
