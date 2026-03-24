import "dotenv/config";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { cashflows, instruments } from "./schema.js";

const client = new Database(process.env["DATABASE_URL"] ?? "./data/app.db");
const db = drizzle(client);

// ── Instruments ───────────────────────────────────────────────────────────────

const instrumentsData = [
  // Sovereign bonds (USD)
  {
    ticker: "AL30",
    name: "Bono del Tesoro en Dólares 2030 (Ley Argentina)",
    type: "BOND" as const,
    currency: "USD" as const,
    issuer: "Tesoro Nacional",
    maturityDate: "2030-07-09",
  },
  {
    ticker: "GD30",
    name: "Bono del Tesoro en Dólares 2030 (Ley Nueva York)",
    type: "BOND" as const,
    currency: "USD" as const,
    issuer: "Tesoro Nacional",
    maturityDate: "2030-07-09",
  },
  {
    ticker: "AL35",
    name: "Bono del Tesoro en Dólares 2035 (Ley Argentina)",
    type: "BOND" as const,
    currency: "USD" as const,
    issuer: "Tesoro Nacional",
    maturityDate: "2035-07-09",
  },
  {
    ticker: "GD35",
    name: "Bono del Tesoro en Dólares 2035 (Ley Nueva York)",
    type: "BOND" as const,
    currency: "USD" as const,
    issuer: "Tesoro Nacional",
    maturityDate: "2035-07-09",
  },
  {
    ticker: "AL41",
    name: "Bono del Tesoro en Dólares 2041 (Ley Argentina)",
    type: "BOND" as const,
    currency: "USD" as const,
    issuer: "Tesoro Nacional",
    maturityDate: "2041-07-09",
  },
  {
    ticker: "GD41",
    name: "Bono del Tesoro en Dólares 2041 (Ley Nueva York)",
    type: "BOND" as const,
    currency: "USD" as const,
    issuer: "Tesoro Nacional",
    maturityDate: "2041-07-09",
  },
  {
    ticker: "GD46",
    name: "Bono del Tesoro en Dólares 2046 (Ley Nueva York)",
    type: "BOND" as const,
    currency: "USD" as const,
    issuer: "Tesoro Nacional",
    maturityDate: "2046-07-09",
  },
  // Sovereign bonds (ARS)
  {
    ticker: "T2X5",
    name: "Boncer 2025",
    type: "BOND" as const,
    currency: "ARS" as const,
    issuer: "Tesoro Nacional",
    maturityDate: "2025-08-13",
  },
  // Treasury letters (ARS)
  {
    ticker: "S31O5",
    name: "Letra del Tesoro en Pesos 31/10/2025",
    type: "LETTER" as const,
    currency: "ARS" as const,
    issuer: "Tesoro Nacional",
    maturityDate: "2025-10-31",
  },
  {
    ticker: "S28N5",
    name: "Letra del Tesoro en Pesos 28/11/2025",
    type: "LETTER" as const,
    currency: "ARS" as const,
    issuer: "Tesoro Nacional",
    maturityDate: "2025-11-28",
  },
  {
    ticker: "S31D5",
    name: "Letra del Tesoro en Pesos 31/12/2025",
    type: "LETTER" as const,
    currency: "ARS" as const,
    issuer: "Tesoro Nacional",
    maturityDate: "2025-12-31",
  },
  // Corporate bonds / ONs (USD)
  {
    ticker: "YPF24",
    name: "Obligación Negociable YPF 2024",
    type: "ON" as const,
    currency: "USD" as const,
    issuer: "YPF S.A.",
    maturityDate: "2026-07-15",
  },
  {
    ticker: "PAMP27",
    name: "Obligación Negociable Pampa Energía 2027",
    type: "ON" as const,
    currency: "USD" as const,
    issuer: "Pampa Energía S.A.",
    maturityDate: "2027-07-21",
  },
  {
    ticker: "TECO27",
    name: "Obligación Negociable Telecom 2027",
    type: "ON" as const,
    currency: "USD" as const,
    issuer: "Telecom Argentina S.A.",
    maturityDate: "2027-03-17",
  },
];

// ── Cash flows ────────────────────────────────────────────────────────────────

/**
 * AL30 / GD30 cash flow schedule.
 * Coupon: 0.5% semi-annual on residual capital.
 * Amortization: 4% semi-annual starting Jul 2024, accelerating to 16% from Jan 2027.
 */
const al30Cashflows = [
  { paymentDate: "2026-07-09", coupon: 0.5, amortization: 4.0, residual: 0.96 },
  {
    paymentDate: "2027-01-09",
    coupon: 0.48,
    amortization: 16.0,
    residual: 0.8,
  },
  {
    paymentDate: "2027-07-09",
    coupon: 0.4,
    amortization: 16.0,
    residual: 0.64,
  },
  {
    paymentDate: "2028-01-09",
    coupon: 0.32,
    amortization: 16.0,
    residual: 0.48,
  },
  {
    paymentDate: "2028-07-09",
    coupon: 0.24,
    amortization: 16.0,
    residual: 0.32,
  },
  {
    paymentDate: "2029-01-09",
    coupon: 0.16,
    amortization: 16.0,
    residual: 0.16,
  },
  {
    paymentDate: "2029-07-09",
    coupon: 0.08,
    amortization: 8.0,
    residual: 0.08,
  },
  { paymentDate: "2030-01-09", coupon: 0.04, amortization: 8.0, residual: 0.0 },
  { paymentDate: "2030-07-09", coupon: 0.0, amortization: 0.0, residual: 0.0 },
];

/**
 * YPF24 ON cash flow schedule.
 * Bullet structure: semi-annual coupons at 8.5%, full principal at maturity.
 */
const ypf24Cashflows = [
  { paymentDate: "2025-07-15", coupon: 4.25, amortization: 0.0, residual: 1.0 },
  { paymentDate: "2026-01-15", coupon: 4.25, amortization: 0.0, residual: 1.0 },
  {
    paymentDate: "2026-07-15",
    coupon: 4.25,
    amortization: 100.0,
    residual: 0.0,
  },
];

/**
 * PAMP27 ON cash flow schedule.
 * Bullet structure: semi-annual coupons at 7.375%, full principal at maturity.
 */
const pamp27Cashflows = [
  {
    paymentDate: "2025-07-21",
    coupon: 3.6875,
    amortization: 0.0,
    residual: 1.0,
  },
  {
    paymentDate: "2026-01-21",
    coupon: 3.6875,
    amortization: 0.0,
    residual: 1.0,
  },
  {
    paymentDate: "2026-07-21",
    coupon: 3.6875,
    amortization: 0.0,
    residual: 1.0,
  },
  {
    paymentDate: "2027-01-21",
    coupon: 3.6875,
    amortization: 0.0,
    residual: 1.0,
  },
  {
    paymentDate: "2027-07-21",
    coupon: 3.6875,
    amortization: 100.0,
    residual: 0.0,
  },
];

// ── Seed logic ────────────────────────────────────────────────────────────────

async function seed(): Promise<void> {
  console.log("🌱 Seeding database...");

  // Clear existing data (safe for development)
  await db.delete(cashflows);
  await db.delete(instruments);

  // Insert instruments
  const inserted = await db
    .insert(instruments)
    .values(instrumentsData.map((i) => ({ ...i, market: "BYMA", isActive: true })))
    .returning({ id: instruments.id, ticker: instruments.ticker });

  console.log(`✓ Inserted ${inserted.length} instruments`);

  // Build ticker → id map
  const tickerToId = new Map(inserted.map((r) => [r.ticker, r.id]));

  // Helper: insert cash flows for a given ticker
  const insertCashflows = async (ticker: string, flows: typeof al30Cashflows): Promise<void> => {
    const instrumentId = tickerToId.get(ticker);
    if (instrumentId === undefined) {
      console.warn(`⚠ Ticker ${ticker} not found, skipping cashflows`);
      return;
    }
    await db.insert(cashflows).values(flows.map((cf) => ({ ...cf, instrumentId })));
    console.log(`  ✓ ${ticker}: ${flows.length} cashflows`);
  };

  console.log("🌱 Seeding cashflows...");

  // AL30 and GD30 share the same cashflow schedule
  await insertCashflows("AL30", al30Cashflows);
  await insertCashflows("GD30", al30Cashflows);
  await insertCashflows("YPF24", ypf24Cashflows);
  await insertCashflows("PAMP27", pamp27Cashflows);

  console.log("✅ Seed complete!");
  client.close();
}

seed().catch((err) => {
  console.error("❌ Seed failed:", err);
  client.close();
  process.exit(1);
});
