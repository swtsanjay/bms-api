import { Request as ExpressRequest, Response as ExpressResponse } from 'express';
import { Knex } from 'knex';
import Response from '../../../../lib/api-response';
import { Message } from '../../../../lib/Messages';
import SharedProductService, { ProductInUseError } from '../../../../shared-services/product';

export default class ProductController {
    static async list(req: ExpressRequest, res: ExpressResponse) {
        const response: any = {
            data: null,
            message: Message.dataNotSaved.message,
            code: Message.dataNotSaved.code
        };
        try {
            const { data, status, extra } = await SharedProductService.list({ ...req.query }, null, true);
            if (status) {
                response.data = data;
                response.message = Message.dataFound.message;
                response.code = Message.dataFound.code;
                response.qdata = { ...req.query, ...extra };
            }
            Response.success(res, response);
        } catch (error: any) {
            Response.fail(
                res,
                Response.createError({
                    message: Message.dataNotSaved.message,
                    code: Message.dataNotSaved.code,
                    name: Message.dataNotSaved.name
                }, error)
            );
        }
    }

    static async details(req: ExpressRequest, res: ExpressResponse) {
        const response: any = {
            data: null,
            message: Message.dataNotFound.message,
            code: Message.dataNotFound.code
        };
        try {
            const { data, status } = await SharedProductService.details({ id: Number(req.query.id || req.params.id) }, null, true);
            if (status) {
                response.data = data;
                response.message = data ? Message.dataFound.message : Message.dataNotFound.message;
                response.code = data ? Message.dataFound.code : Message.dataNotFound.code;
            }
            Response.success(res, response);
        } catch (error: any) {
            Response.fail(
                res,
                Response.createError({
                    message: Message.dataNotFound.message,
                    code: Message.dataNotFound.code,
                    name: Message.dataNotFound.name
                }, error)
            );
        }
    }

    static async save(req: ExpressRequest, res: ExpressResponse) {
        const t = req.transaction as Knex.Transaction;
        const response: any = {
            data: null,
            message: Message.dataNotSaved.message,
            code: Message.dataNotSaved.code
        };
        try {
            const { data, status } = await SharedProductService.save({
                id: req.body.id,
                name: req.body.name,
                hsn_sac: req.body.hsn_sac,
                price: Number(req.body.price),
                sizes: req.body.sizes || [],
                images: req.body.images || [],
                colors: req.body.colors || []
            }, t);
            if (status) {
                response.data = data;
                response.message = Message.dataSaved.message;
                response.code = Message.dataSaved.code;
            }
            await t.commit();
            Response.success(res, response);
        } catch (error: any) {
            await t.rollback();
            if (error instanceof ProductInUseError) return res.status(409).json({ success: false, message: error.message, data: null });
            Response.fail(
                res,
                Response.createError({
                    message: Message.dataNotSaved.message,
                    code: Message.dataNotSaved.code,
                    name: Message.dataNotSaved.name
                }, error)
            );
        }
    }

    static async deleteSize(req: ExpressRequest, res: ExpressResponse) {
        await ProductController.deleteChild(req, res, 'product_sizes');
    }

    static async deleteImage(req: ExpressRequest, res: ExpressResponse) {
        await ProductController.deleteChild(req, res, 'product_images');
    }

    static async deleteColor(req: ExpressRequest, res: ExpressResponse) {
        await ProductController.deleteChild(req, res, 'product_colors');
    }

    private static async deleteChild(
        req: ExpressRequest,
        res: ExpressResponse,
        table: 'product_sizes' | 'product_images' | 'product_colors'
    ) {
        const t = req.transaction as Knex.Transaction;
        const response: any = {
            data: null,
            message: Message.dataNotSaved.message,
            code: Message.dataNotSaved.code
        };
        try {
            const { data, status } = await SharedProductService.deleteChildRow(table, Number(req.body.id), t);
            if (status) {
                response.data = data;
                response.message = Message.dataDeleted.message;
                response.code = Message.dataDeleted.code;
            }
            await t.commit();
            Response.success(res, response);
        } catch (error: any) {
            await t.rollback();
            if (error instanceof ProductInUseError) return res.status(409).json({ success: false, message: error.message, data: null });
            Response.fail(
                res,
                Response.createError({
                    message: Message.dataNotSaved.message,
                    code: Message.dataNotSaved.code,
                    name: Message.dataNotSaved.name
                }, error)
            );
        }
    }

    static async archive(req: ExpressRequest, res: ExpressResponse) {
        const t = req.transaction as Knex.Transaction;
        try {
            const id = Number(req.body.id);
            if (!Number.isSafeInteger(id) || id <= 0 || typeof req.body.archived !== 'boolean') {
                await t.rollback();
                return res.status(400).json({ success: false, message: 'Product id and archived boolean are required', data: null });
            }
            await SharedProductService.setArchived(id, req.body.archived, t);
            await t.commit();
            return res.json({ success: true, message: req.body.archived ? 'Product archived' : 'Product restored', data: { id } });
        } catch (error) {
            await t.rollback();
            return res.status(404).json({ success: false, message: 'Product not found', data: null });
        }
    }
}
