import { Request as ExpressRequest, Response as ExpressResponse } from 'express';
import { Knex } from 'knex';
import Response from '../../../../lib/api-response';
import { Message } from '../../../../lib/Messages';
import SharedUserService from '../../../../shared-services/user';

function sanitizeUser(user: any) {
    if (!user) {
        return null;
    }
    const sanitized = { ...user };
    delete sanitized.password;
    delete sanitized.deleted_at;
    return sanitized;
}

function bodyValue(req: ExpressRequest, key: string, fallback: any = null) {
    if (Object.prototype.hasOwnProperty.call(req.body, key)) {
        return req.body[key] || null;
    }

    return fallback ?? null;
}

export default class FrontUserController {
    static async profile(req: ExpressRequest, res: ExpressResponse) {
        try {
            const loggedInUserId = Number((req as any).user?.id);
            const user = await SharedUserService.getUserBy(loggedInUserId, 'id');

            if (!user) {
                return Response.fail(res, 'User not found', null, 404);
            }

            return Response.success(res, {
                data: sanitizeUser(user),
                message: Message.dataFound.message,
                code: Message.dataFound.code,
                success: true
            } as any);
        } catch (error: any) {
            return Response.fail(res, 'Internal server error', null, 500);
        }
    }

    static async updateProfile(req: ExpressRequest, res: ExpressResponse) {
        const t = req.transaction as Knex.Transaction;
        try {
            const loggedInUserId = Number((req as any).user?.id);
            const existingUser = await SharedUserService.getUserBy(loggedInUserId, 'id', t);

            if (!existingUser) {
                await t.rollback();
                return Response.fail(res, 'User not found', null, 404);
            }

            const { status } = await SharedUserService.saveByKeys({
                id: loggedInUserId,
                name: req.body.name,
                email: req.body.email,
                phone: req.body.phone,
                user_type: existingUser.user_type,
                adhar_url: existingUser.adhar_url,
                company_name: bodyValue(req, 'company_name', existingUser.company_name),
                business_type: bodyValue(req, 'business_type', existingUser.business_type),
                billing_city: bodyValue(req, 'billing_city', existingUser.billing_city),
                billing_country: bodyValue(req, 'billing_country', existingUser.billing_country),
                profile_notes: bodyValue(req, 'profile_notes', existingUser.profile_notes),
                updated_at: new Date()
            }, t);

            if (!status) {
                await t.rollback();
                return Response.fail(res, Message.dataNotSaved.message, null, Message.dataNotSaved.code);
            }

            const updatedUser = await SharedUserService.getUserBy(loggedInUserId, 'id', t);
            await t.commit();

            return Response.success(res, {
                data: sanitizeUser(updatedUser),
                message: 'Profile updated successfully',
                code: Message.dataSaved.code,
                success: true
            } as any);
        } catch (error: any) {
            await t.rollback();
            return Response.fail(
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
