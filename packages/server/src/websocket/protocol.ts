/**
 * Trellis Server - WebSocket Protocol
 *
 * Defines message types for WebSocket communication between client and server.
 */

import type { KernelEvent, EventType, EntityId, TypePath } from '@trellis/kernel';

// =============================================================================
// CLIENT MESSAGES (Client → Server)
// =============================================================================

/**
 * Authentication message - must be sent first after connection.
 */
export interface AuthMessage {
  readonly type: 'auth';
  readonly tenant_id: string;
  readonly actor_id: string;
}

/**
 * Subscribe to events matching a filter.
 */
export interface SubscribeMessage {
  readonly type: 'subscribe';
  /** Filter by entity type (e.g., "product", "product.variant") */
  readonly entity_type?: string;
  /** Filter by specific entity ID */
  readonly entity_id?: string;
  /** Filter by event types */
  readonly event_types?: readonly EventType[];
}

/**
 * Unsubscribe from a subscription.
 */
export interface UnsubscribeMessage {
  readonly type: 'unsubscribe';
  readonly subscription_id: string;
}

/**
 * Ping message for keep-alive.
 */
export interface PingMessage {
  readonly type: 'ping';
}

/**
 * Union of all client message types.
 */
export type ClientMessage =
  | AuthMessage
  | SubscribeMessage
  | UnsubscribeMessage
  | PingMessage;

// =============================================================================
// SERVER MESSAGES (Server → Client)
// =============================================================================

/**
 * Authentication successful.
 */
export interface AuthenticatedMessage {
  readonly type: 'authenticated';
}

/**
 * Subscription created successfully.
 */
export interface SubscribedMessage {
  readonly type: 'subscribed';
  readonly subscription_id: string;
}

/**
 * Subscription removed successfully.
 */
export interface UnsubscribedMessage {
  readonly type: 'unsubscribed';
  readonly subscription_id: string;
}

/**
 * Event notification.
 */
export interface EventMessage {
  readonly type: 'event';
  readonly subscription_id: string;
  readonly event: KernelEvent;
}

/**
 * Error message.
 */
export interface ErrorMessage {
  readonly type: 'error';
  readonly code: ErrorCode;
  readonly message: string;
}

/**
 * Pong response to ping.
 */
export interface PongMessage {
  readonly type: 'pong';
}

/**
 * Union of all server message types.
 */
export type ServerMessage =
  | AuthenticatedMessage
  | SubscribedMessage
  | UnsubscribedMessage
  | EventMessage
  | ErrorMessage
  | PongMessage;

// =============================================================================
// ERROR CODES
// =============================================================================

/**
 * WebSocket error codes.
 */
export type ErrorCode =
  | 'AUTH_REQUIRED'
  | 'AUTH_FAILED'
  | 'INVALID_MESSAGE'
  | 'SUBSCRIPTION_NOT_FOUND'
  | 'INTERNAL_ERROR';

// =============================================================================
// MESSAGE PARSING
// =============================================================================

/**
 * Parse a client message from JSON string.
 * Returns null if parsing fails.
 */
export function parseClientMessage(data: string): ClientMessage | null {
  try {
    const parsed = JSON.parse(data) as unknown;

    if (!isObject(parsed) || typeof parsed['type'] !== 'string') {
      return null;
    }

    const msgType = parsed['type'];

    switch (msgType) {
      case 'auth': {
        const tenantId = parsed['tenant_id'];
        const actorId = parsed['actor_id'];
        if (typeof tenantId === 'string' && typeof actorId === 'string') {
          return {
            type: 'auth',
            tenant_id: tenantId,
            actor_id: actorId,
          };
        }
        break;
      }

      case 'subscribe': {
        const entityType = parsed['entity_type'];
        const entityId = parsed['entity_id'];
        const eventTypes = parsed['event_types'];

        const message: SubscribeMessage = { type: 'subscribe' };

        if (typeof entityType === 'string') {
          (message as { entity_type?: string }).entity_type = entityType;
        }
        if (typeof entityId === 'string') {
          (message as { entity_id?: string }).entity_id = entityId;
        }
        if (Array.isArray(eventTypes)) {
          (message as { event_types?: readonly EventType[] }).event_types =
            eventTypes as EventType[];
        }

        return message;
      }

      case 'unsubscribe': {
        const subId = parsed['subscription_id'];
        if (typeof subId === 'string') {
          return {
            type: 'unsubscribe',
            subscription_id: subId,
          };
        }
        break;
      }

      case 'ping':
        return { type: 'ping' };
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Serialize a server message to JSON string.
 */
export function serializeServerMessage(message: ServerMessage): string {
  return JSON.stringify(message);
}

// =============================================================================
// HELPERS
// =============================================================================

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
