import { Router } from 'express';
import ShopifyProductController from './controller';

const shopifyProductRoutes = Router();

shopifyProductRoutes.get('/sitemap', ShopifyProductController.sitemap);

export default shopifyProductRoutes;
