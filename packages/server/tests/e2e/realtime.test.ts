/**
 * Trellis E2E Tests - Real-time Subscriptions
 *
 * Tests for WebSocket connections, subscriptions, and event broadcasting.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { WebSocket } from 'ws';
import type { KernelEvent, TenantId, ActorId, EventType } from '@trellis/kernel';
import {
  parseClientMessage,
  serializeServerMessage,
  createSubscriptionManager,
  authenticateFromMessage,
  handleAuth,
  handleSubscribe,
  handleUnsubscribe,
  handlePing,
  handleMessage,
  handleInvalidMessage,
  type SubscriptionManager,
  type ClientMessage,
  type ServerMessage,
  type HandlerContext,
} from '../../src/websocket/index.js';

// =============================================================================
// TEST UTILITIES
// =============================================================================

/**
 * Create a mock WebSocket for testing.
 */
function createMockSocket(): WebSocket & { sentMessages: ServerMessage[] } {
  const sentMessages: ServerMessage[] = [];

  return {
    readyState: 1, // OPEN
    send: vi.fn((data: string) => {
      sentMessages.push(JSON.parse(data) as ServerMessage);
    }),
    close: vi.fn(),
    sentMessages,
  } as unknown as WebSocket & { sentMessages: ServerMessage[] };
}

/**
 * Create a handler context for testing.
 */
function createTestContext(
  socket: WebSocket,
  subscriptionManager: SubscriptionManager,
  authenticated = false
): HandlerContext {
  return {
    socket,
    subscriptionManager,
    authContext: authenticated
      ? {
          tenantId: '019fffff-0001-7000-8000-000000000001' as TenantId,
          actorId: '019fffff-0002-7000-8000-000000000001' as ActorId,
          permissions: [],
        }
      : null,
    log: vi.fn(),
  };
}

/**
 * Create a mock kernel event.
 */
function createMockEvent(
  tenantId: TenantId,
  eventType: EventType,
  entityId: string,
  entityType = 'product'
): KernelEvent {
  const baseEvent = {
    event_id: '019fffff-0000-7000-8000-000000000001',
    tenant_id: tenantId,
    entity_id: entityId,
    actor_id: '019fffff-0002-7000-8000-000000000001' as ActorId,
    timestamp: new Date().toISOString(),
    version: 1,
  };

  switch (eventType) {
    case 'entity_created':
      return {
        ...baseEvent,
        event_type: 'entity_created',
        payload: {
          type: entityType,
          properties: {},
        },
      } as KernelEvent;
    case 'entity_deleted':
      return {
        ...baseEvent,
        event_type: 'entity_deleted',
        payload: {
          type: entityType,
        },
      } as KernelEvent;
    default:
      return {
        ...baseEvent,
        event_type: eventType,
        payload: {},
      } as KernelEvent;
  }
}

// =============================================================================
// PROTOCOL TESTS
// =============================================================================

describe('WebSocket Protocol', () => {
  describe('parseClientMessage', () => {
    it('should parse auth message', () => {
      const raw = JSON.stringify({
        type: 'auth',
        tenant_id: '019fffff-0001-7000-8000-000000000001',
        actor_id: '019fffff-0002-7000-8000-000000000001',
      });

      const message = parseClientMessage(raw);

      expect(message).not.toBeNull();
      expect(message?.type).toBe('auth');
      if (message?.type === 'auth') {
        expect(message.tenant_id).toBe('019fffff-0001-7000-8000-000000000001');
        expect(message.actor_id).toBe('019fffff-0002-7000-8000-000000000001');
      }
    });

    it('should parse subscribe message with all filters', () => {
      const raw = JSON.stringify({
        type: 'subscribe',
        entity_type: 'product',
        entity_id: '019fffff-0000-7000-8000-000000000001',
        event_types: ['entity_created', 'entity_deleted'],
      });

      const message = parseClientMessage(raw);

      expect(message).not.toBeNull();
      expect(message?.type).toBe('subscribe');
      if (message?.type === 'subscribe') {
        expect(message.entity_type).toBe('product');
        expect(message.entity_id).toBe('019fffff-0000-7000-8000-000000000001');
        expect(message.event_types).toEqual(['entity_created', 'entity_deleted']);
      }
    });

    it('should parse subscribe message with minimal filters', () => {
      const raw = JSON.stringify({ type: 'subscribe' });

      const message = parseClientMessage(raw);

      expect(message).not.toBeNull();
      expect(message?.type).toBe('subscribe');
    });

    it('should parse unsubscribe message', () => {
      const raw = JSON.stringify({
        type: 'unsubscribe',
        subscription_id: 'sub-123',
      });

      const message = parseClientMessage(raw);

      expect(message).not.toBeNull();
      expect(message?.type).toBe('unsubscribe');
      if (message?.type === 'unsubscribe') {
        expect(message.subscription_id).toBe('sub-123');
      }
    });

    it('should parse ping message', () => {
      const raw = JSON.stringify({ type: 'ping' });

      const message = parseClientMessage(raw);

      expect(message).not.toBeNull();
      expect(message?.type).toBe('ping');
    });

    it('should return null for invalid JSON', () => {
      const message = parseClientMessage('not valid json');
      expect(message).toBeNull();
    });

    it('should return null for missing type', () => {
      const message = parseClientMessage(JSON.stringify({ foo: 'bar' }));
      expect(message).toBeNull();
    });

    it('should return null for unknown type', () => {
      const message = parseClientMessage(JSON.stringify({ type: 'unknown' }));
      expect(message).toBeNull();
    });

    it('should return null for auth without tenant_id', () => {
      const message = parseClientMessage(
        JSON.stringify({
          type: 'auth',
          actor_id: '019fffff-0002-7000-8000-000000000001',
        })
      );
      expect(message).toBeNull();
    });

    it('should return null for auth without actor_id', () => {
      const message = parseClientMessage(
        JSON.stringify({
          type: 'auth',
          tenant_id: '019fffff-0001-7000-8000-000000000001',
        })
      );
      expect(message).toBeNull();
    });

    it('should return null for unsubscribe without subscription_id', () => {
      const message = parseClientMessage(JSON.stringify({ type: 'unsubscribe' }));
      expect(message).toBeNull();
    });
  });

  describe('serializeServerMessage', () => {
    it('should serialize authenticated message', () => {
      const message: ServerMessage = { type: 'authenticated' };
      const json = serializeServerMessage(message);
      expect(JSON.parse(json)).toEqual({ type: 'authenticated' });
    });

    it('should serialize subscribed message', () => {
      const message: ServerMessage = {
        type: 'subscribed',
        subscription_id: 'sub-123',
      };
      const json = serializeServerMessage(message);
      expect(JSON.parse(json)).toEqual({
        type: 'subscribed',
        subscription_id: 'sub-123',
      });
    });

    it('should serialize error message', () => {
      const message: ServerMessage = {
        type: 'error',
        code: 'AUTH_REQUIRED',
        message: 'Authentication required',
      };
      const json = serializeServerMessage(message);
      expect(JSON.parse(json)).toEqual({
        type: 'error',
        code: 'AUTH_REQUIRED',
        message: 'Authentication required',
      });
    });

    it('should serialize pong message', () => {
      const message: ServerMessage = { type: 'pong' };
      const json = serializeServerMessage(message);
      expect(JSON.parse(json)).toEqual({ type: 'pong' });
    });
  });
});

// =============================================================================
// AUTHENTICATION TESTS
// =============================================================================

describe('WebSocket Authentication', () => {
  describe('authenticateFromMessage', () => {
    it('should authenticate with valid tenant_id and actor_id', () => {
      const message = {
        type: 'auth' as const,
        tenant_id: '019fffff-0001-7000-8000-000000000001',
        actor_id: '019fffff-0002-7000-8000-000000000001',
      };

      const result = authenticateFromMessage(message);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.context.tenantId).toBe('019fffff-0001-7000-8000-000000000001');
        expect(result.context.actorId).toBe('019fffff-0002-7000-8000-000000000001');
        expect(result.context.permissions).toEqual([]);
      }
    });

    it('should fail with empty tenant_id', () => {
      const message = {
        type: 'auth' as const,
        tenant_id: '',
        actor_id: '019fffff-0002-7000-8000-000000000001',
      };

      const result = authenticateFromMessage(message);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('tenant_id');
      }
    });

    it('should fail with empty actor_id', () => {
      const message = {
        type: 'auth' as const,
        tenant_id: '019fffff-0001-7000-8000-000000000001',
        actor_id: '',
      };

      const result = authenticateFromMessage(message);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('actor_id');
      }
    });
  });
});

// =============================================================================
// HANDLER TESTS
// =============================================================================

describe('WebSocket Handlers', () => {
  let subscriptionManager: SubscriptionManager;
  let socket: WebSocket & { sentMessages: ServerMessage[] };

  beforeEach(() => {
    subscriptionManager = createSubscriptionManager();
    socket = createMockSocket();
  });

  describe('handleAuth', () => {
    it('should authenticate and send authenticated message', () => {
      const context = createTestContext(socket, subscriptionManager, false);
      const message = {
        type: 'auth' as const,
        tenant_id: '019fffff-0001-7000-8000-000000000001',
        actor_id: '019fffff-0002-7000-8000-000000000001',
      };

      const result = handleAuth(context, message);

      expect(result.continue).toBe(true);
      expect(result.authContext).toBeDefined();
      expect(result.authContext?.tenantId).toBe('019fffff-0001-7000-8000-000000000001');
      expect(socket.sentMessages).toHaveLength(1);
      expect(socket.sentMessages[0]?.type).toBe('authenticated');
    });

    it('should reject duplicate authentication', () => {
      const context = createTestContext(socket, subscriptionManager, true);
      const message = {
        type: 'auth' as const,
        tenant_id: '019fffff-0001-7000-8000-000000000001',
        actor_id: '019fffff-0002-7000-8000-000000000001',
      };

      const result = handleAuth(context, message);

      expect(result.continue).toBe(true);
      expect(result.authContext).toBeUndefined();
      expect(socket.sentMessages).toHaveLength(1);
      expect(socket.sentMessages[0]?.type).toBe('error');
    });
  });

  describe('handleSubscribe', () => {
    it('should create subscription when authenticated', () => {
      const context = createTestContext(socket, subscriptionManager, true);
      const message = {
        type: 'subscribe' as const,
        entity_type: 'product',
      };

      const result = handleSubscribe(context, message);

      expect(result.continue).toBe(true);
      expect(socket.sentMessages).toHaveLength(1);
      expect(socket.sentMessages[0]?.type).toBe('subscribed');
      if (socket.sentMessages[0]?.type === 'subscribed') {
        expect(socket.sentMessages[0].subscription_id).toBeDefined();
      }
    });

    it('should reject subscription when not authenticated', () => {
      const context = createTestContext(socket, subscriptionManager, false);
      const message = {
        type: 'subscribe' as const,
        entity_type: 'product',
      };

      const result = handleSubscribe(context, message);

      expect(result.continue).toBe(true);
      expect(socket.sentMessages).toHaveLength(1);
      expect(socket.sentMessages[0]?.type).toBe('error');
      if (socket.sentMessages[0]?.type === 'error') {
        expect(socket.sentMessages[0].code).toBe('AUTH_REQUIRED');
      }
    });

    it('should create subscription with entity_id filter', () => {
      const context = createTestContext(socket, subscriptionManager, true);
      const message = {
        type: 'subscribe' as const,
        entity_id: '019fffff-0000-7000-8000-000000000001',
      };

      const result = handleSubscribe(context, message);

      expect(result.continue).toBe(true);
      expect(socket.sentMessages[0]?.type).toBe('subscribed');
    });

    it('should create subscription with event_types filter', () => {
      const context = createTestContext(socket, subscriptionManager, true);
      const message = {
        type: 'subscribe' as const,
        event_types: ['entity_created', 'entity_deleted'] as EventType[],
      };

      const result = handleSubscribe(context, message);

      expect(result.continue).toBe(true);
      expect(socket.sentMessages[0]?.type).toBe('subscribed');
    });
  });

  describe('handleUnsubscribe', () => {
    it('should remove existing subscription', () => {
      const context = createTestContext(socket, subscriptionManager, true);

      // First subscribe
      const subscribeResult = handleSubscribe(context, { type: 'subscribe' });
      const subscriptionId =
        socket.sentMessages[0]?.type === 'subscribed'
          ? socket.sentMessages[0].subscription_id
          : '';

      // Then unsubscribe
      const result = handleUnsubscribe(context, {
        type: 'unsubscribe',
        subscription_id: subscriptionId,
      });

      expect(result.continue).toBe(true);
      expect(socket.sentMessages).toHaveLength(2);
      expect(socket.sentMessages[1]?.type).toBe('unsubscribed');
    });

    it('should reject unsubscribe when not authenticated', () => {
      const context = createTestContext(socket, subscriptionManager, false);

      const result = handleUnsubscribe(context, {
        type: 'unsubscribe',
        subscription_id: 'sub-123',
      });

      expect(result.continue).toBe(true);
      expect(socket.sentMessages[0]?.type).toBe('error');
      if (socket.sentMessages[0]?.type === 'error') {
        expect(socket.sentMessages[0].code).toBe('AUTH_REQUIRED');
      }
    });

    it('should handle non-existent subscription', () => {
      const context = createTestContext(socket, subscriptionManager, true);

      const result = handleUnsubscribe(context, {
        type: 'unsubscribe',
        subscription_id: 'non-existent',
      });

      expect(result.continue).toBe(true);
      expect(socket.sentMessages[0]?.type).toBe('error');
      if (socket.sentMessages[0]?.type === 'error') {
        expect(socket.sentMessages[0].code).toBe('SUBSCRIPTION_NOT_FOUND');
      }
    });
  });

  describe('handlePing', () => {
    it('should respond with pong', () => {
      const context = createTestContext(socket, subscriptionManager, false);

      const result = handlePing(context);

      expect(result.continue).toBe(true);
      expect(socket.sentMessages).toHaveLength(1);
      expect(socket.sentMessages[0]?.type).toBe('pong');
    });
  });

  describe('handleInvalidMessage', () => {
    it('should send error for invalid message', () => {
      const context = createTestContext(socket, subscriptionManager, false);

      const result = handleInvalidMessage(context);

      expect(result.continue).toBe(true);
      expect(socket.sentMessages[0]?.type).toBe('error');
      if (socket.sentMessages[0]?.type === 'error') {
        expect(socket.sentMessages[0].code).toBe('INVALID_MESSAGE');
      }
    });
  });

  describe('handleMessage (router)', () => {
    it('should route auth message to auth handler', () => {
      const context = createTestContext(socket, subscriptionManager, false);
      const message: ClientMessage = {
        type: 'auth',
        tenant_id: '019fffff-0001-7000-8000-000000000001',
        actor_id: '019fffff-0002-7000-8000-000000000001',
      };

      const result = handleMessage(context, message);

      expect(result.continue).toBe(true);
      expect(socket.sentMessages[0]?.type).toBe('authenticated');
    });

    it('should route subscribe message to subscribe handler', () => {
      const context = createTestContext(socket, subscriptionManager, true);
      const message: ClientMessage = {
        type: 'subscribe',
        entity_type: 'product',
      };

      const result = handleMessage(context, message);

      expect(result.continue).toBe(true);
      expect(socket.sentMessages[0]?.type).toBe('subscribed');
    });

    it('should route ping message to ping handler', () => {
      const context = createTestContext(socket, subscriptionManager, false);
      const message: ClientMessage = { type: 'ping' };

      const result = handleMessage(context, message);

      expect(result.continue).toBe(true);
      expect(socket.sentMessages[0]?.type).toBe('pong');
    });
  });
});

// =============================================================================
// SUBSCRIPTION MANAGER TESTS
// =============================================================================

describe('SubscriptionManager', () => {
  let subscriptionManager: SubscriptionManager;
  let socket1: WebSocket & { sentMessages: ServerMessage[] };
  let socket2: WebSocket & { sentMessages: ServerMessage[] };
  const tenantId1 = '019fffff-0001-7000-8000-000000000001' as TenantId;
  const tenantId2 = '019fffff-0001-7000-8000-000000000002' as TenantId;

  beforeEach(() => {
    subscriptionManager = createSubscriptionManager();
    socket1 = createMockSocket();
    socket2 = createMockSocket();
  });

  describe('subscribe', () => {
    it('should create subscription and return ID', () => {
      const subscriptionId = subscriptionManager.subscribe(socket1, tenantId1, {
        type: 'subscribe',
        entity_type: 'product',
      });

      expect(subscriptionId).toBeDefined();
      expect(subscriptionId.length).toBeGreaterThan(0);
    });

    it('should create multiple subscriptions for same socket', () => {
      const sub1 = subscriptionManager.subscribe(socket1, tenantId1, {
        type: 'subscribe',
        entity_type: 'product',
      });
      const sub2 = subscriptionManager.subscribe(socket1, tenantId1, {
        type: 'subscribe',
        entity_type: 'order',
      });

      expect(sub1).not.toBe(sub2);
      expect(subscriptionManager.getSubscriptionsForSocket(socket1)).toHaveLength(2);
    });

    it('should track subscriptions per socket', () => {
      subscriptionManager.subscribe(socket1, tenantId1, { type: 'subscribe' });
      subscriptionManager.subscribe(socket2, tenantId1, { type: 'subscribe' });

      expect(subscriptionManager.getSubscriptionsForSocket(socket1)).toHaveLength(1);
      expect(subscriptionManager.getSubscriptionsForSocket(socket2)).toHaveLength(1);
    });
  });

  describe('unsubscribe', () => {
    it('should remove subscription', () => {
      const subscriptionId = subscriptionManager.subscribe(socket1, tenantId1, {
        type: 'subscribe',
      });

      const removed = subscriptionManager.unsubscribe(subscriptionId);

      expect(removed).toBe(true);
      expect(subscriptionManager.hasSubscription(subscriptionId)).toBe(false);
    });

    it('should return false for non-existent subscription', () => {
      const removed = subscriptionManager.unsubscribe('non-existent');
      expect(removed).toBe(false);
    });
  });

  describe('removeAllForSocket', () => {
    it('should remove all subscriptions for socket', () => {
      const sub1 = subscriptionManager.subscribe(socket1, tenantId1, { type: 'subscribe' });
      const sub2 = subscriptionManager.subscribe(socket1, tenantId1, { type: 'subscribe' });

      const count = subscriptionManager.removeAllForSocket(socket1);

      expect(count).toBe(2);
      expect(subscriptionManager.hasSubscription(sub1)).toBe(false);
      expect(subscriptionManager.hasSubscription(sub2)).toBe(false);
    });

    it('should return 0 for socket with no subscriptions', () => {
      const count = subscriptionManager.removeAllForSocket(socket1);
      expect(count).toBe(0);
    });
  });

  describe('broadcast', () => {
    it('should send event to matching subscription', () => {
      subscriptionManager.subscribe(socket1, tenantId1, {
        type: 'subscribe',
        entity_type: 'product',
      });

      const event = createMockEvent(
        tenantId1,
        'entity_created',
        '019fffff-0000-7000-8000-000000000001',
        'product'
      );

      subscriptionManager.broadcast(event);

      expect(socket1.sentMessages).toHaveLength(1);
      expect(socket1.sentMessages[0]?.type).toBe('event');
    });

    it('should not send event to different tenant', () => {
      subscriptionManager.subscribe(socket1, tenantId1, {
        type: 'subscribe',
        entity_type: 'product',
      });

      const event = createMockEvent(
        tenantId2,
        'entity_created',
        '019fffff-0000-7000-8000-000000000001',
        'product'
      );

      subscriptionManager.broadcast(event);

      expect(socket1.sentMessages).toHaveLength(0);
    });

    it('should filter by entity type', () => {
      subscriptionManager.subscribe(socket1, tenantId1, {
        type: 'subscribe',
        entity_type: 'product',
      });

      const productEvent = createMockEvent(
        tenantId1,
        'entity_created',
        '019fffff-0000-7000-8000-000000000001',
        'product'
      );
      const orderEvent = createMockEvent(
        tenantId1,
        'entity_created',
        '019fffff-0000-7000-8000-000000000002',
        'order'
      );

      subscriptionManager.broadcast(productEvent);
      subscriptionManager.broadcast(orderEvent);

      // Only product event should be sent
      expect(socket1.sentMessages).toHaveLength(1);
    });

    it('should filter by entity ID', () => {
      const entityId = '019fffff-0000-7000-8000-000000000001';

      subscriptionManager.subscribe(socket1, tenantId1, {
        type: 'subscribe',
        entity_id: entityId,
      });

      const matchingEvent = createMockEvent(tenantId1, 'entity_created', entityId);
      const otherEvent = createMockEvent(
        tenantId1,
        'entity_created',
        '019fffff-0000-7000-8000-000000000002'
      );

      subscriptionManager.broadcast(matchingEvent);
      subscriptionManager.broadcast(otherEvent);

      expect(socket1.sentMessages).toHaveLength(1);
    });

    it('should filter by event types', () => {
      subscriptionManager.subscribe(socket1, tenantId1, {
        type: 'subscribe',
        event_types: ['entity_created'],
      });

      const createEvent = createMockEvent(
        tenantId1,
        'entity_created',
        '019fffff-0000-7000-8000-000000000001'
      );
      const deleteEvent = createMockEvent(
        tenantId1,
        'entity_deleted',
        '019fffff-0000-7000-8000-000000000002'
      );

      subscriptionManager.broadcast(createEvent);
      subscriptionManager.broadcast(deleteEvent);

      // Only create event should be sent
      expect(socket1.sentMessages).toHaveLength(1);
    });

    it('should match type hierarchy with prefix', () => {
      // Subscribe to "product" should match "product.variant"
      subscriptionManager.subscribe(socket1, tenantId1, {
        type: 'subscribe',
        entity_type: 'product',
      });

      const variantEvent = createMockEvent(
        tenantId1,
        'entity_created',
        '019fffff-0000-7000-8000-000000000001',
        'product.variant'
      );

      subscriptionManager.broadcast(variantEvent);

      expect(socket1.sentMessages).toHaveLength(1);
    });

    it('should send to multiple matching subscriptions', () => {
      subscriptionManager.subscribe(socket1, tenantId1, { type: 'subscribe' });
      subscriptionManager.subscribe(socket2, tenantId1, { type: 'subscribe' });

      const event = createMockEvent(
        tenantId1,
        'entity_created',
        '019fffff-0000-7000-8000-000000000001'
      );

      subscriptionManager.broadcast(event);

      expect(socket1.sentMessages).toHaveLength(1);
      expect(socket2.sentMessages).toHaveLength(1);
    });

    it('should not send to closed sockets', () => {
      subscriptionManager.subscribe(socket1, tenantId1, { type: 'subscribe' });

      // Close the socket
      (socket1 as unknown as { readyState: number }).readyState = 3; // CLOSED

      const event = createMockEvent(
        tenantId1,
        'entity_created',
        '019fffff-0000-7000-8000-000000000001'
      );

      subscriptionManager.broadcast(event);

      expect(socket1.sentMessages).toHaveLength(0);
    });
  });

  describe('getStats', () => {
    it('should return correct subscription count', () => {
      subscriptionManager.subscribe(socket1, tenantId1, { type: 'subscribe' });
      subscriptionManager.subscribe(socket1, tenantId1, { type: 'subscribe' });
      subscriptionManager.subscribe(socket2, tenantId1, { type: 'subscribe' });

      const stats = subscriptionManager.getStats();

      expect(stats.subscriptionCount).toBe(3);
      expect(stats.connectionCount).toBe(2);
    });

    it('should return zero counts when empty', () => {
      const stats = subscriptionManager.getStats();

      expect(stats.subscriptionCount).toBe(0);
      expect(stats.connectionCount).toBe(0);
    });
  });
});

// =============================================================================
// TENANT ISOLATION TESTS
// =============================================================================

describe('Tenant Isolation', () => {
  let subscriptionManager: SubscriptionManager;
  let socket1: WebSocket & { sentMessages: ServerMessage[] };
  let socket2: WebSocket & { sentMessages: ServerMessage[] };
  const tenantA = '019fffff-0001-7000-8000-000000000001' as TenantId;
  const tenantB = '019fffff-0001-7000-8000-000000000002' as TenantId;

  beforeEach(() => {
    subscriptionManager = createSubscriptionManager();
    socket1 = createMockSocket();
    socket2 = createMockSocket();
  });

  it('should isolate events between tenants', () => {
    // Socket1 subscribed to tenant A
    subscriptionManager.subscribe(socket1, tenantA, { type: 'subscribe' });
    // Socket2 subscribed to tenant B
    subscriptionManager.subscribe(socket2, tenantB, { type: 'subscribe' });

    // Event from tenant A
    const eventA = createMockEvent(
      tenantA,
      'entity_created',
      '019fffff-0000-7000-8000-000000000001'
    );

    subscriptionManager.broadcast(eventA);

    // Only socket1 should receive
    expect(socket1.sentMessages).toHaveLength(1);
    expect(socket2.sentMessages).toHaveLength(0);
  });

  it('should allow same socket to subscribe to multiple tenants', () => {
    subscriptionManager.subscribe(socket1, tenantA, { type: 'subscribe' });
    subscriptionManager.subscribe(socket1, tenantB, { type: 'subscribe' });

    const eventA = createMockEvent(
      tenantA,
      'entity_created',
      '019fffff-0000-7000-8000-000000000001'
    );
    const eventB = createMockEvent(
      tenantB,
      'entity_created',
      '019fffff-0000-7000-8000-000000000002'
    );

    subscriptionManager.broadcast(eventA);
    subscriptionManager.broadcast(eventB);

    // Socket1 should receive both
    expect(socket1.sentMessages).toHaveLength(2);
  });
});

// =============================================================================
// EDGE CASE TESTS
// =============================================================================

describe('Edge Cases', () => {
  let subscriptionManager: SubscriptionManager;
  let socket: WebSocket & { sentMessages: ServerMessage[] };
  const tenantId = '019fffff-0001-7000-8000-000000000001' as TenantId;

  beforeEach(() => {
    subscriptionManager = createSubscriptionManager();
    socket = createMockSocket();
  });

  it('should handle subscription with no filters (catch-all)', () => {
    subscriptionManager.subscribe(socket, tenantId, { type: 'subscribe' });

    // Should receive any event from this tenant
    const event1 = createMockEvent(
      tenantId,
      'entity_created',
      '019fffff-0000-7000-8000-000000000001',
      'product'
    );
    const event2 = createMockEvent(
      tenantId,
      'entity_deleted',
      '019fffff-0000-7000-8000-000000000002',
      'order'
    );

    subscriptionManager.broadcast(event1);
    subscriptionManager.broadcast(event2);

    expect(socket.sentMessages).toHaveLength(2);
  });

  it('should handle rapid subscribe/unsubscribe', () => {
    const ids: string[] = [];

    // Rapidly subscribe and unsubscribe
    for (let i = 0; i < 10; i++) {
      const id = subscriptionManager.subscribe(socket, tenantId, { type: 'subscribe' });
      ids.push(id);
    }

    // Unsubscribe half
    for (let i = 0; i < 5; i++) {
      subscriptionManager.unsubscribe(ids[i] as string);
    }

    expect(subscriptionManager.getStats().subscriptionCount).toBe(5);
  });

  it('should handle events when subscription is removed during iteration', () => {
    subscriptionManager.subscribe(socket, tenantId, { type: 'subscribe' });

    const event = createMockEvent(
      tenantId,
      'entity_created',
      '019fffff-0000-7000-8000-000000000001'
    );

    // Remove all subscriptions
    subscriptionManager.removeAllForSocket(socket);

    // Broadcast after removal
    subscriptionManager.broadcast(event);

    expect(socket.sentMessages).toHaveLength(0);
  });

  it('should include subscription_id in event message', () => {
    const subscriptionId = subscriptionManager.subscribe(socket, tenantId, {
      type: 'subscribe',
    });

    const event = createMockEvent(
      tenantId,
      'entity_created',
      '019fffff-0000-7000-8000-000000000001'
    );

    subscriptionManager.broadcast(event);

    expect(socket.sentMessages).toHaveLength(1);
    const eventMessage = socket.sentMessages[0];
    if (eventMessage?.type === 'event') {
      expect(eventMessage.subscription_id).toBe(subscriptionId);
    }
  });
});
