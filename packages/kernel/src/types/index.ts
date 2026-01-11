/**
 * Trellis Kernel - Type Exports
 *
 * Re-exports all types from the kernel type modules.
 */

// Value types and dimensions
export type {
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
  BaseDimension,
  DerivedDimension,
  DimensionType,
  Dimension,
} from './value.js';

// Entity and property types
export type {
  EntityId,
  TenantId,
  ActorId,
  TypePath,
  PropertyName,
  PropertySource,
  ComputationStatus,
  LiteralProperty,
  InheritedProperty,
  ComputedProperty,
  MeasuredProperty,
  Property,
  Entity,
  PropertySchema,
  TypeSchema,
  PropertyInput,
  CreateEntityInput,
  UpdateEntityInput,
} from './entity.js';

// Relationship types
export type {
  RelationshipType,
  Cardinality,
  Relationship,
  RelationshipSchema,
  CreateRelationshipInput,
} from './relationship.js';

// Event types
export type {
  EventId,
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
} from './event.js';

// Query types
export type {
  FilterOperator,
  FilterCondition,
  FilterGroup,
  SortSpec,
  EntityQuery,
  QueryResult,
} from './query.js';

// Expression AST types
export type {
  ASTNode,
  LiteralNode,
  PropertyRefNode,
  FunctionCallNode,
  BinaryOpNode,
  UnaryOpNode,
  ConditionalNode,
  ExpressionNode,
  ParsedExpression,
} from './expression.js';

// Error types
export type { KernelErrorCode, KernelError } from './errors.js';
