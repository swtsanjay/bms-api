import sharp from 'sharp';
import { ReviewError } from './policy';

export const MAX_REVIEW_IMAGE_BYTES = 3 * 1024 * 1024;
export const MAX_REVIEW_VIDEO_BYTES = 100 * 1024 * 1024;
export const MAX_REVIEW_THUMBNAIL_BYTES = 1 * 1024 * 1024;

export type ReviewMediaKind = 'IMAGE' | 'VIDEO';
export type ReviewUploadRow = {
    id: number;
    public_id: string;
    product_id: number;
    customer_id: number;
    kind: ReviewMediaKind;
    object_key: string;
    mime_type: string;
    expected_byte_size: number;
    expires_at: Date | string;
    consumed_at: Date | string | null;
};

const imageTypes = ['image/jpeg', 'image/png', 'image/webp'];
const videoTypes = ['video/mp4', 'video/quicktime', 'video/webm'];
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function reviewUploadRequest(input: { kind?: unknown; mime_type?: unknown; byte_size?: unknown }) {
    const kind = input.kind;
    const mimeType = input.mime_type;
    const byteSize = input.byte_size;
    if (kind !== 'IMAGE' && kind !== 'VIDEO') throw new ReviewError('Attachment type is invalid', 400);
    if (typeof mimeType !== 'string' || !(kind === 'IMAGE' ? imageTypes : videoTypes).includes(mimeType)) {
        throw new ReviewError('Use JPG, PNG, WebP, MP4, MOV or WebM files', 400);
    }
    const max = kind === 'IMAGE' ? MAX_REVIEW_IMAGE_BYTES : MAX_REVIEW_VIDEO_BYTES;
    if (typeof byteSize !== 'number' || !Number.isInteger(byteSize) || byteSize < 1 || byteSize > max) {
        throw new ReviewError(`Each ${kind === 'IMAGE' ? 'image must be 3 MB' : 'video must be 100 MB'} or smaller`, 413);
    }
    return { kind, mimeType, byteSize };
}

export function reviewUploadIds(value: unknown): string[] {
    if (value === undefined) return [];
    if (!Array.isArray(value) || value.length > 4 || value.some((item) => typeof item !== 'string' || !uuid.test(item)) || new Set(value).size !== value.length) {
        throw new ReviewError('Review attachments are invalid', 400);
    }
    return value;
}

export function videoMimeFromHeader(header: Buffer): string | null {
    if (header.subarray(0, 4).equals(Buffer.from([0x1a, 0x45, 0xdf, 0xa3]))) return 'video/webm';
    if (header.toString('ascii', 4, 8) !== 'ftyp') return null;
    const brand = header.toString('ascii', 8, 12);
    if (brand === 'qt  ') return 'video/quicktime';
    if (/^(isom|iso2|mp41|mp42|avc1|M4V |MSNV)$/.test(brand)) return 'video/mp4';
    return null;
}

export async function normalizeReviewImage(buffer: Buffer, mimeType: string): Promise<Buffer> {
    if (!buffer.length || buffer.length > MAX_REVIEW_IMAGE_BYTES) throw new ReviewError('Each image must be 3 MB or smaller', 413);
    try {
        const image = sharp(buffer, { failOn: 'error', limitInputPixels: 25_000_000 });
        const metadata = await image.metadata();
        const actualType = metadata.format === 'jpeg' ? 'image/jpeg' : metadata.format === 'png' ? 'image/png' : metadata.format === 'webp' ? 'image/webp' : null;
        if (actualType !== mimeType || (metadata.pages || 1) > 1) throw new Error('Unsupported image');
        return await image.rotate().resize({ width: 1600, height: 2000, fit: 'inside', withoutEnlargement: true }).webp({ quality: 80 }).toBuffer();
    } catch {
        throw new ReviewError('Use a valid JPG, PNG or WebP image (no animation)', 422);
    }
}

export function reviewThumbnailRequest(input: { mime_type?: unknown; byte_size?: unknown }) {
    if (typeof input.mime_type !== 'string' || !imageTypes.includes(input.mime_type)) {
        throw new ReviewError('Use a JPG, PNG or WebP thumbnail', 400);
    }
    if (typeof input.byte_size !== 'number' || !Number.isInteger(input.byte_size) || input.byte_size < 1 || input.byte_size > MAX_REVIEW_THUMBNAIL_BYTES) {
        throw new ReviewError('Thumbnail must be 1 MB or smaller', 413);
    }
    return { mimeType: input.mime_type, byteSize: input.byte_size };
}

export async function normalizeReviewThumbnail(buffer: Buffer, mimeType: string): Promise<Buffer> {
    if (!buffer.length || buffer.length > MAX_REVIEW_THUMBNAIL_BYTES) throw new ReviewError('Thumbnail must be 1 MB or smaller', 413);
    try {
        const image = sharp(buffer, { failOn: 'error', limitInputPixels: 8_000_000 });
        const metadata = await image.metadata();
        const actualType = metadata.format === 'jpeg' ? 'image/jpeg' : metadata.format === 'png' ? 'image/png' : metadata.format === 'webp' ? 'image/webp' : null;
        if (actualType !== mimeType || (metadata.pages || 1) > 1) throw new Error('Unsupported thumbnail');
        return await image.rotate().resize({ width: 960, height: 960, fit: 'inside', withoutEnlargement: true }).webp({ quality: 78 }).toBuffer();
    } catch {
        throw new ReviewError('Use a valid JPG, PNG or WebP thumbnail (no animation)', 422);
    }
}
