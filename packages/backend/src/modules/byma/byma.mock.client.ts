import type { BymaMarketPrice, IBYMAClient } from "./byma.types.js";
import { BymaInstrumentNotFoundError } from "./byma.types.js";

/**
 * Closing prices as of 2026-03-27 (Rava).
 *
 * USD-denominated instruments: price as % of face value in USD.
 * ARS-denominated instruments: nominal ARS price per unit as quoted on BYMA.
 */
const MOCK_PRICES: Record<string, number> = {
  // ── Sovereign bonds — USD (D suffix = USD MEP) ───────────────────────────
  AE38D: 76.9,
  GD38D: 78.85,
  AL41D: 69.05,
  GD41D: 69.79,
  GD46D: 67.96,
  AL30D: 60.55,
  GD30D: 62.33,
  AL35D: 74.07,
  GD35D: 75.30,
  AO27D: 101.9,
  AL29D: 61.69,
  AN29D: 91.3,
  GD29D: 63.98,

  // ── Treasury letters — ARS/USD-linked (LELINK, price in ARS) ─────────────
  D30A6: 138780,
  D30S6: 137500,

  // ── Floating-rate ARS sovereign bonds ────────────────────────────────────
  PR17: 795.6,  // price in ARS per unit (VN≈855)

  // ── Fixed-rate ARS sovereign bonds ───────────────────────────────────────
  TO26:  100.95,
  TY30P: 117.4,

  // ── Treasury letters — ARS CER-adjusted (LECER, price in ARS) ────────────
  X15Y6: 104.47,
  X29Y6: 111.37,
  X31L6: 108.1,
  X30S6: 100.45,
  X30N6: 110.5,

  // ── Treasury letters — ARS (LECAP, price in ARS per 100 VN) ──────────────
  S17A6: 108.88,
  S30A6: 124.8,
  S31L6: 108.2,
  T30J6: 136.25,
  S15Y6: 101.94,
  S29Y6: 126.8,
  S31G6: 114.14,
  S30S6: 103.00,
  S30O6: 116.00,
  S30N6: 109.1,

  // ── TAMAR / Dual sovereign bonds — ARS ───────────────────────────────────
  TMF27: 107.6,
  TTJ26: 153.1,
  TTS26: 151.9,

  // ── CER-adjusted sovereign bonds — ARS (price in ARS) ────────────────────
  TX28: 1915.00,
  TZX28: 308.4,

  // ── BOPREAL — BCRA bonds USD ──────────────────────────────────────────────
  BPA7D: 103.3,
  BPA8D: 90.71,
  BPB7D: 102.5,
  BPB8D: 89.0,
  BPC7D: 102.25,
  BPD7D: 102.1,
  BPY6D: 36.3,

  // ── BONCAP — ARS (price in ARS per 100 VN) ───────────────────────────────
  T15E7: 130.60,
  T30A7: 118.2,
  T31Y7: 111.45,
  T30J7: 113.00,

  // ── Dual ──────────────────────────────────────────────────────────────────
  TTD26: 150.25,

  // ── TAMAR letters — ARS ───────────────────────────────────────────────────
  M30A6: 113.1,
  M31G6: 117.3,
  CO2D7: 101.5,

  // ── TZX / CER zeros — ARS (price in ARS) ─────────────────────────────────
  TZX26: 368.4,
  TZX27: 348.5,
  TZXD6: 267.25,
  TZXO6: 151.7,
  TZXM7: 196.25,
  TZXD7: 246.2,
  TZXA7: 110.5,

  // ── CER bonds with coupon — ARS (price in ARS) ────────────────────────────
  TX26:  1314.00,
  TX31:  1359.00,
  DICP:  48570.00,
  PARP:  32690.00,
  CUAP:  39870.00,
  DIP0:  48500.00,
  PAP0:  32750.00,

  // ── Sub-soberanos USD ─────────────────────────────────────────────────────
  BA37D:  69.6,
  BB37D:  70.0,
  BC37D:  67.7,
  CO26D:  10.59,
  CO32D:  109.45,
  ERF25D: 45.6,
  ERM33D: 101.0,
  NDT5D:  72.75,
  PM29D:  45.85,
  S24DD:  51.9,
  SFD4D:  102.0,

  // ── Sub-soberanos ARS flotante ────────────────────────────────────────────
  BAF27:  103.0,
  BDC28:  103.0,
  PBY26:  105.3,
  PMD26:  101.5,

  // ── Corporate bonds / ONs — USD ──────────────────────────────────────────
  YPF24:  99.5,
  PAMP27: 95.5,
  TECO27: 98.2,
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
