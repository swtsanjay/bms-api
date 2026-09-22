import { Router, type NextFunction, type Request, type Response } from 'express';
import { body, param, query } from 'express-validator';
import multer from 'multer';
import { requireCommerceAdmin } from '../admin/auth-middleware';
import Controller from './controller';
import { reviewStatuses } from './policy';
import { paginationRules, validateReviewRequest } from './validation';
import { MAX_REVIEW_THUMBNAIL_BYTES } from './upload-policy';

const router = Router();
router.use((_req, res, next) => { res.setHeader('Cache-Control', 'no-store'); next(); });
router.use(requireCommerceAdmin);
router.get('/', [
    ...paginationRules(100),
    query('status').optional().isIn(reviewStatuses),
    query('product_public_id').optional().isUUID(),
    validateReviewRequest
], Controller.adminList);
router.post('/:reviewId/media/:mediaId/thumbnail-upload', [
    param('reviewId').isUUID(),
    param('mediaId').isInt({ min: 1 }),
    body('mime_type').isIn(['image/jpeg', 'image/png', 'image/webp']),
    body('byte_size').isInt({ min: 1, max: 1024 * 1024 }),
    validateReviewRequest
], Controller.presignThumbnail);
router.post('/:reviewId/media/:mediaId/thumbnail', [
    param('reviewId').isUUID(),
    param('mediaId').isInt({ min: 1 }),
    body('upload_id').isUUID(),
    validateReviewRequest
], Controller.saveThumbnail);
const uploadThumbnail = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: MAX_REVIEW_THUMBNAIL_BYTES, files: 1, fields: 0 }
}).single('file');
router.post('/:reviewId/media/:mediaId/thumbnail-file', [
    param('reviewId').isUUID(),
    param('mediaId').isInt({ min: 1 }),
    validateReviewRequest
], (req: Request, res: Response, next: NextFunction) => {
    uploadThumbnail(req, res, (error) => {
        if (error instanceof multer.MulterError) return res.status(error.code === 'LIMIT_FILE_SIZE' ? 413 : 400).json({
            success: false,
            message: error.code === 'LIMIT_FILE_SIZE' ? 'Thumbnail must be 1 MB or smaller' : error.message,
            data: null
        });
        if (error) return next(error);
        next();
    });
}, Controller.saveThumbnailFile);
router.patch('/:reviewId', [
    param('reviewId').isUUID(),
    body('status').isIn(reviewStatuses),
    body('version').isInt({ min: 1 }),
    body('note').optional().isString().bail().trim().isLength({ max: 500 }),
    validateReviewRequest
], Controller.moderate);
export default router;
