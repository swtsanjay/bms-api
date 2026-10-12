import { Router } from 'express';
import { body, param } from 'express-validator';
import { checkFormValidations } from '../../../api/front/middlewares/form-validation/express-validator';
import { commerceCustomerAuth } from '../customer/auth-middleware';
import { indianAddressValidationError } from '../address-validation';
import CommerceCheckoutController from './controller';
import { createCustomerReturn, customerReturns } from '../returns/controller';

const router = Router();

const addressRule = (prefix: string) => body(prefix).custom((address) => {
    const error = indianAddressValidationError(address);
    if (error) throw new Error(error);
    return true;
});

router.use(commerceCustomerAuth);
router.post('/orders', [
    body('cart_public_id').isUUID().withMessage('Cart id is invalid'),
    body('shipping_method_code').optional().trim().isLength({ max: 80 }),
    body('payment_method').isIn(['RAZORPAY', 'COD']).withMessage('Payment method must be RAZORPAY or COD'),
    body('referral_code').optional({ nullable: true, checkFalsy: true }).trim().matches(/^VSQ[A-Z0-9]{6,17}$/i),
    body('credits_to_apply').optional({ nullable: true }).isFloat({ min: 0, max: 1000000 }),
    addressRule('shipping_address'),
    body('billing_address').optional({ nullable: true }).custom((address) => {
        const error = indianAddressValidationError(address);
        if (error) throw new Error(error);
        return true;
    }),
    checkFormValidations
], CommerceCheckoutController.placeOrder);
router.post('/payments/razorpay/verify', [
    body('order_public_id').isUUID(),
    body('razorpay_payment_id').isString().matches(/^pay_[A-Za-z0-9]+$/),
    body('razorpay_signature').isString().isLength({ min: 64, max: 64 }).isHexadecimal(),
    checkFormValidations
], CommerceCheckoutController.verifyRazorpayPayment);
router.get('/orders', CommerceCheckoutController.orders);
router.get('/orders/:publicId', [param('publicId').isUUID(), checkFormValidations], CommerceCheckoutController.order);
router.get('/orders/:publicId/returns', [param('publicId').isUUID(), checkFormValidations], customerReturns);
router.post('/orders/:publicId/returns', [
    param('publicId').isUUID(),
    body('items').isArray({ min: 1, max: 100 }),
    body('items.*.order_item_id').isInt({ min: 1 }),
    body('items.*.quantity').isInt({ min: 1 }),
    body('reason_code').isIn(['SIZE_ISSUE', 'DAMAGED', 'WRONG_ITEM', 'NOT_AS_DESCRIBED', 'OTHER']),
    body('customer_note').optional({ nullable: true }).isString().isLength({ max: 2000 }),
    checkFormValidations
], createCustomerReturn);
router.get('/orders/:publicId/payment-status', [param('publicId').isUUID(), checkFormValidations], CommerceCheckoutController.paymentStatus);
router.post('/orders/:publicId/retry-payment', [param('publicId').isUUID(), checkFormValidations], CommerceCheckoutController.retryRazorpayPayment);

export default router;
