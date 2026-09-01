import type { NextFunction, Request, Response } from 'express';
import CommerceCustomerAuthService, { CommerceAuthError } from './auth-service';

declare module 'express-serve-static-core' {
    interface Request {
        commerceCustomer?: {
            id: number;
            publicId: string;
            email: string;
            sessionId: string;
        };
    }
}

export function commerceCustomerAuth(req: Request, res: Response, next: NextFunction) {
    const authorization = req.headers.authorization;
    if (!authorization?.startsWith('Bearer ')) {
        return res.status(401).json({ success: false, message: 'Authentication required', data: null });
    }

    try {
        const payload = CommerceCustomerAuthService.verifyAccessToken(authorization.slice(7).trim());
        req.commerceCustomer = {
            id: Number(payload.id),
            publicId: payload.public_id,
            email: payload.email,
            sessionId: payload.session_id
        };
        return next();
    } catch (error) {
        const message = error instanceof CommerceAuthError ? error.message : 'Invalid or expired access token';
        return res.status(401).json({ success: false, message, data: null });
    }
}
