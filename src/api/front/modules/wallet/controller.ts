import { Request as ExpressRequest, Response as ExpressResponse } from 'express';
import { StatusCodes } from 'http-status-codes';
import Response from '../../../../lib/api-response';
import SharedWalletService from '../../../../shared-services/wallet';

export default class FrontWalletController {
    static async summary(req: ExpressRequest, res: ExpressResponse) {
        const customerId = Number((req as any).shopifyCustomer?.id);
        if (!customerId) {
            return Response.fail(res, 'Customer not found', null, StatusCodes.UNAUTHORIZED);
        }

        try {
            const data = await SharedWalletService.summary('CUSTOMER', customerId, 100);
            return Response.success(res, 'Wallet found', data, StatusCodes.OK);
        } catch (error) {
            return Response.fail(res, 'Unable to load wallet', null, StatusCodes.INTERNAL_SERVER_ERROR);
        }
    }

    static async applyReferral(req: ExpressRequest, res: ExpressResponse) {
        const customerId = Number((req as any).shopifyCustomer?.id);
        const referralCode = typeof req.body?.referral_code === 'string'
            ? req.body.referral_code.trim()
            : typeof req.body?.referralCode === 'string'
                ? req.body.referralCode.trim()
                : '';

        if (!customerId) {
            return Response.fail(res, 'Customer not found', null, StatusCodes.UNAUTHORIZED);
        }
        if (!referralCode) {
            return Response.fail(res, 'Referral code is required', null, StatusCodes.BAD_REQUEST);
        }

        try {
            const result = await knexInstance.transaction(async (trx) => {
                return await SharedWalletService.applyCustomerReferralCode(customerId, referralCode, trx);
            });
            if (!result.applied) {
                return Response.fail(res, result.message, result, StatusCodes.UNPROCESSABLE_ENTITY);
            }

            return Response.success(res, result.message, result, StatusCodes.OK);
        } catch (error) {
            return Response.fail(res, 'Unable to apply referral code', null, StatusCodes.INTERNAL_SERVER_ERROR);
        }
    }
}
