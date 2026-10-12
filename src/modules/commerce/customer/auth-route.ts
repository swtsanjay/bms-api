import { Router } from 'express';
import crypto from 'node:crypto';
import type { Request } from 'express';
import { body } from 'express-validator';
import { checkFormValidations } from '../../../api/front/middlewares/form-validation/express-validator';
import CommerceCustomerAuthController from './auth-controller';
import { commerceCustomerAuth } from './auth-middleware';
import CommerceCustomerAccountController from './account-controller';
import { createRateLimit, emailRateLimit, requestIp } from '../../../shared-services/rate-limit';

const router = Router();

function hash(value: string) {
    return crypto.createHash('sha256').update(value).digest('hex');
}

function refreshCredential(req: Request) {
    const bodyToken = typeof req.body?.refresh_token === 'string' ? req.body.refresh_token.trim() : '';
    if (bodyToken) return bodyToken;
    const cookies = String(req.headers.cookie || '').split(';').map((part) => part.trim());
    for (const name of ['__Host-vsq_refresh_token', 'vsq_refresh_token']) {
        const found = cookies.find((part) => part.startsWith(`${name}=`));
        if (found) return found.slice(name.length + 1);
    }
    return '';
}

const signupLimit = emailRateLimit('commerce:signup', 5, 3600);
const loginLimit = emailRateLimit('commerce:login', 10, 900);
const forgotPasswordLimit = emailRateLimit('commerce:forgot', 5, 3600);
const resetPasswordLimit = createRateLimit([
    { points: 10, durationSeconds: 3600, key: (req) => `reset:${req.body?.token ? hash(String(req.body.token)) : `missing:${requestIp(req)}`}` }
]);
const refreshLimit = createRateLimit([
    { points: 60, durationSeconds: 900, key: (req) => {
        const token = refreshCredential(req);
        return `refresh:${token ? hash(token) : `missing:${requestIp(req)}`}`;
    } }
]);

const emailRule = body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Email is invalid')
    .isLength({ max: 191 }).withMessage('Email is too long');

const passwordRule = body('password')
    .isString()
    .isLength({ min: 8, max: 8 }).withMessage('Password must be exactly 8 characters');

router.post('/signup', [signupLimit,
    emailRule,
    passwordRule,
    body('first_name').optional({ nullable: true }).trim().isLength({ max: 100 }),
    body('last_name').optional({ nullable: true }).trim().isLength({ max: 100 }),
    body('phone').optional({ nullable: true, checkFalsy: true }).trim().isLength({ min: 8, max: 30 }),
    body('referral_code').optional({ nullable: true, checkFalsy: true }).trim().matches(/^VSQ[A-Z0-9]{6,17}$/i),
    checkFormValidations
], CommerceCustomerAuthController.signup);

router.post('/login', [
    loginLimit,
    emailRule,
    body('password').isString().notEmpty(),
    body('referral_code').optional({ nullable: true, checkFalsy: true }).trim().matches(/^VSQ[A-Z0-9]{6,17}$/i),
    checkFormValidations
], CommerceCustomerAuthController.login);
router.post('/forgot-password', [
    forgotPasswordLimit,
    emailRule,
    checkFormValidations
], CommerceCustomerAuthController.forgotPassword);
router.post('/reset-password', [
    resetPasswordLimit,
    body('token').isString().matches(/^[A-Za-z0-9_-]{43}$/).withMessage('Password reset token is invalid'),
    passwordRule,
    checkFormValidations
], CommerceCustomerAuthController.resetPassword);
router.post('/refresh', refreshLimit, CommerceCustomerAuthController.refresh);
router.post('/logout', CommerceCustomerAuthController.logout);
router.get('/me', commerceCustomerAuth, CommerceCustomerAuthController.me);
router.patch('/me', commerceCustomerAuth, [
    body('first_name').optional({ nullable: true }).trim().isLength({ max: 100 }),
    body('last_name').optional({ nullable: true }).trim().isLength({ max: 100 }),
    body('phone').optional({ nullable: true, checkFalsy: true }).trim().isLength({ min: 8, max: 30 }),
    checkFormValidations
], CommerceCustomerAccountController.updateProfile);
router.post('/change-password', commerceCustomerAuth, [
    body('current_password').isString().notEmpty(),
    body('new_password').isString().isLength({ min: 8, max: 8 }).withMessage('Password must be exactly 8 characters'),
    checkFormValidations
], CommerceCustomerAccountController.changePassword);
router.get('/addresses', commerceCustomerAuth, CommerceCustomerAccountController.addresses);
router.post('/addresses', commerceCustomerAuth, CommerceCustomerAccountController.createAddress);
router.patch('/addresses/:publicId', commerceCustomerAuth, CommerceCustomerAccountController.updateAddress);
router.delete('/addresses/:publicId', commerceCustomerAuth, CommerceCustomerAccountController.deleteAddress);
router.get('/wishlist', commerceCustomerAuth, CommerceCustomerAccountController.wishlist);
router.post('/wishlist/toggle', commerceCustomerAuth, [
    body('product_public_id').isUUID(),
    checkFormValidations
], CommerceCustomerAccountController.toggleWishlist);

export default router;
