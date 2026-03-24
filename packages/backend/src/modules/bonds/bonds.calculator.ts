import type {
  BondCalculations,
  Cashflow,
  CashflowWithPV,
} from "@investor-app/shared";

const DAYS_IN_YEAR = 365;
const MAX_ITERATIONS = 100;
const YTM_TOLERANCE = 1e-7;
const YTM_INITIAL_GUESS = 0.1;

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Returns the number of calendar days between two dates.
 */
function daysBetween(from: Date, to: Date): number {
  const msPerDay = 1000 * 60 * 60 * 24;
  return Math.round((to.getTime() - from.getTime()) / msPerDay);
}

/**
 * Returns the time in fractional years from settlement to a future date.
 */
function yearsUntil(settlement: Date, paymentDate: Date): number {
  return daysBetween(settlement, paymentDate) / DAYS_IN_YEAR;
}

// ── Accrued interest ──────────────────────────────────────────────────────────

/**
 * Calculates the accrued interest for a bond on the settlement date.
 *
 * Accrued interest represents the coupon earned since the last payment date
 * but not yet paid. It is subtracted from the dirty price to get the clean price.
 *
 * @param cashflows  - Scheduled cash flows ordered by payment date ascending.
 * @param settlement - The trade settlement date.
 * @returns Accrued interest amount (in the instrument's currency units).
 */
export function calcAccruedInterest(
  cashflows: Cashflow[],
  settlement: Date,
): number {
  if (cashflows.length === 0) return 0;

  // Find the next upcoming coupon payment
  const nextCouponIndex = cashflows.findIndex(
    (cf) => new Date(cf.paymentDate) > settlement && cf.coupon > 0,
  );

  if (nextCouponIndex === -1) return 0;

  const nextCoupon = cashflows[nextCouponIndex];
  if (nextCoupon === undefined) return 0;

  const nextPaymentDate = new Date(nextCoupon.paymentDate);
  const nextCouponAmount = nextCoupon.coupon;

  // Determine the previous payment date (or issue approximation)
  const prevCoupon =
    nextCouponIndex > 0 ? cashflows[nextCouponIndex - 1] : undefined;
  const prevPaymentDate =
    prevCoupon !== undefined
      ? new Date(prevCoupon.paymentDate)
      : new Date(
          nextPaymentDate.getFullYear() - 1,
          nextPaymentDate.getMonth(),
          nextPaymentDate.getDate(),
        );

  const couponPeriodDays = daysBetween(prevPaymentDate, nextPaymentDate);
  if (couponPeriodDays === 0) return 0;

  const daysAccrued = daysBetween(prevPaymentDate, settlement);

  return nextCouponAmount * (daysAccrued / couponPeriodDays);
}

// ── Present value ─────────────────────────────────────────────────────────────

/**
 * Calculates the theoretical dirty price of a bond given a yield (YTM).
 *
 * Uses continuous-style discounting with fractional year periods:
 * PV = Σ [CF_i / (1 + y)^t_i]
 *
 * @param cashflows  - Future cash flows (coupon + amortization per date).
 * @param settlement - Settlement date for time calculations.
 * @param ytm        - Annual yield to maturity (decimal, e.g. 0.15 = 15%).
 * @returns Theoretical dirty price.
 */
function calcTheoreticalPrice(
  cashflows: Cashflow[],
  settlement: Date,
  ytm: number,
): number {
  return cashflows
    .filter((cf) => new Date(cf.paymentDate) > settlement)
    .reduce((sum, cf) => {
      const t = yearsUntil(settlement, new Date(cf.paymentDate));
      const totalFlow = cf.coupon + cf.amortization;
      return sum + totalFlow / Math.pow(1 + ytm, t);
    }, 0);
}

/**
 * Calculates the derivative of the price function with respect to yield.
 * Used internally by the Newton-Raphson solver.
 */
function calcPriceDerivative(
  cashflows: Cashflow[],
  settlement: Date,
  ytm: number,
): number {
  return cashflows
    .filter((cf) => new Date(cf.paymentDate) > settlement)
    .reduce((sum, cf) => {
      const t = yearsUntil(settlement, new Date(cf.paymentDate));
      const totalFlow = cf.coupon + cf.amortization;
      return sum - (t * totalFlow) / Math.pow(1 + ytm, t + 1);
    }, 0);
}

// ── YTM ───────────────────────────────────────────────────────────────────────

/**
 * Calculates the Yield to Maturity (YTM) using the Newton-Raphson method.
 *
 * Solves for y in: Σ [CF_i / (1+y)^t_i] - dirtyPrice = 0
 *
 * Converges in ~10 iterations with tolerance of 1e-7.
 *
 * @param cashflows  - Future scheduled cash flows.
 * @param dirtyPrice - Market dirty price (price paid by buyer).
 * @param settlement - Settlement date.
 * @returns YTM as a decimal (e.g. 0.1823 = 18.23%), or NaN if no convergence.
 */
export function calcYTM(
  cashflows: Cashflow[],
  dirtyPrice: number,
  settlement: Date,
): number {
  const futureCashflows = cashflows.filter(
    (cf) => new Date(cf.paymentDate) > settlement,
  );

  if (futureCashflows.length === 0 || dirtyPrice <= 0) return NaN;

  let ytm = YTM_INITIAL_GUESS;

  for (let i = 0; i < MAX_ITERATIONS; i++) {
    const price = calcTheoreticalPrice(futureCashflows, settlement, ytm);
    const derivative = calcPriceDerivative(futureCashflows, settlement, ytm);

    if (derivative === 0) break;

    const delta = (price - dirtyPrice) / derivative;
    ytm -= delta;

    if (Math.abs(delta) < YTM_TOLERANCE) return ytm;
  }

  return NaN;
}

// ── Duration ──────────────────────────────────────────────────────────────────

/**
 * Calculates the Macaulay Duration and Modified Duration of a bond.
 *
 * Macaulay Duration = Σ [t_i × PV(CF_i)] / dirtyPrice
 * Modified Duration = Macaulay Duration / (1 + YTM)
 *
 * @param cashflows  - Future scheduled cash flows.
 * @param dirtyPrice - Market dirty price.
 * @param settlement - Settlement date.
 * @param ytm        - Pre-calculated YTM (decimal).
 * @returns Modified duration in years.
 */
export function calcModifiedDuration(
  cashflows: Cashflow[],
  dirtyPrice: number,
  settlement: Date,
  ytm: number,
): number {
  if (dirtyPrice <= 0 || isNaN(ytm)) return NaN;

  const futureCashflows = cashflows.filter(
    (cf) => new Date(cf.paymentDate) > settlement,
  );

  const weightedSum = futureCashflows.reduce((sum, cf) => {
    const t = yearsUntil(settlement, new Date(cf.paymentDate));
    const totalFlow = cf.coupon + cf.amortization;
    const pv = totalFlow / Math.pow(1 + ytm, t);
    return sum + t * pv;
  }, 0);

  const macaulayDuration = weightedSum / dirtyPrice;
  return macaulayDuration / (1 + ytm);
}

// ── Cash flows with present value ─────────────────────────────────────────────

/**
 * Enriches each cash flow with its present value discounted at the given YTM.
 *
 * @param cashflows  - All scheduled cash flows (including past ones).
 * @param settlement - Settlement date — past cash flows are filtered out.
 * @param ytm        - Annual yield to maturity (decimal).
 * @returns Future cash flows enriched with their present values.
 */
export function calcCashflowsWithPV(
  cashflows: Cashflow[],
  settlement: Date,
  ytm: number,
): CashflowWithPV[] {
  return cashflows
    .filter((cf) => new Date(cf.paymentDate) > settlement)
    .map((cf) => {
      const t = yearsUntil(settlement, new Date(cf.paymentDate));
      const totalFlow = cf.coupon + cf.amortization;
      const presentValue = isNaN(ytm) ? 0 : totalFlow / Math.pow(1 + ytm, t);

      return {
        paymentDate: cf.paymentDate,
        coupon: cf.coupon,
        amortization: cf.amortization,
        residual: cf.residual,
        presentValue: Math.round(presentValue * 10000) / 10000,
      };
    });
}

// ── Price from YTM ────────────────────────────────────────────────────────────

/**
 * Calculates the theoretical dirty price of a bond given a target YTM.
 * This is the inverse operation of calcYTM.
 *
 * @param cashflows  - Future scheduled cash flows.
 * @param settlement - Settlement date.
 * @param ytm        - Target annual yield (decimal, e.g. 0.15 = 15%).
 * @returns Theoretical dirty price, or NaN if ytm is NaN.
 */
export function calcPriceFromYTM(
  cashflows: Cashflow[],
  settlement: Date,
  ytm: number,
): number {
  if (isNaN(ytm)) return NaN;
  const future = cashflows.filter(
    (cf) => new Date(cf.paymentDate) > settlement,
  );
  if (future.length === 0) return NaN;
  return calcTheoreticalPrice(future, settlement, ytm);
}

// ── Main entry point ──────────────────────────────────────────────────────────

/**
 * Runs the full set of financial calculations for a bond or ON.
 *
 * @param cashflows  - All scheduled cash flows for the instrument.
 * @param dirtyPrice - Market price (dirty) in the instrument's native currency.
 * @param settlement - Settlement date (typically T+1 or T+2 from trade date).
 * @returns BondCalculations object with all computed metrics.
 */
export function calcBondAnalysis(
  cashflows: Cashflow[],
  dirtyPrice: number,
  settlement: Date,
): BondCalculations & { cashflowsWithPV: CashflowWithPV[] } {
  const accruedInterest = calcAccruedInterest(cashflows, settlement);
  const cleanPrice = dirtyPrice - accruedInterest;
  const ytm = calcYTM(cashflows, dirtyPrice, settlement);
  const modifiedDuration = calcModifiedDuration(
    cashflows,
    dirtyPrice,
    settlement,
    ytm,
  );
  const cashflowsWithPV = calcCashflowsWithPV(cashflows, settlement, ytm);

  return {
    ytm: isNaN(ytm) ? 0 : Math.round(ytm * 1e7) / 1e7,
    modifiedDuration: isNaN(modifiedDuration)
      ? 0
      : Math.round(modifiedDuration * 10000) / 10000,
    cleanPrice: Math.round(cleanPrice * 10000) / 10000,
    dirtyPrice: Math.round(dirtyPrice * 10000) / 10000,
    accruedInterest: Math.round(accruedInterest * 10000) / 10000,
    parityPct: Math.round((dirtyPrice / 100) * 10000) / 10000,
    cashflowsWithPV,
  };
}
