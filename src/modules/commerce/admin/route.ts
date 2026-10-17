import { Router, type NextFunction, type Request, type Response } from 'express';
import { body, param } from 'express-validator';
import multer from 'multer';
import { checkFormValidations } from '../../../api/admin/middlewares/form-validation/express-validator';
import { requireStaffRoles } from '../../../api/admin/middlewares/jwt-auth';
import CommerceAdminController from './controller';
import { getStaffReturn, listStaffReturns, reviewStaffReturn } from '../returns/controller';

const router = Router();
router.use(requireStaffRoles('ADMIN', 'EMPLOYEE', 'CHECKER'));
const catalogWrite = requireStaffRoles('ADMIN', 'EMPLOYEE');
const returnReview = requireStaffRoles('ADMIN', 'EMPLOYEE');
const adminOnly = requireStaffRoles('ADMIN');

const uploadProductImage = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 25 * 1024 * 1024, files: 1 }
}).single('file');

router.post('/product-media/upload', catalogWrite, (req: Request, res: Response, next: NextFunction) => {
    uploadProductImage(req, res, (error) => {
        if (error instanceof multer.MulterError) {
            return res.status(error.code === 'LIMIT_FILE_SIZE' ? 413 : 400).json({
                success: false,
                message: error.code === 'LIMIT_FILE_SIZE' ? 'Product image must be 25 MB or smaller' : error.message,
                data: null
            });
        }
        if (error) return next(error);
        next();
    });
}, CommerceAdminController.uploadProductMedia);

router.get('/products', CommerceAdminController.products);
router.get('/products/:publicId', [param('publicId').isUUID(), checkFormValidations], CommerceAdminController.product);
router.post('/products', catalogWrite, [
    body('title').trim().notEmpty().isLength({ max: 255 }),
    body('status').optional().isIn(['DRAFT', 'ACTIVE', 'OUT_OF_STOCK', 'ARCHIVED']),
    body('variants').optional().isArray({ max: 100 }),
    body('variants.*.title').optional().trim().notEmpty().isLength({ max: 255 }),
    body('variants.*.price').optional().isFloat({ min: 0 }),
    body('variants.*.inventory_quantity').optional().isInt({ min: 0, max: 2147483647 }),
    body('media').optional().isArray({ max: 100 }),
    body('media.*.public_id').isUUID(),
    body('media.*.role').optional().isIn(['FEATURED', 'GALLERY']),
    body('media.*.alt_text').optional({ nullable: true }).trim().isLength({ max: 500 }),
    checkFormValidations
], CommerceAdminController.saveProduct);
router.put('/products/:publicId', catalogWrite, [
    param('publicId').isUUID(),
    body('title').trim().notEmpty().isLength({ max: 255 }),
    body('status').optional().isIn(['DRAFT', 'ACTIVE', 'OUT_OF_STOCK', 'ARCHIVED']),
    body('variants').optional().isArray({ max: 100 }),
    body('variants.*.title').optional().trim().notEmpty().isLength({ max: 255 }),
    body('variants.*.price').optional().isFloat({ min: 0 }),
    body('variants.*.inventory_quantity').optional().isInt({ min: 0, max: 2147483647 }),
    body('media').optional().isArray({ max: 100 }),
    body('media.*.public_id').isUUID(),
    body('media.*.role').optional().isIn(['FEATURED', 'GALLERY']),
    body('media.*.alt_text').optional({ nullable: true }).trim().isLength({ max: 500 }),
    checkFormValidations
], (req: Request, res: Response) => {
    req.body.public_id = req.params.publicId;
    return CommerceAdminController.saveProduct(req, res);
});

router.get('/taxonomy', CommerceAdminController.taxonomy);
router.post('/categories', adminOnly, [body('name').trim().notEmpty(), body('status').optional().isIn(['DRAFT', 'ACTIVE', 'ARCHIVED']), checkFormValidations], CommerceAdminController.saveCategory);
router.put('/categories/:publicId', adminOnly, [param('publicId').isUUID(), body('name').trim().notEmpty(), checkFormValidations], CommerceAdminController.saveCategory);
router.delete('/categories/:publicId', adminOnly, [param('publicId').isUUID(), checkFormValidations], CommerceAdminController.deleteCategory);
router.post('/collections', adminOnly, [body('title').trim().notEmpty(), body('status').optional().isIn(['DRAFT', 'ACTIVE', 'ARCHIVED']), checkFormValidations], CommerceAdminController.saveCollection);
router.put('/collections/:publicId', adminOnly, [param('publicId').isUUID(), body('title').trim().notEmpty(), checkFormValidations], CommerceAdminController.saveCollection);
router.delete('/collections/:publicId', adminOnly, [param('publicId').isUUID(), checkFormValidations], CommerceAdminController.deleteCollection);
router.get('/customers', adminOnly, CommerceAdminController.customers);
router.get('/shipping', adminOnly, CommerceAdminController.shippingSettings);
router.put('/shipping/rates/:id', adminOnly, [param('id').isInt({ min: 1 }), body('amount').isFloat({ min: 0 }), body('free_above_amount').optional({ nullable: true }).isFloat({ min: 0 }), checkFormValidations], CommerceAdminController.updateShippingRate);

router.get('/orders', CommerceAdminController.orders);
router.get('/orders/:publicId', [param('publicId').isUUID(), checkFormValidations], CommerceAdminController.order);
router.patch('/orders/:publicId/status', adminOnly, [
    param('publicId').isUUID(),
    body('status').isIn(['ACCEPTED']),
    body('note').optional({ nullable: true }).trim().isLength({ max: 500 }),
    checkFormValidations
], CommerceAdminController.updateOrderStatus);
router.get('/returns', listStaffReturns);
router.get('/returns/:publicId', [param('publicId').isUUID(), checkFormValidations], getStaffReturn);
router.patch('/returns/:publicId/decision', returnReview, [
    param('publicId').isUUID(),
    body('decision').isIn(['APPROVED', 'REJECTED']),
    body('note').isString().trim().notEmpty().isLength({ max: 2000 }),
    checkFormValidations
], reviewStaffReturn);
router.post('/orders/:publicId/confirm-payment', adminOnly, [
    param('publicId').isUUID(),
    body('note').optional({ nullable: true }).trim().isLength({ max: 500 }),
    checkFormValidations
], CommerceAdminController.confirmPayment);
router.post('/orders/:publicId/cancel', adminOnly, [
    param('publicId').isUUID(),
    body('reason').optional({ nullable: true }).trim().isLength({ max: 500 }),
    checkFormValidations
], CommerceAdminController.cancelOrder);
router.post('/orders/:publicId/cancel-request', adminOnly, [
    param('publicId').isUUID(), body('reason').isString().trim().notEmpty().isLength({ max: 500 }), checkFormValidations
], CommerceAdminController.requestCancellation);
const parcelRules = [
    param('publicId').isUUID(),
    body('pickup_location').isString().trim().notEmpty().isLength({ max: 150 }),
    body('pickup_postcode').isString().matches(/^\d{6}$/),
    body('weight').isFloat({ gt: 0, max: 100 }),
    body('length').isFloat({ gt: 0.5, max: 200 }),
    body('breadth').isFloat({ gt: 0.5, max: 200 }),
    body('height').isFloat({ gt: 0.5, max: 200 }),
];
router.get('/shiprocket/pickups', adminOnly, CommerceAdminController.shiprocketPickups);
router.get('/orders/:publicId/shiprocket/label', adminOnly, [param('publicId').isUUID(), checkFormValidations], CommerceAdminController.shiprocketLabel);
router.post('/orders/:publicId/shiprocket/quote', adminOnly, [...parcelRules, checkFormValidations], CommerceAdminController.shiprocketQuote);
router.post('/orders/:publicId/shiprocket/book', adminOnly, [...parcelRules, body('courier_id').isInt({ min: 1 }), checkFormValidations], CommerceAdminController.shiprocketBook);
router.post('/orders/:publicId/shiprocket/continue', adminOnly, [param('publicId').isUUID(), checkFormValidations], CommerceAdminController.shiprocketContinue);
router.post('/orders/:publicId/shiprocket/reconcile', adminOnly, [param('publicId').isUUID(), checkFormValidations], CommerceAdminController.shiprocketReconcile);
router.post('/orders/:publicId/shiprocket/refresh', adminOnly, [param('publicId').isUUID(), checkFormValidations], CommerceAdminController.shiprocketRefresh);
router.post('/orders/:publicId/shiprocket/cancel', adminOnly, [param('publicId').isUUID(), body('reason').optional().trim().isLength({ max: 500 }), checkFormValidations], CommerceAdminController.shiprocketCancel);
router.post('/orders/:publicId/shipments', adminOnly, [
    param('publicId').isUUID(),
    body('courier_type').isIn(['SHIPROCKET', 'OTHER']),
    body('courier_name').optional({ nullable: true }).trim().isLength({ max: 150 }),
    body('tracking_number').optional({ nullable: true }).trim().isLength({ max: 191 }),
    body('tracking_url').optional({ nullable: true, checkFalsy: true }).trim().isURL({ protocols: ['http', 'https'], require_protocol: true }),
    body('items').not().exists(),
    checkFormValidations
], CommerceAdminController.createShipment);
router.patch('/orders/:publicId/shipments/:shipmentPublicId', adminOnly, [
    param('publicId').isUUID(),
    param('shipmentPublicId').isUUID(),
    body('status').isIn(['SHIPPED', 'IN_TRANSIT', 'OUT_FOR_DELIVERY', 'DELIVERY_ISSUE', 'DELIVERED']),
    checkFormValidations
], CommerceAdminController.updateShipmentStatus);
router.patch('/orders/:publicId/shipments/:shipmentPublicId/details', adminOnly, [
    param('publicId').isUUID(), param('shipmentPublicId').isUUID(),
    body('courier_name').optional({ nullable: true }).trim().isLength({ max: 150 }),
    body('tracking_number').optional({ nullable: true }).trim().isLength({ max: 191 }),
    body('tracking_url').optional({ nullable: true, checkFalsy: true }).trim().isURL({ protocols: ['http', 'https'], require_protocol: true }),
    checkFormValidations
], CommerceAdminController.updateShipmentDetails);

router.get('/referrals', adminOnly, CommerceAdminController.referrals);
router.get('/credits/transactions', adminOnly, CommerceAdminController.creditTransactions);
router.post('/credits/:customerPublicId/adjustments', adminOnly, [
    param('customerPublicId').isUUID(),
    body('amount').isFloat({ min: -1000000, max: 1000000 }).custom((value) => Number(value) !== 0),
    body('reason').trim().notEmpty().isLength({ max: 500 }),
    body('idempotency_key').optional().isUUID(),
    checkFormValidations
], CommerceAdminController.adjustCredits);

export default router;
