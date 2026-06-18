import { Request as ExpressRequest, Response as ExpressResponse } from 'express';
import { StatusCodes } from 'http-status-codes';
import SharedNewsletterService from '../../../../shared-services/newsletter';

const SUBSCRIBED_MESSAGE = 'Thanks for subscribing. You will receive our latest factory deals soon.';
const ALREADY_SUBSCRIBED_MESSAGE = 'You are already subscribed.';
const VALIDATION_MESSAGE = 'Please enter a valid email address.';
const SERVER_ERROR_MESSAGE = 'We could not subscribe you right now. Please try again.';

export default class NewsletterController {
    static async subscribe(req: ExpressRequest, res: ExpressResponse) {
        try {
            const result = await SharedNewsletterService.subscribe(req.body?.email, req.body?.source);
            return res.status(StatusCodes.OK).json({
                success: true,
                message: result.alreadySubscribed ? ALREADY_SUBSCRIBED_MESSAGE : SUBSCRIBED_MESSAGE
            });
        } catch (error: unknown) {
            if (error instanceof Error && 'code' in error && (error as GError).code === StatusCodes.BAD_REQUEST) {
                return res.status(StatusCodes.BAD_REQUEST).json({
                    success: false,
                    message: VALIDATION_MESSAGE
                });
            }

            return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
                success: false,
                message: SERVER_ERROR_MESSAGE
            });
        }
    }
}
