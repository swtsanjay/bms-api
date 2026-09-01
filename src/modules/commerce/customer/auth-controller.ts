import type { Request, Response } from 'express';
import CommerceCustomerAuthService, { CommerceAuthError, CommerceSession } from './auth-service';

const SECURE_REFRESH_COOKIE = '__Host-vsq_refresh_token';
const LOCAL_REFRESH_COOKIE = 'vsq_refresh_token';

function refreshCookieName() {
    return process.env.NODE_ENV === 'local' || process.env.NODE_ENV === 'development'
        ? LOCAL_REFRESH_COOKIE
        : SECURE_REFRESH_COOKIE;
}

function requestContext(req: Request) {
    return {
        userAgent: req.get('user-agent'),
        ipAddress: req.ip
    };
}

function parseCookies(req: Request) {
    return String(req.headers.cookie || '')
        .split(';')
        .map((value) => value.trim())
        .filter(Boolean)
        .reduce<Record<string, string>>((result, value) => {
            const separator = value.indexOf('=');
            if (separator > 0) {
                result[value.slice(0, separator)] = decodeURIComponent(value.slice(separator + 1));
            }
            return result;
        }, {});
}

function refreshTokenFrom(req: Request) {
    const bodyToken = typeof req.body?.refresh_token === 'string' ? req.body.refresh_token.trim() : '';
    const cookies = parseCookies(req);
    return bodyToken || cookies[SECURE_REFRESH_COOKIE] || cookies[LOCAL_REFRESH_COOKIE] || null;
}

function setRefreshCookie(res: Response, token: string) {
    const secure = process.env.NODE_ENV !== 'local' && process.env.NODE_ENV !== 'development';
    const attributes = [
        `${refreshCookieName()}=${encodeURIComponent(token)}`,
        'Path=/',
        'HttpOnly',
        'SameSite=Lax',
        'Max-Age=2592000',
        ...(secure ? ['Secure'] : [])
    ];
    res.setHeader('Set-Cookie', attributes.join('; '));
}

function clearRefreshCookie(res: Response) {
    const secure = process.env.NODE_ENV !== 'local' && process.env.NODE_ENV !== 'development';
    const attributes = [
        `${refreshCookieName()}=`,
        'Path=/',
        'HttpOnly',
        'SameSite=Lax',
        'Max-Age=0',
        ...(secure ? ['Secure'] : [])
    ];
    res.setHeader('Set-Cookie', attributes.join('; '));
}

function sessionResponse(res: Response, session: CommerceSession, statusCode = 200) {
    setRefreshCookie(res, session.refreshToken);
    return res.status(statusCode).json({
        success: true,
        message: statusCode === 201 ? 'Account created' : 'Authentication successful',
        data: {
            customer: session.customer,
            access_token: session.accessToken,
            access_token_expires_in: session.accessTokenExpiresIn
        }
    });
}

function errorResponse(res: Response, error: unknown) {
    if (error instanceof CommerceAuthError) {
        return res.status(error.statusCode).json({ success: false, message: error.message, data: null });
    }
    console.error('Commerce customer authentication failed', error);
    return res.status(500).json({ success: false, message: 'Authentication request failed', data: null });
}

export default class CommerceCustomerAuthController {
    static async signup(req: Request, res: Response) {
        try {
            const session = await CommerceCustomerAuthService.signup({
                email: String(req.body.email || ''),
                password: String(req.body.password || ''),
                firstName: req.body.first_name,
                lastName: req.body.last_name,
                phone: req.body.phone
            }, requestContext(req));
            return sessionResponse(res, session, 201);
        } catch (error) {
            return errorResponse(res, error);
        }
    }

    static async login(req: Request, res: Response) {
        try {
            const session = await CommerceCustomerAuthService.login(
                String(req.body.email || ''),
                String(req.body.password || ''),
                requestContext(req)
            );
            return sessionResponse(res, session);
        } catch (error) {
            return errorResponse(res, error);
        }
    }

    static async refresh(req: Request, res: Response) {
        const refreshToken = refreshTokenFrom(req);
        if (!refreshToken) {
            return res.status(401).json({ success: false, message: 'Refresh session required', data: null });
        }

        try {
            const session = await CommerceCustomerAuthService.refresh(refreshToken, requestContext(req));
            return sessionResponse(res, session);
        } catch (error) {
            clearRefreshCookie(res);
            return errorResponse(res, error);
        }
    }

    static async logout(req: Request, res: Response) {
        try {
            await CommerceCustomerAuthService.logout(refreshTokenFrom(req), req.commerceCustomer?.id);
            clearRefreshCookie(res);
            return res.json({ success: true, message: 'Logged out', data: true });
        } catch (error) {
            return errorResponse(res, error);
        }
    }

    static async me(req: Request, res: Response) {
        const customer = await CommerceCustomerAuthService.customerById(Number(req.commerceCustomer?.id));
        if (!customer) {
            return res.status(404).json({ success: false, message: 'Customer not found', data: null });
        }
        return res.json({ success: true, message: 'Customer found', data: { customer } });
    }
}
