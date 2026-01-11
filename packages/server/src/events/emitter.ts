/**
 * Trellis Server - Event Emitter Service
 *
 * Central event bus for emitting and handling kernel events.
 * Events are persisted to database and dispatched to registered handlers.
 */

import { uuidv7 } from 'uuidv7';
import type {
  KernelEvent,
  EventType,
  EventId,
  TenantId,
  ActorId,
  EntityId,
  TypePath,
  PropertyName,
  Property,
  Value,
  RelationshipType,
  EntityCreatedEvent,
  EntityUpdatedEvent,
  EntityDeletedEvent,
  PropertyChangedEvent,
  RelationshipCreatedEvent,
  RelationshipDeletedEvent,
} from '@trellis/kernel';
import type {
  IEventEmitter,
  IEventStore,
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
} from './types.js';

// =============================================================================
// EVENT EMITTER
// =============================================================================

/**
 * Event emitter service.
 * Handles event emission, persistence, and handler notification.
 */
export class EventEmitter implements IEventEmitter {
  private readonly handlers = new Map<EventType, Set<EventHandler>>();
  private readonly globalHandlers = new Set<EventHandler>();

  constructor(private readonly store?: IEventStore) {}

  /**
   * Emit an event to all registered handlers.
   */
  async emit(event: KernelEvent, options: EmitOptions = {}): Promise<void> {
    // Persist event to database (unless skipped)
    if (!options.skipPersist && this.store) {
      await this.store.save(event);
    }

    // Skip handlers if requested
    if (options.skipHandlers) {
      return;
    }

    // Notify type-specific handlers
    const typeHandlers = this.handlers.get(event.event_type);
    if (typeHandlers) {
      const promises = Array.from(typeHandlers).map((handler) =>
        handler(event).catch((err) => {
          console.error(
            `Event handler error for ${event.event_type}:`,
            err
          );
        })
      );
      await Promise.all(promises);
    }

    // Notify global handlers
    if (this.globalHandlers.size > 0) {
      const globalPromises = Array.from(this.globalHandlers).map((handler) =>
        handler(event).catch((err) => {
          console.error('Global event handler error:', err);
        })
      );
      await Promise.all(globalPromises);
    }
  }

  /**
   * Register a handler for a specific event type.
   */
  on<T extends EventType>(
    eventType: T,
    handler: EventHandler<Extract<KernelEvent, { event_type: T }>>
  ): Unsubscribe {
    let typeHandlers = this.handlers.get(eventType);
    if (!typeHandlers) {
      typeHandlers = new Set();
      this.handlers.set(eventType, typeHandlers);
    }

    typeHandlers.add(handler as EventHandler);

    return () => {
      typeHandlers!.delete(handler as EventHandler);
    };
  }

  /**
   * Register a handler for all events.
   */
  onAll(handler: EventHandler): Unsubscribe {
    this.globalHandlers.add(handler);

    return () => {
      this.globalHandlers.delete(handler);
    };
  }
}

// =============================================================================
// EVENT FACTORY
// =============================================================================

/**
 * Factory for creating kernel events with proper structure.
 */
export class EventFactory {
  constructor(private readonly context: EventContext) {}

  /**
   * Create entity_created event.
   */
  entityCreated(input: EntityCreatedInput): EntityCreatedEvent {
    return {
      id: uuidv7() as EventId,
      tenant_id: this.context.tenantId,
      event_type: 'entity_created',
      entity_id: input.entityId,
      actor_id: this.context.actorId,
      occurred_at: new Date().toISOString(),
      payload: {
        type: input.type as TypePath,
        properties: input.properties as Record<PropertyName, Property>,
        version: 1,
      },
    };
  }

  /**
   * Create entity_updated event.
   */
  entityUpdated(input: EntityUpdatedInput): EntityUpdatedEvent {
    return {
      id: uuidv7() as EventId,
      tenant_id: this.context.tenantId,
      event_type: 'entity_updated',
      entity_id: input.entityId,
      actor_id: this.context.actorId,
      occurred_at: new Date().toISOString(),
      payload: {
        previous_version: input.previousVersion,
        new_version: input.newVersion,
        changed_properties: input.changedProperties as PropertyName[],
        removed_properties: input.removedProperties as PropertyName[],
      },
    };
  }

  /**
   * Create entity_deleted event.
   */
  entityDeleted(input: EntityDeletedInput): EntityDeletedEvent {
    return {
      id: uuidv7() as EventId,
      tenant_id: this.context.tenantId,
      event_type: 'entity_deleted',
      entity_id: input.entityId,
      actor_id: this.context.actorId,
      occurred_at: new Date().toISOString(),
      payload: {
        type: input.type as TypePath,
        final_version: input.finalVersion,
        hard_delete: input.hardDelete,
        final_properties: input.finalProperties as Record<PropertyName, Property>,
      },
    };
  }

  /**
   * Create property_changed event.
   */
  propertyChanged(input: PropertyChangedInput): PropertyChangedEvent {
    return {
      id: uuidv7() as EventId,
      tenant_id: this.context.tenantId,
      event_type: 'property_changed',
      entity_id: input.entityId,
      actor_id: this.context.actorId,
      occurred_at: new Date().toISOString(),
      payload: {
        property_name: input.propertyName as PropertyName,
        change_type: input.changeType,
        previous: input.previous as Property | null,
        current: input.current as Property | null,
      },
    };
  }

  /**
   * Create relationship_created event.
   */
  relationshipCreated(input: RelationshipCreatedInput): RelationshipCreatedEvent {
    return {
      id: uuidv7() as EventId,
      tenant_id: this.context.tenantId,
      event_type: 'relationship_created',
      actor_id: this.context.actorId,
      occurred_at: new Date().toISOString(),
      payload: {
        relationship_id: input.relationshipId,
        type: input.type as RelationshipType,
        from_entity: input.fromEntity,
        to_entity: input.toEntity,
        metadata: input.metadata as Record<string, Value>,
      },
    };
  }

  /**
   * Create relationship_deleted event.
   */
  relationshipDeleted(input: RelationshipDeletedInput): RelationshipDeletedEvent {
    return {
      id: uuidv7() as EventId,
      tenant_id: this.context.tenantId,
      event_type: 'relationship_deleted',
      actor_id: this.context.actorId,
      occurred_at: new Date().toISOString(),
      payload: {
        relationship_id: input.relationshipId,
        type: input.type as RelationshipType,
        from_entity: input.fromEntity,
        to_entity: input.toEntity,
      },
    };
  }
}

/**
 * Create an EventFactory for the given context.
 */
export function createEventFactory(context: EventContext): EventFactory {
  return new EventFactory(context);
}

/**
 * Create an EventEmitter instance.
 */
export function createEventEmitter(store?: IEventStore): EventEmitter {
  return new EventEmitter(store);
}
