import type { Cashflow } from "@investor-app/shared";
import type { FlowGeneratorParams } from "@investor-app/shared";

// ── Types ─────────────────────────────────────────────────────────────────────

/** A generated cash flow before being persisted — no id or instrumentId yet. */
export interface GeneratedCashflow {
  paymentDate: string;
  coupon: number;
  amortization: number;
  residual: number;
}

// ── Date helpers ──────────────────────────────────────────────────────────────

/**
 * Adds a number of months to a date, preserving the day-of-month where possible.
 * Handles month-end edge cases (e.g. Jan 31 + 1 month = Feb 28).
 */
function addMonths(date: Date, months: number): Date {
  const result = new Date(date);
  const day = result.getDate();
  result.setMonth(result.getMonth() + months);
  // If day overflowed (e.g. Mar 31 → Apr 31 → May 1), snap back to end of month
  if (result.getDate() !== day) {
    result.setDate(0);
  }
  return result;
}

/**
 * Formats a Date to an ISO 8601 date string (YYYY-MM-DD).
 */
function toISO(date: Date): string {
  return date.toISOString().split("T")[0] ?? "";
}

/**
 * Generates a series of payment dates starting from firstDate,
 * advancing by (12 / frequency) months each time, until maturity.
 */
function generatePaymentDates(
  firstDate: Date,
  maturityDate: Date,
  frequency: number,
): Date[] {
  const monthStep = 12 / frequency;
  const dates: Date[] = [];
  let current = new Date(firstDate);

  while (current <= maturityDate) {
    dates.push(new Date(current));
    current = addMonths(current, monthStep);
  }

  // Always ensure maturity date is the last payment
  const lastDate = dates[dates.length - 1];
  if (lastDate === undefined || toISO(lastDate) !== toISO(maturityDate)) {
    dates.push(new Date(maturityDate));
  }

  return dates;
}

// ── Generators ────────────────────────────────────────────────────────────────

/**
 * BULLET — periodic coupons at a fixed rate, full principal returned at maturity.
 *
 * Example: GD30, AL35 (before amortization starts), most corporate ONs.
 *
 * couponRate:      annual rate (decimal)
 * couponFrequency: payments per year
 * faceValue:       nominal value (typically 100)
 */
function generateBullet(params: FlowGeneratorParams): GeneratedCashflow[] {
  const {
    maturityDate,
    faceValue,
    couponRate = 0,
    couponFrequency = 2,
    firstCouponDate,
  } = params;

  if (couponRate === 0 || firstCouponDate === undefined) return [];

  const maturity = new Date(maturityDate);
  const first = new Date(firstCouponDate);
  const periodRate = couponRate / couponFrequency;
  const dates = generatePaymentDates(first, maturity, couponFrequency);

  return dates.map((date, i) => {
    const isLast = i === dates.length - 1;
    return {
      paymentDate: toISO(date),
      coupon: Math.round(faceValue * periodRate * 10000) / 10000,
      amortization: isLast ? faceValue : 0,
      residual: isLast ? 0 : 1,
    };
  });
}

/**
 * AMORTIZABLE — periodic coupons on residual capital + scheduled amortizations.
 *
 * Example: AL30, GD30 (post step-up), some CER bonds.
 *
 * amortizationSchedule: array of { date, pct } where pct is fraction of face value.
 * Coupon is calculated on the residual capital at each period.
 */
function generateAmortizable(params: FlowGeneratorParams): GeneratedCashflow[] {
  const {
    faceValue,
    couponRate = 0,
    couponFrequency = 2,
    firstCouponDate,
    amortizationSchedule = [],
  } = params;

  if (firstCouponDate === undefined || amortizationSchedule.length === 0)
    return [];

  const maturity = new Date(params.maturityDate);
  const first = new Date(firstCouponDate);
  const periodRate = couponRate / couponFrequency;
  const dates = generatePaymentDates(first, maturity, couponFrequency);

  // Build amortization lookup: date → pct
  const amortMap = new Map<string, number>(
    amortizationSchedule.map((item: { date: string; pct: number }) => [
      item.date,
      item.pct,
    ]),
  );

  let residual = 1.0;

  return dates.map((date) => {
    const dateStr = toISO(date);
    const amortPct = amortMap.get(dateStr) ?? 0;
    const coupon =
      Math.round(faceValue * residual * periodRate * 10000) / 10000;
    const amortization = Math.round(faceValue * amortPct * 10000) / 10000;

    residual = Math.round((residual - amortPct) * 10000) / 10000;

    return {
      paymentDate: dateStr,
      coupon,
      amortization,
      residual: Math.max(0, residual),
    };
  });
}

/**
 * ZERO_COUPON — no periodic coupons, issued at a discount, redeemed at face value.
 *
 * Example: LECER (treasury letters), short CER bonds.
 *
 * A single cash flow at maturity for the full face value.
 */
function generateZeroCoupon(params: FlowGeneratorParams): GeneratedCashflow[] {
  const { maturityDate, faceValue } = params;

  return [
    {
      paymentDate: maturityDate,
      coupon: 0,
      amortization: faceValue,
      residual: 0,
    },
  ];
}

/**
 * CAPITALIZABLE — no periodic cash flows; capital grows at the capitalization rate.
 * The investor receives face value × (1 + TNA/frequency)^n at maturity.
 *
 * Example: LECAP, BONCAP, some Bonte.
 *
 * capitalizationRate: annual TNA (decimal)
 * couponFrequency:    capitalization periods per year
 */
function generateCapitalizable(
  params: FlowGeneratorParams,
): GeneratedCashflow[] {
  const {
    maturityDate,
    issueDate,
    faceValue,
    capitalizationRate = 0,
    couponFrequency = 12,
  } = params;

  const issue = new Date(issueDate);
  const maturity = new Date(maturityDate);
  const msPerDay = 1000 * 60 * 60 * 24;
  const days = Math.round((maturity.getTime() - issue.getTime()) / msPerDay);
  const periods = days / (365 / couponFrequency);
  const periodRate = capitalizationRate / couponFrequency;

  const finalValue =
    Math.round(faceValue * Math.pow(1 + periodRate, periods) * 100) / 100;

  return [
    {
      paymentDate: maturityDate,
      coupon: 0,
      amortization: finalValue,
      residual: 0,
    },
  ];
}

/**
 * CER — cash flows are identical to the base structure (bullet or amortizable)
 * but multiplied by the CER adjustment coefficient at display time.
 *
 * In this phase: the coefficient is stored manually and applied to nominal flows.
 * Future: fetch real-time CER from INDEC API at analysis time.
 *
 * The generator stores nominal flows (coefficient = 1.0 baseline).
 * The adjustmentCoefficient is stored in instrument_config for runtime use.
 */
function generateCER(params: FlowGeneratorParams): GeneratedCashflow[] {
  // CER bonds can be bullet or amortizable — delegate to the appropriate generator
  if ((params.amortizationSchedule ?? []).length > 0) {
    return generateAmortizable(params);
  }
  return generateBullet(params);
}

/**
 * USD_LINKED — flows denominated in ARS but indexed to the official USD exchange rate.
 *
 * Structure is identical to bullet or amortizable in nominal terms.
 * The adjustmentCoefficient (TC oficial) is applied at analysis time, not here.
 *
 * Same delegation pattern as CER.
 */
function generateUSDLinked(params: FlowGeneratorParams): GeneratedCashflow[] {
  if ((params.amortizationSchedule ?? []).length > 0) {
    return generateAmortizable(params);
  }
  return generateBullet(params);
}

// ── Main entry point ──────────────────────────────────────────────────────────

/**
 * Generates the nominal cash flow schedule for any supported Argentine
 * fixed income instrument based on its structural parameters.
 *
 * Returns an array of GeneratedCashflow ready to be inserted into the
 * cashflows table after an instrumentId is assigned.
 *
 * @throws Error if required parameters for the given flowType are missing.
 */
export function generateFlows(
  params: FlowGeneratorParams,
): GeneratedCashflow[] {
  validateParams(params);

  switch (params.flowType) {
    case "BULLET":
      return generateBullet(params);
    case "AMORTIZABLE":
      return generateAmortizable(params);
    case "ZERO_COUPON":
      return generateZeroCoupon(params);
    case "CAPITALIZABLE":
      return generateCapitalizable(params);
    case "CER":
      return generateCER(params);
    case "USD_LINKED":
      return generateUSDLinked(params);
    default: {
      const _exhaustive: never = params.flowType;
      throw new Error(`Unsupported flowType: ${String(_exhaustive)}`);
    }
  }
}

// ── Validation ────────────────────────────────────────────────────────────────

function validateParams(params: FlowGeneratorParams): void {
  const { flowType, issueDate, maturityDate, faceValue } = params;

  if (!issueDate || !maturityDate) {
    throw new Error("issueDate and maturityDate are required");
  }

  if (new Date(maturityDate) <= new Date(issueDate)) {
    throw new Error("maturityDate must be after issueDate");
  }

  if (faceValue <= 0) {
    throw new Error("faceValue must be positive");
  }

  if (
    flowType === "BULLET" ||
    flowType === "CER" ||
    flowType === "USD_LINKED"
  ) {
    if (!params.couponRate || !params.firstCouponDate) {
      if (
        flowType === "BULLET" ||
        flowType === "CER" ||
        flowType === "USD_LINKED"
      ) {
        if (!params.couponRate || !params.firstCouponDate) {
          throw new Error(
            `${flowType} requires couponRate and firstCouponDate`,
          );
        }
      }
    }
  }

  if (flowType === "AMORTIZABLE") {
    if (
      !params.amortizationSchedule ||
      params.amortizationSchedule.length === 0
    ) {
      throw new Error("AMORTIZABLE requires amortizationSchedule");
    }
    const totalAmort = params.amortizationSchedule.reduce(
      (sum: number, item: { date: string; pct: number }) => sum + item.pct,
      0,
    );
    if (Math.abs(totalAmort - 1) > 0.001) {
      throw new Error(
        `Amortization schedule must sum to 1.0 (got ${totalAmort})`,
      );
    }
  }

  if (flowType === "CAPITALIZABLE" && !params.capitalizationRate) {
    throw new Error("CAPITALIZABLE requires capitalizationRate");
  }
}
