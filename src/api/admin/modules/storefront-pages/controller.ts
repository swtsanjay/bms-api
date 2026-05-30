import { Request as ExpressRequest, Response as ExpressResponse } from 'express';
import { Knex } from 'knex';
import { StatusCodes } from 'http-status-codes';
import Response from '../../../../lib/api-response';
import { Message } from '../../../../lib/Messages';
import SharedStorefrontPageService from '../../../../shared-services/storefrontPage';

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

export default class StorefrontPageController {
    static async list(req: ExpressRequest, res: ExpressResponse) {
        try {
            const { data, extra } = await SharedStorefrontPageService.list({ ...req.query });
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
            const page = await SharedStorefrontPageService.details(id(req));
            Response.success(
                res,
                page ? Message.dataFound.message : Message.dataNotFound.message,
                page,
                page ? Message.dataFound.code : StatusCodes.NOT_FOUND
            );
        } catch (error) {
            fail(res, error, Message.dataNotFound.message);
        }
    }

    static async create(req: ExpressRequest, res: ExpressResponse) {
        const t = req.transaction as Knex.Transaction;
        try {
            const page = await SharedStorefrontPageService.save(req.body, t);
            await t.commit();
            Response.success(res, Message.dataSaved.message, page, Message.dataSaved.code);
        } catch (error) {
            await t.rollback();
            fail(res, error);
        }
    }

    static async update(req: ExpressRequest, res: ExpressResponse) {
        const t = req.transaction as Knex.Transaction;
        try {
            const page = await SharedStorefrontPageService.save({ ...req.body, id: id(req) }, t);
            await t.commit();
            Response.success(res, Message.dataSaved.message, page, Message.dataSaved.code);
        } catch (error) {
            await t.rollback();
            fail(res, error);
        }
    }

    static async delete(req: ExpressRequest, res: ExpressResponse) {
        const t = req.transaction as Knex.Transaction;
        try {
            const pageId = await SharedStorefrontPageService.delete(id(req), t);
            await t.commit();
            Response.success(res, Message.dataDeleted.message, { id: pageId }, Message.dataDeleted.code);
        } catch (error) {
            await t.rollback();
            fail(res, error);
        }
    }

    static async items(req: ExpressRequest, res: ExpressResponse) {
        try {
            const data = await SharedStorefrontPageService.listItems(id(req));
            Response.success(res, Message.dataFound.message, data, Message.dataFound.code);
        } catch (error) {
            fail(res, error, Message.dataNotFound.message);
        }
    }

    static async replaceItems(req: ExpressRequest, res: ExpressResponse) {
        const t = req.transaction as Knex.Transaction;
        try {
            const items = SharedStorefrontPageService.normalizeItems(req.body);
            console.log('****************************');
            // console.log('normalized items', items);
            const data = await SharedStorefrontPageService.replaceItems(id(req), items, t);
            // console.log('replaced items', data);
            await t.commit();
            Response.success(res, Message.dataSaved.message, data, Message.dataSaved.code);
        } catch (error) {
            // console.error('error replacing items', error);
            await t.rollback();
            fail(res, error);
        }
    }
}
