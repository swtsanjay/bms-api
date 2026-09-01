import type { Request, Response } from 'express';
import CommerceCatalogService from './service';

export default class CommerceCatalogController {
    static async products(req: Request, res: Response) {
        try {
            const result = await CommerceCatalogService.listProducts({
                page: req.query.page as string,
                limit: req.query.limit as string,
                search: req.query.search as string,
                category: req.query.category as string,
                collection: req.query.collection as string
            });
            return res.json({ success: true, message: 'Products found', data: result });
        } catch (error) {
            console.error('Commerce catalog list failed', error);
            return res.status(500).json({ success: false, message: 'Unable to load products', data: null });
        }
    }

    static async product(req: Request, res: Response) {
        try {
            const product = await CommerceCatalogService.productBySlug(String(req.params.slug || ''));
            if (!product) {
                return res.status(404).json({ success: false, message: 'Product not found', data: null });
            }
            return res.json({ success: true, message: 'Product found', data: { product } });
        } catch (error) {
            console.error('Commerce catalog detail failed', error);
            return res.status(500).json({ success: false, message: 'Unable to load product', data: null });
        }
    }
}
