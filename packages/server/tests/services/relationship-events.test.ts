/**
 * Relationship events are broadcast through the EventEmitter (so they reach
 * WebSocket subscribers), not just written to the events table.
 *
 * The DB transaction is mocked so this exercises the emitter wiring without a
 * live Postgres (the full path is covered by the DB-gated e2e suite).
 */

import { vi, describe, it, expect, beforeEach } from 'vitest';

const fakeRelationship = {
  id: 'rel-1',
  type: 'depends_on',
  from_entity: 'aaaaaaaa-0000-7000-8000-000000000001',
  to_entity: 'bbbbbbbb-0000-7000-8000-000000000002',
  metadata: {},
  created_by: 'actor-1',
  created_at: '2026-01-01T00:00:00Z',
};

// Mock the transaction to bypass the inner DB calls and return a relationship.
vi.mock('../../src/db/client.js', () => ({
  withTenantTransaction: vi.fn(async () => fakeRelationship),
}));

import { createRelationship, deleteRelationship } from '../../src/services/relationship-service.js';

function mockEmitter() {
  return { emit: vi.fn(async () => {}) };
}

const auth = { tenantId: '00000000-0000-7000-8000-0000000000aa', actorId: '00000000-0000-7000-8000-0000000000bb' };

describe('relationship events broadcast through the emitter', () => {
  beforeEach(() => vi.clearAllMocks());

  it('createRelationship emits relationship_created', async () => {
    const emitter = mockEmitter();
    await createRelationship(
      {} as never,
      auth as never,
      { type: 'depends_on', from_entity: fakeRelationship.from_entity, to_entity: fakeRelationship.to_entity } as never,
      emitter as never
    );

    expect(emitter.emit).toHaveBeenCalledTimes(1);
    const event = emitter.emit.mock.calls[0]![0] as { event_type: string; payload: Record<string, unknown> };
    expect(event.event_type).toBe('relationship_created');
    expect(event.payload.from_entity).toBe(fakeRelationship.from_entity);
    expect(event.payload.to_entity).toBe(fakeRelationship.to_entity);
  });

  it('deleteRelationship emits relationship_deleted', async () => {
    const emitter = mockEmitter();
    await deleteRelationship({} as never, auth as never, 'rel-1', emitter as never);

    expect(emitter.emit).toHaveBeenCalledTimes(1);
    const event = emitter.emit.mock.calls[0]![0] as { event_type: string };
    expect(event.event_type).toBe('relationship_deleted');
  });

  it('without an emitter, no broadcast occurs (legacy in-tx persist path)', async () => {
    const emitter = mockEmitter();
    await createRelationship(
      {} as never,
      auth as never,
      { type: 'depends_on', from_entity: fakeRelationship.from_entity, to_entity: fakeRelationship.to_entity } as never
    );
    expect(emitter.emit).not.toHaveBeenCalled();
  });
});
