import { and, gt } from 'drizzle-orm'
import { db } from '../../db/index.js'
import { fxCache } from '../../db/schema.js'
import { env } from '../../config/env.js'
import type { FxRates } from '@investor-app/shared'

/**
 * Provides ARS/USD exchange rates (official, MEP, CCL) with SQLite caching.
 *
 * Current data source: bluelytics.com.ar (public, no auth required).
 * TTL is driven by CACHE_TTL_FX_SECONDS (default: 600s / 10 minutes).
 *
 * Replace the fetch logic in fetchFreshRates() with a different provider
 * if needed — the rest of the service remains unchanged.
 */
export class FxService {
  private readonly PAIRS = ['ARS/USD_OFFICIAL', 'ARS/USD_MEP', 'ARS/USD_CCL'] as const

  /**
   * Returns the latest ARS/USD rates.
   * Serves from cache if available and fresh; otherwise fetches from the provider.
   */
  async getRates(): Promise<FxRates> {
    const cached = await this.getFromCache()
    if (cached !== null) return cached

    const fresh = await this.fetchFreshRates()
    await this.saveToCache(fresh)
    return fresh
  }

  // ── Private helpers ──────────────────────────────────────────────────────────

  private async getFromCache(): Promise<FxRates | null> {
    const now = new Date().toISOString()

    const rows = await db
      .select()
      .from(fxCache)
      .where(and(gt(fxCache.expiresAt, now)))
      .orderBy(fxCache.fetchedAt)
      .limit(3)

    if (rows.length < 3) return null

    const official = rows.find((r) => r.pair === 'ARS/USD_OFFICIAL')
    const mep = rows.find((r) => r.pair === 'ARS/USD_MEP')
    const ccl = rows.find((r) => r.pair === 'ARS/USD_CCL')

    if (official === undefined || mep === undefined || ccl === undefined) return null

    const fetchedAt = official.fetchedAt

    return {
      official: { pair: official.pair, rate: official.rate, fetchedAt },
      mep:      { pair: mep.pair,      rate: mep.rate,      fetchedAt },
      ccl:      { pair: ccl.pair,      rate: ccl.rate,      fetchedAt },
    }
  }

  private async saveToCache(rates: FxRates): Promise<void> {
    const now = new Date()
    const expiresAt = new Date(now.getTime() + env.CACHE_TTL_FX_SECONDS * 1000)

    // Delete stale entries before inserting fresh ones
    await db.delete(fxCache)

    await db.insert(fxCache).values([
      {
        pair: rates.official.pair,
        rate: rates.official.rate,
        fetchedAt: now.toISOString(),
        expiresAt: expiresAt.toISOString(),
      },
      {
        pair: rates.mep.pair,
        rate: rates.mep.rate,
        fetchedAt: now.toISOString(),
        expiresAt: expiresAt.toISOString(),
      },
      {
        pair: rates.ccl.pair,
        rate: rates.ccl.rate,
        fetchedAt: now.toISOString(),
        expiresAt: expiresAt.toISOString(),
      },
    ])
  }

  /**
   * Fetches fresh exchange rates from bluelytics.com.ar.
   *
   * Bluelytics provides official, blue (informal), and derived MEP/CCL rates.
   * We use it as a proxy for MEP and CCL since these are publicly available.
   */
  private async fetchFreshRates(): Promise<FxRates> {
    let data: BluelyticsResponse

    try {
      const response = await fetch('https://api.bluelytics.com.ar/v2/latest')
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      data = (await response.json()) as BluelyticsResponse
    } catch (err) {
      // Fallback to hardcoded rates if the provider is unreachable
      console.warn('FxService: bluelytics unreachable, using fallback rates', err)
      return this.fallbackRates()
    }

    const now = new Date().toISOString()

    return {
      official: {
        pair: 'ARS/USD_OFFICIAL',
        rate: data.oficial.value_sell,
        fetchedAt: now,
      },
      mep: {
        pair: 'ARS/USD_MEP',
        // Bluelytics doesn't provide MEP directly; use blue as proxy for now
        // TODO: replace with a dedicated MEP source (e.g. IOL or RAVA)
        rate: data.blue.value_sell * 0.97,
        fetchedAt: now,
      },
      ccl: {
        pair: 'ARS/USD_CCL',
        rate: data.blue.value_sell,
        fetchedAt: now,
      },
    }
  }

  /**
   * Fallback rates used when the FX provider is unreachable.
   * Update these periodically to stay roughly accurate during development.
   */
  private fallbackRates(): FxRates {
    const now = new Date().toISOString()
    return {
      official: { pair: 'ARS/USD_OFFICIAL', rate: 1050,  fetchedAt: now },
      mep:      { pair: 'ARS/USD_MEP',      rate: 1180,  fetchedAt: now },
      ccl:      { pair: 'ARS/USD_CCL',      rate: 1200,  fetchedAt: now },
    }
  }
}

// ── Bluelytics response shape ─────────────────────────────────────────────────

interface BluelyticsRate {
  value_buy: number
  value_sell: number
}

interface BluelyticsResponse {
  oficial: BluelyticsRate
  blue: BluelyticsRate
}
