import { describe, it, expect } from "vitest";
import type { Cashflow } from "@investor-app/shared";
import {
  calcAccruedInterest,
  calcYTM,
  calcModifiedDuration,
  calcCashflowsWithPV,
  calcBondAnalysis,
} from "./bonds.calculator.js";

// ── Fixtures ──────────────────────────────────────────────────────────────────

/** Constructs a minimal Cashflow (id fields are irrelevant for the calculator). */
function cf(paymentDate: string, coupon: number, amortization: number, residual: number): Cashflow {
  return {
    id: 0,
    instrumentId: 0,
    paymentDate,
    coupon,
    amortization,
    residual,
  };
}

/**
 * Simple bullet bond: semi-annual 10% coupon on face 100.
 * Cashflows relative to a settlement of 2026-01-01:
 *   - 2026-07-01 (181 days): coupon=5
 *   - 2027-01-01 (365 days): coupon=5 + amortization=100
 */
const BULLET_10PCT: Cashflow[] = [cf("2026-07-01", 5, 0, 1), cf("2027-01-01", 5, 100, 0)];
const BULLET_SETTLEMENT = new Date("2026-01-01");

/**
 * AL30-like amortizable bond (8 remaining payments starting 2026-07-09).
 * Matches the seed data exactly.
 */
const AL30_FLOWS: Cashflow[] = [
  cf("2026-07-09", 0.5, 4.0, 0.96),
  cf("2027-01-09", 0.48, 16.0, 0.8),
  cf("2027-07-09", 0.4, 16.0, 0.64),
  cf("2028-01-09", 0.32, 16.0, 0.48),
  cf("2028-07-09", 0.24, 16.0, 0.32),
  cf("2029-01-09", 0.16, 16.0, 0.16),
  cf("2029-07-09", 0.08, 8.0, 0.08),
  cf("2030-01-09", 0.04, 8.0, 0.0),
];
const AL30_SETTLEMENT = new Date("2026-03-24");

// ── calcAccruedInterest ───────────────────────────────────────────────────────

describe("calcAccruedInterest", () => {
  it("returns 0 for empty cashflows", () => {
    expect(calcAccruedInterest([], new Date("2026-03-01"))).toBe(0);
  });

  it("returns 0 when all cashflows are in the past", () => {
    const flows = [cf("2025-06-01", 5, 100, 0)];
    expect(calcAccruedInterest(flows, new Date("2026-01-01"))).toBe(0);
  });

  it("returns 0 for zero-coupon bond (no coupons to accrue)", () => {
    const flows = [cf("2027-01-01", 0, 100, 0)];
    expect(calcAccruedInterest(flows, new Date("2026-06-01"))).toBe(0);
  });

  it("returns 0 when settlement falls exactly on the previous payment date", () => {
    const flows = [cf("2026-01-01", 5, 0, 1), cf("2026-07-01", 5, 100, 0)];
    // daysBetween(prev=2026-01-01, settlement=2026-01-01) = 0 → AI = 0
    expect(calcAccruedInterest(flows, new Date("2026-01-01"))).toBe(0);
  });

  it("returns proportional accrued interest at mid-period", () => {
    // Period: 2026-01-01 → 2026-07-01 = 181 days
    // Settlement: 2026-04-01 → 90 days elapsed (Jan=31, Feb=28, Mar=31)
    const flows = [cf("2026-01-01", 10, 0, 1), cf("2026-07-01", 10, 100, 0)];
    const settlement = new Date("2026-04-01");
    const expected = 10 * (90 / 181);
    expect(calcAccruedInterest(flows, settlement)).toBeCloseTo(expected, 4);
  });

  it("returns almost the full coupon just before payment date", () => {
    // 1 day before next coupon: daysAccrued ≈ couponPeriodDays - 1
    const flows = [cf("2026-01-01", 10, 0, 1), cf("2026-07-01", 10, 100, 0)];
    const oneDayBefore = new Date("2026-06-30");
    // Period = 181 days, elapsed = 180 days
    const expected = 10 * (180 / 181);
    expect(calcAccruedInterest(flows, oneDayBefore)).toBeCloseTo(expected, 4);
  });

  it("returns a value between 0 and the coupon when there is no prior coupon (approximation path)", () => {
    // Only 1 future coupon → prevPaymentDate is approximated as 1 year before.
    // The exact value is timezone-dependent (mixes UTC string parsing with local Date constructor),
    // so we only assert the invariant: 0 < AI < nextCouponAmount.
    const flows = [cf("2027-01-01", 10, 100, 0)];
    const settlement = new Date("2026-07-01");
    const ai = calcAccruedInterest(flows, settlement);
    expect(ai).toBeGreaterThan(0);
    expect(ai).toBeLessThan(10);
  });
});

// ── calcYTM ───────────────────────────────────────────────────────────────────

describe("calcYTM", () => {
  it("returns NaN for empty cashflows", () => {
    expect(calcYTM([], 100, BULLET_SETTLEMENT)).toBeNaN();
  });

  it("returns NaN for price = 0", () => {
    expect(calcYTM(BULLET_10PCT, 0, BULLET_SETTLEMENT)).toBeNaN();
  });

  it("returns NaN when all cashflows are in the past", () => {
    const pastFlows = [cf("2025-01-01", 5, 100, 0)];
    expect(calcYTM(pastFlows, 100, BULLET_SETTLEMENT)).toBeNaN();
  });

  it("zero-coupon bond (1 year): YTM = (face/price) - 1 exactly", () => {
    // t = 365/365 = 1.0 → price = 100 / (1 + r)^1
    // At price = 100/1.1 → r should be exactly 0.1
    const flows = [cf("2027-01-01", 0, 100, 0)];
    const settlement = new Date("2026-01-01");
    const price = 100 / 1.1;
    expect(calcYTM(flows, price, settlement)).toBeCloseTo(0.1, 6);
  });

  it("zero-coupon bond (2 years): YTM = (face/price)^(1/2) - 1 exactly", () => {
    // t = 730/365 = 2.0 → price = 100 / (1 + r)^2
    // At price = 100/1.21 → r = 10%
    const flows = [cf("2028-01-01", 0, 100, 0)];
    const settlement = new Date("2026-01-01");
    const price = 100 / 1.21;
    expect(calcYTM(flows, price, settlement)).toBeCloseTo(0.1, 6);
  });

  it("price–YTM inverse relationship: higher price → lower YTM", () => {
    const ytmPar = calcYTM(BULLET_10PCT, 100, BULLET_SETTLEMENT);
    const ytmPremium = calcYTM(BULLET_10PCT, 110, BULLET_SETTLEMENT);
    const ytmDiscount = calcYTM(BULLET_10PCT, 90, BULLET_SETTLEMENT);
    expect(ytmPremium).toBeLessThan(ytmPar);
    expect(ytmDiscount).toBeGreaterThan(ytmPar);
  });

  it("round-trip consistency: YTM → recalculate price matches input (bullet)", () => {
    const inputPrice = 95.0;
    const ytm = calcYTM(BULLET_10PCT, inputPrice, BULLET_SETTLEMENT);
    expect(ytm).not.toBeNaN();
    // Manually reconstruct price using the same formula as calcTheoreticalPrice
    const DAYS_IN_YEAR = 365;
    const reconstructed = BULLET_10PCT.filter(
      (c) => new Date(c.paymentDate) > BULLET_SETTLEMENT,
    ).reduce((sum, c) => {
      const t =
        (new Date(c.paymentDate).getTime() - BULLET_SETTLEMENT.getTime()) /
        (1000 * 60 * 60 * 24 * DAYS_IN_YEAR);
      return sum + (c.coupon + c.amortization) / Math.pow(1 + ytm, t);
    }, 0);
    expect(reconstructed).toBeCloseTo(inputPrice, 4);
  });

  it("round-trip consistency: YTM → recalculate price matches input (AL30 amortizable)", () => {
    const inputPrice = 55.5;
    const ytm = calcYTM(AL30_FLOWS, inputPrice, AL30_SETTLEMENT);
    expect(ytm).not.toBeNaN();
    const DAYS_IN_YEAR = 365;
    const reconstructed = AL30_FLOWS.filter(
      (c) => new Date(c.paymentDate) > AL30_SETTLEMENT,
    ).reduce((sum, c) => {
      const t =
        (new Date(c.paymentDate).getTime() - AL30_SETTLEMENT.getTime()) /
        (1000 * 60 * 60 * 24 * DAYS_IN_YEAR);
      return sum + (c.coupon + c.amortization) / Math.pow(1 + ytm, t);
    }, 0);
    expect(reconstructed).toBeCloseTo(inputPrice, 4);
  });

  it("yields a positive YTM for a discounted bond", () => {
    // Any bond priced below theoretical par at 0% should have positive YTM
    const ytm = calcYTM(AL30_FLOWS, 50, AL30_SETTLEMENT);
    expect(ytm).toBeGreaterThan(0);
  });
});

// ── calcModifiedDuration ──────────────────────────────────────────────────────

describe("calcModifiedDuration", () => {
  it("returns NaN when YTM is NaN", () => {
    expect(calcModifiedDuration(BULLET_10PCT, 100, BULLET_SETTLEMENT, NaN)).toBeNaN();
  });

  it("returns NaN when price is 0", () => {
    expect(calcModifiedDuration(BULLET_10PCT, 0, BULLET_SETTLEMENT, 0.1)).toBeNaN();
  });

  it("zero-coupon bond: modified duration = maturity / (1 + YTM)", () => {
    // MacD of zero-coupon = T (the single cashflow time); ModD = T / (1+r)
    const flows = [cf("2027-01-01", 0, 100, 0)];
    const settlement = new Date("2026-01-01");
    const price = 100 / 1.1;
    const ytm = calcYTM(flows, price, settlement); // ≈ 0.1
    const duration = calcModifiedDuration(flows, price, settlement, ytm);
    // T = 1.0 year → ModD = 1.0 / (1 + 0.1) ≈ 0.9091
    expect(duration).toBeCloseTo(1.0 / (1 + ytm), 5);
  });

  it("coupon bond: modified duration < time to maturity", () => {
    // Coupon payments before maturity reduce duration vs zero-coupon
    const ytm = calcYTM(BULLET_10PCT, 100, BULLET_SETTLEMENT);
    const duration = calcModifiedDuration(BULLET_10PCT, 100, BULLET_SETTLEMENT, ytm);
    // Maturity = 1 year, duration must be < 1
    expect(duration).toBeGreaterThan(0);
    expect(duration).toBeLessThan(1);
  });

  it("longer maturity bond has greater duration", () => {
    // Compare two zero-coupon bonds: 1yr vs 2yr
    const flows1yr = [cf("2027-01-01", 0, 100, 0)];
    const flows2yr = [cf("2028-01-01", 0, 100, 0)];
    const settlement = new Date("2026-01-01");
    const price1yr = 100 / 1.1;
    const price2yr = 100 / 1.21;
    const ytm1 = calcYTM(flows1yr, price1yr, settlement);
    const ytm2 = calcYTM(flows2yr, price2yr, settlement);
    const dur1 = calcModifiedDuration(flows1yr, price1yr, settlement, ytm1);
    const dur2 = calcModifiedDuration(flows2yr, price2yr, settlement, ytm2);
    expect(dur2).toBeGreaterThan(dur1);
  });

  it("amortizable bond (AL30): duration < longest maturity", () => {
    // AL30 last payment is 2030-01-09 (~3.8yr from settlement)
    // Duration should be well below that due to early amortizations
    const ytm = calcYTM(AL30_FLOWS, 55, AL30_SETTLEMENT);
    const duration = calcModifiedDuration(AL30_FLOWS, 55, AL30_SETTLEMENT, ytm);
    expect(duration).toBeGreaterThan(0);
    expect(duration).toBeLessThan(3.8);
  });
});

// ── calcCashflowsWithPV ───────────────────────────────────────────────────────

describe("calcCashflowsWithPV", () => {
  it("filters out past cashflows", () => {
    const flows = [
      cf("2025-01-01", 5, 0, 1), // past
      cf("2027-01-01", 5, 100, 0), // future
    ];
    const result = calcCashflowsWithPV(flows, BULLET_SETTLEMENT, 0.1);
    expect(result).toHaveLength(1);
    expect(result[0]?.paymentDate).toBe("2027-01-01");
  });

  it("returns empty array when all cashflows are in the past", () => {
    const flows = [cf("2025-01-01", 5, 100, 0)];
    expect(calcCashflowsWithPV(flows, BULLET_SETTLEMENT, 0.1)).toHaveLength(0);
  });

  it("presentValue = 0 when YTM is NaN", () => {
    const result = calcCashflowsWithPV(BULLET_10PCT, BULLET_SETTLEMENT, NaN);
    result.forEach((c) => expect(c.presentValue).toBe(0));
  });

  it("sum of PVs ≈ dirty price used to derive YTM (round-trip)", () => {
    const dirtyPrice = 98.5;
    const ytm = calcYTM(BULLET_10PCT, dirtyPrice, BULLET_SETTLEMENT);
    const withPV = calcCashflowsWithPV(BULLET_10PCT, BULLET_SETTLEMENT, ytm);
    const sumPV = withPV.reduce((s, c) => s + c.presentValue, 0);
    // Round to 2dp due to 4dp rounding in each PV
    expect(sumPV).toBeCloseTo(dirtyPrice, 2);
  });

  it("each cashflow preserves original coupon, amortization, and residual", () => {
    const result = calcCashflowsWithPV(BULLET_10PCT, BULLET_SETTLEMENT, 0.1);
    expect(result[0]?.coupon).toBe(5);
    expect(result[0]?.amortization).toBe(0);
    expect(result[0]?.residual).toBe(1);
    expect(result[1]?.coupon).toBe(5);
    expect(result[1]?.amortization).toBe(100);
    expect(result[1]?.residual).toBe(0);
  });
});

// ── calcBondAnalysis ──────────────────────────────────────────────────────────

describe("calcBondAnalysis", () => {
  it("cleanPrice in output matches input (rounded to 4dp)", () => {
    const result = calcBondAnalysis(BULLET_10PCT, 95.1234, BULLET_SETTLEMENT);
    expect(result.cleanPrice).toBe(95.1234);
  });

  it("cleanPrice = dirtyPrice - accruedInterest", () => {
    const flows = [
      cf("2026-01-01", 5, 0, 1),
      cf("2026-07-01", 5, 0, 1),
      cf("2027-01-01", 5, 100, 0),
    ];
    const settlement = new Date("2026-03-01");
    const result = calcBondAnalysis(flows, 98.5, settlement);
    expect(result.cleanPrice).toBeCloseTo(result.dirtyPrice - result.accruedInterest, 4);
  });

  it("parityPct = dirtyPrice / 100", () => {
    const result = calcBondAnalysis(BULLET_10PCT, 75.5, BULLET_SETTLEMENT);
    expect(result.parityPct).toBeCloseTo(result.dirtyPrice / 100, 4);
  });

  it("returns ytm=0 and modifiedDuration=0 when all cashflows are expired", () => {
    const expired = [cf("2025-01-01", 5, 100, 0)];
    const result = calcBondAnalysis(expired, 100, BULLET_SETTLEMENT);
    expect(result.ytm).toBe(0);
    expect(result.modifiedDuration).toBe(0);
  });

  it("cashflowsWithPV length matches future cashflows count", () => {
    const result = calcBondAnalysis(AL30_FLOWS, 55, AL30_SETTLEMENT);
    const futureCount = AL30_FLOWS.filter((c) => new Date(c.paymentDate) > AL30_SETTLEMENT).length;
    expect(result.cashflowsWithPV).toHaveLength(futureCount);
  });

  it("AL30 at ~55 USD: YTM is positive and duration < 4 years", () => {
    // Sanity check: at typical market prices the metrics make sense
    const result = calcBondAnalysis(AL30_FLOWS, 55, AL30_SETTLEMENT);
    expect(result.ytm).toBeGreaterThan(0);
    expect(result.modifiedDuration).toBeGreaterThan(0);
    expect(result.modifiedDuration).toBeLessThan(4);
    expect(result.accruedInterest).toBeGreaterThan(0);
    expect(result.cleanPrice).toBeLessThan(result.dirtyPrice);
  });
});
