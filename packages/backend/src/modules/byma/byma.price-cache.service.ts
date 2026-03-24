import { and, eq, gt } from "drizzle-orm";
import { db } from "../../db/index.js";
import { priceCache } from "../../db/schema.js";
import { env } from "../../config/env.js";
import type { IBYMAClient } from "./byma.types.js";
import type { MarketPrice } from "@investor-app/shared";

/**
 * Wraps any IBYMAClient implementation with a SQLite-backed price cache.
 *
 * Cache behaviour:
 * - TTL is driven by CACHE_TTL_PRICE_SECONDS (default: 300s / 5 minutes).
 * - On cache hit: returns the cached price immediately, no external call.
 * - On cache miss or expiry: fetches from the underlying client, stores result, returns it.
 *
 * This service is the single point of contact for price data in the application.
 * No other module should call IBYMAClient directly.
 */
export class PriceCacheService {
  constructor(private readonly bymaClient: IBYMAClient) {}

  /**
   * Returns the current market price for a ticker.
   * Serves from cache if available and fresh; otherwise fetches from BYMA.
   */
  async getPrice(ticker: string): Promise<MarketPrice> {
    const cached = await this.getFromCache(ticker);
    if (cached !== null) return cached;

    const fresh = await this.bymaClient.getPrice(ticker);
    await this.saveToCache(fresh.ticker, fresh.price, "USD");

    return {
      ticker: fresh.ticker,
      price: fresh.price,
      currency: "USD",
      fetchedAt: fresh.updatedAt,
    };
  }

  /**
   * Returns prices for multiple tickers.
   * Each ticker is served from cache if fresh; stale tickers are fetched in bulk.
   */
  async getPrices(tickers: string[]): Promise<Map<string, MarketPrice>> {
    const result = new Map<string, MarketPrice>();
    const staleTickers: string[] = [];

    // Check cache for each ticker
    for (const ticker of tickers) {
      const cached = await this.getFromCache(ticker);
      if (cached !== null) {
        result.set(ticker, cached);
      } else {
        staleTickers.push(ticker);
      }
    }

    // Fetch all stale tickers in one call
    if (staleTickers.length > 0) {
      const fresh = await this.bymaClient.getPrices(staleTickers);

      for (const [ticker, data] of fresh.entries()) {
        await this.saveToCache(ticker, data.price, "USD");
        const price: MarketPrice = {
          ticker,
          price: data.price,
          currency: "USD",
          fetchedAt: data.updatedAt,
        };
        result.set(ticker, price);
      }
    }

    return result;
  }

  // ── Private helpers ──────────────────────────────────────────────────────────

  private async getFromCache(ticker: string): Promise<MarketPrice | null> {
    const now = new Date().toISOString();

    const rows = await db
      .select()
      .from(priceCache)
      .where(and(eq(priceCache.ticker, ticker), gt(priceCache.expiresAt, now)))
      .orderBy(priceCache.fetchedAt)
      .limit(1);

    const row = rows[0];
    if (row === undefined) return null;

    return {
      ticker: row.ticker,
      price: row.price,
      currency: row.currency,
      fetchedAt: row.fetchedAt,
    };
  }

  private async saveToCache(ticker: string, price: number, currency: "ARS" | "USD"): Promise<void> {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + env.CACHE_TTL_PRICE_SECONDS * 1000);

    await db.insert(priceCache).values({
      ticker,
      price,
      currency,
      fetchedAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
    });
  }
}
