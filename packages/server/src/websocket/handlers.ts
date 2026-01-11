/**
 * Trellis Server - WebSocket Message Handlers
 *
 * Handlers for each type of client message.
 */

import type { WebSocket } from 'ws';
import type {
  ClientMessage,
  ServerMessage,
  AuthMessage,
  SubscribeMessage,
  UnsubscribeMessage,
  ErrorCode,
} from './protocol.js';
import { serializeServerMessage } from './protocol.js';
import type { SubscriptionManager } from './subscriptions.js';
import type { WebSocketAuthContext } from './auth.js';
import { authenticateFromMessage } from './auth.js';

// =============================================================================
// TYPES
// =============================================================================

/**
 * Context for handling messages.
 */
export interface HandlerContext {
  /** The WebSocket connection */
  readonly socket: WebSocket;

  /** Subscription manager */
  readonly subscriptionManager: SubscriptionManager;

  /** Auth context (null if not yet authenticated) */
  authContext: WebSocketAuthContext | null;

  /** Logger */
  readonly log: (level: 'info' | 'warn' | 'error', message: string, data?: Record<string, unknown>) => void;
}

/**
 * Result of handling a message.
 */
export interface HandleResult {
  /** Whether to continue processing messages */
  readonly continue: boolean;

  /** Updated auth context if changed */
  readonly authContext?: WebSocketAuthContext;
}

// =============================================================================
// SEND HELPERS
// =============================================================================

/**
 * Send a message to the client.
 */
function send(socket: WebSocket, message: ServerMessage): void {
  if (socket.readyState === 1 /* OPEN */) {
    socket.send(serializeServerMessage(message));
  }
}

/**
 * Send an error and optionally close the connection.
 */
function sendError(
  socket: WebSocket,
  code: ErrorCode,
  message: string,
  close = false
): void {
  send(socket, { type: 'error', code, message });

  if (close) {
    socket.close(1008, message); // 1008 = Policy Violation
  }
}

// =============================================================================
// HANDLERS
// =============================================================================

/**
 * Handle authentication message.
 */
export function handleAuth(
  context: HandlerContext,
  message: AuthMessage
): HandleResult {
  // Already authenticated?
  if (context.authContext) {
    sendError(context.socket, 'INVALID_MESSAGE', 'Already authenticated');
    return { continue: true };
  }

  const result = authenticateFromMessage(message);

  if (!result.success) {
    sendError(context.socket, 'AUTH_FAILED', result.error, true);
    return { continue: false };
  }

  context.log('info', 'WebSocket authenticated via message', {
    tenantId: result.context.tenantId,
    actorId: result.context.actorId,
  });

  send(context.socket, { type: 'authenticated' });

  return { continue: true, authContext: result.context };
}

/**
 * Handle subscribe message.
 */
export function handleSubscribe(
  context: HandlerContext,
  message: SubscribeMessage
): HandleResult {
  if (!context.authContext) {
    sendError(context.socket, 'AUTH_REQUIRED', 'Must authenticate before subscribing');
    return { continue: true };
  }

  const subscriptionId = context.subscriptionManager.subscribe(
    context.socket,
    context.authContext.tenantId,
    message
  );

  context.log('info', 'Subscription created', {
    subscriptionId,
    filter: {
      entityType: message.entity_type,
      entityId: message.entity_id,
      eventTypes: message.event_types,
    },
  });

  send(context.socket, { type: 'subscribed', subscription_id: subscriptionId });

  return { continue: true };
}

/**
 * Handle unsubscribe message.
 */
export function handleUnsubscribe(
  context: HandlerContext,
  message: UnsubscribeMessage
): HandleResult {
  if (!context.authContext) {
    sendError(context.socket, 'AUTH_REQUIRED', 'Must authenticate before unsubscribing');
    return { continue: true };
  }

  const removed = context.subscriptionManager.unsubscribe(message.subscription_id);

  if (!removed) {
    sendError(
      context.socket,
      'SUBSCRIPTION_NOT_FOUND',
      `Subscription ${message.subscription_id} not found`
    );
    return { continue: true };
  }

  context.log('info', 'Subscription removed', {
    subscriptionId: message.subscription_id,
  });

  send(context.socket, { type: 'unsubscribed', subscription_id: message.subscription_id });

  return { continue: true };
}

/**
 * Handle ping message.
 */
export function handlePing(context: HandlerContext): HandleResult {
  send(context.socket, { type: 'pong' });
  return { continue: true };
}

/**
 * Handle an unknown or invalid message.
 */
export function handleInvalidMessage(context: HandlerContext): HandleResult {
  sendError(context.socket, 'INVALID_MESSAGE', 'Invalid or malformed message');
  return { continue: true };
}

/**
 * Route a message to the appropriate handler.
 */
export function handleMessage(
  context: HandlerContext,
  message: ClientMessage
): HandleResult {
  switch (message.type) {
    case 'auth':
      return handleAuth(context, message);

    case 'subscribe':
      return handleSubscribe(context, message);

    case 'unsubscribe':
      return handleUnsubscribe(context, message);

    case 'ping':
      return handlePing(context);

    default:
      return handleInvalidMessage(context);
  }
}
