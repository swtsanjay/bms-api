import { Request as ExpressRequest, Response as ExpressResponse } from 'express';
import { Knex } from 'knex';
import { StatusCodes } from 'http-status-codes';
import Response from '../../../../lib/api-response';
import { Message } from '../../../../lib/Messages';
import SharedShopifyCollectionService from '../../../../shared-services/shopifyCollection';

function getIdParam(req: ExpressRequest): number {
    return Number(req.params.id || req.body.id);
}

function getParam(req: ExpressRequest, key: string): string {
    const value = req.params[key];
    return Array.isArray(value) ? value[0] : String(value || '');
}

function fail(res: ExpressResponse, error: unknown, message = Message.dataNotSaved.message) {
    if (error instanceof Error && 'code' in error) {
        Response.fail(res, error as GError);
        return;
    }

    Response.fail(
        res,
        Response.createError({
            message,
            code: Message.dataNotSaved.code,
            name: Message.dataNotSaved.name
        }, error as GError | Error)
    );
}

export default class ShopifyCollectionsController {
    static async sync(req: ExpressRequest, res: ExpressResponse) {
        try {
            const summary = await SharedShopifyCollectionService.syncProducts();
            Response.success(res, 'Shopify products synced', summary, StatusCodes.OK);
        } catch (error: unknown) {
            fail(res, error, 'Shopify products sync failed');
        }
    }

    static async syncOne(req: ExpressRequest, res: ExpressResponse) {
        try {
            const product = await SharedShopifyCollectionService.syncProduct(getParam(req, 'shopifyProductId'));
            Response.success(res, 'Shopify product synced', product, StatusCodes.OK);
        } catch (error: unknown) {
            fail(res, error, 'Shopify product sync failed');
        }
    }

    static async products(req: ExpressRequest, res: ExpressResponse) {
        try {
            const { data, extra } = await SharedShopifyCollectionService.listProducts({ ...req.query });
            Response.success(res, {
                data,
                message: Message.dataFound.message,
                code: Message.dataFound.code,
                success: true,
                qdata: { ...req.query, ...extra }
            });
        } catch (error: unknown) {
            fail(res, error, Message.dataNotFound.message);
        }
    }

    static async categories(req: ExpressRequest, res: ExpressResponse) {
        try {
            const { data, extra } = await SharedShopifyCollectionService.listCategories({ ...req.query });
            Response.success(res, {
                data,
                message: Message.dataFound.message,
                code: Message.dataFound.code,
                success: true,
                qdata: { ...req.query, ...extra }
            });
        } catch (error: unknown) {
            fail(res, error, Message.dataNotFound.message);
        }
    }

    static async createCategory(req: ExpressRequest, res: ExpressResponse) {
        const t = req.transaction as Knex.Transaction;
        try {
            const category = await SharedShopifyCollectionService.saveCategory(req.body, t);
            await t.commit();
            Response.success(res, Message.dataSaved.message, category, Message.dataSaved.code);
        } catch (error: unknown) {
            await t.rollback();
            fail(res, error);
        }
    }

    static async category(req: ExpressRequest, res: ExpressResponse) {
        try {
            const category = await SharedShopifyCollectionService.getCategory(getIdParam(req));
            Response.success(
                res,
                category ? Message.dataFound.message : Message.dataNotFound.message,
                category,
                category ? Message.dataFound.code : StatusCodes.NOT_FOUND
            );
        } catch (error: unknown) {
            fail(res, error, Message.dataNotFound.message);
        }
    }

    static async categoryBySlug(req: ExpressRequest, res: ExpressResponse) {
        try {
            const category = await SharedShopifyCollectionService.getCategoryBySlug(getParam(req, 'slug'), null, false, true);
            Response.success(
                res,
                category ? Message.dataFound.message : Message.dataNotFound.message,
                category,
                category ? Message.dataFound.code : StatusCodes.NOT_FOUND
            );
        } catch (error: unknown) {
            fail(res, error, Message.dataNotFound.message);
        }
    }

    static async updateCategory(req: ExpressRequest, res: ExpressResponse) {
        const t = req.transaction as Knex.Transaction;
        try {
            const category = await SharedShopifyCollectionService.saveCategory({
                ...req.body,
                id: getIdParam(req)
            }, t);
            await t.commit();
            Response.success(res, Message.dataSaved.message, category, Message.dataSaved.code);
        } catch (error: unknown) {
            await t.rollback();
            fail(res, error);
        }
    }

    static async deleteCategory(req: ExpressRequest, res: ExpressResponse) {
        const t = req.transaction as Knex.Transaction;
        try {
            const id = await SharedShopifyCollectionService.deleteCategory(getIdParam(req), t);
            await t.commit();
            Response.success(res, Message.dataDeleted.message, { id }, Message.dataDeleted.code);
        } catch (error: unknown) {
            await t.rollback();
            fail(res, error);
        }
    }

    static async categoryProducts(req: ExpressRequest, res: ExpressResponse) {
        try {
            const { data, extra } = await SharedShopifyCollectionService.listCategoryProducts(getIdParam(req), { ...req.query });
            Response.success(res, {
                data,
                message: Message.dataFound.message,
                code: Message.dataFound.code,
                success: true,
                qdata: { ...req.query, ...extra }
            });
        } catch (error: unknown) {
            fail(res, error, Message.dataNotFound.message);
        }
    }

    static async addCategoryProducts(req: ExpressRequest, res: ExpressResponse) {
        const t = req.transaction as Knex.Transaction;
        try {
            const products = SharedShopifyCollectionService.normalizeCategoryProducts(req.body);
            const data = await SharedShopifyCollectionService.addProductsToCategory(getIdParam(req), products, t);
            await t.commit();
            Response.success(res, Message.dataSaved.message, data, Message.dataSaved.code);
        } catch (error: unknown) {
            await t.rollback();
            fail(res, error);
        }
    }

    static async removeCategoryProduct(req: ExpressRequest, res: ExpressResponse) {
        const t = req.transaction as Knex.Transaction;
        try {
            const shopifyProductId = await SharedShopifyCollectionService.removeProductFromCategory(
                getIdParam(req),
                getParam(req, 'shopifyProductId'),
                t
            );
            await t.commit();
            Response.success(res, Message.dataDeleted.message, { shopify_product_id: shopifyProductId }, Message.dataDeleted.code);
        } catch (error: unknown) {
            await t.rollback();
            fail(res, error);
        }
    }

    static async reorderCategoryProducts(req: ExpressRequest, res: ExpressResponse) {
        const t = req.transaction as Knex.Transaction;
        try {
            const rows = Array.isArray(req.body.products) ? req.body.products : [];
            const data = await SharedShopifyCollectionService.reorderCategoryProducts(getIdParam(req), rows, t);
            await t.commit();
            Response.success(res, Message.dataSaved.message, data, Message.dataSaved.code);
        } catch (error: unknown) {
            await t.rollback();
            fail(res, error);
        }
    }
}
