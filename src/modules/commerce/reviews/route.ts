import { Router, type NextFunction, type Request, type Response } from 'express';
import { param, query } from 'express-validator';
import { commerceCustomerAuth } from '../customer/auth-middleware';
import Controller from './controller';
import { paginationRules, validateReviewRequest } from './validation';

const router = Router();
router.use((_req, res, next) => { res.setHeader('Cache-Control', 'no-store'); next(); });
const productId = () => param('productId').isUUID().withMessage('Product id is invalid');
function requireJson(req: Request, res: Response, next: NextFunction) {
    if (!req.is('application/json')) return res.status(415).json({ success: false, message: 'Send review data as JSON; upload files directly to S3', data: null });
    return next();
}
router.get('/products/:productId', [
    productId(), ...paginationRules(20),
    query('sort').optional().isIn(['newest', 'highest', 'lowest']).withMessage('Review sort is invalid'),
    query('rating').optional().isInt({ min: 1, max: 5 }).withMessage('Rating filter is invalid'),
    validateReviewRequest
], Controller.list);
router.get('/products/:productId/mine', commerceCustomerAuth, [productId(), validateReviewRequest], Controller.mine);
router.post('/products/:productId/uploads', commerceCustomerAuth, [productId(), validateReviewRequest], requireJson, Controller.presignUpload);
router.post('/products/:productId', commerceCustomerAuth, [productId(), validateReviewRequest], requireJson, Controller.create);
export default router;
