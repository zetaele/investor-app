import { eq, and, gt } from "drizzle-orm";
import { db } from "../../db/index.js";
import { cashflows, instrumentConfig, instruments } from "../../db/schema.js";
import type { Cashflow, Instrument } from "@investor-app/shared";

/**
 * Fetches all active instruments, optionally filtered by type and/or currency.
 */
export async function findAllInstruments(filters?: {
  type?: Instrument["type"];
  currency?: Instrument["currency"];
}): Promise<Instrument[]> {
  const today = new Date().toISOString().split("T")[0] ?? "";
  const conditions = [
    eq(instruments.isActive, true),
    gt(instruments.maturityDate, today), // exclude matured instruments
  ];

  if (filters?.type !== undefined) {
    conditions.push(eq(instruments.type, filters.type));
  }

  if (filters?.currency !== undefined) {
    conditions.push(eq(instruments.currency, filters.currency));
  }

  return db
    .select()
    .from(instruments)
    .where(and(...conditions))
    .orderBy(instruments.type, instruments.ticker);
}

/**
 * Fetches a single instrument by ticker (case-sensitive).
 * Returns undefined if not found or inactive.
 */
export async function findInstrumentByTicker(ticker: string): Promise<Instrument | undefined> {
  const result = await db
    .select()
    .from(instruments)
    .where(and(eq(instruments.ticker, ticker), eq(instruments.isActive, true)))
    .limit(1);

  return result[0];
}

/**
 * Fetches all scheduled cash flows for a given instrument, ordered by payment date.
 */
export async function findCashflowsByInstrumentId(instrumentId: number): Promise<Cashflow[]> {
  return db
    .select()
    .from(cashflows)
    .where(eq(cashflows.instrumentId, instrumentId))
    .orderBy(cashflows.paymentDate);
}

/**
 * Fetches the instrument config row for a given instrument, if it exists.
 * Returns undefined for instruments without a config entry (most regular bonds/ONs).
 */
export async function findInstrumentConfig(
  instrumentId: number,
): Promise<typeof instrumentConfig.$inferSelect | undefined> {
  const result = await db
    .select()
    .from(instrumentConfig)
    .where(eq(instrumentConfig.instrumentId, instrumentId))
    .limit(1);
  return result[0];
}
