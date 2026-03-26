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
  // ── Sovereign bonds — USD (D suffix = USD MEP) ───────────────────────────
  AE38D: 77.78, // ~50% of par, approximate March 2026
  GD38D: 79.0,  // NY law premium over AE38D, approximate March 2026
  AL41D: 69.46, // ~55% of par, approximate March 2026
  GD41D: 71.0,  // NY law premium over AL41D, approximate March 2026
  GD46D: 73.0,  // approximate March 2026
  AL30D: 61.2, // ~67.5% of par, approximate March 2026
  GD30D: 62.5, // NY law premium over AL30D, approximate March 2026
  AL35D: 75.05, // ~60% of par, approximate March 2026
  GD35D: 76.5,  // NY law premium over AL35D, approximate March 2026
  AO27D: 102,

  // ── Treasury letters — ARS (LECAP, price = Paridad × VT × 100 per 100 VN) ─
  S17A6: 108.48, // VT_mat≈109.89, Paridad≈98.71%, maturity 2026-04-17
  S30A6: 124.56, // VT_mat≈125.56, Paridad≈99.20%, maturity 2026-04-30
  S31L6: 107.26, // VT_mat≈114.27, Paridad≈93.86%, maturity 2026-07-31
  T30J6: 135.55, // VT=136.9083, Paridad=99.00%, pago total=144.89, TIR≈29.18% TEA

  // ── TAMAR / Dual sovereign bonds — ARS (price = paridad × VT × 100) ──────
  TMF27: 106.19, // paridad=1.0176, VT=1.0436, TIR nominal≈41.33%
  TTJ26: 148.92, // paridad=0.9747, VT=152.77, TIR≈46.13%
  TTS26: 150.70, // paridad=0.9489, VT=155.03, TIR≈48.83%

  // ── CER-adjusted sovereign bonds — ARS (price = paridad × 100) ──────────
  TX28:  96.23, // paridad=0.9623, valorPar=19.185114, TIR real≈5.27%
  TZX28: 84.68, // paridad=0.8468, valorPar=3.597229,  TIR real≈7.62%

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
