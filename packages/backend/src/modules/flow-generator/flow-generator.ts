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
 * Parses an ISO date string (YYYY-MM-DD) as a local date.
 * Avoids UTC offset issues caused by new Date("YYYY-MM-DD") which treats
 * the string as UTC midnight and shifts the date in negative-offset timezones.
 */
function parseLocalDate(iso: string): Date {
  const [year, month, day] = iso.split("-").map(Number);
  return new Date(year!, month! - 1, day!);
}

/**
 * Formats a Date to an ISO 8601 date string (YYYY-MM-DD) using local time.
 */
function toISO(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * Adds a number of months to a date, preserving the day-of-month where possible.
 * Handles month-end edge cases (e.g. Jan 31 + 1 month = Feb 28).
 */
function addMonths(date: Date, months: number): Date {
  const result = new Date(date);
  const day = result.getDate();
  result.setMonth(result.getMonth() + months);
  if (result.getDate() !== day) {
    result.setDate(0);
  }
  return result;
}

/**
 * Generates a series of payment dates starting from firstDate,
 * advancing by (12 / frequency) months each time, until maturity.
 * Always ensures the maturity date is the last payment.
 */
function generatePaymentDates(firstDate: Date, maturityDate: Date, frequency: number): Date[] {
  const monthStep = 12 / frequency;
  const dates: Date[] = [];
  let current = new Date(firstDate);

  while (current <= maturityDate) {
    dates.push(new Date(current));
    current = addMonths(current, monthStep);
  }

  const lastDate = dates[dates.length - 1];
  if (lastDate === undefined || toISO(lastDate) !== toISO(maturityDate)) {
    dates.push(new Date(maturityDate));
  }

  return dates;
}

/**
 * Resolves the list of coupon payment dates for an instrument.
 *
 * If an explicit couponSchedule is provided, uses those exact dates — useful
 * for instruments with irregular calendars (e.g. AO27, CER bonds with BCRA holidays).
 *
 * Otherwise, auto-generates dates from firstCouponDate advancing by
 * (12 / couponFrequency) months until maturity.
 */
function resolvePaymentDates(params: FlowGeneratorParams): Date[] {
  if (params.couponSchedule !== undefined && params.couponSchedule.length > 0) {
    return params.couponSchedule.map((s) => parseLocalDate(s.date));
  }

  if (params.firstCouponDate === undefined || params.couponFrequency === undefined) return [];

  const first = parseLocalDate(params.firstCouponDate);
  const maturity = parseLocalDate(params.maturityDate);
  return generatePaymentDates(first, maturity, params.couponFrequency);
}

// ── Generators ────────────────────────────────────────────────────────────────

/**
 * BULLET — periodic coupons at a fixed rate, full principal returned at maturity.
 * Example: GD46, AL35, most corporate ONs.
 */
function generateBullet(params: FlowGeneratorParams): GeneratedCashflow[] {
  const { faceValue, couponRate = 0, couponFrequency = 2 } = params;

  if (couponRate === 0) return [];

  const dates = resolvePaymentDates(params);
  if (dates.length === 0) return [];

  const periodRate = couponRate / couponFrequency;

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
 * Example: AL30, GD30, some CER bonds.
 */
function generateAmortizable(params: FlowGeneratorParams): GeneratedCashflow[] {
  const { faceValue, couponRate = 0, couponFrequency = 2, amortizationSchedule = [] } = params;

  if (amortizationSchedule.length === 0) return [];

  const dates = resolvePaymentDates(params);
  if (dates.length === 0) return [];

  const periodRate = couponRate / couponFrequency;

  const amortMap = new Map<string, number>(
    amortizationSchedule.map((item: { date: string; pct: number }) => [item.date, item.pct]),
  );

  let residual = 1.0;

  return dates.map((date) => {
    const dateStr = toISO(date);
    const amortPct = amortMap.get(dateStr) ?? 0;
    const coupon = Math.round(faceValue * residual * periodRate * 10000) / 10000;
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
 * Example: LECER, short CER bonds.
 */
function generateZeroCoupon(params: FlowGeneratorParams): GeneratedCashflow[] {
  return [
    {
      paymentDate: params.maturityDate,
      coupon: 0,
      amortization: params.faceValue,
      residual: 0,
    },
  ];
}

/**
 * CAPITALIZABLE — capital grows at TNA, single payment at maturity.
 * Example: LECAP, BONCAP, some Bonte.
 */
function generateCapitalizable(params: FlowGeneratorParams): GeneratedCashflow[] {
  const {
    maturityDate,
    issueDate,
    faceValue,
    capitalizationRate = 0,
    couponFrequency = 12,
  } = params;

  const issue = parseLocalDate(issueDate);
  const maturity = parseLocalDate(maturityDate);
  const msPerDay = 1000 * 60 * 60 * 24;
  const days = Math.round((maturity.getTime() - issue.getTime()) / msPerDay);
  const periods = days / (365 / couponFrequency);
  const periodRate = capitalizationRate / couponFrequency;
  const finalValue = Math.round(faceValue * Math.pow(1 + periodRate, periods) * 100) / 100;

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
 * CER — nominal flows identical to bullet or amortizable.
 * Adjustment coefficient is applied at analysis time, not here.
 */
function generateCER(params: FlowGeneratorParams): GeneratedCashflow[] {
  return (params.amortizationSchedule ?? []).length > 0
    ? generateAmortizable(params)
    : generateBullet(params);
}

/**
 * USD_LINKED — ARS flows indexed to official USD rate.
 * Adjustment coefficient is applied at analysis time, not here.
 */
function generateUSDLinked(params: FlowGeneratorParams): GeneratedCashflow[] {
  return (params.amortizationSchedule ?? []).length > 0
    ? generateAmortizable(params)
    : generateBullet(params);
}

// ── Main entry point ──────────────────────────────────────────────────────────

/**
 * Generates the nominal cash flow schedule for any supported Argentine
 * fixed income instrument based on its structural parameters.
 *
 * @throws Error if required parameters for the given flowType are missing.
 */
export function generateFlows(params: FlowGeneratorParams): GeneratedCashflow[] {
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
    case "TAMAR":
    case "DUAL":
      // Floating-rate instruments: cashflows are pre-seeded in the DB.
      // Generator not implemented — motor extension pending.
      throw new Error(`flowType ${params.flowType} requires pre-seeded cashflows`);
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

  if (parseLocalDate(maturityDate) <= parseLocalDate(issueDate)) {
    throw new Error("maturityDate must be after issueDate");
  }

  if (faceValue <= 0) {
    throw new Error("faceValue must be positive");
  }

  if (flowType === "BULLET" || flowType === "CER" || flowType === "USD_LINKED") {
    const hasSchedule = params.couponSchedule !== undefined && params.couponSchedule.length > 0;
    const hasAutoParams =
      params.couponRate !== undefined &&
      params.couponRate > 0 &&
      params.firstCouponDate !== undefined &&
      params.firstCouponDate !== "";
    if (!hasSchedule && !hasAutoParams) {
      throw new Error(
        `${flowType} requires either (couponRate + firstCouponDate) or couponSchedule`,
      );
    }
    if (!params.couponRate || params.couponRate <= 0) {
      throw new Error(`${flowType} requires couponRate`);
    }
  }

  if (flowType === "AMORTIZABLE") {
    if (!params.amortizationSchedule || params.amortizationSchedule.length === 0) {
      throw new Error("AMORTIZABLE requires amortizationSchedule");
    }
    const totalAmort = params.amortizationSchedule.reduce(
      (sum: number, item: { date: string; pct: number }) => sum + item.pct,
      0,
    );
    if (Math.abs(totalAmort - 1) > 0.001) {
      throw new Error(`Amortization schedule must sum to 1.0 (got ${totalAmort})`);
    }
  }

  if (flowType === "CAPITALIZABLE" && !params.capitalizationRate) {
    throw new Error("CAPITALIZABLE requires capitalizationRate");
  }
}
