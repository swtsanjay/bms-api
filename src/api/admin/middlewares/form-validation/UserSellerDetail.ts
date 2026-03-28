import { body } from 'express-validator';
import { checkFormValidations } from './express-validator';
import UserService from '../../services/user';
import UserSellerDetailService from '../../services/userSellerDetail';

const PAN_REGEX = /^[A-Z]{5}[0-9]{4}[A-Z]$/;
const IFSC_REGEX = /^[A-Z]{4}0[A-Z0-9]{6}$/;

export const userSellerDetailSaveValidation = [
    body('id')
        .optional()
        .isNumeric().withMessage('Invalid id'),

    body('user_id')
        .trim()
        .notEmpty().withMessage('user_id is required')
        .isNumeric().withMessage('user_id must be numeric')
        .custom(async (value, { req }) => {
            const { data: user } = await UserService.details({ id: Number(value) });
            if (!user) {
                throw new Error('user_id does not reference an existing user');
            }
            const { data: existing } = await UserSellerDetailService.details({ user_id: Number(value) });
            if (existing && existing.id != req.body.id) {
                throw new Error('Seller details already exist for this user');
            }
        }),

    body('seller_name')
        .optional()
        .isString().withMessage('seller_name must be a string')
        .isLength({ max: 150 }).withMessage('seller_name must be at most 150 characters'),

    body('seller_tagline')
        .optional()
        .isString().withMessage('seller_tagline must be a string')
        .isLength({ max: 255 }).withMessage('seller_tagline must be at most 255 characters'),

    body('seller_address')
        .optional()
        .isString().withMessage('seller_address must be a string'),

    body('seller_phone')
        .optional()
        .isString()
        .isLength({ max: 30 }).withMessage('seller_phone must be at most 30 characters')
        .matches(/^[0-9+\- ()]{6,30}$/).withMessage('seller_phone contains invalid characters'),

    body('seller_email')
        .optional()
        .isEmail().withMessage('Invalid seller_email')
        .isLength({ max: 150 }).withMessage('seller_email must be at most 150 characters'),

    body('seller_website')
        .optional()
        .isURL().withMessage('Invalid seller_website'),

    body('seller_pan')
        .optional()
        .isString()
        .custom((value) => {
            if (value && !PAN_REGEX.test(String(value).toUpperCase())) {
                // throw new Error('Invalid PAN format');
            }
            return true;
        }),

    body('seller_gstin')
        .optional()
        .isString(),
        // .isLength({ min: 15, max: 15 }).withMessage('GSTIN must be 15 characters')
        // .matches(/^[0-9A-Z]{15}$/).withMessage('Invalid GSTIN format'),

    body('bank_name')
        .optional()
        .isString()
        .isLength({ max: 150 }).withMessage('bank_name must be at most 150 characters'),

    body('bank_branch')
        .optional()
        .isString()
        .isLength({ max: 150 }).withMessage('bank_branch must be at most 150 characters'),

    body('bank_account_no')
        .optional()
        .isString()
        .isLength({ max: 80 }).withMessage('bank_account_no must be at most 80 characters'),

    body('bank_ifsc')
        .optional()
        .isString()
        .custom((value) => {
            if (value && !IFSC_REGEX.test(String(value).toUpperCase())) {
                // throw new Error('Invalid IFSC format');
            }
            return true;
        }),

    body('bank_upi_id')
        .optional()
        .isString()
        .isLength({ max: 120 }).withMessage('bank_upi_id must be at most 120 characters'),

    body('upi_qr_image_url')
        .optional()
        .isURL().withMessage('Invalid upi_qr_image_url'),

    body('terms_conditions')
        .optional()
        .isString(),

    body('declaration')
        .optional()
        .isString(),

    body('customer_signature_label')
        .optional()
        .isString()
        .isLength({ max: 150 }).withMessage('customer_signature_label must be at most 150 characters'),

    body('authorized_signatory_label')
        .optional()
        .isString()
        .isLength({ max: 150 }).withMessage('authorized_signatory_label must be at most 150 characters'),

    body('footer_note')
        .optional()
        .isString()
        .isLength({ max: 255 }).withMessage('footer_note must be at most 255 characters'),

    checkFormValidations
];
