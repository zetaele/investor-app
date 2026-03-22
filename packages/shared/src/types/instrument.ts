/** Supported instrument types in the Argentine market. */
export type InstrumentType = "BOND" | "LETTER" | "ON";

/** Currencies in which instruments can be denominated. */
export type Currency = "ARS" | "USD" | "USD_LINKED";

/** Core instrument data — static, not price-sensitive. */
export interface Instrument {
  id: number;
  ticker: string;
  name: string;
  type: InstrumentType;
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
  | "USD_LINKED";

/** Parameters required to generate cash flows, vary by FlowType. */
export interface FlowGeneratorParams {
  flowType: FlowType;
  issueDate: string; // ISO 8601
  maturityDate: string; // ISO 8601
  faceValue: number; // Nominal value (typically 100)

  // BULLET / AMORTIZABLE / CER / USD_LINKED
  couponRate?: number; // Annual rate (decimal)
  couponFrequency?: number; // Payments per year: 1=annual, 2=semi, 4=quarterly, 12=monthly
  firstCouponDate?: string; // ISO 8601

  // AMORTIZABLE
  amortizationSchedule?: { date: string; pct: number }[]; // pct = fraction of face value

  // CAPITALIZABLE
  capitalizationRate?: number; // Annual TNA (decimal)

  // CER / USD_LINKED
  adjustmentCoefficient?: number; // Manual coefficient applied to all flows
}
