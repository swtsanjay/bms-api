import { Request as ExpressRequest, Response as ExpressResponse } from 'express';
import { Knex } from 'knex';
import Response from '../../../../lib/api-response';
import { Message } from '../../../../lib/Messages';

export default class WishlistController {
    static async list(req: ExpressRequest, res: ExpressResponse) {
        try {
            const userId = Number((req as any).user?.id);
            const items = await knexInstance('wishlists')
                .select('*')
                .where({ user_id: userId })
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

    static async toggle(req: ExpressRequest, res: ExpressResponse) {
        const t = req.transaction as Knex.Transaction;
        try {
            const userId = Number((req as any).user?.id);
            const productId = String(req.body.shopify_product_id || '').trim();

            const existing = await t('wishlists')
                .where({ user_id: userId, shopify_product_id: productId })
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
                .where({ user_id: userId, shopify_product_id: productId })
                .whereNotNull('deleted_at')
                .first();

            const payload = {
                user_id: userId,
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
