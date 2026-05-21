import { Router } from 'express';
import { verifyShopifyCustomerJWT } from '../../middlewares/shopify-customer-auth';
import ShopifyApisController from './controller';

const shopifyApisRoutes = Router();

shopifyApisRoutes.post('/login-customer-by-shopify-token', ShopifyApisController.loginCustomerByShopifyToken);
shopifyApisRoutes.get('/customer-details', verifyShopifyCustomerJWT, ShopifyApisController.customerDetails);
shopifyApisRoutes.get('/customer-access-token', verifyShopifyCustomerJWT, ShopifyApisController.customerAccessToken);

export default shopifyApisRoutes;
