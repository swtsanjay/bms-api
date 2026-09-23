import type { Request, Response } from 'express';
import {
    claimReferralForCustomer,
    CommerceReferralError,
    customerCredits,
    resolveReferral
} from './service';

function failure(res: Response, error: unknown) {
    if (error instanceof CommerceReferralError) {
        return res.status(error.statusCode).json({ success: false, message: error.message, data: null });
    }
    console.error('Commerce referral request failed', error);
    return res.status(500).json({ success: false, message: 'Referral request failed', data: null });
}

export default class CommerceReferralController {
    static async resolve(req: Request, res: Response) {
        try {
            const referral = await resolveReferral(String(req.params.code || ''));
            if (!referral) return res.status(404).json({ success: false, message: 'Referral code was not found', data: null });
            return res.json({ success: true, message: 'Referral code found', data: { referral } });
        } catch (error) { return failure(res, error); }
    }

    static async claim(req: Request, res: Response) {
        try {
            const claim = await claimReferralForCustomer(Number(req.commerceCustomer!.id), String(req.body.referral_code || ''));
            return res.json({ success: true, message: 'Referral saved for your next purchase', data: { claim } });
        } catch (error) { return failure(res, error); }
    }

    static async credits(req: Request, res: Response) {
        try {
            const credits = await customerCredits(
                Number(req.commerceCustomer!.id),
                Number(req.query.limit || 20),
                Number(req.query.page || 1)
            );
            return res.json({ success: true, message: 'Vastriqo Credits found', data: { credits } });
        } catch (error) { return failure(res, error); }
    }
}
