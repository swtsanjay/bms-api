import { Router } from 'express';
import { param, query } from 'express-validator';
import { commerceCustomerAuth } from '../customer/auth-middleware';
import Controller from './controller';
import { paginationRules, validateReviewRequest } from './validation';

const router = Router();
router.use((_req, res, next) => { res.setHeader('Cache-Control', 'no-store'); next(); });
const productId = () => param('productId').isUUID().withMessage('Product id is invalid');
router.get('/products/:productId', [
    productId(), ...paginationRules(20),
    query('sort').optional().isIn(['newest', 'highest', 'lowest']).withMessage('Review sort is invalid'),
    query('rating').optional().isInt({ min: 1, max: 5 }).withMessage('Rating filter is invalid'),
    validateReviewRequest
], Controller.list);
router.get('/products/:productId/mine', commerceCustomerAuth, [productId(), validateReviewRequest], Controller.mine);
router.post('/products/:productId', commerceCustomerAuth, [productId(), validateReviewRequest], Controller.create);
export default router;
