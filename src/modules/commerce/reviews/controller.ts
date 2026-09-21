import type { Request, Response } from 'express';
import ProductReviewService from './service';
import { ReviewError, type ReviewStatus } from './policy';

function fail(res: Response, error: unknown) {
    if (error instanceof ReviewError) return res.status(error.statusCode).json({ success: false, message: error.message, data: null });
    console.error('Product review request failed', error);
    return res.status(500).json({ success: false, message: 'Reviews are temporarily unavailable. Please try again later.', data: null });
}

export default class ProductReviewController {
    static async list(req: Request, res: Response) {
        try {
            const data = await ProductReviewService.list(String(req.params.productId), Number(req.query.page || 1), Number(req.query.limit || 5), String(req.query.sort || 'newest'), req.query.rating ? Number(req.query.rating) : undefined);
            return res.json({ success: true, data });
        } catch (error) { return fail(res, error); }
    }
    static async mine(req: Request, res: Response) {
        try {
            const data = await ProductReviewService.mine(String(req.params.productId), req.commerceCustomer!.id);
            return res.json({ success: true, data });
        } catch (error) { return fail(res, error); }
    }
    static async create(req: Request, res: Response) {
        try {
            const data = await ProductReviewService.create(String(req.params.productId), req.commerceCustomer!.id, {
                rating: req.body?.rating, title: req.body?.title, body: req.body?.body
            });
            return res.status(201).json({ success: true, message: 'Thank you. Your review is awaiting approval.', data });
        } catch (error) { return fail(res, error); }
    }
    static async adminList(req: Request, res: Response) {
        try {
            const data = await ProductReviewService.adminList(Number(req.query.page || 1), Number(req.query.limit || 20), req.query.status as ReviewStatus | undefined, req.query.product_public_id as string | undefined);
            return res.json({ success: true, data });
        } catch (error) { return fail(res, error); }
    }
    static async moderate(req: Request, res: Response) {
        try {
            const admin = (req as Request & { user: { id: number } }).user;
            const data = await ProductReviewService.moderate(String(req.params.reviewId), Number(admin.id), {
                status: req.body.status, version: Number(req.body.version), note: req.body.note
            });
            return res.json({ success: true, message: 'Review moderation saved', data });
        } catch (error) { return fail(res, error); }
    }
}
