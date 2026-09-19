import crypto from 'crypto';
import Razorpay from 'razorpay';
import config from '../../../config';

let client: Razorpay | null = null;

function razorpayClient() {
    if (!config.razorpay.enabled) throw new Error('Razorpay payments are unavailable');
    if (!client) {
        client = new Razorpay({
            key_id: config.razorpay.keyId,
            key_secret: config.razorpay.keySecret
        });
    }
    return client;
}

function signaturesMatch(expected: string, received: string) {
    const expectedBuffer = Buffer.from(expected, 'hex');
    const receivedBuffer = Buffer.from(received, 'hex');
    return expectedBuffer.length === receivedBuffer.length
        && crypto.timingSafeEqual(expectedBuffer, receivedBuffer);
}

export function verifyCheckoutSignature(
    providerOrderId: string,
    providerPaymentId: string,
    signature: string
) {
    const expected = crypto
        .createHmac('sha256', config.razorpay.keySecret)
        .update(`${providerOrderId}|${providerPaymentId}`)
        .digest('hex');
    return signaturesMatch(expected, signature);
}

export function verifyWebhookSignature(rawBody: Buffer, signature: string) {
    const expected = crypto
        .createHmac('sha256', config.razorpay.webhookSecret)
        .update(rawBody)
        .digest('hex');
    return signaturesMatch(expected, signature);
}

export async function createProviderOrder(input: {
    amount: number;
    currency: string;
    receipt: string;
    notes: Record<string, string>;
}) {
    return razorpayClient().orders.create({
        amount: input.amount,
        currency: input.currency,
        receipt: input.receipt.slice(0, 40),
        notes: input.notes,
        partial_payment: false
    });
}

export async function fetchProviderOrder(providerOrderId: string) {
    return razorpayClient().orders.fetch(providerOrderId);
}

export async function findProviderOrderByReceipt(receipt: string) {
    const response = await razorpayClient().orders.all({ receipt: receipt.slice(0, 40), count: 10 });
    return response.items.find((order) => order.receipt === receipt.slice(0, 40)) || null;
}

export async function fetchProviderOrderPayments(providerOrderId: string) {
    return razorpayClient().orders.fetchPayments(providerOrderId);
}

export async function fetchProviderPayment(providerPaymentId: string) {
    return razorpayClient().payments.fetch(providerPaymentId);
}

export async function createProviderRefund(input: {
    paymentId: string;
    amount: number;
    receipt: string;
    notes: Record<string, string>;
}) {
    return razorpayClient().payments.refund(input.paymentId, {
        amount: input.amount,
        speed: 'normal',
        receipt: input.receipt.slice(0, 40),
        notes: input.notes
    });
}

export async function fetchProviderPaymentRefunds(providerPaymentId: string) {
    return razorpayClient().payments.fetchMultipleRefund(providerPaymentId, { count: 100 });
}

export async function fetchProviderRefund(providerPaymentId: string, providerRefundId: string) {
    return razorpayClient().payments.fetchRefund(providerPaymentId, providerRefundId);
}

export function publicKeyId() {
    if (!config.razorpay.enabled) throw new Error('Razorpay payments are unavailable');
    return config.razorpay.keyId;
}
