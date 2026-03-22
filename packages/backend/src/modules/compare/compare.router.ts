import type { FastifyInstance } from 'fastify'
import { compareQuerySchema } from '@investor-app/shared'
import type { CompareService } from './compare.service.js'

/**
 * Returns a Fastify plugin that registers the /compare route.
 * Accepts a CompareService instance for dependency injection.
 */
export function compareRouter(compareService: CompareService) {
  return async function (app: FastifyInstance): Promise<void> {
    /**
     * GET /compare
     * Returns a side-by-side financial analysis for 2 to 5 instruments.
     *
     * @query tickers         - Comma-separated ticker list, e.g. AL30,GD30,YPF24
     * @query displayCurrency - Output currency: ARS | USD | USD_LINKED (default: USD)
     *
     * @example
     * GET /api/v1/compare?tickers=AL30,GD30,YPF24&displayCurrency=USD
     */
    app.get('/', async (request, reply) => {
      const query = compareQuerySchema.safeParse(request.query)

      if (!query.success) {
        return reply.status(400).send({
          error: 'Invalid query parameters',
          details: query.error.flatten(),
        })
      }

      const { tickers, displayCurrency } = query.data
      const { entries, failed } = await compareService.compareInstruments(
        tickers,
        displayCurrency,
      )

      if (entries.length === 0) {
        return reply.status(404).send({
          error: 'None of the requested tickers could be resolved',
          failed,
        })
      }

      return reply.send({
        data: entries,
        count: entries.length,
        ...(failed.length > 0 && { failed }),
      })
    })
  }
}
