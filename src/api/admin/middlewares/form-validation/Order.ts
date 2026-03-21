import { body } from 'express-validator';
import { checkFormValidations } from './express-validator';

const orderStatuses = ['CREATED', 'FABRIC_PURCHASING', 'PATTERN_MAKING', 'CUTTING', 'STITCHING', 'KAJ_BUTTON', 'DHAGA_CUTTING', 'PRESSING', 'PACKING','COMPLETED'];
const paymentStatuses = ['RECEIVED', 'NOT_RECEIVED'];

export const orderSaveValidation = [
    body('id')
        .optional()
        .isNumeric().withMessage('Order id must be numeric'),

    body('client_id')
        .notEmpty().withMessage('Client is required')
        .isNumeric().withMessage('Client must be numeric'),

    body('status')
        .trim()
        .notEmpty().withMessage('Order status is required')
        .isIn(orderStatuses).withMessage('Invalid order status'),

    body('payment_status')
        .trim()
        .notEmpty().withMessage('Order payment status is required')
        .isIn(paymentStatuses).withMessage('Invalid payment status'),

    body('items')
        .isArray({ min: 1 }).withMessage('At least one order item is required'),

    body('items.*.id')
        .optional()
        .isNumeric().withMessage('Order item id must be numeric'),

    body('items.*.item_order')
        .optional()
        .isInt({ min: 0 }).withMessage('Item order must be a valid integer'),

    body('items.*.product_id')
        .notEmpty().withMessage('Product is required for each item')
        .isNumeric().withMessage('Product must be numeric'),

    body('items.*.product_sizes_id')
        .notEmpty().withMessage('Product size is required for each item')
        .isNumeric().withMessage('Product size must be numeric'),

    body('items.*.product_colors_id')
        .optional({ values: 'falsy' })
        .isNumeric().withMessage('Product color must be numeric'),

    body('items.*.product_images_id')
        .optional({ values: 'falsy' })
        .isNumeric().withMessage('Product image must be numeric'),

    body('items.*.quantity')
        .notEmpty().withMessage('Quantity is required for each item')
        .isInt({ gt: 0 }).withMessage('Quantity must be greater than zero'),

    body('items.*.price')
        .notEmpty().withMessage('Price is required for each item')
        .isNumeric().withMessage('Price must be numeric'),

    body('items.*.status')
        .trim()
        .notEmpty().withMessage('Item status is required')
        .isIn(orderStatuses).withMessage('Invalid item status'),

    body('items.*.payment_status')
        .trim()
        .notEmpty().withMessage('Item payment status is required')
        .isIn(paymentStatuses).withMessage('Invalid item payment status'),

    checkFormValidations
];
