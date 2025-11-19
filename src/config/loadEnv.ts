// src/loadEnv.ts
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';
const NODE_ENV = process.env.NODE_ENV || 'dev';
const envPath = path.resolve(process.cwd(), `.env.${NODE_ENV}`);

if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
  console.log(`✅ Loaded environment: ${NODE_ENV} from ${envPath}`);
} else {
  console.warn(`⚠️ .env.${NODE_ENV} not found. Loading default .env file.`);
  dotenv.config(); // loading default .env in this case it is .env.dev
}
