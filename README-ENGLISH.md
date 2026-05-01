# InversorAR

A web platform for analysing and comparing Argentine fixed-income instruments. Built for investors who need accurate financial metrics, real-time market prices, and a clean interface for making informed decisions.

---

## Features

- **Market listings** — sovereign bonds, treasury bills, and corporate bonds (ONs) traded on BYMA, with live prices
- **Instrument analysis** — YTM (TIREA convention), clean/dirty price, accrued interest, modified duration, parity, TNA, and current yield
- **Payment flow chart** — stacked bar chart of coupons and amortizations through maturity
- **Bidirectional simulator** — enter a price to get the YTM, or enter a YTM to get the theoretical price
- **Yield curve viewer** — YTM vs. modified duration scatter plots grouped by instrument category
- **Multi-instrument comparator** — side-by-side metrics table for up to 5 instruments
- **Payment calendar** — upcoming coupons and amortizations across all active instruments, grouped by month
- **FX rates** — official, blue, MEP, and CCL USD/ARS exchange rates via dolarapi.com
- **Portfolio tracker** — track holdings by nominal value; built-in position analysis
- **Admin panel** — manage instruments and cashflow schedules without a database client

---

## Supported instrument structures

| Structure    | Examples                                    |
|--------------|---------------------------------------------|
| Bullet       | Globales / Bonares (USD), most corporate ONs |
| Amortizable  | AL30, GD35, DICP, PARP and similar          |
| Zero coupon  | LECER, short CER bonds                      |
| Capitalizable | LECAP, BONCAP, some Bonte series           |
| CER-adjusted | TX26, TX28, TZXD6/M7 and similar           |
| Dollar-linked | TZV26 and similar                          |
| TAMAR        | Floating-rate bonds and letters             |
| Dual         | Dual-leg bonds (CAP + TAMAR)                |

---

## Tech stack

| Layer      | Technology                                         |
|------------|----------------------------------------------------|
| Frontend   | Vue 3 · TypeScript (strict) · Vite                 |
| State      | Pinia                                              |
| Charts     | Chart.js + vue-chartjs                             |
| Backend    | Node.js · Fastify                                  |
| ORM        | Drizzle ORM                                        |
| Database   | SQLite                                             |
| Validation | Zod (shared between frontend and backend)          |
| Auth       | Google OAuth 2.0 + HttpOnly cookie sessions        |
| Monorepo   | pnpm workspaces                                    |

---

## Project structure

```
packages/
├── shared/               # Shared TypeScript types and Zod schemas
├── backend/
│   └── src/
│       ├── modules/
│       │   ├── instruments/      # Instrument CRUD and repository
│       │   ├── bonds/            # Financial calculator + analysis endpoint
│       │   ├── byma/             # Price fetching: live client, mock fallback, SQLite cache
│       │   ├── fx/               # ARS/USD exchange rates with cache
│       │   ├── compare/          # Multi-instrument comparison
│       │   ├── calendar/         # Upcoming payment calendar
│       │   ├── portfolio/        # Portfolio tracking
│       │   ├── flow-generator/   # Cashflow schedule generator by instrument type
│       │   ├── admin/            # Token-protected admin panel API
│       │   └── auth/             # Google OAuth + session management
│       └── db/                   # Drizzle schema, migrations, seed data
└── frontend/
    └── src/
        ├── views/                # One component per route
        ├── components/           # Reusable UI: charts, instrument cards, compare table
        ├── stores/               # Pinia: auth, currency, portfolio, theme
        ├── composables/          # useFormat (numbers, dates, yields)
        └── services/             # Typed API client
```

---

## Requirements

- Node.js >= 20
- pnpm >= 9

---

## Setup

```bash
git clone https://github.com/zetaele/investor-app.git
cd investor-app
pnpm install
```

Copy the backend environment file and fill in your values:

```bash
cp packages/backend/.env.example packages/backend/.env
```

Key environment variables:

```env
DATABASE_URL=./data/app.db
SESSION_SECRET=your_session_secret
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_CALLBACK_URL=http://localhost:3001/auth/callback
ADMIN_TOKEN=your_admin_token
CORS_ORIGIN=http://localhost:5173
```

---

## Development

```bash
# Start backend (port 3001) and frontend (port 5173) in parallel
pnpm dev

# Backend only
pnpm --filter backend dev

# Frontend only
pnpm --filter frontend dev
```

---

## Database

```bash
# Apply migrations
pnpm --filter backend db:migrate

# Seed with instrument data
pnpm --filter backend db:seed

# Open visual browser (Drizzle Studio)
pnpm --filter backend db:studio
```

---

## Architecture notes

### Price pipeline

Market prices are fetched through a three-layer chain:

```
FallbackBymaClient
  ├── primary:  Data912Client   (live BYMA feed)
  └── fallback: MockBymaClient  (static prices for illiquid instruments)
        └── PriceCacheService   (SQLite cache, 5-minute TTL)
```

If a ticker is not found in the live feed (`BymaInstrumentNotFoundError`), the fallback serves a static reference price. This keeps liquid and illiquid instruments in the same API surface without any special-casing in the business logic.

### YTM calculation

YTM is solved with Newton-Raphson (tolerance `1e-7`, converges in ~10 iterations). The implementation follows the Argentine **TIREA convention**: yield is solved against the **clean (quoted) price**, not the dirty price — matching the standard used by BYMA, CNV, and local broker platforms.

### CER bonds

Cashflows for CER-adjusted bonds (TX26, TX28, DICP, etc.) are stored in nominal VN units for readability. At analysis time the service applies a `cerScale = VT_current / nominalFace` ratio to convert them to current ARS before running the YTM solver, ensuring consistent units across all bond types.

### Shared types

The `shared` package is the single source of truth for all data contracts (`InstrumentAnalysis`, `Cashflow`, `FxRates`, etc.). Frontend and backend import from the same module, so a type mismatch between API response and UI consumption is a compile error, not a runtime bug.

---

## Admin panel

Available at `http://localhost:5173/admin`. Requires the `ADMIN_TOKEN` set in the backend `.env`.

From the admin you can:
- Create instruments and define their cashflow structure
- Preview generated payment schedules before saving
- Edit or deactivate existing instruments

---

## Authentication

Users authenticate via Google OAuth 2.0. On success a session UUID is stored server-side and sent as an `HttpOnly` cookie — no tokens in `localStorage`. Sessions are validated on every protected request via a Fastify preHandler hook.

Two plan tiers are supported: `TRIAL` (time-limited) and `PRO`.

---

## License

Proprietary. All rights reserved.
