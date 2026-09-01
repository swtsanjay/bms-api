import type { Request, Response } from 'express';
import { CommerceAuthError } from './auth-service';
import CommerceCustomerAccountService from './account-service';

function failure(res: Response, error: unknown) {
    if (error instanceof CommerceAuthError) return res.status(error.statusCode).json({ success: false, message: error.message, data: null });
    console.error('Commerce customer account request failed', error);
    return res.status(500).json({ success: false, message: 'Customer account request failed', data: null });
}

export default class CommerceCustomerAccountController {
    static async updateProfile(req: Request, res: Response) {
        try {
            const customer = await CommerceCustomerAccountService.updateProfile(req.commerceCustomer!.id, req.body);
            return res.json({ success: true, message: 'Profile updated', data: { customer } });
        } catch (error) { return failure(res, error); }
    }

    static async changePassword(req: Request, res: Response) {
        try {
            await CommerceCustomerAccountService.changePassword(
                req.commerceCustomer!.id,
                req.commerceCustomer!.sessionId,
                req.body.current_password,
                req.body.new_password
            );
            return res.json({ success: true, message: 'Password changed', data: true });
        } catch (error) { return failure(res, error); }
    }

    static async addresses(req: Request, res: Response) {
        try {
            return res.json({ success: true, message: 'Addresses found', data: { addresses: await CommerceCustomerAccountService.addresses(req.commerceCustomer!.id) } });
        } catch (error) { return failure(res, error); }
    }

    static async createAddress(req: Request, res: Response) {
        try {
            const address = await CommerceCustomerAccountService.saveAddress(req.commerceCustomer!.id, req.body);
            return res.status(201).json({ success: true, message: 'Address created', data: { address } });
        } catch (error) { return failure(res, error); }
    }

    static async updateAddress(req: Request, res: Response) {
        try {
            const address = await CommerceCustomerAccountService.saveAddress(req.commerceCustomer!.id, req.body, String(req.params.publicId));
            return res.json({ success: true, message: 'Address updated', data: { address } });
        } catch (error) { return failure(res, error); }
    }

    static async deleteAddress(req: Request, res: Response) {
        try {
            await CommerceCustomerAccountService.deleteAddress(req.commerceCustomer!.id, String(req.params.publicId));
            return res.json({ success: true, message: 'Address deleted', data: true });
        } catch (error) { return failure(res, error); }
    }

    static async wishlist(req: Request, res: Response) {
        try {
            return res.json({ success: true, message: 'Wishlist found', data: { items: await CommerceCustomerAccountService.wishlist(req.commerceCustomer!.id) } });
        } catch (error) { return failure(res, error); }
    }

    static async toggleWishlist(req: Request, res: Response) {
        try {
            const wished = await CommerceCustomerAccountService.toggleWishlist(req.commerceCustomer!.id, req.body.product_public_id);
            return res.json({ success: true, message: wished ? 'Added to wishlist' : 'Removed from wishlist', data: { wished } });
        } catch (error) { return failure(res, error); }
    }
}
