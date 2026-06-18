import { StatusCodes } from 'http-status-codes';
import Response from '../lib/api-response';

const TABLE_NAME = 'newsletter_subscribers';
const DEFAULT_SOURCE = 'homepage';
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type NewsletterSubscribeResult = {
    alreadySubscribed: boolean;
};

function normalizeEmail(email: unknown): string {
    return typeof email === 'string' ? email.trim().toLowerCase() : '';
}

function normalizeSource(source: unknown): string {
    const value = typeof source === 'string' ? source.trim() : '';
    return value || DEFAULT_SOURCE;
}

function isDuplicateError(error: unknown): boolean {
    const err = error as { code?: string; errno?: number };
    return err?.code === 'ER_DUP_ENTRY' || err?.errno === 1062;
}

export default class SharedNewsletterService {
    static validateEmail(email: unknown): string {
        const normalizedEmail = normalizeEmail(email);
        if (!normalizedEmail || !EMAIL_PATTERN.test(normalizedEmail)) {
            throw Response.createError({
                message: 'Please enter a valid email address.',
                code: StatusCodes.BAD_REQUEST,
                name: 'NewsletterEmailInvalid'
            });
        }

        return normalizedEmail;
    }

    static async subscribe(email: unknown, source: unknown): Promise<NewsletterSubscribeResult> {
        const normalizedEmail = SharedNewsletterService.validateEmail(email);
        const normalizedSource = normalizeSource(source);
        const existing = await knexInstance(TABLE_NAME)
            .select('id')
            .where({ email: normalizedEmail })
            .first() as { id: number } | undefined;

        if (existing) {
            return { alreadySubscribed: true };
        }

        try {
            await knexInstance(TABLE_NAME).insert({
                email: normalizedEmail,
                source: normalizedSource,
                created_at: new Date(),
                updated_at: new Date()
            });
        } catch (error: unknown) {
            if (isDuplicateError(error)) {
                return { alreadySubscribed: true };
            }
            throw error;
        }

        return { alreadySubscribed: false };
    }
}
