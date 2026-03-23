import type { FastifyInstance } from "fastify";
import { analysisQuerySchema, tickerParamSchema } from "@investor-app/shared";
import type { BondsService } from "./bonds.service.js";
import { InstrumentNotFoundError } from "./bonds.service.js";
import { BymaInstrumentNotFoundError } from "../byma/byma.types.js";

/**
 * Returns a Fastify plugin that registers the /instruments/:ticker/analysis route.
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
  };
}
