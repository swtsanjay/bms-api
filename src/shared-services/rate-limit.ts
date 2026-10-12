import type { NextFunction, Request, RequestHandler, Response } from 'express';
import { RateLimiterMemory, RateLimiterRes } from 'rate-limiter-flexible';
import crypto from 'node:crypto';

type Rule = { points: number; durationSeconds: number; key: (req: Request) => string };

/** In-process limiter. A shared atomic store is required if deployment has multiple API processes. */
export function createRateLimit(rules: Rule[], message = 'Too many attempts. Please try again later.'): RequestHandler {
    const limits = rules.map((rule) => ({ rule, limiter: new RateLimiterMemory({ points: rule.points, duration: rule.durationSeconds }) }));
    return async (req: Request, res: Response, next: NextFunction) => {
        for (const { rule, limiter } of limits) {
            try {
                await limiter.consume(rule.key(req));
            } catch (error) {
                if (error instanceof RateLimiterRes) {
                    res.setHeader('Retry-After', String(Math.max(1, Math.ceil(error.msBeforeNext / 1000))));
                    res.setHeader('Cache-Control', 'no-store');
                    return res.status(429).json({ success: false, message, data: null });
                }
                console.error('Rate-limit check failed', error);
                res.setHeader('Cache-Control', 'no-store');
                return res.status(503).json({ success: false, message: 'Request protection is temporarily unavailable', data: null });
            }
        }
        return next();
    };
}

export function requestIp(req: Request): string {
    return req.ip || req.socket.remoteAddress || 'unknown';
}

export function emailRateLimit(scope: string, points: number, durationSeconds: number): RequestHandler {
    const emailKey = (req: Request) => crypto.createHash('sha256')
        .update(String(req.body?.email || '').trim().toLowerCase()).digest('hex');
    return createRateLimit([
        { points, durationSeconds, key: (req) => `${scope}:pair:${requestIp(req)}:${emailKey(req)}` },
        { points, durationSeconds, key: (req) => `${scope}:email:${emailKey(req)}` }
    ]);
}
