import type { Currency, InstrumentAnalysis, SimulationResult } from "@investor-app/shared";
import { calcBondAnalysis, calcPriceFromYTM } from "./bonds.calculator.js";
import { PriceCacheService } from "../byma/byma.price-cache.service.js";
import {
  getInstrument,
  getInstrumentCashflows,
  getValorTecnico,
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
    displayCurrency: Currency | undefined,
  ): Promise<InstrumentAnalysis> {
    // 1. Load static data (throws InstrumentNotFoundError if not found)
    const [instrument, cashflows, valorTecnico] = await Promise.all([
      getInstrument(ticker),
      getInstrumentCashflows(ticker),
      getValorTecnico(ticker),
    ]);

    // Default to the instrument's own trading currency — no conversion needed
    const effectiveCurrency = displayCurrency ?? instrument.currency;

    // 2. Fetch market price (from cache or BYMA) — pass instrument currency so it's cached correctly
    const priceCurrency = instrument.currency === "ARS" ? "ARS" : "USD";
    const marketPrice = await this.priceCache.getPrice(ticker, priceCurrency);

    // 3. Convert price to display currency if needed
    let displayPrice = marketPrice.price;
    if (effectiveCurrency !== instrument.currency) {
      const rates = await this.fxService.getRates();
      displayPrice = this.convertPrice(
        marketPrice.price,
        instrument.currency,
        effectiveCurrency,
        rates.mep.sell,
      );
    }

    // 4. Settlement = T+1
    const settlement = new Date();
    settlement.setDate(settlement.getDate() + 1);

    // 5. Resolve valor técnico:
    //    - Static config value (CER/TAMAR/DUAL) takes precedence.
    //    - Otherwise compute dynamically as sum of remaining amortizations —
    //      this correctly handles partially-amortized bonds (AL29, GD29, etc.)
    //      where the residual changes over time.
    const futureCfs = cashflows.filter((cf) => new Date(cf.paymentDate) > settlement);
    const nominalFace = futureCfs.reduce((sum, cf) => sum + cf.amortization, 0);
    const effectiveVT = valorTecnico ?? nominalFace;

    // 6. For coupon-paying CER bonds (TX26, TX28, DICP…) cashflows are stored in
    //    nominal VN units while the market price is in current ARS. Scale cashflows
    //    to ARS so the YTM solver operates in consistent units.
    //    cerScale = VT_now_ARS / nominalFace_nominal. For all other bond types
    //    (TZX, LECER, LECAP, regular bonds) this ratio is ≈ 1 so no change occurs.
    const cerScale = nominalFace > 0 ? effectiveVT / nominalFace : 1;
    const calcCashflows =
      cerScale > 5
        ? cashflows.map((cf) => ({
            ...cf,
            coupon: cf.coupon * cerScale,
            amortization: cf.amortization * cerScale,
          }))
        : cashflows;

    // 7. Run financial calculations
    const { cashflowsWithPV, ...calculations } = calcBondAnalysis(
      calcCashflows,
      displayPrice,
      settlement,
      { valorTecnico: effectiveVT },
    );

    // Include past cashflows (PV = 0) so the UI can optionally display them.
    const pastCashflows = cashflows
      .filter((cf) => new Date(cf.paymentDate) <= settlement)
      .map((cf) => ({ ...cf, presentValue: 0 }));

    return {
      ticker: instrument.ticker,
      name: instrument.name,
      type: instrument.type,
      subtype: instrument.subtype,
      currency: instrument.currency,
      maturityDate: instrument.maturityDate,
      market: {
        ticker: instrument.ticker,
        price: marketPrice.price,
        currency: marketPrice.currency,
        fetchedAt: marketPrice.fetchedAt,
        source: marketPrice.source,
      },
      calculations,
      cashflows: [...pastCashflows, ...cashflowsWithPV],
      displayCurrency: effectiveCurrency,
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
    displayCurrency: Currency | undefined,
    quantity?: number,
    settlementDateStr?: string,
  ): Promise<SimulationResult> {
    const [instrument, cashflows, valorTecnico] = await Promise.all([
      getInstrument(ticker),
      getInstrumentCashflows(ticker),
      getValorTecnico(ticker),
    ]);

    const effectiveCurrency = displayCurrency ?? instrument.currency;

    // Use user-supplied settlement date or default to T+1
    const settlement = settlementDateStr
      ? new Date(`${settlementDateStr}T12:00:00Z`)
      : (() => {
          const d = new Date();
          d.setDate(d.getDate() + 1);
          return d;
        })();

    const simFutureCfs = cashflows.filter((cf) => new Date(cf.paymentDate) > settlement);
    const simNominalFace = simFutureCfs.reduce((s, cf) => s + cf.amortization, 0);
    const effectiveVT = valorTecnico ?? simNominalFace;
    const simCerScale = simNominalFace > 0 ? effectiveVT / simNominalFace : 1;
    const calcCashflows =
      simCerScale > 5
        ? cashflows.map((cf) => ({
            ...cf,
            coupon: cf.coupon * simCerScale,
            amortization: cf.amortization * simCerScale,
          }))
        : cashflows;

    let cleanPrice: number;
    let inputType: "price" | "ytm";
    let inputValue: number;

    if ("price" in input) {
      // price → YTM: input is a clean (quoted) price, convert currency if needed
      let calcPrice = input.price;
      if (effectiveCurrency !== instrument.currency) {
        const rates = await this.fxService.getRates();
        calcPrice = this.convertPrice(
          input.price,
          effectiveCurrency,
          instrument.currency,
          rates.mep.sell,
        );
      }
      cleanPrice = calcPrice;
      inputType = "price";
      inputValue = input.price;
    } else {
      // YTM → price: solve theoretical clean price using ARS-scaled cashflows
      cleanPrice = calcPriceFromYTM(calcCashflows, settlement, input.ytm);
      if (effectiveCurrency !== instrument.currency) {
        const rates = await this.fxService.getRates();
        cleanPrice = this.convertPrice(
          cleanPrice,
          instrument.currency,
          effectiveCurrency,
          rates.mep.sell,
        );
      }
      inputType = "ytm";
      inputValue = input.ytm;
    }

    const { cashflowsWithPV, ...calculations } = calcBondAnalysis(
      calcCashflows,
      cleanPrice,
      settlement,
      { valorTecnico: effectiveVT },
    );

    const settlementDate = settlement.toISOString().slice(0, 10);

    const result: SimulationResult = {
      ticker,
      inputType,
      inputValue,
      settlementDate,
      calculations,
      cashflows: cashflowsWithPV,
    };

    if (quantity !== undefined) {
      result.quantity = quantity;
      result.totalCost = Math.round(quantity * calculations.dirtyPrice) / 100;
    }

    return result;
  }

  // ── Private helpers ──────────────────────────────────────────────────────────

  /**
   * Converts a price between ARS and USD using the MEP sell rate.
   * USD_LINKED is treated as USD for display purposes.
   *
   * @param price     - The price to convert.
   * @param from      - Source currency.
   * @param to        - Target currency.
   * @param arsPerUsd - ARS per USD rate (MEP sell).
   * @returns Converted price, or the original price if currencies match.
   */
  private convertPrice(price: number, from: Currency, to: Currency, arsPerUsd: number): number {
    if (from === to) return price;
    if (from === "USD" && to === "ARS") return price * arsPerUsd;
    if (from === "ARS" && to === "USD") return price / arsPerUsd;
    // USD_LINKED is treated as USD for display purposes
    return price;
  }
}
