import { integer, real, sqliteTable, text } from "drizzle-orm/sqlite-core";

/** Tradeable instruments: sovereign bonds, treasury letters, and corporate bonds (ONs). */
export const instruments = sqliteTable("instruments", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  ticker: text("ticker").notNull().unique(),
  name: text("name").notNull(),
  type: text("type", { enum: ["BOND", "LETTER", "ON"] }).notNull(),
  currency: text("currency", { enum: ["ARS", "USD", "USD_LINKED"] }).notNull(),
  market: text("market").notNull().default("BYMA"),
  issuer: text("issuer"),
  maturityDate: text("maturity_date").notNull(),
  subtype: text("subtype", {
    enum: [
      "BONCAP", "BOPREAL", "DUAL", "SOV_USD_ARG", "SOV_USD_EXT",
      "TASA_FIJA_ARS", "TASA_CER", "TASA_FLOTANTE",
      "SUBSOBERANO_DL", "SUBSOBERANO_FIJA_USD", "SUBSOBERANO_FLOTANTE",
      "LECAP", "LECER", "TAMAR", "LELINK",
      "ON_LEY_NAC", "ON_LEY_EXT", "ON_UVA", "ON_TAMAR", "ON_DL",
    ],
  }).notNull().default("SOV_USD_ARG"),
  flowType: text("flow_type", {
    enum: ["BULLET", "AMORTIZABLE", "ZERO_COUPON", "CAPITALIZABLE", "CER", "USD_LINKED", "TAMAR", "DUAL"],
  })
    .notNull()
    .default("BULLET"),
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
  createdAt: text("created_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
  updatedAt: text("updated_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
});

/** Scheduled cash flows (coupons + amortizations) for each instrument. */
export const cashflows = sqliteTable("cashflows", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  instrumentId: integer("instrument_id")
    .notNull()
    .references(() => instruments.id),
  paymentDate: text("payment_date").notNull(),
  coupon: real("coupon").notNull().default(0),
  amortization: real("amortization").notNull().default(0),
  /** Remaining capital percentage (0–1) after this payment. */
  residual: real("residual").notNull(),
});

/** Short-lived cache for market prices fetched from BYMA. */
export const priceCache = sqliteTable("price_cache", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  ticker: text("ticker").notNull(),
  price: real("price").notNull(),
  currency: text("currency", { enum: ["ARS", "USD"] }).notNull(),
  fetchedAt: text("fetched_at").notNull(),
  expiresAt: text("expires_at").notNull(),
  source: text("source", { enum: ["live", "mock"] }).notNull().default("live"),
});

/** Short-lived cache for ARS/USD exchange rates. */
export const fxCache = sqliteTable("fx_cache", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  pair: text("pair").notNull(),
  buy: real("buy").notNull().default(0),
  sell: real("sell").notNull(),
  fetchedAt: text("fetched_at").notNull(),
  expiresAt: text("expires_at").notNull(),
});

/**
 * Per-instrument configuration parameters used to generate cash flows.
 * The relevant fields depend on the instrument's flowType.
 */
export const instrumentConfig = sqliteTable("instrument_config", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  instrumentId: integer("instrument_id")
    .notNull()
    .references(() => instruments.id),

  // Coupon settings
  couponRate: real("coupon_rate"), // Annual rate (decimal). e.g. 0.085 = 8.5%
  couponFrequency: integer("coupon_frequency"), // Payments per year: 1, 2, 4, 12
  firstCouponDate: text("first_coupon_date"), // ISO 8601 date of first payment

  // Amortization settings (AMORTIZABLE)
  amortizationSchedule: text("amortization_schedule", { mode: "json" }), // JSON array of {date, pct}

  // Capitalization settings (CAPITALIZABLE)
  capitalizationRate: real("capitalization_rate"), // Annual TNA (decimal)

  // Adjustment settings (CER / USD_LINKED)
  adjustmentCoefficient: real("adjustment_coefficient"), // Manual coefficient, updated periodically
  adjustmentBase: real("adjustment_base"), // Base value at issuance

  createdAt: text("created_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
  updatedAt: text("updated_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
});

// ── Phase 2: auth & subscriptions (defined now, unused in Phase 1) ────────────

export const users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  email: text("email").notNull().unique(),
  googleId: text("google_id").unique(),
  name: text("name"),
  avatarUrl: text("avatar_url"),
  passwordHash: text("password_hash"),
  plan: text("plan", { enum: ["TRIAL", "PRO"] })
    .notNull()
    .default("TRIAL"),
  trialExpiresAt: text("trial_expires_at"),
  createdAt: text("created_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
});

export const sessions = sqliteTable("sessions", {
  id: text("id").primaryKey(), // UUID
  userId: integer("user_id")
    .notNull()
    .references(() => users.id),
  expiresAt: text("expires_at").notNull(),
});

/** Investment portfolios — one per user initially, multiple in future. */
export const portfolios = sqliteTable("portfolios", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id),
  name: text("name").notNull(),
  createdAt: text("created_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
  updatedAt: text("updated_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
});

/** Instruments held in a portfolio with quantity and optional purchase price. */
export const portfolioInstruments = sqliteTable("portfolio_instruments", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  portfolioId: integer("portfolio_id")
    .notNull()
    .references(() => portfolios.id),
  /** Instrument ticker (e.g. "AL30D"). Denormalized for query simplicity. */
  ticker: text("ticker").notNull(),
  /** Nominal value held (VN). e.g. 10000 means 10,000 VN. */
  quantity: real("quantity").notNull(),
  /** Clean price at time of purchase (optional). Used for P&L in Phase 3. */
  purchasePrice: real("purchase_price"),
  addedAt: text("added_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
});
