import type { BymaMarketPrice, IBYMAClient } from './byma.types.js'
import { BymaInstrumentNotFoundError } from './byma.types.js'

/**
 * Realistic market prices as of March 2026 (USD unless noted).
 * These are approximate mid-market prices for development and testing purposes.
 * Replace with live data when BymaOfficialClient is wired in.
 */
const MOCK_PRICES: Record<string, number> = {
  // Sovereign bonds — USD (Ley Argentina)
  AL30: 62.50,
  AL35: 57.20,
  AL41: 55.80,

  // Sovereign bonds — USD (Ley Nueva York)
  GD30: 64.10,
  GD35: 59.40,
  GD41: 57.90,
  GD46: 56.30,

  // Sovereign bonds — ARS
  T2X5: 98.50,

  // Treasury letters — ARS (prices as % of face value)
  S31O5: 96.20,
  S28N5: 94.80,
  S31D5: 93.10,

  // Corporate bonds / ONs — USD
  YPF24: 97.50,
  PAMP27: 94.20,
  TECO27: 91.80,
}

/**
 * Mock implementation of IBYMAClient.
 *
 * Returns hardcoded realistic prices with a small random variation (±0.5%)
 * to simulate live market behaviour during development.
 *
 * Usage: inject this via the app factory in development/test environments.
 * Switch to BymaOfficialClient in production once credentials are available.
 */
export class MockBymaClient implements IBYMAClient {
  /**
   * Adds a small random variation to simulate price movement.
   * Variation is within ±0.5% of the base price.
   */
  private simulatePriceVariation(basePrice: number): number {
    const variationPct = (Math.random() - 0.5) * 0.01 // ±0.5%
    return Math.round(basePrice * (1 + variationPct) * 100) / 100
  }

  private buildMarketPrice(ticker: string, basePrice: number): BymaMarketPrice {
    return {
      ticker,
      price: this.simulatePriceVariation(basePrice),
      volume: Math.floor(Math.random() * 500_000) + 100_000,
      updatedAt: new Date().toISOString(),
    }
  }

  async getPrice(ticker: string): Promise<BymaMarketPrice> {
    const basePrice = MOCK_PRICES[ticker]

    if (basePrice === undefined) {
      throw new BymaInstrumentNotFoundError(ticker)
    }

    // Simulate a realistic network delay (50–150ms)
    await new Promise((resolve) => setTimeout(resolve, 50 + Math.random() * 100))

    return this.buildMarketPrice(ticker, basePrice)
  }

  async getPrices(tickers: string[]): Promise<Map<string, BymaMarketPrice>> {
    await new Promise((resolve) => setTimeout(resolve, 50 + Math.random() * 100))

    const result = new Map<string, BymaMarketPrice>()

    for (const ticker of tickers) {
      const basePrice = MOCK_PRICES[ticker]
      if (basePrice !== undefined) {
        result.set(ticker, this.buildMarketPrice(ticker, basePrice))
      }
    }

    return result
  }
}
