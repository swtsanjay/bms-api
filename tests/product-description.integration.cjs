// Run after npm run build. Creates and drops only a random local MySQL schema.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const path = require('node:path');
const knex = require('knex');
const mysql = require('mysql2/promise');
require('dotenv').config();

test('new and historical product HTML is safe in admin and public catalog responses', async () => {
  const host = process.env.DB_HOSTNAME;
  assert.ok(['localhost', '127.0.0.1', '::1'].includes(host), 'Only local MySQL is permitted');
  const name = `product_html_test_${crypto.randomBytes(5).toString('hex')}`;
  const connection = { host, user: process.env.DB_USER, password: process.env.DB_PASSWORD };
  const admin = await mysql.createConnection(connection);
  let db;
  try {
    await admin.query(`CREATE DATABASE \`${name}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
    db = knex({ client: 'mysql2', connection: { ...connection, database: name }, pool: { min: 0, max: 5 }, migrations: { directory: path.resolve(__dirname, '../dist/db-migrations') } });
    global.knexInstance = db;
    await db.migrate.latest();
    const CommerceAdminService = require('../dist/modules/commerce/admin/service').default;
    const CommerceCatalogService = require('../dist/modules/commerce/catalog/service').default;
    const unsafe = '<p onclick="alert(1)">Safe <strong>format</strong><script>alert(2)</script><a href="javascript:alert(3)">link</a></p>';
    const plain = '<img src=x onerror=alert(4)> plain text';
    const saved = await CommerceAdminService.saveProduct({ title: 'Fresh description', slug: 'fresh-description', status: 'ACTIVE', description_html: unsafe, description_text: plain, variants: [] }, 1);
    assert.doesNotMatch(saved.description_html, /onclick|javascript:|<script|alert/i);
    assert.match(saved.description_html, /<strong>format<\/strong>/);
    const storedNew = await db('vsq_products').where({ public_id: saved.public_id }).first();
    assert.equal(storedNew.description_html, saved.description_html, 'new HTML is cleaned before storage');
    assert.equal(storedNew.description_text, plain, 'plain text is preserved as text');

    const historicalHtml = '<p>Old <em>content</em><svg onload="alert(1)"></svg><a href="data:text/html,x">bad link</a></p>';
    await db('vsq_products').where({ public_id: saved.public_id }).update({ description_html: historicalHtml });
    const publicDetail = await CommerceCatalogService.productBySlug('fresh-description');
    const publicList = await CommerceCatalogService.listProducts({});
    const adminDetail = await CommerceAdminService.product(saved.public_id);
    for (const response of [publicDetail, publicList.products[0], adminDetail]) {
      assert.match(response.description_html, /<em>content<\/em>/);
      assert.doesNotMatch(response.description_html, /<svg|onload|data:text\/html|alert/i);
      assert.equal(response.description_text, plain);
    }
    const storedOld = await db('vsq_products').where({ public_id: saved.public_id }).first();
    assert.equal(storedOld.description_html, historicalHtml, 'historical HTML is not rewritten');
  } finally {
    if (db) await db.destroy();
    await admin.query(`DROP DATABASE IF EXISTS \`${name}\``);
    await admin.end();
  }
});
