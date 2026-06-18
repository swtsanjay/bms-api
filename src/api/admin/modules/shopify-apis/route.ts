import { Router } from 'express';
import { verifyJWT } from '../../middlewares/jwt-auth';
import { verifyShopifyCustomerJWT } from '../../middlewares/shopify-customer-auth';
import ShopifyApisController from './controller';

const shopifyApisRoutes = Router();

shopifyApisRoutes.get('/get-related-products', ShopifyApisController.relatedProducts);
shopifyApisRoutes.get('/collections/:slug', ShopifyApisController.collectionBySlug);
shopifyApisRoutes.post('/admin-access-token', verifyJWT, ShopifyApisController.storeShopifyAdminAccessToken);
shopifyApisRoutes.post('/login-customer-by-shopify-token', ShopifyApisController.loginCustomerByShopifyToken);
shopifyApisRoutes.get('/customer-details', verifyShopifyCustomerJWT, ShopifyApisController.customerDetails);
shopifyApisRoutes.get('/customer-profile', verifyShopifyCustomerJWT, ShopifyApisController.customerProfile);
shopifyApisRoutes.post('/customer-profile', verifyShopifyCustomerJWT, ShopifyApisController.updateCustomerProfile);
shopifyApisRoutes.get('/customer-access-token', verifyShopifyCustomerJWT, ShopifyApisController.customerAccessToken);
shopifyApisRoutes.get('/customer-orders', verifyShopifyCustomerJWT, ShopifyApisController.customerOrders);
shopifyApisRoutes.get('/checkout-validity', verifyShopifyCustomerJWT, ShopifyApisController.checkoutValidity);
shopifyApisRoutes.post('/checkout-customer-details', verifyShopifyCustomerJWT, ShopifyApisController.updateCheckoutCustomerDetails);
shopifyApisRoutes.get('/customer-addresses', verifyShopifyCustomerJWT, ShopifyApisController.customerAddresses);
shopifyApisRoutes.post('/customer-addresses', verifyShopifyCustomerJWT, ShopifyApisController.createCustomerAddress);
shopifyApisRoutes.post('/customer-addresses/update', verifyShopifyCustomerJWT, ShopifyApisController.updateCustomerAddress);
shopifyApisRoutes.post('/customer-addresses/delete', verifyShopifyCustomerJWT, ShopifyApisController.deleteCustomerAddress);
shopifyApisRoutes.post('/customer-addresses/default', verifyShopifyCustomerJWT, ShopifyApisController.setDefaultCustomerAddress);

export default shopifyApisRoutes;
