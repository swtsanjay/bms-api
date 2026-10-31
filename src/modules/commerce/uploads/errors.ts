import type { Response } from 'express';

// Only errors deliberately constructed with a customer-safe message may cross
// the API boundary. Provider/SQL/network exception messages never do.
export class SubmissionError extends Error {
    constructor(message: string, public statusCode = 400, public errorCode = 'SUBMISSION_INVALID', options?: ErrorOptions) {
        super(message, options);
    }
}

export class PrivateStorageError extends SubmissionError {
    constructor(cause?: unknown) {
        super('File uploads are temporarily unavailable. Please try again later.', 503, 'UPLOAD_STORAGE_UNAVAILABLE', { cause });
    }
}

export function logSubmissionError(flow: string, stage: string, error: unknown) {
    const outer = error as Error & { cause?: unknown };
    const detail = (outer?.cause || error) as Error & { code?: string; $metadata?: { httpStatusCode?: number; requestId?: string } };
    console.error('Private submission request failed', {
        flow, stage, name: detail?.name, code: detail?.code,
        provider_status: detail?.$metadata?.httpStatusCode,
        provider_request_id: detail?.$metadata?.requestId,
        // Exclude the exception message: SDK and SQL errors may contain private
        // object keys, query values or configuration. Keep call sites for diagnosis.
        stack: detail?.stack?.split('\n').filter((line) => /^\s+at /.test(line)).join('\n')
    });
}

export function submissionFailure(res: Response, error: unknown, flow: 'bill' | 'design') {
    if (error instanceof SubmissionError) {
        if (error.statusCode >= 500) logSubmissionError(flow, 'storage', error);
        return res.status(error.statusCode).json({ success: false, message: error.message, error_code: error.errorCode, data: null });
    }
    logSubmissionError(flow, 'request', error);
    const code = (error as { code?: string })?.code;
    const transient = ['ER_LOCK_DEADLOCK', 'ER_LOCK_WAIT_TIMEOUT', 'ECONNREFUSED', 'ECONNRESET', 'ETIMEDOUT', 'PROTOCOL_CONNECTION_LOST'].includes(code || '');
    return res.status(transient ? 503 : 500).json({ success: false,
        message: `We could not complete your ${flow} request. Please try again.`, error_code: 'SUBMISSION_FAILED', data: null });
}
