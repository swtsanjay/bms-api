import bcrypt from 'bcrypt';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import type { Knex } from 'knex';
import config from '../../../config';
import { ensureReferralProfile, registerReferralClaim } from '../referral/service';
import { queueCommerceEmail } from '../email/service';

const ACCESS_TOKEN_TTL_SECONDS = 15 * 60;
const REFRESH_TOKEN_TTL_DAYS = 30;
const MAX_FAILED_LOGINS = 5;
const LOGIN_LOCK_MINUTES = 15;
const PASSWORD_RESET_TTL_MINUTES = 30;

export type CommerceCustomer = {
    id: number;
    public_id: string;
    email: string;
    email_normalized: string;
    phone?: string | null;
    phone_normalized?: string | null;
    first_name?: string | null;
    last_name?: string | null;
    status: string;
    email_verified_at?: Date | string | null;
    phone_verified_at?: Date | string | null;
    last_login_at?: Date | string | null;
    created_at: Date | string;
    updated_at: Date | string;
};

type CredentialRow = {
    customer_id: number;
    password_hash: string;
    failed_login_count: number;
    locked_until?: Date | string | null;
};

type SessionRow = {
    id: number;
    public_id: string;
    customer_id: number;
    refresh_token_hash: string;
    expires_at: Date | string;
    revoked_at?: Date | string | null;
};

export class CommerceAuthError extends Error {
    constructor(message: string, public readonly statusCode: number) {
        super(message);
        this.name = 'CommerceAuthError';
    }
}

export type CommerceSession = {
    customer: CommerceCustomer;
    accessToken: string;
    refreshToken: string;
    accessTokenExpiresIn: number;
};

export type CommerceCustomerToken = {
    id: number;
    public_id: string;
    email: string;
    session_id: string;
    type: 'VSQ_CUSTOMER';
};

function normalizeEmail(email: string) {
    return email.trim().toLowerCase();
}

function normalizePhone(phone?: string | null) {
    const normalized = String(phone || '').replace(/\D/g, '');
    return normalized || null;
}

function hashToken(token: string) {
    return crypto.createHash('sha256').update(token).digest('hex');
}

function refreshExpiry() {
    const expiresAt = new Date();
    expiresAt.setUTCDate(expiresAt.getUTCDate() + REFRESH_TOKEN_TTL_DAYS);
    return expiresAt;
}

function signAccessToken(customer: CommerceCustomer, sessionPublicId: string) {
    return jwt.sign(
        {
            id: Number(customer.id),
            public_id: customer.public_id,
            email: customer.email,
            session_id: sessionPublicId,
            type: 'VSQ_CUSTOMER'
        } satisfies CommerceCustomerToken,
        config.jwt.secretKey,
        { expiresIn: ACCESS_TOKEN_TTL_SECONDS }
    );
}

function customerColumns() {
    return [
        'id',
        'public_id',
        'email',
        'email_normalized',
        'phone',
        'phone_normalized',
        'first_name',
        'last_name',
        'status',
        'email_verified_at',
        'phone_verified_at',
        'last_login_at',
        'created_at',
        'updated_at'
    ];
}

async function createSession(
    trx: Knex.Transaction,
    customer: CommerceCustomer,
    context: { userAgent?: string | null; ipAddress?: string | null }
): Promise<CommerceSession> {
    const sessionPublicId = crypto.randomUUID();
    const secret = crypto.randomBytes(32).toString('base64url');
    const refreshToken = `${sessionPublicId}.${secret}`;

    await trx('vsq_customer_sessions').insert({
        public_id: sessionPublicId,
        customer_id: customer.id,
        refresh_token_hash: hashToken(refreshToken),
        user_agent: context.userAgent?.slice(0, 500) || null,
        ip_address: context.ipAddress?.slice(0, 64) || null,
        expires_at: refreshExpiry(),
        created_at: new Date(),
        updated_at: new Date()
    });

    return {
        customer,
        accessToken: signAccessToken(customer, sessionPublicId),
        refreshToken,
        accessTokenExpiresIn: ACCESS_TOKEN_TTL_SECONDS
    };
}

export default class CommerceCustomerAuthService {
    static async signup(
        input: {
            email: string;
            password: string;
            firstName?: string | null;
            lastName?: string | null;
            phone?: string | null;
            referralCode?: string | null;
        },
        context: { userAgent?: string | null; ipAddress?: string | null }
    ): Promise<CommerceSession> {
        const emailNormalized = normalizeEmail(input.email);
        const phoneNormalized = normalizePhone(input.phone);

        return knexInstance.transaction(async (trx) => {
            const existing = await trx('vsq_customers')
                .select('id')
                .where({ email_normalized: emailNormalized })
                .whereNull('deleted_at')
                .first();

            if (existing) {
                throw new CommerceAuthError('An account with this email already exists', 409);
            }

            if (phoneNormalized) {
                const phoneOwner = await trx('vsq_customers')
                    .select('id')
                    .where({ phone_normalized: phoneNormalized })
                    .whereNull('deleted_at')
                    .first();
                if (phoneOwner) {
                    throw new CommerceAuthError('An account with this phone already exists', 409);
                }
            }

            const now = new Date();
            const [customerId] = await trx('vsq_customers').insert({
                public_id: crypto.randomUUID(),
                email: input.email.trim(),
                email_normalized: emailNormalized,
                phone: input.phone?.trim() || null,
                phone_normalized: phoneNormalized,
                first_name: input.firstName?.trim() || null,
                last_name: input.lastName?.trim() || null,
                status: 'ACTIVE',
                created_at: now,
                updated_at: now
            });

            await trx('vsq_customer_credentials').insert({
                customer_id: customerId,
                password_hash: await bcrypt.hash(input.password, 12),
                password_changed_at: now,
                failed_login_count: 0,
                created_at: now,
                updated_at: now
            });

            const customer = await trx('vsq_customers')
                .select(customerColumns())
                .where({ id: customerId })
                .first() as CommerceCustomer;

            await ensureReferralProfile(trx, Number(customerId));
            if (input.referralCode) {
                await registerReferralClaim(trx, Number(customerId), input.referralCode, 'SIGNUP');
            }

            await queueCommerceEmail(trx, {
                eventKey: `customer.welcome:${customer.public_id}`,
                template: 'WELCOME',
                recipientEmail: customer.email,
                recipientName: [customer.first_name, customer.last_name].filter(Boolean).join(' '),
                payload: { name: customer.first_name || null }
            });

            return createSession(trx, customer, context);
        });
    }

    static async requestPasswordReset(email: string, context: { ipAddress?: string | null }) {
        const emailNormalized = normalizeEmail(email);
        await knexInstance.transaction(async (trx) => {
            const customer = await trx('vsq_customers')
                .select(customerColumns())
                .where({ email_normalized: emailNormalized, status: 'ACTIVE' })
                .whereNull('deleted_at')
                .first() as CommerceCustomer | undefined;
            if (!customer) return;

            const now = new Date();
            const previousTokens = await trx('vsq_customer_password_reset_tokens')
                .select('public_id')
                .where({ customer_id: customer.id })
                .whereNull('consumed_at');
            await trx('vsq_customer_password_reset_tokens')
                .where({ customer_id: customer.id })
                .whereNull('consumed_at')
                .update({ consumed_at: now });
            if (previousTokens.length) {
                await trx('vsq_email_outbox')
                    .whereIn('event_key', previousTokens.map((row) => `customer.password-reset:${row.public_id}`))
                    .whereIn('status', ['PENDING', 'PROCESSING'])
                    .update({
                        status: 'FAILED',
                        payload_json: JSON.stringify({ redacted: true }),
                        last_error: 'Superseded by a newer password reset request',
                        locked_at: null,
                        updated_at: now
                    });
            }

            const token = crypto.randomBytes(32).toString('base64url');
            const tokenPublicId = crypto.randomUUID();
            await trx('vsq_customer_password_reset_tokens').insert({
                public_id: tokenPublicId,
                customer_id: customer.id,
                token_hash: hashToken(token),
                requested_ip: context.ipAddress?.slice(0, 64) || null,
                expires_at: new Date(now.getTime() + PASSWORD_RESET_TTL_MINUTES * 60 * 1000),
                created_at: now
            });
            await queueCommerceEmail(trx, {
                eventKey: `customer.password-reset:${tokenPublicId}`,
                template: 'PASSWORD_RESET',
                recipientEmail: customer.email,
                recipientName: [customer.first_name, customer.last_name].filter(Boolean).join(' '),
                payload: {
                    name: customer.first_name || null,
                    reset_token_public_id: tokenPublicId,
                    reset_url: `${config.mailgun.storefrontUrl}/reset-password?token=${encodeURIComponent(token)}`
                }
            });
        });
    }

    static async resetPassword(token: string, newPassword: string) {
        const passwordHash = await bcrypt.hash(newPassword, 12);
        const tokenHash = hashToken(token);
        return knexInstance.transaction(async (trx) => {
            const reset = await trx('vsq_customer_password_reset_tokens as pr')
                .join('vsq_customers as c', 'c.id', 'pr.customer_id')
                .select(
                    'pr.id', 'pr.public_id', 'pr.customer_id', 'pr.expires_at', 'pr.consumed_at',
                    'c.email', 'c.first_name', 'c.last_name', 'c.status'
                )
                .where('pr.token_hash', tokenHash)
                .forUpdate()
                .first();
            if (
                !reset
                || reset.consumed_at
                || reset.status !== 'ACTIVE'
                || new Date(reset.expires_at).getTime() <= Date.now()
            ) {
                throw new CommerceAuthError('This password reset link is invalid or has expired', 422);
            }

            const now = new Date();
            await trx('vsq_customer_credentials').where({ customer_id: reset.customer_id }).update({
                password_hash: passwordHash,
                password_changed_at: now,
                failed_login_count: 0,
                locked_until: null,
                updated_at: now
            });
            await trx('vsq_customer_password_reset_tokens')
                .where({ customer_id: reset.customer_id })
                .whereNull('consumed_at')
                .update({ consumed_at: now });
            await trx('vsq_customer_sessions')
                .where({ customer_id: reset.customer_id })
                .whereNull('revoked_at')
                .update({ revoked_at: now, revoked_reason: 'PASSWORD_RESET', updated_at: now });
            await queueCommerceEmail(trx, {
                eventKey: `customer.password-changed:${reset.public_id}`,
                template: 'PASSWORD_CHANGED',
                recipientEmail: reset.email,
                recipientName: [reset.first_name, reset.last_name].filter(Boolean).join(' '),
                payload: { name: reset.first_name || null }
            });
            return true;
        });
    }

    static async login(
        email: string,
        password: string,
        context: { userAgent?: string | null; ipAddress?: string | null },
        referralCode?: string | null
    ): Promise<CommerceSession> {
        const emailNormalized = normalizeEmail(email);

        return knexInstance.transaction(async (trx) => {
            const row = await trx('vsq_customers as c')
                .join('vsq_customer_credentials as cc', 'cc.customer_id', 'c.id')
                .select('c.*', 'cc.password_hash', 'cc.failed_login_count', 'cc.locked_until')
                .where('c.email_normalized', emailNormalized)
                .whereNull('c.deleted_at')
                .first() as (CommerceCustomer & CredentialRow) | undefined;

            if (!row) {
                await bcrypt.compare(password, '$2b$12$tLxaYIYAG3./UyPbt6MjAuGnTRiIGM7trlApWrVCraC0In8eA1oui');
                throw new CommerceAuthError('Invalid email or password', 401);
            }

            if (row.status !== 'ACTIVE') {
                throw new CommerceAuthError('This account is not active', 403);
            }

            if (row.locked_until && new Date(row.locked_until).getTime() > Date.now()) {
                throw new CommerceAuthError('Too many failed attempts. Try again later', 429);
            }

            const validPassword = await bcrypt.compare(password, row.password_hash);
            if (!validPassword) {
                const failures = Number(row.failed_login_count || 0) + 1;
                const lockedUntil = failures >= MAX_FAILED_LOGINS
                    ? new Date(Date.now() + LOGIN_LOCK_MINUTES * 60 * 1000)
                    : null;
                await trx('vsq_customer_credentials').where({ customer_id: row.id }).update({
                    failed_login_count: lockedUntil ? 0 : failures,
                    locked_until: lockedUntil,
                    updated_at: new Date()
                });
                throw new CommerceAuthError('Invalid email or password', 401);
            }

            const now = new Date();
            await trx('vsq_customer_credentials').where({ customer_id: row.id }).update({
                failed_login_count: 0,
                locked_until: null,
                updated_at: now
            });
            await trx('vsq_customers').where({ id: row.id }).update({
                last_login_at: now,
                updated_at: now
            });

            const customer = await trx('vsq_customers')
                .select(customerColumns())
                .where({ id: row.id })
                .first() as CommerceCustomer;

            await ensureReferralProfile(trx, Number(row.id));
            if (referralCode) {
                await registerReferralClaim(trx, Number(row.id), referralCode, 'SIGNIN');
            }

            return createSession(trx, customer, context);
        });
    }

    static async refresh(
        refreshToken: string,
        context: { userAgent?: string | null; ipAddress?: string | null }
    ): Promise<CommerceSession> {
        return knexInstance.transaction(async (trx) => {
            const session = await trx('vsq_customer_sessions')
                .where({ refresh_token_hash: hashToken(refreshToken) })
                .forUpdate()
                .first() as SessionRow | undefined;

            if (!session || session.revoked_at || new Date(session.expires_at).getTime() <= Date.now()) {
                throw new CommerceAuthError('Invalid or expired session', 401);
            }

            const customer = await trx('vsq_customers')
                .select(customerColumns())
                .where({ id: session.customer_id, status: 'ACTIVE' })
                .whereNull('deleted_at')
                .first() as CommerceCustomer | undefined;

            if (!customer) {
                throw new CommerceAuthError('Customer account is unavailable', 401);
            }

            await trx('vsq_customer_sessions').where({ id: session.id }).update({
                revoked_at: new Date(),
                revoked_reason: 'ROTATED',
                last_used_at: new Date(),
                updated_at: new Date()
            });

            return createSession(trx, customer, context);
        });
    }

    static async logout(refreshToken: string | null, customerId?: number) {
        if (!refreshToken && !customerId) {
            return;
        }

        const query = knexInstance('vsq_customer_sessions').whereNull('revoked_at');
        if (refreshToken) {
            query.where({ refresh_token_hash: hashToken(refreshToken) });
        } else if (customerId) {
            query.where({ customer_id: customerId });
        }
        await query.update({
            revoked_at: new Date(),
            revoked_reason: refreshToken ? 'LOGOUT' : 'LOGOUT_ALL',
            updated_at: new Date()
        });
    }

    static async customerById(customerId: number) {
        return await knexInstance('vsq_customers')
            .select(customerColumns())
            .where({ id: customerId })
            .whereNull('deleted_at')
            .first() as CommerceCustomer | undefined;
    }

    static verifyAccessToken(token: string) {
        const decoded = jwt.verify(token, config.jwt.secretKey) as CommerceCustomerToken;
        if (decoded.type !== 'VSQ_CUSTOMER' || !decoded.id || !decoded.session_id) {
            throw new CommerceAuthError('Invalid access token', 401);
        }
        return decoded;
    }
}
