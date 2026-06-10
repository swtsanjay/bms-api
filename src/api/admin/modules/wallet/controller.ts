import { Request as ExpressRequest, Response as ExpressResponse } from 'express';
import { Knex } from 'knex';
import { StatusCodes } from 'http-status-codes';
import Response from '../../../../lib/api-response';
import SharedWalletService from '../../../../shared-services/wallet';

export default class AdminWalletController {
    static async settings(_req: ExpressRequest, res: ExpressResponse) {
        try {
            const settings = await SharedWalletService.settings();
            return Response.success(res, 'Wallet settings found', settings, StatusCodes.OK);
        } catch (error) {
            return Response.fail(res, 'Unable to load wallet settings', null, StatusCodes.INTERNAL_SERVER_ERROR);
        }
    }

    static async saveSettings(req: ExpressRequest, res: ExpressResponse) {
        const t = req.transaction as Knex.Transaction;
        try {
            const settings = await SharedWalletService.saveSettings({
                coin_rupee_value: req.body.coin_rupee_value,
                referral_reward_coins: req.body.referral_reward_coins
            }, t);
            await t.commit();
            return Response.success(res, 'Wallet settings saved', settings, StatusCodes.OK);
        } catch (error) {
            await t.rollback();
            return Response.fail(res, 'Unable to save wallet settings', null, StatusCodes.INTERNAL_SERVER_ERROR);
        }
    }
}
