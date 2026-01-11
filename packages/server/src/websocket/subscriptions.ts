/**
 * Trellis Server - WebSocket Subscription Manager
 *
 * Manages WebSocket subscriptions and event broadcasting.
 */

import { uuidv7 } from 'uuidv7';
import type { WebSocket } from 'ws';
import type { KernelEvent, EventType, TenantId } from '@trellis/kernel';
import type { SubscribeMessage, EventMessage } from './protocol.js';
import { serializeServerMessage } from './protocol.js';

// =============================================================================
// TYPES
// =============================================================================

/**
 * Filter for matching events to subscriptions.
 */
export interface SubscriptionFilter {
  /** Filter by entity type (TypePath prefix match) */
  readonly entityType?: string;

  /** Filter by specific entity ID */
  readonly entityId?: string;

  /** Filter by event types */
  readonly eventTypes?: readonly EventType[];
}

/**
 * An active subscription.
 */
export interface Subscription {
  /** Unique subscription ID */
  readonly id: string;

  /** WebSocket connection */
  readonly socket: WebSocket;

  /** Tenant ID (for isolation) */
  readonly tenantId: TenantId;

  /** Subscription filter */
  readonly filter: SubscriptionFilter;

  /** When the subscription was created */
  readonly createdAt: Date;
}

/**
 * Statistics about the subscription manager.
 */
export interface SubscriptionStats {
  /** Total number of active subscriptions */
  readonly subscriptionCount: number;

  /** Number of unique connections with subscriptions */
  readonly connectionCount: number;
}

// =============================================================================
// SUBSCRIPTION MANAGER
// =============================================================================

/**
 * Manages WebSocket subscriptions and event broadcasting.
 */
export class SubscriptionManager {
  /** All active subscriptions by ID */
  private readonly subscriptions = new Map<string, Subscription>();

  /** Map from socket to subscription IDs for cleanup */
  private readonly socketSubscriptions = new Map<WebSocket, Set<string>>();

  /**
   * Subscribe a socket to events matching the filter.
   *
   * @param socket - The WebSocket connection
   * @param tenantId - The tenant ID for isolation
   * @param message - The subscribe message
   * @returns The subscription ID
   */
  subscribe(
    socket: WebSocket,
    tenantId: TenantId,
    message: SubscribeMessage
  ): string {
    const id = uuidv7();

    // Build filter object, only including properties that are defined
    const filter: SubscriptionFilter = {};
    if (message.entity_type !== undefined) {
      (filter as { entityType?: string }).entityType = message.entity_type;
    }
    if (message.entity_id !== undefined) {
      (filter as { entityId?: string }).entityId = message.entity_id;
    }
    if (message.event_types !== undefined) {
      (filter as { eventTypes?: readonly EventType[] }).eventTypes =
        message.event_types;
    }

    const subscription: Subscription = {
      id,
      socket,
      tenantId,
      filter,
      createdAt: new Date(),
    };

    this.subscriptions.set(id, subscription);

    // Track subscription for this socket
    let socketSubs = this.socketSubscriptions.get(socket);
    if (!socketSubs) {
      socketSubs = new Set();
      this.socketSubscriptions.set(socket, socketSubs);
    }
    socketSubs.add(id);

    return id;
  }

  /**
   * Unsubscribe by subscription ID.
   *
   * @param subscriptionId - The subscription ID
   * @returns True if subscription was found and removed
   */
  unsubscribe(subscriptionId: string): boolean {
    const subscription = this.subscriptions.get(subscriptionId);

    if (!subscription) {
      return false;
    }

    this.subscriptions.delete(subscriptionId);

    // Remove from socket tracking
    const socketSubs = this.socketSubscriptions.get(subscription.socket);
    if (socketSubs) {
      socketSubs.delete(subscriptionId);
      if (socketSubs.size === 0) {
        this.socketSubscriptions.delete(subscription.socket);
      }
    }

    return true;
  }

  /**
   * Remove all subscriptions for a socket (on disconnect).
   *
   * @param socket - The WebSocket connection
   * @returns Number of subscriptions removed
   */
  removeAllForSocket(socket: WebSocket): number {
    const socketSubs = this.socketSubscriptions.get(socket);

    if (!socketSubs) {
      return 0;
    }

    const count = socketSubs.size;

    for (const id of socketSubs) {
      this.subscriptions.delete(id);
    }

    this.socketSubscriptions.delete(socket);

    return count;
  }

  /**
   * Broadcast an event to all matching subscriptions.
   *
   * @param event - The kernel event to broadcast
   */
  broadcast(event: KernelEvent): void {
    // TODO: Rate limiting in Phase 3

    for (const [id, subscription] of this.subscriptions) {
      // Tenant isolation - CRITICAL
      if (event.tenant_id !== subscription.tenantId) {
        continue;
      }

      // Check filter match
      if (!this.matchesFilter(event, subscription.filter)) {
        continue;
      }

      // Send to subscriber
      const message: EventMessage = {
        type: 'event',
        subscription_id: id,
        event,
      };

      try {
        if (subscription.socket.readyState === 1 /* OPEN */) {
          subscription.socket.send(serializeServerMessage(message));
        }
      } catch (err) {
        // Socket may have closed - will be cleaned up on disconnect
        console.error('Failed to send event to subscriber:', err);
      }
    }
  }

  /**
   * Check if an event matches a subscription filter.
   */
  private matchesFilter(event: KernelEvent, filter: SubscriptionFilter): boolean {
    // Event type filter
    if (filter.eventTypes && filter.eventTypes.length > 0) {
      if (!filter.eventTypes.includes(event.event_type)) {
        return false;
      }
    }

    // Entity ID filter
    if (filter.entityId) {
      if (event.entity_id !== filter.entityId) {
        return false;
      }
    }

    // Entity type filter (for entity events)
    if (filter.entityType) {
      const entityType = this.getEntityType(event);
      if (!entityType) {
        return false;
      }

      // Prefix match: "product" matches "product", "product.variant", etc.
      if (!entityType.startsWith(filter.entityType)) {
        return false;
      }
    }

    return true;
  }

  /**
   * Extract entity type from event if available.
   */
  private getEntityType(event: KernelEvent): string | null {
    switch (event.event_type) {
      case 'entity_created':
        return event.payload.type;
      case 'entity_deleted':
        return event.payload.type;
      case 'type_schema_created':
        return event.payload.type;
      case 'type_schema_updated':
        return event.payload.type;
      default:
        return null;
    }
  }

  /**
   * Get subscription statistics.
   */
  getStats(): SubscriptionStats {
    return {
      subscriptionCount: this.subscriptions.size,
      connectionCount: this.socketSubscriptions.size,
    };
  }

  /**
   * Get all subscription IDs for a socket.
   */
  getSubscriptionsForSocket(socket: WebSocket): readonly string[] {
    const subs = this.socketSubscriptions.get(socket);
    return subs ? Array.from(subs) : [];
  }

  /**
   * Check if a subscription exists.
   */
  hasSubscription(subscriptionId: string): boolean {
    return this.subscriptions.has(subscriptionId);
  }
}

/**
 * Create a new subscription manager.
 */
export function createSubscriptionManager(): SubscriptionManager {
  return new SubscriptionManager();
}
