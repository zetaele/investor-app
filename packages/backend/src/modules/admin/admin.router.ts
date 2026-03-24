import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { adminAuthHook } from "./admin.auth.js";
import {
  AdminError,
  createInstrument,
  deactivateInstrument,
  previewFlows,
  updateInstrument,
} from "./admin.service.js";

// ── Zod schemas ───────────────────────────────────────────────────────────────

const amortScheduleItemSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD"),
  pct: z.number().positive().max(1),
});

const flowParamsSchema = z.object({
  flowType: z.enum(["BULLET", "AMORTIZABLE", "ZERO_COUPON", "CAPITALIZABLE", "CER", "USD_LINKED"]),
  issueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  maturityDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  faceValue: z.number().positive().default(100),

  couponRate: z.number().positive().max(1).optional(),
  couponFrequency: z.union([z.literal(1), z.literal(2), z.literal(4), z.literal(12)]).optional(),
  firstCouponDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),

  amortizationSchedule: z.array(amortScheduleItemSchema).optional(),

  capitalizationRate: z.number().positive().max(1).optional(),

  adjustmentCoefficient: z.number().positive().optional(),

  couponSchedule: z
    .array(
      z.object({
        date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      }),
    )
    .optional(),
});

const createInstrumentSchema = z.object({
  ticker: z.string().regex(/^[A-Z0-9]{2,10}$/, "Ticker must be 2-10 uppercase alphanumeric chars"),
  name: z.string().min(3).max(200),
  type: z.enum(["BOND", "LETTER", "ON"]),
  flowType: z.enum(["BULLET", "AMORTIZABLE", "ZERO_COUPON", "CAPITALIZABLE", "CER", "USD_LINKED"]),
  currency: z.enum(["ARS", "USD", "USD_LINKED"]),
  market: z.string().optional(),
  issuer: z.string().optional(),
  maturityDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  flowParams: flowParamsSchema,
});

const updateInstrumentSchema = z.object({
  name: z.string().min(3).max(200).optional(),
  issuer: z.string().optional(),
  isActive: z.boolean().optional(),
  flowParams: flowParamsSchema.optional(),
});

const tickerParamSchema = z.object({
  ticker: z.string().regex(/^[A-Z0-9]{2,10}$/),
});

// ── Router ────────────────────────────────────────────────────────────────────

/**
 * Registers all /admin routes.
 * All routes are protected by the adminAuthHook.
 */
export async function adminRouter(app: FastifyInstance): Promise<void> {
  // Apply auth to all routes in this plugin
  app.addHook("preHandler", adminAuthHook);

  /**
   * GET /admin/health
   * Verifies admin access is working.
   */
  app.get("/health", async (_request, reply) => {
    return reply.send({ status: "ok", admin: true });
  });

  /**
   * POST /admin/instruments
   * Creates a new instrument and generates its cash flows.
   */
  app.post("/instruments", async (request, reply) => {
    const body = createInstrumentSchema.safeParse(request.body);

    if (!body.success) {
      return reply.status(400).send({
        error: "Invalid request body",
        details: body.error.flatten(),
      });
    }

    try {
      const result = await createInstrument(body.data);
      return reply.status(201).send({
        message: `Instrument ${result.ticker} created with ${result.flowCount} cash flows`,
        data: result,
      });
    } catch (err) {
      if (err instanceof AdminError) {
        return reply.status(err.statusCode).send({ error: err.message });
      }
      throw err;
    }
  });

  /**
   * POST /admin/instruments/preview-flows
   * Returns the cash flows that would be generated for given params, without persisting.
   * Use this in the admin UI before confirming instrument creation.
   */
  app.post("/instruments/preview-flows", async (request, reply) => {
    const body = flowParamsSchema.safeParse(request.body);

    if (!body.success) {
      return reply.status(400).send({
        error: "Invalid flow parameters",
        details: body.error.flatten(),
      });
    }

    try {
      const flows = previewFlows(body.data);
      return reply.send({
        data: flows,
        count: flows.length,
        totalCoupon: Math.round(flows.reduce((s, f) => s + f.coupon, 0) * 10000) / 10000,
        totalAmortization:
          Math.round(flows.reduce((s, f) => s + f.amortization, 0) * 10000) / 10000,
      });
    } catch (err) {
      if (err instanceof Error) {
        return reply.status(400).send({ error: err.message });
      }
      throw err;
    }
  });

  /**
   * PUT /admin/instruments/:ticker
   * Updates instrument metadata and optionally regenerates cash flows.
   */
  app.put("/instruments/:ticker", async (request, reply) => {
    const params = tickerParamSchema.safeParse(request.params);
    if (!params.success) {
      return reply.status(400).send({ error: "Invalid ticker format" });
    }

    const body = updateInstrumentSchema.safeParse(request.body);
    if (!body.success) {
      return reply.status(400).send({
        error: "Invalid request body",
        details: body.error.flatten(),
      });
    }

    try {
      const result = await updateInstrument(params.data.ticker, body.data);
      return reply.send({
        message:
          result.flowCount !== undefined
            ? `Instrument ${result.ticker} updated with ${result.flowCount} new cash flows`
            : `Instrument ${result.ticker} updated`,
        data: result,
      });
    } catch (err) {
      if (err instanceof AdminError) {
        return reply.status(err.statusCode).send({ error: err.message });
      }
      throw err;
    }
  });

  /**
   * DELETE /admin/instruments/:ticker
   * Soft-deletes an instrument (sets isActive = false).
   */
  app.delete("/instruments/:ticker", async (request, reply) => {
    const params = tickerParamSchema.safeParse(request.params);
    if (!params.success) {
      return reply.status(400).send({ error: "Invalid ticker format" });
    }

    try {
      await deactivateInstrument(params.data.ticker);
      return reply.send({
        message: `Instrument ${params.data.ticker} deactivated`,
      });
    } catch (err) {
      if (err instanceof AdminError) {
        return reply.status(err.statusCode).send({ error: err.message });
      }
      throw err;
    }
  });
}
