import { body } from 'express-validator';
import { checkFormValidations } from './express-validator';

export const loginValidation = [
    body('email')
        .trim()
        .notEmpty().withMessage('Email address is required')
        .isEmail().withMessage('Email address is invalid'),

    body('password')
        .trim()
        .notEmpty().withMessage('Password is required'),

    checkFormValidations
];

export const signupValidation = [
    body('name')
        .trim()
        .notEmpty().withMessage('Name is required')
        .isLength({ max: 100 }).withMessage('Name must be 100 characters or less'),

    body('email')
        .trim()
        .notEmpty().withMessage('Email address is required')
        .isEmail().withMessage('Email address is invalid')
        .isLength({ max: 100 }).withMessage('Email address must be 100 characters or less'),

    body('phone')
        .trim()
        .notEmpty().withMessage('Phone number is required')
        .isLength({ max: 20 }).withMessage('Phone number must be 20 characters or less'),

    body('password')
        .trim()
        .notEmpty().withMessage('Password is required')
        .isLength({ min: 6, max: 72 }).withMessage('Password must be between 6 and 72 characters'),

    body('confirm_password')
        .trim()
        .notEmpty().withMessage('Confirm password is required')
        .custom((value, { req }) => {
            if (value !== req.body.password) {
                throw new Error('Password and confirm password must match');
            }
            return true;
        }),

    body('company_name')
        .optional({ nullable: true, checkFalsy: true })
        .trim()
        .isLength({ max: 150 }).withMessage('Company / Brand name must be 150 characters or less'),

    body('business_type')
        .optional({ nullable: true, checkFalsy: true })
        .trim()
        .isLength({ max: 150 }).withMessage('Business type must be 150 characters or less'),

    checkFormValidations
];

export const profileUpdateValidation = [
    body('name')
        .trim()
        .notEmpty().withMessage('Name is required')
        .isLength({ max: 100 }).withMessage('Name must be 100 characters or less'),

    body('email')
        .trim()
        .notEmpty().withMessage('Email address is required')
        .isEmail().withMessage('Email address is invalid')
        .isLength({ max: 100 }).withMessage('Email address must be 100 characters or less'),

    body('phone')
        .trim()
        .notEmpty().withMessage('Phone number is required')
        .isLength({ max: 20 }).withMessage('Phone number must be 20 characters or less'),

    body('company_name')
        .optional({ nullable: true, checkFalsy: true })
        .trim()
        .isLength({ max: 150 }).withMessage('Company / Brand name must be 150 characters or less'),

    body('business_type')
        .optional({ nullable: true, checkFalsy: true })
        .trim()
        .isLength({ max: 150 }).withMessage('Business type must be 150 characters or less'),

    body('billing_city')
        .optional({ nullable: true, checkFalsy: true })
        .trim()
        .isLength({ max: 100 }).withMessage('City must be 100 characters or less'),

    body('billing_country')
        .optional({ nullable: true, checkFalsy: true })
        .trim()
        .isLength({ max: 100 }).withMessage('Country must be 100 characters or less'),

    body('profile_notes')
        .optional({ nullable: true, checkFalsy: true })
        .trim()
        .isLength({ max: 1000 }).withMessage('Production notes must be 1000 characters or less'),

    checkFormValidations
];
