import { integer, real, sqliteTable, text } from 'drizzle-orm/sqlite-core'

/** Tradeable instruments: sovereign bonds, treasury letters, and corporate bonds (ONs). */
export const instruments = sqliteTable('instruments', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  ticker: text('ticker').notNull().unique(),
  name: text('name').notNull(),
  type: text('type', { enum: ['BOND', 'LETTER', 'ON'] }).notNull(),
  currency: text('currency', { enum: ['ARS', 'USD', 'USD_LINKED'] }).notNull(),
  market: text('market').notNull().default('BYMA'),
  issuer: text('issuer'),
  maturityDate: text('maturity_date').notNull(),
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: text('updated_at').notNull().$defaultFn(() => new Date().toISOString()),
})

/** Scheduled cash flows (coupons + amortizations) for each instrument. */
export const cashflows = sqliteTable('cashflows', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  instrumentId: integer('instrument_id')
    .notNull()
    .references(() => instruments.id),
  paymentDate: text('payment_date').notNull(),
  coupon: real('coupon').notNull().default(0),
  amortization: real('amortization').notNull().default(0),
  /** Remaining capital percentage (0–1) after this payment. */
  residual: real('residual').notNull(),
})

/** Short-lived cache for market prices fetched from BYMA. */
export const priceCache = sqliteTable('price_cache', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  ticker: text('ticker').notNull(),
  price: real('price').notNull(),
  currency: text('currency', { enum: ['ARS', 'USD'] }).notNull(),
  fetchedAt: text('fetched_at').notNull(),
  expiresAt: text('expires_at').notNull(),
})

/** Short-lived cache for ARS/USD exchange rates. */
export const fxCache = sqliteTable('fx_cache', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  pair: text('pair').notNull(),
  rate: real('rate').notNull(),
  fetchedAt: text('fetched_at').notNull(),
  expiresAt: text('expires_at').notNull(),
})

// ── Phase 2: auth & subscriptions (defined now, unused in Phase 1) ────────────

export const users = sqliteTable('users', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash'),
  plan: text('plan', { enum: ['FREE', 'PRO', 'ADVANCED'] }).notNull().default('FREE'),
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
})

export const sessions = sqliteTable('sessions', {
  id: text('id').primaryKey(), // UUID
  userId: integer('user_id')
    .notNull()
    .references(() => users.id),
  expiresAt: text('expires_at').notNull(),
})
