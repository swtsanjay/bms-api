import { body, param } from 'express-validator';
import { checkFormValidations } from './express-validator';

const manualOrderStatuses = ['new', 'contacted', 'confirmed', 'cancelled'];

export const manualOrderDetailsValidation = [
    param('id')
        .notEmpty().withMessage('Order request ID is required')
        .isInt({ min: 1 }).withMessage('Order request ID must be a valid number'),

    checkFormValidations
];

export const manualOrderStatusValidation = [
    body('id')
        .notEmpty().withMessage('Order request ID is required')
        .isInt({ min: 1 }).withMessage('Order request ID must be a valid number'),

    body('status')
        .notEmpty().withMessage('Status is required')
        .isIn(manualOrderStatuses).withMessage('Invalid status'),

    checkFormValidations
];
