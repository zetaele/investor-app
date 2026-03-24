import type { FastifyInstance } from "fastify";
import { analysisQuerySchema, simulateQuerySchema, tickerParamSchema } from "@investor-app/shared";
import type { BondsService } from "./bonds.service.js";
import { InstrumentNotFoundError } from "./bonds.service.js";
import { BymaInstrumentNotFoundError } from "../byma/byma.types.js";

/**
 * Returns a Fastify plugin that registers bond-related routes.
 * Accepts a BondsService instance for dependency injection.
 */
export function bondsRouter(bondsService: BondsService) {
  return async function (app: FastifyInstance): Promise<void> {
    /**
     * GET /instruments/:ticker/analysis
     * Returns a full financial analysis for a single instrument.
     *
     * Combines static instrument data, live market price (via BYMA or mock),
     * and computed metrics: YTM, modified duration, clean/dirty price, accrued interest.
     *
     * @param ticker          - Instrument ticker, e.g. AL30
     * @query displayCurrency - Output currency: ARS | USD | USD_LINKED (default: USD)
     */
    app.get("/:ticker/analysis", async (request, reply) => {
      const params = tickerParamSchema.safeParse(request.params);
      if (!params.success) {
        return reply.status(400).send({ error: "Invalid ticker format" });
      }

      const query = analysisQuerySchema.safeParse(request.query);
      if (!query.success) {
        return reply.status(400).send({ error: "Invalid query parameters" });
      }

      try {
        const analysis = await bondsService.analyzeInstrument(
          params.data.ticker,
          query.data.displayCurrency,
        );
        return reply.send({ data: analysis });
      } catch (err) {
        if (err instanceof InstrumentNotFoundError) {
          return reply.status(404).send({ error: err.message });
        }
        if (err instanceof BymaInstrumentNotFoundError) {
          return reply.status(404).send({
            error: `Price not available for ticker: ${params.data.ticker}. Add it to the mock client or wait for live BYMA data.`,
          });
        }
        throw err;
      }
    });

    /**
     * GET /instruments/:ticker/simulate
     * Simulates bond metrics at a hypothetical price or YTM.
     *
     * Provide exactly one of:
     *   - price: dirty price in displayCurrency → returns YTM, duration, clean price, etc.
     *   - ytm:   annual yield as decimal (e.g. 0.15) → returns theoretical price and all metrics.
     *
     * @param ticker          - Instrument ticker, e.g. AL30
     * @query price           - Hypothetical dirty price (positive number)
     * @query ytm             - Hypothetical YTM as decimal (e.g. 0.12 for 12%)
     * @query displayCurrency - Output currency: ARS | USD | USD_LINKED (default: USD)
     */
    app.get("/:ticker/simulate", async (request, reply) => {
      const params = tickerParamSchema.safeParse(request.params);
      if (!params.success) {
        return reply.status(400).send({ error: "Invalid ticker format" });
      }

      const query = simulateQuerySchema.safeParse(request.query);
      if (!query.success) {
        return reply.status(400).send({
          error: query.error.issues[0]?.message ?? "Invalid query parameters",
        });
      }

      const input =
        query.data.price !== undefined ? { price: query.data.price } : { ytm: query.data.ytm! };

      try {
        const result = await bondsService.simulate(
          params.data.ticker,
          input,
          query.data.displayCurrency,
        );
        return reply.send({ data: result });
      } catch (err) {
        if (err instanceof InstrumentNotFoundError) {
          return reply.status(404).send({ error: err.message });
        }
        throw err;
      }
    });
  };
}
