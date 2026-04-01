/** Foreign exchange rate between two currencies. */
export interface FxRate {
  pair: string; // e.g. "ARS/USD"
  rate: number;
  fetchedAt: string;
}

/** All available FX rates returned by the /fx/rates endpoint. */
export interface FxRates {
  official: FxRate;
  blue: FxRate;
  mep: FxRate;
  ccl: FxRate;
}
