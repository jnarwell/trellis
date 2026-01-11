# Event Emitter Scratchpad

**STATUS:** ✅ COMPLETE (Phase 2.3 - Instance 14)

## Events to Emit

| Trigger | Event Type | Payload |
|---------|------------|---------|
| Entity created | `entity_created` | type, properties, version=1 |
| Entity updated | `entity_updated` | previous_version, new_version, changed_properties, removed_properties |
| Entity deleted | `entity_deleted` | type, final_version, hard_delete, final_properties |
| Property added/modified/removed | `property_changed` | property_name, change_type, previous, current |
| Dependency invalidated | `property_stale` | property_name, source_entity_id, source_property_name |
| Relationship created | `relationship_created` | relationship_id, type, from_entity, to_entity, metadata |
| Relationship deleted | `relationship_deleted` | relationship_id, type, from_entity, to_entity |
| Schema created | `type_schema_created` | schema_id, type, schema |
| Schema updated | `type_schema_updated` | schema_id, type, changes |

## Integration Points

### entity-service.ts (lines 203, 302-304, 333-334)
- `create()`: Emit `entity_created` after repository.create()
- `update()`: Emit `entity_updated` + `property_changed` for each change
- `delete()`: Emit `entity_deleted` with final state

### relationship-service.ts
- `create()`: Emit `relationship_created`
- `delete()`: Emit `relationship_deleted`

## Key Discoveries

1. **Kernel types exist** - `@trellis/kernel` exports all event types
2. **Staleness already implemented** - `propagateStaleness()` from kernel handles BFS propagation
3. **StalenessDatabase interface** - Need to implement adapter for server
4. **Entity service has TODOs** - Marked locations for event emission

## Architecture Decisions

1. **EventEmitter class** - Singleton service holding handlers
2. **EventStore** - Persists to `events` table per ADR-006
3. **StalenessAdapter** - Implements `StalenessDatabase` interface from kernel
4. **Handler registration** - Staleness + audit handlers registered at startup

## Files to Create

```
packages/server/src/events/
├── index.ts           # Public exports
├── types.ts           # Server-specific event types
├── emitter.ts         # EventEmitter service
├── store.ts           # Database persistence
├── staleness-adapter.ts  # Implements kernel StalenessDatabase
└── handlers/
    ├── staleness.ts   # Triggers staleness propagation
    └── audit.ts       # Audit logging
```

## Implementation Order

1. `types.ts` - Event handler types ✅
2. `emitter.ts` - Core emitter service ✅
3. `store.ts` - Database persistence ✅
4. `staleness-adapter.ts` - Connect to kernel staleness ✅
5. `handlers/audit.ts` - Simple audit handler ✅
6. `handlers/staleness.ts` - Wire up staleness propagation ✅
7. Update `entity-service.ts` - Add event hooks ✅
8. `index.ts` - Exports ✅
9. Tests ✅

## Completion Summary

### Delivered Files
```
packages/server/src/events/
├── index.ts                    # Public exports
├── types.ts                    # EventHandler, IEventEmitter, IEventStore interfaces
├── emitter.ts                  # EventEmitter class + EventFactory
├── store.ts                    # PostgreSQL event persistence
├── staleness-adapter.ts        # StalenessDatabase implementation
└── handlers/
    ├── staleness.ts            # property_changed → staleness propagation
    └── audit.ts                # Console audit logging

packages/server/src/events/__tests__/
├── emitter.test.ts             # 14 tests
├── store.test.ts               # 9 tests
├── staleness.test.ts           # 5 tests
└── integration.test.ts         # 7 tests
```

### Modified Files
- `entity-service.ts` - Added EventEmitter integration, emits events on create/update/delete

### Key Implementation Notes
1. **Type Conversion**: Kernel's `ExprPropertyStaleEvent` has different payload than `PropertyStaleEvent` in types/event.ts - handler converts between them
2. **Event Factory**: Provides type-safe event creation with UUID v7 IDs
3. **Staleness Handler**: Hooks into kernel's BFS propagation via `propagateStaleness()`
4. **Tests**: All 258 tests pass (35 new event system tests)

### Remaining Work (Future Phases)
- Integrate events into relationship-service.ts
- Add schema event emission
- Real-time streaming endpoint
- Webhook dispatch system
