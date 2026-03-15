import { Request as ExpressRequest, Response as ExpressResponse } from 'express';
import { Knex } from 'knex';
import Response from '../../../../lib/api-response';
import { Message } from '../../../../lib/Messages';
import SharedOrderService from '../../../../shared-services/order';

export default class OrderController {
    static async list(req: ExpressRequest, res: ExpressResponse) {
        const response: any = {
            data: null,
            message: Message.dataNotSaved.message,
            code: Message.dataNotSaved.code
        };
        try {
            const { data, status, extra } = await SharedOrderService.list({ ...req.query });
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
            const { data, status } = await SharedOrderService.details({ id: Number(req.query.id || req.params.id) });
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
            const createdBy = Number((req as any).user?.id || req.body.created_by);
            const { data, status } = await SharedOrderService.save({
                id: req.body.id,
                client_id: Number(req.body.client_id),
                user_id: (req as any).user.id,
                status: req.body.status,
                payment_status: req.body.payment_status,
                created_by: createdBy,
                items: req.body.items || []
            }, t);
            if (status) {
                response.data = data;
                response.message = Message.dataSaved.message;
                response.code = Message.dataSaved.code;
            }
            await t.commit();
            Response.success(res, response);
        } catch (error: any) {
            console.log('ERROR', error);
            await t.rollback();
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
}
