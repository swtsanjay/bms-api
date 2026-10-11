// Run after npm run build. Creates and drops only a random local MySQL schema.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const path = require('node:path');
const knex = require('knex');
const mysql = require('mysql2/promise');
const express = require('express');
require('dotenv').config();

test('catalog pagination, search, facets, sorting and direct lookups reach products beyond page one', async () => {
  const host = process.env.DB_HOSTNAME;
  assert.ok(['localhost', '127.0.0.1', '::1'].includes(host), 'Only local MySQL is permitted');
  const name = `catalog_page_test_${crypto.randomBytes(5).toString('hex')}`;
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
    const allCollection = await db('vsq_collections').where({ slug: 'all-products' }).first();
    const menCollection = await db('vsq_collections').where({ slug: 'mens-collection' }).first();
    const men = await db('vsq_categories').where({ slug: 'men' }).first();
    const shirts = await db('vsq_categories').where({ slug: 't-shirts' }).first();
    const priceList = await db('vsq_price_lists').where({ code: 'INR_DEFAULT' }).first();
    assert.ok(allCollection && menCollection && men && shirts && priceList);
    const published = new Date('2026-01-01T00:00:00.000Z');
    async function seed(start, end) {
      const rows = Array.from({ length: end - start + 1 }, (_, offset) => {
        const i = start + offset;
        return { id: i, public_id: crypto.randomUUID(), slug: `catalog-item-${i}`, title: i === 1 ? 'Needle title' : `Product ${i}`, description_text: i === 2 ? 'fabricneedle' : '', tags: JSON.stringify(i === 3 ? ['tagneedle'] : []), status: 'ACTIVE', published_at: published };
      });
      for (let at = 0; at < rows.length; at += 50) await db('vsq_products').insert(rows.slice(at, at + 50));
      for (let at = start; at <= end; at += 50) {
        const ids = Array.from({ length: Math.min(50, end - at + 1) }, (_, offset) => at + offset);
        await db('vsq_product_variants').insert(ids.map((i) => ({ id: i, public_id: crypto.randomUUID(), product_id: i, title: 'Default', status: 'ACTIVE' })));
        await db('vsq_variant_prices').insert(ids.map((i) => ({ price_list_id: priceList.id, variant_id: i, amount: i })));
        await db('vsq_collection_products').insert(ids.map((i) => ({ collection_id: allCollection.id, product_id: i })));
        const menIds = ids.filter((i) => i <= 120);
        if (menIds.length) {
          await db('vsq_collection_products').insert(menIds.map((i) => ({ collection_id: menCollection.id, product_id: i })));
          await db('vsq_product_categories').insert(menIds.map((i) => ({ category_id: men.id, product_id: i })));
          await db('vsq_product_categories').insert(menIds.map((i) => ({ category_id: shirts.id, product_id: i })));
        }
      }
    }
    await seed(1, 101);
    const first101 = await Catalog.listProducts({ page: 2, limit: 100 });
    assert.equal(first101.pagination.total, 101);
    assert.equal(first101.products.length, 1);
    assert.equal(first101.products[0].slug, 'catalog-item-1');
    await seed(102, 250);
    await db('vsq_variant_prices').where({ variant_id: 101, price_list_id: priceList.id }).update({ amount: 100 });
    for (const [name, value] of [['Color', 'Ceruleanneedle'], ['Size', 'XXLneedle']]) {
      const [optionId] = await db('vsq_product_options').insert({ product_id: 1, name, position: name === 'Color' ? 0 : 1 });
      await db('vsq_product_option_values').insert({ product_option_id: optionId, value });
    }
    const pages = await Promise.all([1, 2, 3].map((page) => Catalog.listProducts({ page, limit: 100 })));
    assert.deepEqual(pages.map((result) => result.products.length), [100, 100, 50]);
    assert.ok(pages.every((result) => result.pagination.total === 250));
    const slugs = pages.flatMap((result) => result.products.map((product) => product.slug));
    assert.equal(new Set(slugs).size, 250);
    assert.equal(slugs.at(-1), 'catalog-item-1');
    for (const term of ['Needle title', 'fabricneedle', 'tagneedle', 'Ceruleanneedle', 'XXLneedle']) {
      const result = await Catalog.listProducts({ search: term });
      assert.equal(result.pagination.total, 1, term);
      assert.ok(Number(result.products[0].id) <= 5, term);
    }
    assert.equal((await Catalog.listProducts({ search: 'T-Shirts' })).pagination.total, 120);
    const byColor = await Catalog.listProducts({ colors: 'Ceruleanneedle' });
    const bySize = await Catalog.listProducts({ sizes: 'XXLneedle' });
    assert.equal(byColor.products[0].slug, 'catalog-item-1');
    assert.equal(bySize.products[0].slug, 'catalog-item-1');
    assert.ok(byColor.facets.colors.includes('Ceruleanneedle'));
    const byCategory = await Catalog.listProducts({ category: 'men', category_names: 'T-Shirts', page: 2, limit: 100 });
    const byCollection = await Catalog.listProducts({ collection: 'mens-collection', page: 2, limit: 100 });
    assert.equal(byCategory.pagination.total, 120);
    assert.equal(byCollection.pagination.total, 120);
    assert.equal(byCategory.products.length, 20);
    assert.equal(byCollection.products.length, 20);
    assert.ok(byCollection.products.some((product) => product.slug === 'catalog-item-1'));
    const byPrice = await Catalog.listProducts({ prices: '0-200' });
    assert.equal(byPrice.pagination.total, 200);
    const lowPages = await Promise.all([1, 2, 3].map((page) => Catalog.listProducts({ page, limit: 100, sort: 'price_low_high' })));
    const highPages = await Promise.all([1, 2, 3].map((page) => Catalog.listProducts({ page, limit: 100, sort: 'price_high_low' })));
    assert.equal(new Set(lowPages.flatMap((result) => result.products.map((product) => product.slug))).size, 250);
    assert.equal(new Set(highPages.flatMap((result) => result.products.map((product) => product.slug))).size, 250);
    assert.equal(lowPages[0].products[0].price, 1);
    assert.equal(lowPages[0].products.at(-1).slug, 'catalog-item-101');
    assert.equal(lowPages[1].products[0].slug, 'catalog-item-100');
    assert.equal(highPages[0].products[0].price, 250);
    const last = await Catalog.productBySlug('catalog-item-1');
    assert.equal((await Catalog.productByPublicId(last.public_id)).slug, 'catalog-item-1');
    const related = await Catalog.relatedProducts(last.public_id);
    assert.equal(related.length, 4);
    assert.ok(related.every((product) => product.slug !== 'catalog-item-1'));
    assert.ok(related.every((product) => product.categories.some((category) => category.slug === 'men')));
    const sitemapPages = await Promise.all([1, 2, 3].map((page) => Catalog.sitemapProducts(page, 100)));
    assert.deepEqual(sitemapPages.map((result) => result.products.length), [100, 100, 50]);
    assert.equal(new Set(sitemapPages.flatMap((result) => result.products.map((product) => product.slug))).size, 250);
    const app = express();
    app.use('/front/v1/commerce/catalog', require('../dist/modules/commerce/catalog/route').default);
    server = app.listen(0, '127.0.0.1');
    await new Promise((resolve) => server.once('listening', resolve));
    const base = `http://127.0.0.1:${server.address().port}/front/v1/commerce/catalog`;
    async function get(route) {
      const response = await fetch(`${base}${route}`);
      assert.equal(response.status, 200, route);
      return (await response.json()).data;
    }
    const filteredRoute = await get('/products?collection=mens-collection&category_name=T-Shirts&size=XXLneedle&page=1');
    assert.equal(filteredRoute.pagination.total, 1);
    assert.equal(filteredRoute.products[0].slug, 'catalog-item-1');
    assert.equal((await get('/products/by-id/' + last.public_id)).product.slug, 'catalog-item-1');
    assert.equal((await get('/products/related/' + last.public_id)).products.length, 4);
    assert.equal((await get('/products/sitemap?page=3&limit=100')).products.length, 50);
  } finally {
    if (server) await new Promise((resolve) => server.close(resolve));
    if (db) await db.destroy();
    await admin.query(`DROP DATABASE IF EXISTS \`${name}\``);
    await admin.end();
  }
});
