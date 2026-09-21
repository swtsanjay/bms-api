export class ReviewError extends Error {
    constructor(message: string, public readonly statusCode: number) { super(message); }
}

export const reviewStatuses = ['PENDING', 'PUBLISHED', 'REJECTED'] as const;
export type ReviewStatus = typeof reviewStatuses[number];

export function reviewInput(input: { rating?: unknown; title?: unknown; body?: unknown }) {
    if (typeof input.rating !== 'number' || !Number.isInteger(input.rating) || input.rating < 1 || input.rating > 5) {
        throw new ReviewError('Choose a rating between 1 and 5', 400);
    }
    if (typeof input.body !== 'string' || (input.title !== undefined && typeof input.title !== 'string')) {
        throw new ReviewError('Review text is invalid', 400);
    }
    const title = String(input.title || '').trim();
    const body = input.body.trim();
    if (title.length > 120 || body.length < 10 || body.length > 2000) {
        throw new ReviewError('Use a title up to 120 characters and a review between 10 and 2,000 characters', 400);
    }
    if (/[<>\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(title + body)) {
        throw new ReviewError('Reviews must be plain text without HTML', 400);
    }
    return { rating: input.rating, title, body };
}

export function reviewerName(first?: string | null, last?: string | null) {
    const name = first?.trim().split(/\s+/)[0] || 'Customer';
    const initial = last?.trim().charAt(0);
    return `${name}${initial ? ` ${initial.toUpperCase()}.` : ''}`.slice(0, 120);
}

export type ReviewRow = {
    id: number; public_id: string; product_id: number; customer_id: number;
    order_item_id: number | null; reviewer_name: string; rating: number;
    title: string; body: string; verified_purchase: boolean | number;
    status: ReviewStatus; version: number; created_at: Date | string;
    published_at: Date | string | null; moderation_note: string | null;
};

// Explicit allowlist: never expose customer/order IDs, emails or moderation notes.
export function publicReview(row: ReviewRow) {
    return {
        public_id: row.public_id, reviewer_name: row.reviewer_name,
        rating: Number(row.rating), title: row.title, body: row.body,
        verified_purchase: Boolean(row.verified_purchase), created_at: row.created_at
    };
}

export function ratingSummary(rows: Array<{ rating: number | string; count: number | string }>) {
    const distribution = [5, 4, 3, 2, 1].map((rating) => ({ rating, count: Number(rows.find((row) => Number(row.rating) === rating)?.count || 0) }));
    const count = distribution.reduce((sum, row) => sum + row.count, 0);
    const total = distribution.reduce((sum, row) => sum + row.rating * row.count, 0);
    return { count, average: count ? Math.round(total / count * 10) / 10 : null, distribution };
}
