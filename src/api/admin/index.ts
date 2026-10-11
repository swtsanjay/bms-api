import { Router } from 'express';
import { StatusCodes } from 'http-status-codes';
import { Message } from '../../lib/Messages';
import Response from '../../lib/api-response';
import authRoutes from './modules/auth/route';
import { requireStaffRoles, STAFF_ROLES, verifyJWT } from './middlewares/jwt-auth';
import appUserRoutes from './modules/user/route';
import orderRoutes from './modules/order/route';
import fileRoutes from './modules/file/route';
import categoryRoutes from './modules/category/route';
import transactionRoutes from './modules/transaction/route';
import productRoutes from './modules/product/route';
import iotRoutes from './modules/iot/route';
import invoiceRoutes from './modules/invoice/route';
import userSellerDetailRoutes from './modules/userSellerDetail/route';
import inquiryRoutes from './modules/inquiry/route';
import walletRoutes from './modules/wallet/route';
import commerceAdminRoutes from '../../modules/commerce/admin/route';
import commerceReviewRoutes from '../../modules/commerce/reviews/admin-route';
import commerceDesignRoutes from '../../modules/commerce/design/admin-route';
import commerceWalletRoutes from '../../modules/commerce/wallet/admin-route';

const router = Router();

router.get('/status', (_req, res) => {
    Response.success(res, Message.ok.message, { status: 'ok' }, StatusCodes.OK);
});

router.use('/auth', authRoutes);
router.use(verifyJWT);
// No device credential or caller policy exists for IoT writes, so only an
// administrator may use this legacy endpoint until one is established.
router.use('/iot', requireStaffRoles('ADMIN'), iotRoutes);
router.use('/wallet', requireStaffRoles(...STAFF_ROLES), walletRoutes);
router.use('/v1/commerce/reviews', requireStaffRoles('ADMIN'), commerceReviewRoutes);
router.use('/v1/commerce/designs', requireStaffRoles('ADMIN'), commerceDesignRoutes);
router.use('/v1/commerce/wallet', requireStaffRoles('ADMIN'), commerceWalletRoutes);
router.use('/v1/commerce', requireStaffRoles('ADMIN'), commerceAdminRoutes);
router.use('/user', appUserRoutes);
router.use('/order', requireStaffRoles(...STAFF_ROLES), orderRoutes);
router.use('/file', requireStaffRoles(...STAFF_ROLES), fileRoutes);
router.use('/category', requireStaffRoles(...STAFF_ROLES), categoryRoutes);
router.use('/transaction', requireStaffRoles(...STAFF_ROLES), transactionRoutes);
router.use('/product', requireStaffRoles(...STAFF_ROLES), productRoutes);
router.use('/invoice', requireStaffRoles(...STAFF_ROLES), invoiceRoutes);
router.use('/user-seller-details', requireStaffRoles(...STAFF_ROLES), userSellerDetailRoutes);
router.use('/inquiry', requireStaffRoles(...STAFF_ROLES), inquiryRoutes);

export default router;
