import multer from 'multer';
import type { RequestHandler } from 'express';
import { SubmissionError, submissionFailure } from './errors';

export function privateSubmissionUpload(flow: 'bill' | 'design', fields: number): RequestHandler {
    const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 15 * 1024 * 1024, files: 1, fields } }).single('file');
    return (req, res, next) => upload(req, res, (error: unknown) => {
        if (!error) return next();
        if (error instanceof multer.MulterError) {
            const tooLarge = error.code === 'LIMIT_FILE_SIZE';
            return submissionFailure(res, new SubmissionError(tooLarge ? 'Choose a file no larger than 15 MB.'
                : 'Upload one file using the form. Remove any extra files or fields and try again.', tooLarge ? 413 : 400), flow);
        }
        // Busboy errors are plain Errors. Recognize malformed input without
        // sending its arbitrary exception text to the customer.
        if (error instanceof Error && /^(Multipart:|Unexpected end of (form|file)|Malformed (part header|content type))/.test(error.message)) {
            return submissionFailure(res, new SubmissionError('The upload was interrupted or incomplete. Select your file and try again.', 400), flow);
        }
        return submissionFailure(res, error, flow);
    });
}
