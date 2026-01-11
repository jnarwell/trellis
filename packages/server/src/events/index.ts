/**
 * Trellis Server - Event System
 *
 * Event emission, storage, and handling infrastructure.
 */

// Types
export type {
  EventHandler,
  Unsubscribe,
  EmitOptions,
  EventContext,
  EntityCreatedInput,
  EntityUpdatedInput,
  EntityDeletedInput,
  PropertyChangedInput,
  RelationshipCreatedInput,
  RelationshipDeletedInput,
  IEventEmitter,
  IEventStore,
  EventQueryOptions,
} from './types.js';

// Emitter
export {
  EventEmitter,
  EventFactory,
  createEventEmitter,
  createEventFactory,
} from './emitter.js';

// Store
export { EventStore, createEventStore } from './store.js';

// Staleness adapter
export { StalenessAdapter, createStalenessAdapter } from './staleness-adapter.js';

// Handlers
export {
  createStalenessHandler,
  registerStalenessHandler,
} from './handlers/staleness.js';

export {
  createAuditHandler,
  registerAuditHandler,
  consoleAuditLogger,
  type AuditEntry,
  type AuditLogger,
} from './handlers/audit.js';
