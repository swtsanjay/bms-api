import { Request as ExpressRequest, Response as ExpressResponse } from 'express';
import { Knex } from 'knex';
import Response from '../../../../lib/api-response';
import { Message } from '../../../../lib/Messages';
import SharedManualOrderService from '../../../../shared-services/manualOrder';

export default class ManualOrderController {
    static async submit(req: ExpressRequest, res: ExpressResponse) {
        const t = req.transaction as Knex.Transaction;
        const response: any = {
            data: null,
            message: Message.dataNotSaved.message,
            code: Message.dataNotSaved.code,
            success: false
        };

        try {
            const { data, status } = await SharedManualOrderService.save({
                user_id: (req as any).user?.id ? Number((req as any).user.id) : null,
                product_id: req.body.product_id || null,
                product_handle: req.body.product_handle || null,
                product_title: req.body.product_title,
                product_image: req.body.product_image || null,
                size: req.body.size || null,
                quantity: Number(req.body.quantity) || 1,
                customer_message: req.body.customer_message || null,
                phone: req.body.phone,
                email: req.body.email || null
            }, t);

            if (status) {
                response.data = data;
                response.message = 'Order request submitted successfully';
                response.code = Message.dataSaved.code;
                response.success = true;
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
