import { Router } from 'express';
import ShopifyApisController from './controller';

const shopifyApisRoutes = Router();

shopifyApisRoutes.post('/login-customer-by-shopify-token', ShopifyApisController.loginCustomerByShopifyToken);

export default shopifyApisRoutes;
