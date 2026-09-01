import type { Request, Response } from 'express';
import CommerceAdminService, { CommerceAdminError } from './service';

function actorId(req: Request) {
    return Number((req as any).user?.id);
}

function failure(res: Response, error: unknown) {
    if (error instanceof CommerceAdminError) {
        return res.status(error.statusCode).json({ success: false, message: error.message, data: null });
    }
    console.error('Commerce admin request failed', error);
    return res.status(500).json({ success: false, message: 'Commerce admin request failed', data: null });
}

export default class CommerceAdminController {
    static async products(req: Request, res: Response) {
        try {
            return res.json({ success: true, message: 'Products found', data: await CommerceAdminService.products(req.query) });
        } catch (error) { return failure(res, error); }
    }

    static async product(req: Request, res: Response) {
        try {
            const product = await CommerceAdminService.product(String(req.params.publicId));
            if (!product) return res.status(404).json({ success: false, message: 'Product not found', data: null });
            return res.json({ success: true, message: 'Product found', data: { product } });
        } catch (error) { return failure(res, error); }
    }

    static async saveProduct(req: Request, res: Response) {
        try {
            const product = await CommerceAdminService.saveProduct(req.body, actorId(req));
            return res.status(req.body.public_id ? 200 : 201).json({ success: true, message: 'Product saved', data: { product } });
        } catch (error) { return failure(res, error); }
    }

    static async taxonomy(req: Request, res: Response) {
        try { return res.json({ success: true, message: 'Catalog taxonomy found', data: await CommerceAdminService.taxonomy() }); }
        catch (error) { return failure(res, error); }
    }

    static async saveCategory(req: Request, res: Response) {
        try {
            const category = await CommerceAdminService.saveCategory(req.body, req.params.publicId);
            return res.status(req.params.publicId ? 200 : 201).json({ success: true, message: 'Category saved', data: { category } });
        } catch (error) { return failure(res, error); }
    }

    static async saveCollection(req: Request, res: Response) {
        try {
            const collection = await CommerceAdminService.saveCollection(req.body, req.params.publicId);
            return res.status(req.params.publicId ? 200 : 201).json({ success: true, message: 'Collection saved', data: { collection } });
        } catch (error) { return failure(res, error); }
    }

    static async deleteCategory(req: Request, res: Response) {
        try { return res.json({ success: true, message: 'Category deleted', data: await CommerceAdminService.deleteTaxonomy('categories', String(req.params.publicId)) }); }
        catch (error) { return failure(res, error); }
    }

    static async deleteCollection(req: Request, res: Response) {
        try { return res.json({ success: true, message: 'Collection deleted', data: await CommerceAdminService.deleteTaxonomy('collections', String(req.params.publicId)) }); }
        catch (error) { return failure(res, error); }
    }

    static async customers(req: Request, res: Response) {
        try { return res.json({ success: true, message: 'Customers found', data: await CommerceAdminService.customers(req.query) }); }
        catch (error) { return failure(res, error); }
    }

    static async shippingSettings(req: Request, res: Response) {
        try { return res.json({ success: true, message: 'Shipping settings found', data: await CommerceAdminService.shippingSettings() }); }
        catch (error) { return failure(res, error); }
    }

    static async updateShippingRate(req: Request, res: Response) {
        try { return res.json({ success: true, message: 'Shipping rate updated', data: { rate: await CommerceAdminService.updateShippingRate(Number(req.params.id), req.body) } }); }
        catch (error) { return failure(res, error); }
    }

    static async orders(req: Request, res: Response) {
        try {
            return res.json({ success: true, message: 'Orders found', data: await CommerceAdminService.orders(req.query) });
        } catch (error) { return failure(res, error); }
    }

    static async order(req: Request, res: Response) {
        try {
            const order = await CommerceAdminService.order(String(req.params.publicId));
            if (!order) return res.status(404).json({ success: false, message: 'Order not found', data: null });
            return res.json({ success: true, message: 'Order found', data: { order } });
        } catch (error) { return failure(res, error); }
    }

    static async confirmPayment(req: Request, res: Response) {
        try {
            const order = await CommerceAdminService.confirmManualPayment(
                String(req.params.publicId),
                actorId(req),
                req.body.note
            );
            return res.json({ success: true, message: 'Payment confirmed', data: { order } });
        } catch (error) { return failure(res, error); }
    }

    static async cancelOrder(req: Request, res: Response) {
        try {
            const order = await CommerceAdminService.cancelOrder(String(req.params.publicId), actorId(req), req.body.reason);
            return res.json({ success: true, message: 'Order cancelled', data: { order } });
        } catch (error) { return failure(res, error); }
    }

    static async createShipment(req: Request, res: Response) {
        try {
            const order = await CommerceAdminService.createShipment(String(req.params.publicId), req.body, actorId(req));
            return res.status(201).json({ success: true, message: 'Shipment created', data: { order } });
        } catch (error) { return failure(res, error); }
    }
}
