import './loadEnv';
import path from 'path';
const config = {
  IsLocal: process.env.NODE_ENV === 'local',
  IsProd: process.env.NODE_ENV === 'prod',
  // winston lore:
  logs: {
    level: process.env.LOG_LEVEL || 'info',
  },
  jwt: {
    expDuration: Number(process.env.JWT_TIME) || 3600,
    secretKey: process.env.JWT_SECRET_KEY || 'defaultSecretKey'
  },
  otpLoginExpDuration: 300000, // 5 minutes
  crypto: {
    algorithm: 'aes-256-ctr',
    encryptionKey: Buffer.from('FoCKvdLslUuB2x3EZlKate7XGottHski1LmyqJHvUht=', 'base64'),
    ivLength: 16
  },
  TempFileDir:  path.resolve(process.cwd(), 'public'),
  logDir: process.env.LOG_DIR,
  port: parseInt(process.env.PORT || '3000', 10),
  database: {
    host: process.env.DB_HOSTNAME,
    name: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    dialect: 'mysql2',
    charset: 'utf8mb4',
    collate: 'utf8mb4_unicode_ci',
  },
  awsS3:{
    region: process.env.AWS_S3_REGION || 'ap-south-1',
    accessKey: process.env.AWS_S3_ACCESSKEY,
    secretKey: process.env.AWS_S3_SECRET_KEY,
    bucketName: process.env.AWS_S3_BUCKET_NAME,
    uploadDirName: process.env.AWS_S3_UPLOAD_DIR_NAME || ''
  },
};

export default config;