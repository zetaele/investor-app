import "dotenv/config";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { cashflows, instrumentConfig, instruments } from "./schema.js";

const client = new Database(process.env["DATABASE_URL"] ?? "./data/app.db");
const db = drizzle(client);

// ── Helpers ───────────────────────────────────────────────────────────────────

type CF = { paymentDate: string; coupon: number; amortization: number; residual: number };

// ── Instruments ───────────────────────────────────────────────────────────────

const instrumentsData = [
  // ── Sovereign bonds — USD (D suffix = USD MEP) ────────────────────────────
  {
    ticker: "AE38D",
    name: "Bono del Tesoro en Dólares 2038 (Ley Argentina) - USD",
    type: "BOND" as const,
    currency: "USD" as const,
    issuer: "Tesoro Nacional",
    maturityDate: "2038-01-09",
  },
  {
    ticker: "GD38D",
    name: "Bono del Tesoro en Dólares 2038 (Ley Nueva York) - USD",
    type: "BOND" as const,
    currency: "USD" as const,
    issuer: "Tesoro Nacional",
    maturityDate: "2038-01-09",
  },
  {
    ticker: "GD46D",
    name: "Bono del Tesoro en Dólares 2046 (Ley Nueva York) - USD",
    type: "BOND" as const,
    currency: "USD" as const,
    issuer: "Tesoro Nacional",
    maturityDate: "2046-07-09",
  },
  {
    ticker: "AL41D",
    name: "Bono del Tesoro en Dólares 2041 (Ley Argentina) - USD",
    type: "BOND" as const,
    currency: "USD" as const,
    issuer: "Tesoro Nacional",
    maturityDate: "2041-07-09",
  },
  {
    ticker: "GD41D",
    name: "Bono del Tesoro en Dólares 2041 (Ley Nueva York) - USD",
    type: "BOND" as const,
    currency: "USD" as const,
    issuer: "Tesoro Nacional",
    maturityDate: "2041-07-09",
  },
  {
    ticker: "AL30D",
    name: "Bono del Tesoro en Dólares 2030 (Ley Argentina) - USD",
    type: "BOND" as const,
    currency: "USD" as const,
    issuer: "Tesoro Nacional",
    maturityDate: "2030-07-09",
  },
  {
    ticker: "GD30D",
    name: "Bono del Tesoro en Dólares 2030 (Ley Nueva York) - USD",
    type: "BOND" as const,
    currency: "USD" as const,
    issuer: "Tesoro Nacional",
    maturityDate: "2030-07-09",
  },
  {
    ticker: "AL35D",
    name: "Bono del Tesoro en Dólares 2035 (Ley Argentina) - USD",
    type: "BOND" as const,
    currency: "USD" as const,
    issuer: "Tesoro Nacional",
    maturityDate: "2035-07-09",
  },
  {
    ticker: "GD35D",
    name: "Bono del Tesoro en Dólares 2035 (Ley Nueva York) - USD",
    type: "BOND" as const,
    currency: "USD" as const,
    issuer: "Tesoro Nacional",
    maturityDate: "2035-07-09",
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
 * AE38D — Bono del Tesoro en Dólares 2038 (USD MEP, Ley Argentina)
 * Step-up coupon: ~5% annual. Coupon-only through Jan 2027.
 * Amortization: 4.55% per period starting Jul 2027 (22 equal installments through Jan 2038).
 * Full cashflow history included so past payments can be displayed in the UI.
 */
const ae38dCashflows: CF[] = [
  // ── Past payments ─────────────────────────────────────────────────────────
  { paymentDate: "2021-07-09", coupon: 0.11, amortization: 0.0, residual: 1.0 },
  { paymentDate: "2022-01-09", coupon: 1.0, amortization: 0.0, residual: 1.0 },
  { paymentDate: "2022-07-09", coupon: 1.0, amortization: 0.0, residual: 1.0 },
  { paymentDate: "2023-01-09", coupon: 1.94, amortization: 0.0, residual: 1.0 },
  { paymentDate: "2023-07-09", coupon: 1.94, amortization: 0.0, residual: 1.0 },
  { paymentDate: "2024-01-09", coupon: 2.13, amortization: 0.0, residual: 1.0 },
  { paymentDate: "2024-07-09", coupon: 2.13, amortization: 0.0, residual: 1.0 },
  { paymentDate: "2025-01-09", coupon: 2.5, amortization: 0.0, residual: 1.0 },
  { paymentDate: "2025-07-09", coupon: 2.5, amortization: 0.0, residual: 1.0 },
  { paymentDate: "2026-01-09", coupon: 2.5, amortization: 0.0, residual: 1.0 },
  // ── Coupon-only future payments ───────────────────────────────────────────
  { paymentDate: "2026-07-09", coupon: 2.5, amortization: 0.0, residual: 1.0 },
  { paymentDate: "2027-01-09", coupon: 2.5, amortization: 0.0, residual: 1.0 },
  // ── Amortization phase (4.55% per period) ─────────────────────────────────
  { paymentDate: "2027-07-09", coupon: 2.5, amortization: 4.55, residual: 0.9545 },
  { paymentDate: "2028-01-09", coupon: 2.39, amortization: 4.55, residual: 0.9091 },
  { paymentDate: "2028-07-09", coupon: 2.27, amortization: 4.55, residual: 0.8636 },
  { paymentDate: "2029-01-09", coupon: 2.16, amortization: 4.55, residual: 0.8182 },
  { paymentDate: "2029-07-09", coupon: 2.05, amortization: 4.55, residual: 0.7727 },
  { paymentDate: "2030-01-09", coupon: 1.93, amortization: 4.55, residual: 0.7273 },
  { paymentDate: "2030-07-09", coupon: 1.82, amortization: 4.55, residual: 0.6818 },
  { paymentDate: "2031-01-09", coupon: 1.7, amortization: 4.55, residual: 0.6364 },
  { paymentDate: "2031-07-09", coupon: 1.59, amortization: 4.55, residual: 0.5909 },
  { paymentDate: "2032-01-09", coupon: 1.48, amortization: 4.55, residual: 0.5455 },
  { paymentDate: "2032-07-09", coupon: 1.36, amortization: 4.55, residual: 0.5 },
  { paymentDate: "2033-01-09", coupon: 1.25, amortization: 4.55, residual: 0.4546 },
  { paymentDate: "2033-07-09", coupon: 1.14, amortization: 4.55, residual: 0.4091 },
  { paymentDate: "2034-01-09", coupon: 1.02, amortization: 4.55, residual: 0.3636 },
  { paymentDate: "2034-07-09", coupon: 0.91, amortization: 4.55, residual: 0.3182 },
  { paymentDate: "2035-01-09", coupon: 0.8, amortization: 4.55, residual: 0.2727 },
  { paymentDate: "2035-07-09", coupon: 0.68, amortization: 4.55, residual: 0.2273 },
  { paymentDate: "2036-01-09", coupon: 0.57, amortization: 4.55, residual: 0.1818 },
  { paymentDate: "2036-07-09", coupon: 0.45, amortization: 4.55, residual: 0.1364 },
  { paymentDate: "2037-01-09", coupon: 0.34, amortization: 4.55, residual: 0.0909 },
  { paymentDate: "2037-07-09", coupon: 0.23, amortization: 4.55, residual: 0.0455 },
  { paymentDate: "2038-01-09", coupon: 0.11, amortization: 4.55, residual: 0.0 },
];

/**
 * AL41D — Bono del Tesoro en Dólares 2041 (USD MEP, Ley Argentina)
 * Step-up coupon: ~3.5% annual through 2029, ~4.875% from 2030.
 * Amortization: 3.57% per period starting Jan 2028 (28 equal installments).
 * Full cashflow history included so past payments can be displayed in the UI.
 */
const al41dCashflows: CF[] = [
  // ── Past payments ─────────────────────────────────────────────────────────
  { paymentDate: "2021-07-09", coupon: 0.11, amortization: 0.0, residual: 1.0 },
  { paymentDate: "2022-01-09", coupon: 1.25, amortization: 0.0, residual: 1.0 },
  { paymentDate: "2022-07-09", coupon: 1.25, amortization: 0.0, residual: 1.0 },
  { paymentDate: "2023-01-09", coupon: 1.75, amortization: 0.0, residual: 1.0 },
  { paymentDate: "2023-07-09", coupon: 1.75, amortization: 0.0, residual: 1.0 },
  { paymentDate: "2024-01-09", coupon: 1.75, amortization: 0.0, residual: 1.0 },
  { paymentDate: "2024-07-09", coupon: 1.75, amortization: 0.0, residual: 1.0 },
  { paymentDate: "2025-01-09", coupon: 1.75, amortization: 0.0, residual: 1.0 },
  { paymentDate: "2025-07-09", coupon: 1.75, amortization: 0.0, residual: 1.0 },
  { paymentDate: "2026-01-09", coupon: 1.75, amortization: 0.0, residual: 1.0 },
  // ── Coupon-only future payments ───────────────────────────────────────────
  { paymentDate: "2026-07-09", coupon: 1.75, amortization: 0.0, residual: 1.0 },
  { paymentDate: "2027-01-09", coupon: 1.75, amortization: 0.0, residual: 1.0 },
  { paymentDate: "2027-07-09", coupon: 1.75, amortization: 0.0, residual: 1.0 },
  // ── Amortization phase (3.57% per period) ─────────────────────────────────
  { paymentDate: "2028-01-09", coupon: 1.75, amortization: 3.57, residual: 0.9643 },
  { paymentDate: "2028-07-09", coupon: 1.69, amortization: 3.57, residual: 0.9286 },
  { paymentDate: "2029-01-09", coupon: 1.63, amortization: 3.57, residual: 0.8929 },
  { paymentDate: "2029-07-09", coupon: 1.56, amortization: 3.57, residual: 0.8572 },
  { paymentDate: "2030-01-09", coupon: 2.09, amortization: 3.57, residual: 0.8215 },
  { paymentDate: "2030-07-09", coupon: 2.0, amortization: 3.57, residual: 0.7858 },
  { paymentDate: "2031-01-09", coupon: 1.92, amortization: 3.57, residual: 0.7501 },
  { paymentDate: "2031-07-09", coupon: 1.83, amortization: 3.57, residual: 0.7144 },
  { paymentDate: "2032-01-09", coupon: 1.74, amortization: 3.57, residual: 0.6787 },
  { paymentDate: "2032-07-09", coupon: 1.65, amortization: 3.57, residual: 0.643 },
  { paymentDate: "2033-01-09", coupon: 1.57, amortization: 3.57, residual: 0.6073 },
  { paymentDate: "2033-07-09", coupon: 1.48, amortization: 3.57, residual: 0.5716 },
  { paymentDate: "2034-01-09", coupon: 1.39, amortization: 3.57, residual: 0.5359 },
  { paymentDate: "2034-07-09", coupon: 1.31, amortization: 3.57, residual: 0.5002 },
  { paymentDate: "2035-01-09", coupon: 1.22, amortization: 3.57, residual: 0.4645 },
  { paymentDate: "2035-07-09", coupon: 1.13, amortization: 3.57, residual: 0.4288 },
  { paymentDate: "2036-01-09", coupon: 1.04, amortization: 3.57, residual: 0.3931 },
  { paymentDate: "2036-07-09", coupon: 0.96, amortization: 3.57, residual: 0.3574 },
  { paymentDate: "2037-01-09", coupon: 0.87, amortization: 3.57, residual: 0.3217 },
  { paymentDate: "2037-07-09", coupon: 0.78, amortization: 3.57, residual: 0.286 },
  { paymentDate: "2038-01-09", coupon: 0.7, amortization: 3.57, residual: 0.2503 },
  { paymentDate: "2038-07-09", coupon: 0.61, amortization: 3.57, residual: 0.2146 },
  { paymentDate: "2039-01-09", coupon: 0.52, amortization: 3.57, residual: 0.1789 },
  { paymentDate: "2039-07-09", coupon: 0.44, amortization: 3.57, residual: 0.1432 },
  { paymentDate: "2040-01-09", coupon: 0.35, amortization: 3.57, residual: 0.1075 },
  { paymentDate: "2040-07-09", coupon: 0.26, amortization: 3.57, residual: 0.0718 },
  { paymentDate: "2041-01-09", coupon: 0.17, amortization: 3.57, residual: 0.0357 },
  { paymentDate: "2041-07-09", coupon: 0.09, amortization: 3.57, residual: 0.0 },
];

/**
 * AL30D — Bono del Tesoro en Dólares 2030 (USD MEP, Ley Argentina)
 * Step-up coupon schedule per official prospectus (2020 restructuring).
 * Amortization: 4% Jul 2024, then 8% each period through Jul 2030.
 * Full cashflow history included so past payments can be displayed in the UI.
 */
const al30dCashflows: CF[] = [
  // ── Past payments ─────────────────────────────────────────────────────────
  { paymentDate: "2021-07-09", coupon: 0.11, amortization: 0.0, residual: 1.0 },
  { paymentDate: "2022-01-09", coupon: 0.25, amortization: 0.0, residual: 1.0 },
  { paymentDate: "2022-07-09", coupon: 0.25, amortization: 0.0, residual: 1.0 },
  { paymentDate: "2023-01-09", coupon: 0.25, amortization: 0.0, residual: 1.0 },
  { paymentDate: "2023-07-09", coupon: 0.25, amortization: 0.0, residual: 1.0 },
  { paymentDate: "2024-01-09", coupon: 0.38, amortization: 0.0, residual: 1.0 },
  { paymentDate: "2024-07-09", coupon: 0.38, amortization: 4.0, residual: 0.96 },
  { paymentDate: "2025-01-09", coupon: 0.36, amortization: 8.0, residual: 0.88 },
  { paymentDate: "2025-07-09", coupon: 0.33, amortization: 8.0, residual: 0.8 },
  { paymentDate: "2026-01-09", coupon: 0.3, amortization: 8.0, residual: 0.72 },
  // ── Future payments ───────────────────────────────────────────────────────
  { paymentDate: "2026-07-09", coupon: 0.27, amortization: 8.0, residual: 0.64 },
  { paymentDate: "2027-01-09", coupon: 0.24, amortization: 8.0, residual: 0.56 },
  { paymentDate: "2027-07-09", coupon: 0.21, amortization: 8.0, residual: 0.48 },
  { paymentDate: "2028-01-09", coupon: 0.42, amortization: 8.0, residual: 0.4 },
  { paymentDate: "2028-07-09", coupon: 0.35, amortization: 8.0, residual: 0.32 },
  { paymentDate: "2029-01-09", coupon: 0.28, amortization: 8.0, residual: 0.24 },
  { paymentDate: "2029-07-09", coupon: 0.21, amortization: 8.0, residual: 0.16 },
  { paymentDate: "2030-01-09", coupon: 0.14, amortization: 8.0, residual: 0.08 },
  { paymentDate: "2030-07-09", coupon: 0.07, amortization: 8.0, residual: 0.0 },
];

/**
 * AL35D — Bono del Tesoro en Dólares 2035 (USD MEP, Ley Argentina)
 * Step-up coupon schedule per official prospectus (2020 restructuring).
 * Coupon amounts are expressed per $100 face value (already on residual basis).
 * No amortization until Jan 2031; then 10% each period through Jul 2035.
 * Full cashflow history included so past payments can be displayed in the UI.
 */
const al35dCashflows: CF[] = [
  // ── Past payments ─────────────────────────────────────────────────────────
  { paymentDate: "2021-07-09", coupon: 0.11, amortization: 0.0, residual: 1.0 },
  { paymentDate: "2022-01-09", coupon: 0.56, amortization: 0.0, residual: 1.0 },
  { paymentDate: "2022-07-09", coupon: 0.56, amortization: 0.0, residual: 1.0 },
  { paymentDate: "2023-01-09", coupon: 0.75, amortization: 0.0, residual: 1.0 },
  { paymentDate: "2023-07-09", coupon: 0.75, amortization: 0.0, residual: 1.0 },
  { paymentDate: "2024-01-09", coupon: 1.81, amortization: 0.0, residual: 1.0 },
  { paymentDate: "2024-07-09", coupon: 1.81, amortization: 0.0, residual: 1.0 },
  { paymentDate: "2025-01-09", coupon: 2.06, amortization: 0.0, residual: 1.0 },
  { paymentDate: "2025-07-09", coupon: 2.06, amortization: 0.0, residual: 1.0 },
  { paymentDate: "2026-01-09", coupon: 2.06, amortization: 0.0, residual: 1.0 },
  // ── Coupon-only phase (residual = 100%) ───────────────────────────────────
  { paymentDate: "2026-07-09", coupon: 2.06, amortization: 0.0, residual: 1.0 },
  { paymentDate: "2027-01-09", coupon: 2.06, amortization: 0.0, residual: 1.0 },
  { paymentDate: "2027-07-09", coupon: 2.06, amortization: 0.0, residual: 1.0 },
  { paymentDate: "2028-01-09", coupon: 2.38, amortization: 0.0, residual: 1.0 },
  { paymentDate: "2028-07-09", coupon: 2.38, amortization: 0.0, residual: 1.0 },
  { paymentDate: "2029-01-09", coupon: 2.5, amortization: 0.0, residual: 1.0 },
  { paymentDate: "2029-07-09", coupon: 2.5, amortization: 0.0, residual: 1.0 },
  { paymentDate: "2030-01-09", coupon: 2.5, amortization: 0.0, residual: 1.0 },
  { paymentDate: "2030-07-09", coupon: 2.5, amortization: 0.0, residual: 1.0 },
  // ── Amortization phase (10% per period) ───────────────────────────────────
  { paymentDate: "2031-01-09", coupon: 2.5, amortization: 10.0, residual: 0.9 },
  { paymentDate: "2031-07-09", coupon: 2.25, amortization: 10.0, residual: 0.8 },
  { paymentDate: "2032-01-09", coupon: 2.0, amortization: 10.0, residual: 0.7 },
  { paymentDate: "2032-07-09", coupon: 1.75, amortization: 10.0, residual: 0.6 },
  { paymentDate: "2033-01-09", coupon: 1.5, amortization: 10.0, residual: 0.5 },
  { paymentDate: "2033-07-09", coupon: 1.25, amortization: 10.0, residual: 0.4 },
  { paymentDate: "2034-01-09", coupon: 1.0, amortization: 10.0, residual: 0.3 },
  { paymentDate: "2034-07-09", coupon: 0.75, amortization: 10.0, residual: 0.2 },
  { paymentDate: "2035-01-09", coupon: 0.5, amortization: 10.0, residual: 0.1 },
  { paymentDate: "2035-07-09", coupon: 0.25, amortization: 10.0, residual: 0.0 },
];

/**
 * GD46D — Bono del Tesoro en Dólares 2046 (USD MEP, Ley Nueva York)
 * Step-up coupon schedule per official prospectus (2020 restructuring).
 * Amortization: 2.27% per period starting Jan 2025 (44 equal installments through Jul 2046).
 * Full cashflow history included so past payments can be displayed in the UI.
 */
const gd46dCashflows: CF[] = [
  // ── Past payments ─────────────────────────────────────────────────────────
  { paymentDate: "2021-07-09", coupon: 0.11, amortization: 0.0,  residual: 1.0    },
  { paymentDate: "2022-01-09", coupon: 0.56, amortization: 0.0,  residual: 1.0    },
  { paymentDate: "2022-07-09", coupon: 0.56, amortization: 0.0,  residual: 1.0    },
  { paymentDate: "2023-01-09", coupon: 0.75, amortization: 0.0,  residual: 1.0    },
  { paymentDate: "2023-07-09", coupon: 0.75, amortization: 0.0,  residual: 1.0    },
  { paymentDate: "2024-01-09", coupon: 1.81, amortization: 0.0,  residual: 1.0    },
  { paymentDate: "2024-07-09", coupon: 1.81, amortization: 0.0,  residual: 1.0    },
  { paymentDate: "2025-01-09", coupon: 2.06, amortization: 2.27, residual: 0.9773 },
  { paymentDate: "2025-07-09", coupon: 2.02, amortization: 2.27, residual: 0.9545 },
  { paymentDate: "2026-01-09", coupon: 1.97, amortization: 2.27, residual: 0.9318 },
  // ── Future payments ───────────────────────────────────────────────────────
  { paymentDate: "2026-07-09", coupon: 1.92, amortization: 2.27, residual: 0.9091 },
  { paymentDate: "2027-01-09", coupon: 1.88, amortization: 2.27, residual: 0.8864 },
  { paymentDate: "2027-07-09", coupon: 1.83, amortization: 2.27, residual: 0.8636 },
  { paymentDate: "2028-01-09", coupon: 1.89, amortization: 2.27, residual: 0.8409 },
  { paymentDate: "2028-07-09", coupon: 1.84, amortization: 2.27, residual: 0.8182 },
  { paymentDate: "2029-01-09", coupon: 2.05, amortization: 2.27, residual: 0.7955 },
  { paymentDate: "2029-07-09", coupon: 1.99, amortization: 2.27, residual: 0.7727 },
  { paymentDate: "2030-01-09", coupon: 1.93, amortization: 2.27, residual: 0.75   },
  { paymentDate: "2030-07-09", coupon: 1.88, amortization: 2.27, residual: 0.7273 },
  { paymentDate: "2031-01-09", coupon: 1.82, amortization: 2.27, residual: 0.7045 },
  { paymentDate: "2031-07-09", coupon: 1.76, amortization: 2.27, residual: 0.6818 },
  { paymentDate: "2032-01-09", coupon: 1.70, amortization: 2.27, residual: 0.6591 },
  { paymentDate: "2032-07-09", coupon: 1.65, amortization: 2.27, residual: 0.6364 },
  { paymentDate: "2033-01-09", coupon: 1.59, amortization: 2.27, residual: 0.6136 },
  { paymentDate: "2033-07-09", coupon: 1.53, amortization: 2.27, residual: 0.5909 },
  { paymentDate: "2034-01-09", coupon: 1.48, amortization: 2.27, residual: 0.5682 },
  { paymentDate: "2034-07-09", coupon: 1.42, amortization: 2.27, residual: 0.5455 },
  { paymentDate: "2035-01-09", coupon: 1.36, amortization: 2.27, residual: 0.5227 },
  { paymentDate: "2035-07-09", coupon: 1.31, amortization: 2.27, residual: 0.5    },
  { paymentDate: "2036-01-09", coupon: 1.25, amortization: 2.27, residual: 0.4773 },
  { paymentDate: "2036-07-09", coupon: 1.19, amortization: 2.27, residual: 0.4545 },
  { paymentDate: "2037-01-09", coupon: 1.14, amortization: 2.27, residual: 0.4318 },
  { paymentDate: "2037-07-09", coupon: 1.08, amortization: 2.27, residual: 0.4091 },
  { paymentDate: "2038-01-09", coupon: 1.02, amortization: 2.27, residual: 0.3864 },
  { paymentDate: "2038-07-09", coupon: 0.97, amortization: 2.27, residual: 0.3636 },
  { paymentDate: "2039-01-09", coupon: 0.91, amortization: 2.27, residual: 0.3409 },
  { paymentDate: "2039-07-09", coupon: 0.85, amortization: 2.27, residual: 0.3182 },
  { paymentDate: "2040-01-09", coupon: 0.80, amortization: 2.27, residual: 0.2955 },
  { paymentDate: "2040-07-09", coupon: 0.74, amortization: 2.27, residual: 0.2727 },
  { paymentDate: "2041-01-09", coupon: 0.68, amortization: 2.27, residual: 0.25   },
  { paymentDate: "2041-07-09", coupon: 0.63, amortization: 2.27, residual: 0.2273 },
  { paymentDate: "2042-01-09", coupon: 0.57, amortization: 2.27, residual: 0.2045 },
  { paymentDate: "2042-07-09", coupon: 0.51, amortization: 2.27, residual: 0.1818 },
  { paymentDate: "2043-01-09", coupon: 0.45, amortization: 2.27, residual: 0.1591 },
  { paymentDate: "2043-07-09", coupon: 0.40, amortization: 2.27, residual: 0.1364 },
  { paymentDate: "2044-01-09", coupon: 0.34, amortization: 2.27, residual: 0.1136 },
  { paymentDate: "2044-07-09", coupon: 0.28, amortization: 2.27, residual: 0.0909 },
  { paymentDate: "2045-01-09", coupon: 0.23, amortization: 2.27, residual: 0.0682 },
  { paymentDate: "2045-07-09", coupon: 0.17, amortization: 2.27, residual: 0.0455 },
  { paymentDate: "2046-01-09", coupon: 0.11, amortization: 2.27, residual: 0.0227 },
  { paymentDate: "2046-07-09", coupon: 0.06, amortization: 2.27, residual: 0.0    },
];

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
  AE38D: ae38dCashflows,
  GD38D: ae38dCashflows,
  AL41D: al41dCashflows,
  GD41D: al41dCashflows,
  GD46D: gd46dCashflows,
  AL30D: al30dCashflows,
  GD30D: al30dCashflows,
  AL35D: al35dCashflows,
  GD35D: al35dCashflows,
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
