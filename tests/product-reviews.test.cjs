const { test } = require('node:test');
const assert = require('node:assert/strict');
const knex = require('knex');
const policy = require('../dist/modules/commerce/reviews/policy');
const Service = require('../dist/modules/commerce/reviews/service').default;
const Database = require('../dist/loaders/knex').default;

const row = {
  id: 10, public_id: 'review-id', product_id: 20, customer_id: 30, order_item_id: 40,
  reviewer_name: 'Asha K.', rating: 4, title: 'Lovely fabric', body: 'Comfortable fabric and a good fit.',
  verified_purchase: 1, status: 'PUBLISHED', version: 4,
  created_at: '2026-09-22T10:00:00Z', published_at: null, moderation_note: 'Internal only'
};

// Exercise real Knex SQL generation and service transactions with an in-memory
// transport. No connection credentials, database mutations or network are used.
async function withDatabase(respond, run) {
  const db = knex({ client: 'mysql2' });
  const queries = [];
  const connection = {};
  db.client.acquireConnection = async () => connection;
  db.client.releaseConnection = async () => undefined;
  const clientPrototype = Object.getPrototypeOf(db.client);
  const originalQuery = clientPrototype._query;
  const ownedQuery = Object.hasOwn(clientPrototype, '_query');
  clientPrototype._query = async (_connection, query) => {
    queries.push({ sql: query.sql, bindings: query.bindings || [], method: query.method });
    const result = await respond(query);
    query.response = [result ?? (['insert', 'update'].includes(query.method) ? { insertId: 10, affectedRows: 1 } : []), []];
    return query;
  };
  const original = Database.connect;
  Database.connect = () => db;
  try { await run(queries, db); }
  finally {
    Database.connect = original;
    if (ownedQuery) clientPrototype._query = originalQuery;
    else delete clientPrototype._query;
    await db.destroy();
  }
}

test('accepts bounded plain-text reviews and rejects invalid ratings/content', () => {
  assert.deepEqual(policy.reviewInput({ rating: 5, title: ' Nice ', body: ' Really comfortable. ' }), { rating: 5, title: 'Nice', body: 'Really comfortable.' });
  for (const rating of [0, 6, 2.5, '5', true, null]) assert.throws(() => policy.reviewInput({ rating, body: row.body }), { statusCode: 400 });
  for (const body of ['short', '<script>alert(1)</script>', 'x'.repeat(2001), null]) assert.throws(() => policy.reviewInput({ rating: 4, body }), { statusCode: 400 });
  assert.throws(() => policy.reviewInput({ rating: 4, title: 'x'.repeat(121), body: row.body }), { statusCode: 400 });
});

test('public serializer never returns customer/order IDs or moderation data', () => {
  assert.deepEqual(Object.keys(policy.publicReview(row)).sort(), ['body', 'created_at', 'public_id', 'rating', 'reviewer_name', 'title', 'verified_purchase'].sort());
  assert.equal(policy.reviewerName('Asha Priya', 'Kumar'), 'Asha K.');
  assert.equal(policy.reviewerName(null, null), 'Customer');
});

test('empty ratings have no invented average and distribution is complete', () => {
  assert.equal(policy.ratingSummary([]).average, null);
  const summary = policy.ratingSummary([{ rating: '5', count: '3' }, { rating: 4, count: 2 }]);
  assert.equal(summary.count, 5);
  assert.equal(summary.average, 4.6);
  assert.equal(summary.distribution.length, 5);
});

test('public listing filters every review query to published rows, with bounded pagination and stable order', async () => {
  await withDatabase((query) => {
    if (query.sql.includes('`vsq_products`')) return [{ id: 20 }];
    if (query.sql.includes('group by')) return [{ rating: 4, count: 1 }, { rating: 5, count: 3 }];
    if (query.sql.includes('count(*)')) return [{ count: 1 }];
    if (query.method === 'select') return [row];
  }, async (queries) => {
    const result = await Service.list('product-id', 1, 5, 'highest', 4);
    assert.equal(result.summary.count, 4);
    assert.equal(result.pagination.total, 1);
    assert.equal(result.reviews[0].customer_id, undefined);
    const reviewQueries = queries.filter((query) => query.sql.includes('`vsq_product_reviews`'));
    assert.equal(reviewQueries.length, 3);
    reviewQueries.forEach((query) => assert.ok(query.bindings.includes('PUBLISHED')));
    assert.ok(queries.some((query) => query.sql.includes('`published_at` is not null')));
    assert.ok(reviewQueries.some((query) => query.sql.includes('`rating` desc, `created_at` desc, `id` desc limit ?')));
  });
});

test('own review lookup is scoped to the authenticated customer', async () => {
  await withDatabase((query) => {
    if (query.sql.includes('`vsq_customers`')) return [{ id: 30 }];
    if (query.sql.includes('`vsq_products`')) return [{ id: 20 }];
    if (query.sql.includes('`vsq_product_reviews`')) return [{ ...row, status: 'PENDING' }];
  }, async (queries) => {
    assert.equal((await Service.mine('product-id', 30)).review.status, 'PENDING');
    const query = queries.find((item) => item.sql.includes('`vsq_product_reviews`'));
    assert.match(query.sql, /`customer_id` = \?/);
    assert.ok(query.bindings.includes(30));
  });
});

test('submission is pending and purchase verification is derived from paid orders, not input flags', async () => {
  await withDatabase((query) => {
    if (query.sql.includes('`vsq_customers`')) return [{ id: 30, first_name: 'Asha', last_name: 'Kumar' }];
    if (query.sql.includes('`vsq_products`')) return [{ id: 20 }];
    if (query.sql.includes('count(*)')) return [{ count: 0 }];
    if (query.sql.includes('`vsq_order_items`')) return []; // No purchase.
    if (query.method === 'first' && query.sql.includes('`public_id`')) return [{ ...row, status: 'PENDING', verified_purchase: 0 }];
  }, async (queries) => {
    const result = await Service.create('product-id', 30, { rating: 4, title: row.title, body: row.body, verified_purchase: true, status: 'PUBLISHED', customer_id: 999 });
    assert.equal(result.review.status, 'PENDING');
    assert.equal(result.review.verified_purchase, false);
    const insert = queries.find((query) => query.method === 'insert');
    assert.ok(insert.bindings.includes('PENDING'));
    assert.ok(!insert.bindings.includes('PUBLISHED'));
    assert.ok(!insert.bindings.includes(999));
    const purchase = queries.find((query) => query.sql.includes('`vsq_order_items`'));
    assert.match(purchase.sql, /`ord`.`paid_at` is not null/);
    assert.match(purchase.sql, /`ord`.`cancelled_at` is null/);
    assert.ok(purchase.bindings.includes(30));
    assert.ok(queries.some((query) => query.sql.includes('`vsq_customers`') && query.sql.endsWith('for update')));
  });
});

test('duplicate review is rejected without inserting another row', async () => {
  await withDatabase((query) => {
    if (query.sql.includes('`vsq_customers`')) return [{ id: 30 }];
    if (query.sql.includes('`vsq_products`')) return [{ id: 20 }];
    if (query.sql.includes('`vsq_product_reviews`')) return [{ id: 10 }];
  }, async (queries) => {
    await assert.rejects(Service.create('product-id', 30, { rating: 4, body: row.body }), { statusCode: 409 });
    assert.ok(!queries.some((query) => query.method === 'insert'));
  });
});

test('rate limit applies before inserting a sixth review in an hour', async () => {
  await withDatabase((query) => {
    if (query.sql.includes('`vsq_customers`')) return [{ id: 30 }];
    if (query.sql.includes('`vsq_products`')) return [{ id: 20 }];
    if (query.sql.includes('count(*)')) return [{ count: 5 }];
  }, async (queries) => {
    await assert.rejects(Service.create('product-id', 30, { rating: 4, body: row.body }), { statusCode: 429 });
    assert.ok(!queries.some((query) => query.method === 'insert'));
  });
});

test('stale moderation cannot overwrite a newer decision', async () => {
  await withDatabase((query) => query.method === 'first' ? [row] : undefined, async (queries) => {
    await assert.rejects(Service.moderate('review-id', 1, { status: 'REJECTED', version: 3 }), { statusCode: 409 });
    assert.ok(!queries.some((query) => query.method === 'update'));
  });
});

test('moderation updates and audit entry share the same transaction', async () => {
  await withDatabase((query) => query.method === 'first' ? [row] : undefined, async (queries) => {
    const result = await Service.moderate('review-id', 1, { status: 'REJECTED', version: 4, note: 'Contains personal information' });
    assert.equal(result.version, 5);
    assert.ok(queries.some((query) => query.method === 'update' && query.bindings.includes('REJECTED')));
    assert.ok(queries.some((query) => query.sql.includes('insert into `vsq_commerce_audit_logs`')));
    assert.match(queries.at(-1).sql, /COMMIT/i);
  });
});

test('migration contains unique ownership, rating bounds and foreign keys', async () => {
  await withDatabase(() => undefined, async (queries, db) => {
    await require('../dist/db-migrations/20260922120000_vsq_product_reviews').up(db);
    const sql = queries.map((query) => query.sql).join('\n');
    assert.match(sql, /vsq_review_product_customer_uq/);
    assert.match(sql, /rating.*BETWEEN 1 AND 5/);
    assert.match(sql, /references `vsq_customers`/);
    assert.match(sql, /references `vsq_products`/);
  });
});

function routeRequest(router, method, url, options = {}) {
  return new Promise((resolve, reject) => {
    const req = { method, url, originalUrl: url, headers: {}, query: {}, body: {}, ...options };
    const res = { statusCode: 200, setHeader() {}, status(code) { this.statusCode = code; return this; }, json(body) { resolve({ status: this.statusCode, body }); return this; } };
    router.handle(req, res, (error) => error ? reject(error) : resolve({ status: 404 }));
  });
}

test('anonymous review submissions and own-review reads require authentication', async () => {
  const router = require('../dist/modules/commerce/reviews/route').default;
  const id = '104ed652-900e-442d-8e22-577f9449c176';
  assert.equal((await routeRequest(router, 'POST', `/products/${id}`)).status, 401);
  assert.equal((await routeRequest(router, 'GET', `/products/${id}/mine`)).status, 401);
});

test('public review query validation rejects invalid IDs, page sizes and sorts before DB access', async () => {
  const router = require('../dist/modules/commerce/reviews/route').default;
  const url = '/products/104ed652-900e-442d-8e22-577f9449c176';
  assert.equal((await routeRequest(router, 'GET', '/products/not-a-uuid')).status, 400);
  assert.equal((await routeRequest(router, 'GET', url, { query: { limit: '1000' } })).status, 400);
  assert.equal((await routeRequest(router, 'GET', url, { query: { sort: 'sql-injection' } })).status, 400);
  assert.equal((await routeRequest(router, 'GET', url, { query: { rating: '6' } })).status, 400);
});

test('moderation endpoints reject missing and non-admin identities', async () => {
  const router = require('../dist/modules/commerce/reviews/admin-route').default;
  assert.equal((await routeRequest(router, 'GET', '/')).status, 403);
  assert.equal((await routeRequest(router, 'PATCH', '/104ed652-900e-442d-8e22-577f9449c176', { user: { id: 9, user_type: 'CUSTOMER' } })).status, 403);
});
