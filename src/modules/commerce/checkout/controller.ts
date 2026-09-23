import type { Request, Response } from 'express';
import CommerceCheckoutService, { CommerceCheckoutError } from './service';
import {
    CommercePaymentError,
    initializeRazorpayOrder,
    paymentSessionForCustomer,
    paymentStatusForCustomer,
    verifyCustomerPayment
} from '../payment/service';

function errorResponse(res: Response, error: unknown) {
    if (error instanceof CommerceCheckoutError) {
        return res.status(error.statusCode).json({ success: false, message: error.message, data: null });
    }
    if (error instanceof CommercePaymentError) {
        return res.status(error.statusCode).json({ success: false, message: error.message, data: null });
    }
    console.error('Commerce checkout failed', error);
    return res.status(500).json({ success: false, message: 'Unable to place order', data: null });
}

export default class CommerceCheckoutController {
    static async placeOrder(req: Request, res: Response) {
        try {
            const idempotencyKey = String(req.get('idempotency-key') || '').trim();
            if (!idempotencyKey) {
                return res.status(400).json({ success: false, message: 'Idempotency-Key header is required', data: null });
            }
            const paymentMethod = req.body.payment_method as 'COD' | 'RAZORPAY';
            const order = await CommerceCheckoutService.placeOrder({
                cartPublicId: String(req.body.cart_public_id),
                cartToken: String(req.get('x-cart-token') || req.body.cart_token || '').trim() || null,
                customerId: Number(req.commerceCustomer!.id),
                shippingAddress: req.body.shipping_address,
                billingAddress: req.body.billing_address || null,
                shippingMethodCode: String(req.body.shipping_method_code || 'STANDARD_MANUAL'),
                paymentMethod,
                idempotencyKey,
                referralCode: req.body.referral_code,
                creditsToApply: Number(req.body.credits_to_apply || 0)
            });
            const paymentSession = paymentMethod === 'RAZORPAY'
                ? await initializeRazorpayOrder(String(order?.public_id), Number(req.commerceCustomer!.id))
                : null;
            return res.status(201).json({
                success: true,
                message: paymentMethod === 'RAZORPAY' ? 'Payment checkout created' : 'Order placed',
                data: { order, payment_session: paymentSession }
            });
        } catch (error) {
            return errorResponse(res, error);
        }
    }

    static async verifyRazorpayPayment(req: Request, res: Response) {
        try {
            const result = await verifyCustomerPayment({
                customerId: Number(req.commerceCustomer!.id),
                orderPublicId: String(req.body.order_public_id),
                providerPaymentId: String(req.body.razorpay_payment_id),
                signature: String(req.body.razorpay_signature)
            });
            return res.json({ success: true, message: 'Payment verification completed', data: result });
        } catch (error) {
            return errorResponse(res, error);
        }
    }

    static async paymentStatus(req: Request, res: Response) {
        try {
            const result = await paymentStatusForCustomer(
                String(req.params.publicId),
                Number(req.commerceCustomer!.id)
            );
            return res.json({ success: true, message: 'Payment status found', data: result });
        } catch (error) {
            return errorResponse(res, error);
        }
    }

    static async retryRazorpayPayment(req: Request, res: Response) {
        try {
            const paymentSession = await paymentSessionForCustomer(
                String(req.params.publicId),
                Number(req.commerceCustomer!.id)
            );
            return res.json({ success: true, message: 'Payment checkout ready', data: { payment_session: paymentSession } });
        } catch (error) {
            return errorResponse(res, error);
        }
    }

    static async orders(req: Request, res: Response) {
        try {
            const orders = await CommerceCheckoutService.ordersForCustomer(
                Number(req.commerceCustomer!.id),
                Number(req.query.limit || 20)
            );
            return res.json({ success: true, message: 'Orders found', data: { orders } });
        } catch (error) {
            return errorResponse(res, error);
        }
    }

    static async order(req: Request, res: Response) {
        try {
            const order = await CommerceCheckoutService.orderForCustomer(
                String(req.params.publicId),
                Number(req.commerceCustomer!.id)
            );
            if (!order) return res.status(404).json({ success: false, message: 'Order not found', data: null });
            return res.json({ success: true, message: 'Order found', data: { order } });
        } catch (error) {
            return errorResponse(res, error);
        }
    }
}
