const { test } = require('node:test');
const assert = require('node:assert/strict');
const knex = require('knex');
const sharp = require('sharp');
const { S3Client } = require('@aws-sdk/client-s3');
const { createPresignedPost } = require('@aws-sdk/s3-presigned-post');
const { randomUUID } = require('node:crypto');
const policy = require('../dist/modules/commerce/reviews/policy');
const uploadPolicy = require('../dist/modules/commerce/reviews/upload-policy');
const Service = require('../dist/modules/commerce/reviews/service').default;
const Database = require('../dist/loaders/knex').default;
const S3Service = require('../dist/lib/S3Service').default;

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

test('review presign request enforces type and per-file byte limits', () => {
  assert.deepEqual(uploadPolicy.reviewUploadRequest({ kind: 'VIDEO', mime_type: 'video/mp4', byte_size: 1024 }), { kind: 'VIDEO', mimeType: 'video/mp4', byteSize: 1024 });
  assert.throws(() => uploadPolicy.reviewUploadRequest({ kind: 'IMAGE', mime_type: 'image/jpeg', byte_size: uploadPolicy.MAX_REVIEW_IMAGE_BYTES + 1 }), { statusCode: 413 });
  assert.throws(() => uploadPolicy.reviewUploadRequest({ kind: 'VIDEO', mime_type: 'video/mp4', byte_size: uploadPolicy.MAX_REVIEW_VIDEO_BYTES + 1 }), { statusCode: 413 });
  assert.throws(() => uploadPolicy.reviewUploadRequest({ kind: 'VIDEO', mime_type: 'text/html', byte_size: 1024 }), { statusCode: 400 });
  assert.throws(() => uploadPolicy.reviewUploadRequest({ kind: 'IMAGE', mime_type: 'image/jpeg', byte_size: '1024' }), { statusCode: 413 });
  assert.throws(() => uploadPolicy.reviewUploadIds(Array.from({ length: 5 }, () => randomUUID())), { statusCode: 400 });
  const id = randomUUID();
  assert.throws(() => uploadPolicy.reviewUploadIds([id, id]), { statusCode: 400 });
});

test('S3 POST policy can lock the exact object key, MIME type and byte count', async () => {
  const client = new S3Client({ region: 'ap-south-1', credentials: { accessKeyId: 'example', secretAccessKey: 'example' } });
  try {
    const post = await createPresignedPost(client, {
      Bucket: 'example-bucket', Key: 'commerce/review-staging/test-id',
      Fields: { 'Content-Type': 'video/mp4' }, Conditions: [['content-length-range', 1024, 1024]], Expires: 600
    });
    const policy = JSON.parse(Buffer.from(post.fields.Policy, 'base64').toString('utf8'));
    assert.ok(policy.conditions.some((item) => item.key === 'commerce/review-staging/test-id'));
    assert.ok(policy.conditions.some((item) => item['Content-Type'] === 'video/mp4'));
    assert.ok(policy.conditions.some((item) => JSON.stringify(item) === JSON.stringify(['content-length-range', 1024, 1024])));
  } finally { client.destroy(); }
});

test('review images are normalized to WebP and non-video bytes are rejected', async () => {
  const imageBuffer = await sharp({ create: { width: 12, height: 12, channels: 3, background: '#c7a17d' } }).jpeg().toBuffer();
  const normalized = await uploadPolicy.normalizeReviewImage(imageBuffer, 'image/jpeg');
  assert.equal((await sharp(normalized).metadata()).format, 'webp');
  await assert.rejects(uploadPolicy.normalizeReviewImage(imageBuffer, 'image/png'), { statusCode: 422 });
  assert.equal(uploadPolicy.videoMimeFromHeader(Buffer.from('this is not a video')), null);
  assert.equal(uploadPolicy.videoMimeFromHeader(Buffer.from([0x1a, 0x45, 0xdf, 0xa3])), 'video/webm');
});

test('admin video thumbnails are bounded, validated and converted to WebP', async () => {
  assert.deepEqual(uploadPolicy.reviewThumbnailRequest({ mime_type: 'image/jpeg', byte_size: 2048 }), { mimeType: 'image/jpeg', byteSize: 2048 });
  assert.throws(() => uploadPolicy.reviewThumbnailRequest({ mime_type: 'video/mp4', byte_size: 2048 }), { statusCode: 400 });
  assert.throws(() => uploadPolicy.reviewThumbnailRequest({ mime_type: 'image/jpeg', byte_size: uploadPolicy.MAX_REVIEW_THUMBNAIL_BYTES + 1 }), { statusCode: 413 });
  const image = await sharp({ create: { width: 24, height: 16, channels: 3, background: '#a68668' } }).jpeg().toBuffer();
  const output = await uploadPolicy.normalizeReviewThumbnail(image, 'image/jpeg');
  assert.equal((await sharp(output).metadata()).format, 'webp');
  await assert.rejects(uploadPolicy.normalizeReviewThumbnail(image, 'image/png'), { statusCode: 422 });
});

test('public listing filters every review query to published rows, with bounded pagination and stable order', async () => {
  await withDatabase((query) => {
    if (query.sql.includes('`vsq_products`')) return [{ id: 20 }];
    if (query.sql.includes('`vsq_product_review_media`')) return [{ id: 21, review_id: 10, kind: 'VIDEO', public_url: 'https://example.invalid/review.mp4', thumbnail_url: 'https://example.invalid/thumb.webp', mime_type: 'video/mp4', byte_size: 1234, position: 1, object_key: 'private-key' }];
    if (query.sql.includes('group by')) return [{ rating: 4, count: 1 }, { rating: 5, count: 3 }];
    if (query.sql.includes('count(*)')) return [{ count: 1 }];
    if (query.method === 'select') return [row];
  }, async (queries) => {
    const result = await Service.list('product-id', 1, 5, 'highest', 4);
    assert.equal(result.summary.count, 4);
    assert.equal(result.pagination.total, 1);
    assert.equal(result.reviews[0].customer_id, undefined);
    assert.equal(result.reviews[0].media[0].url, 'https://example.invalid/review.mp4');
    assert.equal(result.reviews[0].media[0].thumbnail_url, 'https://example.invalid/thumb.webp');
    assert.equal(result.reviews[0].media[0].id, undefined);
    assert.equal(result.reviews[0].media[0].object_key, undefined);
    const reviewQueries = queries.filter((query) => query.sql.includes('`vsq_product_reviews`'));
    assert.equal(reviewQueries.length, 3);
    reviewQueries.forEach((query) => {
      assert.ok(query.bindings.includes('PUBLISHED'));
      assert.match(query.sql, /`verified_purchase` = \?/);
      assert.ok(query.bindings.includes(true));
    });
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
    const result = await Service.mine('product-id', 30);
    assert.equal(result.review.status, 'PENDING');
    assert.equal(result.can_review, false);
    assert.equal(result.reason, 'ALREADY_REVIEWED');
    const query = queries.find((item) => item.sql.includes('`vsq_product_reviews`'));
    assert.match(query.sql, /`customer_id` = \?/);
    assert.ok(query.bindings.includes(30));
  });
});

test('admin moderation list includes attachment previews without leaking database IDs', async () => {
  await withDatabase((query) => {
    if (query.sql.includes('`vsq_product_review_media`')) return [{ id: 21, review_id: 10, kind: 'VIDEO', public_url: 'https://example.invalid/review.mp4', thumbnail_url: 'https://example.invalid/thumb.webp', mime_type: 'video/mp4', byte_size: 1234, position: 1 }];
    if (query.sql.includes('count(*)')) return [{ count: 1 }];
    if (query.method === 'select') return [{ ...row, product_public_id: 'product-id', product_title: 'Shirt' }];
  }, async () => {
    const result = await Service.adminList(1, 20, 'PENDING');
    assert.equal(result.reviews[0].media[0].kind, 'VIDEO');
    assert.equal(result.reviews[0].media[0].id, 21);
    assert.equal(result.reviews[0].media[0].thumbnail_url, 'https://example.invalid/thumb.webp');
    assert.equal(result.reviews[0].id, undefined);
    assert.equal(result.reviews[0].media[0].review_id, undefined);
  });
});

test('admin thumbnail presign is scoped to an existing review video', async () => {
  const original = S3Service.presignReviewPost;
  S3Service.presignReviewPost = async (name) => ({ key: name, url: 'https://example.invalid/upload', fields: { key: name } });
  try {
    await withDatabase((query) => {
      if (query.sql.includes('`vsq_product_review_media` as `media`')) return [{ id: 21, review_id: 10 }];
      if (query.sql.includes('count(*)')) return [{ count: 0 }];
    }, async (queries) => {
      const result = await Service.presignThumbnail('review-id', 21, 1, { mime_type: 'image/jpeg', byte_size: 2048 });
      assert.equal(result.url, 'https://example.invalid/upload');
      assert.ok(queries.some((query) => query.sql.includes('insert into `vsq_product_review_thumbnail_uploads`')));
      assert.ok(queries.some((query) => query.bindings.includes('VIDEO')));
    });
  } finally { S3Service.presignReviewPost = original; }
});

test('admin thumbnail selection validates S3 bytes and audits the media update', async () => {
  const image = await sharp({ create: { width: 24, height: 16, channels: 3, background: '#a68668' } }).jpeg().toBuffer();
  const original = {
    headObject: S3Service.headObject, readObject: S3Service.readObject, uploadBuffer: S3Service.uploadBuffer,
    deleteObject: S3Service.deleteObject, deletePublicObject: S3Service.deletePublicObject,
    deleteUploadedObject: S3Service.deleteUploadedObject
  };
  S3Service.headObject = async () => ({ ContentLength: image.length, ContentType: 'image/jpeg', ETag: 'etag' });
  S3Service.readObject = async () => image;
  S3Service.uploadBuffer = async () => ({ key: 'commerce/reviews/review-id/thumbnails/21.webp', url: 'https://example.invalid/21.webp' });
  S3Service.deleteObject = async () => {};
  S3Service.deletePublicObject = async () => {};
  S3Service.deleteUploadedObject = async () => {};
  try {
    await withDatabase((query) => {
      if (query.sql.includes('`vsq_product_review_thumbnail_uploads`') && query.method === 'first') {
        return [{ id: 2, public_id: 'upload-id', review_id: 10, media_id: 21, admin_id: 1, object_key: 'staging/upload-id', mime_type: 'image/jpeg', expected_byte_size: image.length, expires_at: new Date(Date.now() + 60000), consumed_at: null }];
      }
      if (query.sql.includes('`vsq_product_review_media` as `media`')) return [{ id: 21, review_id: 10 }];
      if (query.sql.includes('`vsq_product_review_media`') && query.method === 'first') return [{ thumbnail_object_key: null }];
    }, async (queries) => {
      const result = await Service.saveThumbnail('review-id', 21, 1, 'upload-id');
      assert.equal(result.thumbnail_url, 'https://example.invalid/21.webp');
      assert.ok(queries.some((query) => query.method === 'update' && query.sql.includes('`vsq_product_review_media`')));
      assert.ok(queries.some((query) => query.method === 'update' && query.sql.includes('`vsq_product_review_thumbnail_uploads`')));
      assert.ok(queries.some((query) => query.sql.includes('insert into `vsq_commerce_audit_logs`')));
    });
  } finally { Object.assign(S3Service, original); }
});

test('direct admin thumbnail upload validates bytes, stores WebP and audits replacement', async () => {
  const image = await sharp({ create: { width: 24, height: 16, channels: 3, background: '#a68668' } }).jpeg().toBuffer();
  const original = {
    uploadBuffer: S3Service.uploadBuffer,
    deletePublicObject: S3Service.deletePublicObject,
    deleteUploadedObject: S3Service.deleteUploadedObject
  };
  let uploadedType;
  S3Service.uploadBuffer = async (buffer, _name, type) => {
    uploadedType = type;
    assert.equal((await sharp(buffer).metadata()).format, 'webp');
    return { key: 'commerce/reviews/review-id/thumbnails/21.webp', url: 'https://example.invalid/21.webp' };
  };
  S3Service.deletePublicObject = async () => {};
  S3Service.deleteUploadedObject = async () => {};
  try {
    await withDatabase((query) => {
      if (query.sql.includes('`vsq_product_review_media` as `media`')) return [{ id: 21, review_id: 10 }];
      if (query.sql.includes('count(*)')) return [{ count: 0 }];
      if (query.sql.includes('`vsq_product_review_media`') && query.method === 'first') return [{ thumbnail_object_key: 'old-thumbnail.webp' }];
    }, async (queries) => {
      const result = await Service.saveThumbnailFile('review-id', 21, 1, { buffer: image, mimetype: 'image/jpeg' });
      assert.equal(result.thumbnail_url, 'https://example.invalid/21.webp');
      assert.equal(uploadedType, 'image/webp');
      assert.ok(queries.some((query) => query.method === 'update' && query.sql.includes('`vsq_product_review_media`')));
      assert.ok(queries.some((query) => query.sql.includes('insert into `vsq_commerce_audit_logs`')));
    });
    await assert.rejects(Service.saveThumbnailFile('review-id', 21, 1, { buffer: image, mimetype: 'video/mp4' }), { statusCode: 400 });
  } finally { Object.assign(S3Service, original); }
});

test('submission is pending and purchase verification is derived from paid orders, not input flags', async () => {
  await withDatabase((query) => {
    if (query.sql.includes('`vsq_customers`')) return [{ id: 30, first_name: 'Asha', last_name: 'Kumar' }];
    if (query.sql.includes('`vsq_products`')) return [{ id: 20 }];
    if (query.sql.includes('count(*)')) return [{ count: 0 }];
    if (query.sql.includes('`vsq_order_items`')) return [{ id: 40 }];
    if (query.method === 'first' && query.sql.includes('`public_id`')) return [{ ...row, status: 'PENDING' }];
  }, async (queries) => {
    const result = await Service.create('product-id', 30, { rating: 4, title: row.title, body: row.body, verified_purchase: true, status: 'PUBLISHED', customer_id: 999 });
    assert.equal(result.review.status, 'PENDING');
    assert.equal(result.review.verified_purchase, true);
    const insert = queries.find((query) => query.method === 'insert');
    assert.ok(insert.bindings.includes('PENDING'));
    assert.ok(!insert.bindings.includes('PUBLISHED'));
    assert.ok(!insert.bindings.includes(999));
    assert.ok(insert.bindings.includes(40));
    const purchase = queries.find((query) => query.sql.includes('`vsq_order_items`'));
    assert.match(purchase.sql, /`ord`.`paid_at` is not null/);
    assert.match(purchase.sql, /`ord`.`cancelled_at` is null/);
    assert.ok(purchase.bindings.includes(30));
    assert.ok(purchase.bindings.includes(20));
    assert.match(purchase.sql, /`variant`.`product_id` = \?/);
    assert.match(purchase.sql, /`ord`.`financial_status` in/);
    assert.ok(queries.some((query) => query.sql.includes('`vsq_customers`') && query.sql.endsWith('for update')));
  });
});

test('non-buyers cannot bypass verification by submitting forged order or verification fields', async () => {
  await withDatabase((query) => {
    if (query.sql.includes('`vsq_customers`')) return [{ id: 30 }];
    if (query.sql.includes('`vsq_products`')) return [{ id: 20 }];
    if (query.sql.includes('count(*)')) return [{ count: 0 }];
  }, async (queries) => {
    await assert.rejects(Service.create('product-id', 30, { rating: 5, body: row.body, verified_purchase: true, order_item_id: 40, customer_id: 999 }), { statusCode: 403 });
    assert.ok(!queries.some((query) => query.method === 'insert'));
    assert.match(queries.at(-1).sql, /ROLLBACK/i);
  });
});

test('non-buyers cannot obtain S3 upload permission', async () => {
  await withDatabase((query) => {
    if (query.sql.includes('`vsq_customers`')) return [{ id: 30 }];
    if (query.sql.includes('`vsq_products`')) return [{ id: 20 }];
  }, async (queries) => {
    await assert.rejects(Service.presignUpload('product-id', 30, { kind: 'VIDEO', mime_type: 'video/mp4', byte_size: 1024 }), { statusCode: 403 });
    assert.ok(queries.some((query) => query.sql.includes('`vsq_order_items`')));
    assert.ok(!queries.some((query) => query.method === 'insert'));
  });
});

test('a buyer cannot attach an unissued or another customer\'s S3 upload', async () => {
  const forgedId = randomUUID();
  await withDatabase((query) => {
    if (query.sql.includes('`vsq_customers`')) return [{ id: 30 }];
    if (query.sql.includes('`vsq_products`')) return [{ id: 20 }];
    if (query.sql.includes('`vsq_order_items`')) return [{ id: 40 }];
    if (query.sql.includes('`vsq_product_review_uploads`')) return [];
  }, async (queries) => {
    await assert.rejects(Service.create('product-id', 30, { rating: 5, body: row.body, upload_ids: [forgedId] }), { statusCode: 409 });
    assert.ok(!queries.some((query) => query.method === 'insert'));
    const lookup = queries.find((query) => query.sql.includes('`vsq_product_review_uploads`'));
    assert.ok(lookup.bindings.includes(30));
    assert.ok(lookup.bindings.includes(20));
  });
});

for (const purchased of [true, false]) {
  test(`eligibility endpoint reports ${purchased ? 'eligible buyer' : 'purchase required'} without exposing order IDs`, async () => {
    await withDatabase((query) => {
      if (query.sql.includes('`vsq_customers`')) return [{ id: 30 }];
      if (query.sql.includes('`vsq_products`')) return [{ id: 20 }];
      if (query.sql.includes('`vsq_order_items`')) return purchased ? [{ id: 40 }] : [];
    }, async () => {
      assert.deepEqual(await Service.mine('product-id', 30), {
        review: null, can_review: purchased, reason: purchased ? null : 'VERIFIED_PURCHASE_REQUIRED'
      });
    });
  });
}

test('administrators cannot publish legacy unverified reviews', async () => {
  await withDatabase((query) => query.method === 'first' ? [{ ...row, verified_purchase: 0 }] : undefined, async (queries) => {
    await assert.rejects(Service.moderate('review-id', 1, { status: 'PUBLISHED', version: 4 }), { statusCode: 403 });
    assert.ok(!queries.some((query) => ['insert', 'update'].includes(query.method)));
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

test('review media migration keeps files tied to reviews with stable positions', async () => {
  await withDatabase(() => undefined, async (queries, db) => {
    await require('../dist/db-migrations/20260922130000_vsq_product_review_media').up(db);
    const sql = queries.map((query) => query.sql).join('\n');
    assert.match(sql, /vsq_review_media_review_fk/);
    assert.match(sql, /vsq_review_media_position_uq/);
    assert.match(sql, /references `vsq_product_reviews`/);
  });
});

test('staged review uploads have ownership, expiry and one-time consumption fields', async () => {
  await withDatabase(() => undefined, async (queries, db) => {
    await require('../dist/db-migrations/20260922140000_vsq_product_review_uploads').up(db);
    const sql = queries.map((query) => query.sql).join('\n');
    assert.match(sql, /vsq_review_upload_customer_fk/);
    assert.match(sql, /vsq_review_upload_product_fk/);
    assert.match(sql, /consumed_at/);
    assert.match(sql, /expires_at/);
  });
});

test('video thumbnail migration adds an admin-scoped, one-time upload grant', async () => {
  await withDatabase(() => undefined, async (queries, db) => {
    await require('../dist/db-migrations/20260922150000_vsq_review_video_thumbnails').up(db);
    const sql = queries.map((query) => query.sql).join('\n');
    assert.match(sql, /thumbnail_object_key/);
    assert.match(sql, /thumbnail_url/);
    assert.match(sql, /admin_id/);
    assert.match(sql, /consumed_at/);
    assert.match(sql, /vsq_review_thumb_media_fk/);
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
  const reviewId = '104ed652-900e-442d-8e22-577f9449c176';
  assert.equal((await routeRequest(router, 'GET', '/')).status, 403);
  assert.equal((await routeRequest(router, 'PATCH', `/${reviewId}`, { user: { id: 9, user_type: 'CUSTOMER' } })).status, 403);
  assert.equal((await routeRequest(router, 'POST', `/${reviewId}/media/1/thumbnail-upload`, { user: { id: 9, user_type: 'CUSTOMER' } })).status, 403);
  assert.equal((await routeRequest(router, 'POST', `/${reviewId}/media/1/thumbnail`, { user: { id: 9, user_type: 'CUSTOMER' } })).status, 403);
  assert.equal((await routeRequest(router, 'POST', `/${reviewId}/media/1/thumbnail-file`, { user: { id: 9, user_type: 'CUSTOMER' } })).status, 403);
  assert.equal((await routeRequest(router, 'POST', `/${reviewId}/media/1/thumbnail-upload`, { user: { id: 1, user_type: 'ADMIN' }, body: { mime_type: 'video/mp4', byte_size: 100 } })).status, 400);
  assert.equal((await routeRequest(router, 'POST', `/${reviewId}/media/1/thumbnail`, { user: { id: 1, user_type: 'ADMIN' }, body: { upload_id: 'not-a-uuid' } })).status, 400);
});

test('direct thumbnail route accepts one multipart file and rejects files over 1 MB', async () => {
  const express = require('express');
  const router = require('../dist/modules/commerce/reviews/admin-route').default;
  const original = Service.saveThumbnailFile;
  Service.saveThumbnailFile = async (_reviewId, _mediaId, _adminId, file) => {
    assert.equal(file.mimetype, 'image/jpeg');
    return { media_id: 21, thumbnail_url: 'https://example.invalid/thumb.webp', thumbnail_byte_size: file.buffer.length };
  };
  const app = express();
  app.use((req, _res, next) => { req.user = { id: 1, user_type: 'ADMIN' }; next(); });
  app.use(router);
  const server = await new Promise((resolve, reject) => {
    const listening = app.listen(0, '127.0.0.1');
    listening.once('listening', () => resolve(listening));
    listening.once('error', reject);
  });
  try {
    const url = `http://127.0.0.1:${server.address().port}/104ed652-900e-442d-8e22-577f9449c176/media/21/thumbnail-file`;
    const valid = new FormData();
    valid.append('file', new Blob([Buffer.from([0xff, 0xd8, 0xff])], { type: 'image/jpeg' }), 'frame.jpg');
    const accepted = await fetch(url, { method: 'POST', body: valid });
    assert.equal(accepted.status, 200);
    assert.equal((await accepted.json()).data.media_id, 21);

    const oversized = new FormData();
    oversized.append('file', new Blob([Buffer.alloc(1024 * 1024 + 1)], { type: 'image/jpeg' }), 'large.jpg');
    const rejected = await fetch(url, { method: 'POST', body: oversized });
    assert.equal(rejected.status, 413);
  } finally {
    Service.saveThumbnailFile = original;
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
});
