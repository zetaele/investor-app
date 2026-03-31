import type { FastifyBaseLogger } from "fastify";
import type { BymaMarketPrice, IBYMAClient } from "./byma.types.js";
import { BymaClientError, BymaInstrumentNotFoundError } from "./byma.types.js";

const BASE_URL = "https://data912.com";

/** Match the data912 source refresh rate to avoid redundant fetches. */
const SNAPSHOT_TTL_MS = 20_000;

interface Data912Item {
  symbol: string;
  /** Close / last price */
  c: number;
  /** Trading volume */
  v: number;
}

/**
 * Data source client backed by the data912.com free market data API.
 *
 * Fetches all three endpoints (arg_bonds, arg_notes, arg_corp) in parallel
 * and merges them into a single in-memory snapshot. The snapshot is reused for
 * SNAPSHOT_TTL_MS milliseconds so individual price lookups don't trigger
 * redundant HTTP calls — the outer PriceCacheService handles the longer SQLite TTL.
 *
 * Concurrent callers that arrive while a fetch is in progress all await the
 * same promise, so data912 receives at most 3 requests per refresh cycle.
 *
 * No authentication required. Rate limit: 120 req/min.
 * @see https://data912.com/openapi.json
 */
export class Data912Client implements IBYMAClient {
  private snapshot: Map<string, BymaMarketPrice> | null = null;
  private snapshotAt = 0;
  /** In-flight fetch promise shared across all concurrent callers. */
  private fetchInFlight: Promise<Map<string, BymaMarketPrice>> | null = null;

  constructor(private readonly log: FastifyBaseLogger) {}

  // ── Snapshot management ────────────────────────────────────────────────────

  private getSnapshot(): Promise<Map<string, BymaMarketPrice>> {
    const now = Date.now();
    if (this.snapshot !== null && now - this.snapshotAt < SNAPSHOT_TTL_MS) {
      return Promise.resolve(this.snapshot);
    }

    // Deduplicate concurrent callers: all await the same in-flight promise
    // instead of each firing their own 3 HTTP requests to data912.
    if (this.fetchInFlight !== null) {
      this.log.debug("data912: snapshot stale, in-flight fetch in progress — awaiting");
      return this.fetchInFlight;
    }

    this.log.info("data912: fetching all endpoints");
    this.fetchInFlight = this.fetchAllEndpoints().finally(() => {
      this.fetchInFlight = null;
    });

    return this.fetchInFlight;
  }

  private async fetchAllEndpoints(): Promise<Map<string, BymaMarketPrice>> {
    const t0 = Date.now();

    let bonds: Data912Item[], notes: Data912Item[], corp: Data912Item[];
    try {
      [bonds, notes, corp] = await Promise.all([
        this.fetchEndpoint("/live/arg_bonds"),
        this.fetchEndpoint("/live/arg_notes"),
        this.fetchEndpoint("/live/arg_corp"),
      ]);
    } catch (err) {
      this.log.error({ err }, "data912: fetch failed");
      throw err;
    }

    const updatedAt = new Date().toISOString();
    const map = new Map<string, BymaMarketPrice>();

    for (const item of [...bonds, ...notes, ...corp]) {
      if (item.symbol && item.c > 0) {
        map.set(item.symbol, {
          ticker: item.symbol,
          price: item.c,
          volume: item.v ?? null,
          updatedAt,
        });
      }
    }

    this.snapshot = map;
    this.snapshotAt = Date.now();
    this.log.info(
      { instruments: map.size, ms: Date.now() - t0 },
      "data912: snapshot updated",
    );

    return map;
  }

  private async fetchEndpoint(path: string): Promise<Data912Item[]> {
    let response: Response;

    try {
      response = await fetch(`${BASE_URL}${path}`, {
        headers: { Accept: "application/json" },
      });
    } catch (err) {
      throw new BymaClientError(`Failed to reach data912 API at ${path}`, err);
    }

    if (!response.ok) {
      throw new BymaClientError(`data912 API returned ${response.status} for ${path}`);
    }

    const raw: unknown = await response.json();

    if (!Array.isArray(raw)) {
      throw new BymaClientError(`Unexpected response shape from data912 at ${path}`);
    }

    return raw as Data912Item[];
  }

  // ── IBYMAClient ────────────────────────────────────────────────────────────

  async getPrice(ticker: string): Promise<BymaMarketPrice> {
    const snapshot = await this.getSnapshot();
    const price = snapshot.get(ticker);
    if (!price) throw new BymaInstrumentNotFoundError(ticker);
    return price;
  }

  async getPrices(tickers: string[]): Promise<Map<string, BymaMarketPrice>> {
    const snapshot = await this.getSnapshot();
    const result = new Map<string, BymaMarketPrice>();
    for (const ticker of tickers) {
      const price = snapshot.get(ticker);
      if (price !== undefined) result.set(ticker, price);
    }
    return result;
  }
}
