import { body } from 'express-validator';
import { Transaction } from '../../../../types/transaction';
import { checkFormValidations } from './express-validator';
import TransactionService from '../../services/transaction';
/**
 * This file contains the validation rules for transaction-related API endpoints.
 * It uses express-validator to validate the request body for transaction creation and updates.
 * The rules ensure that the required fields are present and correctly formatted.
 */
export const transactionSaveValidation = [
    body('id' as (keyof Transaction)[number])
        .trim()
        .optional()
        .isNumeric().withMessage('Each transaction must have a non-empty string id')
        .notEmpty().withMessage('Each transaction must have a non-empty string id'),

    body('user_id' as (keyof Transaction)[number])
        .trim()
        .isNumeric()
        .notEmpty().withMessage('Choose a user for this transaction'),

    body('transaction_id' as (keyof Transaction)[number])
        .trim()
        .optional()
        .custom(async (value, { req }) => {
            const { data } = await TransactionService.details({ transaction_id: value });
            if (data && data.id != req.body.id) {
                throw new Error('Phone number already exists');
            }
        }),

    body('amount' as (keyof Transaction)[number])
        .trim()
        .isNumeric().withMessage('Each transaction must have a valid amount')
        .notEmpty().withMessage('Each transaction must have a valid amount'),

    body('type' as (keyof Transaction)[number])
        .trim()
        .notEmpty().withMessage('Please provide a transaction type')
        .isIn(['EXPENSE', 'PAYMENT']).withMessage('Transaction type must be one of \'EXPENSE\', \'PAYMENT\''),


    checkFormValidations
];