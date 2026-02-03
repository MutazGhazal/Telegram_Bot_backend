import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

const splitOrigins = (value) => {
  if (!value) return ['*'];
  if (value === '*') return ['*'];
  return value.split(',').map((origin) => origin.trim()).filter(Boolean);
};

const defaultFilesRoot = path.resolve('D:\\NPAI');

const config = {
  supabase: {
    url: process.env.SUPABASE_URL,
    key: process.env.SUPABASE_KEY,
    serviceKey: process.env.SUPABASE_SERVICE_KEY
  },
  openrouter: {
    apiKey: process.env.OPENROUTER_API_KEY,
    model: process.env.OPENROUTER_MODEL || 'openai/gpt-4o-mini',
    siteUrl: process.env.OPENROUTER_SITE_URL || '',
    appName: process.env.OPENROUTER_APP_NAME || 'NP AI Bot'
  },
  encryption: {
    key: process.env.ENCRYPTION_KEY
  },
  server: {
    port: process.env.PORT || 3000,
    env: process.env.NODE_ENV || 'production',
    allowedOrigins: splitOrigins(process.env.ALLOWED_ORIGINS)
  },
  limits: {
    rateLimitPerMinute: parseInt(process.env.RATE_LIMIT, 10) || 60,
    maxFileSizeBytes: parseInt(process.env.MAX_FILE_SIZE, 10) || 10 * 1024 * 1024
  },
  files: {
    root: process.env.FILES_ROOT || defaultFilesRoot
  }
};

export default config;
export { config };
