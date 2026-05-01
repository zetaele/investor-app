import { and, gt } from "drizzle-orm";
import { db } from "../../db/index.js";
import { fxCache } from "../../db/schema.js";
import { env } from "../../config/env.js";
import type { FxRates } from "@investor-app/shared";

/**
 * Provides ARS/USD exchange rates (official, blue, MEP, CCL) with SQLite caching.
 *
 * Data source: dolarapi.com (public, no auth required).
 * TTL is driven by CACHE_TTL_FX_SECONDS (default: 600s / 10 minutes).
 *
 * dolarapi.com casa codes: "oficial", "blue", "bolsa" (MEP), "contadoconliqui" (CCL).
 */
export class FxService {
  /**
   * Returns the current ARS/USD exchange rates (official, blue, MEP, CCL).
   * Serves from the SQLite cache if the data is still fresh; otherwise fetches
   * from dolarapi.com, persists the result, and returns it.
   */
  async getRates(): Promise<FxRates> {
    const cached = await this.getFromCache();
    if (cached !== null) return cached;

    const fresh = await this.fetchFreshRates();
    await this.saveToCache(fresh);
    return fresh;
  }

  // ── Private helpers ──────────────────────────────────────────────────────────

  /**
   * Attempts to read all four rate pairs from the SQLite cache.
   * Returns null if any pair is missing or if the cache has expired.
   */
  private async getFromCache(): Promise<FxRates | null> {
    const now = new Date().toISOString();

    const rows = await db
      .select()
      .from(fxCache)
      .where(and(gt(fxCache.expiresAt, now)))
      .orderBy(fxCache.fetchedAt)
      .limit(4);

    if (rows.length < 4) return null;

    const official = rows.find((r) => r.pair === "ARS/USD_OFFICIAL");
    const blue     = rows.find((r) => r.pair === "ARS/USD_BLUE");
    const mep      = rows.find((r) => r.pair === "ARS/USD_MEP");
    const ccl      = rows.find((r) => r.pair === "ARS/USD_CCL");

    if (!official || !blue || !mep || !ccl) return null;

    const fetchedAt = official.fetchedAt;
    return {
      official: { pair: official.pair, buy: official.buy, sell: official.sell, fetchedAt },
      blue:     { pair: blue.pair,     buy: blue.buy,     sell: blue.sell,     fetchedAt },
      mep:      { pair: mep.pair,      buy: mep.buy,      sell: mep.sell,      fetchedAt },
      ccl:      { pair: ccl.pair,      buy: ccl.buy,      sell: ccl.sell,      fetchedAt },
    };
  }

  /**
   * Persists all four rate pairs to the SQLite cache, replacing any existing rows.
   * TTL is set to now + CACHE_TTL_FX_SECONDS.
   */
  private async saveToCache(rates: FxRates): Promise<void> {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + env.CACHE_TTL_FX_SECONDS * 1000);

    await db.delete(fxCache);

    await db.insert(fxCache).values([
      { pair: rates.official.pair, buy: rates.official.buy, sell: rates.official.sell, fetchedAt: now.toISOString(), expiresAt: expiresAt.toISOString() },
      { pair: rates.blue.pair,     buy: rates.blue.buy,     sell: rates.blue.sell,     fetchedAt: now.toISOString(), expiresAt: expiresAt.toISOString() },
      { pair: rates.mep.pair,      buy: rates.mep.buy,      sell: rates.mep.sell,      fetchedAt: now.toISOString(), expiresAt: expiresAt.toISOString() },
      { pair: rates.ccl.pair,      buy: rates.ccl.buy,      sell: rates.ccl.sell,      fetchedAt: now.toISOString(), expiresAt: expiresAt.toISOString() },
    ]);
  }

  /**
   * Fetches all four rate pairs from dolarapi.com.
   * Falls back to hardcoded rates if the external API is unreachable or returns
   * an unexpected response shape.
   */
  private async fetchFreshRates(): Promise<FxRates> {
    let items: DolarApiItem[];

    try {
      const response = await fetch("https://dolarapi.com/v1/dolares");
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      items = (await response.json()) as DolarApiItem[];
    } catch (err) {
      console.warn("FxService: dolarapi unreachable, using fallback rates", err);
      return this.fallbackRates();
    }

    const find = (casa: string) => items.find((i) => i.casa === casa);
    const now  = new Date().toISOString();

    // dolarapi.com casa codes: "oficial", "blue", "bolsa" (MEP), "contadoconliqui" (CCL)
    const oficial = find("oficial");
    const blue    = find("blue");
    const bolsa   = find("bolsa");        // MEP / dólar bolsa
    const ccl     = find("contadoconliqui");

    if (!oficial || !blue || !bolsa || !ccl) {
      console.warn("FxService: unexpected dolarapi response shape, using fallback");
      return this.fallbackRates();
    }

    return {
      official: { pair: "ARS/USD_OFFICIAL", buy: oficial.compra, sell: oficial.venta, fetchedAt: now },
      blue:     { pair: "ARS/USD_BLUE",     buy: blue.compra,    sell: blue.venta,    fetchedAt: now },
      mep:      { pair: "ARS/USD_MEP",      buy: bolsa.compra,   sell: bolsa.venta,   fetchedAt: now },
      ccl:      { pair: "ARS/USD_CCL",      buy: ccl.compra,     sell: ccl.venta,     fetchedAt: now },
    };
  }

  /**
   * Returns hardcoded fallback rates used when dolarapi.com is unreachable.
   * Values should be kept roughly up to date but are not critical for correctness.
   */
  private fallbackRates(): FxRates {
    const now = new Date().toISOString();
    return {
      official: { pair: "ARS/USD_OFFICIAL", buy: 1355, sell: 1405, fetchedAt: now },
      blue:     { pair: "ARS/USD_BLUE",     buy: 1390, sell: 1410, fetchedAt: now },
      mep:      { pair: "ARS/USD_MEP",      buy: 1422, sell: 1422, fetchedAt: now },
      ccl:      { pair: "ARS/USD_CCL",      buy: 1470, sell: 1470, fetchedAt: now },
    };
  }
}

// ── dolarapi.com response shape ───────────────────────────────────────────────

interface DolarApiItem {
  casa: string;
  nombre: string;
  compra: number;
  venta: number;
}
