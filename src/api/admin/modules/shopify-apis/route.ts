import { Router } from 'express';
import { verifyShopifyCustomerJWT } from '../../middlewares/shopify-customer-auth';
import ShopifyApisController from './controller';

const shopifyApisRoutes = Router();

shopifyApisRoutes.post('/login-customer-by-shopify-token', ShopifyApisController.loginCustomerByShopifyToken);
shopifyApisRoutes.get('/customer-details', verifyShopifyCustomerJWT, ShopifyApisController.customerDetails);
shopifyApisRoutes.get('/customer-addresses', verifyShopifyCustomerJWT, ShopifyApisController.customerAddresses);
shopifyApisRoutes.post('/customer-addresses', verifyShopifyCustomerJWT, ShopifyApisController.createCustomerAddress);
shopifyApisRoutes.post('/customer-addresses/update', verifyShopifyCustomerJWT, ShopifyApisController.updateCustomerAddress);
shopifyApisRoutes.post('/customer-addresses/delete', verifyShopifyCustomerJWT, ShopifyApisController.deleteCustomerAddress);
shopifyApisRoutes.post('/customer-addresses/default', verifyShopifyCustomerJWT, ShopifyApisController.setDefaultCustomerAddress);

export default shopifyApisRoutes;
