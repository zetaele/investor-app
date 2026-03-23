import type { FastifyRequest, FastifyReply } from 'fastify'
import { env } from '../../config/env.js'

/**
 * Fastify preHandler hook that validates the admin token.
 *
 * Expects the token in the Authorization header:
 *   Authorization: Bearer <token>
 *
 * Usage: add as preHandler to any admin route or register on the admin plugin.
 */
export async function adminAuthHook(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const authHeader = request.headers['authorization']

  if (authHeader === undefined || authHeader === '') {
    return reply.status(401).send({ error: 'Authorization header required' })
  }

  const [scheme, token] = authHeader.split(' ')

  if (scheme !== 'Bearer' || token === undefined || token === '') {
    return reply.status(401).send({ error: 'Invalid authorization format. Use: Bearer <token>' })
  }

  if (token !== env.ADMIN_TOKEN) {
    return reply.status(403).send({ error: 'Invalid admin token' })
  }
}
