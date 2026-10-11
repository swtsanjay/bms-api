const { test } = require('node:test');
const assert = require('node:assert/strict');
const os = require('node:os');
const path = require('node:path');

// Load TypeScript from source, without compiling into the project. Running from
// a temporary cwd prevents config/loadEnv from reading the application's .env.
require('ts-node').register({ project: path.resolve(__dirname, '../tsconfig.json'), transpileOnly: true });
process.chdir(os.tmpdir());
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET_KEY = 'isolated-admin-authorization-test-secret';
process.env.RAZORPAY_ENABLED = 'false';
process.env.MAILGUN_ENABLED = 'false';
process.env.AWS_ACCESS_KEY_ID = 'isolated-test-key';
process.env.AWS_SECRET_ACCESS_KEY = 'isolated-test-secret';
process.env.AWS_S3_BUCKET_NAME = 'isolated-test-bucket';

const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const SharedUserService = require('../src/shared-services/user').default;
const LegacyUserService = require('../src/api/admin/services/user').default;
const UserController = require('../src/api/admin/modules/user/controller').default;
const OrderController = require('../src/api/admin/modules/order/controller').default;
const CommerceController = require('../src/modules/commerce/admin/controller').default;
const SellerDetailsController = require('../src/api/admin/modules/userSellerDetail/controller').default;
const WalletController = require('../src/api/admin/modules/wallet/controller').default;
const databaseMiddleware = require('../src/api/admin/middlewares/databse/db');

const password = bcrypt.hashSync('test-password', 4);
const users = new Map([
  [1, { id: 1, email: 'admin@example.test', user_type: 'ADMIN', password }],
  [2, { id: 2, email: 'employee@example.test', user_type: 'EMPLOYEE', password }],
  [3, { id: 3, email: 'vendor@example.test', user_type: 'VENDOR', password }],
  [4, { id: 4, email: 'customer@example.test', user_type: 'CUSTOMER', password }],
  [5, { id: 5, email: 'checker@example.test', user_type: 'CHECKER', password }],
  [6, { id: 6, email: 'sales@example.test', user_type: 'SALES_MAN', password }],
  [7, { id: 7, email: 'deleted@example.test', user_type: 'ADMIN', password, deleted_at: new Date() }]
]);
function fixtureUser(value, key) {
  const user = key === 'email'
    ? [...users.values()].find((item) => item.email === value)
    : users.get(value);
  return user && !user.deleted_at ? { ...user } : null;
}
SharedUserService.getUserBy = async (value, key) => fixtureUser(value, key);
SharedUserService.getActiveStaffById = async (id) => fixtureUser(id, 'id');
LegacyUserService.details = async () => ({ data: null, status: true });

const hits = { legacy: 0, commerce: 0, user: 0, seller: 0, wallet: 0, profile: 0, transaction: 0 };
OrderController.list = (_req, res) => { hits.legacy++; res.json({ ok: true }); };
CommerceController.products = (_req, res) => { hits.commerce++; res.json({ ok: true }); };
UserController.list = (_req, res) => { hits.user++; res.json({ ok: true }); };
SellerDetailsController.list = (_req, res) => { hits.seller++; res.json({ ok: true }); };
WalletController.settings = (_req, res) => { hits.wallet++; res.json({ ok: true }); };
UserController.updateProfile = (req, res) => {
  hits.profile++;
  res.json({ body: req.body });
};
databaseMiddleware.createTransaction = (_req, _res, next) => { hits.transaction++; next(); };

const router = require('../src/api/admin').default;
const app = express();
app.use(express.json());
app.use('/admin', router);
app.use((error, _req, res, _next) => res.status(500).json({ error: error.message }));

function token(id, overrides = {}, options = {}) {
  return jwt.sign({ id, type: 'BMS_STAFF', user_type: 'ADMIN', ...overrides },
    process.env.JWT_SECRET_KEY, { audience: 'bms-admin', expiresIn: '1h', ...options });
}

test('admin boundary rejects customer and invalid tokens before legacy and commerce handlers', async () => {
  const server = app.listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  async function request(route, bearer, method = 'GET', body) {
    const response = await fetch(`${base}${route}`, {
      method,
      headers: { ...(bearer ? { authorization: `Bearer ${bearer}` } : {}), ...(body ? { 'content-type': 'application/json' } : {}) },
      ...(body ? { body: JSON.stringify(body) } : {})
    });
    return { status: response.status, body: await response.json() };
  }
  try {
    const before = { ...hits };
    const cases = [
      ['commerce customer', jwt.sign({ id: 1, type: 'VSQ_CUSTOMER' }, process.env.JWT_SECRET_KEY, { expiresIn: '1h' })],
      ['legacy front customer', jwt.sign({ id: 4, user_type: 'CUSTOMER' }, process.env.JWT_SECRET_KEY, { expiresIn: '1h' })],
      ['malformed', 'not-a-jwt'],
      ['expired', token(1, {}, { expiresIn: -1 })],
      ['deleted staff', token(7)],
      ['missing staff', token(99)],
      ['ineligible user', token(3)],
      ['old staff token', jwt.sign({ id: 1, user_type: 'ADMIN' }, process.env.JWT_SECRET_KEY, { expiresIn: '1h' })],
      ['wrong audience', jwt.sign({ id: 1, type: 'BMS_STAFF' }, process.env.JWT_SECRET_KEY, { audience: 'storefront', expiresIn: '1h' })]
    ];
    for (const [label, bearer] of cases) {
      for (const route of ['/admin/order/list', '/admin/v1/commerce/products']) {
        assert.equal((await request(route, bearer)).status, 401, `${label} ${route}`);
      }
    }
    assert.deepEqual(hits, before);

    assert.equal((await request('/admin/order/list', token(2))).status, 200);
    assert.equal((await request('/admin/order/list', token(5))).status, 200);
    assert.equal((await request('/admin/order/list', token(6))).status, 200);
    assert.equal((await request('/admin/v1/commerce/products', token(1))).status, 200);
    assert.equal(hits.legacy, 3);
    assert.equal(hits.commerce, 1);

    // The signed ADMIN claim is ignored: current database role wins.
    assert.equal((await request('/admin/v1/commerce/products', token(2))).status, 200);
    assert.equal((await request('/admin/v1/commerce/products', token(5))).status, 200);
    assert.equal((await request('/admin/v1/commerce/products', token(6))).status, 403);
    for (const route of [
      '/admin/v1/commerce/reviews', '/admin/v1/commerce/designs',
      '/admin/v1/commerce/wallet/denominations'
    ]) {
      assert.equal((await request(route, token(2))).status, 403, route);
    }
    assert.equal((await request('/admin/user/list', token(2))).status, 200);
    assert.equal((await request('/admin/user/list', token(6))).status, 403);
    assert.equal((await request('/admin/user/list', token(1))).status, 200);
    assert.equal(hits.user, 2);
    assert.equal((await request('/admin/user-seller-details/list', token(2))).status, 200);
    assert.equal((await request('/admin/wallet/settings', token(2))).status, 200);
    assert.equal(hits.seller, 1);
    assert.equal(hits.wallet, 1);
    assert.equal((await request('/admin/user/create', token(2), 'POST', {})).status, 403);
    assert.equal((await request('/admin/user/delete', token(2), 'POST', {})).status, 403);
    assert.equal((await request('/admin/user-seller-details/save', token(2), 'POST', {})).status, 403);
    assert.equal((await request('/admin/user-seller-details/delete', token(2), 'POST', {})).status, 403);
    assert.equal((await request('/admin/wallet/settings', token(2), 'POST', {})).status, 403);
    assert.equal((await request('/admin/transaction/delete', token(2), 'POST', {})).status, 403);
    assert.equal((await request('/admin/transaction/save', token(5), 'POST', {})).status, 403);
    assert.equal((await request('/admin/order/save', token(5), 'POST', {})).status, 403);
    assert.equal((await request('/admin/product/save', token(5), 'POST', {})).status, 403);
    assert.equal((await request('/admin/file/upload', token(5), 'POST', {})).status, 403);
    assert.equal((await request('/admin/iot/save', token(2), 'POST', {})).status, 403);
    assert.equal((await request('/admin/iot/save', null, 'POST', {})).status, 401);
    assert.equal((await request('/admin/iot/save', token(1, { type: 'VSQ_CUSTOMER' }), 'POST', {})).status, 401);
    assert.equal(hits.transaction, 0);

    assert.equal((await request('/admin/user/save', token(2), 'POST', {
      id: 1, name: 'Attacker', email: 'employee@example.test', phone: '1111111111', user_type: 'ADMIN'
    })).status, 403);
    assert.equal((await request('/admin/user/save', token(2), 'POST', {
      id: 2, name: 'Employee', email: 'employee@example.test', phone: '1111111111',
      user_type: 'EMPLOYEE', deleted_at: null
    })).status, 403);
    assert.equal(hits.profile, 0);
    const own = await request('/admin/user/save', token(2), 'POST', {
      id: 2, name: 'Employee', email: 'employee@example.test', phone: '1111111111', user_type: 'EMPLOYEE'
    });
    assert.equal(own.status, 200);
    assert.deepEqual(Object.keys(own.body.body).sort(), ['email', 'id', 'name', 'phone', 'user_type']);
    assert.equal(hits.profile, 1);

    const status = await request('/admin/status?secret=do-not-echo', null);
    assert.equal(status.status, 200);
    assert.deepEqual(status.body.data, { status: 'ok' });
    assert.equal((await request('/admin/status', null, 'POST', { secret: 'do-not-echo' })).status, 401);

    const staffLogin = await request('/admin/auth/login', null, 'POST', { email: 'admin@example.test', password: 'test-password' });
    assert.equal(staffLogin.status, 200);
    const issued = jwt.verify(staffLogin.body.data.token, process.env.JWT_SECRET_KEY, { audience: 'bms-admin' });
    assert.equal(issued.type, 'BMS_STAFF');
    assert.equal((await request('/admin/order/list', staffLogin.body.data.token)).status, 200);
    assert.equal((await request('/admin/auth/login', null, 'POST', { email: 'customer@example.test', password: 'test-password' })).status, 401);
    assert.equal((await request('/admin/auth/login', null, 'POST', { email: 'vendor@example.test', password: 'test-password' })).status, 401);
    assert.equal((await request('/admin/auth/login', null, 'POST', { email: 'deleted@example.test', password: 'test-password' })).status, 401);
  } finally {
    server.close();
    await new Promise((resolve) => server.once('close', resolve));
  }
});
