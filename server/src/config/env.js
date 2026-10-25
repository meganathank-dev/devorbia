import dotenv from 'dotenv';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { z } from 'zod';
export const root = fileURLToPath(new URL('../../..', import.meta.url));
dotenv.config({
  path: path.join(root, '.env'),
  quiet: true
});
const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  HOST: z.string().default('127.0.0.1'),
  PORT: z.coerce.number().int().min(1).max(65535).default(4000),
  CLIENT_URL: z.string().url().default('http://localhost:5173'),
  MONGODB_URI: z.string().min(1),
  APP_SECRET: z.string().min(48),
  TRUST_PROXY: z.coerce.number().int().min(0).max(5).default(0),
  MAIL_TRANSPORT: z.enum(['file', 'smtp']).default('file'),
  SMTP_HOST: z.string().default(''),
  SMTP_PORT: z.coerce.number().int().default(587),
  SMTP_SECURE: z.enum(['true', 'false']).default('false'),
  SMTP_USER: z.string().default(''),
  SMTP_PASSWORD: z.string().default(''),
  MAIL_FROM: z.string().default('DevOrbia <no-reply@example.test>'),
  AI_PROVIDER: z.literal('rules').default('rules'),
  JOBS_ENABLED: z.enum(['true', 'false']).default('true'),
  ANALYSIS_TASK_LIMIT: z.coerce.number().int().min(100).max(10000).default(3000)
});
const parsed = schema.safeParse(process.env);
if (!parsed.success) throw new Error('Invalid configuration. Run npm run setup and check .env keys: ' + parsed.error.issues.map(x => x.path.join('.')).join(', '));
export const env = parsed.data;
if (env.NODE_ENV === 'production' && (!env.CLIENT_URL.startsWith('https://') || env.MAIL_TRANSPORT !== 'smtp')) throw new Error('Production requires HTTPS CLIENT_URL and SMTP delivery.');
if (env.MAIL_TRANSPORT === 'smtp' && !env.SMTP_HOST) throw new Error('SMTP_HOST is required for SMTP delivery.');
