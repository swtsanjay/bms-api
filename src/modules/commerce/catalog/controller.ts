import type { Request, Response } from 'express';
import CommerceCatalogService from './service';

export default class CommerceCatalogController {
    static async sitemapProducts(req: Request, res: Response) {
        try {
            const result = await CommerceCatalogService.sitemapProducts(req.query.page as string, req.query.limit as string);
            return res.json({ success: true, message: 'Sitemap products found', data: result });
        } catch (error) {
            console.error('Commerce sitemap products failed', error);
            return res.status(500).json({ success: false, message: 'Unable to load sitemap products', data: null });
        }
    }

    static async products(req: Request, res: Response) {
        try {
            const result = await CommerceCatalogService.listProducts({
                page: req.query.page as string,
                limit: req.query.limit as string,
                search: req.query.search as string,
                category: req.query.category as string,
                collection: req.query.collection as string,
                sort: req.query.sort as string,
                category_names: req.query.category_name as string | string[],
                sizes: req.query.size as string | string[],
                colors: req.query.color as string | string[],
                prices: req.query.price as string | string[],
                include_facets: req.query.include_facets as string
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

    static async productById(req: Request, res: Response) {
        try {
            const product = await CommerceCatalogService.productByPublicId(String(req.params.publicId || ''));
            if (!product) return res.status(404).json({ success: false, message: 'Product not found', data: null });
            return res.json({ success: true, message: 'Product found', data: { product } });
        } catch (error) {
            console.error('Commerce catalog detail failed', error);
            return res.status(500).json({ success: false, message: 'Unable to load product', data: null });
        }
    }

    static async relatedProducts(req: Request, res: Response) {
        try {
            const products = await CommerceCatalogService.relatedProducts(String(req.params.publicId || ''));
            return res.json({ success: true, message: 'Related products found', data: { products } });
        } catch (error) {
            console.error('Commerce related products failed', error);
            return res.status(500).json({ success: false, message: 'Unable to load related products', data: null });
        }
    }
}
