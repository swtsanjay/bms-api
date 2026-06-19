import { Request as ExpressRequest, Response as ExpressResponse } from 'express';
import { StatusCodes } from 'http-status-codes';
import SharedShopifyProductSitemapService from '../../../../shared-services/shopifyProductSitemap';

export default class ShopifyProductController {
    static async sitemap(_req: ExpressRequest, res: ExpressResponse) {
        try {
            const products = await SharedShopifyProductSitemapService.list();

            return res.status(StatusCodes.OK).json({
                success: true,
                data: { products }
            });
        } catch (_error: unknown) {
            return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
                success: false,
                message: 'We could not load sitemap products right now. Please try again.'
            });
        }
    }
}
