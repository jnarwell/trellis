/**
 * Tests for WebSocket message handlers.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { WebSocket } from 'ws';
import type { TenantId, ActorId } from '@trellis/kernel';
import { SubscriptionManager } from '../../src/websocket/subscriptions.js';
import {
  handleAuth,
  handleSubscribe,
  handleUnsubscribe,
  handlePing,
  handleMessage,
} from '../../src/websocket/handlers.js';
import type { HandlerContext } from '../../src/websocket/handlers.js';
import type { WebSocketAuthContext } from '../../src/websocket/auth.js';

// Mock WebSocket
function createMockSocket(): WebSocket {
  return {
    readyState: 1,
    send: vi.fn(),
    close: vi.fn(),
  } as unknown as WebSocket;
}

// Helper to create handler context
function createContext(overrides: Partial<HandlerContext> = {}): HandlerContext {
  return {
    socket: createMockSocket(),
    subscriptionManager: new SubscriptionManager(),
    authContext: null,
    log: vi.fn(),
    ...overrides,
  };
}

// Helper to parse sent message
function getSentMessage(socket: WebSocket, index = 0): any {
  const calls = (socket.send as any).mock.calls;
  if (calls.length <= index) return null;
  return JSON.parse(calls[index][0]);
}

describe('handleAuth', () => {
  beforeEach(() => {
    // Set NODE_ENV to development for message auth
    vi.stubEnv('NODE_ENV', 'development');
  });

  it('should authenticate with valid credentials', () => {
    const context = createContext();

    const result = handleAuth(context, {
      type: 'auth',
      tenant_id: 'tenant-1',
      actor_id: 'actor-1',
    });

    expect(result.continue).toBe(true);
    expect(result.authContext).toBeDefined();
    expect(result.authContext?.tenantId).toBe('tenant-1');
    expect(result.authContext?.actorId).toBe('actor-1');

    const message = getSentMessage(context.socket);
    expect(message.type).toBe('authenticated');
  });

  it('should reject if already authenticated', () => {
    const context = createContext({
      authContext: {
        tenantId: 'tenant-1' as TenantId,
        actorId: 'actor-1' as ActorId,
        permissions: [],
      },
    });

    const result = handleAuth(context, {
      type: 'auth',
      tenant_id: 'tenant-2',
      actor_id: 'actor-2',
    });

    expect(result.continue).toBe(true);
    expect(result.authContext).toBeUndefined(); // Unchanged

    const message = getSentMessage(context.socket);
    expect(message.type).toBe('error');
    expect(message.code).toBe('INVALID_MESSAGE');
  });

  it('should reject in production mode', () => {
    vi.stubEnv('NODE_ENV', 'production');
    const context = createContext();

    const result = handleAuth(context, {
      type: 'auth',
      tenant_id: 'tenant-1',
      actor_id: 'actor-1',
    });

    expect(result.continue).toBe(false);

    const message = getSentMessage(context.socket);
    expect(message.type).toBe('error');
    expect(message.code).toBe('AUTH_FAILED');
    expect(context.socket.close).toHaveBeenCalled();
  });
});

describe('handleSubscribe', () => {
  it('should require authentication', () => {
    const context = createContext();

    const result = handleSubscribe(context, {
      type: 'subscribe',
      entity_type: 'product',
    });

    expect(result.continue).toBe(true);

    const message = getSentMessage(context.socket);
    expect(message.type).toBe('error');
    expect(message.code).toBe('AUTH_REQUIRED');
  });

  it('should create subscription when authenticated', () => {
    const context = createContext({
      authContext: {
        tenantId: 'tenant-1' as TenantId,
        actorId: 'actor-1' as ActorId,
        permissions: [],
      },
    });

    const result = handleSubscribe(context, {
      type: 'subscribe',
      entity_type: 'product',
    });

    expect(result.continue).toBe(true);

    const message = getSentMessage(context.socket);
    expect(message.type).toBe('subscribed');
    expect(message.subscription_id).toBeDefined();
  });

  it('should log subscription creation', () => {
    const context = createContext({
      authContext: {
        tenantId: 'tenant-1' as TenantId,
        actorId: 'actor-1' as ActorId,
        permissions: [],
      },
    });

    handleSubscribe(context, {
      type: 'subscribe',
      entity_type: 'product',
      entity_id: 'entity-1',
    });

    expect(context.log).toHaveBeenCalledWith(
      'info',
      'Subscription created',
      expect.objectContaining({
        filter: expect.objectContaining({
          entityType: 'product',
          entityId: 'entity-1',
        }),
      })
    );
  });
});

describe('handleUnsubscribe', () => {
  it('should require authentication', () => {
    const context = createContext();

    const result = handleUnsubscribe(context, {
      type: 'unsubscribe',
      subscription_id: 'sub-123',
    });

    expect(result.continue).toBe(true);

    const message = getSentMessage(context.socket);
    expect(message.type).toBe('error');
    expect(message.code).toBe('AUTH_REQUIRED');
  });

  it('should remove existing subscription', () => {
    const authContext: WebSocketAuthContext = {
      tenantId: 'tenant-1' as TenantId,
      actorId: 'actor-1' as ActorId,
      permissions: [],
    };

    const subscriptionManager = new SubscriptionManager();
    const socket = createMockSocket();

    const subId = subscriptionManager.subscribe(
      socket,
      authContext.tenantId,
      { type: 'subscribe', entity_type: 'product' }
    );

    const context = createContext({
      socket,
      subscriptionManager,
      authContext,
    });

    const result = handleUnsubscribe(context, {
      type: 'unsubscribe',
      subscription_id: subId,
    });

    expect(result.continue).toBe(true);

    const message = getSentMessage(context.socket);
    expect(message.type).toBe('unsubscribed');
    expect(message.subscription_id).toBe(subId);
  });

  it('should error for non-existent subscription', () => {
    const context = createContext({
      authContext: {
        tenantId: 'tenant-1' as TenantId,
        actorId: 'actor-1' as ActorId,
        permissions: [],
      },
    });

    const result = handleUnsubscribe(context, {
      type: 'unsubscribe',
      subscription_id: 'non-existent',
    });

    expect(result.continue).toBe(true);

    const message = getSentMessage(context.socket);
    expect(message.type).toBe('error');
    expect(message.code).toBe('SUBSCRIPTION_NOT_FOUND');
  });
});

describe('handlePing', () => {
  it('should respond with pong', () => {
    const context = createContext();

    const result = handlePing(context);

    expect(result.continue).toBe(true);

    const message = getSentMessage(context.socket);
    expect(message.type).toBe('pong');
  });
});

describe('handleMessage', () => {
  beforeEach(() => {
    vi.stubEnv('NODE_ENV', 'development');
  });

  it('should route auth messages', () => {
    const context = createContext();

    const result = handleMessage(context, {
      type: 'auth',
      tenant_id: 'tenant-1',
      actor_id: 'actor-1',
    });

    expect(result.authContext).toBeDefined();
  });

  it('should route subscribe messages', () => {
    const context = createContext({
      authContext: {
        tenantId: 'tenant-1' as TenantId,
        actorId: 'actor-1' as ActorId,
        permissions: [],
      },
    });

    handleMessage(context, {
      type: 'subscribe',
      entity_type: 'product',
    });

    const message = getSentMessage(context.socket);
    expect(message.type).toBe('subscribed');
  });

  it('should route unsubscribe messages', () => {
    const context = createContext({
      authContext: {
        tenantId: 'tenant-1' as TenantId,
        actorId: 'actor-1' as ActorId,
        permissions: [],
      },
    });

    handleMessage(context, {
      type: 'unsubscribe',
      subscription_id: 'sub-123',
    });

    const message = getSentMessage(context.socket);
    expect(message.type).toBe('error'); // Not found
  });

  it('should route ping messages', () => {
    const context = createContext();

    handleMessage(context, { type: 'ping' });

    const message = getSentMessage(context.socket);
    expect(message.type).toBe('pong');
  });
});
