/**
 * Tests for SubscriptionManager.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { WebSocket } from 'ws';
import type { EntityCreatedEvent, TenantId, EntityId, ActorId } from '@trellis/kernel';
import { SubscriptionManager } from '../../src/websocket/subscriptions.js';

// Mock WebSocket
function createMockSocket(readyState = 1): WebSocket {
  return {
    readyState,
    send: vi.fn(),
  } as unknown as WebSocket;
}

// Helper to create a test event
function createTestEvent(
  tenantId: string,
  entityType: string,
  entityId: string
): EntityCreatedEvent {
  return {
    id: 'event-1' as any,
    tenant_id: tenantId as TenantId,
    event_type: 'entity_created',
    entity_id: entityId as EntityId,
    actor_id: 'actor-1' as ActorId,
    occurred_at: '2024-01-15T10:00:00Z',
    payload: {
      type: entityType as any,
      properties: {},
      version: 1 as const,
    },
  };
}

describe('SubscriptionManager', () => {
  let manager: SubscriptionManager;

  beforeEach(() => {
    manager = new SubscriptionManager();
  });

  describe('subscribe', () => {
    it('should create subscription and return ID', () => {
      const socket = createMockSocket();

      const id = manager.subscribe(socket, 'tenant-1' as TenantId, {
        type: 'subscribe',
        entity_type: 'product',
      });

      expect(id).toBeDefined();
      expect(typeof id).toBe('string');
      expect(id.length).toBeGreaterThan(0);
    });

    it('should track subscription for socket', () => {
      const socket = createMockSocket();

      const id = manager.subscribe(socket, 'tenant-1' as TenantId, {
        type: 'subscribe',
      });

      const subs = manager.getSubscriptionsForSocket(socket);
      expect(subs).toContain(id);
    });

    it('should allow multiple subscriptions per socket', () => {
      const socket = createMockSocket();

      const id1 = manager.subscribe(socket, 'tenant-1' as TenantId, {
        type: 'subscribe',
        entity_type: 'product',
      });

      const id2 = manager.subscribe(socket, 'tenant-1' as TenantId, {
        type: 'subscribe',
        entity_type: 'order',
      });

      const subs = manager.getSubscriptionsForSocket(socket);
      expect(subs).toContain(id1);
      expect(subs).toContain(id2);
      expect(subs.length).toBe(2);
    });
  });

  describe('unsubscribe', () => {
    it('should remove subscription by ID', () => {
      const socket = createMockSocket();

      const id = manager.subscribe(socket, 'tenant-1' as TenantId, {
        type: 'subscribe',
      });

      const removed = manager.unsubscribe(id);

      expect(removed).toBe(true);
      expect(manager.hasSubscription(id)).toBe(false);
    });

    it('should return false for non-existent subscription', () => {
      const removed = manager.unsubscribe('non-existent-id');

      expect(removed).toBe(false);
    });

    it('should update socket tracking after unsubscribe', () => {
      const socket = createMockSocket();

      const id = manager.subscribe(socket, 'tenant-1' as TenantId, {
        type: 'subscribe',
      });

      manager.unsubscribe(id);

      const subs = manager.getSubscriptionsForSocket(socket);
      expect(subs).not.toContain(id);
    });
  });

  describe('removeAllForSocket', () => {
    it('should remove all subscriptions for a socket', () => {
      const socket = createMockSocket();

      const id1 = manager.subscribe(socket, 'tenant-1' as TenantId, {
        type: 'subscribe',
        entity_type: 'product',
      });

      const id2 = manager.subscribe(socket, 'tenant-1' as TenantId, {
        type: 'subscribe',
        entity_type: 'order',
      });

      const count = manager.removeAllForSocket(socket);

      expect(count).toBe(2);
      expect(manager.hasSubscription(id1)).toBe(false);
      expect(manager.hasSubscription(id2)).toBe(false);
    });

    it('should return 0 for socket with no subscriptions', () => {
      const socket = createMockSocket();

      const count = manager.removeAllForSocket(socket);

      expect(count).toBe(0);
    });

    it('should not affect other sockets', () => {
      const socket1 = createMockSocket();
      const socket2 = createMockSocket();

      manager.subscribe(socket1, 'tenant-1' as TenantId, {
        type: 'subscribe',
      });

      const id2 = manager.subscribe(socket2, 'tenant-1' as TenantId, {
        type: 'subscribe',
      });

      manager.removeAllForSocket(socket1);

      expect(manager.hasSubscription(id2)).toBe(true);
    });
  });

  describe('broadcast', () => {
    it('should send event to matching subscription', () => {
      const socket = createMockSocket();

      manager.subscribe(socket, 'tenant-1' as TenantId, {
        type: 'subscribe',
        entity_type: 'product',
      });

      const event = createTestEvent('tenant-1', 'product', 'entity-1');
      manager.broadcast(event);

      expect(socket.send).toHaveBeenCalledTimes(1);
      const sentMessage = JSON.parse((socket.send as any).mock.calls[0][0]);
      expect(sentMessage.type).toBe('event');
      expect(sentMessage.event.event_type).toBe('entity_created');
    });

    it('should not send to different tenant', () => {
      const socket = createMockSocket();

      manager.subscribe(socket, 'tenant-1' as TenantId, {
        type: 'subscribe',
      });

      const event = createTestEvent('tenant-2', 'product', 'entity-1');
      manager.broadcast(event);

      expect(socket.send).not.toHaveBeenCalled();
    });

    it('should filter by entity type', () => {
      const socket = createMockSocket();

      manager.subscribe(socket, 'tenant-1' as TenantId, {
        type: 'subscribe',
        entity_type: 'order',
      });

      const event = createTestEvent('tenant-1', 'product', 'entity-1');
      manager.broadcast(event);

      expect(socket.send).not.toHaveBeenCalled();
    });

    it('should match entity type prefix', () => {
      const socket = createMockSocket();

      manager.subscribe(socket, 'tenant-1' as TenantId, {
        type: 'subscribe',
        entity_type: 'product',
      });

      // product.variant starts with "product"
      const event = createTestEvent('tenant-1', 'product.variant', 'entity-1');
      manager.broadcast(event);

      expect(socket.send).toHaveBeenCalledTimes(1);
    });

    it('should filter by entity ID', () => {
      const socket = createMockSocket();

      manager.subscribe(socket, 'tenant-1' as TenantId, {
        type: 'subscribe',
        entity_id: 'entity-1',
      });

      const event1 = createTestEvent('tenant-1', 'product', 'entity-1');
      const event2 = createTestEvent('tenant-1', 'product', 'entity-2');

      manager.broadcast(event1);
      manager.broadcast(event2);

      expect(socket.send).toHaveBeenCalledTimes(1);
    });

    it('should filter by event type', () => {
      const socket = createMockSocket();

      manager.subscribe(socket, 'tenant-1' as TenantId, {
        type: 'subscribe',
        event_types: ['entity_updated'],
      });

      const event = createTestEvent('tenant-1', 'product', 'entity-1');
      manager.broadcast(event); // entity_created

      expect(socket.send).not.toHaveBeenCalled();
    });

    it('should send to multiple matching subscriptions', () => {
      const socket1 = createMockSocket();
      const socket2 = createMockSocket();

      manager.subscribe(socket1, 'tenant-1' as TenantId, {
        type: 'subscribe',
      });

      manager.subscribe(socket2, 'tenant-1' as TenantId, {
        type: 'subscribe',
      });

      const event = createTestEvent('tenant-1', 'product', 'entity-1');
      manager.broadcast(event);

      expect(socket1.send).toHaveBeenCalledTimes(1);
      expect(socket2.send).toHaveBeenCalledTimes(1);
    });

    it('should not send to closed socket', () => {
      const socket = createMockSocket(3); // CLOSED state

      manager.subscribe(socket, 'tenant-1' as TenantId, {
        type: 'subscribe',
      });

      const event = createTestEvent('tenant-1', 'product', 'entity-1');
      manager.broadcast(event);

      expect(socket.send).not.toHaveBeenCalled();
    });

    it('should handle send errors gracefully', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const socket = createMockSocket();
      (socket.send as any).mockImplementation(() => {
        throw new Error('Send failed');
      });

      manager.subscribe(socket, 'tenant-1' as TenantId, {
        type: 'subscribe',
      });

      const event = createTestEvent('tenant-1', 'product', 'entity-1');

      // Should not throw
      expect(() => manager.broadcast(event)).not.toThrow();
      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });
  });

  describe('getStats', () => {
    it('should return correct counts', () => {
      const socket1 = createMockSocket();
      const socket2 = createMockSocket();

      manager.subscribe(socket1, 'tenant-1' as TenantId, {
        type: 'subscribe',
      });

      manager.subscribe(socket1, 'tenant-1' as TenantId, {
        type: 'subscribe',
        entity_type: 'product',
      });

      manager.subscribe(socket2, 'tenant-1' as TenantId, {
        type: 'subscribe',
      });

      const stats = manager.getStats();

      expect(stats.subscriptionCount).toBe(3);
      expect(stats.connectionCount).toBe(2);
    });

    it('should return zeros when empty', () => {
      const stats = manager.getStats();

      expect(stats.subscriptionCount).toBe(0);
      expect(stats.connectionCount).toBe(0);
    });
  });
});
