import crypto from 'crypto';
import type { Knex } from 'knex';
import CommerceCheckoutService from '../checkout/service';

export class CommerceAdminError extends Error {
    constructor(message: string, public readonly statusCode: number) {
        super(message);
        this.name = 'CommerceAdminError';
    }
}

type ProductVariantInput = {
    public_id?: string;
    title: string;
    sku?: string | null;
    barcode?: string | null;
    status?: string;
    price: number;
    compare_at_price?: number | null;
    inventory_quantity?: number;
    selected_options?: Array<{ name: string; value: string; swatch_value?: string | null }>;
};

type ProductInput = {
    public_id?: string;
    slug?: string;
    title: string;
    description_html?: string | null;
    description_text?: string | null;
    vendor?: string | null;
    product_type?: string | null;
    tags?: string[];
    status?: string;
    seo_title?: string | null;
    seo_description?: string | null;
    variants?: ProductVariantInput[];
    media?: Array<{ url: string; alt_text?: string | null; role?: string; position?: number }>;
    category_public_ids?: string[];
    collection_public_ids?: string[];
};

function slugify(value: string) {
    return value
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 191);
}

function pageValues(query: Record<string, unknown>) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 25));
    return { page, limit };
}

async function saveVariantOptions(
    trx: Knex.Transaction,
    productId: number,
    variantId: number,
    options: ProductVariantInput['selected_options'] = []
) {
    await trx('vsq_variant_option_values').where({ variant_id: variantId }).delete();
    let optionPosition = 0;
    for (const selected of options) {
        const name = selected.name.trim();
        const value = selected.value.trim();
        if (!name || !value) continue;

        let option = await trx('vsq_product_options').where({ product_id: productId, name }).first();
        if (!option) {
            const [optionId] = await trx('vsq_product_options').insert({
                product_id: productId,
                name,
                position: optionPosition,
                created_at: new Date(),
                updated_at: new Date()
            });
            option = { id: optionId };
        }

        let optionValue = await trx('vsq_product_option_values')
            .where({ product_option_id: option.id, value })
            .first();
        if (!optionValue) {
            const valuePositionRow = await trx('vsq_product_option_values')
                .where({ product_option_id: option.id })
                .max({ max_position: 'position' })
                .first();
            const [valueId] = await trx('vsq_product_option_values').insert({
                product_option_id: option.id,
                value,
                swatch_value: selected.swatch_value || null,
                position: Number(valuePositionRow?.max_position ?? -1) + 1,
                created_at: new Date(),
                updated_at: new Date()
            });
            optionValue = { id: valueId };
        }
        await trx('vsq_variant_option_values').insert({
            variant_id: variantId,
            product_option_value_id: optionValue.id
        });
        optionPosition += 1;
    }
}

async function saveProductMedia(
    trx: Knex.Transaction,
    productId: number,
    media: NonNullable<ProductInput['media']>
) {
    await trx('vsq_product_media').where({ product_id: productId }).delete();
    for (const [index, item] of media.entries()) {
        const [mediaId] = await trx('vsq_media_assets').insert({
            public_id: crypto.randomUUID(),
            kind: 'IMAGE',
            status: 'READY',
            public_url: item.url.trim(),
            source_url: item.url.trim(),
            source_system: 'ADMIN',
            alt_text: item.alt_text?.trim() || null,
            created_at: new Date(),
            updated_at: new Date()
        });
        await trx('vsq_product_media').insert({
            product_id: productId,
            media_asset_id: mediaId,
            role: item.role || (index === 0 ? 'FEATURED' : 'GALLERY'),
            position: item.position ?? index
        });
    }
}

export default class CommerceAdminService {
    static async products(query: Record<string, unknown>) {
        const { page, limit } = pageValues(query);
        const dbQuery = knexInstance('vsq_products as p')
            .leftJoin('vsq_product_variants as v', function () {
                this.on('v.product_id', '=', 'p.id').andOnNull('v.deleted_at');
            })
            .leftJoin('vsq_variant_prices as vp', function () {
                this.on('vp.variant_id', '=', 'v.id')
                    .andOn('vp.price_list_id', '=', knexInstance.raw('(SELECT id FROM vsq_price_lists WHERE code = ? LIMIT 1)', ['INR_DEFAULT']));
            })
            .select(
                'p.id', 'p.public_id', 'p.slug', 'p.title', 'p.vendor', 'p.product_type', 'p.status',
                'p.published_at', 'p.created_at', 'p.updated_at',
                knexInstance.raw('COUNT(DISTINCT v.id) as variant_count'),
                knexInstance.raw('MIN(vp.amount) as minimum_price'),
                knexInstance.raw('MAX(vp.amount) as maximum_price')
            )
            .whereNull('p.deleted_at')
            .groupBy('p.id');

        if (String(query.search || '').trim()) {
            const search = `%${String(query.search).trim()}%`;
            dbQuery.where((builder) => builder.whereLike('p.title', search).orWhereLike('p.slug', search).orWhereLike('p.vendor', search));
        }
        if (String(query.status || '').trim()) dbQuery.where('p.status', String(query.status));

        const totalRow = await knexInstance('vsq_products').whereNull('deleted_at').count({ total: 'id' }).first();
        const products = await dbQuery.orderBy('p.id', 'desc').limit(limit).offset((page - 1) * limit);
        return {
            products: products.map((product) => ({
                ...product,
                id: Number(product.id),
                variant_count: Number(product.variant_count || 0),
                minimum_price: product.minimum_price === null ? null : Number(product.minimum_price),
                maximum_price: product.maximum_price === null ? null : Number(product.maximum_price)
            })),
            pagination: { page, limit, total: Number(totalRow?.total || 0) }
        };
    }

    static async product(publicId: string) {
        const product = await knexInstance('vsq_products').where({ public_id: publicId }).whereNull('deleted_at').first();
        if (!product) return null;
        const [variants, media, categories, collections] = await Promise.all([
            knexInstance('vsq_product_variants as v')
                .leftJoin('vsq_variant_prices as vp', function () {
                    this.on('vp.variant_id', '=', 'v.id')
                        .andOn('vp.price_list_id', '=', knexInstance.raw('(SELECT id FROM vsq_price_lists WHERE code = ? LIMIT 1)', ['INR_DEFAULT']));
                })
                .leftJoin('vsq_inventory_levels as il', function () {
                    this.on('il.variant_id', '=', 'v.id')
                        .andOn('il.location_id', '=', knexInstance.raw('(SELECT id FROM vsq_inventory_locations WHERE code = ? LIMIT 1)', ['PRIMARY']));
                })
                .select('v.*', 'vp.amount as price', 'vp.compare_at_amount as compare_at_price', 'il.on_hand as inventory_quantity')
                .where('v.product_id', product.id)
                .whereNull('v.deleted_at')
                .orderBy('v.id', 'asc'),
            knexInstance('vsq_product_media as pm')
                .join('vsq_media_assets as ma', 'ma.id', 'pm.media_asset_id')
                .select('ma.public_id', 'ma.public_url as url', 'ma.alt_text', 'pm.role', 'pm.position')
                .where('pm.product_id', product.id)
                .orderBy('pm.position', 'asc'),
            knexInstance('vsq_product_categories as pc')
                .join('vsq_categories as c', 'c.id', 'pc.category_id')
                .select('c.public_id')
                .where('pc.product_id', product.id),
            knexInstance('vsq_collection_products as cp')
                .join('vsq_collections as c', 'c.id', 'cp.collection_id')
                .select('c.public_id')
                .where('cp.product_id', product.id)
        ]);
        const variantIds = variants.map((variant) => variant.id);
        const optionRows = variantIds.length
            ? await knexInstance('vsq_variant_option_values as vov')
                .join('vsq_product_option_values as pov', 'pov.id', 'vov.product_option_value_id')
                .join('vsq_product_options as po', 'po.id', 'pov.product_option_id')
                .select('vov.variant_id', 'po.name', 'pov.value', 'pov.swatch_value')
                .whereIn('vov.variant_id', variantIds)
            : [];
        return {
            ...product,
            tags: typeof product.tags === 'string' ? JSON.parse(product.tags) : product.tags,
            variants: variants.map((variant) => ({
                ...variant,
                price: Number(variant.price || 0),
                compare_at_price: variant.compare_at_price === null ? null : Number(variant.compare_at_price),
                inventory_quantity: Number(variant.inventory_quantity || 0),
                selected_options: optionRows
                    .filter((option) => Number(option.variant_id) === Number(variant.id))
                    .map((option) => ({ name: option.name, value: option.value, swatch_value: option.swatch_value }))
            })),
            media,
            category_public_ids: categories.map((category) => category.public_id),
            collection_public_ids: collections.map((collection) => collection.public_id)
        };
    }

    static async saveProduct(input: ProductInput, actorId: number) {
        return knexInstance.transaction(async (trx) => {
            const now = new Date();
            let product = input.public_id
                ? await trx('vsq_products').where({ public_id: input.public_id }).whereNull('deleted_at').forUpdate().first()
                : null;
            const status = input.status || product?.status || 'DRAFT';
            const slug = slugify(input.slug || input.title);
            if (!slug) throw new CommerceAdminError('Product slug is required', 422);

            const conflictingSlug = await trx('vsq_products')
                .select('id')
                .where({ slug })
                .modify((builder) => {
                    if (product?.id) builder.whereNot({ id: product.id });
                })
                .first();
            if (conflictingSlug) throw new CommerceAdminError('Product slug already exists', 409);

            const payload = {
                slug,
                title: input.title.trim(),
                description_html: input.description_html || null,
                description_text: input.description_text || null,
                vendor: input.vendor?.trim() || null,
                product_type: input.product_type?.trim() || null,
                tags: JSON.stringify(input.tags || []),
                status,
                seo_title: input.seo_title?.trim() || null,
                seo_description: input.seo_description?.trim() || null,
                published_at: status === 'ACTIVE' ? product?.published_at || now : null,
                updated_at: now
            };

            if (product) {
                await trx('vsq_products').where({ id: product.id }).update({ ...payload, version: trx.raw('version + 1') });
            } else {
                const [productId] = await trx('vsq_products').insert({
                    public_id: crypto.randomUUID(),
                    ...payload,
                    created_at: now
                });
                product = await trx('vsq_products').where({ id: productId }).first();
            }

            const priceList = await trx('vsq_price_lists').where({ code: 'INR_DEFAULT' }).first();
            const location = await trx('vsq_inventory_locations').where({ code: 'PRIMARY' }).first();
            if (!priceList || !location) throw new CommerceAdminError('Default price list or inventory location is missing', 500);

            const retainedVariantIds: number[] = [];
            for (const variantInput of input.variants || []) {
                let variant = variantInput.public_id
                    ? await trx('vsq_product_variants').where({ public_id: variantInput.public_id, product_id: product!.id }).first()
                    : null;
                const variantPayload = {
                    product_id: product!.id,
                    title: variantInput.title.trim(),
                    sku: variantInput.sku?.trim() || null,
                    barcode: variantInput.barcode?.trim() || null,
                    status: variantInput.status || 'ACTIVE',
                    updated_at: now,
                    deleted_at: null
                };
                if (variant) {
                    await trx('vsq_product_variants').where({ id: variant.id }).update({
                        ...variantPayload,
                        version: trx.raw('version + 1')
                    });
                } else {
                    const [variantId] = await trx('vsq_product_variants').insert({
                        public_id: crypto.randomUUID(),
                        ...variantPayload,
                        created_at: now
                    });
                    variant = { id: variantId };
                }
                retainedVariantIds.push(Number(variant.id));

                await trx('vsq_variant_prices')
                    .insert({
                        price_list_id: priceList.id,
                        variant_id: variant.id,
                        amount: Number(variantInput.price),
                        compare_at_amount: variantInput.compare_at_price ?? null,
                        min_quantity: 1,
                        created_at: now,
                        updated_at: now
                    })
                    .onConflict(['price_list_id', 'variant_id', 'min_quantity'])
                    .merge({
                        amount: Number(variantInput.price),
                        compare_at_amount: variantInput.compare_at_price ?? null,
                        updated_at: now
                    });

                const inventoryQuantity = Math.max(0, Number(variantInput.inventory_quantity || 0));
                await trx('vsq_inventory_levels')
                    .insert({
                        variant_id: variant.id,
                        location_id: location.id,
                        on_hand: inventoryQuantity,
                        reserved: 0,
                        safety_stock: 0,
                        version: 1,
                        updated_at: now
                    })
                    .onConflict(['variant_id', 'location_id'])
                    .merge({ on_hand: inventoryQuantity, updated_at: now, version: trx.raw('version + 1') });
                await saveVariantOptions(trx, Number(product!.id), Number(variant.id), variantInput.selected_options);
            }

            if (input.variants) {
                const removedVariants = trx('vsq_product_variants')
                    .where({ product_id: product!.id })
                    .whereNull('deleted_at');
                if (retainedVariantIds.length) removedVariants.whereNotIn('id', retainedVariantIds);
                await removedVariants.update({ status: 'ARCHIVED', deleted_at: now, updated_at: now, version: trx.raw('version + 1') });
            }

            if (input.category_public_ids) {
                const categories = input.category_public_ids.length
                    ? await trx('vsq_categories').select('id').whereIn('public_id', input.category_public_ids)
                    : [];
                if (categories.length !== new Set(input.category_public_ids).size) throw new CommerceAdminError('One or more categories were not found', 422);
                await trx('vsq_product_categories').where({ product_id: product!.id }).delete();
                if (categories.length) await trx('vsq_product_categories').insert(categories.map((category, index) => ({
                    product_id: product!.id,
                    category_id: category.id,
                    is_primary: index === 0,
                    sort_order: index
                })));
            }

            if (input.collection_public_ids) {
                const collections = input.collection_public_ids.length
                    ? await trx('vsq_collections').select('id').whereIn('public_id', input.collection_public_ids)
                    : [];
                if (collections.length !== new Set(input.collection_public_ids).size) throw new CommerceAdminError('One or more collections were not found', 422);
                await trx('vsq_collection_products').where({ product_id: product!.id }).delete();
                if (collections.length) await trx('vsq_collection_products').insert(collections.map((collection, index) => ({
                    product_id: product!.id,
                    collection_id: collection.id,
                    sort_order: index
                })));
            }

            if (input.media) await saveProductMedia(trx, Number(product!.id), input.media);
            await trx('vsq_outbox_events').insert({
                event_key: `product.saved:${product!.public_id}:${Date.now()}`,
                aggregate_type: 'PRODUCT',
                aggregate_id: product!.public_id,
                event_type: 'commerce.product.saved',
                event_version: 1,
                payload: JSON.stringify({ product_public_id: product!.public_id, actor_id: actorId }),
                occurred_at: now
            });
            return this.product(product!.public_id);
        });
    }

    static async taxonomy() {
        const [categories, collections] = await Promise.all([
            knexInstance('vsq_categories as c')
                .leftJoin('vsq_product_categories as pc', 'pc.category_id', 'c.id')
                .select('c.*')
                .countDistinct({ product_count: 'pc.product_id' })
                .groupBy('c.id')
                .orderBy('c.sort_order', 'asc')
                .orderBy('c.name', 'asc'),
            knexInstance('vsq_collections as c')
                .leftJoin('vsq_collection_products as cp', 'cp.collection_id', 'c.id')
                .select('c.*')
                .countDistinct({ product_count: 'cp.product_id' })
                .groupBy('c.id')
                .orderBy('c.title', 'asc')
        ]);
        return {
            categories: categories.map((item) => ({ ...item, product_count: Number(item.product_count || 0) })),
            collections: collections.map((item) => ({ ...item, product_count: Number(item.product_count || 0) }))
        };
    }

    static async saveCategory(input: Record<string, unknown>, publicId?: string) {
        return knexInstance.transaction(async (trx) => {
            const current = publicId ? await trx('vsq_categories').where({ public_id: publicId }).forUpdate().first() : null;
            if (publicId && !current) throw new CommerceAdminError('Category not found', 404);
            const name = String(input.name || '').trim();
            const slug = slugify(String(input.slug || name));
            if (!name || !slug) throw new CommerceAdminError('Category name and slug are required', 422);
            const conflict = await trx('vsq_categories').where({ slug }).modify((builder) => { if (current) builder.whereNot({ id: current.id }); }).first();
            if (conflict) throw new CommerceAdminError('Category slug already exists', 409);
            const payload = {
                name,
                slug,
                description: String(input.description || '').trim() || null,
                status: String(input.status || current?.status || 'DRAFT'),
                sort_order: Number(input.sort_order || 0),
                updated_at: new Date()
            };
            if (current) await trx('vsq_categories').where({ id: current.id }).update(payload);
            else {
                const [id] = await trx('vsq_categories').insert({ public_id: crypto.randomUUID(), ...payload, created_at: new Date() });
                return trx('vsq_categories').where({ id }).first();
            }
            return trx('vsq_categories').where({ id: current.id }).first();
        });
    }

    static async saveCollection(input: Record<string, unknown>, publicId?: string) {
        return knexInstance.transaction(async (trx) => {
            const current = publicId ? await trx('vsq_collections').where({ public_id: publicId }).forUpdate().first() : null;
            if (publicId && !current) throw new CommerceAdminError('Collection not found', 404);
            const title = String(input.title || '').trim();
            const slug = slugify(String(input.slug || title));
            if (!title || !slug) throw new CommerceAdminError('Collection title and slug are required', 422);
            const conflict = await trx('vsq_collections').where({ slug }).modify((builder) => { if (current) builder.whereNot({ id: current.id }); }).first();
            if (conflict) throw new CommerceAdminError('Collection slug already exists', 409);
            const payload = {
                title,
                slug,
                description: String(input.description || '').trim() || null,
                kind: 'MANUAL',
                status: String(input.status || current?.status || 'DRAFT'),
                updated_at: new Date()
            };
            if (current) await trx('vsq_collections').where({ id: current.id }).update(payload);
            else {
                const [id] = await trx('vsq_collections').insert({ public_id: crypto.randomUUID(), ...payload, created_at: new Date() });
                return trx('vsq_collections').where({ id }).first();
            }
            return trx('vsq_collections').where({ id: current.id }).first();
        });
    }

    static async deleteTaxonomy(type: 'categories' | 'collections', publicId: string) {
        const table = type === 'categories' ? 'vsq_categories' : 'vsq_collections';
        const removed = await knexInstance(table).where({ public_id: publicId }).delete();
        if (!removed) throw new CommerceAdminError(type === 'categories' ? 'Category not found' : 'Collection not found', 404);
        return true;
    }

    static async customers(query: Record<string, unknown>) {
        const { page, limit } = pageValues(query);
        const dbQuery = knexInstance('vsq_customers as c')
            .leftJoin('vsq_orders as o', 'o.customer_id', 'c.id')
            .select('c.id', 'c.public_id', 'c.email', 'c.phone', 'c.first_name', 'c.last_name', 'c.status', 'c.last_login_at', 'c.created_at')
            .countDistinct({ order_count: 'o.id' })
            .sum({ lifetime_value: 'o.grand_total' })
            .whereNull('c.deleted_at')
            .groupBy('c.id');
        if (String(query.search || '').trim()) {
            const search = `%${String(query.search).trim()}%`;
            dbQuery.where((builder) => builder.whereLike('c.email', search).orWhereLike('c.phone', search).orWhereLike('c.first_name', search).orWhereLike('c.last_name', search));
        }
        const total = await knexInstance('vsq_customers').whereNull('deleted_at').count({ total: 'id' }).first();
        const rows = await dbQuery.orderBy('c.id', 'desc').limit(limit).offset((page - 1) * limit);
        return {
            customers: rows.map((row) => ({ ...row, order_count: Number(row.order_count || 0), lifetime_value: Number(row.lifetime_value || 0) })),
            pagination: { page, limit, total: Number(total?.total || 0) }
        };
    }

    static async shippingSettings() {
        const [methods, zones, rates] = await Promise.all([
            knexInstance('vsq_shipping_methods').select('*').orderBy('id', 'asc'),
            knexInstance('vsq_shipping_zones').select('*').orderBy('priority', 'asc'),
            knexInstance('vsq_shipping_rates as r')
                .join('vsq_shipping_zones as z', 'z.id', 'r.zone_id')
                .join('vsq_shipping_methods as m', 'm.id', 'r.method_id')
                .select('r.*', 'z.name as zone_name', 'm.code as method_code', 'm.name as method_name')
        ]);
        return { methods, zones, rates: rates.map((rate) => ({ ...rate, amount: Number(rate.amount), free_above_amount: rate.free_above_amount === null ? null : Number(rate.free_above_amount) })) };
    }

    static async updateShippingRate(id: number, input: Record<string, unknown>) {
        const rate = await knexInstance('vsq_shipping_rates').where({ id }).first();
        if (!rate) throw new CommerceAdminError('Shipping rate not found', 404);
        await knexInstance('vsq_shipping_rates').where({ id }).update({
            amount: Math.max(0, Number(input.amount)),
            free_above_amount: input.free_above_amount === null || input.free_above_amount === '' ? null : Math.max(0, Number(input.free_above_amount)),
            status: String(input.status || rate.status),
            updated_at: new Date()
        });
        return knexInstance('vsq_shipping_rates').where({ id }).first();
    }

    static async orders(query: Record<string, unknown>) {
        const { page, limit } = pageValues(query);
        const dbQuery = knexInstance('vsq_orders as o')
            .leftJoin('vsq_customers as c', 'c.id', 'o.customer_id')
            .select('o.*', 'c.public_id as customer_public_id', 'c.first_name', 'c.last_name');
        if (String(query.search || '').trim()) {
            const search = `%${String(query.search).trim()}%`;
            dbQuery.where((builder) => builder.whereLike('o.order_number', search).orWhereLike('o.email_snapshot', search));
        }
        if (String(query.order_status || '').trim()) dbQuery.where('o.order_status', String(query.order_status));
        if (String(query.financial_status || '').trim()) dbQuery.where('o.financial_status', String(query.financial_status));
        if (String(query.fulfillment_status || '').trim()) dbQuery.where('o.fulfillment_status', String(query.fulfillment_status));
        const totalRow = await dbQuery.clone().clearSelect().clearOrder().count({ total: 'o.id' }).first();
        const orders = await dbQuery.orderBy('o.placed_at', 'desc').limit(limit).offset((page - 1) * limit);
        return {
            orders: orders.map((order) => ({
                ...order,
                subtotal: Number(order.subtotal),
                shipping_total: Number(order.shipping_total),
                tax_total: Number(order.tax_total),
                grand_total: Number(order.grand_total)
            })),
            pagination: { page, limit, total: Number(totalRow?.total || 0) }
        };
    }

    static async order(publicId: string) {
        const row = await knexInstance('vsq_orders').select('id').where({ public_id: publicId }).first();
        return row ? CommerceCheckoutService.adminOrderById(Number(row.id)) : null;
    }

    static async confirmManualPayment(publicId: string, actorId: number, note?: string) {
        return knexInstance.transaction(async (trx) => {
            const order = await trx('vsq_orders').where({ public_id: publicId }).forUpdate().first();
            if (!order) throw new CommerceAdminError('Order not found', 404);
            if (order.financial_status === 'PAID') return CommerceCheckoutService.adminOrderById(Number(order.id), trx);
            if (!['MANUAL', 'COD'].includes(order.payment_method)) throw new CommerceAdminError('This payment method cannot be confirmed manually', 409);

            const now = new Date();
            if (order.payment_method === 'COD') {
                const payment = await trx('vsq_payment_attempts').where({ order_id: order.id, method: 'COD' }).orderBy('id', 'desc').first();
                if (!payment) throw new CommerceAdminError('COD payment attempt was not found', 409);
                await trx('vsq_payment_attempts').where({ id: payment.id }).update({ status: 'CAPTURED', updated_at: now });
                await trx('vsq_payment_transactions').insert({
                    public_id: crypto.randomUUID(),
                    payment_attempt_id: payment.id,
                    type: 'CAPTURE',
                    status: 'SUCCEEDED',
                    provider_transaction_id: `COD-${order.order_number}`,
                    amount: order.grand_total,
                    currency: order.currency,
                    processed_at: now,
                    provider_metadata: JSON.stringify({ note: note || 'Cash collected', actor_id: actorId }),
                    created_at: now,
                    updated_at: now
                });
                await trx('vsq_orders').where({ id: order.id }).update({ financial_status: 'PAID', paid_at: now, updated_at: now, version: trx.raw('version + 1') });
                await trx('vsq_order_status_history').insert({
                    order_id: order.id,
                    status_type: 'FINANCIAL',
                    from_status: order.financial_status,
                    to_status: 'PAID',
                    reason: note || 'Cash on delivery collected',
                    actor_id: actorId,
                    actor_type: 'ADMIN',
                    created_at: now
                });
                return CommerceCheckoutService.adminOrderById(Number(order.id), trx);
            }

            const reservations = await trx('vsq_inventory_reservations')
                .where({ order_id: order.id, status: 'ACTIVE' })
                .forUpdate();
            if (!reservations.length) throw new CommerceAdminError('Active inventory reservation was not found', 409);
            for (const reservation of reservations) {
                const level = await trx('vsq_inventory_levels')
                    .where({ variant_id: reservation.variant_id, location_id: reservation.location_id })
                    .forUpdate()
                    .first();
                if (!level || Number(level.reserved) < Number(reservation.quantity) || Number(level.on_hand) < Number(reservation.quantity)) {
                    throw new CommerceAdminError('Reserved inventory is no longer available', 409);
                }
                const balanceAfter = Number(level.on_hand) - Number(reservation.quantity);
                await trx('vsq_inventory_levels')
                    .where({ variant_id: reservation.variant_id, location_id: reservation.location_id })
                    .update({
                        on_hand: balanceAfter,
                        reserved: Number(level.reserved) - Number(reservation.quantity),
                        version: trx.raw('version + 1'),
                        updated_at: now
                    });
                await trx('vsq_inventory_movements').insert({
                    variant_id: reservation.variant_id,
                    location_id: reservation.location_id,
                    type: 'SALE',
                    quantity_delta: -Number(reservation.quantity),
                    balance_after: balanceAfter,
                    reference_type: 'ORDER',
                    reference_id: order.public_id,
                    reason: note || 'Manual payment confirmed',
                    actor_id: actorId,
                    actor_type: 'ADMIN',
                    created_at: now
                });
            }
            await trx('vsq_inventory_reservations').whereIn('id', reservations.map((row) => row.id)).update({ status: 'CONSUMED', updated_at: now });
            const payment = await trx('vsq_payment_attempts').where({ order_id: order.id, method: 'MANUAL' }).orderBy('id', 'desc').first();
            if (!payment) throw new CommerceAdminError('Payment attempt was not found', 409);
            await trx('vsq_payment_attempts').where({ id: payment.id }).update({ status: 'CAPTURED', updated_at: now });
            await trx('vsq_payment_transactions').insert({
                public_id: crypto.randomUUID(),
                payment_attempt_id: payment.id,
                type: 'CAPTURE',
                status: 'SUCCEEDED',
                provider_transaction_id: `MANUAL-${order.order_number}`,
                amount: order.grand_total,
                currency: order.currency,
                processed_at: now,
                provider_metadata: JSON.stringify({ note: note || null, actor_id: actorId }),
                created_at: now,
                updated_at: now
            });
            await trx('vsq_orders').where({ id: order.id }).update({
                financial_status: 'PAID',
                order_status: 'CONFIRMED',
                paid_at: now,
                updated_at: now,
                version: trx.raw('version + 1')
            });
            await trx('vsq_order_status_history').insert([
                { order_id: order.id, status_type: 'FINANCIAL', from_status: order.financial_status, to_status: 'PAID', reason: note || null, actor_id: actorId, actor_type: 'ADMIN', created_at: now },
                { order_id: order.id, status_type: 'ORDER', from_status: order.order_status, to_status: 'CONFIRMED', reason: note || null, actor_id: actorId, actor_type: 'ADMIN', created_at: now }
            ]);
            return CommerceCheckoutService.adminOrderById(Number(order.id), trx);
        });
    }

    static async cancelOrder(publicId: string, actorId: number, reason?: string) {
        return knexInstance.transaction(async (trx) => {
            const order = await trx('vsq_orders').where({ public_id: publicId }).forUpdate().first();
            if (!order) throw new CommerceAdminError('Order not found', 404);
            if (order.order_status === 'CANCELLED') return CommerceCheckoutService.adminOrderById(Number(order.id), trx);
            const shipped = await trx('vsq_shipments').where({ order_id: order.id }).whereIn('status', ['SHIPPED', 'DELIVERED']).first();
            if (shipped) throw new CommerceAdminError('A shipped order cannot be cancelled', 409);
            const reservations = await trx('vsq_inventory_reservations').where({ order_id: order.id }).forUpdate();
            const now = new Date();
            for (const reservation of reservations) {
                if (reservation.status === 'ACTIVE') {
                    await trx('vsq_inventory_levels').where({ variant_id: reservation.variant_id, location_id: reservation.location_id }).update({
                        reserved: trx.raw('GREATEST(0, reserved - ?)', [Number(reservation.quantity)]),
                        version: trx.raw('version + 1'), updated_at: now
                    });
                } else if (reservation.status === 'CONSUMED') {
                    await trx('vsq_inventory_levels').where({ variant_id: reservation.variant_id, location_id: reservation.location_id }).update({
                        on_hand: trx.raw('on_hand + ?', [Number(reservation.quantity)]),
                        version: trx.raw('version + 1'), updated_at: now
                    });
                    const level = await trx('vsq_inventory_levels').where({ variant_id: reservation.variant_id, location_id: reservation.location_id }).first();
                    await trx('vsq_inventory_movements').insert({
                        variant_id: reservation.variant_id,
                        location_id: reservation.location_id,
                        type: 'CANCELLATION_RESTOCK',
                        quantity_delta: Number(reservation.quantity),
                        balance_after: Number(level?.on_hand || 0),
                        reference_type: 'ORDER',
                        reference_id: order.public_id,
                        reason: reason || 'Order cancelled',
                        actor_id: actorId,
                        actor_type: 'ADMIN',
                        created_at: now
                    });
                }
            }
            await trx('vsq_inventory_reservations').where({ order_id: order.id }).whereIn('status', ['ACTIVE', 'CONSUMED']).update({ status: 'RELEASED', updated_at: now });
            const financialStatus = order.financial_status === 'PAID' ? 'REFUND_PENDING' : 'VOIDED';
            await trx('vsq_payment_attempts').where({ order_id: order.id }).whereIn('status', ['PENDING', 'PENDING_COLLECTION']).update({ status: 'CANCELLED', updated_at: now });
            await trx('vsq_orders').where({ id: order.id }).update({
                order_status: 'CANCELLED', financial_status: financialStatus,
                cancel_reason: reason || 'Cancelled by admin', cancelled_at: now, updated_at: now,
                version: trx.raw('version + 1')
            });
            await trx('vsq_order_status_history').insert({
                order_id: order.id, status_type: 'ORDER', from_status: order.order_status, to_status: 'CANCELLED',
                reason: reason || 'Cancelled by admin', actor_id: actorId, actor_type: 'ADMIN', created_at: now
            });
            return CommerceCheckoutService.adminOrderById(Number(order.id), trx);
        });
    }

    static async createShipment(
        publicId: string,
        input: { courier_name?: string; tracking_number?: string; tracking_url?: string; items?: Array<{ order_item_id: number; quantity: number }> },
        actorId: number
    ) {
        return knexInstance.transaction(async (trx) => {
            const order = await trx('vsq_orders').where({ public_id: publicId }).forUpdate().first();
            if (!order) throw new CommerceAdminError('Order not found', 404);
            if (order.financial_status !== 'PAID' && order.payment_method !== 'COD') {
                throw new CommerceAdminError('Order must be paid or COD before fulfillment', 409);
            }
            const orderItems = await trx('vsq_order_items').where({ order_id: order.id }).forUpdate();
            const requested = input.items?.length
                ? input.items
                : orderItems
                    .map((item) => ({ order_item_id: Number(item.id), quantity: Number(item.quantity) - Number(item.fulfilled_quantity) }))
                    .filter((item) => item.quantity > 0);
            if (!requested.length) throw new CommerceAdminError('There are no items left to fulfill', 409);

            for (const item of requested) {
                const orderItem = orderItems.find((row) => Number(row.id) === Number(item.order_item_id));
                if (!orderItem || item.quantity <= 0 || Number(orderItem.fulfilled_quantity) + item.quantity > Number(orderItem.quantity)) {
                    throw new CommerceAdminError('Shipment item quantity is invalid', 422);
                }
            }

            const now = new Date();
            const [shipmentId] = await trx('vsq_shipments').insert({
                public_id: crypto.randomUUID(),
                order_id: order.id,
                provider: 'MANUAL',
                courier_name: input.courier_name?.trim() || null,
                tracking_number: input.tracking_number?.trim() || null,
                tracking_url: input.tracking_url?.trim() || null,
                status: input.tracking_number ? 'SHIPPED' : 'PENDING',
                shipped_at: input.tracking_number ? now : null,
                created_at: now,
                updated_at: now
            });
            for (const item of requested) {
                await trx('vsq_shipment_items').insert({ shipment_id: shipmentId, order_item_id: item.order_item_id, quantity: item.quantity });
                await trx('vsq_order_items').where({ id: item.order_item_id }).update({
                    fulfilled_quantity: trx.raw('fulfilled_quantity + ?', [item.quantity]),
                    updated_at: now
                });
            }
            await trx('vsq_shipment_events').insert({
                shipment_id: shipmentId,
                status: input.tracking_number ? 'SHIPPED' : 'PENDING',
                description: input.tracking_number ? 'Shipment created and marked shipped' : 'Shipment created',
                occurred_at: now,
                created_at: now
            });

            const refreshedItems = await trx('vsq_order_items').where({ order_id: order.id });
            const fullyFulfilled = refreshedItems.every((item) => Number(item.fulfilled_quantity) >= Number(item.quantity));
            const fulfillmentStatus = fullyFulfilled ? 'FULFILLED' : 'PARTIALLY_FULFILLED';
            await trx('vsq_orders').where({ id: order.id }).update({
                fulfillment_status: fulfillmentStatus,
                order_status: fullyFulfilled ? 'COMPLETED' : 'PROCESSING',
                updated_at: now,
                version: trx.raw('version + 1')
            });
            await trx('vsq_order_status_history').insert({
                order_id: order.id,
                status_type: 'FULFILLMENT',
                from_status: order.fulfillment_status,
                to_status: fulfillmentStatus,
                reason: 'Manual shipment created',
                actor_id: actorId,
                actor_type: 'ADMIN',
                created_at: now
            });
            return CommerceCheckoutService.adminOrderById(Number(order.id), trx);
        });
    }
}
