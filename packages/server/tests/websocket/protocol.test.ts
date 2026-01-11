/**
 * Tests for WebSocket protocol message parsing and serialization.
 */

import { describe, it, expect } from 'vitest';
import {
  parseClientMessage,
  serializeServerMessage,
  type ClientMessage,
  type ServerMessage,
} from '../../src/websocket/protocol.js';

describe('parseClientMessage', () => {
  describe('auth message', () => {
    it('should parse valid auth message', () => {
      const json = JSON.stringify({
        type: 'auth',
        tenant_id: 'tenant-1',
        actor_id: 'actor-1',
      });

      const result = parseClientMessage(json);

      expect(result).toEqual({
        type: 'auth',
        tenant_id: 'tenant-1',
        actor_id: 'actor-1',
      });
    });

    it('should reject auth message without tenant_id', () => {
      const json = JSON.stringify({
        type: 'auth',
        actor_id: 'actor-1',
      });

      const result = parseClientMessage(json);

      expect(result).toBeNull();
    });

    it('should reject auth message without actor_id', () => {
      const json = JSON.stringify({
        type: 'auth',
        tenant_id: 'tenant-1',
      });

      const result = parseClientMessage(json);

      expect(result).toBeNull();
    });
  });

  describe('subscribe message', () => {
    it('should parse subscribe with all filters', () => {
      const json = JSON.stringify({
        type: 'subscribe',
        entity_type: 'product',
        entity_id: 'entity-1',
        event_types: ['entity_created', 'entity_updated'],
      });

      const result = parseClientMessage(json);

      expect(result).toEqual({
        type: 'subscribe',
        entity_type: 'product',
        entity_id: 'entity-1',
        event_types: ['entity_created', 'entity_updated'],
      });
    });

    it('should parse subscribe with no filters', () => {
      const json = JSON.stringify({ type: 'subscribe' });

      const result = parseClientMessage(json);

      expect(result).toEqual({
        type: 'subscribe',
        entity_type: undefined,
        entity_id: undefined,
        event_types: undefined,
      });
    });

    it('should parse subscribe with partial filters', () => {
      const json = JSON.stringify({
        type: 'subscribe',
        entity_type: 'product',
      });

      const result = parseClientMessage(json);

      expect(result).toEqual({
        type: 'subscribe',
        entity_type: 'product',
        entity_id: undefined,
        event_types: undefined,
      });
    });
  });

  describe('unsubscribe message', () => {
    it('should parse valid unsubscribe message', () => {
      const json = JSON.stringify({
        type: 'unsubscribe',
        subscription_id: 'sub-123',
      });

      const result = parseClientMessage(json);

      expect(result).toEqual({
        type: 'unsubscribe',
        subscription_id: 'sub-123',
      });
    });

    it('should reject unsubscribe without subscription_id', () => {
      const json = JSON.stringify({ type: 'unsubscribe' });

      const result = parseClientMessage(json);

      expect(result).toBeNull();
    });
  });

  describe('ping message', () => {
    it('should parse ping message', () => {
      const json = JSON.stringify({ type: 'ping' });

      const result = parseClientMessage(json);

      expect(result).toEqual({ type: 'ping' });
    });
  });

  describe('invalid messages', () => {
    it('should return null for invalid JSON', () => {
      const result = parseClientMessage('not valid json');

      expect(result).toBeNull();
    });

    it('should return null for non-object', () => {
      const result = parseClientMessage('"just a string"');

      expect(result).toBeNull();
    });

    it('should return null for array', () => {
      const result = parseClientMessage('[1, 2, 3]');

      expect(result).toBeNull();
    });

    it('should return null for unknown type', () => {
      const result = parseClientMessage(JSON.stringify({ type: 'unknown' }));

      expect(result).toBeNull();
    });

    it('should return null for missing type', () => {
      const result = parseClientMessage(JSON.stringify({ foo: 'bar' }));

      expect(result).toBeNull();
    });
  });
});

describe('serializeServerMessage', () => {
  it('should serialize authenticated message', () => {
    const message: ServerMessage = { type: 'authenticated' };

    const result = serializeServerMessage(message);

    expect(JSON.parse(result)).toEqual({ type: 'authenticated' });
  });

  it('should serialize subscribed message', () => {
    const message: ServerMessage = {
      type: 'subscribed',
      subscription_id: 'sub-123',
    };

    const result = serializeServerMessage(message);

    expect(JSON.parse(result)).toEqual({
      type: 'subscribed',
      subscription_id: 'sub-123',
    });
  });

  it('should serialize unsubscribed message', () => {
    const message: ServerMessage = {
      type: 'unsubscribed',
      subscription_id: 'sub-123',
    };

    const result = serializeServerMessage(message);

    expect(JSON.parse(result)).toEqual({
      type: 'unsubscribed',
      subscription_id: 'sub-123',
    });
  });

  it('should serialize error message', () => {
    const message: ServerMessage = {
      type: 'error',
      code: 'AUTH_REQUIRED',
      message: 'Must authenticate first',
    };

    const result = serializeServerMessage(message);

    expect(JSON.parse(result)).toEqual({
      type: 'error',
      code: 'AUTH_REQUIRED',
      message: 'Must authenticate first',
    });
  });

  it('should serialize pong message', () => {
    const message: ServerMessage = { type: 'pong' };

    const result = serializeServerMessage(message);

    expect(JSON.parse(result)).toEqual({ type: 'pong' });
  });

  it('should serialize event message', () => {
    const message: ServerMessage = {
      type: 'event',
      subscription_id: 'sub-123',
      event: {
        id: 'event-1' as any,
        tenant_id: 'tenant-1' as any,
        event_type: 'entity_created',
        entity_id: 'entity-1' as any,
        actor_id: 'actor-1' as any,
        occurred_at: '2024-01-15T10:00:00Z',
        payload: {
          type: 'product' as any,
          properties: {},
          version: 1 as const,
        },
      },
    };

    const result = serializeServerMessage(message);
    const parsed = JSON.parse(result);

    expect(parsed.type).toBe('event');
    expect(parsed.subscription_id).toBe('sub-123');
    expect(parsed.event.event_type).toBe('entity_created');
  });
});
