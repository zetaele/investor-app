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
 */
export class FxService {
  private readonly PAIRS = ["ARS/USD_OFFICIAL", "ARS/USD_BLUE", "ARS/USD_MEP", "ARS/USD_CCL"] as const;

  async getRates(): Promise<FxRates> {
    const cached = await this.getFromCache();
    if (cached !== null) return cached;

    const fresh = await this.fetchFreshRates();
    await this.saveToCache(fresh);
    return fresh;
  }

  // ── Private helpers ──────────────────────────────────────────────────────────

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
      official: { pair: official.pair, rate: official.rate, fetchedAt },
      blue:     { pair: blue.pair,     rate: blue.rate,     fetchedAt },
      mep:      { pair: mep.pair,      rate: mep.rate,      fetchedAt },
      ccl:      { pair: ccl.pair,      rate: ccl.rate,      fetchedAt },
    };
  }

  private async saveToCache(rates: FxRates): Promise<void> {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + env.CACHE_TTL_FX_SECONDS * 1000);

    await db.delete(fxCache);

    await db.insert(fxCache).values([
      { pair: rates.official.pair, rate: rates.official.rate, fetchedAt: now.toISOString(), expiresAt: expiresAt.toISOString() },
      { pair: rates.blue.pair,     rate: rates.blue.rate,     fetchedAt: now.toISOString(), expiresAt: expiresAt.toISOString() },
      { pair: rates.mep.pair,      rate: rates.mep.rate,      fetchedAt: now.toISOString(), expiresAt: expiresAt.toISOString() },
      { pair: rates.ccl.pair,      rate: rates.ccl.rate,      fetchedAt: now.toISOString(), expiresAt: expiresAt.toISOString() },
    ]);
  }

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

    const oficial = find("oficial");
    const blue    = find("blue");
    const mep     = find("mep");
    const ccl     = find("ccl");

    if (!oficial || !blue || !mep || !ccl) {
      console.warn("FxService: unexpected dolarapi response shape, using fallback");
      return this.fallbackRates();
    }

    return {
      official: { pair: "ARS/USD_OFFICIAL", rate: oficial.venta, fetchedAt: now },
      blue:     { pair: "ARS/USD_BLUE",     rate: blue.venta,    fetchedAt: now },
      mep:      { pair: "ARS/USD_MEP",      rate: mep.venta,     fetchedAt: now },
      ccl:      { pair: "ARS/USD_CCL",      rate: ccl.venta,     fetchedAt: now },
    };
  }

  private fallbackRates(): FxRates {
    const now = new Date().toISOString();
    return {
      official: { pair: "ARS/USD_OFFICIAL", rate: 1065,  fetchedAt: now },
      blue:     { pair: "ARS/USD_BLUE",     rate: 1215,  fetchedAt: now },
      mep:      { pair: "ARS/USD_MEP",      rate: 1195,  fetchedAt: now },
      ccl:      { pair: "ARS/USD_CCL",      rate: 1210,  fetchedAt: now },
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
