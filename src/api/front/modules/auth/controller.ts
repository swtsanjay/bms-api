import { Request as ExpressRequest, Response as ExpressResponse } from 'express';
import { Knex } from 'knex';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import Response from '../../../../lib/api-response';
import SharedUserService from '../../../../shared-services/user';
import config from '../../../../config';

function sanitizeUser(user: any) {
    if (!user) {
        return null;
    }
    const sanitized = { ...user };
    delete sanitized.password;
    delete sanitized.deleted_at;
    return sanitized;
}

export default class FrontAuthController {
    static async login(req: ExpressRequest, res: ExpressResponse) {
        try {
            const user = await SharedUserService.getUserBy(req.body.email, 'email');

            if (!user) {
                return Response.fail(res, 'Invalid credentials', null, 401);
            }

            const isValidPassword = await bcrypt.compare(req.body.password, user.password || '');
            if (!isValidPassword) {
                return Response.fail(res, 'Invalid credentials', null, 401);
            }

            const token = jwt.sign(
                { id: user.id, email: user.email, user_type: user.user_type },
                config.jwt.secretKey || 'default_secret',
                { expiresIn: '24h' }
            );

            return Response.success(res, {
                data: {
                    user: sanitizeUser(user),
                    token
                },
                message: 'Login successful',
                code: 200,
                success: true
            } as any);
        } catch (error: any) {
            return Response.fail(res, 'Internal server error', null, 500);
        }
    }

    static async signup(req: ExpressRequest, res: ExpressResponse) {
        const t = req.transaction as Knex.Transaction;
        try {
            const existingUser = await SharedUserService.getUserBy(req.body.email, 'email', t);
            if (existingUser) {
                await t.rollback();
                return Response.fail(res, 'An account with this email already exists', null, 409);
            }

            const hashedPassword = await bcrypt.hash(req.body.password, 10);
            const { data: userId, status } = await SharedUserService.saveByKeys({
                name: req.body.name,
                email: req.body.email,
                phone: req.body.phone,
                password: hashedPassword,
                user_type: 'CUSTOMER',
                adhar_url: null as any,
                company_name: req.body.company_name || null,
                business_type: req.body.business_type || null,
                created_at: new Date(),
                updated_at: new Date()
            }, t);

            if (!status || !userId) {
                await t.rollback();
                return Response.fail(res, 'Unable to create account', null, 500);
            }

            const user = await SharedUserService.getUserBy(userId, 'id', t);
            const token = jwt.sign(
                { id: userId, email: user?.email, user_type: user?.user_type },
                config.jwt.secretKey || 'default_secret',
                { expiresIn: '24h' }
            );

            await t.commit();

            return Response.success(res, {
                data: {
                    user: sanitizeUser(user),
                    token
                },
                message: 'Signup successful',
                code: 200,
                success: true
            } as any);
        } catch (error: any) {
            await t.rollback();
            return Response.fail(res, 'Internal server error', null, 500);
        }
    }

    static async logout(req: ExpressRequest, res: ExpressResponse) {
        return Response.success(res, {
            data: true,
            message: 'Logout successful',
            code: 200,
            success: true
        } as any);
    }
}
