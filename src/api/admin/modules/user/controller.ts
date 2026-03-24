import { Request as ExpressRequest, Response as ExpressResponse } from 'express';
import { Knex } from 'knex';
import Response from '../../../../lib/api-response';
import { Message } from '../../../../lib/Messages';
import SharedUserService from '../../../../shared-services/user';
import { User } from '../../../../types/user';
import bcrypt from 'bcrypt';

export default class UserController {
    static async list(req: ExpressRequest, res: ExpressResponse) {
        const response: any = {
            data: null,
            message: Message.dataNotSaved.message,
            code: Message.dataNotSaved.code
        };
        try {
            const { data, status, extra } = await SharedUserService.list({ ...req.query });
            if (status) {
                response.data = data;
                response.message = Message.dataFound.message;
                response.code = Message.dataFound.code;
                response.qdata = { ...req.query, ...extra };
            }
            Response.success(res, response);
        } catch (error: any) {
            console.log('Error while fetching user list', error);
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
            let hashedPassword;
            if (req.body.password !== null && req.body.password?.trim()) {
                hashedPassword = await bcrypt.hash(req.body.password, 10);
            }

            const { data, status } = await SharedUserService.saveByKeys({
                id: req.body.id,
                email: req.body.email,
                phone: req.body.phone,
                user_type: req.body.user_type as User['user_type'],
                name: req.body.name,
                adhar_url: req.body.adhar_url,
                billing_name: req.body.billing_name,
                company_name: req.body.company_name,
                gstin: req.body.gstin,
                pan_number: req.body.pan_number,
                billing_email: req.body.billing_email,
                billing_phone: req.body.billing_phone,
                billing_address_line1: req.body.billing_address_line1,
                billing_address_line2: req.body.billing_address_line2,
                billing_city: req.body.billing_city,
                billing_state: req.body.billing_state,
                billing_country: req.body.billing_country,
                billing_pincode: req.body.billing_pincode,
                place_of_supply: req.body.place_of_supply,
                shipping_name: req.body.shipping_name,
                shipping_phone: req.body.shipping_phone,
                shipping_address_line1: req.body.shipping_address_line1,
                shipping_address_line2: req.body.shipping_address_line2,
                shipping_city: req.body.shipping_city,
                shipping_state: req.body.shipping_state,
                shipping_country: req.body.shipping_country,
                shipping_pincode: req.body.shipping_pincode,
                seller_details: req.body.seller_details ?? null,
                ...(hashedPassword && { password: hashedPassword }),
                created_at: req.body.created_at,
                updated_at: req.body.updated_at,
                deleted_at: req.body.deleted_at,
            }, t);
            if (status) {
                response.data = data;
                response.message = `User ${req.body.id ? 'updated' : 'created'} successfully`;
                response.code = Message.dataSaved.code;
            }
            await t.commit();
            Response.success(res, response);
        } catch (error: any) {
            console.error('Error while updating profile', error);
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

    static async createUser(req: ExpressRequest, res: ExpressResponse) {
        const t = req.transaction as Knex.Transaction;
        const response: any = {
            data: null,
            message: Message.dataNotSaved.message,
            code: Message.dataNotSaved.code
        };
        try {
            if (!req.body.password) {
                await t.rollback();
                return Response.fail(res, "Password is required when creating a user", null, 400);
            }
            const hashedPassword = await bcrypt.hash(req.body.password, 10);

            const { data, status } = await SharedUserService.saveByKeys({
                email: req.body.email,
                phone: req.body.phone,
                user_type: req.body.user_type as User['user_type'] || 'EMPLOYEE',
                name: req.body.name,
                password: hashedPassword,
                adhar_url: req.body.adhar_url,
                billing_name: req.body.billing_name,
                company_name: req.body.company_name,
                gstin: req.body.gstin,
                pan_number: req.body.pan_number,
                billing_email: req.body.billing_email,
                billing_phone: req.body.billing_phone,
                billing_address_line1: req.body.billing_address_line1,
                billing_address_line2: req.body.billing_address_line2,
                billing_city: req.body.billing_city,
                billing_state: req.body.billing_state,
                billing_country: req.body.billing_country,
                billing_pincode: req.body.billing_pincode,
                place_of_supply: req.body.place_of_supply,
                shipping_name: req.body.shipping_name,
                shipping_phone: req.body.shipping_phone,
                shipping_address_line1: req.body.shipping_address_line1,
                shipping_address_line2: req.body.shipping_address_line2,
                shipping_city: req.body.shipping_city,
                shipping_state: req.body.shipping_state,
                shipping_country: req.body.shipping_country,
                shipping_pincode: req.body.shipping_pincode,
                seller_details: req.body.seller_details ?? null,
                created_at: req.body.created_at,
                updated_at: req.body.updated_at,
                deleted_at: req.body.deleted_at,
            }, t);

            if (status) {
                response.data = data;
                response.message = 'User added successfully';
                response.code = Message.dataSaved.code;
            }
            await t.commit();
            Response.success(res, response);
        } catch (error: any) {
            console.error('Error while creating user', error);
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

    static async delete(req: ExpressRequest, res: ExpressResponse) {
        const t = req.transaction as Knex.Transaction;
        const response: any = {
            data: null,
            message: Message.dataNotSaved.message,
            code: Message.dataNotSaved.code
        };
        try {
            const requestedUserId = Number(req.body.id);
            const loggedInUserId = Number((req as any).user?.id);

            if (requestedUserId === loggedInUserId) {
                await t.rollback();
                return Response.fail(res, 'You cannot delete your own account', null, 400);
            }

            const { status } = await SharedUserService.deleteById(requestedUserId, t);
            if (status) {
                response.data = true;
                response.message = 'User deleted successfully';
                response.code = Message.dataDeleted.code;
            }
            await t.commit();
            Response.success(res, response);
        } catch (error: any) {
            console.error('Error while deleting user', error);
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

    static async changePassword(req: ExpressRequest, res: ExpressResponse) {
        const t = req.transaction as Knex.Transaction;
        const response: any = {
            data: null,
            message: Message.dataNotSaved.message,
            code: Message.dataNotSaved.code
        };
        try {
            const loggedInUserId = Number((req as any).user?.id);

            const user = await SharedUserService.getUserBy(loggedInUserId, 'id', t);
            if (!user) {
                await t.rollback();
                return Response.fail(res, 'User not found', null, 404);
            }
            const isCurrentPasswordValid = await bcrypt.compare(
                req.body.current_password,
                user.password || ''
            );
            if (!isCurrentPasswordValid) {
                await t.rollback();
                return Response.fail(res, 'Current password is incorrect', null, 400);
            }

            const hashedPassword = await bcrypt.hash(req.body.new_password, 10);
            const { status } = await SharedUserService.saveByKeys({
                id: loggedInUserId,
                password: hashedPassword,
                updated_at: new Date()
            }, t);

            if (status) {
                response.data = true;
                response.message = 'Password changed successfully';
                response.code = Message.dataSaved.code;
            }
            await t.commit();
            Response.success(res, response);
        } catch (error: any) {
            console.error('Error while changing password', error);
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
