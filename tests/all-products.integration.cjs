// Run after npm run build. Creates and drops only a random local MySQL schema.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const path = require('node:path');
const express = require('express');
const knex = require('knex');
const mysql = require('mysql2/promise');
require('dotenv').config();

test('All Products is derived from publication, independent of collection membership', async () => {
  const host = process.env.DB_HOSTNAME;
  assert.ok(['localhost', '127.0.0.1', '::1'].includes(host), 'Only local MySQL is permitted');
  const name = `all_products_test_${crypto.randomBytes(5).toString('hex')}`;
  const connection = { host, user: process.env.DB_USER, password: process.env.DB_PASSWORD };
  const admin = await mysql.createConnection(connection);
  let db;
  let server;
  try {
    await admin.query(`CREATE DATABASE \`${name}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
    db = knex({ client: 'mysql2', connection: { ...connection, database: name }, pool: { min: 0, max: 5 }, migrations: { directory: path.resolve(__dirname, '../dist/db-migrations') } });
    global.knexInstance = db;
    await db.migrate.latest();
    const Catalog = require('../dist/modules/commerce/catalog/service').default;
    const Admin = require('../dist/modules/commerce/admin/service').default;
    const system = await db('vsq_collections').where({ slug: 'all-products' }).first();
    const ordinary = await db('vsq_collections').where({ slug: 'mens-collection' }).first();
    const men = await db('vsq_categories').where({ slug: 'men' }).first();
    assert.ok(system && ordinary && men);
    const basic = { status: 'ACTIVE', category_public_ids: [men.public_id], variants: [] };
    const noIds = await Admin.saveProduct({ ...basic, title: 'Needle unassigned' }, 1);
    const emptyIds = await Admin.saveProduct({ ...basic, title: 'Empty collections', collection_public_ids: [] }, 1);
    const ordinaryOnly = await Admin.saveProduct({ ...basic, title: 'Ordinary collection', collection_public_ids: [ordinary.public_id] }, 1);
    const ids = [noIds, emptyIds, ordinaryOnly];
    const physical = await db('vsq_collection_products').whereIn('product_id', ids.map((item) => item.id));
    assert.equal(physical.length, 1, 'only the ordinary collection is physically assigned');
    assert.equal(Number(physical[0].collection_id), Number(ordinary.id));
    for (const product of ids) assert.equal((await Catalog.productBySlug(product.slug)).public_id, product.public_id);
    assert.equal((await Catalog.listProducts({ collection: 'all-products' })).pagination.total, 3);
    assert.equal((await Catalog.listProducts({ collection: 'mens-collection' })).pagination.total, 1);

    // Existing physical system assignments are ignored and disappear on an explicit collection edit.
    await db('vsq_collection_products').insert({ product_id: noIds.id, collection_id: system.id });
    assert.deepEqual((await Admin.product(noIds.public_id)).collection_public_ids, []);
    await Admin.saveProduct({ ...basic, public_id: noIds.public_id, title: 'Needle unassigned edited', collection_public_ids: [] }, 1);
    assert.equal(Number((await db('vsq_collection_products').where({ product_id: noIds.id }).count({ total: '*' }).first()).total), 0);
    await Admin.saveProduct({ ...basic, public_id: ordinaryOnly.public_id, title: 'Ordinary cleared', collection_public_ids: [] }, 1);
    assert.equal((await Catalog.listProducts({ collection: 'all-products' })).pagination.total, 3);
    assert.equal((await Catalog.listProducts({ collection: 'mens-collection' })).pagination.total, 0);
    await Admin.saveProduct({ ...basic, public_id: ordinaryOnly.public_id, title: 'Ordinary restored', collection_public_ids: [ordinary.public_id] }, 1);
    assert.equal((await Catalog.listProducts({ collection: 'mens-collection' })).pagination.total, 1);

    const draft = await Admin.saveProduct({ ...basic, title: 'Draft item', status: 'DRAFT' }, 1);
    assert.equal((await Catalog.listProducts({ collection: 'all-products', search: 'Draft item' })).pagination.total, 0);
    await Admin.saveProduct({ ...basic, public_id: draft.public_id, title: 'Draft item', status: 'ACTIVE' }, 1);
    assert.equal((await Catalog.listProducts({ collection: 'all-products', search: 'Draft item' })).pagination.total, 1);
    await Admin.saveProduct({ ...basic, public_id: draft.public_id, title: 'Draft item', status: 'ARCHIVED' }, 1);
    assert.equal((await Catalog.listProducts({ collection: 'all-products', search: 'Draft item' })).pagination.total, 0);
    await Admin.saveProduct({ ...basic, public_id: draft.public_id, title: 'Draft item', status: 'ACTIVE' }, 1);
    assert.equal((await Catalog.listProducts({ collection: 'all-products', search: 'Draft item' })).pagination.total, 1);

    await assert.rejects(Admin.saveCollection({ title: 'Changed', slug: 'all-products' }, system.public_id), (error) => error.statusCode === 403);
    await assert.rejects(Admin.deleteTaxonomy('collections', system.public_id), (error) => error.statusCode === 403);
    await assert.rejects(Admin.saveCollection({ title: 'All Products', slug: 'another-slug' }), (error) => error.statusCode === 403);

    // 122 additional historical products have no All Products membership.
    const firstId = Number((await db('vsq_products').max({ value: 'id' }).first()).value) + 1;
    const rows = Array.from({ length: 122 }, (_, index) => ({
      id: firstId + index, public_id: crypto.randomUUID(), slug: `historical-${index}`,
      title: `Historical ${index}`, status: 'ACTIVE', published_at: new Date('2026-01-01T00:00:00.000Z')
    }));
    for (let index = 0; index < rows.length; index += 50) {
      await db('vsq_products').insert(rows.slice(index, index + 50));
      await db('vsq_product_categories').insert(rows.slice(index, index + 50).map((item) => ({ product_id: item.id, category_id: men.id })));
    }
    const firstPage = await Catalog.listProducts({ collection: 'all-products', page: 1, limit: 100 });
    const secondPage = await Catalog.listProducts({ collection: 'all-products', page: 2, limit: 100 });
    assert.equal(firstPage.pagination.total, 126);
    assert.equal(secondPage.pagination.total, 126);
    assert.deepEqual([firstPage.products.length, secondPage.products.length], [100, 26]);
    assert.equal(new Set([...firstPage.products, ...secondPage.products].map((item) => item.slug)).size, 126);
    assert.equal(firstPage.facets.total, 126);
    assert.equal(firstPage.facets.categories.find((item) => item.name === 'Men').count, 126);
    assert.equal((await Catalog.listProducts({ collection: 'all-products', search: 'Needle unassigned edited' })).pagination.total, 1);
    assert.equal((await Admin.products({ collection_public_id: system.public_id, page: 2, limit: 100 })).pagination.total, 126);
    const taxonomy = await Admin.taxonomy();
    assert.equal(taxonomy.collections.find((item) => item.slug === 'all-products').product_count, 126);
    assert.equal(taxonomy.collections.find((item) => item.slug === 'all-products').kind, 'SYSTEM');
    assert.equal(taxonomy.collections.find((item) => item.slug === 'mens-collection').product_count, 1);

    const app = express();
    app.use('/front/v1/commerce/catalog', require('../dist/modules/commerce/catalog/route').default);
    server = app.listen(0, '127.0.0.1');
    await new Promise((resolve) => server.once('listening', resolve));
    const base = `http://127.0.0.1:${server.address().port}`;
    const response = await fetch(`${base}/front/v1/commerce/catalog/products?collection=all-products&page=2&limit=100`);
    assert.equal(response.status, 200);
    assert.equal((await response.json()).data.pagination.total, 126);

    // Even if the old system row is absent or marked draft, the derived view remains available.
    await db('vsq_collections').where({ id: system.id }).delete();
    assert.equal((await Catalog.listProducts({ collection: 'all-products' })).pagination.total, 126);
    const recovered = (await Admin.taxonomy()).collections.find((item) => item.slug === 'all-products');
    assert.equal(recovered.product_count, 126);
    assert.equal(recovered.kind, 'SYSTEM');
    assert.equal((await Admin.products({ collection_public_id: recovered.public_id })).pagination.total, 126);
    await assert.rejects(Admin.saveCollection({ title: 'Changed', slug: 'all-products' }, recovered.public_id), (error) => error.statusCode === 403);
    await assert.rejects(Admin.deleteTaxonomy('collections', recovered.public_id), (error) => error.statusCode === 403);
    const editedOrdinary = await Admin.saveCollection({ title: 'Men Picks', slug: 'mens-collection', status: 'ACTIVE' }, ordinary.public_id);
    assert.equal(editedOrdinary.title, 'Men Picks');
    assert.equal((await Catalog.listProducts({ collection: 'mens-collection' })).pagination.total, 1);
    await Admin.deleteTaxonomy('collections', ordinary.public_id);
    assert.equal((await Catalog.listProducts({ collection: 'all-products' })).pagination.total, 126);
  } finally {
    if (server) await new Promise((resolve) => server.close(resolve));
    if (db) await db.destroy();
    await admin.query(`DROP DATABASE IF EXISTS \`${name}\``);
    await admin.end();
  }
});
