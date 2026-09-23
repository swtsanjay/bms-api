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
  aws: {
    region: process.env.AWS_REGION || 'us-east-1',
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    s3BucketName: process.env.AWS_S3_BUCKET_NAME,
    s3ReviewStagingBucketName: process.env.AWS_S3_REVIEW_STAGING_BUCKET_NAME || process.env.AWS_S3_BUCKET_NAME,
    s3UploadDirName: process.env.AWS_S3_UPLOAD_DIR_NAME || ''
  },
  razorpay: {
    enabled: String(process.env.RAZORPAY_ENABLED || '').toLowerCase() === 'true',
    keyId: String(process.env.RAZORPAY_KEY_ID || '').trim(),
    keySecret: String(process.env.RAZORPAY_KEY_SECRET || '').trim(),
    webhookSecret: String(process.env.RAZORPAY_WEBHOOK_SECRET || '').trim(),
    reservationTtlMinutes: Math.min(
      Math.max(Number(process.env.RAZORPAY_RESERVATION_TTL_MINUTES) || 30, 10),
      180
    )
  },
  mailgun: {
    enabled: String(process.env.MAILGUN_ENABLED || '').toLowerCase() === 'true',
    apiKey: String(process.env.MAILGUN_API_KEY || '').trim(),
    domain: String(process.env.MAILGUN_DOMAIN || '').trim(),
    fromEmail: String(process.env.MAILGUN_FROM_EMAIL || '').trim(),
    fromName: String(process.env.MAILGUN_FROM_NAME || 'Vastriqo').trim(),
    apiBaseUrl: String(process.env.MAILGUN_API_BASE_URL || 'https://api.mailgun.net').replace(/\/+$/, ''),
    storefrontUrl: String(process.env.VASTRIQO_STOREFRONT_URL || 'http://localhost:3000').replace(/\/+$/, ''),
    supportEmail: String(process.env.VASTRIQO_SUPPORT_EMAIL || '').trim()
  },
};

if (config.razorpay.enabled) {
  const missing = [
    ['RAZORPAY_KEY_ID', config.razorpay.keyId],
    ['RAZORPAY_KEY_SECRET', config.razorpay.keySecret],
    ['RAZORPAY_WEBHOOK_SECRET', config.razorpay.webhookSecret]
  ].filter(([, value]) => !value).map(([name]) => name);
  if (missing.length) {
    throw new Error(`Razorpay is enabled but required configuration is missing: ${missing.join(', ')}`);
  }
}

if (config.mailgun.enabled) {
  const missing = [
    ['MAILGUN_API_KEY', config.mailgun.apiKey],
    ['MAILGUN_DOMAIN', config.mailgun.domain],
    ['MAILGUN_FROM_EMAIL', config.mailgun.fromEmail]
  ].filter(([, value]) => !value).map(([name]) => name);
  if (missing.length) {
    throw new Error(`Mailgun is enabled but required configuration is missing: ${missing.join(', ')}`);
  }
}

export default config;
