import type { FastifyInstance } from "fastify";
import { requireAuth } from "../auth/auth.middleware.js";
import { NotFoundError, InvalidTickerError, PortfolioService } from "./portfolio.service.js";
import { z } from "zod";

const createPortfolioSchema = z.object({
  name: z.string().min(1).max(50),
});

const addInstrumentSchema = z.object({
  ticker: z.string().regex(/^[A-Z0-9]{2,10}$/),
  quantity: z.number().positive(),
  purchasePrice: z.number().positive().optional(),
});

const calendarQuerySchema = z.object({
  days: z.coerce.number().int().positive().max(1825).default(730),
});

export function portfolioRouter(portfolioService: PortfolioService) {
  return async function (app: FastifyInstance): Promise<void> {

    /** GET /api/v1/portfolios — list the current user's portfolios */
    app.get("/", { preHandler: requireAuth }, async (request, reply) => {
      const userId = request.user!.id;
      const data = await portfolioService.listPortfolios(userId);
      return reply.send({ data });
    });

    /** POST /api/v1/portfolios — create a new portfolio */
    app.post("/", { preHandler: requireAuth }, async (request, reply) => {
      const body = createPortfolioSchema.safeParse(request.body);
      if (!body.success) {
        return reply.status(400).send({ error: body.error.issues[0]?.message ?? "Invalid body" });
      }
      const userId = request.user!.id;
      const data = await portfolioService.createPortfolio(userId, body.data.name);
      return reply.status(201).send({ data });
    });

    /** GET /api/v1/portfolios/:id — get portfolio detail with holdings */
    app.get("/:id", { preHandler: requireAuth }, async (request, reply) => {
      const id = Number((request.params as { id: string }).id);
      if (!Number.isInteger(id) || id <= 0) {
        return reply.status(400).send({ error: "Invalid portfolio id" });
      }
      try {
        const data = await portfolioService.getPortfolioDetail(id, request.user!.id);
        return reply.send({ data });
      } catch (err) {
        if (err instanceof NotFoundError) return reply.status(404).send({ error: err.message });
        throw err;
      }
    });

    /** POST /api/v1/portfolios/:id/instruments — add or update an instrument */
    app.post("/:id/instruments", { preHandler: requireAuth }, async (request, reply) => {
      const id = Number((request.params as { id: string }).id);
      if (!Number.isInteger(id) || id <= 0) {
        return reply.status(400).send({ error: "Invalid portfolio id" });
      }
      const body = addInstrumentSchema.safeParse(request.body);
      if (!body.success) {
        return reply.status(400).send({ error: body.error.issues[0]?.message ?? "Invalid body" });
      }
      try {
        const { ticker, quantity, purchasePrice } = body.data;
        await portfolioService.addInstrument(id, request.user!.id, {
          ticker,
          quantity,
          ...(purchasePrice !== undefined && { purchasePrice }),
        });
        return reply.status(200).send({ ok: true });
      } catch (err) {
        if (err instanceof NotFoundError) return reply.status(404).send({ error: err.message });
        if (err instanceof InvalidTickerError) return reply.status(404).send({ error: err.message });
        throw err;
      }
    });

    /** DELETE /api/v1/portfolios/:id/instruments/:ticker — remove an instrument */
    app.delete("/:id/instruments/:ticker", { preHandler: requireAuth }, async (request, reply) => {
      const { id, ticker } = request.params as { id: string; ticker: string };
      const portfolioId = Number(id);
      if (!Number.isInteger(portfolioId) || portfolioId <= 0) {
        return reply.status(400).send({ error: "Invalid portfolio id" });
      }
      try {
        await portfolioService.removeInstrument(portfolioId, request.user!.id, ticker);
        return reply.send({ ok: true });
      } catch (err) {
        if (err instanceof NotFoundError) return reply.status(404).send({ error: err.message });
        throw err;
      }
    });

    /** GET /api/v1/portfolios/:id/calendar — consolidated cashflow calendar */
    app.get("/:id/calendar", { preHandler: requireAuth }, async (request, reply) => {
      const id = Number((request.params as { id: string }).id);
      if (!Number.isInteger(id) || id <= 0) {
        return reply.status(400).send({ error: "Invalid portfolio id" });
      }
      const query = calendarQuerySchema.safeParse(request.query);
      try {
        const data = await portfolioService.getPortfolioCalendar(
          id,
          request.user!.id,
          query.success ? query.data.days : 730,
        );
        return reply.send({ data });
      } catch (err) {
        if (err instanceof NotFoundError) return reply.status(404).send({ error: err.message });
        throw err;
      }
    });
  };
}
