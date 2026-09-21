import type { Request, Response, NextFunction } from 'express';
import { query, validationResult } from 'express-validator';

export function paginationRules(maxLimit: number) {
    return [
        query('page').optional().isInt({ min: 1, max: 10000 }).withMessage('Page is invalid'),
        query('limit').optional().isInt({ min: 1, max: maxLimit }).withMessage('Page size is invalid')
    ];
}

export function validateReviewRequest(req: Request, res: Response, next: NextFunction) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ success: false, message: String(errors.array()[0].msg), data: null });
    return next();
}
