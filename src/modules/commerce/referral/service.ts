import crypto from 'crypto';
import type { Knex } from 'knex';
import { fromMinorUnits, toMinorUnits } from '../payment/money';

const CLAIM_TTL_HOURS = 24;
const REWARD_RATE_BPS = 500;
const RETURN_WINDOW_DAYS = 7;

export class CommerceReferralError extends Error {
    constructor(message: string, public readonly statusCode: number) {
        super(message);
        this.name = 'CommerceReferralError';
    }
}

export function normalizeReferralCode(value?: string | null) {
    return String(value || '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 20);
}

function expiresAt() {
    return new Date(Date.now() + CLAIM_TTL_HOURS * 60 * 60 * 1000);
}

function generatedCode() {
    return `VSQ${crypto.randomBytes(5).toString('hex').toUpperCase()}`;
}

async function ensureAccount(trx: Knex.Transaction | Knex, customerId: number) {
    await trx('vsq_credit_accounts').insert({
        customer_id: customerId,
        pending_balance_minor: 0,
        available_balance_minor: 0,
        currency: 'INR',
        created_at: new Date(),
        updated_at: new Date()
    }).onConflict('customer_id').ignore();
}

export async function ensureReferralProfile(trx: Knex.Transaction | Knex, customerId: number) {
    let profile = await trx('vsq_customer_referral_profiles').where({ customer_id: customerId }).first();
    if (!profile) {
        for (let attempt = 0; attempt < 5 && !profile; attempt += 1) {
            try {
                await trx('vsq_customer_referral_profiles').insert({
                    customer_id: customerId,
                    referral_code: generatedCode(),
                    created_at: new Date(),
                    updated_at: new Date()
                }).onConflict('customer_id').ignore();
                profile = await trx('vsq_customer_referral_profiles').where({ customer_id: customerId }).first();
            } catch (error) {
                if (!String((error as { code?: string }).code || '').includes('DUP')) throw error;
            }
        }
    }
    if (!profile) throw new Error('Unable to create referral profile');
    await ensureAccount(trx, customerId);
    return profile;
}

export async function resolveReferral(code: string) {
    const normalized = normalizeReferralCode(code);
    if (!normalized) return null;
    const row = await knexInstance('vsq_customer_referral_profiles as rp')
        .join('vsq_customers as c', 'c.id', 'rp.customer_id')
        .select('rp.referral_code', 'c.id as customer_id', 'c.first_name', 'c.last_name')
        .where('rp.referral_code', normalized)
        .where('c.status', 'ACTIVE')
        .whereNull('c.deleted_at')
        .first();
    if (!row) return null;
    const name = [row.first_name, row.last_name].filter(Boolean).join(' ');
    return { code: row.referral_code, referrer_name: name ? `${name.split(' ')[0]}` : 'A Vastriqo customer' };
}

export async function registerReferralClaim(
    trx: Knex.Transaction,
    customerId: number,
    rawCode: string | null | undefined,
    source: 'SIGNUP' | 'SIGNIN' | 'CHECKOUT' | 'SIGNED_IN_VISIT'
) {
    const code = normalizeReferralCode(rawCode);
    await ensureReferralProfile(trx, customerId);
    if (!code) return null;

    const referrer = await trx('vsq_customer_referral_profiles as rp')
        .join('vsq_customers as c', 'c.id', 'rp.customer_id')
        .select('rp.customer_id', 'rp.referral_code')
        .where('rp.referral_code', code)
        .where('c.status', 'ACTIVE')
        .whereNull('c.deleted_at')
        .first();
    if (!referrer || Number(referrer.customer_id) === customerId) return null;

    const now = new Date();
    await trx('vsq_referral_claims')
        .where({ customer_id: customerId, status: 'PENDING' })
        .update({ status: 'SUPERSEDED', updated_at: now });

    const [claimId] = await trx('vsq_referral_claims').insert({
        public_id: crypto.randomUUID(),
        customer_id: customerId,
        referrer_customer_id: referrer.customer_id,
        referral_code_snapshot: referrer.referral_code,
        status: 'PENDING',
        source,
        claimed_at: now,
        expires_at: expiresAt(),
        created_at: now,
        updated_at: now
    });

    const profile = await trx('vsq_customer_referral_profiles').where({ customer_id: customerId }).forUpdate().first();
    if (profile && !profile.default_referrer_customer_id) {
        await trx('vsq_customer_referral_profiles').where({ customer_id: customerId }).update({
            default_referrer_customer_id: referrer.customer_id,
            default_attributed_at: now,
            updated_at: now
        });
    }
    return await trx('vsq_referral_claims').where({ id: claimId }).first();
}

export async function claimReferralForCustomer(customerId: number, code: string) {
    return knexInstance.transaction(async (trx) => {
        const claim = await registerReferralClaim(trx, customerId, code, 'SIGNED_IN_VISIT');
        if (!claim) throw new CommerceReferralError('Referral code is invalid or cannot be used on this account', 422);
        return { code: claim.referral_code_snapshot, expires_at: claim.expires_at };
    });
}

export async function attachReferralToOrder(
    trx: Knex.Transaction,
    input: { customerId: number; orderId: number; referralCode?: string | null }
) {
    const claim = input.referralCode
        ? await registerReferralClaim(trx, input.customerId, input.referralCode, 'CHECKOUT')
        : null;
    const now = new Date();
    await trx('vsq_referral_claims')
        .where({ customer_id: input.customerId, status: 'PENDING' })
        .where('expires_at', '<=', now)
        .update({ status: 'EXPIRED', updated_at: now });

    const profile = await ensureReferralProfile(trx, input.customerId);
    const referrerCustomerId = claim?.referrer_customer_id || profile.default_referrer_customer_id;
    if (!referrerCustomerId || Number(referrerCustomerId) === input.customerId) return null;

    const referrerProfile = await trx('vsq_customer_referral_profiles')
        .where({ customer_id: referrerCustomerId })
        .first();
    if (!referrerProfile) return null;

    const [orderReferralId] = await trx('vsq_order_referrals').insert({
        public_id: crypto.randomUUID(),
        order_id: input.orderId,
        buyer_customer_id: input.customerId,
        referrer_customer_id: referrerCustomerId,
        referral_claim_id: claim?.id || null,
        referral_code_snapshot: referrerProfile.referral_code,
        attribution_type: claim ? 'OVERRIDE' : 'DEFAULT',
        reward_rate_bps: REWARD_RATE_BPS,
        currency: 'INR',
        status: 'ATTRIBUTED',
        created_at: now,
        updated_at: now
    });
    if (claim) {
        await trx('vsq_referral_claims').where({ id: claim.id }).update({
            status: 'CONSUMED',
            consumed_at: now,
            consumed_order_id: input.orderId,
            updated_at: now
        });
    }
    return orderReferralId;
}

async function insertCreditTransaction(
    trx: Knex.Transaction,
    input: {
        customerId: number;
        orderId?: number | null;
        orderReferralId?: number | null;
        type: string;
        pendingDeltaMinor: number;
        availableDeltaMinor: number;
        idempotencyKey: string;
        description: string;
        metadata?: Record<string, unknown>;
        actorId?: number | null;
        actorType?: string;
    }
) {
    const inserted = await trx('vsq_credit_transactions').insert({
        public_id: crypto.randomUUID(),
        customer_id: input.customerId,
        order_id: input.orderId || null,
        order_referral_id: input.orderReferralId || null,
        type: input.type,
        pending_delta_minor: input.pendingDeltaMinor,
        available_delta_minor: input.availableDeltaMinor,
        currency: 'INR',
        idempotency_key: input.idempotencyKey,
        description: input.description,
        metadata: JSON.stringify(input.metadata || {}),
        actor_id: input.actorId || null,
        actor_type: input.actorType || 'SYSTEM',
        created_at: new Date()
    }).onConflict('idempotency_key').ignore();
    return Number(inserted[0] || 0) > 0;
}

export async function creditReferralForPaidOrder(trx: Knex.Transaction, orderId: number) {
    const referral = await trx('vsq_order_referrals').where({ order_id: orderId }).forUpdate().first();
    if (!referral || referral.status !== 'ATTRIBUTED') return;
    const order = await trx('vsq_orders').where({ id: orderId }).first();
    if (!order || order.financial_status !== 'PAID') return;

    const eligibleMinor = Math.max(0, toMinorUnits(order.subtotal) - toMinorUnits(order.discount_total));
    const rewardMinor = Math.floor(eligibleMinor * Number(referral.reward_rate_bps) / 10000);
    if (rewardMinor <= 0) {
        await trx('vsq_order_referrals').where({ id: referral.id }).update({ status: 'VOIDED', void_reason: 'Eligible order amount was zero', updated_at: new Date() });
        return;
    }
    await ensureAccount(trx, Number(referral.referrer_customer_id));
    const inserted = await insertCreditTransaction(trx, {
        customerId: Number(referral.referrer_customer_id),
        orderId,
        orderReferralId: Number(referral.id),
        type: 'REFERRAL_PENDING',
        pendingDeltaMinor: rewardMinor,
        availableDeltaMinor: 0,
        idempotencyKey: `referral:order:${orderId}:pending`,
        description: `Referral reward pending for order ${order.order_number}`,
        metadata: { reward_rate_bps: referral.reward_rate_bps, eligible_amount_minor: eligibleMinor }
    });
    if (!inserted) return;
    await trx('vsq_credit_accounts').where({ customer_id: referral.referrer_customer_id }).update({
        pending_balance_minor: trx.raw('pending_balance_minor + ?', [rewardMinor]),
        version: trx.raw('version + 1'),
        updated_at: new Date()
    });
    await trx('vsq_order_referrals').where({ id: referral.id }).update({
        eligible_amount_minor: eligibleMinor,
        reward_amount_minor: rewardMinor,
        status: 'PENDING',
        earned_at: new Date(),
        updated_at: new Date()
    });
}

export async function voidReferralForOrder(trx: Knex.Transaction, orderId: number, reason: string) {
    await trx('vsq_order_referrals').where({ order_id: orderId, status: 'ATTRIBUTED' }).update({
        status: 'VOIDED', void_reason: reason.slice(0, 500), updated_at: new Date()
    });
}

export async function creditRedemptionAmount(
    trx: Knex.Transaction,
    customerId: number,
    requestedAmount: number | null | undefined,
    payableBeforeCreditsMinor: number
) {
    const requestedMinor = Math.max(0, toMinorUnits(requestedAmount || 0));
    if (!requestedMinor) return 0;
    await ensureAccount(trx, customerId);
    const account = await trx('vsq_credit_accounts').where({ customer_id: customerId }).forUpdate().first();
    return Math.min(
        requestedMinor,
        Math.max(0, Number(account.available_balance_minor || 0)),
        Math.max(0, payableBeforeCreditsMinor - 100)
    );
}

export async function redeemCreditsForOrder(
    trx: Knex.Transaction,
    input: { customerId: number; orderId: number; amountMinor: number; orderNumber: string }
) {
    if (input.amountMinor <= 0) return;
    await trx('vsq_credit_redemptions').insert({
        public_id: crypto.randomUUID(),
        customer_id: input.customerId,
        order_id: input.orderId,
        amount_minor: input.amountMinor,
        currency: 'INR',
        status: 'APPLIED',
        created_at: new Date(),
        updated_at: new Date()
    });
    const inserted = await insertCreditTransaction(trx, {
        customerId: input.customerId,
        orderId: input.orderId,
        type: 'REDEMPTION',
        pendingDeltaMinor: 0,
        availableDeltaMinor: -input.amountMinor,
        idempotencyKey: `credits:order:${input.orderId}:redeemed`,
        description: `Vastriqo Credits used on order ${input.orderNumber}`
    });
    if (!inserted) throw new Error('Credit redemption transaction could not be recorded');
    await trx('vsq_credit_accounts').where({ customer_id: input.customerId }).update({
        available_balance_minor: trx.raw('available_balance_minor - ?', [input.amountMinor]),
        version: trx.raw('version + 1'),
        updated_at: new Date()
    });
}

export async function refundCreditRedemptionForOrder(trx: Knex.Transaction, orderId: number, reason: string) {
    const redemption = await trx('vsq_credit_redemptions').where({ order_id: orderId, status: 'APPLIED' }).forUpdate().first();
    if (!redemption) return;
    const order = await trx('vsq_orders').where({ id: orderId }).first();
    const inserted = await insertCreditTransaction(trx, {
        customerId: Number(redemption.customer_id),
        orderId,
        type: 'REDEMPTION_REFUND',
        pendingDeltaMinor: 0,
        availableDeltaMinor: Number(redemption.amount_minor),
        idempotencyKey: `credits:order:${orderId}:redemption-refund`,
        description: `Vastriqo Credits restored for order ${order?.order_number || orderId}`,
        metadata: { reason }
    });
    if (!inserted) return;
    await trx('vsq_credit_accounts').where({ customer_id: redemption.customer_id }).update({
        available_balance_minor: trx.raw('available_balance_minor + ?', [Number(redemption.amount_minor)]),
        version: trx.raw('version + 1'),
        updated_at: new Date()
    });
    await trx('vsq_credit_redemptions').where({ id: redemption.id }).update({ status: 'REFUNDED', refunded_at: new Date(), updated_at: new Date() });
}

export async function reverseReferralForRefund(trx: Knex.Transaction, orderId: number, refundKey: string) {
    const referral = await trx('vsq_order_referrals').where({ order_id: orderId }).forUpdate().first();
    if (!referral || !['PENDING', 'AVAILABLE', 'PARTIALLY_REVERSED'].includes(referral.status)) return;
    const order = await trx('vsq_orders').where({ id: orderId }).first();
    const completed = await trx('vsq_refunds').where({ order_id: orderId, status: 'COMPLETED' }).sum({ amount: 'amount' }).first();
    const paidMinor = Math.max(1, toMinorUnits(order?.grand_total || 0));
    const refundedMinor = Math.min(paidMinor, toMinorUnits(completed?.amount || 0));
    const rewardMinor = Number(referral.reward_amount_minor || 0);
    const targetReversed = refundedMinor >= paidMinor
        ? rewardMinor
        : Math.floor(rewardMinor * refundedMinor / paidMinor);
    const delta = Math.max(0, targetReversed - Number(referral.reversed_amount_minor || 0));
    if (!delta) return;

    const fromPending = !referral.available_at;
    const inserted = await insertCreditTransaction(trx, {
        customerId: Number(referral.referrer_customer_id),
        orderId,
        orderReferralId: Number(referral.id),
        type: 'REFERRAL_REVERSED',
        pendingDeltaMinor: fromPending ? -delta : 0,
        availableDeltaMinor: fromPending ? 0 : -delta,
        idempotencyKey: `referral:order:${orderId}:refund:${refundKey}`,
        description: `Vastriqo Credits reversed after refund for order ${order?.order_number || orderId}`,
        metadata: { refunded_amount_minor: refundedMinor, cumulative_reversal_minor: targetReversed }
    });
    if (!inserted) return;
    const balanceColumn = fromPending ? 'pending_balance_minor' : 'available_balance_minor';
    await trx('vsq_credit_accounts').where({ customer_id: referral.referrer_customer_id }).update({
        [balanceColumn]: trx.raw(`${balanceColumn} - ?`, [delta]),
        version: trx.raw('version + 1'),
        updated_at: new Date()
    });
    await trx('vsq_order_referrals').where({ id: referral.id }).update({
        reversed_amount_minor: targetReversed,
        status: targetReversed >= rewardMinor ? 'REVERSED' : 'PARTIALLY_REVERSED',
        reversed_at: targetReversed >= rewardMinor ? new Date() : referral.reversed_at,
        updated_at: new Date()
    });
}

export async function releaseEligibleCredits(customerId?: number) {
    const cutoff = new Date(Date.now() - RETURN_WINDOW_DAYS * 24 * 60 * 60 * 1000);
    const query = knexInstance('vsq_order_referrals as referral')
        .join('vsq_shipments as shipment', 'shipment.order_id', 'referral.order_id')
        .select('referral.id')
        .whereIn('referral.status', ['PENDING', 'PARTIALLY_REVERSED'])
        .whereNull('referral.available_at')
        .where('shipment.status', 'DELIVERED')
        .whereNotNull('shipment.delivered_at')
        .where('shipment.delivered_at', '<=', cutoff);
    if (customerId) query.where('referral.referrer_customer_id', customerId);
    const rows = await query.groupBy('referral.id');
    for (const row of rows) {
        await knexInstance.transaction(async (trx) => {
            const referral = await trx('vsq_order_referrals')
                .where({ id: row.id })
                .whereIn('status', ['PENDING', 'PARTIALLY_REVERSED'])
                .whereNull('available_at')
                .forUpdate()
                .first();
            if (!referral) return;
            const remaining = Number(referral.reward_amount_minor) - Number(referral.reversed_amount_minor || 0);
            if (remaining <= 0) return;
            const order = await trx('vsq_orders').where({ id: referral.order_id }).first();
            const inserted = await insertCreditTransaction(trx, {
                customerId: Number(referral.referrer_customer_id),
                orderId: Number(referral.order_id),
                orderReferralId: Number(referral.id),
                type: 'REFERRAL_RELEASED',
                pendingDeltaMinor: -remaining,
                availableDeltaMinor: remaining,
                idempotencyKey: `referral:order:${referral.order_id}:released`,
                description: `Vastriqo Credits available for order ${order?.order_number || referral.order_id}`
            });
            if (!inserted) return;
            await trx('vsq_credit_accounts').where({ customer_id: referral.referrer_customer_id }).update({
                pending_balance_minor: trx.raw('pending_balance_minor - ?', [remaining]),
                available_balance_minor: trx.raw('available_balance_minor + ?', [remaining]),
                version: trx.raw('version + 1'),
                updated_at: new Date()
            });
            await trx('vsq_order_referrals').where({ id: referral.id }).update({
                status: Number(referral.reversed_amount_minor || 0) > 0 ? 'PARTIALLY_REVERSED' : 'AVAILABLE',
                available_at: new Date(),
                updated_at: new Date()
            });
        });
    }
    return rows.length;
}

export async function customerCredits(customerId: number, limit = 20, page = 1) {
    await ensureReferralProfile(knexInstance, customerId);
    await releaseEligibleCredits(customerId);
    const safeLimit = Math.min(Math.max(limit, 1), 50);
    const safePage = Math.max(page, 1);
    const [profile, account, transactions, transactionCount, activity, earned] = await Promise.all([
        knexInstance('vsq_customer_referral_profiles').where({ customer_id: customerId }).first(),
        knexInstance('vsq_credit_accounts').where({ customer_id: customerId }).first(),
        knexInstance('vsq_credit_transactions as transaction')
            .leftJoin('vsq_orders as order', 'order.id', 'transaction.order_id')
            .select('transaction.public_id', 'transaction.type', 'transaction.pending_delta_minor', 'transaction.available_delta_minor', 'transaction.description', 'transaction.created_at', 'order.order_number')
            .where('transaction.customer_id', customerId)
            .orderBy('transaction.id', 'desc').limit(safeLimit).offset((safePage - 1) * safeLimit),
        knexInstance('vsq_credit_transactions').where({ customer_id: customerId }).count({ total: 'id' }).first(),
        knexInstance('vsq_order_referrals as referral')
            .join('vsq_orders as order', 'order.id', 'referral.order_id')
            .leftJoin('vsq_customers as buyer', 'buyer.id', 'referral.buyer_customer_id')
            .select('referral.public_id', 'referral.attribution_type', 'referral.status', 'referral.reward_amount_minor', 'referral.reversed_amount_minor', 'referral.created_at', 'order.order_number', 'buyer.first_name', 'buyer.last_name')
            .where('referral.referrer_customer_id', customerId)
            .orderBy('referral.id', 'desc').limit(50),
        knexInstance('vsq_order_referrals').where({ referrer_customer_id: customerId }).sum({ total: knexInstance.raw('reward_amount_minor - reversed_amount_minor') }).first()
    ]);
    return {
        referral_code: profile.referral_code,
        currency: account.currency,
        pending_credits: fromMinorUnits(Number(account.pending_balance_minor || 0)),
        available_credits: fromMinorUnits(Number(account.available_balance_minor || 0)),
        lifetime_earned: fromMinorUnits(Number(earned?.total || 0)),
        transactions: transactions.map((row) => ({
            ...row,
            pending_delta: fromMinorUnits(Number(row.pending_delta_minor || 0)),
            available_delta: fromMinorUnits(Number(row.available_delta_minor || 0))
        })),
        transaction_pagination: { page: safePage, limit: safeLimit, total: Number(transactionCount?.total || 0) },
        activity: activity.map((row) => ({
            public_id: row.public_id,
            order_number: row.order_number,
            buyer_name: [row.first_name, row.last_name].filter(Boolean).join(' ') || 'Customer',
            attribution_type: row.attribution_type,
            status: row.status,
            reward: fromMinorUnits(Number(row.reward_amount_minor || 0) - Number(row.reversed_amount_minor || 0)),
            created_at: row.created_at
        }))
    };
}

export async function adminReferralReport(query: Record<string, unknown>) {
    await releaseEligibleCredits();
    const page = Math.max(1, Number(query.page || 1));
    const limit = Math.min(100, Math.max(1, Number(query.limit || 25)));
    const base = knexInstance('vsq_order_referrals as referral')
        .join('vsq_orders as order', 'order.id', 'referral.order_id')
        .join('vsq_customers as buyer', 'buyer.id', 'referral.buyer_customer_id')
        .join('vsq_customers as referrer', 'referrer.id', 'referral.referrer_customer_id');
    if (String(query.status || '').trim()) base.where('referral.status', String(query.status));
    if (String(query.search || '').trim()) {
        const search = `%${String(query.search).trim()}%`;
        base.where((builder) => builder.whereLike('order.order_number', search).orWhereLike('buyer.email', search).orWhereLike('referrer.email', search));
    }
    const totalRow = await base.clone().clearSelect().clearOrder().count({ total: 'referral.id' }).first();
    const referrals = await base.select(
        'referral.public_id', 'referral.referral_code_snapshot', 'referral.attribution_type', 'referral.status',
        'referral.reward_rate_bps', 'referral.eligible_amount_minor', 'referral.reward_amount_minor', 'referral.reversed_amount_minor',
        'referral.created_at', 'referral.earned_at', 'referral.available_at', 'order.order_number',
        'buyer.public_id as buyer_public_id', 'buyer.email as buyer_email', 'buyer.first_name as buyer_first_name', 'buyer.last_name as buyer_last_name',
        'referrer.public_id as referrer_public_id', 'referrer.email as referrer_email', 'referrer.first_name as referrer_first_name', 'referrer.last_name as referrer_last_name'
    ).orderBy('referral.id', 'desc').limit(limit).offset((page - 1) * limit);
    return {
        referrals: referrals.map((row) => ({
            ...row,
            reward_rate: Number(row.reward_rate_bps) / 100,
            eligible_amount: fromMinorUnits(Number(row.eligible_amount_minor || 0)),
            reward_amount: fromMinorUnits(Number(row.reward_amount_minor || 0)),
            reversed_amount: fromMinorUnits(Number(row.reversed_amount_minor || 0))
        })),
        pagination: { page, limit, total: Number(totalRow?.total || 0) }
    };
}

export async function adminCreditTransactions(query: Record<string, unknown>) {
    const page = Math.max(1, Number(query.page || 1));
    const limit = Math.min(100, Math.max(1, Number(query.limit || 25)));
    const base = knexInstance('vsq_credit_transactions as transaction')
        .join('vsq_customers as customer', 'customer.id', 'transaction.customer_id')
        .leftJoin('vsq_orders as order', 'order.id', 'transaction.order_id');
    if (String(query.type || '').trim()) base.where('transaction.type', String(query.type));
    if (String(query.search || '').trim()) {
        const search = `%${String(query.search).trim()}%`;
        base.where((builder) => builder.whereLike('customer.email', search).orWhereLike('order.order_number', search).orWhereLike('transaction.description', search));
    }
    const totalRow = await base.clone().clearSelect().clearOrder().count({ total: 'transaction.id' }).first();
    const transactions = await base.select(
        'transaction.public_id', 'transaction.type', 'transaction.pending_delta_minor', 'transaction.available_delta_minor',
        'transaction.description', 'transaction.actor_type', 'transaction.created_at',
        'customer.public_id as customer_public_id', 'customer.email', 'customer.first_name', 'customer.last_name',
        'order.order_number'
    ).orderBy('transaction.id', 'desc').limit(limit).offset((page - 1) * limit);
    return {
        transactions: transactions.map((row) => ({
            ...row,
            pending_delta: fromMinorUnits(Number(row.pending_delta_minor || 0)),
            available_delta: fromMinorUnits(Number(row.available_delta_minor || 0))
        })),
        pagination: { page, limit, total: Number(totalRow?.total || 0) }
    };
}

export async function adjustCredits(customerPublicId: string, amount: number, reason: string, actorId: number) {
    const amountMinor = toMinorUnits(amount);
    if (!amountMinor) throw new CommerceReferralError('Adjustment amount cannot be zero', 422);
    if (!reason.trim()) throw new CommerceReferralError('Adjustment reason is required', 422);
    const customerId = await knexInstance.transaction(async (trx) => {
        const customer = await trx('vsq_customers').where({ public_id: customerPublicId }).whereNull('deleted_at').first();
        if (!customer) throw new CommerceReferralError('Customer not found', 404);
        await ensureReferralProfile(trx, Number(customer.id));
        await insertCreditTransaction(trx, {
            customerId: Number(customer.id),
            type: 'ADMIN_ADJUSTMENT',
            pendingDeltaMinor: 0,
            availableDeltaMinor: amountMinor,
            idempotencyKey: `admin-adjustment:${crypto.randomUUID()}`,
            description: reason.trim(),
            metadata: { amount_minor: amountMinor },
            actorId,
            actorType: 'ADMIN'
        });
        await trx('vsq_credit_accounts').where({ customer_id: customer.id }).update({
            available_balance_minor: trx.raw('available_balance_minor + ?', [amountMinor]),
            version: trx.raw('version + 1'),
            updated_at: new Date()
        });
        return Number(customer.id);
    });
    return customerCredits(customerId, 20, 1);
}
