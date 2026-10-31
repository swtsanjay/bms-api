import { Router } from 'express';
import customerAuthRoutes from './customer/auth-route';
import catalogRoutes from './catalog/route';
import cartRoutes from './cart/route';
import checkoutRoutes from './checkout/route';
import reviewRoutes from './reviews/route';
import referralRoutes from './referral/route';
import designRoutes from './design/route';
import billRoutes from './bills/route';
import walletRoutes from './wallet/route';

const router = Router();

router.use('/customers', customerAuthRoutes);
router.use('/catalog', catalogRoutes);
router.use('/carts', cartRoutes);
router.use('/checkout', checkoutRoutes);
router.use('/reviews', reviewRoutes);
router.use('/referrals', referralRoutes);
router.use('/designs', designRoutes);
router.use('/bills', billRoutes);
router.use('/wallet', walletRoutes);

export default router;
