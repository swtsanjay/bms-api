import type { Request, Response } from 'express';
import { acceptRazorpayWebhook } from './webhook-service';

export default class RazorpayWebhookController {
    static async receive(req: Request, res: Response) {
        const signature = String(req.get('x-razorpay-signature') || '').trim();
        const eventId = String(req.get('x-razorpay-event-id') || '').trim();
        if (!signature || !eventId || !Buffer.isBuffer(req.body)) {
            return res.status(400).json({ success: false, message: 'Invalid Razorpay webhook request' });
        }
        try {
            const result = await acceptRazorpayWebhook({ rawBody: req.body, signature, eventId });
            return res.status(202).json({ success: true, duplicate: result.duplicate });
        } catch (error) {
            const statusCode = Number((error as { statusCode?: number }).statusCode || 500);
            return res.status(statusCode).json({
                success: false,
                message: statusCode >= 500 ? 'Webhook processing unavailable' : (error as Error).message
            });
        }
    }
}
