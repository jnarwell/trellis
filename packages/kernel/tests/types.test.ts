/**
 * Type Compilation Tests for @trellis/kernel
 *
 * These tests verify that all types compile correctly and can be used
 * in realistic scenarios. Since these are pure types with no runtime code,
 * the tests primarily verify type-level correctness.
 */

import { describe, it, expect } from 'vitest';
import type {
  // Identifiers
  EntityId,
  TenantId,
  ActorId,
  EventId,
  TypePath,
  PropertyName,
  RelationshipType,

  // Values
  ValueType,
  TextValue,
  NumberValue,
  BooleanValue,
  DateTimeValue,
  DurationValue,
  ReferenceValue,
  ListValue,
  RecordValue,
  Value,

  // Dimensions
  BaseDimension,
  DerivedDimension,
  DimensionType,
  Dimension,

  // Properties
  PropertySource,
  ComputationStatus,
  LiteralProperty,
  InheritedProperty,
  ComputedProperty,
  MeasuredProperty,
  Property,

  // Entity
  Entity,
  PropertySchema,
  TypeSchema,

  // Relationships
  Cardinality,
  Relationship,
  RelationshipSchema,

  // Events
  EventType,
  BaseEvent,
  EntityCreatedEvent,
  EntityUpdatedEvent,
  EntityDeletedEvent,
  PropertyChangedEvent,
  PropertyStaleEvent,
  RelationshipCreatedEvent,
  RelationshipDeletedEvent,
  TypeSchemaCreatedEvent,
  TypeSchemaUpdatedEvent,
  KernelEvent,

  // Queries
  FilterOperator,
  FilterCondition,
  FilterGroup,
  SortSpec,
  EntityQuery,
  QueryResult,

  // API Inputs
  PropertyInput,
  CreateEntityInput,
  UpdateEntityInput,
  CreateRelationshipInput,

  // Errors
  KernelErrorCode,
  KernelError,

  // Expressions
  ASTNode,
  ExpressionNode,
  ParsedExpression,
} from '../src/index.js';

describe('@trellis/kernel types', () => {
  describe('Branded identifiers', () => {
    it('should allow creating branded identifiers via casting', () => {
      // These are compile-time tests - if they compile, they pass
      const entityId = 'uuid-v7-entity' as EntityId;
      const tenantId = 'uuid-v7-tenant' as TenantId;
      const actorId = 'uuid-v7-actor' as ActorId;
      const eventId = 'uuid-v7-event' as EventId;
      const typePath = 'product.variant' as TypePath;
      const propertyName = 'unit_price' as PropertyName;
      const relType = 'parent_of' as RelationshipType;

      // Runtime assertion to ensure test runs
      expect(entityId).toBe('uuid-v7-entity');
      expect(tenantId).toBe('uuid-v7-tenant');
      expect(actorId).toBe('uuid-v7-actor');
      expect(eventId).toBe('uuid-v7-event');
      expect(typePath).toBe('product.variant');
      expect(propertyName).toBe('unit_price');
      expect(relType).toBe('parent_of');
    });
  });

  describe('Value types', () => {
    it('should correctly type all value variants', () => {
      const textVal: TextValue = { type: 'text', value: 'hello' };
      const numVal: NumberValue = {
        type: 'number',
        value: 42.5,
        dimension: 'length',
        unit: 'mm',
      };
      const boolVal: BooleanValue = { type: 'boolean', value: true };
      const dateVal: DateTimeValue = {
        type: 'datetime',
        value: '2024-01-15T10:30:00Z',
      };
      const durVal: DurationValue = { type: 'duration', value: 'P1D' };
      const refVal: ReferenceValue = {
        type: 'reference',
        entity_id: 'entity-123' as EntityId,
        expected_type: 'product' as TypePath,
      };
      const listVal: ListValue = {
        type: 'list',
        element_type: 'text',
        values: [{ type: 'text', value: 'a' }],
      };
      const recordVal: RecordValue = {
        type: 'record',
        fields: { name: { type: 'text', value: 'test' } },
      };

      // Value union should accept all variants
      const values: Value[] = [
        textVal,
        numVal,
        boolVal,
        dateVal,
        durVal,
        refVal,
        listVal,
        recordVal,
      ];

      expect(values).toHaveLength(8);
    });
  });

  describe('Property types', () => {
    it('should correctly type all property sources', () => {
      const literal: LiteralProperty = {
        source: 'literal',
        name: 'name' as PropertyName,
        value: { type: 'text', value: 'Widget' },
      };

      const inherited: InheritedProperty = {
        source: 'inherited',
        name: 'category' as PropertyName,
        from_entity: 'parent-123' as EntityId,
        computation_status: 'valid',
      };

      const computed: ComputedProperty = {
        source: 'computed',
        name: 'total' as PropertyName,
        expression: '@self.quantity * @self.unit_price',
        dependencies: ['quantity', 'unit_price'],
        computation_status: 'pending',
      };

      const measured: MeasuredProperty = {
        source: 'measured',
        name: 'length' as PropertyName,
        value: { type: 'number', value: 100.5, unit: 'mm', dimension: 'length' },
        uncertainty: 0.1,
      };

      // Property union should accept all variants
      const properties: Property[] = [literal, inherited, computed, measured];
      expect(properties).toHaveLength(4);
    });
  });

  describe('Entity type', () => {
    it('should correctly type an entity', () => {
      const entity: Entity = {
        id: 'entity-123' as EntityId,
        tenant_id: 'tenant-456' as TenantId,
        type: 'product.variant' as TypePath,
        properties: {
          ['name' as PropertyName]: {
            source: 'literal',
            name: 'name' as PropertyName,
            value: { type: 'text', value: 'Widget Pro' },
          },
        },
        created_at: '2024-01-15T10:30:00Z',
        updated_at: '2024-01-15T10:30:00Z',
        created_by: 'actor-789' as ActorId,
        version: 1,
      };

      expect(entity.id).toBe('entity-123');
      expect(entity.version).toBe(1);
    });
  });

  describe('Event types', () => {
    it('should correctly type all kernel events', () => {
      const created: EntityCreatedEvent = {
        id: 'event-1' as EventId,
        tenant_id: 'tenant-1' as TenantId,
        event_type: 'entity_created',
        entity_id: 'entity-1' as EntityId,
        actor_id: 'actor-1' as ActorId,
        occurred_at: '2024-01-15T10:30:00Z',
        payload: {
          type: 'product' as TypePath,
          properties: {},
          version: 1,
        },
      };

      const updated: EntityUpdatedEvent = {
        id: 'event-2' as EventId,
        tenant_id: 'tenant-1' as TenantId,
        event_type: 'entity_updated',
        entity_id: 'entity-1' as EntityId,
        actor_id: 'actor-1' as ActorId,
        occurred_at: '2024-01-15T10:31:00Z',
        payload: {
          previous_version: 1,
          new_version: 2,
          changed_properties: ['name' as PropertyName],
          removed_properties: [],
        },
      };

      // KernelEvent union should accept all event types
      const events: KernelEvent[] = [created, updated];
      expect(events).toHaveLength(2);
    });
  });

  describe('Query types', () => {
    it('should correctly type query specifications', () => {
      const query: EntityQuery = {
        tenant_id: 'tenant-1' as TenantId,
        type: 'product.*',
        filter: {
          logic: 'and',
          conditions: [
            { path: 'status', operator: 'eq', value: 'active' },
            {
              logic: 'or',
              conditions: [
                { path: 'price', operator: 'gt', value: 100 },
                { path: 'featured', operator: 'eq', value: true },
              ],
            },
          ],
        },
        sort: [{ path: 'created_at', direction: 'desc', nulls: 'last' }],
        offset: 0,
        limit: 50,
        include: ['category' as RelationshipType],
      };

      expect(query.tenant_id).toBe('tenant-1');
      expect(query.limit).toBe(50);
    });

    it('should correctly type query results', () => {
      const result: QueryResult<Entity> = {
        data: [],
        total_count: 0,
        pagination: {
          offset: 0,
          limit: 50,
          has_more: false,
        },
      };

      expect(result.data).toHaveLength(0);
      expect(result.pagination.has_more).toBe(false);
    });
  });

  describe('API input types', () => {
    it('should correctly type create entity input', () => {
      const input: CreateEntityInput = {
        type: 'product' as TypePath,
        properties: {
          ['name' as PropertyName]: {
            source: 'literal',
            value: { type: 'text', value: 'Widget' },
          },
          ['price' as PropertyName]: {
            source: 'computed',
            expression: '@self.cost * 1.2',
          },
        },
        relationships: [
          {
            type: 'belongs_to' as RelationshipType,
            to_entity: 'category-123' as EntityId,
          },
        ],
      };

      expect(input.type).toBe('product');
    });

    it('should correctly type update entity input', () => {
      const input: UpdateEntityInput = {
        id: 'entity-123' as EntityId,
        expected_version: 1,
        set_properties: {
          ['price' as PropertyName]: {
            source: 'literal',
            value: { type: 'number', value: 99.99 },
          },
        },
        remove_properties: ['deprecated_field' as PropertyName],
      };

      expect(input.expected_version).toBe(1);
    });
  });

  describe('Error types', () => {
    it('should correctly type kernel errors', () => {
      const error: KernelError = {
        code: 'VERSION_CONFLICT',
        message: 'Entity was modified by another user',
        details: {
          expected_version: 1,
          actual_version: 2,
        },
      };

      expect(error.code).toBe('VERSION_CONFLICT');
    });
  });

  describe('Type counts', () => {
    it('should have all expected types available', () => {
      // This test documents the expected type count
      // If compilation fails, it means types are missing

      // Verify key type categories exist
      const valueTypes: ValueType[] = [
        'text',
        'number',
        'boolean',
        'datetime',
        'duration',
        'reference',
        'list',
        'record',
      ];
      expect(valueTypes).toHaveLength(8);

      const propertySourceTypes: PropertySource[] = [
        'literal',
        'inherited',
        'computed',
        'measured',
      ];
      expect(propertySourceTypes).toHaveLength(4);

      const computationStatuses: ComputationStatus[] = [
        'pending',
        'valid',
        'stale',
        'error',
        'circular',
      ];
      expect(computationStatuses).toHaveLength(5);

      const filterOps: FilterOperator[] = [
        'eq',
        'neq',
        'gt',
        'gte',
        'lt',
        'lte',
        'in',
        'nin',
        'contains',
        'starts',
        'ends',
        'regex',
        'exists',
        'type_is',
      ];
      expect(filterOps).toHaveLength(14);

      const eventTypes: EventType[] = [
        'entity_created',
        'entity_updated',
        'entity_deleted',
        'property_changed',
        'property_stale',
        'relationship_created',
        'relationship_deleted',
        'type_schema_created',
        'type_schema_updated',
      ];
      expect(eventTypes).toHaveLength(9);

      const errorCodes: KernelErrorCode[] = [
        'NOT_FOUND',
        'ALREADY_EXISTS',
        'VERSION_CONFLICT',
        'VALIDATION_ERROR',
        'TYPE_MISMATCH',
        'PERMISSION_DENIED',
        'TENANT_MISMATCH',
        'CIRCULAR_DEPENDENCY',
        'INVALID_EXPRESSION',
        'REFERENCE_BROKEN',
      ];
      expect(errorCodes).toHaveLength(10);
    });
  });
});
