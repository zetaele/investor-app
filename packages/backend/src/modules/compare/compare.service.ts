import type { CompareEntry, Currency } from "@investor-app/shared";
import type { BondsService } from "../bonds/bonds.service.js";

/**
 * Runs a full financial analysis for multiple instruments in parallel
 * and returns a normalized list ready for side-by-side comparison.
 *
 * Failed tickers (not found, price unavailable) are omitted from the result
 * rather than failing the entire request — the caller receives whatever
 * succeeded along with a list of tickers that could not be resolved.
 */
export class CompareService {
  constructor(private readonly bondsService: BondsService) {}

  async compareInstruments(
    tickers: string[],
    displayCurrency: Currency | undefined,
  ): Promise<{ entries: CompareEntry[]; failed: string[]; estimated: string[] }> {
    const results = await Promise.allSettled(
      tickers.map((ticker) => this.bondsService.analyzeInstrument(ticker, displayCurrency)),
    );

    const entries: CompareEntry[] = [];
    const failed: string[] = [];
    const estimated: string[] = [];

    results.forEach((result, index) => {
      const ticker = tickers[index] ?? "";

      if (result.status === "fulfilled") {
        const a = result.value;
        entries.push({
          ticker: a.ticker,
          name: a.name,
          type: a.type,
          subtype: a.subtype,
          currency: a.currency,
          maturityDate: a.maturityDate,
          price: a.market.price,
          calculations: a.calculations,
        });
        if (a.market.source === "mock") estimated.push(ticker);
      } else {
        failed.push(ticker);
      }
    });

    // Sort by YTM descending so highest-yielding instruments appear first
    entries.sort((a, b) => b.calculations.ytm - a.calculations.ytm);

    return { entries, failed, estimated };
  }
}
