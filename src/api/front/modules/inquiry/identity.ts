import type { NextFunction, Request, Response } from 'express';
import jwt, { type JwtPayload } from 'jsonwebtoken';
import config from '../../../../config';

export type InquiryIdentity =
    | { kind: 'guest' }
    | { kind: 'legacy'; id: number }
    | { kind: 'commerce'; id: number };

declare module 'express-serve-static-core' {
    interface Request {
        inquiryIdentity?: InquiryIdentity;
    }
}

function validId(value: unknown): value is number {
    return Number.isSafeInteger(value) && Number(value) > 0;
}

function resolveInquiryIdentity(allowGuest: boolean) {
    return async (req: Request, res: Response, next: NextFunction) => {
        const authorization = req.headers.authorization;
        if (!authorization && allowGuest) {
            req.inquiryIdentity = { kind: 'guest' };
            return next();
        }
        const match = /^Bearer ([^\s]+)$/.exec(authorization || '');
        if (!match) return res.status(401).json({ success: false, message: 'Authentication required', data: null });

        let decoded: string | JwtPayload;
        try {
            decoded = jwt.verify(match[1], config.jwt.secretKey, { algorithms: ['HS256'] });
        } catch {
            return res.status(401).json({ success: false, message: 'Invalid or expired token', data: null });
        }
        if (typeof decoded === 'string' || !validId(decoded.id)) {
            return res.status(401).json({ success: false, message: 'Invalid inquiry identity', data: null });
        }

        try {
            if (decoded.type === 'VSQ_CUSTOMER' &&
                typeof decoded.session_id === 'string' && decoded.session_id.length > 0 &&
                typeof decoded.public_id === 'string' && decoded.public_id.length > 0) {
                const customer = await knexInstance('vsq_customer_sessions as session')
                    .join('vsq_customers as customer', 'customer.id', 'session.customer_id')
                    .select('customer.id')
                    .where('session.public_id', decoded.session_id)
                    .where('session.customer_id', decoded.id)
                    .where('customer.public_id', decoded.public_id)
                    .where('customer.status', 'ACTIVE')
                    .whereNull('session.revoked_at')
                    .whereNull('customer.deleted_at')
                    .where('session.expires_at', '>', new Date())
                    .first();
                if (customer) {
                    req.inquiryIdentity = { kind: 'commerce', id: decoded.id };
                    return next();
                }
            } else if (decoded.type === undefined && decoded.aud === undefined &&
                typeof decoded.email === 'string' && typeof decoded.user_type === 'string') {
                const user = await knexInstance('users').select('id')
                    .where({ id: decoded.id, email: decoded.email, user_type: decoded.user_type })
                    .whereNull('deleted_at').first();
                if (user) {
                    req.inquiryIdentity = { kind: 'legacy', id: decoded.id };
                    return next();
                }
            }
            return res.status(401).json({ success: false, message: 'Account or session unavailable', data: null });
        } catch (error) {
            return next(error);
        }
    };
}

export const optionalInquiryIdentity = resolveInquiryIdentity(true);
export const requiredInquiryIdentity = resolveInquiryIdentity(false);
