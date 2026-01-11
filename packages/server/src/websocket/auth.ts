/**
 * Trellis Server - WebSocket Authentication
 *
 * Handles authentication for WebSocket connections.
 * Supports JWT token in query string or first-message auth for development.
 */

import type { IncomingMessage } from 'node:http';
import type { TenantId, ActorId } from '@trellis/kernel';
import { verifyAccessToken } from '../auth/index.js';
import type { AuthMessage } from './protocol.js';

// =============================================================================
// TYPES
// =============================================================================

/**
 * Authentication context for a WebSocket connection.
 */
export interface WebSocketAuthContext {
  /** Tenant ID */
  readonly tenantId: TenantId;

  /** Actor (user) ID */
  readonly actorId: ActorId;

  /** Permissions granted */
  readonly permissions: readonly string[];
}

/**
 * Result of authentication attempt.
 */
export type AuthResult =
  | { success: true; context: WebSocketAuthContext }
  | { success: false; error: string };

// =============================================================================
// QUERY STRING AUTH (JWT)
// =============================================================================

/**
 * Attempt to authenticate from query string token.
 *
 * @param request - The HTTP upgrade request
 * @returns Auth result or null if no token in query string
 */
export function authenticateFromQueryString(
  request: IncomingMessage
): AuthResult | null {
  const url = new URL(request.url ?? '/', `http://${request.headers.host ?? 'localhost'}`);
  const token = url.searchParams.get('token');

  if (!token) {
    return null;
  }

  const result = verifyAccessToken(token);

  if (!result.success) {
    return { success: false, error: result.error };
  }

  return {
    success: true,
    context: {
      tenantId: result.payload.tenant_id as TenantId,
      actorId: result.payload.sub as ActorId,
      permissions: [...result.payload.permissions],
    },
  };
}

// =============================================================================
// MESSAGE AUTH (DEVELOPMENT)
// =============================================================================

/**
 * Check if we're in development mode.
 */
function isDevelopmentMode(): boolean {
  return process.env['NODE_ENV'] !== 'production';
}

/**
 * Authenticate from first message (development only).
 *
 * @param message - The auth message from client
 * @returns Auth result
 */
export function authenticateFromMessage(message: AuthMessage): AuthResult {
  // In production, require JWT token
  if (!isDevelopmentMode()) {
    return {
      success: false,
      error: 'Message-based authentication is only allowed in development mode. Use JWT token in query string.',
    };
  }

  // Validate required fields
  if (!message.tenant_id || message.tenant_id.length === 0) {
    return { success: false, error: 'Missing tenant_id in auth message' };
  }

  if (!message.actor_id || message.actor_id.length === 0) {
    return { success: false, error: 'Missing actor_id in auth message' };
  }

  return {
    success: true,
    context: {
      tenantId: message.tenant_id as TenantId,
      actorId: message.actor_id as ActorId,
      permissions: [], // No permissions from message auth
    },
  };
}

// =============================================================================
// CONNECTION AUTH
// =============================================================================

/**
 * Attempt to authenticate a WebSocket connection from the upgrade request.
 * This is called during the initial connection handshake.
 *
 * @param request - The HTTP upgrade request
 * @returns Auth result or null if auth should be deferred to first message
 */
export function authenticateConnection(
  request: IncomingMessage
): AuthResult | null {
  // Try query string token first
  const queryResult = authenticateFromQueryString(request);

  if (queryResult) {
    return queryResult;
  }

  // No token in query string - defer to first message auth
  // This is only allowed in development mode
  if (isDevelopmentMode()) {
    return null; // Defer to message auth
  }

  // In production, require token
  return {
    success: false,
    error: 'Missing authentication token in query string',
  };
}
