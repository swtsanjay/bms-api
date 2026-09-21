import crypto from 'node:crypto';
import { DeleteObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import config from '../config';

export type UploadedObject = {
    url: string;
    key: string;
    versionId?: string;
};

class S3Service {
    private s3Client: S3Client;
    private bucketName: string;
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

    async deleteUploadedObject(object: UploadedObject): Promise<void> {
        await this.s3Client.send(new DeleteObjectCommand({
            Bucket: this.bucketName,
            Key: object.key,
            VersionId: object.versionId
        }));
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
