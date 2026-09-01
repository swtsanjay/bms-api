import crypto from 'crypto';
import type { Knex } from 'knex';

export class CommerceCartError extends Error {
    constructor(message: string, public readonly statusCode: number) {
        super(message);
        this.name = 'CommerceCartError';
    }
}

type CartAccess = {
    customerId?: number | null;
    cartToken?: string | null;
};

function tokenHash(token: string) {
    return crypto.createHash('sha256').update(token).digest('hex');
}

async function currentVariant(trx: Knex | Knex.Transaction, variantPublicId: string) {
    return await trx('vsq_product_variants as v')
        .join('vsq_products as p', 'p.id', 'v.product_id')
        .leftJoin('vsq_variant_prices as vp', function () {
            this.on('vp.variant_id', '=', 'v.id')
                .andOn('vp.price_list_id', '=', trx.raw('(SELECT id FROM vsq_price_lists WHERE code = ? LIMIT 1)', ['INR_DEFAULT']));
        })
        .leftJoin(
            trx('vsq_inventory_levels')
                .select('variant_id')
                .sum({ on_hand: 'on_hand', reserved: 'reserved', safety_stock: 'safety_stock' })
                .groupBy('variant_id')
                .as('stock'),
            'stock.variant_id',
            'v.id'
        )
        .select(
            'v.id',
            'v.public_id',
            'v.title as variant_title',
            'v.sku',
            'p.title as product_title',
            'p.slug as product_slug',
            'vp.amount as price',
            'vp.compare_at_amount as compare_at_price',
            'stock.on_hand',
            'stock.reserved',
            'stock.safety_stock'
        )
        .where('v.public_id', variantPublicId)
        .where('v.status', 'ACTIVE')
        .whereNull('v.deleted_at')
        .where('p.status', 'ACTIVE')
        .whereNotNull('p.published_at')
        .whereNull('p.deleted_at')
        .first();
}

async function cartRow(trx: Knex | Knex.Transaction, publicId: string, lock = false) {
    let query = trx('vsq_carts').where({ public_id: publicId }).first();
    if (lock && 'forUpdate' in query) query = query.forUpdate();
    return await query;
}

function assertAccess(cart: Record<string, any> | undefined, access: CartAccess) {
    if (!cart || cart.status !== 'ACTIVE') {
        throw new CommerceCartError('Cart not found or no longer active', 404);
    }
    if (cart.customer_id) {
        if (!access.customerId || Number(access.customerId) !== Number(cart.customer_id)) {
            throw new CommerceCartError('Cart access denied', 403);
        }
        return;
    }
    if (!access.cartToken || tokenHash(access.cartToken) !== cart.anonymous_token_hash) {
        throw new CommerceCartError('Cart access denied', 403);
    }
}

async function recalculate(trx: Knex.Transaction, cartId: number) {
    const total = await trx('vsq_cart_items')
        .where({ cart_id: cartId })
        .sum({ subtotal: 'line_total' })
        .first();
    const subtotal = Number(total?.subtotal || 0);
    await trx('vsq_carts').where({ id: cartId }).update({
        subtotal,
        grand_total: subtotal,
        updated_at: new Date(),
        version: trx.raw('version + 1')
    });
}

async function serializeCart(cart: Record<string, any>) {
    const rows = await knexInstance('vsq_cart_items as ci')
        .join('vsq_product_variants as v', 'v.id', 'ci.variant_id')
        .join('vsq_products as p', 'p.id', 'v.product_id')
        .leftJoin('vsq_variant_media as vm', function () {
            this.on('vm.variant_id', '=', 'v.id').andOn('vm.position', '=', knexInstance.raw('0'));
        })
        .leftJoin('vsq_media_assets as vma', 'vma.id', 'vm.media_asset_id')
        .leftJoin('vsq_product_media as pm', function () {
            this.on('pm.product_id', '=', 'p.id').andOn('pm.position', '=', knexInstance.raw('0'));
        })
        .leftJoin('vsq_media_assets as pma', 'pma.id', 'pm.media_asset_id')
        .select(
            'ci.id',
            'ci.quantity',
            'ci.unit_price',
            'ci.line_total',
            'ci.currency',
            'v.public_id as variant_public_id',
            'v.title as variant_title',
            'v.sku',
            'p.public_id as product_public_id',
            'p.title as product_title',
            'p.slug as product_slug',
            knexInstance.raw('COALESCE(vma.public_url, pma.public_url) as image_url')
        )
        .where('ci.cart_id', cart.id)
        .orderBy('ci.id', 'asc');

    return {
        public_id: cart.public_id,
        status: cart.status,
        currency: cart.currency,
        subtotal: Number(cart.subtotal || 0),
        discount_total: Number(cart.discount_total || 0),
        tax_total: Number(cart.tax_total || 0),
        grand_total: Number(cart.grand_total || 0),
        expires_at: cart.expires_at,
        version: Number(cart.version),
        items: rows.map((row) => ({
            id: Number(row.id),
            quantity: Number(row.quantity),
            unit_price: Number(row.unit_price),
            line_total: Number(row.line_total),
            currency: row.currency,
            variant: {
                public_id: row.variant_public_id,
                title: row.variant_title,
                sku: row.sku
            },
            product: {
                public_id: row.product_public_id,
                title: row.product_title,
                slug: row.product_slug,
                image_url: row.image_url
            }
        }))
    };
}

export default class CommerceCartService {
    static async create(customerId?: number | null) {
        const publicId = crypto.randomUUID();
        const rawToken = customerId ? null : crypto.randomBytes(32).toString('base64url');
        const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
        const now = new Date();
        await knexInstance('vsq_carts').insert({
            public_id: publicId,
            customer_id: customerId || null,
            anonymous_token_hash: rawToken ? tokenHash(rawToken) : null,
            currency: 'INR',
            channel: 'WEB',
            status: 'ACTIVE',
            expires_at: expiresAt,
            created_at: now,
            updated_at: now
        });
        const cart = await knexInstance('vsq_carts').where({ public_id: publicId }).first();
        return { cart: await serializeCart(cart), cartToken: rawToken };
    }

    static async get(publicId: string, access: CartAccess) {
        const cart = await cartRow(knexInstance, publicId);
        assertAccess(cart, access);
        return serializeCart(cart!);
    }

    static async addItem(publicId: string, variantPublicId: string, quantity: number, access: CartAccess) {
        await knexInstance.transaction(async (trx) => {
            const cart = await cartRow(trx, publicId, true);
            assertAccess(cart, access);
            const variant = await currentVariant(trx, variantPublicId);
            if (!variant || variant.price === null) {
                throw new CommerceCartError('Variant is not available for sale', 422);
            }

            const existing = await trx('vsq_cart_items')
                .where({ cart_id: cart!.id, variant_id: variant.id })
                .first();
            const requestedQuantity = Number(existing?.quantity || 0) + quantity;
            const available = Math.max(
                0,
                Number(variant.on_hand || 0) - Number(variant.reserved || 0) - Number(variant.safety_stock || 0)
            );
            if (requestedQuantity > available) {
                throw new CommerceCartError(`Only ${available} item(s) are available`, 409);
            }

            const now = new Date();
            const unitPrice = Number(variant.price);
            if (existing) {
                await trx('vsq_cart_items').where({ id: existing.id }).update({
                    quantity: requestedQuantity,
                    unit_price: unitPrice,
                    line_total: unitPrice * requestedQuantity,
                    updated_at: now,
                    version: trx.raw('version + 1')
                });
            } else {
                await trx('vsq_cart_items').insert({
                    cart_id: cart!.id,
                    variant_id: variant.id,
                    quantity,
                    unit_price: unitPrice,
                    line_total: unitPrice * quantity,
                    currency: 'INR',
                    created_at: now,
                    updated_at: now
                });
            }
            await recalculate(trx, cart!.id);
        });
        return this.get(publicId, access);
    }

    static async updateItem(publicId: string, itemId: number, quantity: number, access: CartAccess) {
        await knexInstance.transaction(async (trx) => {
            const cart = await cartRow(trx, publicId, true);
            assertAccess(cart, access);
            const item = await trx('vsq_cart_items as ci')
                .join('vsq_product_variants as v', 'v.id', 'ci.variant_id')
                .select('ci.*', 'v.public_id as variant_public_id')
                .where('ci.id', itemId)
                .where('ci.cart_id', cart!.id)
                .first();
            if (!item) throw new CommerceCartError('Cart item not found', 404);

            const variant = await currentVariant(trx, item.variant_public_id);
            if (!variant || variant.price === null) throw new CommerceCartError('Variant is unavailable', 422);
            const available = Math.max(
                0,
                Number(variant.on_hand || 0) - Number(variant.reserved || 0) - Number(variant.safety_stock || 0)
            );
            if (quantity > available) throw new CommerceCartError(`Only ${available} item(s) are available`, 409);

            await trx('vsq_cart_items').where({ id: itemId }).update({
                quantity,
                unit_price: variant.price,
                line_total: Number(variant.price) * quantity,
                updated_at: new Date(),
                version: trx.raw('version + 1')
            });
            await recalculate(trx, cart!.id);
        });
        return this.get(publicId, access);
    }

    static async removeItem(publicId: string, itemId: number, access: CartAccess) {
        await knexInstance.transaction(async (trx) => {
            const cart = await cartRow(trx, publicId, true);
            assertAccess(cart, access);
            const deleted = await trx('vsq_cart_items').where({ id: itemId, cart_id: cart!.id }).delete();
            if (!deleted) throw new CommerceCartError('Cart item not found', 404);
            await recalculate(trx, cart!.id);
        });
        return this.get(publicId, access);
    }

    static async claim(publicId: string, customerId: number, cartToken: string) {
        return knexInstance.transaction(async (trx) => {
            const cart = await cartRow(trx, publicId, true);
            assertAccess(cart, { cartToken });
            await trx('vsq_carts').where({ id: cart!.id }).update({
                customer_id: customerId,
                anonymous_token_hash: null,
                updated_at: new Date()
            });
            return cart!.id as number;
        });
    }
}
