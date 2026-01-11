/**
 * Trellis Server - Query Route Handler
 *
 * POST /query - Query entities with filtering, sorting, and pagination.
 */

import type { FastifyRequest, FastifyReply } from 'fastify';
import type { FilterGroup, SortSpec, KernelError } from '@trellis/kernel';
import { queryRequestSchema, type QueryRequest } from './schemas.js';
import { QueryService } from '../../services/query-service.js';

/**
 * POST /query handler.
 *
 * Queries entities with optional filtering, sorting, and pagination.
 */
export async function queryHandler(
  request: FastifyRequest<{ Body: unknown }>,
  reply: FastifyReply
): Promise<void> {
  // Validate request body
  const parseResult = queryRequestSchema.safeParse(request.body);

  if (!parseResult.success) {
    const error: KernelError = {
      code: 'VALIDATION_ERROR',
      message: 'Invalid query request',
      details: { issues: parseResult.error.issues },
    };
    return reply.status(400).send(error);
  }

  const body: QueryRequest = parseResult.data;
  const { tenantId } = request.auth;

  // Create query service
  const queryService = new QueryService(request.server.pg);

  try {
    // Build query options - only include defined values
    const queryOptions: Parameters<typeof queryService.queryEntities>[1] = {};

    if (body.type) {
      queryOptions.type = body.type;
    }
    if (body.filter) {
      queryOptions.filter = body.filter as FilterGroup;
    }
    if (body.sort) {
      queryOptions.sort = body.sort as SortSpec[];
    }
    if (body.pagination?.limit !== undefined) {
      queryOptions.limit = body.pagination.limit;
    }
    if (body.pagination?.offset !== undefined) {
      queryOptions.offset = body.pagination.offset;
    }
    if (body.pagination?.cursor) {
      queryOptions.cursor = body.pagination.cursor;
    }
    if (body.include_total) {
      queryOptions.includeTotal = body.include_total;
    }

    // Execute query
    const result = await queryService.queryEntities(tenantId, queryOptions);

    return reply.status(200).send(result);
  } catch (err) {
    request.log.error({ err }, 'Query execution failed');

    // Check if it's a known error type
    if (err instanceof Error && err.message.startsWith('Invalid')) {
      const error: KernelError = {
        code: 'VALIDATION_ERROR',
        message: err.message,
      };
      return reply.status(400).send(error);
    }

    // Re-throw for global error handler
    throw err;
  }
}
