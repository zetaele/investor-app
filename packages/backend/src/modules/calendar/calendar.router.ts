import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { getUpcomingPayments } from './calendar.service.js'

const calendarQuerySchema = z.object({
  days: z.coerce.number().int().positive().max(1825).optional().default(730),
})

/**
 * Registers the /calendar route on the provided Fastify instance.
 */
export async function calendarRouter(app: FastifyInstance): Promise<void> {
  /**
   * GET /calendar
   * Returns all upcoming cash flow payments across active instruments,
   * grouped by calendar month.
   *
   * @query days - Lookahead window in days (default: 730, max: 1825 / ~5 years)
   */
  app.get('/', async (request, reply) => {
    const query = calendarQuerySchema.safeParse(request.query)

    if (!query.success) {
      return reply.status(400).send({
        error: 'Invalid query parameters',
        details: query.error.flatten(),
      })
    }

    const months = await getUpcomingPayments(query.data.days)

    return reply.send({
      data: months,
      count: months.reduce((sum, m) => sum + m.payments.length, 0),
      months: months.length,
    })
  })
}
