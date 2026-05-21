import { Request as ExpressRequest, Response as ExpressResponse, NextFunction } from 'express';
import crypto from 'crypto';
import jwt, { JwtPayload } from 'jsonwebtoken';
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
        return ShopifyCustomerAuthResponse.invalidToken(res);
    }

    const token = authHeader.split(' ')[1];

    try {
        const decoded = jwt.verify(token, config.jwt.secretKey) as ShopifyCustomerTokenPayload;
        if (decoded.type !== 'CUSTOMER' || !decoded.id) {
            return ShopifyCustomerAuthResponse.invalidToken(res);
        }

        (req as any).shopifyCustomer = decoded;
        (req as any).shopifyCustomerJwtKey = crypto.createHash('md5').update(token).digest('hex');
        next();
    } catch (err: any) {
        return ShopifyCustomerAuthResponse.invalidToken(res);
    }
};

class ShopifyCustomerAuthResponse {
    static invalidToken(res: ExpressResponse) {
        return res.status(401).json({
            success: false,
            error: 'Invalid or expired token'
        });
    }
}
