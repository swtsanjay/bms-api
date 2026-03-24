import { body } from 'express-validator';
import { checkFormValidations } from './express-validator';

export const invoiceSaveValidation = [
    body('id')
        .optional()
        .isNumeric().withMessage('Invoice id must be numeric'),

    body('client_id')
        .notEmpty().withMessage('Client is required')
        .isNumeric().withMessage('Client must be numeric'),

    body('seller_user_id')
        .optional({ values: 'falsy' })
        .isNumeric().withMessage('Seller user must be numeric'),

    body('order_id')
        .optional({ values: 'falsy' })
        .isNumeric().withMessage('Order id must be numeric'),

    body('invoice_no')
        .trim()
        .notEmpty().withMessage('Invoice number is required'),

    body('invoice_date')
        .trim()
        .notEmpty().withMessage('Invoice date is required')
        .isISO8601().withMessage('Invoice date must be a valid date'),

    body('challan_date')
        .optional({ values: 'falsy' })
        .isISO8601().withMessage('Challan date must be a valid date'),

    body('seller_name')
        .trim()
        .notEmpty().withMessage('Seller name is required'),

    body('items')
        .isArray({ min: 1 }).withMessage('At least one invoice item is required'),

    body('items.*.id')
        .optional()
        .isNumeric().withMessage('Invoice item id must be numeric'),

    body('items.*.product_id')
        .optional({ values: 'falsy' })
        .isNumeric().withMessage('Product must be numeric'),

    body('items.*.sort_order')
        .optional()
        .isInt({ min: 1 }).withMessage('Sort order must be a valid integer'),

    body('items.*.description')
        .trim()
        .notEmpty().withMessage('Description is required for each item'),

    body('items.*.hsn_sac')
        .optional({ values: 'falsy' })
        .isString().withMessage('HSN/SAC must be a string'),

    body('items.*.quantity')
        .notEmpty().withMessage('Quantity is required for each item')
        .isFloat({ gt: 0 }).withMessage('Quantity must be greater than zero'),

    body('items.*.unit')
        .optional({ values: 'falsy' })
        .isString().withMessage('Unit must be a string'),

    body('items.*.rate')
        .notEmpty().withMessage('Rate is required for each item')
        .isFloat({ min: 0 }).withMessage('Rate must be a valid number'),

    body('items.*.taxable_value')
        .optional({ values: 'falsy' })
        .isFloat({ min: 0 }).withMessage('Taxable value must be a valid number'),

    body('items.*.tax_rate')
        .optional({ values: 'falsy' })
        .isFloat({ min: 0 }).withMessage('Tax rate must be a valid number'),

    body('items.*.tax_amount')
        .optional({ values: 'falsy' })
        .isFloat({ min: 0 }).withMessage('Tax amount must be a valid number'),

    body('items.*.line_total')
        .optional({ values: 'falsy' })
        .isFloat({ min: 0 }).withMessage('Line total must be a valid number'),

    checkFormValidations
];
