/**
 * Trellis Server - WebSocket Connection Management
 *
 * Handles the lifecycle of WebSocket connections.
 */

import type { IncomingMessage } from 'node:http';
import type { WebSocket } from 'ws';
import type { FastifyBaseLogger } from 'fastify';
import { parseClientMessage, serializeServerMessage } from './protocol.js';
import type { SubscriptionManager } from './subscriptions.js';
import { authenticateConnection } from './auth.js';
import type { WebSocketAuthContext } from './auth.js';
import { handleMessage, handleInvalidMessage } from './handlers.js';
import type { HandlerContext } from './handlers.js';

// =============================================================================
// TYPES
// =============================================================================

/**
 * Options for connection handling.
 */
export interface ConnectionOptions {
  /** Subscription manager */
  readonly subscriptionManager: SubscriptionManager;

  /** Logger */
  readonly logger: FastifyBaseLogger;
}

/**
 * Connection state.
 */
interface ConnectionState {
  /** Whether the connection is still active */
  active: boolean;

  /** Auth context (null if not authenticated) */
  authContext: WebSocketAuthContext | null;

  /** Connection ID for logging */
  connectionId: string;
}

// =============================================================================
// CONNECTION HANDLER
// =============================================================================

/**
 * Handle a new WebSocket connection.
 *
 * @param socket - The WebSocket connection
 * @param request - The HTTP upgrade request
 * @param options - Connection options
 */
export function handleConnection(
  socket: WebSocket,
  request: IncomingMessage,
  options: ConnectionOptions
): void {
  const { subscriptionManager, logger } = options;
  const connectionId = crypto.randomUUID().slice(0, 8);

  const state: ConnectionState = {
    active: true,
    authContext: null,
    connectionId,
  };

  // Create logger for this connection
  const log = (
    level: 'info' | 'warn' | 'error',
    message: string,
    data?: Record<string, unknown>
  ): void => {
    const logData = { ...data, connectionId };
    logger[level](logData, message);
  };

  log('info', 'WebSocket connection opened', {
    remoteAddress: request.socket.remoteAddress,
  });

  // Try to authenticate from query string
  const authResult = authenticateConnection(request);

  if (authResult) {
    if (authResult.success) {
      state.authContext = authResult.context;
      log('info', 'WebSocket authenticated via query string', {
        tenantId: authResult.context.tenantId,
        actorId: authResult.context.actorId,
      });

      // Send authenticated message
      socket.send(serializeServerMessage({ type: 'authenticated' }));
    } else {
      // Authentication failed
      log('warn', 'WebSocket authentication failed', { error: authResult.error });
      socket.send(
        serializeServerMessage({
          type: 'error',
          code: 'AUTH_FAILED',
          message: authResult.error,
        })
      );
      socket.close(1008, authResult.error);
      return;
    }
  }
  // If authResult is null, we're deferring to first-message auth (dev mode)

  // Handle incoming messages
  socket.on('message', (data) => {
    if (!state.active) {
      return;
    }

    let messageStr: string;
    try {
      messageStr = data.toString('utf-8');
    } catch {
      log('warn', 'Failed to decode message as UTF-8');
      handleInvalidMessage(createHandlerContext());
      return;
    }

    const message = parseClientMessage(messageStr);

    if (!message) {
      log('warn', 'Failed to parse client message', { raw: messageStr.slice(0, 100) });
      handleInvalidMessage(createHandlerContext());
      return;
    }

    const context = createHandlerContext();
    const result = handleMessage(context, message);

    // Update auth context if it changed
    if (result.authContext) {
      state.authContext = result.authContext;
    }

    // Stop processing if handler says so
    if (!result.continue) {
      state.active = false;
    }
  });

  // Handle connection close
  socket.on('close', (code, reason) => {
    state.active = false;

    // Clean up subscriptions
    const removedCount = subscriptionManager.removeAllForSocket(socket);

    log('info', 'WebSocket connection closed', {
      code,
      reason: reason.toString('utf-8'),
      subscriptionsRemoved: removedCount,
    });
  });

  // Handle errors
  socket.on('error', (error) => {
    log('error', 'WebSocket error', { error: error.message });
  });

  // Create handler context
  function createHandlerContext(): HandlerContext {
    return {
      socket,
      subscriptionManager,
      authContext: state.authContext,
      log,
    };
  }
}
