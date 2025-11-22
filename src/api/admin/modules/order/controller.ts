import { Request as ExpressRequest, Response as ExpressResponse } from 'express';
import { Knex } from 'knex';
import Response from '../../../../lib/api-response';
import { Message } from '../../../../lib/Messages';
import SharedOrderService from '../../../../shared-services/order';
import SharedOrderItemService from '../../../../shared-services/orderItem';
import { OrderItem } from 'src/types/orderItem';

export default class OrderController {
    static async list(req: ExpressRequest, res: ExpressResponse) {
        const response: any = {
            data: null,
            message: Message.dataNotSaved.message,
            code: Message.dataNotSaved.code
        };
        try {
            const { data, status } = await SharedOrderService.list({});
            if (status) {
                response.data = data;
                response.message = Message.dataFound.message;
                response.code = Message.dataFound.code;
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
    static async save(req: ExpressRequest, res: ExpressResponse) {
        const t = req.transaction as Knex.Transaction;
        const response: any = {
            data: null,
            message: Message.dataNotSaved.message,
            code: Message.dataNotSaved.code
        };
        try {
            const { data, status } = await SharedOrderService.saveByKeys({
                id: req.body.id,
                user_id: req.body.user_id,
                created_at: new Date(),
                updated_at: new Date(),
                deleted_at: null
            }, t);
            await SharedOrderItemService.list({ order_id: data }, t).then(async (res) => {
                const itemIds = req.body.items?.map((v: OrderItem) => v.id) || [];
                const deletionItems = (res.data?.map((item: any) => item.id) || []).filter((v: number | null) => v).filter((id: number) => !itemIds.includes(id));
                for (const item of deletionItems || []) {
                    await SharedOrderItemService.delete({ id: item.id }, t);
                }
            });
            for (const item of req.body.items || []) {
                await SharedOrderItemService.saveByKeys({
                    id: item.id,
                    name: item.name || null,
                    quantity: item.quantity,
                    pp_price: item.pp_price,
                    order_id: data,
                    created_at: new Date(),
                    updated_at: new Date(),
                    deleted_at: null
                }, t);
            }


            if (status) {
                response.data = data;
                response.message = Message.dataFound.message;
                response.code = Message.dataFound.code;
            }
            await t.commit();
            Response.success(res, response);
        } catch (error: any) {
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