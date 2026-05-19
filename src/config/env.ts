import { z } from 'zod';

export const envSchema = z.object({
  // App
  NODE_ENV: z
    .enum(['development', 'staging', 'production'])
    .default('development'),
  PORT: z.coerce.number().default(3001),
  FRONTEND_BASE_URL: z.string().url(),
  LOG_LEVEL: z
    .enum(['debug', 'info', 'warn', 'error', 'fatal'])
    .default('info'),

  // Database
  DATABASE_URL: z.string().url(),
  // Set to 'false' to disable startup migrations (e.g. when running
  // them as a separate Railway release step). Default: enabled.
  AUTO_MIGRATE: z.string().default('true'),

  // CORS
  CORS_ALLOWED_ORIGINS: z.string().default('http://localhost:3000'),

  // Optional services
  POSTHOG_API_KEY: z.string().optional(),
  POSTHOG_HOST: z.string().url().optional(),
  SENTRY_DSN: z.string().optional(),
  SENTRY_ENV: z.string().optional(),

  // Storage (S3-compatible: R2 in prod, MinIO locally)
  OBJECT_STORAGE_ENDPOINT: z.string().optional(),
  OBJECT_STORAGE_BUCKET: z.string().optional(),
  OBJECT_STORAGE_ACCESS_KEY: z.string().optional(),
  OBJECT_STORAGE_SECRET_KEY: z.string().optional(),
  OBJECT_STORAGE_PUBLIC_DOMAIN: z.string().optional(),

  // Shared secret used by peja-web admin upload proxy to authenticate
  // internal calls to /v1/internal/uploads/*. Required for image upload.
  INTERNAL_UPLOAD_TOKEN: z.string().min(16).optional(),

  // Transcription (OpenAI Whisper)
  OPENAI_API_KEY: z.string().optional(),

  // Payments (Stripe)
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  STRIPE_PRICE_ID_ESSENTIALS: z.string().optional(),
  STRIPE_PRICE_ID_PREMIUM: z.string().optional(),
  STRIPE_PRICE_ID_BUNDLE: z.string().optional(),

  // Email (Resend)
  RESEND_API_KEY: z.string().optional(),
  EMAIL_FROM: z.string().optional(),

  // Anti-spam — rate limits (Redis sliding window) on public guest endpoints
  RATE_LIMIT_MESSAGES_PER_IP: z.coerce.number().int().positive().default(30),
  RATE_LIMIT_UPLOAD_URL_PER_IP: z.coerce.number().int().positive().default(20),
  RATE_LIMIT_INVITATIONS_PER_IP: z.coerce.number().int().positive().default(60),
  RATE_LIMIT_MESSAGES_PER_SLUG: z.coerce.number().int().positive().default(100),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(600_000),
  RATE_LIMIT_PER_SLUG_WINDOW_MS: z.coerce
    .number()
    .int()
    .positive()
    .default(3_600_000),

  // Anti-spam — dwell time bounds for guest submission form
  DWELL_TIME_MIN_MS: z.coerce.number().int().nonnegative().default(3000),
  DWELL_TIME_MAX_MS: z.coerce.number().int().positive().default(86_400_000),
});

export type Env = z.infer<typeof envSchema>;

let _env: Env | null = null;

export function validateEnv(): Env {
  if (_env) return _env;

  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    const formatted = result.error.issues
      .map((i) => `  ${i.path.join('.')}: ${i.message}`)
      .join('\n');
    throw new Error(`Environment validation failed:\n${formatted}`);
  }

  _env = result.data;
  return _env;
}

export function getEnv(): Env {
  if (!_env)
    throw new Error('Environment not validated yet. Call validateEnv() first.');
  return _env;
}
