import { Request as ExpressRequest, Response as ExpressResponse, NextFunction } from 'express';
import jwt, { JwtPayload } from 'jsonwebtoken';
import Response from '../../../lib/api-response';
import config from '../../../config';

type ShopifyCustomerTokenPayload = JwtPayload & {
    id?: number;
    type?: string;
};

export const verifyShopifyCustomerJWT = (
    req: ExpressRequest,
    res: ExpressResponse,
    next: NextFunction
) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return Response.fail(res, 'Unauthorized - No token provided', null, 401);
    }

    const token = authHeader.split(' ')[1];

    try {
        const decoded = jwt.verify(token, config.jwt.secretKey) as ShopifyCustomerTokenPayload;
        if (decoded.type !== 'CUSTOMER' || !decoded.id) {
            return Response.fail(res, 'Unauthorized - Invalid customer token', null, 401);
        }

        (req as any).shopifyCustomer = decoded;
        next();
    } catch (err: any) {
        return Response.fail(res, 'Unauthorized - Invalid or expired token', null, 401);
    }
};
