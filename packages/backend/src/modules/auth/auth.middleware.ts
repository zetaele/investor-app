import type { FastifyRequest, FastifyReply } from "fastify";
import { getSessionUser } from "./auth.service.js";

declare module "fastify" {
  interface FastifyRequest {
    user?: import("./auth.service.js").SessionUser;
  }
}

/**
 * Fastify preHandler hook that validates the session cookie.
 * Attaches the authenticated user to request.user on success.
 * Returns 401 if the session is missing or expired.
 */
export async function requireAuth(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  const sessionId = request.cookies["sid"];

  if (!sessionId) {
    return reply.status(401).send({ error: "No autenticado" });
  }

  const user = await getSessionUser(sessionId);

  if (!user) {
    reply.clearCookie("sid", { path: "/" });
    return reply.status(401).send({ error: "Sesión expirada" });
  }

  request.user = user;
}

/**
 * Fastify preHandler hook that enforces plan access.
 * Must be used after requireAuth (relies on request.user being set).
 * Returns 402 if the user's TRIAL has expired.
 */
export async function requireActivePlan(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  const user = request.user!;
  if (
    user.plan === "TRIAL" &&
    user.trialExpiresAt !== null &&
    user.trialExpiresAt < new Date().toISOString()
  ) {
    return reply.status(402).send({
      error: "Tu prueba gratuita ha expirado. Actualizá tu plan para continuar.",
    });
  }
}
