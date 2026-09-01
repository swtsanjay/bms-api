import { Router } from 'express';
import customerAuthRoutes from './customer/auth-route';
import catalogRoutes from './catalog/route';
import cartRoutes from './cart/route';
import checkoutRoutes from './checkout/route';

const router = Router();

router.use('/customers', customerAuthRoutes);
router.use('/catalog', catalogRoutes);
router.use('/carts', cartRoutes);
router.use('/checkout', checkoutRoutes);

export default router;
