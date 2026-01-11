/**
 * Trellis Server - Middleware Exports
 */

export { registerRequestIdMiddleware, REQUEST_ID_HEADER } from './request-id.js';
export { registerAuthMiddleware, extractAuthContext, AUTH_HEADERS } from './auth.js';
export { registerTenantMiddleware } from './tenant.js';
export {
  registerErrorHandler,
  getHttpStatusForKernelError,
  type ErrorResponse,
} from './error-handler.js';
