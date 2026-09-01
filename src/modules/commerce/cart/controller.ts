import type { Request, Response } from 'express';
import CommerceCustomerAuthService from '../customer/auth-service';
import CommerceCartService, { CommerceCartError } from './service';

function customerId(req: Request) {
    const authorization = req.headers.authorization;
    if (!authorization?.startsWith('Bearer ')) return null;
    try {
        return Number(CommerceCustomerAuthService.verifyAccessToken(authorization.slice(7).trim()).id);
    } catch {
        return null;
    }
}

function access(req: Request) {
    return {
        customerId: customerId(req),
        cartToken: String(req.get('x-cart-token') || req.body?.cart_token || '').trim() || null
    };
}

function handleError(res: Response, error: unknown) {
    if (error instanceof CommerceCartError) {
        return res.status(error.statusCode).json({ success: false, message: error.message, data: null });
    }
    console.error('Commerce cart request failed', error);
    return res.status(500).json({ success: false, message: 'Cart request failed', data: null });
}

export default class CommerceCartController {
    static async create(req: Request, res: Response) {
        try {
            const result = await CommerceCartService.create(customerId(req));
            return res.status(201).json({
                success: true,
                message: 'Cart created',
                data: { cart: result.cart, cart_token: result.cartToken }
            });
        } catch (error) {
            return handleError(res, error);
        }
    }

    static async get(req: Request, res: Response) {
        try {
            const cart = await CommerceCartService.get(String(req.params.publicId), access(req));
            return res.json({ success: true, message: 'Cart found', data: { cart } });
        } catch (error) {
            return handleError(res, error);
        }
    }

    static async addItem(req: Request, res: Response) {
        try {
            const cart = await CommerceCartService.addItem(
                String(req.params.publicId),
                String(req.body.variant_public_id),
                Number(req.body.quantity),
                access(req)
            );
            return res.json({ success: true, message: 'Item added', data: { cart } });
        } catch (error) {
            return handleError(res, error);
        }
    }

    static async updateItem(req: Request, res: Response) {
        try {
            const cart = await CommerceCartService.updateItem(
                String(req.params.publicId),
                Number(req.params.itemId),
                Number(req.body.quantity),
                access(req)
            );
            return res.json({ success: true, message: 'Cart updated', data: { cart } });
        } catch (error) {
            return handleError(res, error);
        }
    }

    static async removeItem(req: Request, res: Response) {
        try {
            const cart = await CommerceCartService.removeItem(
                String(req.params.publicId),
                Number(req.params.itemId),
                access(req)
            );
            return res.json({ success: true, message: 'Item removed', data: { cart } });
        } catch (error) {
            return handleError(res, error);
        }
    }
}
