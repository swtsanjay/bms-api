import { Request as ExpressRequest, Response as ExpressResponse } from 'express';
import { Knex } from 'knex';
import Response from '../../../../lib/api-response';
import { Message } from '../../../../lib/Messages';
import SharedUserService from '../../../../shared-services/user';
import { User } from '../../../../types/user';

export default class UserController {
    static async list(req: ExpressRequest, res: ExpressResponse) {
        const response: any = {
            data: null,
            message: Message.dataNotSaved.message,
            code: Message.dataNotSaved.code
        };
        try {
            const { data, status } = await SharedUserService.list({});
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
    static async updateProfile(req: ExpressRequest, res: ExpressResponse) {
        const t = req.transaction as Knex.Transaction;
        const response: any = {
            data: null,
            message: Message.dataNotSaved.message,
            code: Message.dataNotSaved.code
        };
        try {
            const { data, status } = await SharedUserService.saveByKeys({
                id: req.body.id,
                email: req.body.email,
                phone: req.body.phone,
                user_type: req.body.user_type as User['user_type'],
                name: req.body.name,
                created_at: req.body.created_at,
                updated_at: req.body.updated_at,
                deleted_at: req.body.deleted_at,
            }, t);
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