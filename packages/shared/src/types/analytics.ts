import type { Currency } from "./instrument.js";

/** Real-time market price for an instrument. */
export interface MarketPrice {
  ticker: string;
  price: number;
  currency: Currency;
  fetchedAt: string;
}

/** Results of the financial calculations for a bond/letter/ON. */
export interface BondCalculations {
  /** Yield to Maturity (decimal, e.g. 0.1823 = 18.23%). */
  ytm: number;
  /** Modified duration in years. */
  modifiedDuration: number;
  /** Clean price (dirty price minus accrued interest). */
  cleanPrice: number;
  /** Dirty price (market price including accrued interest). */
  dirtyPrice: number;
  /** Accrued interest since last coupon. */
  accruedInterest: number;
  /** Price as a fraction of par (e.g. 0.625 = 62.5%). */
  parityPct: number;
  /** Tasa Nominal Anual: m × ((1+YTM)^(1/m) − 1), where m = payments per year. */
  tna: number;
  /** Current yield: annual coupon / dirty price. NaN for zero-coupon instruments. */
  currentYield: number;
}

/** Cashflow enriched with its present value. */
export interface CashflowWithPV {
  paymentDate: string;
  coupon: number;
  amortization: number;
  residual: number;
  presentValue: number;
}

/** Full analysis response for a single instrument. */
export interface InstrumentAnalysis {
  ticker: string;
  name: string;
  type: string;
  currency: Currency;
  maturityDate: string;
  market: MarketPrice;
  calculations: BondCalculations;
  cashflows: CashflowWithPV[];
  displayCurrency: Currency;
}

/** Result of a price/YTM simulation for an instrument. */
export interface SimulationResult {
  ticker: string;
  /** Whether the user supplied a price (price→YTM) or a YTM (YTM→price). */
  inputType: "price" | "ytm";
  /** The value supplied by the user (price in currency units or YTM as decimal). */
  inputValue: number;
  calculations: BondCalculations;
  cashflows: CashflowWithPV[];
}

/** Entry in a multi-instrument comparison response. */
export interface CompareEntry {
  ticker: string;
  name: string;
  type: string;
  currency: Currency;
  maturityDate: string;
  price: number;
  calculations: BondCalculations;
}
