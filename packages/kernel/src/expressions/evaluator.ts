/**
 * Trellis Expression Engine - Evaluator
 *
 * Evaluates AST nodes to produce Values.
 */

import type {
  Value,
  TextValue,
  NumberValue,
  BooleanValue,
  ListValue,
  EntityId,
  TenantId,
  Entity,
  PropertyName,
} from '../types/index.js';
import type {
  Expression,
  ExpressionNode,
  BinaryExpression,
  UnaryExpression,
  CallExpression,
  PropertyReference,
  Literal,
  Identifier,
  BinaryOperator,
} from './ast.js';
import {
  ExpressionError,
  typeMismatchError,
  divisionByZeroError,
  circularDependencyError,
  maxDepthExceededError,
  propertyNotFoundError,
  entityNotFoundError,
} from './errors.js';
import { invokeFunction } from './functions/index.js';
import type { RuntimeValue } from './functions/index.js';

// =============================================================================
// EVALUATION CONTEXT
// =============================================================================

/**
 * Context for expression evaluation.
 */
export interface EvaluationContext {
  /** Tenant for data access */
  readonly tenantId: TenantId;
  /** Entity being evaluated */
  readonly currentEntity: Entity;
  /** Pre-loaded entities (for batching) */
  readonly entityCache: Map<string, Entity>;
  /** Pre-loaded relationships */
  readonly relationshipCache: Map<string, Map<string, readonly string[]>>;
  /** Stack for circular detection - tracks "entityId.propertyName" */
  readonly evaluationStack: Set<string>;
  /** Maximum evaluation depth */
  readonly maxDepth: number;
  /** Current depth */
  currentDepth: number;
}

/**
 * Create a new evaluation context.
 */
export function createContext(
  currentEntity: Entity,
  tenantId: TenantId,
  options: {
    entityCache?: Map<string, Entity>;
    relationshipCache?: Map<string, Map<string, readonly string[]>>;
    maxDepth?: number;
  } = {}
): EvaluationContext {
  return {
    tenantId,
    currentEntity,
    entityCache: options.entityCache ?? new Map(),
    relationshipCache: options.relationshipCache ?? new Map(),
    evaluationStack: new Set(),
    maxDepth: options.maxDepth ?? 50,
    currentDepth: 0,
  };
}

// =============================================================================
// EVALUATION RESULT
// =============================================================================

/**
 * Result of expression evaluation.
 */
export interface EvaluationResult {
  readonly success: boolean;
  readonly value?: Value | null;
  readonly error?: ExpressionError;
  /** Entities accessed during evaluation (for caching) */
  readonly accessedEntities?: readonly string[];
  /** Evaluation duration in ms */
  readonly durationMs?: number;
}

// =============================================================================
// MAIN EVALUATOR
// =============================================================================

/**
 * Evaluate an expression AST.
 */
export async function evaluate(
  expression: Expression,
  ctx: EvaluationContext
): Promise<EvaluationResult> {
  const startTime = Date.now();
  const accessedEntities: string[] = [ctx.currentEntity.id];

  try {
    // Check depth limit
    if (ctx.currentDepth > ctx.maxDepth) {
      return {
        success: false,
        error: maxDepthExceededError(ctx.maxDepth),
      };
    }

    const value = await evaluateNode(expression.body, ctx, accessedEntities);

    return {
      success: true,
      value,
      accessedEntities,
      durationMs: Date.now() - startTime,
    };
  } catch (e) {
    if (e instanceof ExpressionError) {
      return {
        success: false,
        error: e,
        accessedEntities,
        durationMs: Date.now() - startTime,
      };
    }
    throw e;
  }
}

/**
 * Evaluate a single AST node.
 */
async function evaluateNode(
  node: ExpressionNode,
  ctx: EvaluationContext,
  accessedEntities: string[]
): Promise<RuntimeValue> {
  switch (node.type) {
    case 'Literal':
      return evaluateLiteral(node);

    case 'Identifier':
      return evaluateIdentifier(node, ctx);

    case 'PropertyReference':
      return evaluatePropertyReference(node, ctx, accessedEntities);

    case 'BinaryExpression':
      return evaluateBinaryExpression(node, ctx, accessedEntities);

    case 'UnaryExpression':
      return evaluateUnaryExpression(node, ctx, accessedEntities);

    case 'CallExpression':
      return evaluateCallExpression(node, ctx, accessedEntities);
  }
}

// =============================================================================
// NODE EVALUATORS
// =============================================================================

/**
 * Evaluate a literal node.
 */
function evaluateLiteral(node: Literal): RuntimeValue {
  if (node.value === null) return null;

  switch (node.valueType) {
    case 'number':
      return { type: 'number', value: node.value as number };
    case 'string':
      return { type: 'text', value: node.value as string };
    case 'boolean':
      return { type: 'boolean', value: node.value as boolean };
    case 'null':
      return null;
  }
}

/**
 * Evaluate an identifier node (shorthand property reference).
 */
function evaluateIdentifier(
  node: Identifier,
  ctx: EvaluationContext
): RuntimeValue {
  return resolveProperty(ctx.currentEntity, node.name as PropertyName);
}

/**
 * Evaluate a property reference node.
 */
async function evaluatePropertyReference(
  node: PropertyReference,
  ctx: EvaluationContext,
  accessedEntities: string[]
): Promise<RuntimeValue> {
  // Resolve base entity
  let entities: Entity[];

  if (node.base.type === 'self') {
    entities = [ctx.currentEntity];
  } else {
    const entity = ctx.entityCache.get(node.base.id);
    if (!entity) {
      throw entityNotFoundError(node.base.id);
    }
    accessedEntities.push(node.base.id);
    entities = [entity];
  }

  // Traverse path
  for (let i = 0; i < node.path.length; i++) {
    const segment = node.path[i];
    if (!segment) continue;
    const isLast = i === node.path.length - 1;

    if (segment.traversal?.type === 'all') {
      // Collection traversal [*]
      const allValues: RuntimeValue[] = [];

      for (const entity of entities) {
        // Get related entities for this relationship
        const relatedIds = getRelatedEntities(
          entity.id,
          segment.property,
          ctx.relationshipCache
        );

        for (const relId of relatedIds) {
          const relEntity = ctx.entityCache.get(relId);
          if (!relEntity) continue;
          accessedEntities.push(relId);

          if (isLast) {
            // We're at the leaf - this segment IS the property
            // But with [*], we need the next segment for the property
            allValues.push({ type: 'record', fields: {} }); // Placeholder - needs proper handling
          } else {
            // Continue traversal from this entity
            entities = [relEntity];
          }
        }
      }

      if (isLast) {
        // Return list of values from the related entities
        // In this case, segment.property is actually a relationship, not the final property
        // The final property would be the NEXT segment
        // Filter out null values for the list
        const nonNullValues = allValues.filter((v): v is Value => v !== null);
        return {
          type: 'list',
          element_type: 'record',
          values: nonNullValues,
        };
      }

      // Get the entities for next iteration
      const nextEntities: Entity[] = [];
      for (const entity of entities) {
        const relatedIds = getRelatedEntities(
          entity.id,
          segment.property,
          ctx.relationshipCache
        );
        for (const relId of relatedIds) {
          const relEntity = ctx.entityCache.get(relId);
          if (relEntity) {
            nextEntities.push(relEntity);
            accessedEntities.push(relId);
          }
        }
      }
      entities = nextEntities;
    } else if (segment.traversal?.type === 'index') {
      // Indexed access [n]
      const index = segment.traversal.index;
      const nextEntities: Entity[] = [];

      for (const entity of entities) {
        const relatedIds = getRelatedEntities(
          entity.id,
          segment.property,
          ctx.relationshipCache
        );
        const relId = relatedIds[index];
        if (relId !== undefined) {
          const relEntity = ctx.entityCache.get(relId);
          if (relEntity) {
            nextEntities.push(relEntity);
            accessedEntities.push(relId);
          }
        }
      }
      entities = nextEntities;
    } else {
      // Simple property access or single relationship
      if (isLast) {
        // It's a property on the current entity
        const currentEntity = entities[0];
        if (!currentEntity) return null;
        return resolveProperty(currentEntity, segment.property as PropertyName);
      } else {
        // It's a to-one relationship, traverse to related entity
        const nextEntities: Entity[] = [];
        for (const entity of entities) {
          const relatedIds = getRelatedEntities(
            entity.id,
            segment.property,
            ctx.relationshipCache
          );
          const firstRelId = relatedIds[0];
          if (firstRelId !== undefined) {
            const relEntity = ctx.entityCache.get(firstRelId);
            if (relEntity) {
              nextEntities.push(relEntity);
              accessedEntities.push(firstRelId);
            }
          }
        }
        entities = nextEntities;
      }
    }
  }

  // If we get here with no path, return entity reference itself
  if (node.path.length === 0) {
    // Just @self or @{uuid} without property path
    // Return the entity itself as a reference? Or error?
    const firstEntity = entities[0];
    return firstEntity
      ? { type: 'reference', entity_id: firstEntity.id as EntityId }
      : null;
  }

  // Final property value from the last entity
  const firstEntity = entities[0];
  if (!firstEntity) return null;
  const lastSegment = node.path[node.path.length - 1];
  if (!lastSegment) return null;
  return resolveProperty(firstEntity, lastSegment.property as PropertyName);
}

/**
 * Evaluate a binary expression.
 */
async function evaluateBinaryExpression(
  node: BinaryExpression,
  ctx: EvaluationContext,
  accessedEntities: string[]
): Promise<RuntimeValue> {
  // Short-circuit for logical operators
  if (node.operator === '&&') {
    const left = await evaluateNode(node.left, ctx, accessedEntities);
    if (left === null) return null;
    if (left.type !== 'boolean') {
      throw typeMismatchError('Logical AND', 'boolean', left.type, node.left.start);
    }
    if (!left.value) return { type: 'boolean', value: false };
    return evaluateNode(node.right, ctx, accessedEntities);
  }

  if (node.operator === '||') {
    const left = await evaluateNode(node.left, ctx, accessedEntities);
    if (left === null) return null;
    if (left.type !== 'boolean') {
      throw typeMismatchError('Logical OR', 'boolean', left.type, node.left.start);
    }
    if (left.value) return { type: 'boolean', value: true };
    return evaluateNode(node.right, ctx, accessedEntities);
  }

  // Evaluate both operands
  const left = await evaluateNode(node.left, ctx, accessedEntities);
  const right = await evaluateNode(node.right, ctx, accessedEntities);

  // Null propagation for most operators
  if (left === null || right === null) {
    // Special case: null == null is true, null == x is false
    if (node.operator === '==') {
      if (left === null && right === null) return { type: 'boolean', value: true };
      return { type: 'boolean', value: false };
    }
    if (node.operator === '!=') {
      if (left === null && right === null) return { type: 'boolean', value: false };
      return { type: 'boolean', value: true };
    }
    return null;
  }

  // Arithmetic operators
  if (['+', '-', '*', '/', '%'].includes(node.operator)) {
    if (left.type !== 'number' || right.type !== 'number') {
      throw typeMismatchError(
        `Operator ${node.operator}`,
        'number',
        `${left.type} and ${right.type}`,
        node.start
      );
    }

    const l = left.value;
    const r = right.value;

    switch (node.operator) {
      case '+':
        return { type: 'number', value: l + r };
      case '-':
        return { type: 'number', value: l - r };
      case '*':
        return { type: 'number', value: l * r };
      case '/':
        if (r === 0) throw divisionByZeroError(node.right.start);
        return { type: 'number', value: l / r };
      case '%':
        if (r === 0) throw divisionByZeroError(node.right.start);
        return { type: 'number', value: l % r };
    }
  }

  // Comparison operators
  if (['<', '>', '<=', '>='].includes(node.operator)) {
    if (left.type !== 'number' || right.type !== 'number') {
      throw typeMismatchError(
        `Operator ${node.operator}`,
        'number',
        `${left.type} and ${right.type}`,
        node.start
      );
    }

    const l = left.value;
    const r = right.value;

    switch (node.operator) {
      case '<':
        return { type: 'boolean', value: l < r };
      case '>':
        return { type: 'boolean', value: l > r };
      case '<=':
        return { type: 'boolean', value: l <= r };
      case '>=':
        return { type: 'boolean', value: l >= r };
    }
  }

  // Equality operators
  if (node.operator === '==' || node.operator === '!=') {
    const equal = valuesEqual(left, right);
    return { type: 'boolean', value: node.operator === '==' ? equal : !equal };
  }

  // Should not reach here
  throw new Error(`Unknown operator: ${node.operator}`);
}

/**
 * Evaluate a unary expression.
 */
async function evaluateUnaryExpression(
  node: UnaryExpression,
  ctx: EvaluationContext,
  accessedEntities: string[]
): Promise<RuntimeValue> {
  const operand = await evaluateNode(node.argument, ctx, accessedEntities);

  if (operand === null) return null;

  if (node.operator === '!') {
    if (operand.type !== 'boolean') {
      throw typeMismatchError('Logical NOT', 'boolean', operand.type, node.argument.start);
    }
    return { type: 'boolean', value: !operand.value };
  }

  if (node.operator === '-') {
    if (operand.type !== 'number') {
      throw typeMismatchError('Negation', 'number', operand.type, node.argument.start);
    }
    return { type: 'number', value: -operand.value };
  }

  throw new Error(`Unknown unary operator: ${node.operator}`);
}

/**
 * Evaluate a function call expression.
 */
async function evaluateCallExpression(
  node: CallExpression,
  ctx: EvaluationContext,
  accessedEntities: string[]
): Promise<RuntimeValue> {
  // Evaluate all arguments
  const args: RuntimeValue[] = [];
  for (const arg of node.arguments) {
    args.push(await evaluateNode(arg, ctx, accessedEntities));
  }

  // Invoke the function
  return invokeFunction(node.callee, args);
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Get related entity IDs from cache.
 */
function getRelatedEntities(
  entityId: string,
  relationshipType: string,
  cache: Map<string, Map<string, readonly string[]>>
): readonly string[] {
  const entityRels = cache.get(entityId);
  if (!entityRels) return [];
  return entityRels.get(relationshipType) ?? [];
}

/**
 * Resolve a property value from an entity.
 */
function resolveProperty(entity: Entity, propertyName: PropertyName): RuntimeValue {
  const property = entity.properties[propertyName];

  if (!property) {
    // Property doesn't exist - return null (not error for flexibility)
    return null;
  }

  switch (property.source) {
    case 'literal':
      return property.value ?? null;

    case 'measured':
      return property.value ?? null;

    case 'inherited':
      // If there's an override, use it
      if (property.override) return property.override;
      // Otherwise use the resolved value (if available)
      if (property.resolved_value) return property.resolved_value;
      return null;

    case 'computed':
      // Return cached value if valid
      if (property.computation_status === 'valid' && property.cached_value) {
        return property.cached_value;
      }
      // For stale/pending, we should trigger recomputation
      // But that's the caller's responsibility
      return property.cached_value ?? null;
  }
}

/**
 * Check if two values are equal.
 */
function valuesEqual(a: Value, b: Value): boolean {
  if (a.type !== b.type) return false;

  switch (a.type) {
    case 'number':
      return a.value === (b as NumberValue).value;
    case 'text':
      return a.value === (b as TextValue).value;
    case 'boolean':
      return a.value === (b as BooleanValue).value;
    case 'datetime':
      return a.value === (b as Value & { type: 'datetime' }).value;
    case 'duration':
      return a.value === (b as Value & { type: 'duration' }).value;
    case 'reference':
      return a.entity_id === (b as Value & { type: 'reference' }).entity_id;
    case 'list': {
      const bList = b as ListValue;
      if (a.values.length !== bList.values.length) return false;
      return a.values.every((v, i) => {
        const bVal = bList.values[i];
        return bVal !== undefined && valuesEqual(v, bVal);
      });
    }
    case 'record': {
      const bRecord = b as Value & { type: 'record' };
      const aKeys = Object.keys(a.fields);
      const bKeys = Object.keys(bRecord.fields);
      if (aKeys.length !== bKeys.length) return false;
      return aKeys.every((k) => {
        const aField = a.fields[k];
        const bField = bRecord.fields[k];
        return aField !== undefined && bField !== undefined && valuesEqual(aField, bField);
      });
    }
  }
}

// =============================================================================
// SIMPLE EVALUATION (without context)
// =============================================================================

/**
 * Evaluate an expression with a simple entity (no relationships).
 */
export async function evaluateSimple(
  expression: Expression,
  properties: Record<string, Value | null>
): Promise<EvaluationResult> {
  // Create a mock entity with the given properties
  const mockEntity: Entity = {
    id: 'mock-entity-id' as EntityId,
    tenant_id: 'mock-tenant-id' as TenantId,
    type: 'mock' as any,
    properties: {} as any,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    created_by: 'mock-actor' as any,
    version: 1,
  };

  // Convert simple values to LiteralProperty
  for (const [name, value] of Object.entries(properties)) {
    if (value !== null) {
      (mockEntity.properties as any)[name] = {
        source: 'literal',
        name,
        value,
      };
    }
  }

  const ctx = createContext(mockEntity, 'mock-tenant' as TenantId);
  return evaluate(expression, ctx);
}
