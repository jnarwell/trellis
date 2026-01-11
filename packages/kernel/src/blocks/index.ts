/**
 * Trellis Block System - Public Exports
 *
 * Re-exports all block system types and utilities.
 */

// Types
export type {
  // Branded types
  BlockType,
  BlockInstanceId,

  // Categories
  BlockCategory,

  // Prop types
  PropType,
  PropValue,

  // Prop spec
  PropSpec,
  PropUIHints,

  // Validation
  ValidationResult,
  PropValidator,
  BlockValidator,
  ValidationContext,
  EntitySchemaRegistry,
  BlockRegistry,
  PropertySchemaInfo,
  TypeSchemaInfo,

  // Events
  PayloadType,
  PayloadFieldType,
  EventSpec,
  ReceiverSpec,

  // Slots
  SlotSpec,

  // Block spec
  BlockRequirements,
  BlockConfig,
  BlockSpec,

  // Validation errors
  ValidationErrorCategory,
  ValidationError,
  ValidationWarning,
  BlockValidationResult,
} from './types.js';

// Error utilities
export {
  createValidationError,
  createValidationWarning,
  findSimilar,
  formatPropType,
  ErrorCodes,
  type ErrorCode,
} from './errors.js';

// Registry
export {
  InMemoryBlockRegistry,
  createBlockRegistry,
  asBlockType,
  InMemoryEntitySchemaRegistry,
  createEntitySchemaRegistry,
  type EntitySchemaInput,
} from './registry.js';

// Validator
export {
  validateBlockConfig,
  type ValidatorOptions,
} from './validator.js';
