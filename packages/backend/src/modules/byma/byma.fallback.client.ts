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

  /**
   * Returns the market price for a single ticker.
   * Falls back to the secondary client only on BymaInstrumentNotFoundError;
   * all other errors from the primary propagate unchanged.
   *
   * @param ticker - Instrument ticker (e.g. "AL30D").
   */
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

  /**
   * Returns prices for multiple tickers.
   * Tickers resolved by the primary are returned as-is; any ticker missing
   * from the primary result is fetched from the fallback client in a second pass.
   *
   * @param tickers - List of instrument tickers to resolve.
   */
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
