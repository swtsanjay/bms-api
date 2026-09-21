import crypto from 'node:crypto';
import sharp from 'sharp';
import config from '../../../config';
import S3Service, { type UploadedObject } from '../../../lib/S3Service';
import { CommerceAdminError } from './service';

const MAX_IMAGE_BYTES = 25 * 1024 * 1024;
const MAX_IMAGE_PIXELS = 50_000_000;
const imageFormats = {
    jpeg: { extension: 'jpg', mimeType: 'image/jpeg' },
    png: { extension: 'png', mimeType: 'image/png' },
    webp: { extension: 'webp', mimeType: 'image/webp' },
    avif: { extension: 'avif', mimeType: 'image/avif' },
    tiff: { extension: 'tiff', mimeType: 'image/tiff' },
    heif: { extension: 'heif', mimeType: 'image/heif' }
} as const;

export async function prepareProductImage(buffer: Buffer) {
    if (!buffer.length || buffer.length > MAX_IMAGE_BYTES) {
        throw new CommerceAdminError('Product image must be between 1 byte and 25 MB', 422);
    }

    let metadata: sharp.Metadata;
    try {
        metadata = await sharp(buffer, { failOn: 'error', limitInputPixels: MAX_IMAGE_PIXELS, animated: true }).metadata();
    } catch {
        throw new CommerceAdminError('Invalid image or image exceeds 50 million pixels', 422);
    }

    const format = metadata.format as keyof typeof imageFormats | undefined;
    if (!format || !Object.hasOwn(imageFormats, format)) {
        throw new CommerceAdminError('Unsupported product image format', 422);
    }
    if ((metadata.pages || 1) > 1) {
        throw new CommerceAdminError('Animated or multi-page images are not supported', 422);
    }

    let candidate: { data: Buffer; info: sharp.OutputInfo };
    try {
        candidate = await sharp(buffer, { failOn: 'error', limitInputPixels: MAX_IMAGE_PIXELS })
            .rotate()
            .resize({
                width: 1600,
                height: 2000,
                fit: 'inside',
                withoutEnlargement: true,
                kernel: sharp.kernel.lanczos3
            })
            .webp({ quality: 80, alphaQuality: 85, effort: 4, smartSubsample: true })
            .toBuffer({ resolveWithObject: true });
    } catch {
        throw new CommerceAdminError('Product image could not be processed', 422);
    }

    return {
        original: buffer,
        originalFormat: imageFormats[format],
        originalWidth: metadata.width || null,
        originalHeight: metadata.height || null,
        originalChecksum: crypto.createHash('sha256').update(buffer).digest('hex'),
        optimized: candidate.data.length < buffer.length * 0.95 ? candidate : null
    };
}

export default class CommerceProductMediaUploadService {
    static async upload(file: Express.Multer.File) {
        if (!config.aws.s3BucketName) throw new CommerceAdminError('Product image storage is not configured', 503);
        const image = await prepareProductImage(file.buffer);
        const publicId = crypto.randomUUID();
        const uploaded: UploadedObject[] = [];

        try {
            const original = await S3Service.uploadBuffer(
                image.original,
                `commerce/products/${publicId}/original-${image.originalChecksum.slice(0, 16)}.${image.originalFormat.extension}`,
                image.originalFormat.mimeType
            );
            uploaded.push(original);

            const optimizedChecksum = image.optimized
                ? crypto.createHash('sha256').update(image.optimized.data).digest('hex')
                : null;
            const current = image.optimized && optimizedChecksum
                ? await S3Service.uploadBuffer(
                    image.optimized.data,
                    `commerce/products/${publicId}/optimized-${optimizedChecksum.slice(0, 16)}.webp`,
                    'image/webp'
                )
                : original;
            if (current !== original) uploaded.push(current);

            const now = new Date();
            await knexInstance('vsq_media_assets').insert({
                public_id: publicId,
                kind: 'IMAGE',
                status: 'READY',
                bucket: config.aws.s3BucketName,
                object_key: current.key,
                object_version_id: current.versionId || null,
                public_url: current.url,
                original_url: original.url,
                original_byte_size: image.original.length,
                mime_type: image.optimized ? 'image/webp' : image.originalFormat.mimeType,
                byte_size: image.optimized ? image.optimized.data.length : image.original.length,
                width: image.optimized ? image.optimized.info.width : image.originalWidth,
                height: image.optimized ? image.optimized.info.height : image.originalHeight,
                checksum_sha256: optimizedChecksum || image.originalChecksum,
                optimization_status: 'OPTIMIZED',
                optimized_at: now,
                optimization_error: null,
                created_at: now,
                updated_at: now
            });

            return {
                public_id: publicId,
                url: current.url,
                original_url: original.url,
                byte_size: image.optimized ? image.optimized.data.length : image.original.length,
                original_byte_size: image.original.length,
                mime_type: image.optimized ? 'image/webp' : image.originalFormat.mimeType,
                optimized: Boolean(image.optimized)
            };
        } catch (error) {
            for (const object of uploaded.reverse()) {
                try { await S3Service.deleteUploadedObject(object); }
                catch (cleanupError) { console.error('Could not clean up product media upload', cleanupError); }
            }
            console.error('Commerce product image upload failed', error);
            throw error instanceof CommerceAdminError
                ? error
                : new CommerceAdminError('Product image could not be saved', 502);
        }
    }
}
