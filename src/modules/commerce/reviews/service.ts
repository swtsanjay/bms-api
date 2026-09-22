import { randomUUID } from 'crypto';
import type { Knex } from 'knex';
import KnexDB from '../../../loaders/knex';
import config from '../../../config';
import { normalizeReviewImage, normalizeReviewThumbnail, reviewThumbnailRequest, reviewUploadIds, reviewUploadRequest, videoMimeFromHeader, type ReviewUploadRow } from './upload-policy';
import { publicReview, ratingSummary, reviewerName, reviewInput, ReviewError, type ReviewRow, type ReviewStatus } from './policy';

const table = 'vsq_product_reviews';
const mediaTable = 'vsq_product_review_media';
const uploadTable = 'vsq_product_review_uploads';
const thumbnailUploadTable = 'vsq_product_review_thumbnail_uploads';

type MediaRow = { id: number; review_id: number; kind: 'IMAGE' | 'VIDEO'; public_url: string; mime_type: string; byte_size: number; position: number; thumbnail_url: string | null };
type ThumbnailUploadRow = { id: number; public_id: string; review_id: number; media_id: number; admin_id: number; object_key: string; mime_type: string; expected_byte_size: number; expires_at: Date | string; consumed_at: Date | string | null };

async function withMedia<T extends { id: number }>(db: Knex | Knex.Transaction, rows: T[], serialize: (row: T) => object, includeMediaId = false) {
    if (!rows.length) return [];
    const media = await db<MediaRow>(mediaTable).whereIn('review_id', rows.map((row) => row.id))
        .orderBy('position', 'asc').select('id', 'review_id', 'kind', 'public_url', 'mime_type', 'byte_size', 'position', 'thumbnail_url');
    return rows.map((row) => ({
        ...serialize(row),
        media: media.filter((item) => Number(item.review_id) === Number(row.id)).map((item) => ({
            ...(includeMediaId ? { id: Number(item.id) } : {}),
            kind: item.kind, url: item.public_url, mime_type: item.mime_type, byte_size: Number(item.byte_size),
            thumbnail_url: item.kind === 'VIDEO' ? item.thumbnail_url : null
        }))
    }));
}

async function activeProduct(db: Knex | Knex.Transaction, publicId: string) {
    const product = await db('vsq_products').where({ public_id: publicId, status: 'ACTIVE' }).whereNotNull('published_at').whereNull('deleted_at').first('id');
    if (!product) throw new ReviewError('Product not found', 404);
    return Number(product.id);
}

async function activeCustomer(db: Knex | Knex.Transaction, customerId: number, lock = false) {
    const query = db('vsq_customers').where({ id: customerId, status: 'ACTIVE' }).whereNull('deleted_at');
    if (lock) query.forUpdate();
    const customer = await query.first('id', 'first_name', 'last_name');
    if (!customer) throw new ReviewError('Customer account is unavailable', 403);
    return customer;
}

// The customer and product must both match; client-provided verification is never trusted.
function eligiblePurchase(db: Knex | Knex.Transaction, productId: number, customerId: number) {
    return db('vsq_order_items as item')
        .join('vsq_orders as ord', 'ord.id', 'item.order_id')
        .join('vsq_product_variants as variant', 'variant.id', 'item.variant_id')
        .where({ 'ord.customer_id': customerId, 'variant.product_id': productId })
        .whereNull('ord.cancelled_at').whereNot('ord.order_status', 'CANCELLED')
        .whereNotNull('ord.paid_at').whereIn('ord.financial_status', ['PAID', 'PARTIALLY_REFUNDED', 'REFUNDED'])
        .orderBy('ord.placed_at', 'desc').first('item.id');
}

export default class ProductReviewService {
    static async presignUpload(productPublicId: string, customerId: number, input: Parameters<typeof reviewUploadRequest>[0]) {
        const file = reviewUploadRequest(input);
        const db = KnexDB.connect();
        return db.transaction(async (trx) => {
            // This check happens before the browser is given any S3 upload permission.
            await activeCustomer(trx, customerId, true);
            const productId = await activeProduct(trx, productPublicId);
            if (await trx(table).where({ product_id: productId, customer_id: customerId }).first('id')) {
                throw new ReviewError('You have already reviewed this product', 409);
            }
            if (!await eligiblePurchase(trx, productId, customerId)) {
                throw new ReviewError('Only verified buyers can review this product. A paid, non-cancelled order on your account is required.', 403);
            }
            const recent = await trx(uploadTable).where({ customer_id: customerId }).where('created_at', '>=', new Date(Date.now() - 60 * 60 * 1000)).count({ count: '*' }).first();
            if (Number(recent?.count || 0) >= 20) throw new ReviewError('Review upload limit reached. Please try again later.', 429);
            if (!config.aws.s3BucketName) throw new ReviewError('Review media storage is not configured', 503);
            const s3 = (await import('../../../lib/S3Service')).default;
            const uploadId = randomUUID();
            // The browser has 10 minutes to start the S3 POST and 30 minutes to finish + submit.
            const expiresAt = new Date(Date.now() + 30 * 60 * 1000);
            const post = await s3.presignReviewPost(`commerce/review-staging/${uploadId}`, file.mimeType, file.byteSize);
            await trx(uploadTable).insert({
                public_id: uploadId, product_id: productId, customer_id: customerId,
                kind: file.kind, object_key: post.key, mime_type: file.mimeType,
                expected_byte_size: file.byteSize, expires_at: expiresAt
            });
            return { upload_id: uploadId, url: post.url, fields: post.fields, expires_at: expiresAt };
        });
    }

    static async list(productPublicId: string, page: number, limit: number, sort: string, rating?: number) {
        const db = KnexDB.connect();
        const productId = await activeProduct(db, productPublicId);
        // Use one snapshot so counts and rows cannot disagree during moderation.
        return db.transaction(async (trx) => {
            const base = () => trx<ReviewRow>(table).where({ product_id: productId, status: 'PUBLISHED', verified_purchase: true });
            const groups = await base().select('rating').count({ count: '*' }).groupBy('rating');
            const summary = ratingSummary(groups as unknown as Array<{ rating: number; count: number }>);
            const filtered = base();
            if (rating) filtered.where('rating', rating);
            const count = await filtered.clone().count({ count: '*' }).first();
            if (sort === 'highest') filtered.orderBy('rating', 'desc');
            if (sort === 'lowest') filtered.orderBy('rating', 'asc');
            const reviews = await filtered.orderBy('created_at', 'desc').orderBy('id', 'desc').limit(limit).offset((page - 1) * limit);
            return { summary, reviews: await withMedia(trx, reviews, publicReview), pagination: { page, limit, total: Number(count?.count || 0) } };
        }, { isolationLevel: 'repeatable read' });
    }

    static async mine(productPublicId: string, customerId: number) {
        const db = KnexDB.connect();
        await activeCustomer(db, customerId);
        const productId = await activeProduct(db, productPublicId);
        const row = await db<ReviewRow>(table).where({ product_id: productId, customer_id: customerId }).first();
        const canReview = !row && Boolean(await eligiblePurchase(db, productId, customerId));
        return {
            review: row ? (await withMedia(db, [row], (item) => ({ ...publicReview(item), status: item.status })))[0] : null,
            can_review: canReview,
            reason: row ? 'ALREADY_REVIEWED' : canReview ? null : 'VERIFIED_PURCHASE_REQUIRED'
        };
    }

    static async create(productPublicId: string, customerId: number, input: Parameters<typeof reviewInput>[0] & { upload_ids?: unknown }) {
        const values = reviewInput(input);
        const uploadIds = reviewUploadIds(input.upload_ids);
        const db = KnexDB.connect();
        const uploaded: Array<{ object: { url: string; key: string; versionId?: string }; kind: 'IMAGE' | 'VIDEO'; mimeType: string; byteSize: number }> = [];
        let staged: ReviewUploadRow[] = [];
        let s3: (typeof import('../../../lib/S3Service'))['default'] | undefined;
        const publicId = randomUUID();
        try {
            if (uploadIds.length) {
                // Reject non-buyers before any S3 work. The presign endpoint has already checked this too.
                await activeCustomer(db, customerId);
                const productId = await activeProduct(db, productPublicId);
                if (await db(table).where({ product_id: productId, customer_id: customerId }).first('id')) {
                    throw new ReviewError('You have already reviewed this product', 409);
                }
                if (!await eligiblePurchase(db, productId, customerId)) {
                    throw new ReviewError('Only verified buyers can review this product. A paid, non-cancelled order on your account is required.', 403);
                }
                if (!config.aws.s3BucketName) throw new ReviewError('Review media storage is not configured', 503);
                const rows = await db<ReviewUploadRow>(uploadTable).whereIn('public_id', uploadIds)
                    .where({ customer_id: customerId, product_id: productId }).whereNull('consumed_at');
                if (rows.length !== uploadIds.length || rows.some((row) => new Date(row.expires_at).getTime() <= Date.now())) {
                    throw new ReviewError('An attachment has expired or does not belong to this review. Please upload it again.', 409);
                }
                staged = uploadIds.map((id) => rows.find((row) => row.public_id === id)!);
                if (staged.filter((row) => row.kind === 'IMAGE').length > 3 || staged.filter((row) => row.kind === 'VIDEO').length > 1) {
                    throw new ReviewError('Attach up to 3 images and 1 video only', 400);
                }
                s3 = (await import('../../../lib/S3Service')).default;
                for (const [position, file] of staged.entries()) {
                    let head: Awaited<ReturnType<typeof s3.headObject>>;
                    try { head = await s3.headObject(file.object_key); }
                    catch (error) {
                        if (error && typeof error === 'object' && (
                            ('name' in error && (error.name === 'NotFound' || error.name === 'NoSuchKey')) ||
                            ('$metadata' in error && (error.$metadata as { httpStatusCode?: number })?.httpStatusCode === 404)
                        )) {
                            throw new ReviewError('An attachment has not finished uploading. Please try again.', 422);
                        }
                        throw error;
                    }
                    if (head.ContentLength !== Number(file.expected_byte_size) || head.ContentType !== file.mime_type || !head.ETag) {
                        throw new ReviewError('An attachment does not match the approved size or type. Please upload it again.', 422);
                    }
                    if (file.kind === 'IMAGE') {
                        const original = await s3.readObject(file.object_key, head.ETag);
                        const optimized = await normalizeReviewImage(original, file.mime_type);
                        const object = await s3.uploadBuffer(optimized, `commerce/reviews/${publicId}/${position + 1}-${randomUUID()}.webp`, 'image/webp');
                        uploaded.push({ object, kind: 'IMAGE', mimeType: 'image/webp', byteSize: optimized.length });
                    } else {
                        const header = await s3.readObject(file.object_key, head.ETag, 'bytes=0-15');
                        if (videoMimeFromHeader(header) !== file.mime_type) throw new ReviewError('Use a valid MP4, MOV or WebM video', 422);
                        const extension = file.mime_type === 'video/webm' ? 'webm' : file.mime_type === 'video/quicktime' ? 'mov' : 'mp4';
                        const object = await s3.copyObject(file.object_key, `commerce/reviews/${publicId}/${position + 1}-${randomUUID()}.${extension}`, file.mime_type, head.ETag);
                        uploaded.push({ object, kind: 'VIDEO', mimeType: file.mime_type, byteSize: Number(file.expected_byte_size) });
                    }
                }
            }
            const result = await db.transaction(async (trx) => {
                // Serializes this customer's submissions, including rate-limit checks.
                const customer = await activeCustomer(trx, customerId, true);
                const productId = await activeProduct(trx, productPublicId);
                if (await trx(table).where({ product_id: productId, customer_id: customerId }).first('id')) {
                    throw new ReviewError('You have already reviewed this product', 409);
                }
                const recent = await trx(table).where({ customer_id: customerId }).where('created_at', '>=', new Date(Date.now() - 60 * 60 * 1000)).count({ count: '*' }).first();
                if (Number(recent?.count || 0) >= 5) throw new ReviewError('You can submit up to five reviews per hour. Please try again later.', 429);
                const purchasedItem = await eligiblePurchase(trx, productId, customerId);
                if (!purchasedItem) throw new ReviewError('Only verified buyers can review this product. A paid, non-cancelled order on your account is required.', 403);
                if (staged.length) {
                    const locked = await trx<ReviewUploadRow>(uploadTable).whereIn('public_id', uploadIds)
                        .where({ customer_id: customerId, product_id: productId }).whereNull('consumed_at').forUpdate();
                    if (locked.length !== staged.length || locked.some((row) => new Date(row.expires_at).getTime() <= Date.now())) {
                        throw new ReviewError('An attachment has expired or was already used. Please upload it again.', 409);
                    }
                }
                await trx(table).insert({
                    public_id: publicId, product_id: productId, customer_id: customerId,
                    order_item_id: purchasedItem.id, verified_purchase: true,
                    reviewer_name: reviewerName(customer.first_name, customer.last_name),
                    ...values, status: 'PENDING'
                });
                const row = await trx<ReviewRow>(table).where({ public_id: publicId }).first();
                if (uploaded.length) {
                    await trx(mediaTable).insert(uploaded.map((file, position) => ({
                        review_id: row!.id, kind: file.kind, object_key: file.object.key,
                        public_url: file.object.url, mime_type: file.mimeType,
                        byte_size: file.byteSize, position: position + 1
                    })));
                    await trx(uploadTable).whereIn('public_id', uploadIds).update({ consumed_at: trx.fn.now() });
                }
                return { review: { ...publicReview(row!), status: 'PENDING', media: uploaded.map((file) => ({
                    kind: file.kind, url: file.object.url, mime_type: file.mimeType, byte_size: file.byteSize
                })) } };
            });
            if (s3) for (const file of staged) {
                try { await s3.deleteObject(file.object_key); }
                catch (cleanupError) { console.error('Could not remove staged review upload', cleanupError); }
            }
            return result;
        } catch (error) {
            if (s3) for (const file of uploaded.reverse()) {
                try { await s3.deleteUploadedObject(file.object); }
                catch (cleanupError) { console.error('Could not remove failed review upload', cleanupError); }
            }
            if (error && typeof error === 'object' && 'code' in error && error.code === 'ER_DUP_ENTRY') {
                throw new ReviewError('You have already reviewed this product', 409);
            }
            throw error;
        }
    }

    static async adminList(page: number, limit: number, status?: ReviewStatus, productPublicId?: string) {
        const db = KnexDB.connect();
        const query = db(`${table} as review`).join('vsq_products as product', 'product.id', 'review.product_id');
        if (status) query.where('review.status', status);
        if (productPublicId) query.where('product.public_id', productPublicId);
        const count = await query.clone().count({ count: '*' }).first();
        const rows = await query.select('review.id', 'review.public_id', 'review.reviewer_name', 'review.rating', 'review.title', 'review.body', 'review.verified_purchase', 'review.status', 'review.version', 'review.moderation_note', 'review.created_at', 'review.moderated_at', 'product.public_id as product_public_id', 'product.title as product_title')
            .orderBy('review.created_at', 'desc').orderBy('review.id', 'desc').limit(limit).offset((page - 1) * limit);
        return { reviews: await withMedia(db, rows, ({ id: _id, ...row }) => row, true), pagination: { page, limit, total: Number(count?.count || 0) } };
    }

    static async presignThumbnail(reviewPublicId: string, mediaId: number, adminId: number, input: Parameters<typeof reviewThumbnailRequest>[0]) {
        const file = reviewThumbnailRequest(input);
        if (!config.aws.s3BucketName || !config.aws.s3ReviewStagingBucketName) throw new ReviewError('Review media storage is not configured', 503);
        const db = KnexDB.connect();
        const media = await db(`${mediaTable} as media`).join(`${table} as review`, 'review.id', 'media.review_id')
            .where({ 'review.public_id': reviewPublicId, 'media.id': mediaId, 'media.kind': 'VIDEO' })
            .first('media.id', 'media.review_id');
        if (!media) throw new ReviewError('Review video not found', 404);
        const recent = await db(thumbnailUploadTable).where({ admin_id: adminId })
            .where('created_at', '>=', new Date(Date.now() - 60 * 60 * 1000)).count({ count: '*' }).first();
        if (Number(recent?.count || 0) >= 30) throw new ReviewError('Thumbnail upload limit reached. Please try again later.', 429);
        const s3 = (await import('../../../lib/S3Service')).default;
        const uploadId = randomUUID();
        const expiresAt = new Date(Date.now() + 30 * 60 * 1000);
        const post = await s3.presignReviewPost(`commerce/review-staging/thumbnails/${uploadId}`, file.mimeType, file.byteSize);
        await db(thumbnailUploadTable).insert({
            public_id: uploadId, review_id: media.review_id, media_id: mediaId, admin_id: adminId,
            object_key: post.key, mime_type: file.mimeType, expected_byte_size: file.byteSize, expires_at: expiresAt
        });
        return { upload_id: uploadId, url: post.url, fields: post.fields, expires_at: expiresAt };
    }

    static async saveThumbnail(reviewPublicId: string, mediaId: number, adminId: number, uploadId: string) {
        const db = KnexDB.connect();
        const grant = await db<ThumbnailUploadRow>(thumbnailUploadTable).where({ public_id: uploadId, media_id: mediaId, admin_id: adminId })
            .whereNull('consumed_at').first();
        if (!grant || new Date(grant.expires_at).getTime() <= Date.now()) throw new ReviewError('Thumbnail upload expired. Capture the frame again.', 409);
        const media = await db(`${mediaTable} as media`).join(`${table} as review`, 'review.id', 'media.review_id')
            .where({ 'review.public_id': reviewPublicId, 'media.id': mediaId, 'media.kind': 'VIDEO' }).first('media.id', 'media.review_id');
        if (!media || Number(media.review_id) !== Number(grant.review_id)) throw new ReviewError('Review video not found', 404);

        const s3 = (await import('../../../lib/S3Service')).default;
        let head: Awaited<ReturnType<typeof s3.headObject>>;
        try { head = await s3.headObject(grant.object_key); }
        catch (error) {
            if (error && typeof error === 'object' && (
                ('name' in error && (error.name === 'NotFound' || error.name === 'NoSuchKey')) ||
                ('$metadata' in error && (error.$metadata as { httpStatusCode?: number })?.httpStatusCode === 404)
            )) throw new ReviewError('Thumbnail has not finished uploading. Please try again.', 422);
            throw error;
        }
        if (head.ContentLength !== Number(grant.expected_byte_size) || head.ContentType !== grant.mime_type || !head.ETag) {
            throw new ReviewError('Thumbnail does not match its approved size or type. Capture it again.', 422);
        }
        const original = await s3.readObject(grant.object_key, head.ETag);
        const optimized = await normalizeReviewThumbnail(original, grant.mime_type);
        const object = await s3.uploadBuffer(optimized, `commerce/reviews/${reviewPublicId}/thumbnails/${mediaId}-${randomUUID()}.webp`, 'image/webp');
        let previousKey: string | null = null;
        try {
            await db.transaction(async (trx) => {
                const lockedGrant = await trx<ThumbnailUploadRow>(thumbnailUploadTable).where({ id: grant.id }).forUpdate().first();
                if (!lockedGrant || lockedGrant.consumed_at || new Date(lockedGrant.expires_at).getTime() <= Date.now()) {
                    throw new ReviewError('Thumbnail upload expired or was already used.', 409);
                }
                const lockedMedia = await trx(mediaTable).where({ id: mediaId, review_id: grant.review_id, kind: 'VIDEO' }).forUpdate().first('thumbnail_object_key');
                if (!lockedMedia) throw new ReviewError('Review video not found', 404);
                previousKey = lockedMedia.thumbnail_object_key || null;
                await trx(mediaTable).where({ id: mediaId }).update({
                    thumbnail_object_key: object.key, thumbnail_url: object.url, thumbnail_byte_size: optimized.length
                });
                await trx(thumbnailUploadTable).where({ id: grant.id }).update({ consumed_at: trx.fn.now() });
                await trx('vsq_commerce_audit_logs').insert({
                    actor_type: 'ADMIN', actor_id: adminId, action: 'PRODUCT_REVIEW_VIDEO_THUMBNAIL_SELECTED',
                    entity_type: 'PRODUCT_REVIEW', entity_id: reviewPublicId,
                    before_json: JSON.stringify({ media_id: mediaId, thumbnail_object_key: previousKey }),
                    after_json: JSON.stringify({ media_id: mediaId, thumbnail_object_key: object.key })
                });
            });
        } catch (error) {
            await s3.deleteUploadedObject(object).catch((cleanupError) => console.error('Could not remove failed review thumbnail', cleanupError));
            throw error;
        }
        await s3.deleteObject(grant.object_key).catch((error) => console.error('Could not remove staged review thumbnail', error));
        if (previousKey) await s3.deletePublicObject(previousKey).catch((error) => console.error('Could not remove replaced review thumbnail', error));
        return { media_id: mediaId, thumbnail_url: object.url, thumbnail_byte_size: optimized.length };
    }

    static async saveThumbnailFile(reviewPublicId: string, mediaId: number, adminId: number, file: { buffer: Buffer; mimetype: string }) {
        reviewThumbnailRequest({ mime_type: file.mimetype, byte_size: file.buffer.length });
        const db = KnexDB.connect();
        const media = await db(`${mediaTable} as media`).join(`${table} as review`, 'review.id', 'media.review_id')
            .where({ 'review.public_id': reviewPublicId, 'media.id': mediaId, 'media.kind': 'VIDEO' })
            .first('media.id', 'media.review_id');
        if (!media) throw new ReviewError('Review video not found', 404);
        const recent = await db('vsq_commerce_audit_logs')
            .where({ actor_type: 'ADMIN', actor_id: adminId, action: 'PRODUCT_REVIEW_VIDEO_THUMBNAIL_SELECTED' })
            .where('created_at', '>=', new Date(Date.now() - 60 * 60 * 1000)).count({ count: '*' }).first();
        if (Number(recent?.count || 0) >= 30) throw new ReviewError('Thumbnail upload limit reached. Please try again later.', 429);

        const optimized = await normalizeReviewThumbnail(file.buffer, file.mimetype);
        const s3 = (await import('../../../lib/S3Service')).default;
        const object = await s3.uploadBuffer(optimized, `commerce/reviews/${reviewPublicId}/thumbnails/${mediaId}-${randomUUID()}.webp`, 'image/webp');
        let previousKey: string | null = null;
        try {
            await db.transaction(async (trx) => {
                const lockedMedia = await trx(mediaTable).where({ id: mediaId, review_id: media.review_id, kind: 'VIDEO' })
                    .forUpdate().first('thumbnail_object_key');
                if (!lockedMedia) throw new ReviewError('Review video not found', 404);
                previousKey = lockedMedia.thumbnail_object_key || null;
                await trx(mediaTable).where({ id: mediaId }).update({
                    thumbnail_object_key: object.key, thumbnail_url: object.url, thumbnail_byte_size: optimized.length
                });
                await trx('vsq_commerce_audit_logs').insert({
                    actor_type: 'ADMIN', actor_id: adminId, action: 'PRODUCT_REVIEW_VIDEO_THUMBNAIL_SELECTED',
                    entity_type: 'PRODUCT_REVIEW', entity_id: reviewPublicId,
                    before_json: JSON.stringify({ media_id: mediaId, thumbnail_object_key: previousKey }),
                    after_json: JSON.stringify({ media_id: mediaId, thumbnail_object_key: object.key })
                });
            });
        } catch (error) {
            await s3.deleteUploadedObject(object).catch((cleanupError) => console.error('Could not remove failed review thumbnail', cleanupError));
            throw error;
        }
        if (previousKey) await s3.deletePublicObject(previousKey).catch((error) => console.error('Could not remove replaced review thumbnail', error));
        return { media_id: mediaId, thumbnail_url: object.url, thumbnail_byte_size: optimized.length };
    }

    static async moderate(publicId: string, adminId: number, input: { status: ReviewStatus; version: number; note?: string }) {
        const db = KnexDB.connect();
        return db.transaction(async (trx) => {
            const row = await trx<ReviewRow>(table).where({ public_id: publicId }).forUpdate().first();
            if (!row) throw new ReviewError('Review not found', 404);
            if (Number(row.version) !== input.version) throw new ReviewError('This review changed. Reload before moderating.', 409);
            if (input.status === 'PUBLISHED' && !row.verified_purchase) throw new ReviewError('Only verified-purchase reviews can be published', 403);
            const update = {
                status: input.status, moderation_note: input.note?.trim() || null,
                moderated_by: adminId, moderated_at: trx.fn.now(), updated_at: trx.fn.now(),
                published_at: input.status === 'PUBLISHED' ? row.published_at || trx.fn.now() : null,
                version: Number(row.version) + 1
            };
            await trx(table).where({ id: row.id }).update(update);
            await trx('vsq_commerce_audit_logs').insert({
                actor_type: 'ADMIN', actor_id: adminId, action: 'PRODUCT_REVIEW_MODERATED',
                entity_type: 'PRODUCT_REVIEW', entity_id: publicId,
                before_json: JSON.stringify({ status: row.status, version: row.version }),
                after_json: JSON.stringify({ status: input.status, version: update.version, note: update.moderation_note })
            });
            return { public_id: publicId, status: input.status, version: update.version };
        });
    }
}
