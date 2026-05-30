import { Request as ExpressRequest, Response as ExpressResponse } from 'express';
import { Knex } from 'knex';
import { StatusCodes } from 'http-status-codes';
import Response from '../../../../lib/api-response';
import { Message } from '../../../../lib/Messages';
import SharedStorefrontMenuService from '../../../../shared-services/storefrontMenu';

function id(req: ExpressRequest) {
    return Number(req.params.id || req.body.id);
}

function fail(res: ExpressResponse, error: unknown, message = Message.dataNotSaved.message) {
    if (
        error instanceof Error
        && 'code' in error
        && typeof (error as GError).code === 'number'
    ) {
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

export default class StorefrontMenuController {
    static async list(req: ExpressRequest, res: ExpressResponse) {
        try {
            const { data, extra } = await SharedStorefrontMenuService.list({ ...req.query });
            Response.success(res, {
                data,
                message: Message.dataFound.message,
                code: Message.dataFound.code,
                success: true,
                qdata: { ...req.query, ...extra }
            });
        } catch (error) {
            fail(res, error, Message.dataNotFound.message);
        }
    }

    static async details(req: ExpressRequest, res: ExpressResponse) {
        try {
            const menu = await SharedStorefrontMenuService.details(id(req));
            Response.success(
                res,
                menu ? Message.dataFound.message : Message.dataNotFound.message,
                menu,
                menu ? Message.dataFound.code : StatusCodes.NOT_FOUND
            );
        } catch (error) {
            fail(res, error, Message.dataNotFound.message);
        }
    }

    static async create(req: ExpressRequest, res: ExpressResponse) {
        const t = req.transaction as Knex.Transaction;
        try {
            const menu = await SharedStorefrontMenuService.save(req.body, t);
            await t.commit();
            Response.success(res, Message.dataSaved.message, menu, Message.dataSaved.code);
        } catch (error) {
            await t.rollback();
            fail(res, error);
        }
    }

    static async update(req: ExpressRequest, res: ExpressResponse) {
        const t = req.transaction as Knex.Transaction;
        try {
            const menu = await SharedStorefrontMenuService.save({ ...req.body, id: id(req) }, t);
            await t.commit();
            Response.success(res, Message.dataSaved.message, menu, Message.dataSaved.code);
        } catch (error) {
            await t.rollback();
            fail(res, error);
        }
    }

    static async delete(req: ExpressRequest, res: ExpressResponse) {
        const t = req.transaction as Knex.Transaction;
        try {
            const menuId = await SharedStorefrontMenuService.delete(id(req), t);
            await t.commit();
            Response.success(res, Message.dataDeleted.message, { id: menuId }, Message.dataDeleted.code);
        } catch (error) {
            await t.rollback();
            fail(res, error);
        }
    }

    static async pages(req: ExpressRequest, res: ExpressResponse) {
        try {
            const data = await SharedStorefrontMenuService.listPages(id(req));
            Response.success(res, Message.dataFound.message, data, Message.dataFound.code);
        } catch (error) {
            fail(res, error, Message.dataNotFound.message);
        }
    }

    static async replacePages(req: ExpressRequest, res: ExpressResponse) {
        const t = req.transaction as Knex.Transaction;
        try {
            const pages = SharedStorefrontMenuService.normalizePages(req.body);
            const data = await SharedStorefrontMenuService.replacePages(id(req), pages, t);
            await t.commit();
            Response.success(res, Message.dataSaved.message, data, Message.dataSaved.code);
        } catch (error) {
            await t.rollback();
            fail(res, error);
        }
    }
}
