import crypto from 'node:crypto';
import config from '../../../config';
import type { Knex } from 'knex';
import { queueCommerceEmail } from '../email/service';
import { awardApprovedDesign, DesignError } from './service';

const hash = (token: string) => crypto.createHash('sha256').update(token).digest('hex');

export async function queueEmailVerification(trx: Knex.Transaction, customer: { id: number; email: string; first_name?: string | null; last_name?: string | null }) {
    const token = crypto.randomBytes(32).toString('base64url');
    const publicId = crypto.randomUUID();
    await trx('vsq_email_verification_tokens').insert({ public_id: publicId, customer_id: customer.id, token_hash: hash(token), expires_at: new Date(Date.now() + 30 * 60_000), created_at: new Date() });
    await queueCommerceEmail(trx, { eventKey: `email.verify:${publicId}`, template: 'EMAIL_VERIFICATION', recipientEmail: customer.email,
        recipientName: [customer.first_name, customer.last_name].filter(Boolean).join(' '),
        payload: { verification_token_public_id: publicId, verification_url: `${config.mailgun.storefrontUrl}/verify-email?token=${encodeURIComponent(token)}` } });
}

export async function requestEmailVerification(customerId: number) {
    return knexInstance.transaction(async (trx) => {
        const customer = await trx('vsq_customers').where({ id: customerId }).forUpdate().first();
        if (!customer) throw new DesignError('Account not found', 404);
        if (customer.email_verified_at) return { verified: true };
        const recent = await trx('vsq_email_verification_tokens').where({ customer_id: customerId }).orderBy('id', 'desc').first();
        if (recent && Date.now() - new Date(recent.created_at).getTime() < 60_000) throw new DesignError('Please wait before requesting another email', 429);
        await queueEmailVerification(trx, customer);
        return { verified: false };
    });
}

export async function verifyCustomerEmail(token: string) {
    if (!/^[A-Za-z0-9_-]{43}$/.test(token)) throw new DesignError('Verification link is invalid', 400);
    const tokenHash = hash(token);
    return knexInstance.transaction(async (trx) => {
        const read = await trx('vsq_email_verification_tokens').where({ token_hash: tokenHash }).first();
        if (!read) throw new DesignError('Verification link is invalid or expired', 400);
        const customer = await trx('vsq_customers').where({ id: read.customer_id }).forUpdate().first();
        if (!customer) throw new DesignError('Account not found', 404);
        const row = await trx('vsq_email_verification_tokens').where({ id: read.id }).forUpdate().first();
        if (row.consumed_at || new Date(row.expires_at).getTime() <= Date.now()) throw new DesignError('Verification link is invalid or expired', 400);
        await trx('vsq_email_verification_tokens').where({ id: row.id }).update({ consumed_at: new Date() });
        if (!customer.email_verified_at) await trx('vsq_customers').where({ id: customer.id }).update({ email_verified_at: new Date(), updated_at: new Date() });
        await awardApprovedDesign(trx, Number(customer.id));
        return { verified: true };
    });
}
