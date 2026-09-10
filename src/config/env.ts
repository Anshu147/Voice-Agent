import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(5000),
  HOST: z.string().default('0.0.0.0'),
  MONGODB_URI: z.string().default('mongodb://localhost:27017/voice_agent'),
  ENABLE_WEBHOOK_AUTH: z
    .string()
    .default('true')
    .transform((val) => val === 'true' || val === '1'),
  VOICE_WEBHOOK_SECRET: z.string().default('change-me-to-a-secure-secret'),
  ALLOWED_ORIGINS: z
    .string()
    .default('*')
    .transform((val) => (val === '*' ? ['*'] : val.split(',').map((s) => s.trim()))),
  MAX_REQUEST_SIZE: z.string().default('1mb'),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().default(60000),
  RATE_LIMIT_MAX_REQUESTS: z.coerce.number().default(100),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info')
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  // eslint-disable-next-line no-console
  console.error('Invalid environment variables configuration:', parsed.error.format());
  process.exit(1);
}

export const config = parsed.data;
export type Config = z.infer<typeof envSchema>;
