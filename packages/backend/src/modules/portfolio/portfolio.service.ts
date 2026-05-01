import { and, eq, gt, inArray } from "drizzle-orm";
import { db } from "../../db/index.js";
import { portfolios, portfolioInstruments, cashflows, instruments } from "../../db/schema.js";
import type { PortfolioDetail, PortfolioSummary, PortfolioHolding } from "@investor-app/shared";
import type { CalendarMonth, CalendarPayment } from "@investor-app/shared";
import type { BondsService } from "../bonds/bonds.service.js";

export class NotFoundError extends Error {}
export class ForbiddenError extends Error {}
export class InvalidTickerError extends Error {}

export class PortfolioService {
  constructor(private readonly bondsService: BondsService) {}

  // ── Portfolios ───────────────────────────────────────────────────────────────

  /**
   * Returns all portfolios owned by a user, each with a holding count.
   * @param userId - The authenticated user's ID.
   */
  async listPortfolios(userId: number): Promise<PortfolioSummary[]> {
    const rows = await db
      .select()
      .from(portfolios)
      .where(eq(portfolios.userId, userId))
      .orderBy(portfolios.createdAt);

    const summaries: PortfolioSummary[] = [];
    for (const p of rows) {
      const holdings = await db
        .select({ id: portfolioInstruments.id })
        .from(portfolioInstruments)
        .where(eq(portfolioInstruments.portfolioId, p.id));
      summaries.push({
        id: p.id,
        name: p.name,
        holdingCount: holdings.length,
        createdAt: p.createdAt,
      });
    }
    return summaries;
  }

  /**
   * Creates a new portfolio for a user and returns the summary.
   * @param userId - The authenticated user's ID.
   * @param name   - Display name for the new portfolio.
   */
  async createPortfolio(userId: number, name: string): Promise<PortfolioSummary> {
    const [row] = await db
      .insert(portfolios)
      .values({ userId, name })
      .returning();
    if (!row) throw new Error("Failed to create portfolio");
    return { id: row.id, name: row.name, holdingCount: 0, createdAt: row.createdAt };
  }

  /**
   * Returns full portfolio detail including live instrument analysis for each holding.
   * Holdings whose instrument or price is unavailable are silently skipped.
   * Throws NotFoundError if the portfolio does not belong to the user.
   *
   * @param portfolioId - The portfolio to load.
   * @param userId      - The requesting user (ownership check).
   */
  async getPortfolioDetail(portfolioId: number, userId: number): Promise<PortfolioDetail> {
    const portfolio = await this.requireOwnership(portfolioId, userId);

    const rows = await db
      .select()
      .from(portfolioInstruments)
      .where(eq(portfolioInstruments.portfolioId, portfolioId))
      .orderBy(portfolioInstruments.addedAt);

    const holdings: PortfolioHolding[] = [];

    for (const row of rows) {
      try {
        const analysis = await this.bondsService.analyzeInstrument(row.ticker, undefined);

        const currentValue =
          Math.round(row.quantity * analysis.calculations.dirtyPrice) / 100;

        const holding: PortfolioHolding = {
          ticker: analysis.ticker,
          name: analysis.name,
          type: analysis.type,
          currency: analysis.currency,
          maturityDate: analysis.maturityDate,
          quantity: row.quantity,
          market: analysis.market,
          calculations: analysis.calculations,
          currentValue,
        };

        if (row.purchasePrice !== null && row.purchasePrice !== undefined) {
          holding.purchasePrice = row.purchasePrice;
          const costBasis = Math.round(row.quantity * row.purchasePrice) / 100;
          holding.gainLoss = Math.round((currentValue - costBasis) * 100) / 100;
        }

        holdings.push(holding);
      } catch {
        // If price/instrument unavailable, skip with minimal info
      }
    }

    return {
      id: portfolio.id,
      name: portfolio.name,
      holdings,
      createdAt: portfolio.createdAt,
      updatedAt: portfolio.updatedAt,
    };
  }

  // ── Holdings ─────────────────────────────────────────────────────────────────

  /**
   * Adds an instrument to a portfolio by nominal quantity.
   * If the ticker is already present, accumulates quantity and recalculates
   * the weighted average purchase price.
   * Throws InvalidTickerError if the ticker is not in the instruments table.
   *
   * @param portfolioId - Target portfolio.
   * @param userId      - Requesting user (ownership check).
   * @param data        - Ticker, quantity (VN), and optional purchase price (clean).
   */
  async addInstrument(
    portfolioId: number,
    userId: number,
    data: { ticker: string; quantity: number; purchasePrice?: number },
  ): Promise<void> {
    await this.requireOwnership(portfolioId, userId);

    // Validate ticker exists
    const [instrument] = await db
      .select({ id: instruments.id })
      .from(instruments)
      .where(eq(instruments.ticker, data.ticker));
    if (!instrument) throw new InvalidTickerError(`Ticker ${data.ticker} no encontrado`);

    // Upsert: if ticker already in portfolio, accumulate quantity and recalculate weighted avg price
    const existing = await db
      .select()
      .from(portfolioInstruments)
      .where(
        and(
          eq(portfolioInstruments.portfolioId, portfolioId),
          eq(portfolioInstruments.ticker, data.ticker),
        ),
      );

    if (existing.length > 0 && existing[0]) {
      const prev = existing[0];
      const newQty = prev.quantity + data.quantity;

      let newPrice: number | null = null;
      if (prev.purchasePrice !== null && data.purchasePrice !== undefined) {
        newPrice =
          (prev.quantity * prev.purchasePrice + data.quantity * data.purchasePrice) / newQty;
      }

      await db
        .update(portfolioInstruments)
        .set({ quantity: newQty, purchasePrice: newPrice })
        .where(
          and(
            eq(portfolioInstruments.portfolioId, portfolioId),
            eq(portfolioInstruments.ticker, data.ticker),
          ),
        );
    } else {
      await db.insert(portfolioInstruments).values({
        portfolioId,
        ticker: data.ticker,
        quantity: data.quantity,
        purchasePrice: data.purchasePrice ?? null,
      });
    }

    await db
      .update(portfolios)
      .set({ updatedAt: new Date().toISOString() })
      .where(eq(portfolios.id, portfolioId));
  }

  /**
   * Removes an instrument from a portfolio entirely (no partial removal).
   * Throws NotFoundError if the portfolio does not belong to the user.
   *
   * @param portfolioId - Target portfolio.
   * @param userId      - Requesting user (ownership check).
   * @param ticker      - Ticker of the instrument to remove.
   */
  async removeInstrument(portfolioId: number, userId: number, ticker: string): Promise<void> {
    await this.requireOwnership(portfolioId, userId);
    await db
      .delete(portfolioInstruments)
      .where(
        and(
          eq(portfolioInstruments.portfolioId, portfolioId),
          eq(portfolioInstruments.ticker, ticker),
        ),
      );
    await db
      .update(portfolios)
      .set({ updatedAt: new Date().toISOString() })
      .where(eq(portfolios.id, portfolioId));
  }

  // ── Calendar ─────────────────────────────────────────────────────────────────

  /**
   * Returns upcoming payment dates for all instruments held in a portfolio,
   * grouped by calendar month and scaled by the holding's nominal quantity.
   *
   * @param portfolioId - Target portfolio.
   * @param userId      - Requesting user (ownership check).
   * @param daysAhead   - Look-ahead window in days (default: 730 ≈ 2 years).
   */
  async getPortfolioCalendar(
    portfolioId: number,
    userId: number,
    daysAhead = 730,
  ): Promise<CalendarMonth[]> {
    await this.requireOwnership(portfolioId, userId);

    const holdings = await db
      .select()
      .from(portfolioInstruments)
      .where(eq(portfolioInstruments.portfolioId, portfolioId));

    if (holdings.length === 0) return [];

    const tickers = holdings.map((h) => h.ticker);
    const quantityMap = new Map(holdings.map((h) => [h.ticker, h.quantity]));

    const today = new Date();
    const horizon = new Date(today.getTime() + daysAhead * 24 * 60 * 60 * 1000);
    const todayISO = today.toISOString().slice(0, 10)!;
    const horizonISO = horizon.toISOString().slice(0, 10)!;

    const rows = await db
      .select({
        paymentDate: cashflows.paymentDate,
        coupon: cashflows.coupon,
        amortization: cashflows.amortization,
        residual: cashflows.residual,
        ticker: instruments.ticker,
        instrumentName: instruments.name,
        instrumentType: instruments.type,
        currency: instruments.currency,
      })
      .from(cashflows)
      .innerJoin(instruments, eq(cashflows.instrumentId, instruments.id))
      .where(
        and(
          inArray(instruments.ticker, tickers),
          gt(cashflows.paymentDate, todayISO),
        ),
      )
      .orderBy(cashflows.paymentDate);

    const filtered = rows.filter(
      (r) =>
        r.paymentDate <= horizonISO &&
        (r.coupon > 0 || r.amortization > 0),
    );

    const monthMap = new Map<string, CalendarPayment[]>();

    for (const row of filtered) {
      const quantity = quantityMap.get(row.ticker) ?? 0;
      const totalFlow = row.coupon + row.amortization;
      const month = row.paymentDate.slice(0, 7)!;

      if (!monthMap.has(month)) monthMap.set(month, []);

      monthMap.get(month)!.push({
        paymentDate: row.paymentDate,
        ticker: row.ticker,
        instrumentName: row.instrumentName,
        instrumentType: row.instrumentType as "BOND" | "LETTER" | "ON",
        currency: row.currency as "ARS" | "USD" | "USD_LINKED",
        coupon: row.coupon,
        amortization: row.amortization,
        totalFlow,
        totalFlowScaled: Math.round((quantity * totalFlow) / 100 * 100) / 100,
        residualAfter: row.residual,
      });
    }

    return Array.from(monthMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, payments]) => ({
        month,
        label: formatMonthLabel(month),
        payments,
      }));
  }

  // ── Private ──────────────────────────────────────────────────────────────────

  /**
   * Loads a portfolio and verifies it belongs to the given user.
   * Throws NotFoundError if the portfolio is missing or owned by another user.
   */
  private async requireOwnership(portfolioId: number, userId: number) {
    const [portfolio] = await db
      .select()
      .from(portfolios)
      .where(and(eq(portfolios.id, portfolioId), eq(portfolios.userId, userId)));

    if (!portfolio) throw new NotFoundError("Portfolio not found");
    return portfolio;
  }
}

/**
 * Formats a "YYYY-MM" string into a human-readable Spanish label.
 * e.g. "2026-07" → "Julio 2026"
 */
function formatMonthLabel(month: string): string {
  const [year, monthNum] = month.split("-");
  if (!year || !monthNum) return month;
  const date = new Date(Number(year), Number(monthNum) - 1, 1);
  return date.toLocaleDateString("es-AR", { month: "long", year: "numeric" });
}
