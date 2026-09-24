import crypto from 'crypto';
import axios from 'axios';
import FormData from 'form-data';
import type { Knex } from 'knex';
import config from '../../../config';

export type CommerceEmailTemplate =
    | 'WELCOME'
    | 'PASSWORD_RESET'
    | 'PASSWORD_CHANGED'
    | 'ORDER_PLACED'
    | 'PAYMENT_CONFIRMED';

type EmailPayload = Record<string, unknown>;

type EmailOutboxRow = {
    id: number;
    public_id: string;
    event_key: string;
    template: CommerceEmailTemplate;
    recipient_email: string;
    recipient_name?: string | null;
    payload_json: string | EmailPayload;
    attempts: number;
};

type RenderedEmail = { subject: string; text: string; html: string };

const MAX_ATTEMPTS = 5;
const BATCH_SIZE = 10;

class PermanentEmailError extends Error {}

function escapeHtml(value: unknown) {
    return String(value ?? '')
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#039;');
}

function payloadOf(row: EmailOutboxRow): EmailPayload {
    if (typeof row.payload_json === 'string') {
        try { return JSON.parse(row.payload_json) as EmailPayload; } catch { return {}; }
    }
    return row.payload_json || {};
}

function currency(value: unknown, code = 'INR') {
    return new Intl.NumberFormat('en-IN', {
        style: 'currency', currency: code, maximumFractionDigits: Number(value || 0) % 1 === 0 ? 0 : 2
    }).format(Number(value || 0));
}

function emailLayout(title: string, preview: string, content: string) {
    const support = config.mailgun.supportEmail
        ? `<a href="mailto:${escapeHtml(config.mailgun.supportEmail)}" style="color:#76582c">${escapeHtml(config.mailgun.supportEmail)}</a>`
        : 'our support team';
    return `<!doctype html><html><body style="margin:0;background:#f6f0e8;color:#211d18;font-family:Arial,Helvetica,sans-serif">
<div style="display:none;max-height:0;overflow:hidden">${escapeHtml(preview)}</div>
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f6f0e8"><tr><td align="center" style="padding:28px 14px">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:620px;background:#fffdf9;border:1px solid #e4d8ca">
<tr><td style="padding:24px 30px;background:#1d1b17;color:#fff;text-align:center"><div style="font-family:Georgia,serif;font-size:29px;font-weight:bold">vastriqo</div></td></tr>
<tr><td style="padding:34px 30px"><h1 style="margin:0 0 18px;font-family:Georgia,serif;font-size:28px;line-height:1.2">${escapeHtml(title)}</h1>${content}</td></tr>
<tr><td style="padding:20px 30px;border-top:1px solid #e8ded3;color:#746a60;font-size:12px;line-height:1.6">Need help? Contact ${support}.<br>Vastriqo · Factory-direct fashion</td></tr>
</table></td></tr></table></body></html>`;
}

function button(label: string, href: string) {
    return `<a href="${escapeHtml(href)}" style="display:inline-block;margin-top:20px;background:#1d1b17;color:#fff;text-decoration:none;padding:13px 22px;font-size:13px;font-weight:bold;letter-spacing:.05em">${escapeHtml(label)}</a>`;
}

async function orderEmailData(orderPublicId: string) {
    const order = await knexInstance('vsq_orders as o')
        .leftJoin('vsq_customers as c', 'c.id', 'o.customer_id')
        .select('o.*', 'c.first_name', 'c.last_name')
        .where('o.public_id', orderPublicId)
        .first();
    if (!order) throw new Error('Email order was not found');
    const [items, addressRow] = await Promise.all([
        knexInstance('vsq_order_items').where({ order_id: order.id }).orderBy('id', 'asc'),
        knexInstance('vsq_order_addresses').where({ order_id: order.id, type: 'SHIPPING' }).first()
    ]);
    let address: Record<string, unknown> = {};
    if (addressRow?.address_json) {
        address = typeof addressRow.address_json === 'string'
            ? JSON.parse(addressRow.address_json)
            : addressRow.address_json;
    }
    return { order, items, address };
}

function greeting(name: unknown) {
    return escapeHtml(String(name || '').trim() || 'there');
}

async function renderEmail(row: EmailOutboxRow): Promise<RenderedEmail> {
    const payload = payloadOf(row);
    const name = greeting(row.recipient_name || payload.name);
    const storeUrl = config.mailgun.storefrontUrl;

    if (row.template === 'WELCOME') {
        const subject = 'Welcome to Vastriqo';
        return {
            subject,
            text: `Hi ${name}, welcome to Vastriqo. Your account is ready. Shop at ${storeUrl}`,
            html: emailLayout('Welcome to Vastriqo', 'Your Vastriqo account is ready.', `<p style="font-size:15px;line-height:1.75;margin:0">Hi ${name},</p><p style="font-size:15px;line-height:1.75">Your account is ready. Discover factory-direct styles, manage orders and earn Vastriqo Credits when friends shop through your referral link.</p>${button('Start shopping', storeUrl)}`)
        };
    }

    if (row.template === 'PASSWORD_RESET') {
        const resetToken = await knexInstance('vsq_customer_password_reset_tokens')
            .select('id')
            .where({ public_id: String(payload.reset_token_public_id || '') })
            .whereNull('consumed_at')
            .where('expires_at', '>', new Date())
            .first();
        if (!resetToken) throw new PermanentEmailError('Password reset link is no longer valid');
        const resetUrl = String(payload.reset_url || '');
        const subject = 'Reset your Vastriqo password';
        return {
            subject,
            text: `Hi ${name}, reset your Vastriqo password using this link: ${resetUrl}. This link expires in 30 minutes. If you did not request this, ignore this email.`,
            html: emailLayout('Reset your password', 'Use this secure link to reset your Vastriqo password.', `<p style="font-size:15px;line-height:1.75;margin:0">Hi ${name},</p><p style="font-size:15px;line-height:1.75">We received a request to reset your password. This one-time link expires in 30 minutes.</p>${button('Reset password', resetUrl)}<p style="margin-top:24px;color:#746a60;font-size:13px;line-height:1.6">If you did not request this, you can safely ignore this email. Your password will remain unchanged.</p>`)
        };
    }

    if (row.template === 'PASSWORD_CHANGED') {
        const subject = 'Your Vastriqo password was changed';
        return {
            subject,
            text: `Hi ${name}, your Vastriqo password was changed successfully. If this was not you, contact support immediately.`,
            html: emailLayout('Password changed', 'Your Vastriqo password has been updated.', `<p style="font-size:15px;line-height:1.75;margin:0">Hi ${name},</p><p style="font-size:15px;line-height:1.75">Your Vastriqo password was changed successfully and existing signed-in sessions were closed.</p><p style="color:#9a3128;font-size:13px;line-height:1.6">If you did not make this change, contact us immediately.</p>${button('Sign in', `${storeUrl}/login`)}`)
        };
    }

    const orderPublicId = String(payload.order_public_id || '');
    const { order, items, address } = await orderEmailData(orderPublicId);
    const orderName = greeting(row.recipient_name || payload.name || order.first_name);
    const itemRows = items.map((item) => `<tr><td style="padding:10px 0;border-bottom:1px solid #eee5db"><strong>${escapeHtml(item.product_title_snapshot)}</strong><br><span style="color:#746a60;font-size:12px">${escapeHtml(item.variant_title_snapshot)} · Qty ${Number(item.quantity)}</span></td><td align="right" style="padding:10px 0;border-bottom:1px solid #eee5db">${currency(item.line_total, order.currency)}</td></tr>`).join('');
    const addressText = [address.address_line_1, address.address_line_2, address.city, address.state, address.postcode].filter(Boolean).map(escapeHtml).join(', ');
    const summary = `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-top:20px;font-size:14px">${itemRows}<tr><td style="padding-top:14px"><strong>Total</strong></td><td align="right" style="padding-top:14px;font-size:17px"><strong>${currency(order.grand_total, order.currency)}</strong></td></tr></table>${addressText ? `<p style="margin-top:24px;color:#746a60;font-size:13px;line-height:1.6"><strong style="color:#211d18">Delivery address</strong><br>${addressText}</p>` : ''}`;

    if (row.template === 'ORDER_PLACED') {
        const isCod = order.payment_method === 'COD';
        const subject = `Order ${order.order_number} received`;
        const paymentText = isCod ? 'You can pay when your order is delivered.' : 'Complete online payment to confirm your order.';
        return {
            subject,
            text: `Hi ${orderName}, we received order ${order.order_number} for ${currency(order.grand_total, order.currency)}. ${paymentText}`,
            html: emailLayout('We received your order', `Order ${order.order_number} has been placed.`, `<p style="font-size:15px;line-height:1.75;margin:0">Hi ${orderName},</p><p style="font-size:15px;line-height:1.75">Order <strong>${escapeHtml(order.order_number)}</strong> has been placed. ${escapeHtml(paymentText)}</p>${summary}${button('View your orders', `${storeUrl}/orders`)}`)
        };
    }

    const subject = `Payment confirmed for ${order.order_number}`;
    return {
        subject,
        text: `Hi ${orderName}, payment of ${currency(order.grand_total, order.currency)} for order ${order.order_number} is confirmed.`,
        html: emailLayout('Payment confirmed', `Payment for order ${order.order_number} was successful.`, `<p style="font-size:15px;line-height:1.75;margin:0">Hi ${orderName},</p><p style="font-size:15px;line-height:1.75">We received your payment of <strong>${currency(order.grand_total, order.currency)}</strong> for order <strong>${escapeHtml(order.order_number)}</strong>. We’ll let you know when it ships.</p>${summary}${button('View your order', `${storeUrl}/orders`)}`)
    };
}

export async function queueCommerceEmail(
    db: Knex | Knex.Transaction,
    input: {
        eventKey: string;
        template: CommerceEmailTemplate;
        recipientEmail: string;
        recipientName?: string | null;
        payload?: EmailPayload;
    }
) {
    if (!input.recipientEmail) return;
    await db('vsq_email_outbox').insert({
        public_id: crypto.randomUUID(),
        event_key: input.eventKey,
        template: input.template,
        recipient_email: input.recipientEmail.trim().toLowerCase(),
        recipient_name: input.recipientName?.trim() || null,
        payload_json: JSON.stringify(input.payload || {}),
        status: 'PENDING',
        attempts: 0,
        available_at: new Date(),
        created_at: new Date(),
        updated_at: new Date()
    }).onConflict('event_key').ignore();
}

async function sendMailgun(row: EmailOutboxRow) {
    const email = await renderEmail(row);
    const form = new FormData();
    form.append('from', `${config.mailgun.fromName} <${config.mailgun.fromEmail}>`);
    const recipientName = String(row.recipient_name || '').replace(/[\r\n]/g, ' ').trim();
    form.append('to', recipientName ? `${recipientName} <${row.recipient_email}>` : row.recipient_email);
    form.append('subject', email.subject);
    form.append('text', email.text);
    form.append('html', email.html);
    form.append('o:tag', row.template.toLowerCase().replaceAll('_', '-'));
    const response = await axios.post(
        `${config.mailgun.apiBaseUrl}/v3/${encodeURIComponent(config.mailgun.domain)}/messages`,
        form,
        {
            auth: { username: 'api', password: config.mailgun.apiKey },
            headers: form.getHeaders(),
            timeout: 15000,
            maxBodyLength: 5 * 1024 * 1024
        }
    );
    return String(response.data?.id || '');
}

function emailError(error: unknown) {
    if (axios.isAxiosError(error)) {
        return String(error.response?.data?.message || error.message || 'Mailgun request failed').slice(0, 2000);
    }
    return String(error instanceof Error ? error.message : error).slice(0, 2000);
}

export async function processCommerceEmailOutbox() {
    if (!config.mailgun.enabled) return 0;
    const now = new Date();
    const staleLock = new Date(now.getTime() - 10 * 60 * 1000);
    await knexInstance('vsq_email_outbox')
        .where({ status: 'PROCESSING' })
        .where('locked_at', '<', staleLock)
        .update({ status: 'PENDING', locked_at: null, updated_at: now });

    const rows = await knexInstance.transaction(async (trx) => {
        const selected = await trx('vsq_email_outbox')
            .where({ status: 'PENDING' })
            .where('available_at', '<=', now)
            .where('attempts', '<', MAX_ATTEMPTS)
            .orderBy('id', 'asc')
            .limit(BATCH_SIZE)
            // Keep the claim portable across MySQL and older MariaDB versions.
            // Concurrent workers briefly wait here, then re-evaluate the
            // PENDING predicate after the first worker commits its claim.
            .forUpdate() as EmailOutboxRow[];
        if (selected.length) {
            await trx('vsq_email_outbox').whereIn('id', selected.map((row) => row.id)).update({
                status: 'PROCESSING',
                attempts: trx.raw('attempts + 1'),
                locked_at: now,
                updated_at: now
            });
        }
        return selected;
    });

    let sent = 0;
    for (const row of rows) {
        try {
            const providerMessageId = await sendMailgun(row);
            await knexInstance('vsq_email_outbox').where({ id: row.id }).update({
                status: 'SENT',
                provider_message_id: providerMessageId || null,
                ...(row.template === 'PASSWORD_RESET' ? { payload_json: JSON.stringify({ redacted: true }) } : {}),
                sent_at: new Date(),
                locked_at: null,
                last_error: null,
                updated_at: new Date()
            });
            sent += 1;
        } catch (error) {

            console.log('Email Send Failed', error);

            const attempts = Number(row.attempts || 0) + 1;
            const permanentFailure = error instanceof PermanentEmailError;
            const delayMinutes = [1, 5, 15, 60, 360][Math.min(attempts - 1, 4)];
            await knexInstance('vsq_email_outbox').where({ id: row.id }).update({
                status: permanentFailure || attempts >= MAX_ATTEMPTS ? 'FAILED' : 'PENDING',
                ...((permanentFailure || attempts >= MAX_ATTEMPTS) && row.template === 'PASSWORD_RESET'
                    ? { payload_json: JSON.stringify({ redacted: true }) }
                    : {}),
                available_at: new Date(Date.now() + delayMinutes * 60 * 1000),
                locked_at: null,
                last_error: emailError(error),
                updated_at: new Date()
            });
        }
    }
    return sent;
}
