import { z } from "zod";

export const instrumentTypeSchema = z.enum(["BOND", "LETTER", "ON"]);
export const currencySchema = z.enum(["ARS", "USD", "USD_LINKED"]);
export const instrumentSubtypeSchema = z.enum([
  "BONCAP", "DUAL", "SOV_USD_ARG", "SOV_USD_EXT",
  "TASA_FIJA_ARS", "TASA_CER", "TASA_FLOTANTE",
  "SUBSOBERANO_DL", "SUBSOBERANO_FIJA_USD", "SUBSOBERANO_FLOTANTE",
  "LECAP", "LECER", "TAMAR", "LELINK",
  "ON_LEY_NAC", "ON_LEY_EXT", "ON_UVA", "ON_TAMAR", "ON_DL",
]);

export const instrumentSchema = z.object({
  id: z.number().int().positive(),
  ticker: z.string().min(2).max(10),
  name: z.string().min(1),
  type: instrumentTypeSchema,
  subtype: instrumentSubtypeSchema,
  currency: currencySchema,
  market: z.string(),
  issuer: z.string().nullable(),
  maturityDate: z
    .string()
    .datetime({ offset: true })
    .or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)),
  isActive: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

/** Validates ticker strings from URL params. Allows only uppercase alphanumeric. */
export const tickerParamSchema = z.object({
  ticker: z.string().regex(/^[A-Z0-9]{2,10}$/, "Invalid ticker format"),
});

/** Query params for the analysis endpoint. */
export const analysisQuerySchema = z.object({
  displayCurrency: currencySchema.optional(),
});

/**
 * Query params for the simulate endpoint.
 * Exactly one of `price` or `ytm` must be provided.
 */
export const simulateQuerySchema = z
  .object({
    price: z.coerce.number().positive().optional(),
    ytm: z.coerce.number().min(-0.999).max(100).optional(),
    displayCurrency: currencySchema.optional(),
    quantity: z.coerce.number().positive().optional(),
    settlementDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  })
  .refine((d) => (d.price !== undefined) !== (d.ytm !== undefined), {
    message: "Provide exactly one of: price or ytm",
  });

/** Query params for the compare endpoint. */
export const compareQuerySchema = z.object({
  tickers: z
    .string()
    .transform((val) => val.split(","))
    .pipe(
      z
        .array(z.string().regex(/^[A-Z0-9]{2,10}$/))
        .min(2, "At least 2 tickers required")
        .max(30, "Maximum 30 tickers allowed"),
    ),
  displayCurrency: currencySchema.optional(),
});
