import { Request as ExpressRequest, Response as ExpressResponse } from 'express';
import { Knex } from 'knex';
import Response from '../../../../lib/api-response';
import { Message } from '../../../../lib/Messages';

function getWishlistOwner(req: ExpressRequest) {
    const user = (req as any).user || {};
    if (user.type === 'CUSTOMER') {
        return {
            key: 'customer_id',
            value: Number(user.id)
        };
    }

    return {
        key: 'user_id',
        value: Number(user.id)
    };
}

export default class WishlistController {
    static async list(req: ExpressRequest, res: ExpressResponse) {
        try {
            const owner = getWishlistOwner(req);
            const items = await knexInstance('wishlists')
                .select('*')
                .where(owner.key, owner.value)
                .whereNull('deleted_at')
                .orderBy('id', 'desc');

            return Response.success(res, {
                data: items,
                message: Message.dataFound.message,
                code: Message.dataFound.code,
                success: true
            } as any);
        } catch (error: any) {
            return Response.fail(res, 'Unable to load wishlist', null, 500);
        }
    }

    static async save(req: ExpressRequest, res: ExpressResponse) {
        const t = req.transaction as Knex.Transaction;
        try {
            const userId = Number((req as any).user?.id);
            const owner = getWishlistOwner(req);
            const productId = String(req.body.shopify_product_id || '').trim();

            const existing = await t('wishlists')
                .where(owner.key, owner.value)
                .where({ shopify_product_id: productId })
                .first();

            const payload = {
                user_id: owner.key === 'user_id' ? userId : null,
                customer_id: owner.key === 'customer_id' ? owner.value : null,
                shopify_product_id: productId,
                shopify_product_handle: req.body.shopify_product_handle || null,
                product_title: req.body.product_title || null,
                product_image: req.body.product_image || null,
                updated_at: new Date(),
                deleted_at: null
            };

            if (existing) {
                await t('wishlists').where({ id: existing.id }).update(payload);
            } else {
                await t('wishlists').insert({
                    ...payload,
                    created_at: new Date()
                });
            }

            await t.commit();
            return Response.success(res, {
                data: { wished: true },
                message: 'Added to wishlist',
                code: Message.dataSaved.code,
                success: true
            } as any);
        } catch (error: any) {
            await t.rollback();
            return Response.fail(res, 'Unable to save wishlist', null, 500);
        }
    }

    static async toggle(req: ExpressRequest, res: ExpressResponse) {
        const t = req.transaction as Knex.Transaction;
        try {
            const userId = Number((req as any).user?.id);
            const owner = getWishlistOwner(req);
            const productId = String(req.body.shopify_product_id || '').trim();

            const existing = await t('wishlists')
                .where(owner.key, owner.value)
                .where({ shopify_product_id: productId })
                .whereNull('deleted_at')
                .first();

            if (existing) {
                await t('wishlists')
                    .where({ id: existing.id })
                    .update({
                        deleted_at: new Date(),
                        updated_at: new Date()
                    });
                await t.commit();
                return Response.success(res, {
                    data: { wished: false },
                    message: 'Removed from wishlist',
                    code: Message.dataDeleted.code,
                    success: true
                } as any);
            }

            const deletedExisting = await t('wishlists')
                .where(owner.key, owner.value)
                .where({ shopify_product_id: productId })
                .whereNotNull('deleted_at')
                .first();

            const payload = {
                user_id: owner.key === 'user_id' ? userId : null,
                customer_id: owner.key === 'customer_id' ? owner.value : null,
                shopify_product_id: productId,
                shopify_product_handle: req.body.shopify_product_handle || null,
                product_title: req.body.product_title || null,
                product_image: req.body.product_image || null,
                updated_at: new Date(),
                deleted_at: null
            };

            if (deletedExisting) {
                await t('wishlists').where({ id: deletedExisting.id }).update(payload);
            } else {
                await t('wishlists').insert({
                    ...payload,
                    created_at: new Date()
                });
            }

            await t.commit();
            return Response.success(res, {
                data: { wished: true },
                message: 'Added to wishlist',
                code: Message.dataSaved.code,
                success: true
            } as any);
        } catch (error: any) {
            await t.rollback();
            return Response.fail(res, 'Unable to update wishlist', null, 500);
        }
    }
}
