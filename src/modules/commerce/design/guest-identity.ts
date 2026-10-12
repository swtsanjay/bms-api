import crypto from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';

const cookieName = process.env.NODE_ENV === 'production' || process.env.NODE_ENV === 'prod'
    ? '__Host-vsq_design_guest' : 'vsq_design_guest';
const maxAgeSeconds = 30 * 24 * 60 * 60;
const signingSecret = process.env.DESIGN_GUEST_COOKIE_SECRET || null;
if (signingSecret && Buffer.byteLength(signingSecret, 'utf8') < 32) {
    throw new Error('DESIGN_GUEST_COOKIE_SECRET must be at least 32 bytes');
}

function signature(id: string, issuedAt: string, secret: string): Buffer {
    return crypto.createHmac('sha256', secret).update(`vsq-design-guest-v1:${id}:${issuedAt}`).digest();
}

function readCookie(req: Request): string | null {
    const entry = String(req.headers.cookie || '').split(';').map((part) => part.trim())
        .find((part) => part.startsWith(`${cookieName}=`));
    if (!entry) return null;
    try { return decodeURIComponent(entry.slice(cookieName.length + 1)); }
    catch { return null; }
}

function verifiedId(value: string | null, secret: string): string | null {
    const match = /^([0-9a-f]{32})\.([0-9]{10})\.([0-9a-f]{64})$/.exec(value || '');
    if (!match) return null;
    const issuedAt = Number(match[2]);
    const now = Math.floor(Date.now() / 1000);
    if (issuedAt > now + 60 || issuedAt < now - maxAgeSeconds) return null;
    const expected = signature(match[1], match[2], secret);
    const supplied = Buffer.from(match[3], 'hex');
    return crypto.timingSafeEqual(expected, supplied) ? match[1] : null;
}

type GuestDesignRequest = Request & { designGuestRateLimitKey?: string };

export function guestDesignRateLimitKey(req: Request): string | null {
    return (req as GuestDesignRequest).designGuestRateLimitKey || null;
}

/** Only the API can mint or verify this identity; arbitrary browser cookie values are ignored. */
export function identifyGuestDesign(req: Request, res: Response, next: NextFunction): void {
    if (req.commerceCustomer) return next();
    const secret = signingSecret;
    if (!secret) return next(); // Keep the existing socket-IP limit until both services are configured.
    let id = verifiedId(readCookie(req), secret);
    if (!id) {
        id = crypto.randomBytes(16).toString('hex');
        const issuedAt = String(Math.floor(Date.now() / 1000));
        const token = `${id}.${issuedAt}.${signature(id, issuedAt, secret).toString('hex')}`;
        res.cookie(cookieName, token, {
            httpOnly: true,
            secure: cookieName.startsWith('__Host-'),
            sameSite: 'lax',
            path: '/',
            maxAge: maxAgeSeconds * 1000
        });
    }
    (req as GuestDesignRequest).designGuestRateLimitKey = id;
    next();
}
