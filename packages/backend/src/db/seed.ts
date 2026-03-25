import "dotenv/config";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { cashflows, instrumentConfig, instruments } from "./schema.js";

const client = new Database(process.env["DATABASE_URL"] ?? "./data/app.db");
const db = drizzle(client);

// ── Helpers ───────────────────────────────────────────────────────────────────

type CF = { paymentDate: string; coupon: number; amortization: number; residual: number };

const r2 = (n: number) => Math.round(n * 100) / 100;
const r4 = (n: number) => Math.round(n * 10000) / 10000;

/**
 * Generates the Jan-9 / Jul-9 semi-annual payment date sequence used by
 * all sovereign bonds from the 2020 Argentine debt restructuring.
 */
function sovDates(sy: number, sm: 1 | 7, ey: number, em: 1 | 7): string[] {
  const dates: string[] = [];
  let y = sy,
    m: 1 | 7 = sm;
  for (;;) {
    dates.push(`${y}-${String(m).padStart(2, "0")}-09`);
    if (y === ey && m === em) break;
    m === 1 ? (m = 7) : ((m = 1), y++);
  }
  return dates;
}

/**
 * Generates cashflows for sovereign bonds:
 * - Semi-annual coupon on residual capital
 * - Equal amortization per period after a grace (coupon-only) phase
 *
 * Amounts are expressed per $100 face value (absolute, not percentages).
 * Coupon rates approximate the stepped-up rates reached by March 2026.
 */
function sovCashflows(
  dates: string[],
  couponRatePerPeriod: number,
  couponOnlyPeriods: number,
): CF[] {
  const amortCount = dates.length - couponOnlyPeriods;
  const baseAmort = r2(100 / amortCount);
  const flows: CF[] = [];
  let residual = 1.0;

  for (let i = 0; i < dates.length; i++) {
    const coupon = r2(residual * 100 * couponRatePerPeriod);
    const isLast = i === dates.length - 1;
    const amortization = i < couponOnlyPeriods ? 0 : isLast ? r2(residual * 100) : baseAmort;
    const newResidual = isLast ? 0 : r4(residual - amortization / 100);

    flows.push({ paymentDate: dates[i]!, coupon, amortization, residual: newResidual });
    residual = newResidual;
  }
  return flows;
}

// ── Instruments ───────────────────────────────────────────────────────────────

const instrumentsData = [
  // ── Sovereign bonds — ARS (sin sufijo = cotización en pesos en BYMA) ─────
  {
    ticker: "AL30",
    name: "Bono del Tesoro en Dólares 2030 (Ley Argentina)",
    type: "BOND" as const,
    currency: "ARS" as const,
    issuer: "Tesoro Nacional",
    maturityDate: "2030-07-09",
  },
  {
    ticker: "GD30",
    name: "Bono del Tesoro en Dólares 2030 (Ley Nueva York)",
    type: "BOND" as const,
    currency: "ARS" as const,
    issuer: "Tesoro Nacional",
    maturityDate: "2030-07-09",
  },
  {
    ticker: "AL35",
    name: "Bono del Tesoro en Dólares 2035 (Ley Argentina)",
    type: "BOND" as const,
    currency: "ARS" as const,
    issuer: "Tesoro Nacional",
    maturityDate: "2035-07-09",
  },
  {
    ticker: "GD35",
    name: "Bono del Tesoro en Dólares 2035 (Ley Nueva York)",
    type: "BOND" as const,
    currency: "ARS" as const,
    issuer: "Tesoro Nacional",
    maturityDate: "2035-07-09",
  },
  {
    ticker: "AL41",
    name: "Bono del Tesoro en Dólares 2041 (Ley Argentina)",
    type: "BOND" as const,
    currency: "ARS" as const,
    issuer: "Tesoro Nacional",
    maturityDate: "2041-07-09",
  },
  {
    ticker: "GD41",
    name: "Bono del Tesoro en Dólares 2041 (Ley Nueva York)",
    type: "BOND" as const,
    currency: "ARS" as const,
    issuer: "Tesoro Nacional",
    maturityDate: "2041-07-09",
  },
  {
    ticker: "GD46",
    name: "Bono del Tesoro en Dólares 2046 (Ley Nueva York)",
    type: "BOND" as const,
    currency: "ARS" as const,
    issuer: "Tesoro Nacional",
    maturityDate: "2046-07-09",
  },
  {
    ticker: "AO27D",
    name: "Bono del Tesoro en Dólares 2027 (Ley Argentina)",
    type: "BOND" as const,
    currency: "USD" as const,
    issuer: "Tesoro Nacional",
    maturityDate: "2027-10-29",
  },
  // ── Treasury letters — ARS (zero-coupon, discount instruments) ───────────
  {
    ticker: "S30A6",
    name: "Letra del Tesoro en Pesos 30/04/2026",
    type: "LETTER" as const,
    currency: "ARS" as const,
    issuer: "Tesoro Nacional",
    maturityDate: "2026-04-30",
  },
  {
    ticker: "S29M6",
    name: "Letra del Tesoro en Pesos 29/05/2026",
    type: "LETTER" as const,
    currency: "ARS" as const,
    issuer: "Tesoro Nacional",
    maturityDate: "2026-05-29",
  },
  {
    ticker: "S30J6",
    name: "Letra del Tesoro en Pesos 30/06/2026",
    type: "LETTER" as const,
    currency: "ARS" as const,
    issuer: "Tesoro Nacional",
    maturityDate: "2026-06-30",
  },
  {
    ticker: "S31L6",
    name: "Letra del Tesoro en Pesos 31/07/2026",
    type: "LETTER" as const,
    currency: "ARS" as const,
    issuer: "Tesoro Nacional",
    maturityDate: "2026-07-31",
  },
  // ── Corporate bonds / ONs — USD ──────────────────────────────────────────
  {
    ticker: "YPF24",
    name: "Obligación Negociable YPF 2026 Serie I",
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
    name: "Obligación Negociable Telecom Argentina 2027",
    type: "ON" as const,
    currency: "USD" as const,
    issuer: "Telecom Argentina S.A.",
    maturityDate: "2027-03-17",
  },
];

// ── Cash flows ────────────────────────────────────────────────────────────────

/**
 * AL30 / GD30 — Bono del Tesoro USD 2030
 * Coupon: 1% annual (0.5% semi-annual) on residual capital.
 * Amortization: stepped schedule from 2024, completing Jul 2030.
 * Source: Prospecto de emisión, Ministerio de Economía Argentina (2020 restructuring).
 */
const al30Cashflows: CF[] = [
  { paymentDate: "2026-07-09", coupon: 0.5, amortization: 4.0, residual: 0.96 },
  { paymentDate: "2027-01-09", coupon: 0.48, amortization: 16.0, residual: 0.8 },
  { paymentDate: "2027-07-09", coupon: 0.4, amortization: 16.0, residual: 0.64 },
  { paymentDate: "2028-01-09", coupon: 0.32, amortization: 16.0, residual: 0.48 },
  { paymentDate: "2028-07-09", coupon: 0.24, amortization: 16.0, residual: 0.32 },
  { paymentDate: "2029-01-09", coupon: 0.16, amortization: 16.0, residual: 0.16 },
  { paymentDate: "2029-07-09", coupon: 0.08, amortization: 8.0, residual: 0.08 },
  { paymentDate: "2030-01-09", coupon: 0.04, amortization: 8.0, residual: 0.0 },
  { paymentDate: "2030-07-09", coupon: 0.0, amortization: 0.0, residual: 0.0 },
];

/**
 * AL35 / GD35 — Bono del Tesoro USD 2035
 * Coupon: 3.625% annual (1.8125% semi-annual) on residual — stepped-up rate as of 2026.
 * 4 coupon-only periods, then equal amortization through Jul 2035.
 * Approximate schedule based on 2020 restructuring terms.
 */
const al35Cashflows = sovCashflows(sovDates(2026, 7, 2035, 7), 0.018125, 4);

/**
 * AL41 / GD41 — Bono del Tesoro USD 2041
 * Coupon: 4.25% annual (2.125% semi-annual) on residual — stepped-up rate as of 2026.
 * 8 coupon-only periods, then equal amortization through Jul 2041.
 * Approximate schedule based on 2020 restructuring terms.
 */
const al41Cashflows = sovCashflows(sovDates(2026, 7, 2041, 7), 0.02125, 8);

/**
 * GD46 — Bono del Tesoro USD 2046 (Ley Nueva York only)
 * Coupon: 4.625% annual (2.3125% semi-annual) on residual — stepped-up rate as of 2026.
 * 12 coupon-only periods, then equal amortization through Jul 2046.
 * Approximate schedule based on 2020 restructuring terms.
 */
const gd46Cashflows = sovCashflows(sovDates(2026, 7, 2046, 7), 0.023125, 12);

/**
 * AO27 — Bonar 2027 (Ley Argentina)
 * Bullet: cupón 6% TNA pagadero mensualmente (6%/12 = 0.50 por c/100 nominal).
 * Licitación inaugural feb-2026: precio de corte USD 1.004,50 / USD 1.000 VN → TIREA 5,89%.
 * Vencimiento: 29-oct-2027. Fechas ajustadas por calendario BYMA (fin de mes hábil).
 */
const ao27dCashflows: CF[] = [
  { paymentDate: "2026-03-31", coupon: 0.5, amortization: 0.0, residual: 1.0 },
  { paymentDate: "2026-04-30", coupon: 0.5, amortization: 0.0, residual: 1.0 },
  { paymentDate: "2026-05-29", coupon: 0.5, amortization: 0.0, residual: 1.0 },
  { paymentDate: "2026-06-30", coupon: 0.5, amortization: 0.0, residual: 1.0 },
  { paymentDate: "2026-07-31", coupon: 0.5, amortization: 0.0, residual: 1.0 },
  { paymentDate: "2026-08-31", coupon: 0.5, amortization: 0.0, residual: 1.0 },
  { paymentDate: "2026-09-30", coupon: 0.5, amortization: 0.0, residual: 1.0 },
  { paymentDate: "2026-10-30", coupon: 0.5, amortization: 0.0, residual: 1.0 },
  { paymentDate: "2026-11-30", coupon: 0.5, amortization: 0.0, residual: 1.0 },
  { paymentDate: "2026-12-30", coupon: 0.5, amortization: 0.0, residual: 1.0 },
  { paymentDate: "2027-01-29", coupon: 0.5, amortization: 0.0, residual: 1.0 },
  { paymentDate: "2027-02-26", coupon: 0.5, amortization: 0.0, residual: 1.0 },
  { paymentDate: "2027-03-31", coupon: 0.5, amortization: 0.0, residual: 1.0 },
  { paymentDate: "2027-04-30", coupon: 0.5, amortization: 0.0, residual: 1.0 },
  { paymentDate: "2027-05-31", coupon: 0.5, amortization: 0.0, residual: 1.0 },
  { paymentDate: "2027-06-30", coupon: 0.5, amortization: 0.0, residual: 1.0 },
  { paymentDate: "2027-07-30", coupon: 0.5, amortization: 0.0, residual: 1.0 },
  { paymentDate: "2027-08-31", coupon: 0.5, amortization: 0.0, residual: 1.0 },
  { paymentDate: "2027-09-30", coupon: 0.5, amortization: 0.0, residual: 1.0 },
  { paymentDate: "2027-10-29", coupon: 0.5, amortization: 100.0, residual: 0.0 },
];

/**
 * ARS letters — zero-coupon discount instruments.
 * Single cashflow: full face value (100) at maturity.
 * Price reflects the discount rate implied by the current TNA.
 */
const s30a6Cashflows: CF[] = [
  { paymentDate: "2026-04-30", coupon: 0.0, amortization: 100.0, residual: 0.0 },
];
const s29m6Cashflows: CF[] = [
  { paymentDate: "2026-05-29", coupon: 0.0, amortization: 100.0, residual: 0.0 },
];
const s30j6Cashflows: CF[] = [
  { paymentDate: "2026-06-30", coupon: 0.0, amortization: 100.0, residual: 0.0 },
];
const s31l6Cashflows: CF[] = [
  { paymentDate: "2026-07-31", coupon: 0.0, amortization: 100.0, residual: 0.0 },
];

/**
 * YPF24 — Obligación Negociable YPF 2026 Serie I
 * Bullet: semi-annual coupons at 8.5% annual, full principal at maturity Jul 2026.
 */
const ypf24Cashflows: CF[] = [
  { paymentDate: "2026-01-15", coupon: 4.25, amortization: 0.0, residual: 1.0 },
  { paymentDate: "2026-07-15", coupon: 4.25, amortization: 100.0, residual: 0.0 },
];

/**
 * PAMP27 — Obligación Negociable Pampa Energía 2027
 * Bullet: semi-annual coupons at 7.375% annual, full principal at maturity Jul 2027.
 */
const pamp27Cashflows: CF[] = [
  { paymentDate: "2026-01-21", coupon: 3.6875, amortization: 0.0, residual: 1.0 },
  { paymentDate: "2026-07-21", coupon: 3.6875, amortization: 0.0, residual: 1.0 },
  { paymentDate: "2027-01-21", coupon: 3.6875, amortization: 0.0, residual: 1.0 },
  { paymentDate: "2027-07-21", coupon: 3.6875, amortization: 100.0, residual: 0.0 },
];

/**
 * TECO27 — Obligación Negociable Telecom Argentina 2027
 * Bullet: semi-annual coupons at 8.5% annual, full principal at maturity Mar 2027.
 */
const teco27Cashflows: CF[] = [
  { paymentDate: "2026-09-17", coupon: 4.25, amortization: 0.0, residual: 1.0 },
  { paymentDate: "2027-03-17", coupon: 4.25, amortization: 100.0, residual: 0.0 },
];

// ── Seed logic ────────────────────────────────────────────────────────────────

const cashflowMap: Record<string, CF[]> = {
  AL30: al30Cashflows,
  GD30: al30Cashflows,
  AL35: al35Cashflows,
  GD35: al35Cashflows,
  AL41: al41Cashflows,
  GD41: al41Cashflows,
  GD46: gd46Cashflows,
  AO27D: ao27dCashflows,
  S30A6: s30a6Cashflows,
  S29M6: s29m6Cashflows,
  S30J6: s30j6Cashflows,
  S31L6: s31l6Cashflows,
  YPF24: ypf24Cashflows,
  PAMP27: pamp27Cashflows,
  TECO27: teco27Cashflows,
};

async function seed(): Promise<void> {
  console.log("🌱 Seeding database...");

  await db.delete(instrumentConfig);
  await db.delete(cashflows);
  await db.delete(instruments);

  const inserted = await db
    .insert(instruments)
    .values(instrumentsData.map((i) => ({ ...i, market: "BYMA", isActive: true })))
    .returning({ id: instruments.id, ticker: instruments.ticker });

  console.log(`✓ Inserted ${inserted.length} instruments`);

  const tickerToId = new Map(inserted.map((r) => [r.ticker, r.id]));

  console.log("🌱 Seeding cashflows...");
  for (const [ticker, flows] of Object.entries(cashflowMap)) {
    const instrumentId = tickerToId.get(ticker);
    if (instrumentId === undefined) {
      console.warn(`⚠ ${ticker}: not found, skipping cashflows`);
      continue;
    }
    await db.insert(cashflows).values(flows.map((cf) => ({ ...cf, instrumentId })));
    console.log(`  ✓ ${ticker}: ${flows.length} cashflows`);
  }

  console.log("✅ Seed complete!");
  client.close();
}

seed().catch((err) => {
  console.error("❌ Seed failed:", err);
  client.close();
  process.exit(1);
});
