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
  // ── Soberanos USD Ley Argentina (cat 7) ───────────────────────────────────
  {
    ticker: "AE38D",
    name: "Bono del Tesoro en Dólares 2038 (Ley Argentina) - USD",
    type: "BOND" as const,
    subtype: "SOV_USD_ARG" as const,
    currency: "USD" as const,
    issuer: "Tesoro Nacional",
    maturityDate: "2038-01-09",
  },
  {
    ticker: "AL41D",
    name: "Bono del Tesoro en Dólares 2041 (Ley Argentina) - USD",
    type: "BOND" as const,
    subtype: "SOV_USD_ARG" as const,
    currency: "USD" as const,
    issuer: "Tesoro Nacional",
    maturityDate: "2041-07-09",
  },
  {
    ticker: "AL30D",
    name: "Bono del Tesoro en Dólares 2030 (Ley Argentina) - USD",
    type: "BOND" as const,
    subtype: "SOV_USD_ARG" as const,
    currency: "USD" as const,
    issuer: "Tesoro Nacional",
    maturityDate: "2030-07-09",
  },
  {
    ticker: "AL35D",
    name: "Bono del Tesoro en Dólares 2035 (Ley Argentina) - USD",
    type: "BOND" as const,
    subtype: "SOV_USD_ARG" as const,
    currency: "USD" as const,
    issuer: "Tesoro Nacional",
    maturityDate: "2035-07-09",
  },
  {
    ticker: "AO27D",
    name: "Bono del Tesoro en Dólares 2027 (Ley Argentina)",
    type: "BOND" as const,
    subtype: "SOV_USD_ARG" as const,
    currency: "USD" as const,
    issuer: "Tesoro Nacional",
    maturityDate: "2027-10-29",
  },
  // ── Soberanos USD Ley Extranjera (cat 8) ──────────────────────────────────
  {
    ticker: "GD38D",
    name: "Bono del Tesoro en Dólares 2038 (Ley Nueva York) - USD",
    type: "BOND" as const,
    subtype: "SOV_USD_EXT" as const,
    currency: "USD" as const,
    issuer: "Tesoro Nacional",
    maturityDate: "2038-01-09",
  },
  {
    ticker: "GD46D",
    name: "Bono del Tesoro en Dólares 2046 (Ley Nueva York) - USD",
    type: "BOND" as const,
    subtype: "SOV_USD_EXT" as const,
    currency: "USD" as const,
    issuer: "Tesoro Nacional",
    maturityDate: "2046-07-09",
  },
  {
    ticker: "GD41D",
    name: "Bono del Tesoro en Dólares 2041 (Ley Nueva York) - USD",
    type: "BOND" as const,
    subtype: "SOV_USD_EXT" as const,
    currency: "USD" as const,
    issuer: "Tesoro Nacional",
    maturityDate: "2041-07-09",
  },
  {
    ticker: "GD30D",
    name: "Bono del Tesoro en Dólares 2030 (Ley Nueva York) - USD",
    type: "BOND" as const,
    subtype: "SOV_USD_EXT" as const,
    currency: "USD" as const,
    issuer: "Tesoro Nacional",
    maturityDate: "2030-07-09",
  },
  {
    ticker: "GD35D",
    name: "Bono del Tesoro en Dólares 2035 (Ley Nueva York) - USD",
    type: "BOND" as const,
    subtype: "SOV_USD_EXT" as const,
    currency: "USD" as const,
    issuer: "Tesoro Nacional",
    maturityDate: "2035-07-09",
  },
  // ── BONCAP — Bonos de Capitalización ARS (cat 1) ──────────────────────────
  // Cashflows per 100 VN nominal. Single payment = VT_maturity × 100.
  {
    ticker: "T30J6",
    name: "BONCAP Vencimiento 30/06/2026",
    type: "BOND" as const,
    subtype: "BONCAP" as const,
    currency: "ARS" as const,
    issuer: "Tesoro Nacional",
    maturityDate: "2026-06-30",
    flowType: "CAPITALIZABLE" as const,
  },
  // ── Bonos Duales ARS (cat 2) ──────────────────────────────────────────────
  {
    ticker: "TTJ26",
    name: "Bono del Tesoro Dual (LECAP+2.19%/TAMAR) Vto 30/06/2026",
    type: "BOND" as const,
    subtype: "DUAL" as const,
    currency: "ARS" as const,
    issuer: "Tesoro Nacional",
    maturityDate: "2026-06-30",
    flowType: "DUAL" as const,
  },
  {
    ticker: "TTS26",
    name: "Bono del Tesoro Dual (LECAP+2.17%/TAMAR) Vto 15/09/2026",
    type: "BOND" as const,
    subtype: "DUAL" as const,
    currency: "ARS" as const,
    issuer: "Tesoro Nacional",
    maturityDate: "2026-09-15",
    flowType: "DUAL" as const,
  },
  // ── Tasa Fija + CER ARS (cat 10) ──────────────────────────────────────────
  {
    ticker: "TX28",
    name: "Bono del Tesoro en Pesos ajustado por CER 2.25% 2028",
    type: "BOND" as const,
    subtype: "TASA_CER" as const,
    currency: "ARS" as const,
    issuer: "Tesoro Nacional",
    maturityDate: "2028-11-09",
    flowType: "CER" as const,
  },
  {
    ticker: "TZX28",
    name: "Bono del Tesoro en Pesos ajustado por CER 0% 2028",
    type: "BOND" as const,
    subtype: "TASA_CER" as const,
    currency: "ARS" as const,
    issuer: "Tesoro Nacional",
    maturityDate: "2028-06-30",
    flowType: "CER" as const,
  },
  // ── LECAP — Letras de Capitalización ARS (cat 5) ──────────────────────────
  // Single payment at maturity = VT_maturity × 100 per 100 VN.
  {
    ticker: "S17A6",
    name: "LECAP Vencimiento 17/04/2026",
    type: "LETTER" as const,
    subtype: "LECAP" as const,
    currency: "ARS" as const,
    issuer: "Tesoro Nacional",
    maturityDate: "2026-04-17",
    flowType: "CAPITALIZABLE" as const,
  },
  {
    ticker: "S30A6",
    name: "LECAP Vencimiento 30/04/2026",
    type: "LETTER" as const,
    subtype: "LECAP" as const,
    currency: "ARS" as const,
    issuer: "Tesoro Nacional",
    maturityDate: "2026-04-30",
    flowType: "CAPITALIZABLE" as const,
  },
  {
    ticker: "S31L6",
    name: "LECAP Vencimiento 31/07/2026",
    type: "LETTER" as const,
    subtype: "LECAP" as const,
    currency: "ARS" as const,
    issuer: "Tesoro Nacional",
    maturityDate: "2026-07-31",
    flowType: "CAPITALIZABLE" as const,
  },
  // ── Letras TAMAR ARS (cat 4) ──────────────────────────────────────────────
  {
    ticker: "TMF27",
    name: "Letra del Tesoro Nacional en Pesos (TAMAR) Vto 26/02/2027",
    type: "LETTER" as const,
    subtype: "TAMAR" as const,
    currency: "ARS" as const,
    issuer: "Tesoro Nacional",
    maturityDate: "2027-02-26",
    flowType: "TAMAR" as const,
  },
  // ── Corporate bonds / ONs ─────────────────────────────────────────────────
  {
    ticker: "YPF24",
    name: "Obligación Negociable YPF 2026 Serie I",
    type: "ON" as const,
    subtype: "ON_LEY_NAC" as const,
    currency: "USD" as const,
    issuer: "YPF S.A.",
    maturityDate: "2026-07-15",
  },
  {
    ticker: "PAMP27",
    name: "Obligación Negociable Pampa Energía 2027",
    type: "ON" as const,
    subtype: "ON_LEY_NAC" as const,
    currency: "USD" as const,
    issuer: "Pampa Energía S.A.",
    maturityDate: "2027-07-21",
  },
  {
    ticker: "TECO27",
    name: "Obligación Negociable Telecom Argentina 2027",
    type: "ON" as const,
    subtype: "ON_LEY_NAC" as const,
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
 * LECAP / Bono Capitalizable — ARS instruments.
 * Single cashflow at maturity = VT_vencimiento × 100 per 100 VN nominal.
 * VT_maturity computed as: VT_now × (1 + TNM)^(months_D30360)
 * Prices in mock client are expressed as VT_now × Paridad × 100 per 100 VN.
 * Reference date for VT calculations: 2026-03-26.
 */
const s17a6Cashflows: CF[] = [
  // S17A6: TNM=3.0%, VT=1.060938, maturity 2026-04-17 → months=0.7 → VT_mat≈109.89
  { paymentDate: "2026-04-17", coupon: 0.0, amortization: 109.89, residual: 0.0 },
];
const s30a6Cashflows: CF[] = [
  // S30A6: TNM=3.0%, VT=1.074016, maturity 2026-04-30 → months=1.133 → VT_mat≈125.56
  { paymentDate: "2026-04-30", coupon: 0.0, amortization: 125.56, residual: 0.0 },
];
const s31l6Cashflows: CF[] = [
  // S31L6: TNM=2.75%, VT=1.051333, maturity 2026-07-31 → months=3.167 → VT_mat≈114.27
  { paymentDate: "2026-07-31", coupon: 0.0, amortization: 114.27, residual: 0.0 },
];
const t30j6Cashflows: CF[] = [
  // T30J6: TEM=2.15%/mes, VT actual=136.9083, pago total al vencimiento=144.89 per 100 VN
  // (Interés acumulado 44.89 + amortización 100.00 per Abbaco, 2026-03-26)
  { paymentDate: "2026-06-30", coupon: 0.0, amortization: 144.89, residual: 0.0 },
];

/**
 * TMF27 — Bono del Tesoro Nacional en Pesos (TAMAR) Vto 26/02/2027
 * Bullet, zero-coupon structure: accretes daily at TAMAR floating rate.
 * Estimated VT_maturity = VT_now × (1 + TAMAR × remaining_days/360)
 *   = 1.043593 × (1 + 0.364965 × 337/360) ≈ 140.0 per 100 VN (snapshot 2026-03-26)
 * Day count: D30/360. Current TAMAR: 36.4965%.
 */
const tmf27Cashflows: CF[] = [
  // ── Past payments ─────────────────────────────────────────────────────────
  { paymentDate: "2026-02-13", coupon: 0.0, amortization: 0.0,   residual: 1.0 },
  // ── Future payments ───────────────────────────────────────────────────────
  { paymentDate: "2027-02-26", coupon: 0.0, amortization: 140.0, residual: 0.0 },
];

/**
 * TTJ26 — Bono del Tesoro Nacional Dual (LECAP+2.19% / TAMAR) Vto 30/06/2026
 * Bullet. Pays max(LECAP_TNM + 2.19% annual, TAMAR) — capitalizes until maturity.
 * Estimated VT_maturity = 152.77 × (1 + 38.19% × 96/360) ≈ 168.3 per 100 VN (snapshot 2026-03-26)
 *   where 38.19% = LECAP ~36% + 2.19% spread (currently the binding constraint).
 */
const ttj26Cashflows: CF[] = [
  // ── Past payments ─────────────────────────────────────────────────────────
  { paymentDate: "2025-01-29", coupon: 0.0, amortization: 0.0,   residual: 1.0 },
  // ── Future payments ───────────────────────────────────────────────────────
  { paymentDate: "2026-06-30", coupon: 0.0, amortization: 168.3, residual: 0.0 },
];

/**
 * TTS26 — Bono del Tesoro Nacional Dual (LECAP+2.17% / TAMAR) Vto 15/09/2026
 * Bullet. Pays max(LECAP_TNM + 2.17% annual, TAMAR) — capitalizes until maturity.
 * Estimated VT_maturity = 155.03 × (1 + 38.17% × 169/360) ≈ 182.8 per 100 VN (snapshot 2026-03-26)
 *   169 days D30/360 from 2026-03-26 to 2026-09-15. Spread 2.17% (vs TTJ26's 2.19%).
 */
const tts26Cashflows: CF[] = [
  // ── Past payments ─────────────────────────────────────────────────────────
  { paymentDate: "2025-01-29", coupon: 0.0, amortization: 0.0,   residual: 1.0 },
  // ── Future payments ───────────────────────────────────────────────────────
  { paymentDate: "2026-09-15", coupon: 0.0, amortization: 182.8, residual: 0.0 },
];

/**
 * TX28 — Bono del Tesoro en Pesos ajustado por CER 2.25% VTO. 2028
 * Sinkable: 10% amortization per semester starting May 2024 (10 installments).
 * Coupon: 2.25% annual, semiannual, on residual outstanding.
 * Cashflows expressed as % of original 100 VN nominal.
 * Current residual: 60% (4 amortizations already paid: May/Nov 2024, May/Nov 2025).
 * Day count: D30/360.
 */
const tx28Cashflows: CF[] = [
  // ── Past payments ─────────────────────────────────────────────────────────
  { paymentDate: "2021-05-09", coupon: 1.53, amortization: 0.0,  residual: 1.0  },
  { paymentDate: "2021-11-09", coupon: 1.13, amortization: 0.0,  residual: 1.0  },
  { paymentDate: "2022-05-09", coupon: 1.13, amortization: 0.0,  residual: 1.0  },
  { paymentDate: "2022-11-09", coupon: 1.13, amortization: 0.0,  residual: 1.0  },
  { paymentDate: "2023-05-09", coupon: 1.13, amortization: 0.0,  residual: 1.0  },
  { paymentDate: "2023-11-09", coupon: 1.13, amortization: 0.0,  residual: 1.0  },
  { paymentDate: "2024-05-09", coupon: 1.13, amortization: 10.0, residual: 0.9  },
  { paymentDate: "2024-11-09", coupon: 1.01, amortization: 10.0, residual: 0.8  },
  { paymentDate: "2025-05-09", coupon: 0.9,  amortization: 10.0, residual: 0.7  },
  { paymentDate: "2025-11-09", coupon: 0.79, amortization: 10.0, residual: 0.6  },
  // ── Future payments ───────────────────────────────────────────────────────
  { paymentDate: "2026-05-09", coupon: 0.68, amortization: 10.0, residual: 0.5  },
  { paymentDate: "2026-11-09", coupon: 0.56, amortization: 10.0, residual: 0.4  },
  { paymentDate: "2027-05-09", coupon: 0.45, amortization: 10.0, residual: 0.3  },
  { paymentDate: "2027-11-09", coupon: 0.34, amortization: 10.0, residual: 0.2  },
  { paymentDate: "2028-05-09", coupon: 0.23, amortization: 10.0, residual: 0.1  },
  { paymentDate: "2028-11-09", coupon: 0.11, amortization: 10.0, residual: 0.0  },
];

/**
 * TZX28 — Bono del Tesoro en Pesos ajustado por CER 0% VTO. 30/06/2028
 * Bullet, zero-coupon. Single payment of 100% at maturity.
 * Valor par: 3.597229 (CER inflation factor, snapshot 2026-03-26).
 * Day count: REAL/365.
 */
const tzx28Cashflows: CF[] = [
  // ── Past payments ─────────────────────────────────────────────────────────
  { paymentDate: "2024-02-01", coupon: 0.0, amortization: 0.0,   residual: 1.0  },
  // ── Future payments ───────────────────────────────────────────────────────
  { paymentDate: "2028-06-30", coupon: 0.0, amortization: 100.0, residual: 0.0  },
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
  S17A6: s17a6Cashflows,
  S30A6: s30a6Cashflows,
  S31L6: s31l6Cashflows,
  T30J6: t30j6Cashflows,
  TMF27: tmf27Cashflows,
  TTJ26: ttj26Cashflows,
  TTS26: tts26Cashflows,
  TX28: tx28Cashflows,
  TZX28: tzx28Cashflows,
  YPF24: ypf24Cashflows,
  PAMP27: pamp27Cashflows,
  TECO27: teco27Cashflows,
};

/**
 * adjustmentCoefficient = valor par (snapshot 2026-03-26).
 * Updated periodically as CER index publishes new values.
 */
const cerConfigMap: Record<string, number> = {
  TMF27: 1.043593,  // valor técnico actual (VT_now); couponRate = TAMAR actual en instrumentConfig
  TTJ26: 152.77,    // valor técnico actual (VT_now); crece a max(LECAP+2.19%, TAMAR)
  TTS26: 155.03,    // valor técnico actual (VT_now); crece a max(LECAP+2.17%, TAMAR)
  TX28:  19.185114,
  TZX28: 3.597229,
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

  console.log("🌱 Seeding instrument config (CER valor par)...");
  for (const [ticker, valorPar] of Object.entries(cerConfigMap)) {
    const instrumentId = tickerToId.get(ticker);
    if (instrumentId === undefined) {
      console.warn(`⚠ ${ticker}: not found, skipping config`);
      continue;
    }
    await db.insert(instrumentConfig).values({ instrumentId, adjustmentCoefficient: valorPar });
    console.log(`  ✓ ${ticker}: valorPar=${valorPar}`);
  }

  console.log("✅ Seed complete!");
  client.close();
}

seed().catch((err) => {
  console.error("❌ Seed failed:", err);
  client.close();
  process.exit(1);
});
