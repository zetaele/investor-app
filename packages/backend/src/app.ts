import "dotenv/config";
import Fastify from "fastify";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import rateLimit from "@fastify/rate-limit";
import cookie from "@fastify/cookie";
import oauth2 from "@fastify/oauth2";
import { env } from "./config/env.js";
import { Data912Client } from "./modules/byma/data912.client.js";
import { PriceCacheService } from "./modules/byma/byma.price-cache.service.js";
import { FxService } from "./modules/fx/fx.service.js";
import { BondsService } from "./modules/bonds/bonds.service.js";
import { CompareService } from "./modules/compare/compare.service.js";
import { instrumentsRouter } from "./modules/instruments/instruments.router.js";
import { bondsRouter } from "./modules/bonds/bonds.router.js";
import { fxRouter } from "./modules/fx/fx.router.js";
import { compareRouter } from "./modules/compare/compare.router.js";
import { calendarRouter } from "./modules/calendar/calendar.router.js";
import { adminRouter } from "./modules/admin/admin.router.js";
import { authRouter } from "./modules/auth/auth.router.js";
import { purgeExpiredSessions } from "./modules/auth/auth.service.js";
import { PortfolioService } from "./modules/portfolio/portfolio.service.js";
import { portfolioRouter } from "./modules/portfolio/portfolio.router.js";

const app = Fastify({
  logger: { level: env.NODE_ENV === "production" ? "warn" : "info" },
  bodyLimit: 1048576, // 1MB
});

// ── Security plugins ──────────────────────────────────────────────────────────

await app.register(helmet);

const corsOrigin =
  env.CORS_ORIGIN === "*"
    ? true
    : env.CORS_ORIGIN.split(",").map((o) => o.trim());
await app.register(cors, { origin: corsOrigin, methods: ["GET", "POST", "DELETE"], credentials: true });
await app.register(rateLimit, { max: 500, timeWindow: "1 minute" });

// ── Auth plugins (cookie before oauth2) ───────────────────────────────────────

await app.register(cookie, { secret: env.SESSION_SECRET });

await app.register(oauth2, {
  name: "oauth2Google",
  scope: ["openid", "email", "profile"],
  credentials: {
    client: { id: env.GOOGLE_CLIENT_ID, secret: env.GOOGLE_CLIENT_SECRET },
    auth: oauth2.GOOGLE_CONFIGURATION,
  },
  startRedirectPath: "/auth/login",
  callbackUri: env.GOOGLE_CALLBACK_URL,
});

// ── Dependency injection ──────────────────────────────────────────────────────

const bymaClient = new Data912Client();
const priceCache = new PriceCacheService(bymaClient);
const fxService = new FxService();
const bondsService = new BondsService(priceCache, fxService);
const compareService = new CompareService(bondsService);
const portfolioService = new PortfolioService(bondsService);

// ── Routes ────────────────────────────────────────────────────────────────────

app.get("/health", async () => ({
  status: "ok",
  timestamp: new Date().toISOString(),
}));

await app.register(authRouter, { prefix: "/auth" });
await app.register(calendarRouter, { prefix: "/api/v1/calendar" });
await app.register(adminRouter, { prefix: "/api/v1/admin" });
await app.register(instrumentsRouter, { prefix: "/api/v1/instruments" });
await app.register(bondsRouter(bondsService), { prefix: "/api/v1/instruments" });
await app.register(fxRouter(fxService), { prefix: "/api/v1/fx" });
await app.register(compareRouter(compareService), { prefix: "/api/v1/compare" });
await app.register(portfolioRouter(portfolioService), { prefix: "/api/v1/portfolios" });

// ── Start ─────────────────────────────────────────────────────────────────────

const start = async (): Promise<void> => {
  try {
    await app.listen({ port: env.PORT, host: "0.0.0.0" });
    // Purge expired sessions once at startup
    await purgeExpiredSessions();
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

start();
