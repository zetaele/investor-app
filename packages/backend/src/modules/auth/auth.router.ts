import type { FastifyInstance } from "fastify";
import { env } from "../../config/env.js";
import { createSession, deleteSession, upsertUser } from "./auth.service.js";
import { requireAuth } from "./auth.middleware.js";

// SameSite=None + Secure required for cross-origin cookie (frontend on Vercel, backend on Render).
const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: env.NODE_ENV === "production",
  sameSite: (env.NODE_ENV === "production" ? "none" : "lax") as "none" | "lax",
  path: "/",
  maxAge: 60 * 60 * 24 * 30, // 30 days
};

export async function authRouter(app: FastifyInstance): Promise<void> {
  // GET /auth/login — redirects to Google with prompt=select_account
  app.get("/login", async (request, reply) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (app.oauth2Google as any).generateAuthorizationUri(request, reply, { prompt: "select_account" });
  });

  // GET /auth/callback — Google redirects here after user consents
  app.get("/callback", async (request, reply) => {
    try {
      const tokenResponse =
        await app.oauth2Google!.getAccessTokenFromAuthorizationCodeFlow(request);
      const accessToken = tokenResponse.token.access_token as string;

      const res = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (!res.ok) {
        return reply.status(502).send({ error: "No se pudo obtener el perfil de Google" });
      }

      const profile = (await res.json()) as {
        sub: string;
        email: string;
        name: string;
        picture: string;
      };

      const user = await upsertUser(profile);
      const sessionId = await createSession(user.id);

      reply.setCookie("sid", sessionId, COOKIE_OPTIONS);
      return reply.redirect(`${env.FRONTEND_URL}?login=success`);
    } catch (err) {
      app.log.error(err, "OAuth callback error");
      return reply.redirect(`${env.FRONTEND_URL}?login=error`);
    }
  });

  // GET /auth/me — returns the authenticated user
  app.get("/me", { preHandler: requireAuth }, async (request, reply) => {
    return reply.send(request.user);
  });

  // POST /auth/logout — clears the session
  app.post("/logout", { preHandler: requireAuth }, async (request, reply) => {
    const sessionId = request.cookies["sid"]!;
    await deleteSession(sessionId);
    reply.clearCookie("sid", { path: "/" });
    return reply.send({ ok: true });
  });
}
