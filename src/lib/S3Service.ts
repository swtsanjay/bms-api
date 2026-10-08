import crypto from 'node:crypto';
import { CopyObjectCommand, DeleteObjectCommand, GetObjectCommand, HeadObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { createPresignedPost } from '@aws-sdk/s3-presigned-post';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import config from '../config';

export type UploadedObject = {
    url: string;
    key: string;
    versionId?: string;
};

class S3Service {
    private s3Client: S3Client;
    private bucketName: string;
    private reviewStagingBucketName: string;
    private uploadDir: string;

    constructor() {
        if (!config.aws.accessKeyId || !config.aws.secretAccessKey) {
            throw new Error('AWS credentials are not configured');
        }
        this.s3Client = new S3Client({
            region: config.aws.region,
            credentials: {
                accessKeyId: config.aws.accessKeyId,
                secretAccessKey: config.aws.secretAccessKey,
            },
        });
        this.bucketName = config.aws.s3BucketName || '';
        this.reviewStagingBucketName = config.aws.s3ReviewStagingBucketName || '';
        this.uploadDir = config.aws.s3UploadDirName;
    }

    private objectKey(fileName: string) {
        return [this.uploadDir, fileName]
            .map((part) => part.replace(/^\/+|\/+$/g, ''))
            .filter(Boolean)
            .join('/');
    }

    async uploadBuffer(
        buffer: Buffer,
        fileName: string,
        contentType: string,
        cacheControl = 'public, max-age=31536000, immutable'
    ): Promise<UploadedObject> {
        const key = this.objectKey(fileName);
        const checksum = crypto.createHash('sha256').update(buffer).digest('base64');
        const command = new PutObjectCommand({
            Bucket: this.bucketName,
            Key: key,
            Body: buffer,
            ContentType: contentType,
            CacheControl: cacheControl,
            ChecksumSHA256: checksum
        });

        const result = await this.s3Client.send(command);
        return {
            url: `https://${this.bucketName}.s3.${config.aws.region}.amazonaws.com/${key}`,
            key,
            versionId: result.VersionId
        };
    }

    async uploadPrivateDesign(buffer: Buffer, fileName: string, contentType: string): Promise<{ key: string; versionId?: string }> {
        if (!config.aws.s3PrivateDesignBucketName || config.aws.s3PrivateDesignBucketName === config.aws.s3BucketName) throw new Error('Private design storage is not configured');
        const key = this.objectKey(fileName);
        const result = await this.s3Client.send(new PutObjectCommand({
            Bucket: config.aws.s3PrivateDesignBucketName,
            Key: key,
            Body: buffer,
            ContentType: contentType,
            CacheControl: 'private, no-store',
            ChecksumSHA256: crypto.createHash('sha256').update(buffer).digest('base64')
        }));
        return { key, versionId: result.VersionId };
    }

    async privateDesignReviewUrl(key: string, filename: string, inline = false, contentType?: string): Promise<string> {
        if (!config.aws.s3PrivateDesignBucketName) throw new Error('Private design storage is not configured');
        return getSignedUrl(this.s3Client, new GetObjectCommand({
            Bucket: config.aws.s3PrivateDesignBucketName,
            Key: key,
            ResponseContentDisposition: `${inline ? 'inline' : 'attachment'}; filename="${filename.replace(/[^A-Za-z0-9._-]/g, '_')}"`,
            ResponseContentType: contentType
        }), { expiresIn: 300 });
    }

    async readPrivateDesign(key: string): Promise<Buffer> {
        if (!config.aws.s3PrivateDesignBucketName) throw new Error('Private design storage is not configured');
        const response = await this.s3Client.send(new GetObjectCommand({ Bucket: config.aws.s3PrivateDesignBucketName, Key: key }));
        if (!response.Body) throw new Error('Private design has no body');
        return Buffer.from(await response.Body.transformToByteArray());
    }

    async deletePrivateDesign(key: string, versionId?: string): Promise<void> {
        if (!config.aws.s3PrivateDesignBucketName) return;
        await this.s3Client.send(new DeleteObjectCommand({ Bucket: config.aws.s3PrivateDesignBucketName, Key: key, VersionId: versionId }));
    }

    async deleteUploadedObject(object: UploadedObject): Promise<void> {
        await this.s3Client.send(new DeleteObjectCommand({
            Bucket: this.bucketName,
            Key: object.key,
            VersionId: object.versionId
        }));
    }

    async presignReviewPost(fileName: string, contentType: string, byteSize: number) {
        const key = this.objectKey(fileName);
        const post = await createPresignedPost(this.s3Client, {
            Bucket: this.reviewStagingBucketName,
            Key: key,
            Fields: { 'Content-Type': contentType, 'Cache-Control': 'private, no-store' },
            Conditions: [['content-length-range', byteSize, byteSize]],
            Expires: 600
        });
        return { key, ...post };
    }

    async headObject(key: string) {
        return this.s3Client.send(new HeadObjectCommand({ Bucket: this.reviewStagingBucketName, Key: key }));
    }

    async readObject(key: string, etag: string, range?: string): Promise<Buffer> {
        const response = await this.s3Client.send(new GetObjectCommand({
            Bucket: this.reviewStagingBucketName, Key: key, IfMatch: etag, Range: range
        }));
        if (!response.Body) throw new Error('S3 object has no body');
        return Buffer.from(await response.Body.transformToByteArray());
    }

    async copyObject(sourceKey: string, fileName: string, contentType: string, etag: string): Promise<UploadedObject> {
        const key = this.objectKey(fileName);
        const source = `${this.reviewStagingBucketName}/${sourceKey.split('/').map(encodeURIComponent).join('/')}`;
        const result = await this.s3Client.send(new CopyObjectCommand({
            Bucket: this.bucketName,
            Key: key,
            CopySource: source,
            CopySourceIfMatch: etag,
            MetadataDirective: 'REPLACE',
            ContentType: contentType,
            CacheControl: 'public, max-age=31536000, immutable'
        }));
        return {
            url: `https://${this.bucketName}.s3.${config.aws.region}.amazonaws.com/${key}`,
            key,
            versionId: result.VersionId
        };
    }

    async deleteObject(key: string) {
        await this.s3Client.send(new DeleteObjectCommand({ Bucket: this.reviewStagingBucketName, Key: key }));
    }

    async deletePublicObject(key: string) {
        await this.s3Client.send(new DeleteObjectCommand({ Bucket: this.bucketName, Key: key }));
    }

    async uploadFile(file: Express.Multer.File, fileName: string): Promise<string> {
        const key = this.objectKey(fileName);
        await this.s3Client.send(new PutObjectCommand({
            Bucket: this.bucketName,
            Key: key,
            Body: file.buffer,
            ContentType: file.mimetype
        }));
        return `https://${this.bucketName}.s3.${config.aws.region}.amazonaws.com/${key}`;
    }
}

export default new S3Service();
