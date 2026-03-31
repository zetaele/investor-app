/**
 * Represents a real-time market price returned by any BYMA data source.
 */
export interface BymaMarketPrice {
  ticker: string;
  /** Last traded price in the instrument's native currency. */
  price: number;
  /** 24h trading volume. */
  volume: number | null;
  /** Last update timestamp from the data source. */
  updatedAt: string;
  /** Origin of the price: live feed or static mock fallback. */
  source: "live" | "mock";
}

/**
 * Contract that any BYMA data source must implement.
 * Swap implementations without touching any other module.
 */
export interface IBYMAClient {
  /**
   * Fetches the current market price for a single instrument.
   * Throws BymaInstrumentNotFoundError if the ticker is unknown to the source.
   */
  getPrice(ticker: string): Promise<BymaMarketPrice>;

  /**
   * Fetches current market prices for multiple instruments in a single call.
   * Returns a map of ticker → price. Missing tickers are omitted from the result.
   */
  getPrices(tickers: string[]): Promise<Map<string, BymaMarketPrice>>;
}

/**
 * Thrown when a ticker is not found in the BYMA data source.
 */
export class BymaInstrumentNotFoundError extends Error {
  constructor(ticker: string) {
    super(`Ticker not found in BYMA data source: ${ticker}`);
    this.name = "BymaInstrumentNotFoundError";
  }
}

/**
 * Thrown when the BYMA data source is unreachable or returns an unexpected response.
 */
export class BymaClientError extends Error {
  constructor(
    message: string,
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = "BymaClientError";
  }
}
