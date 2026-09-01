import { Router } from 'express';
import type { NextFunction, Request, Response } from 'express';
import { body } from 'express-validator';
import { checkFormValidations } from '../../../api/front/middlewares/form-validation/express-validator';
import CommerceCustomerAuthController from './auth-controller';
import { commerceCustomerAuth } from './auth-middleware';
import CommerceCustomerAccountController from './account-controller';

const router = Router();

const attempts = new Map<string, { count: number; resetAt: number }>();
function rateLimit(scope: string, maximum: number, windowMs: number) {
    return (req: Request, res: Response, next: NextFunction) => {
        const key = `${scope}:${req.ip}:${String(req.body?.email || '').trim().toLowerCase()}`;
        const now = Date.now();
        if (attempts.size > 10000) {
            for (const [storedKey, stored] of attempts) if (stored.resetAt <= now) attempts.delete(storedKey);
        }
        const entry = attempts.get(key);
        if (!entry || entry.resetAt <= now) attempts.set(key, { count: 1, resetAt: now + windowMs });
        else {
            entry.count += 1;
            if (entry.count > maximum) {
                res.setHeader('Retry-After', String(Math.ceil((entry.resetAt - now) / 1000)));
                return res.status(429).json({ success: false, message: 'Too many attempts. Please try again later.', data: null });
            }
        }
        return next();
    };
}

const emailRule = body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Email is invalid')
    .isLength({ max: 191 }).withMessage('Email is too long');

const passwordRule = body('password')
    .isString()
    .isLength({ min: 8, max: 72 }).withMessage('Password must be between 8 and 72 characters')
    .matches(/[a-z]/).withMessage('Password must contain a lowercase letter')
    .matches(/[A-Z]/).withMessage('Password must contain an uppercase letter')
    .matches(/[0-9]/).withMessage('Password must contain a number');

router.post('/signup', [rateLimit('signup', 5, 60 * 60 * 1000),
    emailRule,
    passwordRule,
    body('first_name').optional({ nullable: true }).trim().isLength({ max: 100 }),
    body('last_name').optional({ nullable: true }).trim().isLength({ max: 100 }),
    body('phone').optional({ nullable: true, checkFalsy: true }).trim().isLength({ min: 8, max: 30 }),
    checkFormValidations
], CommerceCustomerAuthController.signup);

router.post('/login', [rateLimit('login', 10, 15 * 60 * 1000), emailRule, body('password').isString().notEmpty(), checkFormValidations], CommerceCustomerAuthController.login);
router.post('/refresh', rateLimit('refresh', 60, 15 * 60 * 1000), CommerceCustomerAuthController.refresh);
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
    body('new_password').isString().isLength({ min: 8, max: 72 }).matches(/[a-z]/).matches(/[A-Z]/).matches(/[0-9]/),
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
