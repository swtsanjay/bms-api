// src/loadEnv.ts
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';
const NODE_ENV = process.env.NODE_ENV || 'dev';
const envPath = path.resolve(process.cwd(), `.env.${NODE_ENV}`);
const defaultEnvPath = path.resolve(process.cwd(), '.env');

if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
  console.log(`✅ Loaded environment: ${NODE_ENV} from ${envPath}`);
} else if (fs.existsSync(defaultEnvPath)) {
  dotenv.config({ path: defaultEnvPath });
  console.log(`✅ Loaded environment from ${defaultEnvPath}`);
} else {
  // Containers and managed production runtimes normally inject configuration
  // directly, so the absence of an env file is expected and not an error.
  console.log(`ℹ️ No environment file found for ${NODE_ENV}; using process environment variables.`);
}
