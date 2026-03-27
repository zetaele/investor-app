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
  GD38D: 79.0, // NY law premium over AE38D, approximate March 2026
  AL41D: 69.46, // ~55% of par, approximate March 2026
  GD41D: 71.0, // NY law premium over AL41D, approximate March 2026
  GD46D: 73.0, // approximate March 2026
  AL30D: 61.2, // ~67.5% of par, approximate March 2026
  GD30D: 62.5, // NY law premium over AL30D, approximate March 2026
  AL35D: 75.05, // ~60% of par, approximate March 2026
  GD35D: 76.5, // NY law premium over AL35D, approximate March 2026
  AO27D: 102,

  // ── Treasury letters — ARS/USD-linked (LELINK, price = Paridad × VT) ───────
  D30A6: 136700, // paridad=98.1%, VT=139344, TIR=22.83% TEA; Abbaco 2026-03-27
  D30S6: 134700, // paridad=97.0%, VT=139344, TIR= 6.84% TEA; Abbaco 2026-03-27

  // ── Floating-rate ARS sovereign bonds ────────────────────────────────────
  PR17: 93.00,   // BADLAR quarterly; TIR=36.54% TEA; normalized per-100-VN (BYMA: 795/unit, VN≈855)

  // ── Fixed-rate ARS sovereign bonds ───────────────────────────────────────
  TO26:  100.20, // 15.50% TNA semi-anual, TIR=31.06% TEA; Abbaco 2026-03-27
  TY30P: 118.70, // 29.50% TNA semi-anual, TIR=27.80% TEA; Abbaco 2026-03-27

  // ── Treasury letters — ARS CER-adjusted (LECER, price = Paridad × VT) ──────
  X15Y6: 104.20,  // paridad=101%, VT=102.85, TIR=-9.28% TEA; Abbaco 2026-03-27
  X29Y6: 112.59,  // paridad=102%, VT=110.69, TIR=-9.39% TEA
  X31L6: 107.70,  // paridad=102%, VT=105.26, TIR=-6.43% TEA
  X30S6: 101.95,  // paridad=101%, VT=100.92, TIR=-1.96% TEA
  X30N6: 109.50,  // paridad=100%, VT=109.38, TIR=-0.16% TEA

  // ── Treasury letters — ARS (LECAP, price = Paridad × VT × 100 per 100 VN) ─
  S17A6: 108.48, // VT_mat≈109.89, Paridad≈98.71%, maturity 2026-04-17
  S30A6: 124.56, // VT_mat≈125.56, Paridad≈99.20%, maturity 2026-04-30
  S31L6: 107.26, // VT_mat≈114.27, Paridad≈93.86%, maturity 2026-07-31
  T30J6: 135.55, // VT=136.9083, Paridad=99.00%, pago total=144.89, TIR≈29.18% TEA

  // ── TAMAR / Dual sovereign bonds — ARS (price = paridad × VT × 100) ──────
  TMF27: 106.65, // paridad=102.0%, VT=104.56, TIR=33.92% TEA; Abbaco 2026-03-27
  TTJ26: 152.85, // paridad=109.1%, VT_CAP=136.51, TIR_CAP≈-9.6% (YTW; TODO refresh)
  TTS26: 151.4, // paridad=110.4%, VT_CAP=137.16, TIR_CAP≈0.98% (YTW; Abbaco 2026-03-26)

  // ── CER-adjusted sovereign bonds — ARS (price = paridad × 100) ──────────
  TX28: 57.74, // paridad=96.23%, residual=60% → price=paridad×residual×100; TIR real≈5.27%
  TZX28: 84.68, // paridad=84.68%, residual=100% → price=84.68; TIR real≈7.62%

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
