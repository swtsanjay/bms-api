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

    body('billing_email')
        .optional({ values: 'falsy' })
        .trim()
        .isEmail().withMessage('Billing email must be a valid email'),

    body('billing_phone')
        .optional({ values: 'falsy' })
        .trim()
        .isMobilePhone('en-IN').withMessage('Billing phone must be a valid phone number'),

    body('shipping_phone')
        .optional({ values: 'falsy' })
        .trim()
        .isMobilePhone('en-IN').withMessage('Shipping phone must be a valid phone number'),

    body('seller_details')
        .optional({ values: 'falsy' })
        .isObject().withMessage('Seller details must be an object'),

    body('seller_details.seller_email')
        .optional({ values: 'falsy' })
        .trim()
        .isEmail().withMessage('Seller email must be a valid email'),

    body('seller_details.seller_phone')
        .optional({ values: 'falsy' })
        .trim()
        .isMobilePhone('en-IN').withMessage('Seller phone must be a valid phone number'),

    body('user_type' as (keyof User)[number])
        .trim()
        .notEmpty().withMessage('Please provide a user type')
        .isIn(['EMPLOYEE', 'COMPANY']).withMessage('User type must be one of \'EMPLOYEE\', \'COMPANY\''),

    checkFormValidations
];

export const userDeleteValidation = [
    body('id' as (keyof User)[number])
        .trim()
        .isNumeric().withMessage('Each user must have a valid id')
        .notEmpty().withMessage('Each user must have a valid id'),

    checkFormValidations
];

export const userChangePasswordValidation = [
    body('current_password')
        .trim()
        .notEmpty().withMessage('Current password is required'),

    body('new_password')
        .trim()
        .notEmpty().withMessage('New password is required'),

    body('confirm_new_password')
        .trim()
        .notEmpty().withMessage('Confirm new password is required')
        .custom((value, { req }) => {
            if (value !== req.body.new_password) {
                throw new Error('New password and confirm new password must match');
            }
            return true;
        }),

    checkFormValidations
];
