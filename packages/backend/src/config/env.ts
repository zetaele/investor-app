import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.coerce.number().int().positive().default(3001),
  DATABASE_URL: z.string().min(1).default("./data/app.db"),
  // Not used with MockBymaClient; required only when switching to live data
  BYMA_API_BASE_URL: z.string().url().optional(),
  BYMA_API_KEY: z.string().min(1).optional(),
  // Comma-separated list of allowed origins, or "*" for all
  CORS_ORIGIN: z.string().min(1).default("*"),
  CACHE_TTL_PRICE_SECONDS: z.coerce.number().int().positive().default(300),
  CACHE_TTL_FX_SECONDS: z.coerce.number().int().positive().default(600),
  ADMIN_TOKEN: z.string().min(8).default("change-me-in-production"),
  GOOGLE_CLIENT_ID: z.string().min(1),
  GOOGLE_CLIENT_SECRET: z.string().min(1),
  GOOGLE_CALLBACK_URL: z.string().url().default("http://localhost:3001/auth/callback"),
  SESSION_SECRET: z.string().min(32).default("change-this-secret-in-production-min32"),
  FRONTEND_URL: z.string().url().default("http://localhost:5173"),
});

/**
 * Validated and typed environment variables.
 * Throws at startup if any required variable is missing or malformed.
 */
export const env = envSchema.parse(process.env);
