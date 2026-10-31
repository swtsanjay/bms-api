// npm run build && node --test tests/private-upload-validation.test.cjs
// Exercises real upload middleware/validators without storage or database writes.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const crypto = require('node:crypto');
const jwt = require('jsonwebtoken');

test('bill and design upload input failures are specific, safe, correctly classified and independent', async () => {
  const config = require('../dist/config').default;
  const token = jwt.sign({ id: 1, public_id: crypto.randomUUID(), email: 'fixture@example.test', session_id: crypto.randomUUID(), type: 'VSQ_CUSTOMER' }, config.jwt.secretKey, { expiresIn: 60 });
  global.knexInstance = () => { throw new Error('Invalid uploads must never access the database'); };
  const storage = require('../dist/lib/S3Service').default;
  storage.s3Client.send = async () => { throw new Error('Invalid uploads must never access storage'); };
  const app = express();
  app.use('/bills', require('../dist/modules/commerce/bills/route').default);
  app.use('/designs', require('../dist/modules/commerce/design/route').default);
  const server = app.listen(0, '127.0.0.1'); await new Promise((resolve) => server.once('listening', resolve));
  async function send(flow, { buffer, mime = 'image/png', extra = false, duplicate = false, missing = false, header = true } = {}) {
    const body = new FormData();
    if (!missing) body.append('file', new Blob([buffer || Buffer.alloc(0)], { type: mime }), 'fixture.png');
    if (duplicate) body.append('file', new Blob(['duplicate'], { type: mime }), 'second.png');
    if (flow === 'bills') { body.set('reward', 'WALLET'); body.set('request_id', crypto.randomUUID()); }
    else { body.set('phone', '9999999999'); body.set('marketing_permission', 'false'); }
    if (extra) { body.set('extra', 'field'); body.set('extra2', 'field'); }
    const response = await fetch(`http://127.0.0.1:${server.address().port}/${flow}/submissions`, { method: 'POST', body, headers: header ? { authorization: `Bearer ${token}` } : {} });
    return { status: response.status, body: await response.json() };
  }
  try {
    for (const flow of ['bills', 'designs']) {
      for (const [options, expected, message] of [
        [{ missing: true }, 422, /Choose/],
        [{ buffer: Buffer.alloc(0) }, 422, /empty/i],
        [{ buffer: Buffer.alloc(15 * 1024 * 1024 + 1) }, 413, /15 MB/],
        [{ buffer: Buffer.from('unsupported'), mime: 'application/zip' }, 422, /not supported/],
        [{ buffer: Buffer.from('not a PNG') }, 422, /Export a new/],
        [{ buffer: Buffer.from('%PDF-1.7\n/JavaScript test\n%%EOF'), mime: 'application/pdf' }, 422, /standard PDF/],
        [{ buffer: Buffer.from('file'), extra: true }, 400, /extra files or fields/],
        [{ buffer: Buffer.from('file'), duplicate: true }, 400, /one file/]
      ]) {
        const response = await send(flow, options);
        assert.equal(response.status, expected, `${flow}: ${JSON.stringify(response.body)}`);
        assert.equal(response.body.success, false); assert.equal(response.body.data, null); assert.equal(response.body.error_code, 'SUBMISSION_INVALID');
        assert.match(response.body.message, message); assert.doesNotMatch(response.body.message, /stack|database|storage|credential/i);
      }
      const raw = await fetch(`http://127.0.0.1:${server.address().port}/${flow}/submissions`, { method: 'POST', headers: { authorization: `Bearer ${token}`, 'content-type': 'multipart/form-data; boundary=test-boundary' }, body: '--test-boundary\r\nContent-Disposition: form-data; name="file"; filename="file.png"\r\n\r\ntruncated' });
      assert.equal(raw.status, 400); assert.match((await raw.json()).message, /interrupted or incomplete/);
    }
    assert.equal((await send('bills', { missing: true, header: false })).status, 401);
    assert.equal((await send('designs', { missing: true, header: false })).status, 422, 'guest designs remain allowed');
  } finally { await new Promise((resolve) => server.close(resolve)); }
});
