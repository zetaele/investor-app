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

  /**
   * Runs a full financial analysis for each ticker in parallel and normalises
   * the results into a list sorted by YTM descending.
   *
   * Tickers that fail analysis (not found, price unavailable) are collected in
   * the `failed` array rather than rejecting the whole request. Tickers whose
   * price comes from the mock client are collected in `estimated`.
   *
   * @param tickers         - List of instrument tickers to compare (max 5 recommended).
   * @param displayCurrency - Optional currency override applied to all entries.
   * @returns Resolved entries, failed ticker list, and estimated (mock-price) ticker list.
   */
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
