import type { NextFunction, Request, Response } from 'express';

export function requireCommerceAdmin(req: Request, res: Response, next: NextFunction) {
    const user = (req as any).user as { id?: number; user_type?: string } | undefined;
    if (!user?.id || user.user_type !== 'ADMIN') {
        return res.status(403).json({
            success: false,
            message: 'Commerce administration requires an administrator account',
            data: null
        });
    }
    return next();
}
