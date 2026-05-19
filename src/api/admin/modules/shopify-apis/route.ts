import { Router } from 'express';
import { verifyShopifyCustomerJWT } from '../../middlewares/shopify-customer-auth';
import ShopifyApisController from './controller';

const shopifyApisRoutes = Router();

shopifyApisRoutes.post('/login-customer-by-shopify-token', ShopifyApisController.loginCustomerByShopifyToken);
shopifyApisRoutes.get('/customer-details', verifyShopifyCustomerJWT, ShopifyApisController.customerDetails);

export default shopifyApisRoutes;
