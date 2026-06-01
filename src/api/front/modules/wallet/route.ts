import { Router } from 'express';
import { verifyShopifyCustomerJWT } from '../../../admin/middlewares/shopify-customer-auth';
import FrontWalletController from './controller';

const walletRoutes = Router();

walletRoutes.get('/', verifyShopifyCustomerJWT, FrontWalletController.summary);

export default walletRoutes;
