// Run with: npm run build && node --test tests/wallet-design.integration.js
// Creates and drops a disposable local MySQL schema. Never targets the configured application schema.
require('dotenv').config();
const { test } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const http = require('node:http');
const path = require('node:path');
const knex = require('knex');
const mysql = require('mysql2/promise');

test('design approvals, guest claims, email verification and wallet codes', async (t) => {
    assert.ok(['localhost', '127.0.0.1', '::1'].includes(process.env.DB_HOSTNAME), 'Integration tests require local MySQL');
    const database = `vsq_feature_test_${crypto.randomBytes(5).toString('hex')}`;
    const connection = { host: process.env.DB_HOSTNAME, user: process.env.DB_USER, password: process.env.DB_PASSWORD };
    const admin = await mysql.createConnection(connection);
    let db;
    try {
        await admin.query(`CREATE DATABASE \`${database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
        db = knex({ client: 'mysql2', connection: { ...connection, database }, pool: { min: 0, max: 10 }, migrations: { directory: path.resolve(__dirname, '../dist/db-migrations') } });
        global.knexInstance = db;
        await db.migrate.latest();
        const { awardApprovedDesign, claimDesign, reviewDesign, checkDesign } = require('../dist/modules/commerce/design/service');
        const { verifyCustomerEmail } = require('../dist/modules/commerce/design/email-verification');
        const { generatePackageCodes, packageCodeForAdmin, redeemWalletCode, requestGiftRefund, startGiftPurchase, verifyGiftPurchase, giftPurchaseForBuyer, syncGiftRefund } = require('../dist/modules/commerce/wallet/service');
        const { customerCredits, adjustCredits } = require('../dist/modules/commerce/referral/service');
        const Checkout = require('../dist/modules/commerce/checkout/service').default;
        const Admin = require('../dist/modules/commerce/admin/service').default;

        async function customer(email, verified = false) {
            const [id] = await db('vsq_customers').insert({ public_id: crypto.randomUUID(), email, email_normalized: email,
                status: 'ACTIVE', email_verified_at: verified ? new Date() : null, created_at: new Date(), updated_at: new Date() });
            return Number(id);
        }
        async function design(customerId = null, status = 'PENDING', token = null) {
            const publicId = crypto.randomUUID();
            const [id] = await db('vsq_design_submissions').insert({ public_id: publicId, customer_id: customerId, phone: '9999999999',
                original_filename: 'test.png', mime_type: 'image/png', byte_size: 1, checksum_sha256: '0'.repeat(64), object_key: `test/${publicId}`,
                marketing_permission: false, status, claim_token_hash: token ? crypto.createHash('sha256').update(token).digest('hex') : null,
                claim_expires_at: token ? new Date(Date.now() + 60_000) : null, created_at: new Date(), updated_at: new Date() });
            return { id: Number(id), publicId };
        }

        await t.test('design content validation rejects MIME mismatch and active PDFs', async () => {
            const image = await require('sharp')({ create: { width: 2, height: 2, channels: 3, background: '#fff' } }).png().toBuffer();
            assert.equal(await checkDesign({ buffer: image, mimetype: 'image/png' }), 'image/png');
            await assert.rejects(() => checkDesign({ buffer: image, mimetype: 'image/jpeg' }));
            await assert.rejects(() => checkDesign({ buffer: Buffer.from('%PDF-1.7\n/JavaScript alert(1)\n%%EOF'), mimetype: 'application/pdf' }));
        });

        await t.test('approval before verification awards exactly once', async () => {
            const id = await customer('before@example.test');
            const a = await design(id); const b = await design(id);
            await reviewDesign(a.publicId, 'APPROVED', 'accepted', 1, 50);
            await reviewDesign(b.publicId, 'APPROVED', 'also accepted', 1, 17);
            assert.equal(Number((await db('vsq_design_rewards').where({ customer_id: id }).count({ n: 'id' }).first()).n), 0);
            const token = crypto.randomBytes(32).toString('base64url');
            await db('vsq_email_verification_tokens').insert({ public_id: crypto.randomUUID(), customer_id: id,
                token_hash: crypto.createHash('sha256').update(token).digest('hex'), expires_at: new Date(Date.now() + 60_000), created_at: new Date() });
            await verifyCustomerEmail(token);
            assert.equal(Number((await db('vsq_design_rewards').where({ customer_id: id }).count({ n: 'id' }).first()).n), 2);
            assert.equal(Number((await db('vsq_credit_accounts').where({ customer_id: id }).first()).available_balance_minor), 6700);
            assert.equal(Number((await db('vsq_email_outbox').where('event_key', 'like', 'design.reward:submission:%').count({ n: 'id' }).first()).n), 2);
            await assert.rejects(() => verifyCustomerEmail(token));
        });

        await t.test('verification before approval and concurrent reward requests', async () => {
            const id = await customer('after@example.test', true);
            const a = await design(id); await reviewDesign(a.publicId, 'APPROVED', '', 1, 50);
            await Promise.all([1, 2, 3].map(() => db.transaction((trx) => awardApprovedDesign(trx, id))));
            assert.equal(Number((await db('vsq_design_rewards').where({ customer_id: id }).count({ n: 'id' }).first()).n), 1);
            assert.equal(Number((await db('vsq_credit_accounts').where({ customer_id: id }).first()).available_balance_minor), 5000);
        });

        await t.test('guest claim is one-time and binds to the claimant only', async () => {
            const owner = await customer('claimer@example.test', true);
            const other = await customer('other@example.test', true);
            const token = crypto.randomBytes(32).toString('base64url');
            const entry = await design(null, 'APPROVED', token);
            await db('vsq_design_submissions').where({ id: entry.id }).update({ approved_reward_minor: 1100 });
            await assert.rejects(() => claimDesign(entry.publicId, crypto.randomBytes(32).toString('base64url'), other));
            const claimed = await claimDesign(entry.publicId, token, owner);
            assert.ok(claimed.rewarded_at, 'an approved design claimed by a verified customer reports the issued reward');
            await assert.rejects(() => claimDesign(entry.publicId, token, other));
            assert.equal(Number((await db('vsq_design_submissions').where({ id: entry.id }).first()).customer_id), owner);
            assert.equal(Number((await db('vsq_design_rewards').where({ customer_id: owner }).count({ n: 'id' }).first()).n), 1);
        });

        await t.test('amount limits, rejection and historical approvals', async () => {
            const id = await customer('limits@example.test', true);
            const invalid = await design(id);
            await assert.rejects(() => reviewDesign(invalid.publicId, 'APPROVED', '', 1, 0));
            await assert.rejects(() => reviewDesign(invalid.publicId, 'APPROVED', '', 1, 51));
            await assert.rejects(() => reviewDesign(invalid.publicId, 'APPROVED', '', 1, 1.5));
            await reviewDesign(invalid.publicId, 'REJECTED', '', 1);
            const historical = await design(id, 'APPROVED');
            await db('vsq_design_rewards').insert({ customer_id: id, submission_id: historical.id, amount_minor: 5000, created_at: new Date() });
            await db('vsq_credit_accounts').insert({ customer_id: id, available_balance_minor: 5000, created_at: new Date(), updated_at: new Date() });
            await db.transaction((trx) => awardApprovedDesign(trx, id));
            assert.equal(Number((await db('vsq_design_rewards').where({ submission_id: historical.id }).first()).amount_minor), 5000);
            const approved = await design(id);
            await reviewDesign(approved.publicId, 'APPROVED', '', 1, 1);
            await db.transaction((trx) => awardApprovedDesign(trx, id));
            assert.equal(Number((await db('vsq_credit_accounts').where({ customer_id: id }).first()).available_balance_minor), 5100);
            assert.equal(Number((await db('vsq_design_rewards').where({ customer_id: id }).count({ n: 'id' }).first()).n), 2);
            await assert.rejects(() => reviewDesign(approved.publicId, 'APPROVED', '', 1, 50));
        });

        await t.test('private previews require staff or owner and distinguish image from PDF', async () => {
            const express = require('express');
            const S3Service = require('../dist/lib/S3Service').default;
            const auth = require('../dist/modules/commerce/customer/auth-service').default;
            const originalVerify = auth.verifyAccessToken;
            const originalUrl = S3Service.privateDesignReviewUrl;
            const originalRead = S3Service.readPrivateDesign;
            const originalUpload = S3Service.uploadPrivateDesign;
            const owner = await customer('preview-owner@example.test', true);
            const other = await customer('preview-other@example.test', true);
            const image = await design(owner);
            const pdf = await design(owner);
            await db('vsq_design_submissions').where({ id: pdf.id }).update({ mime_type: 'application/pdf', original_filename: 'proof.pdf' });
            auth.verifyAccessToken = (token) => ({ id: token === 'owner' ? owner : other, public_id: 'test', email: 'test@example.test', session_id: 'test' });
            const imageBytes = await require('sharp')({ create: { width: 640, height: 480, channels: 3, background: '#fff' } }).png().toBuffer();
            let reads = 0;
            let uploads = 0;
            S3Service.readPrivateDesign = async () => { reads++; return imageBytes; };
            S3Service.uploadPrivateDesign = async (buffer, key, mime) => {
                uploads++;
                assert.equal(mime, 'image/webp');
                assert.match(key, /thumbnail\.webp$/);
                const metadata = await require('sharp')(buffer).metadata();
                assert.equal(metadata.format, 'webp');
                assert.ok(metadata.width <= 320 && metadata.height <= 320);
                return { key };
            };
            S3Service.privateDesignReviewUrl = async (_key, filename, inline, mime) => `https://private.example.test/${filename}?inline=${inline}&mime=${mime}`;
            const app = express();
            app.use('/customer', require('../dist/modules/commerce/design/route').default);
            app.use('/admin', (req, _res, next) => { if (req.get('x-admin') === 'yes') req.user = { id: 1, user_type: 'ADMIN' }; next(); }, require('../dist/modules/commerce/design/admin-route').default);
            const server = app.listen(0);
            const root = `http://127.0.0.1:${server.address().port}`;
            try {
                assert.equal((await fetch(`${root}/customer/submissions/${image.publicId}/preview`)).status, 401);
                assert.equal((await fetch(`${root}/customer/submissions/${image.publicId}/preview`, { headers: { Authorization: 'Bearer other' } })).status, 404);
                const ownImage = await (await fetch(`${root}/customer/submissions/${image.publicId}/preview?thumbnail=true`, { headers: { Authorization: 'Bearer owner' } })).json();
                assert.match(ownImage.data.url, /thumbnail.webp/);
                assert.equal(reads, 1);
                assert.equal(uploads, 1);
                assert.ok((await db('vsq_design_submissions').where({ id: image.id }).first()).thumbnail_object_key);
                await fetch(`${root}/customer/submissions/${image.publicId}/preview?thumbnail=true`, { headers: { Authorization: 'Bearer owner' } });
                assert.equal(uploads, 1, 'stored thumbnail is reused');
                const ownPdf = await (await fetch(`${root}/customer/submissions/${pdf.publicId}/preview`, { headers: { Authorization: 'Bearer owner' } })).json();
                assert.match(ownPdf.data.url, /proof.pdf\?inline=true&mime=application\/pdf/);
                assert.equal((await fetch(`${root}/customer/submissions/${pdf.publicId}/preview?thumbnail=true`, { headers: { Authorization: 'Bearer owner' } })).status, 422);
                assert.equal((await fetch(`${root}/admin/${image.publicId}/file`)).status, 403);
                const staff = await (await fetch(`${root}/admin/${image.publicId}/file?inline=true`, { headers: { 'x-admin': 'yes' } })).json();
                assert.match(staff.data.url, /inline=true&mime=image\/png/);
                assert.equal((await fetch(`${root}/admin/${pdf.publicId}/thumbnail`, { headers: { 'x-admin': 'yes' } })).status, 422);
                const list = await (await fetch(`${root}/admin?status=ALL`, { headers: { 'x-admin': 'yes' } })).json();
                assert.equal(list.success, true);
                assert.equal(Number(list.data.submissions.find((row) => row.public_id === image.publicId).is_first_design), 1);
                assert.equal(Number(list.data.submissions.find((row) => row.public_id === pdf.publicId).is_first_design), 0);
            } finally {
                await new Promise((resolve) => server.close(resolve));
                auth.verifyAccessToken = originalVerify;
                S3Service.privateDesignReviewUrl = originalUrl;
                S3Service.readPrivateDesign = originalRead;
                S3Service.uploadPrivateDesign = originalUpload;
            }
        });

        await t.test('customer design history pages beyond twelve submissions', async () => {
            const express = require('express');
            const auth = require('../dist/modules/commerce/customer/auth-service').default;
            const originalVerify = auth.verifyAccessToken;
            const owner = await customer('history-owner@example.test', true);
            const other = await customer('history-other@example.test', true);
            const created = [];
            for (let index = 0; index < 13; index++) created.push(await design(owner));
            await design(other);
            auth.verifyAccessToken = (token) => {
                if (token !== 'owner') throw new Error('Invalid token');
                return { id: owner, public_id: 'test', email: 'history-owner@example.test', session_id: 'test' };
            };
            const app = express();
            app.use('/customer', require('../dist/modules/commerce/design/route').default);
            const server = app.listen(0);
            const root = `http://127.0.0.1:${server.address().port}`;
            try {
                assert.equal((await fetch(`${root}/customer/submissions/mine?page=2`)).status, 401);
                const headers = { Authorization: 'Bearer owner' };
                const first = await (await fetch(`${root}/customer/submissions/mine?page=1`, { headers })).json();
                const second = await (await fetch(`${root}/customer/submissions/mine?page=2`, { headers })).json();
                assert.equal(first.data.total, 13);
                assert.equal(first.data.page_size, 12);
                assert.equal(first.data.submissions.length, 12);
                assert.equal(second.data.page, 2);
                assert.equal(second.data.submissions.length, 1);
                assert.equal(second.data.submissions[0].public_id, created[0].publicId);
                assert.ok(!first.data.submissions.some((row) => row.public_id === created[0].publicId));
                assert.equal((await fetch(`${root}/customer/submissions/mine?page=0`, { headers })).status, 422);
            } finally {
                await new Promise((resolve) => server.close(resolve));
                auth.verifyAccessToken = originalVerify;
            }
        });

        await t.test('package and gift codes redeem once with server-side values', async () => {
            const first = await customer('codes1@example.test', true);
            const second = await customer('codes2@example.test', true);
            const [packageCode] = await generatePackageCodes(25000, 1, 1);
            assert.match(packageCode, /^VAS-[A-HJ-NP-Z2-9]{12}$/);
            assert.equal((await redeemWalletCode(first, packageCode.toLowerCase().replace('-', ''))).amount, 250);
            await assert.rejects(() => redeemWalletCode(second, packageCode));
            const [anotherCode] = await generatePackageCodes(10000, 1, 1);
            await redeemWalletCode(first, anotherCode);
            const giftCode = `VSQ-${crypto.randomBytes(16).toString('hex').toUpperCase()}`;
            const [purchaseId] = await db('vsq_gift_purchases').insert({ public_id: crypto.randomUUID(), buyer_customer_id: first, amount_minor: 10000,
                status: 'PAID', idempotency_key: crypto.randomBytes(20).toString('hex'), provider_order_id: 'order_test', provider_payment_id: 'pay_test', created_at: new Date(), updated_at: new Date() });
            await db('vsq_wallet_codes').insert({ public_id: crypto.randomUUID(), code_hash: crypto.createHash('sha256').update(giftCode.replaceAll('-', '')).digest('hex'),
                kind: 'GIFT', amount_minor: 10000, status: 'ISSUED', purchase_id: purchaseId, created_at: new Date(), updated_at: new Date() });
            assert.equal((await redeemWalletCode(second, giftCode)).amount, 100);
            await assert.rejects(() => redeemWalletCode(second, 'VAS-TOO-SHORT'));
            const giftPurchase = await db('vsq_gift_purchases').where({ id: purchaseId }).first();
            await assert.rejects(() => requestGiftRefund(giftPurchase.public_id, 'buyer request'));
            const page1 = await customerCredits(first, 1, 1);
            const page2 = await customerCredits(first, 1, 1, page1.transaction_pagination.next_cursor);
            assert.notEqual(page1.transactions[0].public_id, page2.transactions[0]?.public_id);
        });

        await t.test('admin can reveal encrypted package codes and download their card', async () => {
            const express = require('express');
            const { PDFDocument } = require('pdf-lib');
            const [issuedCode] = await generatePackageCodes(5000, 1, 1);
            const row = await db('vsq_wallet_codes').where({ code_hash: crypto.createHash('sha256').update(issuedCode.replaceAll('-', '')).digest('hex') }).first();
            assert.ok(row.encrypted_code);
            assert.ok(!String(row.encrypted_code).includes(issuedCode));
            assert.equal((await packageCodeForAdmin(row.public_id)).code, issuedCode);
            const legacyId = crypto.randomUUID();
            await db('vsq_wallet_codes').insert({ public_id: legacyId, code_hash: crypto.createHash('sha256').update('legacy-example').digest('hex'),
                kind: 'PACKAGE', amount_minor: 5000, status: 'ISSUED', created_at: new Date(), updated_at: new Date() });
            await assert.rejects(() => packageCodeForAdmin(legacyId), /original export/);
            const app = express();
            app.use((req, _res, next) => { if (req.get('x-admin') === 'yes') req.user = { id: 1, user_type: 'ADMIN' }; next(); });
            app.use('/wallet', require('../dist/modules/commerce/wallet/admin-route').default);
            const server = app.listen(0);
            const root = `http://127.0.0.1:${server.address().port}/wallet`;
            try {
                assert.equal((await fetch(`${root}/codes/${row.public_id}/reveal`, { method: 'POST' })).status, 403);
                const list = await (await fetch(`${root}/codes`, { headers: { 'x-admin': 'yes' } })).json();
                assert.equal(Number(list.data.codes.find((code) => code.public_id === row.public_id).recoverable), 1);
                assert.equal(Number(list.data.codes.find((code) => code.public_id === legacyId).recoverable), 0);
                const revealed = await fetch(`${root}/codes/${row.public_id}/reveal`, { method: 'POST', headers: { 'x-admin': 'yes' } });
                assert.equal(revealed.headers.get('cache-control'), 'no-store');
                assert.equal((await revealed.json()).data.code, issuedCode);
                const card = await fetch(`${root}/codes/${row.public_id}/card`, { headers: { 'x-admin': 'yes' } });
                assert.equal(card.status, 200);
                assert.match(card.headers.get('content-type'), /application\/pdf/);
                const pdf = await PDFDocument.load(await card.arrayBuffer());
                assert.equal(pdf.getPageCount(), 2);
                const legacy = await fetch(`${root}/codes/${legacyId}/reveal`, { method: 'POST', headers: { 'x-admin': 'yes' } });
                assert.equal(legacy.status, 409);
                const audit = await db('vsq_commerce_audit_logs').where({ entity_type: 'PACKAGE_CODE', entity_id: row.public_id }).orderBy('id');
                assert.deepEqual(audit.map((entry) => entry.action), ['PACKAGE_CODE_REVEALED', 'PACKAGE_CODE_CARD_DOWNLOADED']);
                assert.ok(!JSON.stringify(audit).includes(issuedCode));
            } finally { await new Promise((resolve) => server.close(resolve)); }
        });

        await t.test('full-credit checkout completes without Razorpay or COD and cancellation refunds once', async () => {
            const buyer = await customer('checkout@example.test', true);
            await db('vsq_credit_accounts').insert({ customer_id: buyer, available_balance_minor: 10000, created_at: new Date(), updated_at: new Date() });
            const [product] = await db('vsq_products').insert({ public_id: crypto.randomUUID(), slug: 'test-full-credit', title: 'Test item', status: 'ACTIVE', created_at: new Date(), updated_at: new Date() });
            const [variant] = await db('vsq_product_variants').insert({ public_id: crypto.randomUUID(), product_id: product, title: 'Default', status: 'ACTIVE', created_at: new Date(), updated_at: new Date() });
            const [location] = await db('vsq_inventory_locations').insert({ code: 'TEST', name: 'Test location', status: 'ACTIVE', created_at: new Date(), updated_at: new Date() });
            await db('vsq_inventory_levels').insert({ variant_id: variant, location_id: location, on_hand: 3, reserved: 0, safety_stock: 0, updated_at: new Date() });
            const priceList = (await db('vsq_price_lists').where({ code: 'INR_DEFAULT' }).first()).id;
            await db('vsq_variant_prices').insert({ price_list_id: priceList, variant_id: variant, amount: 100, created_at: new Date(), updated_at: new Date() });
            const [zone] = await db('vsq_shipping_zones').insert({ name: 'India', status: 'ACTIVE', cod_enabled: true, created_at: new Date(), updated_at: new Date() });
            const method = (await db('vsq_shipping_methods').where({ code: 'STANDARD_MANUAL' }).first()).id;
            await db('vsq_shipping_rates').where({ method_id: method }).delete();
            await db('vsq_shipping_rates').insert({ zone_id: zone, method_id: method, amount: 0, status: 'ACTIVE', created_at: new Date(), updated_at: new Date() });
            const cartPublicId = crypto.randomUUID();
            const [cart] = await db('vsq_carts').insert({ public_id: cartPublicId, customer_id: buyer, status: 'ACTIVE', subtotal: 100, grand_total: 100, created_at: new Date(), updated_at: new Date() });
            await db('vsq_cart_items').insert({ cart_id: cart, variant_id: variant, quantity: 1, unit_price: 100, line_total: 100, created_at: new Date(), updated_at: new Date() });
            const input = { cartPublicId, customerId: buyer, shippingAddress: { first_name: 'Test', address_line_1: '1 Example Lane', city: 'Delhi', state: 'Delhi', postcode: '110001' },
                shippingMethodCode: 'STANDARD_MANUAL', paymentMethod: 'RAZORPAY', idempotencyKey: 'full-credit-test', creditsToApply: 100 };
            const order = await Checkout.placeOrder(input);
            assert.equal(order.payment_method, 'CREDITS');
            assert.equal(order.financial_status, 'PAID');
            assert.equal(order.order_status, 'CONFIRMED');
            assert.equal(order.grand_total, 0);
            assert.equal(order.discount_total, 0);
            assert.equal((await Checkout.placeOrder(input)).public_id, order.public_id);
            assert.equal(Number((await db('vsq_inventory_levels').where({ variant_id: variant }).first()).on_hand), 2);
            await Admin.cancelOrder(order.public_id, 1, 'test cancellation');
            await Admin.cancelOrder(order.public_id, 1, 'retry');
            assert.equal(Number((await db('vsq_credit_accounts').where({ customer_id: buyer }).first()).available_balance_minor), 10000);
            assert.equal(Number((await db('vsq_inventory_levels').where({ variant_id: variant }).first()).on_hand), 3);
            const partialCartPublicId = crypto.randomUUID();
            const [partialCart] = await db('vsq_carts').insert({ public_id: partialCartPublicId, customer_id: buyer, status: 'ACTIVE', subtotal: 100, grand_total: 100, created_at: new Date(), updated_at: new Date() });
            await db('vsq_cart_items').insert({ cart_id: partialCart, variant_id: variant, quantity: 1, unit_price: 100, line_total: 100, created_at: new Date(), updated_at: new Date() });
            const config = require('../dist/config').default;
            const previous = config.razorpay.enabled;
            config.razorpay.enabled = true;
            try {
                const partial = await Checkout.placeOrder({ ...input, cartPublicId: partialCartPublicId, idempotencyKey: 'partial-credit-test', creditsToApply: 20 });
                assert.equal(partial.payment_method, 'RAZORPAY');
                assert.equal(partial.discount_total, 50);
                assert.equal(partial.grand_total, 30);
                assert.equal(partial.financial_status, 'UNPAID');
                await Admin.cancelOrder(partial.public_id, 1, 'test cancellation');
                assert.equal(Number((await db('vsq_credit_accounts').where({ customer_id: buyer }).first()).available_balance_minor), 10000);
            } finally { config.razorpay.enabled = previous; }
        });

        await t.test('gift payment callback retries issue one code; unused refund voids it once', async () => {
            const provider = require('../dist/modules/commerce/payment/razorpay-provider');
            const config = require('../dist/config').default;
            const original = { createProviderOrder: provider.createProviderOrder, findProviderOrderByReceipt: provider.findProviderOrderByReceipt,
                fetchProviderPayment: provider.fetchProviderPayment, createProviderRefund: provider.createProviderRefund, fetchProviderPaymentRefunds: provider.fetchProviderPaymentRefunds };
            const originalConfig = { enabled: config.razorpay.enabled, keySecret: config.razorpay.keySecret };
            const originalEncryption = process.env.VSQ_GIFT_CODE_ENCRYPTION_KEY;
            let orderCalls = 0; let refundCalls = 0;
            config.razorpay.enabled = true; config.razorpay.keySecret = 'integration-test-secret';
            process.env.VSQ_GIFT_CODE_ENCRYPTION_KEY = crypto.randomBytes(32).toString('hex');
            provider.findProviderOrderByReceipt = async () => null;
            provider.createProviderOrder = async (input) => ({ id: `order_mock_${++orderCalls}`, amount: input.amount, currency: input.currency });
            provider.fetchProviderPayment = async (id) => ({ id, order_id: id === 'pay_mock_1' ? 'order_mock_1' : 'order_mock_2', amount: 10000, currency: 'INR', status: 'captured' });
            provider.fetchProviderPaymentRefunds = async () => ({ items: [] });
            provider.createProviderRefund = async () => { refundCalls += 1; if (refundCalls === 1) throw new Error('Temporary provider failure'); return { id: 'rfnd_mock_1' }; };
            try {
                const buyer = await customer('giftbuyer@example.test', true);
                const denomination = await db('vsq_gift_denominations').where({ amount_minor: 10000 }).first();
                const first = await startGiftPurchase(buyer, denomination.id, 'gift-test-request-one');
                const retry = await startGiftPurchase(buyer, denomination.id, 'gift-test-request-one');
                assert.equal(retry.public_id, first.public_id);
                assert.equal(orderCalls, 1);
                const signature = crypto.createHmac('sha256', config.razorpay.keySecret).update('order_mock_1|pay_mock_1').digest('hex');
                const paid = await verifyGiftPurchase(first.public_id, buyer, 'pay_mock_1', signature);
                await verifyGiftPurchase(first.public_id, buyer, 'pay_mock_1', signature);
                assert.match(paid.code, /^VAS-[A-HJ-NP-Z2-9]{12}$/);
                assert.equal(Number((await db('vsq_wallet_codes').where({ purchase_id: (await db('vsq_gift_purchases').where({ public_id: first.public_id }).first()).id }).count({ n: 'id' }).first()).n), 1);
                const second = await startGiftPurchase(buyer, denomination.id, 'gift-test-request-two');
                const signature2 = crypto.createHmac('sha256', config.razorpay.keySecret).update('order_mock_2|pay_mock_2').digest('hex');
                await verifyGiftPurchase(second.public_id, buyer, 'pay_mock_2', signature2);
                await assert.rejects(() => requestGiftRefund(second.public_id, 'unused gift'));
                assert.equal((await db('vsq_wallet_codes').where({ purchase_id: (await db('vsq_gift_purchases').where({ public_id: second.public_id }).first()).id }).first()).status, 'VOID');
                await requestGiftRefund(second.public_id, 'retry');
                await requestGiftRefund(second.public_id, 'another retry');
                assert.equal(refundCalls, 2);
                assert.equal((await giftPurchaseForBuyer(second.public_id, buyer)).code, null);
                await redeemWalletCode(buyer, paid.code);
                await assert.rejects(() => redeemWalletCode(buyer, paid.code));
                await syncGiftRefund('pay_mock_2', 'rfnd_mock_1', 'processed');
                assert.equal((await giftPurchaseForBuyer(second.public_id, buyer)).status, 'REFUNDED');
            } finally {
                Object.assign(provider, original);
                Object.assign(config.razorpay, originalConfig);
                if (originalEncryption === undefined) delete process.env.VSQ_GIFT_CODE_ENCRYPTION_KEY;
                else process.env.VSQ_GIFT_CODE_ENCRYPTION_KEY = originalEncryption;
            }
        });

        await t.test('admin credit grants appear in customer search and replay only once', async () => {
            const id = await customer('grant-recipient@example.test', true);
            const publicId = (await db('vsq_customers').where({ id }).first()).public_id;
            const key = crypto.randomUUID();
            const before = await Admin.customers({ search: 'grant-recipient@example.test' });
            assert.equal(before.pagination.total, 1);
            assert.equal(before.customers[0].available_credits_minor, 0);
            await adjustCredits(publicId, 75, 'Service recovery', 1, key);
            await adjustCredits(publicId, 75, 'Service recovery', 1, key);
            const after = await Admin.customers({ search: 'grant-recipient@example.test' });
            assert.equal(after.customers[0].available_credits_minor, 7500);
            assert.equal(Number((await db('vsq_credit_transactions').where({ idempotency_key: `admin-adjustment:${key}` }).count({ total: '*' }).first()).total), 1);
            await assert.rejects(() => adjustCredits(publicId, 100, 'Changed amount', 1, key), (error) => error.statusCode === 409);
            assert.equal(Number((await db('vsq_credit_accounts').where({ customer_id: id }).first()).available_balance_minor), 7500);
            const eventKey = `credit.grant:admin-adjustment:${key}`;
            const emails = await db('vsq_email_outbox').where({ event_key: eventKey });
            assert.equal(emails.length, 1, 'a retried grant queues one customer email');
            assert.equal(emails[0].template, 'CREDIT_GRANT');
            assert.equal(emails[0].recipient_email, 'grant-recipient@example.test');
            const payload = typeof emails[0].payload_json === 'string' ? JSON.parse(emails[0].payload_json) : emails[0].payload_json;
            assert.equal(payload.amount_minor, 7500);

            // Exercise the normal outbox worker against a local recording server, never Mailgun.
            await db('vsq_email_outbox').whereNot({ event_key: eventKey }).where({ status: 'PENDING' }).update({ status: 'SENT' });
            await db('vsq_email_outbox').where({ event_key: eventKey }).update({ available_at: new Date(Date.now() - 60_000) });
            const requests = [];
            const server = http.createServer(async (request, response) => {
                const chunks = [];
                for await (const chunk of request) chunks.push(chunk);
                requests.push({ url: request.url, body: Buffer.concat(chunks).toString('utf8') });
                response.writeHead(200, { 'Content-Type': 'application/json' });
                response.end(JSON.stringify({ id: 'local-test-message' }));
            });
            await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
            const config = require('../dist/config').default;
            const originalMailgun = { ...config.mailgun };
            try {
                Object.assign(config.mailgun, {
                    enabled: true, apiBaseUrl: `http://127.0.0.1:${server.address().port}`,
                    domain: 'test.invalid', apiKey: 'local-test-key', fromEmail: 'noreply@test.invalid',
                    storefrontUrl: 'https://www.vastriqo.com'
                });
                const { processCommerceEmailOutbox } = require('../dist/modules/commerce/email/service');
                const sent = await processCommerceEmailOutbox();
                assert.equal(sent, 1, JSON.stringify(await db('vsq_email_outbox').where({ event_key: eventKey }).first('status', 'last_error', 'attempts')));
                assert.equal(requests.length, 1);
                assert.match(requests[0].body, /₹75 Vastriqo Credits/);
                assert.match(requests[0].body, /https:\/\/www\.vastriqo\.com\/wallet/);
                assert.equal((await db('vsq_email_outbox').where({ event_key: eventKey }).first()).status, 'SENT');
            } finally {
                Object.assign(config.mailgun, originalMailgun);
                await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
            }
        });
    } finally {
        if (db) await db.destroy();
        await admin.query(`DROP DATABASE IF EXISTS \`${database}\``);
        await admin.end();
    }
});
