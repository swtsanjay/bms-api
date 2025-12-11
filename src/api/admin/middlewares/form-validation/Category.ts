import { body } from 'express-validator';
import { Category } from '../../../../types/category';
import { checkFormValidations } from './express-validator';
import CategoryService from '../../services/category';
/**
 * This file contains the validation rules for category-related API endpoints.
 * It uses express-validator to validate the request body for category creation and updates.
 * The rules ensure that the required fields are present and correctly formatted.
 */
export const categorySaveValidation = [
    body('id')
        .trim()
        .optional()
        .isNumeric().withMessage('Category must have a non-empty string id')
        .notEmpty().withMessage('Category must have a non-empty string id'),

    body('title')
        .trim()
        .isString()
        .notEmpty().withMessage('Category must have a non-empty string name'),

    body('code')
        .trim()
        .custom(async (value, { req }) => {
            const { data } = await CategoryService.details({ code: value });
            if (data && data.id != req.body.id) {
                throw new Error('Code already exists');
            }
        }),

    checkFormValidations
];