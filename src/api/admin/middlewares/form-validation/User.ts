import { body } from 'express-validator';
import { User } from '../../../../types/user';
import { checkFormValidations } from './express-validator';
import UserService from '../../services/user';
/**
 * This file contains the validation rules for user-related API endpoints.
 * It uses express-validator to validate the request body for user creation and updates.
 * The rules ensure that the required fields are present and correctly formatted.
 */
export const userSaveValidation = [
    body('id' as (keyof User)[number])
        .trim()
        .optional()
        .isNumeric().withMessage('Each user must have a non-empty string id')
        .notEmpty().withMessage('Each user must have a non-empty string id'),

    body('name' as (keyof User)[number])
        .trim()
        .isString()
        .notEmpty().withMessage('Each user must have a non-empty string name'),

    body('phone' as (keyof User)[number])
        .trim()
        .isMobilePhone('en-IN').withMessage('Each user must have a valid phone number')
        .custom(async (value, { req }) => {
            const { data } = await UserService.details({ phone: value });
            if (data && data.id != req.body.id) {
                throw new Error('Phone number already exists');
            }
        }),

    body('email' as (keyof User)[number])
        .trim()
        .isEmail().withMessage('Each user must have a valid email'),

    body('user_type' as (keyof User)[number])
        .trim()
        .notEmpty().withMessage('Please provide a user type')
        .isIn(['EMPLOYEE', 'COMPANY']).withMessage('User type must be one of \'EMPLOYEE\', \'COMPANY\''),

    checkFormValidations
];