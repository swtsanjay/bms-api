// Run after npm run build. This test creates and drops its own local MySQL schema.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const path = require('node:path');
const express = require('express');
const knex = require('knex');
const mysql = require('mysql2/promise');
const jwt = require('jsonwebtoken');
require('dotenv').config();

test('staff roles, assignments, draft finalization, product history and referral reward', async () => {
  const host = process.env.DB_HOSTNAME;
  assert.ok(['localhost', '127.0.0.1', '::1'].includes(host), 'Only local MySQL is permitted');
  const name = `staff_workflow_test_${crypto.randomBytes(5).toString('hex')}`;
  const connection = { host, user: process.env.DB_USER, password: process.env.DB_PASSWORD };
  const admin = await mysql.createConnection(connection);
  let db;
  let server;
  try {
    await admin.query(`CREATE DATABASE \`${name}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
    db = knex({ client: 'mysql2', connection: { ...connection, database: name }, pool: { min: 0, max: 5 }, migrations: { directory: path.resolve(__dirname, '../dist/db-migrations') } });
    global.knexInstance = db;
    await db.migrate.latest();
    process.env.JWT_SECRET_KEY = 'isolated-staff-workflow-test-secret';
    process.env.AWS_ACCESS_KEY_ID = 'isolated-test-key';
    process.env.AWS_SECRET_ACCESS_KEY = 'isolated-test-secret';
    process.env.AWS_S3_BUCKET_NAME = 'isolated-test-bucket';
    process.env.RAZORPAY_ENABLED = 'false';
    process.env.MAILGUN_ENABLED = 'false';

    const app = express();
    app.use(express.json());
    app.use('/admin', require('../dist/api/admin').default);
    app.use((error, _req, res, _next) => res.status(500).json({ message: error.message }));
    server = app.listen(0, '127.0.0.1');
    await new Promise((resolve) => server.once('listening', resolve));
    const base = `http://127.0.0.1:${server.address().port}`;

    async function user(role, label, extra = {}) {
      const [id] = await db('users').insert({ name: label, email: `${label}@example.test`, phone: '1111111111', user_type: role, password: 'unused', ...extra });
      return id;
    }
    const ids = {
      admin: await user('ADMIN', 'admin'),
      employee: await user('EMPLOYEE', 'employee'),
      checker: await user('CHECKER', 'checker'),
      salesA: await user('SALES_MAN', 'salesA'),
      salesB: await user('SALES_MAN', 'salesB'),
      vendor: await user('VENDOR', 'vendor'),
      supplier: await user('FABRIC_SUPPLIER', 'supplier'),
      company: await user('COMPANY', 'company'),
      customer: await user('CUSTOMER', 'customer')
    };
    await db('users').where({ id: ids.customer }).update({ referred_by_user_id: ids.admin });
    const [productId] = await db('products').insert({ name: 'Test garment', price: 100, created_at: new Date(), updated_at: new Date() });
    const [sizeId] = await db('product_sizes').insert({ product_id: productId, size: 'M', created_at: new Date(), updated_at: new Date() });
    const [inquiryId] = await db('inquiries').insert({ name: 'Buyer', email: 'buyer@example.test', phone: '1111111111', requirements: 'Test request', status: 'new', created_at: new Date(), updated_at: new Date() });

    function token(id) {
      return jwt.sign({ id, type: 'BMS_STAFF' }, process.env.JWT_SECRET_KEY, { audience: 'bms-admin', expiresIn: '1h' });
    }
    async function request(role, route, method = 'GET', body) {
      const response = await fetch(`${base}${route}`, {
        method,
        headers: { authorization: `Bearer ${token(ids[role])}`, ...(body !== undefined ? { 'content-type': 'application/json' } : {}) },
        ...(body !== undefined ? { body: JSON.stringify(body) } : {})
      });
      const raw = await response.text();
      let data;
      try { data = JSON.parse(raw); } catch { data = raw; }
      return { status: response.status, data };
    }

    for (const role of ['vendor', 'supplier', 'company', 'customer']) {
      assert.equal((await request(role, '/admin/order/list')).status, 401, role);
    }
    for (const route of ['/admin/order/save', '/admin/product/save', '/admin/file/upload', '/admin/inquiry/update-status', '/admin/invoice/save']) {
      assert.equal((await request('checker', route, 'POST', {})).status, 403, route);
    }
    for (const route of ['/admin/product/save', '/admin/invoice/save', '/admin/transaction/save', '/admin/wallet/settings', '/admin/v1/commerce/products']) {
      assert.equal((await request('salesA', route, 'POST', {})).status, 403, route);
    }
    assert.equal((await request('employee', '/admin/v1/commerce/categories', 'POST', {})).status, 403);
    assert.equal((await request('checker', '/admin/v1/commerce/products', 'POST', {})).status, 403);
    assert.equal((await request('checker', '/admin/v1/commerce/products')).status, 200);
    assert.equal((await request('checker', '/admin/v1/commerce/orders')).status, 200);
    assert.equal((await request('salesA', '/admin/v1/commerce/orders')).status, 403);
    const commerceCreated = await request('employee', '/admin/v1/commerce/products', 'POST', {
      title: 'Commerce test product', status: 'DRAFT',
      variants: [{ title: 'Default', price: 100, inventory_quantity: 2 }]
    });
    assert.equal(commerceCreated.status, 201, JSON.stringify(commerceCreated.data));
    const commercePublicId = commerceCreated.data.data.product.public_id;
    assert.equal((await request('employee', `/admin/v1/commerce/products/${commercePublicId}`)).status, 200);
    assert.equal((await request('employee', `/admin/v1/commerce/products/${commercePublicId}`, 'PUT', {
      title: 'Updated commerce product', status: 'ARCHIVED', variants: [{ ...commerceCreated.data.data.product.variants[0], title: 'Default', price: 100, inventory_quantity: 2 }]
    })).status, 200);

    assert.equal((await request('salesA', '/admin/inquiry/list')).data.data.length, 0);
    assert.equal((await request('employee', '/admin/inquiry/assign', 'POST', { id: inquiryId, assigned_staff_id: ids.salesA })).status, 200);
    assert.equal((await request('salesA', '/admin/inquiry/list')).data.data.length, 1);
    assert.equal((await request('salesB', '/admin/inquiry/list')).data.data.length, 0);
    assert.equal((await request('employee', '/admin/inquiry/assign', 'POST', { id: inquiryId, assigned_staff_id: ids.vendor })).status, 400);
    assert.equal((await request('salesB', `/admin/inquiry/details/${inquiryId}`)).status, 404);
    assert.equal((await request('salesB', '/admin/inquiry/update-status', 'POST', { id: inquiryId, status: 'in_progress' })).status, 403);
    assert.equal((await request('salesA', '/admin/inquiry/update-status', 'POST', { id: inquiryId, status: 'in_progress' })).status, 200);
    assert.equal((await request('admin', '/admin/inquiry/assign', 'POST', { id: inquiryId, assigned_staff_id: ids.salesB })).status, 200);
    assert.equal((await request('salesA', '/admin/inquiry/list')).data.data.length, 0);
    assert.equal((await request('salesB', '/admin/inquiry/list')).data.data.length, 1);
    assert.equal((await request('admin', '/admin/inquiry/assign', 'POST', { id: inquiryId, assigned_staff_id: null })).status, 200);
    assert.equal((await request('salesB', '/admin/inquiry/list')).data.data.length, 0);

    const legacyProduct = await request('employee', '/admin/product/save', 'POST', {
      name: 'Employee created product', price: 75, sizes: [{ size: 'L' }], colors: [], images: []
    });
    assert.equal(legacyProduct.status, 200, JSON.stringify(legacyProduct.data));
    assert.equal((await request('employee', '/admin/product/save', 'POST', {
      id: legacyProduct.data.data, name: 'Employee edited product', price: 80, sizes: [], colors: [], images: []
    })).status, 200);

    const draft = {
      client_id: ids.customer, workflow_state: 'DRAFT', assigned_staff_id: ids.salesA,
      status: 'CREATED', payment_status: 'NOT_RECEIVED',
      items: [{ product_id: productId, product_sizes_id: sizeId, item_order: 1, quantity: 1, price: 100, status: 'CREATED', payment_status: 'NOT_RECEIVED' }]
    };
    const created = await request('employee', '/admin/order/save', 'POST', draft);
    assert.equal(created.status, 200, JSON.stringify(created.data));
    const orderId = created.data.data;
    const order = (await request('employee', `/admin/order/details/${orderId}`)).data.data;
    const itemId = order.items[0].id;
    assert.equal(order.workflow_state, 'DRAFT');
    assert.equal((await request('salesA', '/admin/order/list')).data.data.length, 1);
    assert.equal((await request('salesB', '/admin/order/list')).data.data.length, 0);
    assert.equal((await request('salesA', `/admin/order/list?assigned_staff_id=${ids.salesB}`)).data.data.length, 1, 'query cannot change salesman scope');
    assert.equal((await request('salesB', `/admin/order/details/${orderId}`)).status, 404);
    const [unassignedOrderId] = await db('orders').insert({ user_id: ids.salesA, client_id: ids.customer, created_by: ids.salesA,
      status: 'CREATED', payment_status: 'NOT_RECEIVED', created_at: new Date(), updated_at: new Date() });
    assert.equal((await request('salesA', '/admin/order/list')).data.data.length, 1, 'created_by is not an assignment');
    assert.equal((await request('salesA', `/admin/order/details/${unassignedOrderId}`)).status, 404);
    assert.equal((await request('salesA', '/admin/order/save', 'POST', { ...draft, id: unassignedOrderId, assigned_staff_id: undefined })).status, 403);
    const second = await request('employee', '/admin/order/save', 'POST', { ...draft, assigned_staff_id: null });
    assert.equal(second.status, 200, JSON.stringify(second.data));
    const foreignItemId = (await request('employee', `/admin/order/details/${second.data.data}`)).data.data.items[0].id;
    assert.equal((await request('salesB', '/admin/order/save', 'POST', { ...draft, id: orderId, assigned_staff_id: undefined })).status, 403);
    assert.equal((await request('salesA', '/admin/order/save', 'POST', { ...draft, id: orderId, assigned_staff_id: undefined, status: 'PACKING', payment_status: 'RECEIVED' })).status, 403);
    assert.equal((await request('salesA', '/admin/order/save', 'POST', { ...draft, id: orderId, assigned_staff_id: undefined, items: [{ ...draft.items[0], status: 'PACKING' }] })).status, 403);
    assert.equal((await request('salesA', '/admin/order/save', 'POST', { ...draft, id: orderId, assigned_staff_id: undefined, workflow_state: undefined, items: [{ ...draft.items[0], id: itemId, quantity: 2, payment_status: 'RECEIVED' }] })).status, 403);
    assert.equal((await request('salesA', '/admin/order/save', 'POST', { id: orderId, client_id: ids.vendor, status: 'CREATED', payment_status: 'NOT_RECEIVED', items: [{ ...draft.items[0], id: itemId }] })).status, 403);
    assert.equal((await request('salesA', '/admin/order/save', 'POST', { id: orderId, client_id: ids.customer, status: 'CREATED', payment_status: 'NOT_RECEIVED', items: [{ ...draft.items[0], id: foreignItemId }] })).status, 400);
    assert.equal(Number((await db('referral_rewards').count({ n: 'id' }).first()).n), 0);
    const prepared = { id: orderId, client_id: ids.customer, status: 'CREATED', payment_status: 'NOT_RECEIVED', items: [{ ...draft.items[0], id: itemId, quantity: 2 }] };
    assert.equal((await request('salesA', '/admin/order/save', 'POST', prepared)).status, 200);
    assert.equal(Number((await db('order_items').where({ id: itemId }).first()).quantity), 2);
    assert.equal((await request('salesA', `/admin/order/${orderId}/finalize`, 'POST')).status, 403);
    assert.equal((await request('employee', `/admin/order/${orderId}/finalize`, 'POST')).status, 200);
    assert.equal((await request('salesA', '/admin/order/save', 'POST', prepared)).status, 403);
    assert.equal((await request('admin', `/admin/order/${orderId}/assign`, 'POST', { assigned_staff_id: ids.salesB })).status, 200);
    assert.equal((await request('salesA', '/admin/order/list')).data.data.length, 0);
    assert.equal((await request('salesB', '/admin/order/list')).data.data.length, 1);
    const advanced = { ...prepared, status: 'PACKING', payment_status: 'RECEIVED', items: [{ ...prepared.items[0], status: 'PACKING', payment_status: 'RECEIVED' }] };
    assert.equal((await request('employee', '/admin/order/save', 'POST', advanced)).status, 200);
    assert.equal(Number((await db('referral_rewards').count({ n: 'id' }).first()).n), 1);
    assert.equal((await request('employee', '/admin/order/save', 'POST', advanced)).status, 200);
    assert.equal(Number((await db('referral_rewards').count({ n: 'id' }).first()).n), 1);
    assert.equal((await request('employee', '/admin/product/archive', 'POST', { id: productId, archived: true })).status, 200);
    const archivedOrder = (await request('checker', `/admin/order/details/${orderId}`)).data.data;
    assert.equal(archivedOrder.items[0].product.name, 'Test garment');
    assert.equal((await request('employee', '/admin/order/save', 'POST', advanced)).status, 200, 'existing order retains its archived product');
    assert.equal((await request('employee', '/admin/order/save', 'POST', { ...draft, assigned_staff_id: null })).status, 409, 'new order cannot select archived product');
    assert.equal((await request('employee', '/admin/product/delete-size', 'POST', { id: sizeId })).status, 409);
  } finally {
    if (server) await new Promise((resolve) => server.close(resolve));
    if (db) await db.destroy();
    await admin.query(`DROP DATABASE IF EXISTS \`${name}\``);
    await admin.end();
  }
});
