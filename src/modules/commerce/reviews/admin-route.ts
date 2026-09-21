import { Router } from 'express';
import { body, param, query } from 'express-validator';
import { requireCommerceAdmin } from '../admin/auth-middleware';
import Controller from './controller';
import { reviewStatuses } from './policy';
import { paginationRules, validateReviewRequest } from './validation';

const router = Router();
router.use((_req, res, next) => { res.setHeader('Cache-Control', 'no-store'); next(); });
router.use(requireCommerceAdmin);
router.get('/', [
    ...paginationRules(100),
    query('status').optional().isIn(reviewStatuses),
    query('product_public_id').optional().isUUID(),
    validateReviewRequest
], Controller.adminList);
router.patch('/:reviewId', [
    param('reviewId').isUUID(),
    body('status').isIn(reviewStatuses),
    body('version').isInt({ min: 1 }),
    body('note').optional().isString().bail().trim().isLength({ max: 500 }),
    validateReviewRequest
], Controller.moderate);
export default router;
