import type { FastifyInstance } from "fastify";
import { z } from "zod";
import {
  analysisQuerySchema,
  currencySchema,
  instrumentTypeSchema,
  tickerParamSchema,
} from "@investor-app/shared";
import {
  getInstrument,
  getInstrumentCashflows,
  InstrumentNotFoundError,
  listInstruments,
} from "./instruments.service.js";

const listQuerySchema = z.object({
  type: instrumentTypeSchema.optional(),
  currency: currencySchema.optional(),
});

/**
 * Registers all /instruments routes on the provided Fastify instance.
 */
export async function instrumentsRouter(app: FastifyInstance): Promise<void> {
  /**
   * GET /instruments
   * Returns all active instruments, optionally filtered by type and/or currency.
   *
   * @query type    - Filter by instrument type: BOND | LETTER | ON
   * @query currency - Filter by currency: ARS | USD | USD_LINKED
   */
  app.get("/", async (request, reply) => {
    const query = listQuerySchema.safeParse(request.query);

    if (!query.success) {
      return reply.status(400).send({
        error: "Invalid query parameters",
        details: query.error.flatten(),
      });
    }

    const filters = {
      ...(query.data.type !== undefined && { type: query.data.type }),
      ...(query.data.currency !== undefined && {
        currency: query.data.currency,
      }),
    };

    const instruments = await listInstruments(filters);
    return reply.send({ data: instruments, count: instruments.length });
  });

  /**
   * GET /instruments/:ticker
   * Returns static data for a single instrument (no price).
   *
   * @param ticker - Instrument ticker, e.g. AL30
   */
  app.get("/:ticker", async (request, reply) => {
    const params = tickerParamSchema.safeParse(request.params);

    if (!params.success) {
      return reply.status(400).send({ error: "Invalid ticker format" });
    }

    try {
      const instrument = await getInstrument(params.data.ticker);
      return reply.send({ data: instrument });
    } catch (err) {
      if (err instanceof InstrumentNotFoundError) {
        return reply.status(404).send({ error: err.message });
      }
      throw err;
    }
  });

  /**
   * GET /instruments/:ticker/cashflows
   * Returns all scheduled cash flows (coupons + amortizations) for an instrument.
   *
   * @param ticker - Instrument ticker, e.g. AL30
   */
  app.get("/:ticker/cashflows", async (request, reply) => {
    const params = tickerParamSchema.safeParse(request.params);

    if (!params.success) {
      return reply.status(400).send({ error: "Invalid ticker format" });
    }

    try {
      const flows = await getInstrumentCashflows(params.data.ticker);
      return reply.send({ data: flows, count: flows.length });
    } catch (err) {
      if (err instanceof InstrumentNotFoundError) {
        return reply.status(404).send({ error: err.message });
      }
      throw err;
    }
  });
}
