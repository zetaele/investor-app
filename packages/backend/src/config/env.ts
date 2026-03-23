import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
  PORT: z.coerce.number().int().positive().default(3001),
  DATABASE_URL: z.string().min(1),
  BYMA_API_BASE_URL: z.string().url(),
  BYMA_API_KEY: z.string().min(1),
  CORS_ORIGIN: z.string().url(),
  CACHE_TTL_PRICE_SECONDS: z.coerce.number().int().positive().default(300),
  CACHE_TTL_FX_SECONDS: z.coerce.number().int().positive().default(600),
  ADMIN_TOKEN: z.string().min(8),
});

/**
 * Validated and typed environment variables.
 * Throws at startup if any required variable is missing or malformed.
 */
export const env = envSchema.parse(process.env);
