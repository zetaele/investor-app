import type { FastifyInstance } from 'fastify'
import type { FxService } from './fx.service.js'

/**
 * Returns a Fastify plugin that registers the /fx/rates route.
 * Accepts a FxService instance for dependency injection.
 */
export function fxRouter(fxService: FxService) {
  return async function (app: FastifyInstance): Promise<void> {
    /**
     * GET /fx/rates
     * Returns the latest ARS/USD exchange rates: official, MEP, and CCL.
     * Results are cached for CACHE_TTL_FX_SECONDS (default: 10 minutes).
     */
    app.get('/rates', async (_request, reply) => {
      const rates = await fxService.getRates()
      return reply.send({ data: rates })
    })
  }
}
