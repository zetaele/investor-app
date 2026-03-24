import type { BymaMarketPrice, IBYMAClient } from "./byma.types.js";
import { BymaInstrumentNotFoundError } from "./byma.types.js";

/**
 * Approximate prices as of March 2026.
 *
 * USD-denominated instruments: price as % of face value in USD.
 * ARS-denominated instruments (letters): price as % of face value in ARS.
 *   Note: PriceCacheService currently hardcodes currency = "USD"; ARS instruments
 *   are a known limitation to address when real price feeds are integrated.
 *
 * Sources: BYMA / IOL market data, manually updated for development purposes.
 */
const MOCK_PRICES: Record<string, number> = {
  // ── Sovereign bonds — USD ────────────────────────────────────────────────
  AL30: 68.5,
  GD30: 72.0,
  AL35: 61.5,
  GD35: 64.5,
  AL41: 56.5,
  GD41: 59.0,
  GD46: 54.0,
  AO27D: 101.5,

  // ── Treasury letters — ARS (price as % of face value 100, in ARS) ────────
  S30A6: 97.8, // ~37 days to maturity
  S29M6: 95.8, // ~66 days
  S30J6: 93.5, // ~98 days
  S31L6: 91.2, // ~129 days

  // ── Corporate bonds / ONs — USD ──────────────────────────────────────────
  YPF24: 99.5, // near maturity Jul 2026
  PAMP27: 95.5,
  TECO27: 98.2, // near maturity Mar 2027
};

/**
 * Mock IBYMAClient for development.
 *
 * Returns realistic prices with a small random variation (±0.3%) to simulate
 * live market behaviour. Switch to BymaOfficialClient (or a broker-specific
 * implementation) in production once a data license is in place.
 */
export class MockBymaClient implements IBYMAClient {
  private jitter(base: number): number {
    const pct = (Math.random() - 0.5) * 0.006; // ±0.3%
    return Math.round(base * (1 + pct) * 100) / 100;
  }

  private build(ticker: string, base: number): BymaMarketPrice {
    return {
      ticker,
      price: this.jitter(base),
      volume: Math.floor(Math.random() * 500_000) + 50_000,
      updatedAt: new Date().toISOString(),
    };
  }

  async getPrice(ticker: string): Promise<BymaMarketPrice> {
    const base = MOCK_PRICES[ticker];
    if (base === undefined) throw new BymaInstrumentNotFoundError(ticker);
    await new Promise((r) => setTimeout(r, 40 + Math.random() * 80));
    return this.build(ticker, base);
  }

  async getPrices(tickers: string[]): Promise<Map<string, BymaMarketPrice>> {
    await new Promise((r) => setTimeout(r, 40 + Math.random() * 80));
    const result = new Map<string, BymaMarketPrice>();
    for (const ticker of tickers) {
      const base = MOCK_PRICES[ticker];
      if (base !== undefined) result.set(ticker, this.build(ticker, base));
    }
    return result;
  }
}
