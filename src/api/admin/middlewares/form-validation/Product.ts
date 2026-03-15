import { body } from 'express-validator';
import { checkFormValidations } from './express-validator';

export const productSaveValidation = [
    body('id')
        .optional()
        .isNumeric().withMessage('Product id must be numeric'),

    body('name')
        .trim()
        .isString()
        .notEmpty().withMessage('Product name is required'),

    body('price')
        .notEmpty().withMessage('Product price is required')
        .isNumeric().withMessage('Product price must be numeric'),

    body('sizes')
        .optional()
        .isArray().withMessage('Sizes must be an array'),

    body('sizes.*.id')
        .optional()
        .isNumeric().withMessage('Size id must be numeric'),

    body('sizes.*.size')
        .optional()
        .trim()
        .notEmpty().withMessage('Size is required'),

    body('images')
        .optional()
        .isArray().withMessage('Images must be an array'),

    body('images.*.id')
        .optional()
        .isNumeric().withMessage('Image id must be numeric'),

    body('images.*.url')
        .optional()
        .trim()
        .notEmpty().withMessage('Image url is required'),

    body('colors')
        .optional()
        .isArray().withMessage('Colors must be an array'),

    body('colors.*.id')
        .optional()
        .isNumeric().withMessage('Color id must be numeric'),

    body('colors.*.color')
        .optional()
        .trim()
        .notEmpty().withMessage('Color is required'),

    checkFormValidations
];

export const productChildDeleteValidation = [
    body('id')
        .notEmpty().withMessage('Id is required')
        .isNumeric().withMessage('Id must be numeric'),

    checkFormValidations
];
