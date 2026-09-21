import { randomUUID } from 'crypto';
import type { Knex } from 'knex';
import KnexDB from '../../../loaders/knex';
import { publicReview, ratingSummary, reviewerName, reviewInput, ReviewError, type ReviewRow, type ReviewStatus } from './policy';

const table = 'vsq_product_reviews';

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

export default class ProductReviewService {
    static async list(productPublicId: string, page: number, limit: number, sort: string, rating?: number) {
        const db = KnexDB.connect();
        const productId = await activeProduct(db, productPublicId);
        // Use one snapshot so counts and rows cannot disagree during moderation.
        return db.transaction(async (trx) => {
            const base = () => trx<ReviewRow>(table).where({ product_id: productId, status: 'PUBLISHED' });
            const groups = await base().select('rating').count({ count: '*' }).groupBy('rating');
            const summary = ratingSummary(groups as unknown as Array<{ rating: number; count: number }>);
            const filtered = base();
            if (rating) filtered.where('rating', rating);
            const count = await filtered.clone().count({ count: '*' }).first();
            if (sort === 'highest') filtered.orderBy('rating', 'desc');
            if (sort === 'lowest') filtered.orderBy('rating', 'asc');
            const reviews = await filtered.orderBy('created_at', 'desc').orderBy('id', 'desc').limit(limit).offset((page - 1) * limit);
            return { summary, reviews: reviews.map(publicReview), pagination: { page, limit, total: Number(count?.count || 0) } };
        }, { isolationLevel: 'repeatable read' });
    }

    static async mine(productPublicId: string, customerId: number) {
        const db = KnexDB.connect();
        await activeCustomer(db, customerId);
        const productId = await activeProduct(db, productPublicId);
        const row = await db<ReviewRow>(table).where({ product_id: productId, customer_id: customerId }).first();
        return { review: row ? { ...publicReview(row), status: row.status } : null };
    }

    static async create(productPublicId: string, customerId: number, input: Parameters<typeof reviewInput>[0]) {
        const values = reviewInput(input);
        const db = KnexDB.connect();
        return db.transaction(async (trx) => {
            // Serializes this customer's submissions, including rate-limit checks.
            const customer = await activeCustomer(trx, customerId, true);
            const productId = await activeProduct(trx, productPublicId);
            if (await trx(table).where({ product_id: productId, customer_id: customerId }).first('id')) {
                throw new ReviewError('You have already reviewed this product', 409);
            }
            const recent = await trx(table).where({ customer_id: customerId }).where('created_at', '>=', new Date(Date.now() - 60 * 60 * 1000)).count({ count: '*' }).first();
            if (Number(recent?.count || 0) >= 5) throw new ReviewError('You can submit up to five reviews per hour. Please try again later.', 429);
            const purchasedItem = await trx('vsq_order_items as item')
                .join('vsq_orders as ord', 'ord.id', 'item.order_id')
                .join('vsq_product_variants as variant', 'variant.id', 'item.variant_id')
                .where({ 'ord.customer_id': customerId, 'variant.product_id': productId })
                .whereNull('ord.cancelled_at').whereNot('ord.order_status', 'CANCELLED')
                .whereNotNull('ord.paid_at').whereIn('ord.financial_status', ['PAID', 'PARTIALLY_REFUNDED', 'REFUNDED'])
                .orderBy('ord.placed_at', 'desc').first('item.id');
            const publicId = randomUUID();
            await trx(table).insert({
                public_id: publicId, product_id: productId, customer_id: customerId,
                order_item_id: purchasedItem?.id || null, verified_purchase: Boolean(purchasedItem),
                reviewer_name: reviewerName(customer.first_name, customer.last_name),
                ...values, status: 'PENDING'
            });
            const row = await trx<ReviewRow>(table).where({ public_id: publicId }).first();
            return { review: { ...publicReview(row!), status: 'PENDING' } };
        }).catch((error) => {
            if (error?.code === 'ER_DUP_ENTRY') throw new ReviewError('You have already reviewed this product', 409);
            throw error;
        });
    }

    static async adminList(page: number, limit: number, status?: ReviewStatus, productPublicId?: string) {
        const db = KnexDB.connect();
        const query = db(`${table} as review`).join('vsq_products as product', 'product.id', 'review.product_id');
        if (status) query.where('review.status', status);
        if (productPublicId) query.where('product.public_id', productPublicId);
        const count = await query.clone().count({ count: '*' }).first();
        const rows = await query.select('review.public_id', 'review.reviewer_name', 'review.rating', 'review.title', 'review.body', 'review.verified_purchase', 'review.status', 'review.version', 'review.moderation_note', 'review.created_at', 'review.moderated_at', 'product.public_id as product_public_id', 'product.title as product_title')
            .orderBy('review.created_at', 'desc').orderBy('review.id', 'desc').limit(limit).offset((page - 1) * limit);
        return { reviews: rows, pagination: { page, limit, total: Number(count?.count || 0) } };
    }

    static async moderate(publicId: string, adminId: number, input: { status: ReviewStatus; version: number; note?: string }) {
        const db = KnexDB.connect();
        return db.transaction(async (trx) => {
            const row = await trx<ReviewRow>(table).where({ public_id: publicId }).forUpdate().first();
            if (!row) throw new ReviewError('Review not found', 404);
            if (Number(row.version) !== input.version) throw new ReviewError('This review changed. Reload before moderating.', 409);
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
