import type { BymaMarketPrice, IBYMAClient } from "./byma.types.js";
import { BymaInstrumentNotFoundError } from "./byma.types.js";

/**
 * Wraps a primary IBYMAClient with a fallback.
 *
 * For each ticker the primary is tried first. If it throws
 * BymaInstrumentNotFoundError (ticker not in the live feed), the fallback
 * is queried instead. Any other error from the primary propagates unchanged.
 *
 * This allows the mock client to serve as a static price source for illiquid
 * instruments that are not covered by the live data provider.
 */
export class FallbackBymaClient implements IBYMAClient {
  constructor(
    private readonly primary: IBYMAClient,
    private readonly fallback: IBYMAClient,
  ) {}

  async getPrice(ticker: string): Promise<BymaMarketPrice> {
    try {
      return await this.primary.getPrice(ticker);
    } catch (err) {
      if (err instanceof BymaInstrumentNotFoundError) {
        return this.fallback.getPrice(ticker);
      }
      throw err;
    }
  }

  async getPrices(tickers: string[]): Promise<Map<string, BymaMarketPrice>> {
    const primaryResult = await this.primary.getPrices(tickers);

    const missing = tickers.filter((t) => !primaryResult.has(t));
    if (missing.length === 0) return primaryResult;

    const fallbackResult = await this.fallback.getPrices(missing);

    const merged = new Map(primaryResult);
    for (const [ticker, price] of fallbackResult) {
      merged.set(ticker, price);
    }
    return merged;
  }
}
