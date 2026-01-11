/**
 * Trellis Server - Request ID Middleware
 *
 * Generates or extracts request IDs for tracing.
 */

import type { FastifyInstance } from 'fastify';
import { randomUUID } from 'node:crypto';

/** Header name for request ID */
export const REQUEST_ID_HEADER = 'x-request-id';

/**
 * Register request ID middleware.
 * Extracts request ID from header or generates a new one.
 */
export function registerRequestIdMiddleware(fastify: FastifyInstance): void {
  fastify.addHook('onRequest', async (request, reply) => {
    // Extract from header or generate new UUID
    const headerValue = request.headers[REQUEST_ID_HEADER];
    const requestId =
      typeof headerValue === 'string' && headerValue.length > 0
        ? headerValue
        : randomUUID();

    // Set on request object (Fastify already has request.id, but we use our own)
    request.requestId = requestId;

    // Echo back in response header
    void reply.header(REQUEST_ID_HEADER, requestId);
  });
}
