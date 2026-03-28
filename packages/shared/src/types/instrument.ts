/** Supported instrument types in the Argentine market. */
export type InstrumentType = "BOND" | "LETTER" | "ON";

/**
 * Market sub-categories within each InstrumentType.
 * Drives UI grouping and filtering — independent from FlowType (which drives the calculator).
 *
 * Sovereign bonds (BOND):
 *   BONCAP          — Bonos de Capitalización ARS (CAPITALIZABLE, > 1 year)
 *   BOPREAL         — Bonos para la Reconstrucción de una Argentina Libre (BCRA, USD)
 *   DUAL            — Bonos Duales ARS (max LECAP+spread / TAMAR)
 *   SOV_USD_ARG     — Soberanos USD Ley Argentina
 *   SOV_USD_EXT     — Soberanos USD Ley Extranjera
 *   TASA_FIJA_ARS   — Soberanos Tasa Fija ARS
 *   TASA_CER        — Soberanos Tasa Fija + CER ARS
 *   TASA_FLOTANTE   — Soberanos Tasa Flotante ARS
 *   SUBSOBERANO_DL  — Sub-soberanos Dollar Linked
 *   SUBSOBERANO_FIJA_USD — Sub-soberanos Tasa Fija USD
 *   SUBSOBERANO_FLOTANTE — Sub-soberanos Tasa Flotante ARS
 *
 * Treasury letters (LETTER):
 *   LECAP           — Letras de Capitalización ARS (< 1 year)
 *   LECER           — Letras ajustadas por CER ARS
 *   TAMAR           — Letras/Bonos TAMAR ARS
 *   LELINK          — Letras Dollar-Linked ARS
 *
 * Corporate bonds (ON):
 *   ON_LEY_NAC      — ONs Ley Nacional
 *   ON_LEY_EXT      — ONs Ley Extranjera
 *   ON_UVA          — ONs ajustadas por UVA
 *   ON_TAMAR        — ONs tasa TAMAR
 *   ON_DL           — ONs Dollar Linked
 */
export type InstrumentSubtype =
  // BOND — sovereign
  | "BONCAP"
  | "BOPREAL"
  | "DUAL"
  | "SOV_USD_ARG"
  | "SOV_USD_EXT"
  | "TASA_FIJA_ARS"
  | "TASA_CER"
  | "TASA_FLOTANTE"
  | "SUBSOBERANO_DL"
  | "SUBSOBERANO_FIJA_USD"
  | "SUBSOBERANO_FLOTANTE"
  // LETTER
  | "LECAP"
  | "LECER"
  | "TAMAR"
  | "LELINK"
  // ON
  | "ON_LEY_NAC"
  | "ON_LEY_EXT"
  | "ON_UVA"
  | "ON_TAMAR"
  | "ON_DL";

/** Currencies in which instruments can be denominated. */
export type Currency = "ARS" | "USD" | "USD_LINKED";

/** Core instrument data — static, not price-sensitive. */
export interface Instrument {
  id: number;
  ticker: string;
  name: string;
  type: InstrumentType;
  subtype: InstrumentSubtype;
  currency: Currency;
  market: string;
  issuer: string | null;
  maturityDate: string; // ISO 8601
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

/** A single cash flow event (coupon + amortization on a given date). */
export interface Cashflow {
  id: number;
  instrumentId: number;
  paymentDate: string; // ISO 8601
  coupon: number;
  amortization: number;
  /** Remaining capital percentage after this payment (0–1). */
  residual: number;
}

/** Supported cash flow structures for Argentine fixed income instruments. */
export type FlowType =
  | "BULLET"
  | "AMORTIZABLE"
  | "ZERO_COUPON"
  | "CAPITALIZABLE"
  | "CER"
  | "USD_LINKED"
  | "TAMAR"
  | "DUAL";

/** Parameters required to generate cash flows, vary by FlowType. */
export interface FlowGeneratorParams {
  flowType: FlowType;
  issueDate: string; // ISO 8601
  maturityDate: string; // ISO 8601
  faceValue: number; // Nominal value (typically 100)

  // BULLET / AMORTIZABLE / CER / USD_LINKED
  couponRate?: number | undefined; // Annual rate (decimal)
  couponFrequency?: number | undefined; // Payments per year: 1=annual, 2=semi, 4=quarterly, 12=monthly
  firstCouponDate?: string | undefined; // ISO 8601 — used when couponSchedule is not provided

  /**
   * Explicit coupon payment dates, in order.
   * When provided, overrides auto-generation from firstCouponDate + couponFrequency.
   * Use for instruments with irregular payment calendars (e.g. AO27).
   */
  couponSchedule?: { date: string }[] | undefined;

  // AMORTIZABLE
  amortizationSchedule?: { date: string; pct: number }[] | undefined; // pct = fraction of face value

  // CAPITALIZABLE
  capitalizationRate?: number | undefined; // Annual TNA (decimal)

  // CER / USD_LINKED
  adjustmentCoefficient?: number | undefined; // Manual coefficient applied to all flows
  adjustmentBase?: number | undefined; // Base value at issuance
}
