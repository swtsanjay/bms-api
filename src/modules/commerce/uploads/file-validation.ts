import sharp from 'sharp';
import { SubmissionError } from './errors';

const allowed = new Set(['image/jpeg', 'image/png', 'image/webp', 'application/pdf']);

export async function checkPrivateSubmission(file: Express.Multer.File) {
    if (!file?.buffer?.length) throw new SubmissionError('This file is empty. Choose a non-empty JPG, PNG, WebP or PDF file.', 422);
    if (file.buffer.length > 15 * 1024 * 1024) throw new SubmissionError('Choose a file no larger than 15 MB.', 413);
    if (!allowed.has(file.mimetype)) throw new SubmissionError('Use a JPG, PNG, WebP or PDF file. Other file types are not supported.', 422);
    if (file.mimetype === 'application/pdf') {
        const body = file.buffer.toString('latin1');
        if (!body.startsWith('%PDF-') || !body.slice(-2048).includes('%%EOF') || /\/(JavaScript|JS|OpenAction|AA|Launch|EmbeddedFile)\b/i.test(body)) {
            throw new SubmissionError('This PDF is damaged or contains scripts or attachments. Export a standard PDF or upload an image instead.', 422);
        }
    } else {
        try {
            const meta = await sharp(file.buffer, { failOn: 'error', limitInputPixels: 50_000_000 }).metadata();
            const actual = meta.format === 'jpeg' ? 'image/jpeg' : meta.format === 'png' ? 'image/png' : meta.format === 'webp' ? 'image/webp' : null;
            if (actual !== file.mimetype || (meta.pages || 1) !== 1) throw new Error('Invalid image');
        } catch { throw new SubmissionError('This image is damaged, animated, or does not match its file type. Export a new JPG, PNG or WebP image.', 422); }
    }
    return file.mimetype;
}

