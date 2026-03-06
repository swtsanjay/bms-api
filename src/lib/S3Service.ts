import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import config from '../config';

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

    async uploadFile(file: Express.Multer.File, fileName: string): Promise<string> {
        const key = `${this.uploadDir}/${fileName}`;
        
        const command = new PutObjectCommand({
            Bucket: this.bucketName,
            Key: key,
            Body: file.buffer,
            ContentType: file.mimetype,
        });

        await this.s3Client.send(command);
        return `https://${this.bucketName}.s3.${config.aws.region}.amazonaws.com/${key}`;
    }
}

export default new S3Service();