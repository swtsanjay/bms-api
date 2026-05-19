import { Request as ExpressRequest, Response as ExpressResponse, Router } from 'express';
import { StatusCodes } from 'http-status-codes';
import { Message } from '../../lib/Messages';
import Response from '../../lib/api-response';
import authRoutes from './modules/auth/route';
import { verifyJWT } from './middlewares/jwt-auth';
import appUserRoutes from './modules/user/route';
import orderRoutes from './modules/order/route';
import fileRoutes from './modules/file/route';
import categoryRoutes from './modules/category/route';
import transactionRoutes from './modules/transaction/route';
import productRoutes from './modules/product/route';
import iotRoutes from './modules/iot/route';
import invoiceRoutes from './modules/invoice/route';
import userSellerDetailRoutes from './modules/userSellerDetail/route';
import shopifyApisRoutes from './modules/shopify-apis/route';
import inquiryRoutes from './modules/inquiry/route';

const router = Router();

router.all('/status', (req: ExpressRequest, res: ExpressResponse) => {
    Response.success(
        res,
        Message.ok.message,
        {
            headers: req.headers,
            params: req.params,
            query: req.query,
            body: req.body
        },
        StatusCodes.OK
    );
});


router.use('/auth', authRoutes);
router.use('/iot', iotRoutes);
router.use('/shopify-apis', shopifyApisRoutes);
router.use(verifyJWT);
router.use('/user', appUserRoutes);
router.use('/order', orderRoutes);
router.use('/file', fileRoutes);
router.use('/category', categoryRoutes);
router.use('/transaction', transactionRoutes);
router.use('/product', productRoutes);
router.use('/invoice', invoiceRoutes);
router.use('/user-seller-details', userSellerDetailRoutes);
router.use('/inquiry', inquiryRoutes);

export default router;
