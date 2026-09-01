import { Router, type Request, type Response } from 'express';
import { body, param } from 'express-validator';
import { checkFormValidations } from '../../../api/admin/middlewares/form-validation/express-validator';
import { requireCommerceAdmin } from './auth-middleware';
import CommerceAdminController from './controller';

const router = Router();
router.use(requireCommerceAdmin);

router.get('/products', CommerceAdminController.products);
router.get('/products/:publicId', [param('publicId').isUUID(), checkFormValidations], CommerceAdminController.product);
router.post('/products', [
    body('title').trim().notEmpty().isLength({ max: 255 }),
    body('status').optional().isIn(['DRAFT', 'ACTIVE', 'ARCHIVED']),
    body('variants').optional().isArray({ max: 100 }),
    body('variants.*.title').optional().trim().notEmpty().isLength({ max: 255 }),
    body('variants.*.price').optional().isFloat({ min: 0 }),
    body('variants.*.inventory_quantity').optional().isInt({ min: 0 }),
    checkFormValidations
], CommerceAdminController.saveProduct);
router.put('/products/:publicId', [
    param('publicId').isUUID(),
    body('title').trim().notEmpty().isLength({ max: 255 }),
    body('status').optional().isIn(['DRAFT', 'ACTIVE', 'ARCHIVED']),
    checkFormValidations
], (req: Request, res: Response) => {
    req.body.public_id = req.params.publicId;
    return CommerceAdminController.saveProduct(req, res);
});

router.get('/taxonomy', CommerceAdminController.taxonomy);
router.post('/categories', [body('name').trim().notEmpty(), body('status').optional().isIn(['DRAFT', 'ACTIVE', 'ARCHIVED']), checkFormValidations], CommerceAdminController.saveCategory);
router.put('/categories/:publicId', [param('publicId').isUUID(), body('name').trim().notEmpty(), checkFormValidations], CommerceAdminController.saveCategory);
router.delete('/categories/:publicId', [param('publicId').isUUID(), checkFormValidations], CommerceAdminController.deleteCategory);
router.post('/collections', [body('title').trim().notEmpty(), body('status').optional().isIn(['DRAFT', 'ACTIVE', 'ARCHIVED']), checkFormValidations], CommerceAdminController.saveCollection);
router.put('/collections/:publicId', [param('publicId').isUUID(), body('title').trim().notEmpty(), checkFormValidations], CommerceAdminController.saveCollection);
router.delete('/collections/:publicId', [param('publicId').isUUID(), checkFormValidations], CommerceAdminController.deleteCollection);
router.get('/customers', CommerceAdminController.customers);
router.get('/shipping', CommerceAdminController.shippingSettings);
router.put('/shipping/rates/:id', [param('id').isInt({ min: 1 }), body('amount').isFloat({ min: 0 }), body('free_above_amount').optional({ nullable: true }).isFloat({ min: 0 }), checkFormValidations], CommerceAdminController.updateShippingRate);

router.get('/orders', CommerceAdminController.orders);
router.get('/orders/:publicId', [param('publicId').isUUID(), checkFormValidations], CommerceAdminController.order);
router.post('/orders/:publicId/confirm-payment', [
    param('publicId').isUUID(),
    body('note').optional({ nullable: true }).trim().isLength({ max: 500 }),
    checkFormValidations
], CommerceAdminController.confirmPayment);
router.post('/orders/:publicId/cancel', [
    param('publicId').isUUID(),
    body('reason').optional({ nullable: true }).trim().isLength({ max: 500 }),
    checkFormValidations
], CommerceAdminController.cancelOrder);
router.post('/orders/:publicId/shipments', [
    param('publicId').isUUID(),
    body('courier_name').optional({ nullable: true }).trim().isLength({ max: 150 }),
    body('tracking_number').optional({ nullable: true }).trim().isLength({ max: 191 }),
    body('tracking_url').optional({ nullable: true, checkFalsy: true }).trim().isURL(),
    body('items').optional().isArray({ max: 100 }),
    checkFormValidations
], CommerceAdminController.createShipment);

export default router;
