/**
 * Trellis E2E Test Harness - Fixtures
 *
 * Test data factories for creating valid entities, relationships, and queries.
 */

import type { EntityId, PropertyInput, Value, NumberValue, ValueType } from '@trellis/kernel';

// =============================================================================
// TYPES
// =============================================================================

export interface CreateEntityRequest {
  type: string;
  properties: Record<string, PropertyInput>;
}

export interface UpdateEntityRequest {
  version: number;
  set_properties?: Record<string, PropertyInput>;
  remove_properties?: string[];
}

export interface CreateRelationshipRequest {
  type: string;
  from_entity: string;
  to_entity: string;
  path?: string;
  metadata?: Record<string, Value>;
}

export interface QueryRequest {
  type?: string;
  filter?: FilterGroup;
  sort?: SortSpec[];
  pagination?: PaginationRequest;
  include_total?: boolean;
}

export interface FilterGroup {
  logic: 'and' | 'or';
  conditions: FilterCondition[];
  groups?: FilterGroup[];
}

export interface FilterCondition {
  path: string;
  operator: string;
  value: unknown;
}

export interface SortSpec {
  path: string;
  direction: 'asc' | 'desc';
  nulls?: 'first' | 'last';
}

export interface PaginationRequest {
  limit?: number;
  offset?: number;
  cursor?: string;
}

// =============================================================================
// VALUE FACTORIES
// =============================================================================

export const values = {
  /**
   * Create a text value.
   */
  text(value: string): Value {
    return { type: 'text', value };
  },

  /**
   * Create a number value.
   */
  number(value: number, unit?: string): Value {
    const result: Value = { type: 'number', value };
    if (unit) {
      (result as { unit: string }).unit = unit;
    }
    return result;
  },

  /**
   * Create a boolean value.
   */
  boolean(value: boolean): Value {
    return { type: 'boolean', value };
  },

  /**
   * Create a datetime value.
   */
  datetime(value: Date | string): Value {
    const dateStr = typeof value === 'string' ? value : value.toISOString();
    return { type: 'datetime', value: dateStr };
  },

  /**
   * Create a reference value.
   */
  reference(entityId: string): Value {
    return { type: 'reference', entity_id: entityId } as Value;
  },

  /**
   * Create a list value.
   */
  list(elementType: ValueType, listValues: Value[]): Value {
    return { type: 'list', element_type: elementType, values: listValues };
  },
};

// =============================================================================
// PROPERTY FACTORIES
// =============================================================================

export const properties = {
  /**
   * Create a literal property.
   */
  literal(value: Value): PropertyInput {
    return { source: 'literal', value };
  },

  /**
   * Create a literal text property.
   */
  text(value: string): PropertyInput {
    return { source: 'literal', value: values.text(value) };
  },

  /**
   * Create a literal number property.
   */
  number(value: number, unit?: string): PropertyInput {
    return { source: 'literal', value: values.number(value, unit) };
  },

  /**
   * Create a literal boolean property.
   */
  boolean(value: boolean): PropertyInput {
    return { source: 'literal', value: values.boolean(value) };
  },

  /**
   * Create a literal datetime property.
   */
  datetime(value: Date | string): PropertyInput {
    return { source: 'literal', value: values.datetime(value) };
  },

  /**
   * Create an inherited property.
   */
  inherited(fromEntity: string, fromProperty?: string, override?: Value): PropertyInput {
    const result: PropertyInput = {
      source: 'inherited',
      from_entity: fromEntity as EntityId,
    };
    if (fromProperty) {
      (result as { from_property: string }).from_property = fromProperty;
    }
    if (override) {
      (result as { override: Value }).override = override;
    }
    return result;
  },

  /**
   * Create a computed property.
   */
  computed(expression: string): PropertyInput {
    return { source: 'computed', expression };
  },

  /**
   * Create a measured property.
   */
  measured(
    value: number,
    unit?: string,
    uncertainty?: number,
    measuredAt?: string
  ): PropertyInput {
    const numValue: NumberValue = { type: 'number', value };
    if (unit) {
      numValue.unit = unit;
    }
    const result: PropertyInput = {
      source: 'measured',
      value: numValue,
    };
    if (uncertainty !== undefined) {
      (result as { uncertainty: number }).uncertainty = uncertainty;
    }
    if (measuredAt !== undefined) {
      (result as { measured_at: string }).measured_at = measuredAt;
    }
    return result;
  },
};

// =============================================================================
// ENTITY FIXTURES
// =============================================================================

export const fixtures = {
  /**
   * Create a basic entity request.
   */
  entity(
    type: string,
    props?: Record<string, PropertyInput>
  ): CreateEntityRequest {
    return {
      type,
      properties: props ?? {
        name: properties.text(`Test ${type}`),
      },
    };
  },

  /**
   * Create a product entity request.
   */
  product(overrides?: Partial<{
    name: string;
    sku: string;
    price: number;
    quantity: number;
    active: boolean;
  }>): CreateEntityRequest {
    return {
      type: 'product',
      properties: {
        name: properties.text(overrides?.name ?? 'Test Product'),
        sku: properties.text(overrides?.sku ?? `SKU-${Date.now()}`),
        price: properties.number(overrides?.price ?? 99.99, 'USD'),
        quantity: properties.number(overrides?.quantity ?? 10),
        active: properties.boolean(overrides?.active ?? true),
      },
    };
  },

  /**
   * Create a product with computed total.
   */
  productWithTotal(overrides?: Partial<{
    name: string;
    quantity: number;
    unitPrice: number;
  }>): CreateEntityRequest {
    return {
      type: 'product',
      properties: {
        name: properties.text(overrides?.name ?? 'Computed Product'),
        quantity: properties.number(overrides?.quantity ?? 10),
        unit_price: properties.number(overrides?.unitPrice ?? 5.0, 'USD'),
        total: properties.computed('#quantity * #unit_price'),
      },
    };
  },

  /**
   * Create a category entity request.
   */
  category(overrides?: Partial<{
    name: string;
    description: string;
  }>): CreateEntityRequest {
    return {
      type: 'category',
      properties: {
        name: properties.text(overrides?.name ?? 'Test Category'),
        description: properties.text(
          overrides?.description ?? 'A test category'
        ),
      },
    };
  },

  /**
   * Create a part entity request.
   */
  part(overrides?: Partial<{
    partNumber: string;
    name: string;
    unitCost: number;
    quantity: number;
  }>): CreateEntityRequest {
    return {
      type: 'part',
      properties: {
        part_number: properties.text(
          overrides?.partNumber ?? `PART-${Date.now()}`
        ),
        name: properties.text(overrides?.name ?? 'Test Part'),
        unit_cost: properties.number(overrides?.unitCost ?? 10.0, 'USD'),
        quantity: properties.number(overrides?.quantity ?? 5),
      },
    };
  },

  /**
   * Create an assembly entity request.
   */
  assembly(overrides?: Partial<{
    assemblyNumber: string;
    name: string;
  }>): CreateEntityRequest {
    return {
      type: 'assembly',
      properties: {
        assembly_number: properties.text(
          overrides?.assemblyNumber ?? `ASSY-${Date.now()}`
        ),
        name: properties.text(overrides?.name ?? 'Test Assembly'),
      },
    };
  },

  /**
   * Create an update entity request.
   */
  update(
    version: number,
    setProperties?: Record<string, PropertyInput>,
    removeProperties?: string[]
  ): UpdateEntityRequest {
    const result: UpdateEntityRequest = { version };
    if (setProperties) {
      result.set_properties = setProperties;
    }
    if (removeProperties && removeProperties.length > 0) {
      result.remove_properties = removeProperties;
    }
    return result;
  },

  /**
   * Create a relationship request.
   */
  relationship(
    type: string,
    fromEntity: string,
    toEntity: string,
    metadata?: Record<string, Value>
  ): CreateRelationshipRequest {
    const result: CreateRelationshipRequest = {
      type,
      from_entity: fromEntity,
      to_entity: toEntity,
    };
    if (metadata) {
      result.metadata = metadata;
    }
    return result;
  },

  /**
   * Create a query request.
   */
  query(options?: Partial<QueryRequest>): QueryRequest {
    return {
      ...options,
    };
  },

  /**
   * Create a filter condition.
   */
  filter(
    path: string,
    operator: string,
    value: unknown
  ): FilterCondition {
    return { path, operator, value };
  },

  /**
   * Create an AND filter group.
   */
  and(...conditions: FilterCondition[]): FilterGroup {
    return { logic: 'and', conditions };
  },

  /**
   * Create an OR filter group.
   */
  or(...conditions: FilterCondition[]): FilterGroup {
    return { logic: 'or', conditions };
  },

  /**
   * Create a sort specification.
   */
  sort(
    path: string,
    direction: 'asc' | 'desc' = 'asc',
    nulls?: 'first' | 'last'
  ): SortSpec {
    const result: SortSpec = { path, direction };
    if (nulls) {
      result.nulls = nulls;
    }
    return result;
  },
};

// =============================================================================
// BULK FIXTURE HELPERS
// =============================================================================

/**
 * Generate multiple product fixtures.
 */
export function generateProducts(
  count: number,
  basePrice = 10
): CreateEntityRequest[] {
  return Array.from({ length: count }, (_, i) =>
    fixtures.product({
      name: `Product ${i + 1}`,
      sku: `SKU-${Date.now()}-${i}`,
      price: basePrice + i * 10,
      quantity: (i + 1) * 5,
    })
  );
}

/**
 * Generate multiple part fixtures.
 */
export function generateParts(
  count: number,
  baseUnitCost = 5
): CreateEntityRequest[] {
  return Array.from({ length: count }, (_, i) =>
    fixtures.part({
      partNumber: `PART-${Date.now()}-${i}`,
      name: `Part ${i + 1}`,
      unitCost: baseUnitCost + i * 2,
      quantity: (i + 1) * 10,
    })
  );
}
