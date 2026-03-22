import { z } from 'zod'

export const instrumentTypeSchema = z.enum(['BOND', 'LETTER', 'ON'])
export const currencySchema = z.enum(['ARS', 'USD', 'USD_LINKED'])

export const instrumentSchema = z.object({
  id: z.number().int().positive(),
  ticker: z.string().min(2).max(10),
  name: z.string().min(1),
  type: instrumentTypeSchema,
  currency: currencySchema,
  market: z.string(),
  issuer: z.string().nullable(),
  maturityDate: z.string().datetime({ offset: true }).or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)),
  isActive: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
})

/** Validates ticker strings from URL params. Allows only uppercase alphanumeric. */
export const tickerParamSchema = z.object({
  ticker: z.string().regex(/^[A-Z0-9]{2,10}$/, 'Invalid ticker format'),
})

/** Query params for the analysis endpoint. */
export const analysisQuerySchema = z.object({
  displayCurrency: currencySchema.optional().default('USD'),
})

/** Query params for the compare endpoint. */
export const compareQuerySchema = z.object({
  tickers: z
    .string()
    .transform((val) => val.split(','))
    .pipe(
      z
        .array(z.string().regex(/^[A-Z0-9]{2,10}$/))
        .min(2, 'At least 2 tickers required')
        .max(5, 'Maximum 5 tickers allowed'),
    ),
  displayCurrency: currencySchema.optional().default('USD'),
})
