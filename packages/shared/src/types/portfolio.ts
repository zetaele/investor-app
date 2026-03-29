import type { Currency } from "./instrument.js";
import type { BondCalculations, MarketPrice } from "./analytics.js";
import type { CalendarMonth } from "./calendar.js";

export type { CalendarMonth };

/** A single instrument position inside a portfolio. */
export interface PortfolioHolding {
  ticker: string;
  name: string;
  type: string;
  currency: Currency;
  maturityDate: string;
  /** Nominal units held (VN). */
  quantity: number;
  /** Clean price at time of purchase (optional). */
  purchasePrice?: number;
  market: MarketPrice;
  calculations: BondCalculations;
  /** Current market value = quantity × dirtyPrice / 100. */
  currentValue: number;
  /** Unrealised P&L = currentValue − (quantity × purchasePrice / 100). Only present if purchasePrice is set. */
  gainLoss?: number;
}

/** Summary of a portfolio (for list view). */
export interface PortfolioSummary {
  id: number;
  name: string;
  holdingCount: number;
  createdAt: string;
}

/** Full portfolio detail including holdings and their metrics. */
export interface PortfolioDetail {
  id: number;
  name: string;
  holdings: PortfolioHolding[];
  createdAt: string;
  updatedAt: string;
}
