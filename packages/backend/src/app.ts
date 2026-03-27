import "dotenv/config";
import Fastify from "fastify";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import rateLimit from "@fastify/rate-limit";
import { env } from "./config/env.js";
import { MockBymaClient } from "./modules/byma/byma.mock.client.js";
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
await app.register(cors, { origin: corsOrigin, methods: ["GET"] });
await app.register(rateLimit, { max: 60, timeWindow: "1 minute" });
await app.register(calendarRouter, { prefix: "/api/v1/calendar" });
await app.register(adminRouter, { prefix: "/api/v1/admin" });

// ── Dependency injection ──────────────────────────────────────────────────────

/**
 * To switch from mock to live BYMA data:
 * 1. Replace MockBymaClient with BymaOfficialClient
 * 2. Set BYMA_API_KEY in .env
 * Nothing else needs to change.
 */
const bymaClient = new MockBymaClient();
const priceCache = new PriceCacheService(bymaClient);
const fxService = new FxService();
const bondsService = new BondsService(priceCache, fxService);
const compareService = new CompareService(bondsService);

// ── Routes ────────────────────────────────────────────────────────────────────

app.get("/health", async () => ({
  status: "ok",
  timestamp: new Date().toISOString(),
}));

await app.register(instrumentsRouter, { prefix: "/api/v1/instruments" });
await app.register(bondsRouter(bondsService), {
  prefix: "/api/v1/instruments",
});
await app.register(fxRouter(fxService), { prefix: "/api/v1/fx" });
await app.register(compareRouter(compareService), {
  prefix: "/api/v1/compare",
});

// ── Start ─────────────────────────────────────────────────────────────────────

const start = async (): Promise<void> => {
  try {
    await app.listen({ port: env.PORT, host: "0.0.0.0" });
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

start();
