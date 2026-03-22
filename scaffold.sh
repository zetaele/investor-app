#!/bin/bash
set -e

echo "🏗️  Scaffolding investor-app monorepo..."

# ── Root config files ─────────────────────────────────────────────────────────

cat > pnpm-workspace.yaml << 'EOF'
packages:
  - 'packages/*'
EOF

cat > package.json << 'EOF'
{
  "name": "investor-app",
  "private": true,
  "scripts": {
    "dev": "pnpm --parallel -r dev",
    "build": "pnpm -r build",
    "test": "pnpm -r test",
    "lint": "pnpm -r lint"
  },
  "engines": {
    "node": ">=20.0.0",
    "pnpm": ">=9.0.0"
  }
}
EOF

cat > tsconfig.base.json << 'EOF'
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true
  }
}
EOF

cat > .gitignore << 'EOF'
# Dependencies
node_modules/
.pnpm-store/

# Build outputs
dist/
build/

# Environment files
.env
.env.local
.env.*.local

# Database
*.db
*.db-shm
*.db-wal
data/

# Logs
*.log
logs/

# OS
.DS_Store
Thumbs.db

# Editor
.vscode/settings.json
.idea/

# Test coverage
coverage/
EOF

cat > .editorconfig << 'EOF'
root = true

[*]
charset = utf-8
end_of_line = lf
indent_style = space
indent_size = 2
trim_trailing_whitespace = true
insert_final_newline = true

[*.md]
trim_trailing_whitespace = false
EOF

# ── VS Code workspace settings ────────────────────────────────────────────────

mkdir -p .vscode

cat > .vscode/extensions.json << 'EOF'
{
  "recommendations": [
    "Vue.volar",
    "bradlc.vscode-tailwindcss",
    "dbaeumer.vscode-eslint",
    "esbenp.prettier-vscode",
    "usernamehw.errorlens",
    "Drizzle.drizzle-vscode"
  ]
}
EOF

cat > .vscode/settings.json << 'EOF'
{
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": "explicit"
  },
  "typescript.tsdk": "node_modules/typescript/lib",
  "vue.inlayHints.optionProps": true
}
EOF

# ── packages/shared ───────────────────────────────────────────────────────────

mkdir -p packages/shared/src/{types,schemas}

cat > packages/shared/package.json << 'EOF'
{
  "name": "@investor-app/shared",
  "version": "0.0.1",
  "private": true,
  "type": "module",
  "main": "./src/index.ts",
  "exports": {
    ".": "./src/index.ts"
  }
}
EOF

cat > packages/shared/tsconfig.json << 'EOF'
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "outDir": "./dist"
  },
  "include": ["src"]
}
EOF

cat > packages/shared/src/types/instrument.ts << 'EOF'
/** Supported instrument types in the Argentine market. */
export type InstrumentType = 'BOND' | 'LETTER' | 'ON'

/** Currencies in which instruments can be denominated. */
export type Currency = 'ARS' | 'USD' | 'USD_LINKED'

/** Core instrument data — static, not price-sensitive. */
export interface Instrument {
  id: number
  ticker: string
  name: string
  type: InstrumentType
  currency: Currency
  market: string
  issuer: string | null
  maturityDate: string // ISO 8601
  isActive: boolean
  createdAt: string
  updatedAt: string
}

/** A single cash flow event (coupon + amortization on a given date). */
export interface Cashflow {
  id: number
  instrumentId: number
  paymentDate: string // ISO 8601
  coupon: number
  amortization: number
  /** Remaining capital percentage after this payment (0–1). */
  residual: number
}
EOF

cat > packages/shared/src/types/analytics.ts << 'EOF'
import type { Currency } from './instrument.js'

/** Real-time market price for an instrument. */
export interface MarketPrice {
  ticker: string
  price: number
  currency: Currency
  fetchedAt: string
}

/** Results of the financial calculations for a bond/letter/ON. */
export interface BondCalculations {
  /** Yield to Maturity (decimal, e.g. 0.1823 = 18.23%). */
  ytm: number
  /** Modified duration in years. */
  modifiedDuration: number
  /** Clean price (dirty price minus accrued interest). */
  cleanPrice: number
  /** Dirty price (market price including accrued interest). */
  dirtyPrice: number
  /** Accrued interest since last coupon. */
  accruedInterest: number
  /** Price as a fraction of par (e.g. 0.625 = 62.5%). */
  parityPct: number
}

/** Cashflow enriched with its present value. */
export interface CashflowWithPV {
  paymentDate: string
  coupon: number
  amortization: number
  residual: number
  presentValue: number
}

/** Full analysis response for a single instrument. */
export interface InstrumentAnalysis {
  ticker: string
  name: string
  type: string
  currency: Currency
  maturityDate: string
  market: MarketPrice
  calculations: BondCalculations
  cashflows: CashflowWithPV[]
  displayCurrency: Currency
}

/** Entry in a multi-instrument comparison response. */
export interface CompareEntry {
  ticker: string
  name: string
  type: string
  currency: Currency
  maturityDate: string
  price: number
  calculations: BondCalculations
}
EOF

cat > packages/shared/src/types/fx.ts << 'EOF'
/** Foreign exchange rate between two currencies. */
export interface FxRate {
  pair: string // e.g. "ARS/USD"
  rate: number
  fetchedAt: string
}

/** All available FX rates returned by the /fx/rates endpoint. */
export interface FxRates {
  official: FxRate
  mep: FxRate
  ccl: FxRate
}
EOF

cat > packages/shared/src/schemas/instrument.schema.ts << 'EOF'
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
EOF

cat > packages/shared/src/index.ts << 'EOF'
// Types
export type { Instrument, InstrumentType, Currency, Cashflow } from './types/instrument.js'
export type {
  MarketPrice,
  BondCalculations,
  CashflowWithPV,
  InstrumentAnalysis,
  CompareEntry,
} from './types/analytics.js'
export type { FxRate, FxRates } from './types/fx.js'

// Schemas
export {
  instrumentTypeSchema,
  currencySchema,
  instrumentSchema,
  tickerParamSchema,
  analysisQuerySchema,
  compareQuerySchema,
} from './schemas/instrument.schema.js'
EOF

# ── packages/backend ──────────────────────────────────────────────────────────

mkdir -p packages/backend/src/{config,db/migrations,modules/{byma,instruments,bonds,compare,fx},plugins}
mkdir -p packages/backend/data

cat > packages/backend/package.json << 'EOF'
{
  "name": "@investor-app/backend",
  "version": "0.0.1",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "tsx watch src/app.ts",
    "build": "tsc",
    "start": "node dist/app.js",
    "db:migrate": "drizzle-kit migrate",
    "db:studio": "drizzle-kit studio",
    "db:seed": "tsx src/db/seed.ts",
    "test": "vitest run",
    "lint": "eslint src --ext .ts"
  }
}
EOF

cat > packages/backend/tsconfig.json << 'EOF'
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src"]
}
EOF

cat > packages/backend/.env.example << 'EOF'
NODE_ENV=development
PORT=3001
DATABASE_URL=./data/app.db
BYMA_API_BASE_URL=https://api.byma.com.ar
BYMA_API_KEY=your_key_here
CORS_ORIGIN=http://localhost:5173
CACHE_TTL_PRICE_SECONDS=300
CACHE_TTL_FX_SECONDS=600
EOF

cat > packages/backend/drizzle.config.ts << 'EOF'
import { defineConfig } from 'drizzle-kit'

export default defineConfig({
  schema: './src/db/schema.ts',
  out: './src/db/migrations',
  dialect: 'sqlite',
  dbCredentials: {
    url: process.env['DATABASE_URL'] ?? './data/app.db',
  },
})
EOF

cat > packages/backend/src/config/env.ts << 'EOF'
import { z } from 'zod'

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().positive().default(3001),
  DATABASE_URL: z.string().min(1),
  BYMA_API_BASE_URL: z.string().url(),
  BYMA_API_KEY: z.string().min(1),
  CORS_ORIGIN: z.string().url(),
  CACHE_TTL_PRICE_SECONDS: z.coerce.number().int().positive().default(300),
  CACHE_TTL_FX_SECONDS: z.coerce.number().int().positive().default(600),
})

/**
 * Validated and typed environment variables.
 * Throws at startup if any required variable is missing or malformed.
 */
export const env = envSchema.parse(process.env)
EOF

cat > packages/backend/src/db/schema.ts << 'EOF'
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
EOF

cat > packages/backend/src/app.ts << 'EOF'
import 'dotenv/config'
import Fastify from 'fastify'
import { env } from './config/env.js'

const app = Fastify({ logger: true })

app.get('/health', async () => ({ status: 'ok', timestamp: new Date().toISOString() }))

const start = async (): Promise<void> => {
  try {
    await app.listen({ port: env.PORT, host: '0.0.0.0' })
  } catch (err) {
    app.log.error(err)
    process.exit(1)
  }
}

start()
EOF

# ── packages/frontend — Vite scaffold ─────────────────────────────────────────

echo ""
echo "📦 Creating frontend with Vite..."
cd packages/frontend
pnpm create vite@latest . --template vue-ts <<< $'\n'
cd ../..

# ── Install all dependencies ───────────────────────────────────────────────────

echo ""
echo "📦 Installing shared dependencies..."
cd packages/shared
pnpm add zod
pnpm add -D typescript
cd ../..

echo ""
echo "📦 Installing backend dependencies..."
cd packages/backend
pnpm add fastify @fastify/cors @fastify/helmet @fastify/rate-limit dotenv
pnpm add drizzle-orm better-sqlite3 zod
pnpm add -D drizzle-kit @types/better-sqlite3 tsx typescript vitest
cd ../..

echo ""
echo "📦 Installing frontend dependencies..."
cd packages/frontend
pnpm add pinia vue-router@4 chart.js vue-chartjs
pnpm add -D tailwindcss @tailwindcss/vite
cd ../..

echo ""
echo "📦 Linking workspace packages..."
pnpm install

# ── README ────────────────────────────────────────────────────────────────────

cat > README.md << 'EOF'
# Investor App

Plataforma de análisis y comparación de instrumentos financieros del mercado argentino.

## Instrumentos soportados (Fase 1)

- Letras del Tesoro
- Bonos soberanos
- Obligaciones Negociables (ONs)

## Stack

- **Frontend:** Vue 3 + TypeScript + Tailwind CSS
- **Backend:** Node.js + Fastify + Drizzle ORM
- **Base de datos:** SQLite
- **Monorepo:** pnpm workspaces

## Requisitos

- Node.js >= 20
- pnpm >= 9

## Instalación

```bash
pnpm install
```

## Desarrollo

```bash
# Levanta backend y frontend en paralelo
pnpm dev

# Solo backend (puerto 3001)
pnpm --filter backend dev

# Solo frontend (puerto 5173)
pnpm --filter frontend dev
```

## Base de datos

```bash
# Correr migraciones
pnpm --filter backend db:migrate

# Cargar datos iniciales
pnpm --filter backend db:seed

# Abrir Drizzle Studio (explorador visual)
pnpm --filter backend db:studio
```

## Estructura

```
packages/
├── shared/     # Tipos y schemas Zod compartidos entre FE y BE
├── backend/    # API REST (Fastify + Drizzle + SQLite)
└── frontend/   # App Vue 3
```
EOF

echo ""
echo "✅ Scaffold complete! Next steps:"
echo ""
echo "  1. cd investor-app (if not already there)"
echo "  2. Copy packages/backend/.env.example to packages/backend/.env and fill in your values"
echo "  3. pnpm --filter backend db:migrate"
echo "  4. pnpm dev"
echo ""
EOF
