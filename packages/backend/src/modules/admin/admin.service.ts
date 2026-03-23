import { eq } from "drizzle-orm";
import { db } from "../../db/index.js";
import { cashflows, instrumentConfig, instruments } from "../../db/schema.js";
import { generateFlows } from "../flow-generator/flow-generator.js";
import type { FlowGeneratorParams, FlowType } from "@investor-app/shared";

// ── Input types ───────────────────────────────────────────────────────────────

export interface CreateInstrumentInput {
  ticker: string;
  name: string;
  type: "BOND" | "LETTER" | "ON";
  flowType: FlowType;
  currency: "ARS" | "USD" | "USD_LINKED";
  market?: string | undefined;
  issuer?: string | undefined;
  maturityDate: string;
  flowParams: FlowGeneratorParams;
}

export interface UpdateInstrumentInput {
  name?: string | undefined;
  issuer?: string | undefined;
  isActive?: boolean | undefined;
  flowParams?: FlowGeneratorParams | undefined;
}

export interface UpdateInstrumentInput {
  name?: string;
  issuer?: string;
  isActive?: boolean;
  // Updating flow params regenerates all cashflows
  flowParams?: FlowGeneratorParams;
}

export class AdminError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number = 400,
  ) {
    super(message);
    this.name = "AdminError";
  }
}

// ── Service ───────────────────────────────────────────────────────────────────

/**
 * Creates a new instrument, generates its cash flows, and persists everything
 * in a single operation. Rolls back if flow generation fails.
 */
export async function createInstrument(
  input: CreateInstrumentInput,
): Promise<{ id: number; ticker: string; flowCount: number }> {
  // Check for duplicate ticker
  const existing = await db
    .select({ id: instruments.id })
    .from(instruments)
    .where(eq(instruments.ticker, input.ticker.toUpperCase()))
    .limit(1);

  if (existing.length > 0) {
    throw new AdminError(`Ticker ${input.ticker} already exists`, 409);
  }

  // Generate flows before persisting — fail fast if params are invalid
  const flows = generateFlows(input.flowParams);

  if (flows.length === 0) {
    throw new AdminError(
      "Flow generation produced no cash flows. Check the parameters.",
    );
  }

  // Insert instrument
  const [inserted] = await db
    .insert(instruments)
    .values({
      ticker: input.ticker.toUpperCase(),
      name: input.name,
      type: input.type,
      flowType: input.flowType,
      currency: input.currency,
      market: input.market ?? "BYMA",
      issuer: input.issuer ?? null,
      maturityDate: input.maturityDate,
      isActive: true,
    })
    .returning({ id: instruments.id, ticker: instruments.ticker });

  if (inserted === undefined) {
    throw new AdminError("Failed to insert instrument", 500);
  }

  // Insert instrument config
  await db.insert(instrumentConfig).values({
    instrumentId: inserted.id,
    couponRate: input.flowParams.couponRate ?? null,
    couponFrequency: input.flowParams.couponFrequency ?? null,
    firstCouponDate: input.flowParams.firstCouponDate ?? null,
    amortizationSchedule: input.flowParams.amortizationSchedule ?? null,
    capitalizationRate: input.flowParams.capitalizationRate ?? null,
    adjustmentCoefficient: input.flowParams.adjustmentCoefficient ?? null,
    adjustmentBase: null,
  });

  // Insert generated cash flows
  await db.insert(cashflows).values(
    flows.map((cf) => ({
      instrumentId: inserted.id,
      paymentDate: cf.paymentDate,
      coupon: cf.coupon,
      amortization: cf.amortization,
      residual: cf.residual,
    })),
  );

  return { id: inserted.id, ticker: inserted.ticker, flowCount: flows.length };
}

/**
 * Updates instrument metadata and optionally regenerates cash flows.
 * If flowParams is provided, all existing cash flows are deleted and replaced.
 */
export async function updateInstrument(
  ticker: string,
  input: UpdateInstrumentInput,
): Promise<{ ticker: string; flowCount?: number }> {
  const [existing] = await db
    .select()
    .from(instruments)
    .where(eq(instruments.ticker, ticker.toUpperCase()))
    .limit(1);

  if (existing === undefined) {
    throw new AdminError(`Instrument ${ticker} not found`, 404);
  }

  // Update metadata
  if (
    input.name !== undefined ||
    input.issuer !== undefined ||
    input.isActive !== undefined
  ) {
    await db
      .update(instruments)
      .set({
        ...(input.name !== undefined && { name: input.name }),
        ...(input.issuer !== undefined && { issuer: input.issuer }),
        ...(input.isActive !== undefined && { isActive: input.isActive }),
        updatedAt: new Date().toISOString(),
      })
      .where(eq(instruments.id, existing.id));
  }

  // Regenerate cash flows if new params provided
  if (input.flowParams !== undefined) {
    const flows = generateFlows(input.flowParams);

    if (flows.length === 0) {
      throw new AdminError(
        "Flow generation produced no cash flows. Check the parameters.",
      );
    }

    // Delete existing flows and config
    await db.delete(cashflows).where(eq(cashflows.instrumentId, existing.id));
    await db
      .delete(instrumentConfig)
      .where(eq(instrumentConfig.instrumentId, existing.id));

    // Insert fresh flows and config
    await db.insert(cashflows).values(
      flows.map((cf) => ({
        instrumentId: existing.id,
        paymentDate: cf.paymentDate,
        coupon: cf.coupon,
        amortization: cf.amortization,
        residual: cf.residual,
      })),
    );

    await db.insert(instrumentConfig).values({
      instrumentId: existing.id,
      couponRate: input.flowParams.couponRate ?? null,
      couponFrequency: input.flowParams.couponFrequency ?? null,
      firstCouponDate: input.flowParams.firstCouponDate ?? null,
      amortizationSchedule: input.flowParams.amortizationSchedule ?? null,
      capitalizationRate: input.flowParams.capitalizationRate ?? null,
      adjustmentCoefficient: input.flowParams.adjustmentCoefficient ?? null,
      adjustmentBase: null,
    });

    return { ticker: existing.ticker, flowCount: flows.length };
  }

  return { ticker: existing.ticker };
}

/**
 * Soft-deletes an instrument by setting isActive = false.
 * Cash flows are preserved for historical reference.
 */
export async function deactivateInstrument(ticker: string): Promise<void> {
  const [existing] = await db
    .select({ id: instruments.id })
    .from(instruments)
    .where(eq(instruments.ticker, ticker.toUpperCase()))
    .limit(1);

  if (existing === undefined) {
    throw new AdminError(`Instrument ${ticker} not found`, 404);
  }

  await db
    .update(instruments)
    .set({ isActive: false, updatedAt: new Date().toISOString() })
    .where(eq(instruments.id, existing.id));
}

/**
 * Previews the cash flows that would be generated for a given set of params,
 * without persisting anything. Used by the admin UI before confirming.
 */
export function previewFlows(
  params: FlowGeneratorParams,
): ReturnType<typeof generateFlows> {
  return generateFlows(params);
}
