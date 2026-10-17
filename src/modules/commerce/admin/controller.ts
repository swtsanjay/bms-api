import type { Request, Response } from 'express';
import CommerceAdminService, { CommerceAdminError } from './service';
import CommerceProductMediaUploadService from './product-media-upload-service';
import { ShiprocketError } from './shiprocket-client';
import { bookShiprocket, cancelBookedShiprocket, continueShiprocket, listShiprocketPickups, quoteShiprocket, reconcileShiprocket, refreshShiprocket, shiprocketLabel } from './shiprocket-service';
import { adjustCredits, adminCreditTransactions, adminReferralReport, CommerceReferralError } from '../referral/service';

function actorId(req: Request) {
    return Number((req as any).user?.id);
}

function optionalRouteParam(value: string | string[] | undefined) {
    return Array.isArray(value) ? value[0] : value;
}

function failure(res: Response, error: unknown) {
    if (error instanceof ShiprocketError) return res.status(error.statusCode).json({ success: false, message: error.message, data: null });
    if (error instanceof CommerceAdminError) {
        return res.status(error.statusCode).json({ success: false, message: error.message, data: null });
    }
    if (error instanceof CommerceReferralError) {
        return res.status(error.statusCode).json({ success: false, message: error.message, data: null });
    }
    console.error('Commerce admin request failed', error);
    if ((error as { code?: string })?.code === 'ER_BAD_FIELD_ERROR') {
        return res.status(503).json({ success: false, message: 'Commerce database schema is incompatible with this API version. Ask an administrator to check the database migrations before retrying.', data: null });
    }
    return res.status(500).json({ success: false, message: 'Commerce admin request failed', data: null });
}

function completedMutationResponseFailure(res: Response, error: unknown, action: string, refreshTarget = 'the order') {
    console.error(`Commerce admin ${action} response failed after commit`, error);
    if (res.headersSent) return res;
    return res.status(500).json({ success: false, message: `${action} was recorded, but confirmation could not be returned. Refresh ${refreshTarget} before taking another action.`, data: null });
}

export default class CommerceAdminController {
    static async shiprocketPickups(_req: Request, res: Response) {
        try { return res.json({ success: true, data: { pickups: await listShiprocketPickups() } }); }
        catch (error) { return failure(res, error); }
    }
    static async shiprocketLabel(req: Request, res: Response) {
        try { return res.json({ success: true, data: { url: await shiprocketLabel(String(req.params.publicId)) } }); }
        catch (error) { return failure(res, error); }
    }
    static async shiprocketQuote(req: Request, res: Response) {
        try { return res.json({ success: true, data: await quoteShiprocket(String(req.params.publicId), req.body) }); }
        catch (error) { return failure(res, error); }
    }
    static async shiprocketBook(req: Request, res: Response) {
        try { return res.json({ success: true, data: { order: await bookShiprocket(String(req.params.publicId), req.body, actorId(req)) } }); }
        catch (error) { return failure(res, error); }
    }
    static async shiprocketContinue(req: Request, res: Response) {
        try { return res.json({ success: true, data: { order: await continueShiprocket(String(req.params.publicId), actorId(req)) } }); }
        catch (error) { return failure(res, error); }
    }
    static async shiprocketReconcile(req: Request, res: Response) {
        try { return res.json({ success: true, data: { order: await reconcileShiprocket(String(req.params.publicId)) } }); }
        catch (error) { return failure(res, error); }
    }
    static async shiprocketRefresh(req: Request, res: Response) {
        try { return res.json({ success: true, data: { order: await refreshShiprocket(String(req.params.publicId)) } }); }
        catch (error) { return failure(res, error); }
    }
    static async shiprocketCancel(req: Request, res: Response) {
        try { return res.json({ success: true, data: { order: await cancelBookedShiprocket(String(req.params.publicId), actorId(req), req.body.reason) } }); }
        catch (error) { return failure(res, error); }
    }
    static async uploadProductMedia(req: Request, res: Response) {
        try {
            if (!req.file) throw new CommerceAdminError('Select a product image to upload', 400);
            const media = await CommerceProductMediaUploadService.upload(req.file);
            return res.status(201).json({ success: true, message: 'Product image uploaded', data: { media } });
        } catch (error) { return failure(res, error); }
    }

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
            const publicId = optionalRouteParam(req.params.publicId);
            const category = await CommerceAdminService.saveCategory(req.body, publicId);
            return res.status(publicId ? 200 : 201).json({ success: true, message: 'Category saved', data: { category } });
        } catch (error) { return failure(res, error); }
    }

    static async saveCollection(req: Request, res: Response) {
        try {
            const publicId = optionalRouteParam(req.params.publicId);
            const collection = await CommerceAdminService.saveCollection(req.body, publicId);
            return res.status(publicId ? 200 : 201).json({ success: true, message: 'Collection saved', data: { collection } });
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

    static async updateOrderStatus(req: Request, res: Response) {
        try {
            const order = await CommerceAdminService.updateOrderStatus(
                String(req.params.publicId), String(req.body.status), actorId(req), req.body.note
            );
            return res.json({ success: true, message: 'Order status updated', data: { order } });
        } catch (error) { return failure(res, error); }
    }

    static async cancelOrder(req: Request, res: Response) {
        let completed = false;
        try {
            const order = await CommerceAdminService.cancelOrder(String(req.params.publicId), actorId(req), req.body.reason);
            completed = true;
            return res.json({ success: true, message: 'Order cancelled', data: { order } });
        } catch (error) { return completed ? completedMutationResponseFailure(res, error, 'Order cancellation') : failure(res, error); }
    }

    static async requestCancellation(req: Request, res: Response) {
        let completed = false;
        try {
            const order = await CommerceAdminService.requestCancellation(String(req.params.publicId), actorId(req), String(req.body.reason), 'ADMIN');
            completed = true;
            return res.json({ success: true, message: 'Cancellation request recorded for courier interception or return review', data: { order } });
        } catch (error) { return completed ? completedMutationResponseFailure(res, error, 'Cancellation request') : failure(res, error); }
    }

    static async createShipment(req: Request, res: Response) {
        try {
            const order = await CommerceAdminService.createShipment(String(req.params.publicId), req.body, actorId(req));
            return res.status(201).json({ success: true, message: 'Shipment created', data: { order } });
        } catch (error) { return failure(res, error); }
    }

    static async updateShipmentStatus(req: Request, res: Response) {
        try {
            const order = await CommerceAdminService.updateShipmentStatus(
                String(req.params.publicId),
                String(req.params.shipmentPublicId),
                String(req.body.status),
                actorId(req)
            );
            return res.json({ success: true, message: 'Shipment status updated', data: { order } });
        } catch (error) { return failure(res, error); }
    }

    static async updateShipmentDetails(req: Request, res: Response) {
        try {
            const order = await CommerceAdminService.updateShipmentDetails(String(req.params.publicId), String(req.params.shipmentPublicId), req.body, actorId(req));
            return res.json({ success: true, message: 'Shipment details updated', data: { order } });
        } catch (error) { return failure(res, error); }
    }

    static async referrals(req: Request, res: Response) {
        try {
            return res.json({ success: true, message: 'Referral activity found', data: await adminReferralReport(req.query) });
        } catch (error) { return failure(res, error); }
    }

    static async adjustCredits(req: Request, res: Response) {
        let completed = false;
        try {
            const credits = await adjustCredits(
                String(req.params.customerPublicId),
                Number(req.body.amount),
                String(req.body.reason || ''),
                actorId(req),
                req.body.idempotency_key ? String(req.body.idempotency_key) : undefined
            );
            completed = true;
            return res.json({ success: true, message: 'Vastriqo Credits adjusted', data: { credits } });
        } catch (error) { return completed ? completedMutationResponseFailure(res, error, 'Credit adjustment', 'credit history') : failure(res, error); }
    }

    static async creditTransactions(req: Request, res: Response) {
        try {
            return res.json({ success: true, message: 'Credit transactions found', data: await adminCreditTransactions(req.query) });
        } catch (error) { return failure(res, error); }
    }
}
