import { Router } from 'express';
import { body, param } from 'express-validator';
import { checkFormValidations } from '../../../api/front/middlewares/form-validation/express-validator';
import { commerceCustomerAuth } from '../customer/auth-middleware';
import CommerceCheckoutController from './controller';

const router = Router();

const addressRules = (prefix: string) => [
    body(`${prefix}.first_name`).trim().notEmpty().isLength({ max: 100 }),
    body(`${prefix}.address_line_1`).trim().notEmpty().isLength({ max: 255 }),
    body(`${prefix}.city`).trim().notEmpty().isLength({ max: 120 }),
    body(`${prefix}.state`).trim().notEmpty().isLength({ max: 120 }),
    body(`${prefix}.postcode`).trim().notEmpty().isPostalCode('IN').withMessage('Indian postcode is invalid'),
    body(`${prefix}.phone`).optional({ nullable: true, checkFalsy: true }).trim().isLength({ min: 8, max: 30 })
];

router.use(commerceCustomerAuth);
router.post('/orders', [
    body('cart_public_id').isUUID().withMessage('Cart id is invalid'),
    body('shipping_method_code').optional().trim().isLength({ max: 80 }),
    body('payment_method').isIn(['MANUAL', 'COD']).withMessage('Payment method must be MANUAL or COD'),
    ...addressRules('shipping_address'),
    body('billing_address').optional({ nullable: true }).isObject(),
    checkFormValidations
], CommerceCheckoutController.placeOrder);
router.get('/orders', CommerceCheckoutController.orders);
router.get('/orders/:publicId', [param('publicId').isUUID(), checkFormValidations], CommerceCheckoutController.order);

export default router;
