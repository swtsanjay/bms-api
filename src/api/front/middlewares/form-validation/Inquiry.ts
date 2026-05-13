import { body } from 'express-validator';
import { checkFormValidations } from './express-validator';

export const inquirySaveValidation = [
    body('name')
        .trim()
        .notEmpty().withMessage('Name is required')
        .isLength({ max: 150 }).withMessage('Name must be 150 characters or less'),

    body('email')
        .trim()
        .notEmpty().withMessage('Email address is required')
        .isEmail().withMessage('Email address is invalid')
        .isLength({ max: 150 }).withMessage('Email address must be 150 characters or less'),

    body('phone')
        .trim()
        .notEmpty().withMessage('Phone number is required')
        .isLength({ max: 30 }).withMessage('Phone number must be 30 characters or less'),

    body('company_brand_name')
        .optional({ nullable: true, checkFalsy: true })
        .trim()
        .isLength({ max: 150 }).withMessage('Company / Brand name must be 150 characters or less'),

    body('requirements')
        .trim()
        .notEmpty().withMessage('Requirements are required')
        .isLength({ max: 1000 }).withMessage('Requirements must be 1000 characters or less'),

    checkFormValidations
];
