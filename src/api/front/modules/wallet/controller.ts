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
}
