// Run after npm run build. Stubs every handler; no database, email, storage or redemption is used.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const os = require('node:os');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const { trustedProxyAddresses } = require('../dist/loaders/trusted-proxies');
const worker = String.raw`
const path = require('node:path');
const root = process.env.API_TEST_ROOT;
const express = require(require.resolve('express', { paths: [root] }));
const authController = require(path.join(root, 'dist/modules/commerce/customer/auth-controller')).default;
authController.login = (req, res) => res.json({ ip: req.ip });
authController.signup = (req, res) => res.json({ ip: req.ip });
authController.forgotPassword = (req, res) => res.json({ ip: req.ip });
authController.resetPassword = (req, res) => res.json({ ip: req.ip });
authController.refresh = (req, res) => res.json({ ip: req.ip });
require(path.join(root, 'dist/api/admin/modules/auth/controller')).default.login = (req, res) => res.json({ ip: req.ip });
require(path.join(root, 'dist/api/front/modules/auth/controller')).default.login = (req, res) => res.json({ ip: req.ip });
const customerAuth = require(path.join(root, 'dist/modules/commerce/customer/auth-service')).default;
customerAuth.verifyAccessToken = () => ({ id: 1, public_id: 'fixture', email: 'fixture@example.test', session_id: 'fixture' });
const designService = require(path.join(root, 'dist/modules/commerce/design/service'));
designService.claimDesign = async () => ({ public_id: 'fixture' });
const designVerification = require(path.join(root, 'dist/modules/commerce/design/email-verification'));
designVerification.requestEmailVerification = async () => ({});
designVerification.verifyCustomerEmail = async () => ({});
const walletService = require(path.join(root, 'dist/modules/commerce/wallet/service'));
walletService.redeemWalletCode = async () => ({ amount: 1 });
const app = express();
require(path.join(root, 'dist/loaders/trusted-proxies')).configureTrustedProxies(app);
app.use(express.json());
// Simulates the socket peer for direct and reverse-proxy paths on local loopback.
app.use((req, _res, next) => {
  const peer = req.get('x-test-peer');
  if (peer) Object.defineProperty(req.socket, 'remoteAddress', { configurable: true, value: peer });
  next();
});
app.use('/customers', require(path.join(root, 'dist/modules/commerce/customer/auth-route')).default);
app.use('/admin/auth', require(path.join(root, 'dist/api/admin/modules/auth/route')).default);
app.use('/front/auth', require(path.join(root, 'dist/api/front/modules/auth/route')).default);
app.use('/designs', require(path.join(root, 'dist/modules/commerce/design/route')).default);
app.use('/wallet', require(path.join(root, 'dist/modules/commerce/wallet/route')).default);
app.get('/ip', (req, res) => res.json({ ip: req.ip, ips: req.ips }));
const server = app.listen(0, '127.0.0.1', () => process.stdout.write('PORT:' + server.address().port + '\n'));
`;

async function startWorker(trusted = '') {
  const child = spawn(process.execPath, ['-e', worker], {
    cwd: os.tmpdir(),
    env: { ...process.env, API_TEST_ROOT: root, NODE_ENV: 'test', TRUSTED_PROXY_CIDRS: trusted,
      JWT_SECRET_KEY: 'isolated-rate-limit-test', RAZORPAY_ENABLED: 'false', MAILGUN_ENABLED: 'false',
      AWS_ACCESS_KEY_ID: 'isolated-key', AWS_SECRET_ACCESS_KEY: 'isolated-secret', AWS_S3_BUCKET_NAME: 'isolated-bucket' },
    stdio: ['ignore', 'pipe', 'pipe']
  });
  let output = '';
  let errors = '';
  child.stderr.on('data', (chunk) => { errors += chunk; });
  const port = await new Promise((resolve, reject) => {
    child.stdout.on('data', (chunk) => {
      output += chunk;
      let end;
      while ((end = output.indexOf('\n')) >= 0) {
        const line = output.slice(0, end);
        output = output.slice(end + 1);
        if (line.startsWith('PORT:')) resolve(Number(line.slice(5)));
      }
    });
    child.on('error', reject);
    child.on('exit', (code) => reject(new Error(`rate-limit worker exited ${code}: ${errors}`)));
  });
  return { base: `http://127.0.0.1:${port}`, async stop() {
    child.kill();
    if (child.exitCode === null) await new Promise((resolve) => child.once('exit', resolve));
  } };
}

async function call(worker, route, { method = 'POST', body, xff, peer, auth = true } = {}) {
  const response = await fetch(`${worker.base}${route}`, { method,
    headers: { ...(body ? { 'content-type': 'application/json' } : {}), ...(auth ? { authorization: 'Bearer fixture' } : {}),
      ...(xff ? { 'x-forwarded-for': xff } : {}), ...(peer ? { 'x-test-peer': peer } : {}) },
    body: body ? JSON.stringify(body) : undefined });
  return { status: response.status, retryAfter: response.headers.get('retry-after'), data: await response.json() };
}
function retrySeconds(result) {
  assert.equal(result.status, 429);
  assert.match(result.retryAfter || '', /^[1-9][0-9]*$/);
  assert.equal(result.data.success, false);
}

test('proxy trust is explicit and only configured socket peers can supply client IPs', async () => {
  assert.deepEqual(trustedProxyAddresses(undefined), []);
  assert.deepEqual(trustedProxyAddresses('192.0.2.10/32,2001:db8::1'), ['192.0.2.10/32', '2001:db8::1']);
  for (const value of ['true', '1', 'loopback', '0.0.0.0/0', '::/0', '192.0.2.10/33', '192.0.2.10,']) {
    assert.throws(() => trustedProxyAddresses(value), /TRUSTED_PROXY_CIDRS/, value);
  }
  const direct = await startWorker();
  const trusted = await startWorker('192.0.2.10/32');
  try {
    assert.equal((await call(direct, '/ip', { method: 'GET' })).data.ip, '127.0.0.1');
    assert.equal((await call(direct, '/ip', { method: 'GET', xff: '203.0.113.44' })).data.ip, '127.0.0.1');
    assert.equal((await call(trusted, '/ip', { method: 'GET', peer: '198.51.100.40', xff: '203.0.113.44' })).data.ip, '198.51.100.40');
    assert.equal((await call(trusted, '/ip', { method: 'GET', peer: '192.0.2.10', xff: '203.0.113.44' })).data.ip, '203.0.113.44');
    assert.equal((await call(trusted, '/ip', { method: 'GET', peer: '192.0.2.10', xff: '203.0.113.44, 198.51.100.40' })).data.ip, '198.51.100.40');
  } finally { await Promise.all([direct.stop(), trusted.stop()]); }
});

test('route limits reject forged-header rotation, retain scopes and send Retry-After', async () => {
  const worker = await startWorker();
  const login = { email: 'rate@example.test', password: '12345678' };
  try {
    for (let index = 0; index < 10; index++) assert.equal((await call(worker, '/customers/login', { body: login, xff: `203.0.113.${index + 1}` })).status, 200);
    retrySeconds(await call(worker, '/customers/login', { body: login, xff: '203.0.113.99' }));
    for (let index = 0; index < 5; index++) assert.equal((await call(worker, '/customers/forgot-password', { body: { email: 'forgot@example.test' } })).status, 200);
    retrySeconds(await call(worker, '/customers/forgot-password', { body: { email: 'forgot@example.test' } }));
    for (let index = 0; index < 10; index++) assert.equal((await call(worker, '/customers/reset-password', { body: { token: 'A'.repeat(43), password: '12345678' } })).status, 200);
    retrySeconds(await call(worker, '/customers/reset-password', { body: { token: 'A'.repeat(43), password: '12345678' } }));
    assert.equal((await call(worker, '/customers/reset-password', { body: { token: 'B'.repeat(43), password: '12345678' } })).status, 200);
    const firstId = '11111111-1111-4111-8111-111111111111';
    const secondId = '22222222-2222-4222-8222-222222222222';
    for (let index = 0; index < 20; index++) assert.equal((await call(worker, `/designs/submissions/${firstId}/claim`, { body: { claim_token: 'x' } })).status, 200);
    retrySeconds(await call(worker, `/designs/submissions/${secondId}/claim`, { body: { claim_token: 'x' } }));
    for (let index = 0; index < 10; index++) assert.equal((await call(worker, '/wallet/redeem', { body: { code: 'x' }, xff: `192.0.2.${index + 1}` })).status, 200);
    retrySeconds(await call(worker, '/wallet/redeem', { body: { code: 'x' }, xff: '192.0.2.99' }));
  } finally { await worker.stop(); }
});

test('legacy staff and front logins are limited before their handlers', async () => {
  const worker = await startWorker();
  try {
    for (const route of ['/admin/auth/login', '/front/auth/login']) {
      for (let index = 0; index < 10; index++) assert.equal((await call(worker, route, { body: { email: `${route.includes('admin') ? 'staff' : 'front'}@example.test`, password: '12345678' }, xff: `203.0.113.${index + 1}` })).status, 200);
      retrySeconds(await call(worker, route, { body: { email: `${route.includes('admin') ? 'staff' : 'front'}@example.test`, password: '12345678' }, xff: '203.0.113.99' }));
    }
  } finally { await worker.stop(); }
});

test('signup, refresh, design submission and verification keep their limits', async () => {
  const worker = await startWorker();
  try {
    for (let index = 0; index < 5; index++) assert.equal((await call(worker, '/customers/signup', { body: { email: 'signup@example.test', password: '12345678' } })).status, 200);
    retrySeconds(await call(worker, '/customers/signup', { body: { email: 'signup@example.test', password: '12345678' } }));
    for (let index = 0; index < 60; index++) assert.equal((await call(worker, '/customers/refresh', { body: { refresh_token: 'first-refresh-token' } })).status, 200);
    retrySeconds(await call(worker, '/customers/refresh', { body: { refresh_token: 'first-refresh-token' } }));
    assert.equal((await call(worker, '/customers/refresh', { body: { refresh_token: 'second-refresh-token' } })).status, 200);
    for (let index = 0; index < 20; index++) assert.equal((await call(worker, '/designs/submissions', { body: {} })).status, 422);
    retrySeconds(await call(worker, '/designs/submissions', { body: {} }));
    for (let index = 0; index < 20; index++) assert.equal((await call(worker, '/designs/submissions', { body: {}, auth: false, xff: `203.0.113.${index + 1}` })).status, 422);
    retrySeconds(await call(worker, '/designs/submissions', { body: {}, auth: false, xff: '203.0.113.99' }));
    for (let index = 0; index < 20; index++) assert.equal((await call(worker, '/designs/email-verification/request', { body: {} })).status, 200);
    retrySeconds(await call(worker, '/designs/email-verification/request', { body: {} }));
    for (let index = 0; index < 20; index++) assert.equal((await call(worker, '/designs/email-verification/confirm', { body: { token: 'same-token' } })).status, 200);
    retrySeconds(await call(worker, '/designs/email-verification/confirm', { body: { token: 'same-token' } }));
    assert.equal((await call(worker, '/designs/email-verification/confirm', { body: { token: 'different-token' } })).status, 200);
  } finally { await worker.stop(); }
});

test('email-scoped limits work across trusted client IPs without grouping separate customers', async () => {
  const worker = await startWorker('192.0.2.10/32');
  try {
    for (let index = 0; index < 10; index++) assert.equal((await call(worker, '/customers/login', { body: { email: 'same@example.test', password: '12345678' }, peer: '192.0.2.10', xff: `198.51.100.${index + 1}` })).status, 200);
    retrySeconds(await call(worker, '/customers/login', { body: { email: 'same@example.test', password: '12345678' }, peer: '192.0.2.10', xff: '198.51.100.99' }));
    for (let index = 0; index < 70; index++) assert.equal((await call(worker, '/customers/login', { body: { email: `other-${index}@example.test`, password: '12345678' } })).status, 200);
    for (let index = 0; index < 5; index++) assert.equal((await call(worker, '/customers/forgot-password', { body: { email: 'forgot@example.test' }, peer: '192.0.2.10', xff: `198.51.100.${index + 1}` })).status, 200);
    retrySeconds(await call(worker, '/customers/forgot-password', { body: { email: 'forgot@example.test' }, peer: '192.0.2.10', xff: '198.51.100.99' }));
  } finally { await worker.stop(); }
});

test('memory limits remain per process and reset on a new process', async () => {
  const first = await startWorker();
  const second = await startWorker();
  const body = { email: 'process@example.test', password: '12345678' };
  try {
    for (let index = 0; index < 10; index++) assert.equal((await call(first, '/customers/login', { body })).status, 200);
    retrySeconds(await call(first, '/customers/login', { body }));
    assert.equal((await call(second, '/customers/login', { body })).status, 200);
  } finally { await Promise.all([first.stop(), second.stop()]); }
  const restarted = await startWorker();
  try { assert.equal((await call(restarted, '/customers/login', { body })).status, 200); }
  finally { await restarted.stop(); }
});

test('concurrent attempts in one process cannot exceed the configured points', async () => {
  const worker = await startWorker();
  try {
    const attempts = await Promise.all(Array.from({ length: 20 }, () => call(worker, '/customers/login', { body: { email: 'parallel@example.test', password: '12345678' } })));
    assert.equal(attempts.filter((entry) => entry.status === 200).length, 10);
    assert.equal(attempts.filter((entry) => entry.status === 429).length, 10);
    attempts.filter((entry) => entry.status === 429).forEach(retrySeconds);
  } finally { await worker.stop(); }
});
