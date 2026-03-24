import type {
  Currency,
  InstrumentAnalysis,
  SimulationResult,
} from "@investor-app/shared";
import { calcBondAnalysis, calcPriceFromYTM } from "./bonds.calculator.js";
import { PriceCacheService } from "../byma/byma.price-cache.service.js";
import {
  getInstrument,
  getInstrumentCashflows,
  InstrumentNotFoundError,
} from "../instruments/instruments.service.js";
import type { FxService } from "../fx/fx.service.js";

export { InstrumentNotFoundError };

/**
 * Orchestrates a full instrument analysis:
 * 1. Loads static instrument data + cash flows from the database.
 * 2. Fetches the current market price via the price cache (BYMA or mock).
 * 3. Optionally converts values to the requested display currency via FX rates.
 * 4. Runs the financial calculator (YTM, duration, clean/dirty price).
 *
 * Settlement date defaults to T+1 (next calendar day), which is standard
 * for Argentine sovereign bonds traded on BYMA.
 */
export class BondsService {
  constructor(
    private readonly priceCache: PriceCacheService,
    private readonly fxService: FxService,
  ) {}

  async analyzeInstrument(
    ticker: string,
    displayCurrency: Currency,
  ): Promise<InstrumentAnalysis> {
    // 1. Load static data (throws InstrumentNotFoundError if not found)
    const [instrument, cashflows] = await Promise.all([
      getInstrument(ticker),
      getInstrumentCashflows(ticker),
    ]);

    // 2. Fetch market price (from cache or BYMA)
    const marketPrice = await this.priceCache.getPrice(ticker);

    // 3. Convert price to display currency if needed
    let displayPrice = marketPrice.price;
    if (displayCurrency !== instrument.currency) {
      const rates = await this.fxService.getRates();
      displayPrice = this.convertPrice(
        marketPrice.price,
        instrument.currency,
        displayCurrency,
        rates.mep.rate,
      );
    }

    // 4. Settlement = T+1
    const settlement = new Date();
    settlement.setDate(settlement.getDate() + 1);

    // 5. Run financial calculations
    const { cashflowsWithPV, ...calculations } = calcBondAnalysis(
      cashflows,
      displayPrice,
      settlement,
    );

    return {
      ticker: instrument.ticker,
      name: instrument.name,
      type: instrument.type,
      currency: instrument.currency,
      maturityDate: instrument.maturityDate,
      market: {
        ticker: instrument.ticker,
        price: marketPrice.price,
        currency: marketPrice.currency,
        fetchedAt: marketPrice.fetchedAt,
      },
      calculations,
      cashflows: cashflowsWithPV,
      displayCurrency,
    };
  }

  /**
   * Simulates bond metrics at a hypothetical price or YTM.
   *
   * - price→YTM: user supplies a price; calculates YTM, duration, clean price, etc.
   * - YTM→price: user supplies a target YTM; back-solves the theoretical dirty price,
   *   then derives all other metrics from it.
   *
   * The input price/result are expressed in displayCurrency.
   * Settlement defaults to T+1 (same convention as analyzeInstrument).
   */
  async simulate(
    ticker: string,
    input: { price: number } | { ytm: number },
    displayCurrency: Currency,
  ): Promise<SimulationResult> {
    const [instrument, cashflows] = await Promise.all([
      getInstrument(ticker),
      getInstrumentCashflows(ticker),
    ]);

    const settlement = new Date();
    settlement.setDate(settlement.getDate() + 1);

    let dirtyPrice: number;
    let inputType: "price" | "ytm";
    let inputValue: number;

    if ("price" in input) {
      // price → YTM: convert input price to instrument currency for calculation
      let calcPrice = input.price;
      if (displayCurrency !== instrument.currency) {
        const rates = await this.fxService.getRates();
        calcPrice = this.convertPrice(
          input.price,
          displayCurrency,
          instrument.currency,
          rates.mep.rate,
        );
      }
      dirtyPrice = calcPrice;
      inputType = "price";
      inputValue = input.price;
    } else {
      // YTM → price: solve theoretical price in instrument currency, then convert to display
      dirtyPrice = calcPriceFromYTM(cashflows, settlement, input.ytm);
      if (displayCurrency !== instrument.currency) {
        const rates = await this.fxService.getRates();
        dirtyPrice = this.convertPrice(
          dirtyPrice,
          instrument.currency,
          displayCurrency,
          rates.mep.rate,
        );
      }
      inputType = "ytm";
      inputValue = input.ytm;
    }

    const { cashflowsWithPV, ...calculations } = calcBondAnalysis(
      cashflows,
      dirtyPrice,
      settlement,
    );

    return {
      ticker,
      inputType,
      inputValue,
      calculations,
      cashflows: cashflowsWithPV,
    };
  }

  // ── Private helpers ──────────────────────────────────────────────────────────

  private convertPrice(
    price: number,
    from: Currency,
    to: Currency,
    arsPerUsd: number,
  ): number {
    if (from === to) return price;
    if (from === "USD" && to === "ARS") return price * arsPerUsd;
    if (from === "ARS" && to === "USD") return price / arsPerUsd;
    // USD_LINKED is treated as USD for display purposes
    return price;
  }
}
