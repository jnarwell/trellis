/**
 * Trellis Server - Error Handler
 *
 * Global error handling for the Fastify server.
 * Maps KernelError codes to HTTP status codes.
 */

import type { FastifyInstance, FastifyRequest, FastifyReply, FastifyError } from 'fastify';
import type { KernelError, KernelErrorCode } from '@trellis/kernel';

/**
 * Check if an error is a KernelError.
 */
function isKernelError(error: unknown): error is KernelError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    'message' in error &&
    typeof (error as KernelError).code === 'string' &&
    typeof (error as KernelError).message === 'string'
  );
}

/**
 * Map KernelErrorCode to HTTP status code.
 */
const ERROR_STATUS_MAP: Record<KernelErrorCode, number> = {
  NOT_FOUND: 404,
  ALREADY_EXISTS: 409,
  VERSION_CONFLICT: 409,
  VALIDATION_ERROR: 400,
  TYPE_MISMATCH: 400,
  PERMISSION_DENIED: 403,
  TENANT_MISMATCH: 403,
  CIRCULAR_DEPENDENCY: 422,
  INVALID_EXPRESSION: 400,
  REFERENCE_BROKEN: 422,
};

/**
 * Get HTTP status code for a KernelErrorCode.
 */
export function getHttpStatusForKernelError(code: KernelErrorCode): number {
  return ERROR_STATUS_MAP[code] ?? 500;
}

/**
 * Error response format.
 */
export interface ErrorResponse {
  readonly code: string;
  readonly message: string;
  readonly details?: Record<string, unknown>;
  readonly requestId?: string;
}

/**
 * Build an error response with optional fields.
 */
function buildErrorResponse(
  code: string,
  message: string,
  details?: Record<string, unknown>,
  requestId?: string
): ErrorResponse {
  const response: ErrorResponse = { code, message };

  if (details !== undefined) {
    (response as { details: Record<string, unknown> }).details = details;
  }
  if (requestId !== undefined) {
    (response as { requestId: string }).requestId = requestId;
  }

  return response;
}

/**
 * Format an error for the response.
 */
function formatErrorResponse(
  error: KernelError | FastifyError | Error,
  requestId?: string
): ErrorResponse {
  if (isKernelError(error)) {
    return buildErrorResponse(
      error.code,
      error.message,
      error.details as Record<string, unknown> | undefined,
      requestId
    );
  }

  // Fastify validation errors
  if ('validation' in error && Array.isArray((error as FastifyError).validation)) {
    return buildErrorResponse(
      'VALIDATION_ERROR',
      error.message,
      { validation: (error as FastifyError).validation },
      requestId
    );
  }

  // Generic errors - don't expose details in production
  const isProduction = process.env['NODE_ENV'] === 'production';
  return buildErrorResponse(
    'INTERNAL_ERROR',
    isProduction ? 'An internal error occurred' : error.message,
    undefined,
    requestId
  );
}

/**
 * Register the global error handler.
 */
export function registerErrorHandler(fastify: FastifyInstance): void {
  fastify.setErrorHandler(
    async (error: FastifyError | Error, request: FastifyRequest, reply: FastifyReply) => {
      const requestId = request.requestId;

      // Log the error
      request.log.error(
        {
          err: error,
          requestId,
          url: request.url,
          method: request.method,
        },
        'Request error'
      );

      // Determine status code
      let statusCode = 500;

      if (isKernelError(error)) {
        statusCode = getHttpStatusForKernelError(error.code);
      } else if ('statusCode' in error && typeof error.statusCode === 'number') {
        statusCode = error.statusCode;
      }

      // Send error response
      const errorResponse = formatErrorResponse(error, requestId);
      return reply.status(statusCode).send(errorResponse);
    }
  );

  // Handle 404 for undefined routes
  fastify.setNotFoundHandler(
    async (request: FastifyRequest, reply: FastifyReply) => {
      const response = buildErrorResponse(
        'NOT_FOUND',
        `Route ${request.method} ${request.url} not found`,
        undefined,
        request.requestId
      );
      return reply.status(404).send(response);
    }
  );
}
