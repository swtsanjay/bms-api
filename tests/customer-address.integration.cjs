// Run after npm run build. Uses a random local MySQL schema; never the configured application schema.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const path = require('node:path');
const express = require('express');
const knex = require('knex');
const mysql = require('mysql2/promise');
require('dotenv').config();

test('saved addresses support clearing, partial updates, ownership and checkout-compatible validation', async () => {
  const host = process.env.DB_HOSTNAME;
  assert.ok(['localhost', '127.0.0.1', '::1'].includes(host), 'Only local MySQL is permitted');
  const database = `address_test_${crypto.randomBytes(5).toString('hex')}`;
  const connection = { host, user: process.env.DB_USER, password: process.env.DB_PASSWORD };
  const admin = await mysql.createConnection(connection);
  let db;
  let server;
  let auth;
  let originalVerify;
  let checkoutController;
  let originalPlaceOrder;
  try {
    await admin.query(`CREATE DATABASE \`${database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
    db = knex({ client: 'mysql2', connection: { ...connection, database }, pool: { min: 0, max: 5 }, migrations: { directory: path.resolve(__dirname, '../dist/db-migrations') } });
    global.knexInstance = db;
    await db.migrate.latest();

    async function customer(email) {
      const [id] = await db('vsq_customers').insert({ public_id: crypto.randomUUID(), email, email_normalized: email, status: 'ACTIVE', created_at: new Date(), updated_at: new Date() });
      return Number(id);
    }
    const owner = await customer('address-owner@example.test');
    const other = await customer('address-other@example.test');
    auth = require('../dist/modules/commerce/customer/auth-service').default;
    originalVerify = auth.verifyAccessToken;
    auth.verifyAccessToken = (token) => {
      if (!['owner', 'other'].includes(token)) throw new Error('Invalid token');
      return { id: token === 'owner' ? owner : other, public_id: 'test', email: 'test@example.test', session_id: 'test' };
    };
    checkoutController = require('../dist/modules/commerce/checkout/controller').default;
    originalPlaceOrder = checkoutController.placeOrder;
    let checkoutHandlerCalls = 0;
    checkoutController.placeOrder = (_req, res) => { checkoutHandlerCalls++; return res.json({ success: true, message: 'Validated without placing an order' }); };

    const app = express();
    app.use(express.json());
    app.use('/customers', require('../dist/modules/commerce/customer/auth-route').default);
    app.use('/checkout', require('../dist/modules/commerce/checkout/route').default);
    app.use((error, _req, res, _next) => res.status(Number(error.code) || 422).json({ success: false, message: error.message }));
    server = app.listen(0);
    const root = `http://127.0.0.1:${server.address().port}`;
    async function request(method, route, body, token = 'owner') {
      const response = await fetch(`${root}${route}`, { method, headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) });
      return { status: response.status, body: await response.json() };
    }

    const address = { first_name: 'Asha', last_name: 'Kumar', company: 'Example Co', address_line_1: '12 Main Road', address_line_2: 'Flat 3', city: 'Delhi', state: 'Delhi', state_code: 'DL', postcode: '110001', phone: '+919876543210', is_default_shipping: true, is_default_billing: true };
    const created = await request('POST', '/customers/addresses', address);
    assert.equal(created.status, 201);
    const publicId = created.body.data.address.public_id;
    assert.equal(created.body.data.address.company, 'Example Co');
    assert.equal(Number(created.body.data.address.is_default_shipping), 1);
    assert.equal(Number(created.body.data.address.is_default_billing), 1);
    const route = `/customers/addresses/${publicId}`;

    const partial = await request('PATCH', route, { city: 'New Delhi' });
    assert.equal(partial.status, 200);
    assert.equal(partial.body.data.address.city, 'New Delhi');
    assert.equal(partial.body.data.address.company, 'Example Co');
    assert.equal(partial.body.data.address.phone, '+919876543210');
    assert.equal(partial.body.data.address.postcode, '110001');

    const cleared = await request('PATCH', route, { last_name: '', company: '', address_line_2: ' ', state_code: '', phone: '' });
    assert.equal(cleared.status, 200);
    for (const field of ['last_name', 'company', 'address_line_2', 'state_code', 'phone']) assert.equal(cleared.body.data.address[field], null);
    assert.equal(cleared.body.data.address.first_name, 'Asha');
    assert.equal(Number(cleared.body.data.address.is_default_shipping), 1);
    assert.equal(Number(cleared.body.data.address.is_default_billing), 1);

    for (const field of ['first_name', 'address_line_1', 'city', 'state', 'postcode']) {
      const rejected = await request('PATCH', route, { [field]: '  ' });
      assert.equal(rejected.status, 422, `${field} may not be cleared`);
      assert.ok(rejected.body.message);
      const rejectedCreate = await request('POST', '/customers/addresses', { ...address, [field]: '  ' });
      assert.equal(rejectedCreate.status, 422, `${field} is required when creating an address`);
    }
    for (const postcode of ['000000', '1100X1', '12345', '1234567']) {
      const rejectedCreate = await request('POST', '/customers/addresses', { ...address, postcode });
      const rejectedUpdate = await request('PATCH', route, { postcode });
      assert.equal(rejectedCreate.status, 422);
      assert.match(rejectedCreate.body.message, /PIN code/);
      assert.equal(rejectedUpdate.status, 422);
    }
    assert.equal((await db('vsq_customer_addresses').where({ public_id: publicId }).first()).postcode, '110001');
    assert.equal((await request('PATCH', route, { city: 'Changed by other' }, 'other')).status, 404);
    assert.equal((await request('GET', '/customers/addresses', undefined, 'other')).body.data.addresses.length, 0);
    assert.equal((await request('GET', '/customers/addresses')).body.data.addresses[0].city, 'New Delhi');

    const second = await request('POST', '/customers/addresses', { ...address, address_line_1: '34 Second Road', is_default_shipping: true, is_default_billing: true });
    assert.equal(second.status, 201);
    const firstAfterSecond = await db('vsq_customer_addresses').where({ public_id: publicId }).first();
    assert.equal(Number(firstAfterSecond.is_default_shipping), 0);
    assert.equal(Number(firstAfterSecond.is_default_billing), 0);
    assert.equal((await request('PATCH', route, { is_default_shipping: true, is_default_billing: true })).status, 200);
    const firstAgain = await db('vsq_customer_addresses').where({ public_id: publicId }).first();
    assert.equal(Number(firstAgain.is_default_shipping), 1);
    assert.equal(Number(firstAgain.is_default_billing), 1);
    const secondAgain = await db('vsq_customer_addresses').where({ public_id: second.body.data.address.public_id }).first();
    assert.equal(Number(secondAgain.is_default_shipping), 0);
    assert.equal(Number(secondAgain.is_default_billing), 0);

    const checkout = { cart_public_id: crypto.randomUUID(), payment_method: 'COD', shipping_address: { ...address } };
    const invalidCheckout = await request('POST', '/checkout/orders', { ...checkout, shipping_address: { ...address, postcode: '000000' } });
    assert.notEqual(invalidCheckout.status, 200);
    assert.match(invalidCheckout.body.message, /PIN code/);
    const blankCheckout = await request('POST', '/checkout/orders', { ...checkout, shipping_address: { ...address, first_name: ' ' } });
    assert.notEqual(blankCheckout.status, 200);
    assert.match(blankCheckout.body.message, /First name/);
    const invalidBilling = await request('POST', '/checkout/orders', { ...checkout, billing_address: { ...address, postcode: '000000' } });
    assert.notEqual(invalidBilling.status, 200);
    assert.match(invalidBilling.body.message, /PIN code/);
    assert.equal(checkoutHandlerCalls, 0);
    const validCheckout = await request('POST', '/checkout/orders', checkout);
    assert.equal(validCheckout.status, 200);
    assert.equal(checkoutHandlerCalls, 1, 'valid checkout reached only a stub, not order creation');
  } finally {
    if (server) await new Promise((resolve) => server.close(resolve));
    if (auth) auth.verifyAccessToken = originalVerify;
    if (checkoutController) checkoutController.placeOrder = originalPlaceOrder;
    if (db) await db.destroy();
    await admin.query(`DROP DATABASE IF EXISTS \`${database}\``);
    await admin.end();
  }
});
