/**
 * Trellis Server - WebSocket Module
 *
 * Real-time WebSocket subscriptions for entity events.
 */

// Protocol types and utilities
export type {
  ClientMessage,
  ServerMessage,
  AuthMessage,
  SubscribeMessage,
  UnsubscribeMessage,
  PingMessage,
  AuthenticatedMessage,
  SubscribedMessage,
  UnsubscribedMessage,
  EventMessage,
  ErrorMessage,
  PongMessage,
  ErrorCode,
} from './protocol.js';

export { parseClientMessage, serializeServerMessage } from './protocol.js';

// Subscription management
export type {
  SubscriptionFilter,
  Subscription,
  SubscriptionStats,
} from './subscriptions.js';

export {
  SubscriptionManager,
  createSubscriptionManager,
} from './subscriptions.js';

// Authentication
export type { WebSocketAuthContext, AuthResult } from './auth.js';

export {
  authenticateFromQueryString,
  authenticateFromMessage,
  authenticateConnection,
} from './auth.js';

// Connection handling
export type { ConnectionOptions } from './connection.js';
export { handleConnection } from './connection.js';

// Message handlers
export type { HandlerContext, HandleResult } from './handlers.js';

export {
  handleMessage,
  handleAuth,
  handleSubscribe,
  handleUnsubscribe,
  handlePing,
  handleInvalidMessage,
} from './handlers.js';
