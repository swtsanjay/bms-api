import { body } from 'express-validator';
import { checkFormValidations } from './express-validator';

export const manualOrderSaveValidation = [
    body('product_title')
        .trim()
        .notEmpty().withMessage('Product name is required')
        .isLength({ max: 255 }).withMessage('Product name must be 255 characters or less'),

    body('product_id')
        .optional({ nullable: true, checkFalsy: true })
        .trim()
        .isLength({ max: 150 }).withMessage('Product ID must be 150 characters or less'),

    body('product_handle')
        .optional({ nullable: true, checkFalsy: true })
        .trim()
        .isLength({ max: 255 }).withMessage('Product handle must be 255 characters or less'),

    body('product_image')
        .optional({ nullable: true, checkFalsy: true })
        .trim()
        .isLength({ max: 1000 }).withMessage('Product image URL must be 1000 characters or less'),

    body('size')
        .optional({ nullable: true, checkFalsy: true })
        .trim()
        .isLength({ max: 80 }).withMessage('Size must be 80 characters or less'),

    body('quantity')
        .notEmpty().withMessage('Quantity is required')
        .isInt({ min: 1, max: 999 }).withMessage('Quantity must be between 1 and 999'),

    body('customer_message')
        .optional({ nullable: true, checkFalsy: true })
        .trim()
        .isLength({ max: 1000 }).withMessage('Message must be 1000 characters or less'),

    body('phone')
        .trim()
        .notEmpty().withMessage('Phone number is required')
        .isLength({ max: 30 }).withMessage('Phone number must be 30 characters or less'),

    body('email')
        .optional({ nullable: true, checkFalsy: true })
        .trim()
        .isEmail().withMessage('Email address is invalid')
        .isLength({ max: 150 }).withMessage('Email address must be 150 characters or less'),

    checkFormValidations
];
