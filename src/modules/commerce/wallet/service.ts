import crypto from 'node:crypto';
import config from '../../../config';
import { createProviderOrder, createProviderRefund, fetchProviderPayment, fetchProviderPaymentRefunds, findProviderOrderByReceipt, publicKeyId, verifyCheckoutSignature } from '../payment/razorpay-provider';
import { queueCommerceEmail } from '../email/service';

export class WalletError extends Error { constructor(message: string, public statusCode = 400) { super(message); } }
const normalize = (value: string) => value.trim().toUpperCase().replaceAll('-', '');
const codeHash = (value: string) => crypto.createHash('sha256').update(normalize(value)).digest('hex');
const codeAlphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const freshCode = () => `VAS-${Array.from(crypto.randomBytes(12), (byte) => codeAlphabet[byte & 31]).join('')}`;
const validCode = (value: string) => /^(?:VSQ-?[A-F0-9]{32}|VAS-?[A-HJ-NP-Z2-9]{12})$/i.test(value.trim());
const encryptionKey = () => {
    const encoded = String(process.env.VSQ_GIFT_CODE_ENCRYPTION_KEY || '');
    if (!/^[0-9a-f]{64}$/i.test(encoded)) throw new WalletError('Gift code encryption is not configured', 503);
    return Buffer.from(encoded, 'hex');
};
function encrypt(value: string) {
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', encryptionKey(), iv);
    const data = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
    return [iv, cipher.getAuthTag(), data].map((part) => part.toString('base64url')).join('.');
}
export function decryptGiftCode(value: string) {
    const [iv, tag, data] = value.split('.').map((part) => Buffer.from(part, 'base64url'));
    const cipher = crypto.createDecipheriv('aes-256-gcm', encryptionKey(), iv);
    cipher.setAuthTag(tag);
    return Buffer.concat([cipher.update(data), cipher.final()]).toString('utf8');
}

export async function redeemWalletCode(customerId: number, raw: string) {
    if (!validCode(raw)) throw new WalletError('Code is invalid', 422);
    return knexInstance.transaction(async (trx) => {
        await trx('vsq_customers').where({ id: customerId, status: 'ACTIVE' }).forUpdate().first();
        const initial = await trx('vsq_wallet_codes').where({ code_hash: codeHash(raw) }).first();
        if (initial?.kind === 'GIFT') {
            const purchase = await trx('vsq_gift_purchases').where({ id: initial.purchase_id }).forUpdate().first();
            if (purchase?.status !== 'PAID') throw new WalletError('Code is unavailable', 409);
        }
        const code = initial ? await trx('vsq_wallet_codes').where({ id: initial.id }).forUpdate().first() : null;
        if (!code) throw new WalletError('Code is invalid', 404);
        if (code.status !== 'ISSUED') throw new WalletError('Code has already been used', 409);
        await trx('vsq_credit_accounts').insert({ customer_id: customerId, created_at: new Date(), updated_at: new Date() }).onConflict('customer_id').ignore();
        await trx('vsq_credit_accounts').where({ customer_id: customerId }).forUpdate().first();
        await trx('vsq_wallet_codes').where({ id: code.id }).update({ status: 'REDEEMED', redeemed_by_customer_id: customerId, redeemed_at: new Date(), updated_at: new Date() });
        await trx('vsq_credit_transactions').insert({ public_id: crypto.randomUUID(), customer_id: customerId,
            type: 'ADMIN_ADJUSTMENT', source: code.kind === 'GIFT' ? 'PURCHASED_GIFT_CODE' : 'PACKAGE_CODE',
            pending_delta_minor: 0, available_delta_minor: code.amount_minor, currency: 'INR',
            idempotency_key: `wallet-code:${code.id}`, description: code.kind === 'GIFT' ? 'Gift code redeemed' : 'Package code redeemed',
            actor_type: 'CUSTOMER', actor_id: customerId, metadata: JSON.stringify({ code_public_id: code.public_id }), created_at: new Date() });
        await trx('vsq_credit_accounts').where({ customer_id: customerId }).update({ available_balance_minor: trx.raw('available_balance_minor + ?', [code.amount_minor]), version: trx.raw('version + 1'), updated_at: new Date() });
        return { amount: Number(code.amount_minor) / 100, currency: 'INR' };
    });
}

export async function generatePackageCodes(amountMinor: number, count: number, adminId: number) {
    if (!Number.isSafeInteger(amountMinor) || amountMinor < 100 || amountMinor > 1_000_000_00 || !Number.isInteger(count) || count < 1 || count > 100) throw new WalletError('Enter a valid value and quantity', 422);
    encryptionKey();
    return knexInstance.transaction(async (trx) => {
        const codes = Array.from({ length: count }, freshCode);
        await trx('vsq_wallet_codes').insert(codes.map((code) => ({ public_id: crypto.randomUUID(), code_hash: codeHash(code), encrypted_code: encrypt(code), kind: 'PACKAGE', amount_minor: amountMinor, status: 'ISSUED', created_by_admin_id: adminId, created_at: new Date(), updated_at: new Date() })));
        return codes;
    });
}

export async function packageCodeForAdmin(publicId: string) {
    if (!/^[0-9a-f-]{36}$/i.test(publicId)) throw new WalletError('Package code not found', 404);
    const row = await knexInstance('vsq_wallet_codes').where({ public_id: publicId, kind: 'PACKAGE' })
        .select('id', 'public_id', 'encrypted_code', 'amount_minor', 'status').first();
    if (!row) throw new WalletError('Package code not found', 404);
    if (!row.encrypted_code) throw new WalletError('This older code was stored only as a hash and cannot be recovered. Use its original export.', 409);
    return { public_id: String(row.public_id), code: decryptGiftCode(String(row.encrypted_code)), amount_minor: Number(row.amount_minor), status: String(row.status) };
}

export async function giftDenominations() {
    return knexInstance('vsq_gift_denominations').select('id', 'amount_minor', 'active').orderBy('amount_minor', 'asc');
}

export async function saveGiftDenomination(amountMinor: number, active: boolean) {
    if (!Number.isSafeInteger(amountMinor) || amountMinor < 100 || amountMinor > 1_000_000_00) throw new WalletError('Invalid denomination', 422);
    await knexInstance('vsq_gift_denominations').insert({ amount_minor: amountMinor, active, created_at: new Date(), updated_at: new Date() })
        .onConflict('amount_minor').merge({ active, updated_at: new Date() });
    return giftDenominations();
}

export async function startGiftPurchase(customerId: number, denominationId: number, idempotencyKey: string) {
    if (!config.razorpay.enabled) throw new WalletError('Gift purchases are unavailable', 503);
    encryptionKey();
    if (!/^[A-Za-z0-9_-]{16,80}$/.test(idempotencyKey)) throw new WalletError('Invalid purchase request', 400);
    const denom = await knexInstance('vsq_gift_denominations').where({ id: denominationId }).first();
    if (!denom) throw new WalletError('Denomination is unavailable', 404);
    const key = crypto.createHash('sha256').update(`${customerId}:${idempotencyKey}`).digest('hex');
    let purchase = await knexInstance('vsq_gift_purchases').where({ idempotency_key: key }).first();
    if (!purchase) {
        if (!denom.active) throw new WalletError('Denomination is unavailable', 404);
        try {
            await knexInstance('vsq_gift_purchases').insert({ public_id: crypto.randomUUID(), buyer_customer_id: customerId,
                amount_minor: denom.amount_minor, status: 'CREATING', idempotency_key: key, created_at: new Date(), updated_at: new Date() });
        } catch (error: any) { if (error?.code !== 'ER_DUP_ENTRY') throw error; }
        purchase = await knexInstance('vsq_gift_purchases').where({ idempotency_key: key }).first();
    }
    if (Number(purchase.buyer_customer_id) !== customerId || Number(purchase.amount_minor) !== Number(denom.amount_minor)) throw new WalletError('Purchase request conflicts with an earlier request', 409);
    if (purchase.status === 'PAID') return giftPurchaseForBuyer(String(purchase.public_id), customerId);
    if (purchase.status !== 'CREATING' && purchase.status !== 'PENDING') throw new WalletError('This purchase request is closed', 409);
    if (!purchase.provider_order_id) {
        purchase = await knexInstance.transaction(async (trx) => {
            const locked = await trx('vsq_gift_purchases').where({ id: purchase.id }).forUpdate().first();
            if (locked.provider_order_id) return locked;
            const receipt = `gift-${locked.public_id}`;
            const provider: any = await findProviderOrderByReceipt(receipt)
                || await createProviderOrder({ amount: Number(locked.amount_minor), currency: 'INR', receipt, notes: { kind: 'VSQ_GIFT_CODE', purchase_id: locked.public_id } });
            if (Number(provider.amount) !== Number(locked.amount_minor) || provider.currency !== 'INR') throw new WalletError('Payment order amount mismatch', 409);
            await trx('vsq_gift_purchases').where({ id: locked.id }).update({ provider_order_id: provider.id, status: 'PENDING', updated_at: new Date() });
            return { ...locked, provider_order_id: provider.id, status: 'PENDING' };
        });
    }
    const customer = await knexInstance('vsq_customers').where({ id: customerId }).first();
    return { public_id: purchase.public_id, status: purchase.status, amount: Number(purchase.amount_minor) / 100, currency: 'INR',
        payment_session: { provider: 'RAZORPAY', key_id: publicKeyId(), provider_order_id: purchase.provider_order_id,
            amount: Number(purchase.amount_minor), currency: 'INR', order_public_id: purchase.public_id,
            order_number: purchase.public_id, customer: { name: [customer.first_name, customer.last_name].filter(Boolean).join(' '), email: customer.email, contact: customer.phone || '' } } };
}

export async function finalizeGiftPurchase(providerOrderId: string, providerPaymentId: string) {
    const provider: any = await fetchProviderPayment(providerPaymentId);
    if (provider.order_id !== providerOrderId || provider.status !== 'captured') throw new WalletError('Payment is not captured', 409);
    return knexInstance.transaction(async (trx) => {
        const purchase = await trx('vsq_gift_purchases').where({ provider_order_id: providerOrderId }).forUpdate().first();
        if (!purchase) return null;
        if (Number(provider.amount) !== Number(purchase.amount_minor) || provider.currency !== 'INR') throw new WalletError('Payment amount does not match', 409);
        if (purchase.status === 'PAID') return { public_id: purchase.public_id, status: 'PAID' };
        if (purchase.status !== 'PENDING') throw new WalletError('Purchase cannot be completed', 409);
        const code = freshCode();
        await trx('vsq_wallet_codes').insert({ public_id: crypto.randomUUID(), code_hash: codeHash(code), kind: 'GIFT', amount_minor: purchase.amount_minor,
            status: 'ISSUED', purchase_id: purchase.id, encrypted_code: encrypt(code), created_at: new Date(), updated_at: new Date() });
        await trx('vsq_gift_purchases').where({ id: purchase.id }).update({ status: 'PAID', provider_payment_id: providerPaymentId, paid_at: new Date(), updated_at: new Date() });
        const customer = await trx('vsq_customers').where({ id: purchase.buyer_customer_id }).first();
        await queueCommerceEmail(trx, { eventKey: `gift.purchase:${purchase.id}`, template: 'GIFT_CODE_PURCHASE', recipientEmail: customer.email,
            recipientName: [customer.first_name, customer.last_name].filter(Boolean).join(' '), payload: { purchase_public_id: purchase.public_id } });
        return { public_id: purchase.public_id, status: 'PAID' };
    });
}

export async function verifyGiftPurchase(publicId: string, customerId: number, paymentId: string, signature: string) {
    const purchase = await knexInstance('vsq_gift_purchases').where({ public_id: publicId, buyer_customer_id: customerId }).first();
    if (!purchase) throw new WalletError('Purchase not found', 404);
    if (!verifyCheckoutSignature(purchase.provider_order_id, paymentId, signature)) throw new WalletError('Payment signature is invalid', 400);
    await finalizeGiftPurchase(purchase.provider_order_id, paymentId);
    return giftPurchaseForBuyer(publicId, customerId);
}

export async function giftPurchaseForBuyer(publicId: string, customerId: number) {
    const purchase = await knexInstance('vsq_gift_purchases').where({ public_id: publicId, buyer_customer_id: customerId }).first();
    if (!purchase) throw new WalletError('Purchase not found', 404);
    const code = purchase.status === 'PAID' ? await knexInstance('vsq_wallet_codes').where({ purchase_id: purchase.id }).first() : null;
    return { public_id: purchase.public_id, status: purchase.status, amount: Number(purchase.amount_minor) / 100, currency: 'INR', code: code?.encrypted_code ? decryptGiftCode(code.encrypted_code) : null, redeemed: code?.status === 'REDEEMED' };
}

export async function requestGiftRefund(publicId: string, reason: string) {
    const purchaseId = await knexInstance.transaction(async (trx) => {
        const purchase = await trx('vsq_gift_purchases').where({ public_id: publicId }).forUpdate().first();
        if (!purchase) throw new WalletError('Purchase not found', 404);
        if (purchase.status === 'REFUNDED') return Number(purchase.id);
        if (purchase.status !== 'PAID' && purchase.status !== 'REFUND_PENDING') throw new WalletError('Purchase cannot be refunded', 409);
        const code = await trx('vsq_wallet_codes').where({ purchase_id: purchase.id }).forUpdate().first();
        if (code?.status === 'REDEEMED') throw new WalletError('A redeemed code requires manual financial review', 409);
        if (!code || !purchase.provider_payment_id) throw new WalletError('Purchase payment or code is unavailable', 409);
        if (purchase.status === 'PAID') {
            await trx('vsq_wallet_codes').where({ id: code.id }).update({ status: 'VOID', updated_at: new Date() });
            await trx('vsq_gift_purchases').where({ id: purchase.id }).update({ status: 'REFUND_PENDING', refund_reason: reason.slice(0, 500), refund_requested_at: new Date(), updated_at: new Date() });
        }
        return Number(purchase.id);
    });
    return knexInstance.transaction(async (trx) => {
        const purchase = await trx('vsq_gift_purchases').where({ id: purchaseId }).forUpdate().first();
        if (purchase.status === 'REFUNDED') return { status: 'REFUNDED' };
        if (purchase.provider_refund_id) return { status: 'REFUND_PENDING' };
        const receipt = `vsq-gift-${purchase.id}`;
        const previous: any = await fetchProviderPaymentRefunds(purchase.provider_payment_id);
        let refund: any = previous.items?.find((item: any) => item.receipt === receipt);
        if (!refund) refund = await createProviderRefund({ paymentId: purchase.provider_payment_id, amount: Number(purchase.amount_minor), receipt, notes: { kind: 'VSQ_GIFT_CODE', purchase_id: purchase.public_id } });
        await trx('vsq_gift_purchases').where({ id: purchase.id }).update({ provider_refund_id: refund.id, updated_at: new Date() });
        return { status: 'REFUND_PENDING' };
    });
}

export async function syncGiftRefund(providerPaymentId: string, providerRefundId: string, status: string) {
    const purchase = await knexInstance('vsq_gift_purchases').where({ provider_payment_id: providerPaymentId }).first();
    if (!purchase) return false;
    if (purchase.provider_refund_id && purchase.provider_refund_id !== providerRefundId) throw new WalletError('Gift refund id does not match', 409);
    if (status === 'processed') await knexInstance('vsq_gift_purchases').where({ id: purchase.id, status: 'REFUND_PENDING' }).update({ status: 'REFUNDED', provider_refund_id: providerRefundId, refunded_at: new Date(), updated_at: new Date() });
    return true;
}
