/**
 * Trellis Block System - Prop Validation Engine
 *
 * Validates block configurations against their specs.
 */

import type { TypePath, PropertyName, TenantId } from '../types/entity.js';
import type {
  BlockSpec,
  BlockConfig,
  PropSpec,
  PropType,
  PropValue,
  ValidationContext,
  ValidationResult,
  ValidationError,
  ValidationWarning,
  BlockValidationResult,
  EntitySchemaRegistry,
  BlockRegistry,
  BlockType,
  BlockInstanceId,
} from './types.js';
import {
  createValidationError,
  createValidationWarning,
  findSimilar,
  formatPropType,
  ErrorCodes,
} from './errors.js';

// =============================================================================
// VALIDATOR IMPLEMENTATION
// =============================================================================

/**
 * Options for block validation.
 */
export interface ValidatorOptions {
  /** Entity schema registry for reference validation */
  readonly entities: EntitySchemaRegistry;
  /** Block registry for block type lookup */
  readonly blocks: BlockRegistry;
  /** Current tenant ID */
  readonly tenantId: TenantId;
  /** Base path for error locations */
  readonly basePath?: readonly string[];
  /** Source file for error locations */
  readonly sourceFile?: string;
}

/**
 * Validate a block configuration against its spec.
 */
export function validateBlockConfig(
  config: BlockConfig,
  options: ValidatorOptions
): BlockValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];
  const basePath = options.basePath ?? [];

  // Check if block type exists
  const spec = options.blocks.getBlock(config.type);
  if (!spec) {
    const availableTypes = options.blocks.getBlocks().map((s) => s.type);
    const suggestions = findSimilar(config.type, availableTypes);

    errors.push(
      createValidationError(
        'reference-invalid',
        ErrorCodes.BLOCK_TYPE_NOT_FOUND,
        `Block type '${config.type}' not found. ${suggestions.length > 0 ? `Did you mean '${suggestions[0]}'?` : ''}`,
        [...basePath, 'type'],
        config.type,
        'Valid block type from registry',
        suggestions
      )
    );

    return {
      valid: false,
      blockId: config.id,
      blockType: config.type,
      errors,
      warnings,
    };
  }

  // Create validation context
  const context: ValidationContext = {
    config,
    spec,
    path: basePath,
    entities: options.entities,
    blocks: options.blocks,
    tenantId: options.tenantId,
    findSimilar,
    formatType: formatPropType,
  };

  // Validate props
  const propsPath = [...basePath, 'props'];
  const propErrors = validateProps(config.props, spec.props, propsPath, context);
  errors.push(...propErrors);

  // Check for unknown props
  const knownProps = new Set(Object.keys(spec.props));
  for (const propName of Object.keys(config.props)) {
    if (!knownProps.has(propName)) {
      const suggestions = findSimilar(propName, Array.from(knownProps));
      errors.push(
        createValidationError(
          'unknown-prop',
          ErrorCodes.UNKNOWN_PROP,
          `Unknown prop '${propName}' on block type '${config.type}'. ${suggestions.length > 0 ? `Did you mean '${suggestions[0]}'?` : ''}`,
          [...propsPath, propName],
          config.props[propName],
          `Known prop from block spec`,
          suggestions
        )
      );
    }
  }

  // Validate slots if present
  if (config.slots) {
    const slotErrors = validateSlots(config.slots, spec.slots, [...basePath, 'slots'], options);
    errors.push(...slotErrors);
  }

  // Run block-level validators
  if (spec.validators) {
    for (const validator of spec.validators) {
      const result = validator.validate(config, context);
      if (!result.valid) {
        errors.push(
          createValidationError(
            'constraint-failed',
            validator.id,
            interpolateTemplate(validator.errorTemplate, result.details ?? {}),
            basePath,
            config,
            validator.description,
            []
          )
        );
      }
    }
  }

  return {
    valid: errors.length === 0,
    blockId: config.id,
    blockType: config.type,
    errors,
    warnings,
  };
}

/**
 * Validate props against their specs.
 */
function validateProps(
  props: Readonly<Record<string, PropValue>>,
  propSpecs: Readonly<Record<string, PropSpec>>,
  basePath: readonly string[],
  context: ValidationContext
): ValidationError[] {
  const errors: ValidationError[] = [];

  // Check each prop in spec
  for (const [propName, propSpec] of Object.entries(propSpecs)) {
    const value = props[propName];
    const propPath = [...basePath, propName];

    // Check required
    if (value === undefined || value === null) {
      if (propSpec.required && propSpec.default === undefined) {
        errors.push(
          createValidationError(
            'missing-required',
            ErrorCodes.REQUIRED_PROP_MISSING,
            `Required prop '${propName}' is missing.`,
            propPath,
            undefined,
            formatPropType(propSpec.type),
            propSpec.default !== undefined ? [`Default: ${JSON.stringify(propSpec.default)}`] : []
          )
        );
      }
      continue;
    }

    // Validate type
    const typeErrors = validatePropType(value, propSpec.type, propPath, context);
    errors.push(...typeErrors);

    // Run custom validators
    if (typeErrors.length === 0 && propSpec.validators) {
      for (const validator of propSpec.validators) {
        const result = validator.validate(value, { ...context, path: propPath });
        if (!result.valid) {
          errors.push(
            createValidationError(
              'invalid-value',
              validator.id,
              interpolateTemplate(validator.errorTemplate, { value, ...result.details }),
              propPath,
              value,
              validator.description,
              []
            )
          );
        }
      }
    }
  }

  return errors;
}

/**
 * Validate a value against a prop type.
 */
function validatePropType(
  value: PropValue,
  type: PropType,
  path: readonly string[],
  context: ValidationContext
): ValidationError[] {
  const errors: ValidationError[] = [];

  switch (type.kind) {
    case 'text': {
      if (typeof value !== 'string') {
        errors.push(
          createValidationError(
            'type-mismatch',
            ErrorCodes.EXPECTED_STRING,
            `Expected string, got ${typeof value}.`,
            path,
            value,
            'string',
            typeof value === 'number' ? [`"${value}"`] : []
          )
        );
        break;
      }
      if (type.maxLength !== undefined && value.length > type.maxLength) {
        errors.push(
          createValidationError(
            'invalid-value',
            ErrorCodes.VALUE_TOO_LONG,
            `String length ${value.length} exceeds maximum ${type.maxLength}.`,
            path,
            value,
            `string with max ${type.maxLength} characters`,
            []
          )
        );
      }
      if (type.pattern !== undefined && !type.pattern.test(value)) {
        errors.push(
          createValidationError(
            'invalid-value',
            ErrorCodes.PATTERN_MISMATCH,
            `Value '${value}' does not match required pattern.`,
            path,
            value,
            `string matching ${type.pattern}`,
            []
          )
        );
      }
      break;
    }

    case 'number': {
      if (typeof value !== 'number') {
        errors.push(
          createValidationError(
            'type-mismatch',
            ErrorCodes.EXPECTED_NUMBER,
            `Expected number, got ${typeof value}.`,
            path,
            value,
            'number',
            typeof value === 'string' && !isNaN(Number(value)) ? [value] : []
          )
        );
        break;
      }
      if (type.integer && !Number.isInteger(value)) {
        errors.push(
          createValidationError(
            'invalid-value',
            ErrorCodes.TYPE_MISMATCH,
            `Expected integer, got ${value}.`,
            path,
            value,
            'integer',
            [Math.floor(value).toString()]
          )
        );
      }
      if (type.min !== undefined && value < type.min) {
        errors.push(
          createValidationError(
            'invalid-value',
            ErrorCodes.VALUE_TOO_SMALL,
            `Value ${value} is below minimum ${type.min}.`,
            path,
            value,
            `number >= ${type.min}`,
            [type.min.toString()]
          )
        );
      }
      if (type.max !== undefined && value > type.max) {
        errors.push(
          createValidationError(
            'invalid-value',
            ErrorCodes.VALUE_TOO_LARGE,
            `Value ${value} is above maximum ${type.max}.`,
            path,
            value,
            `number <= ${type.max}`,
            [type.max.toString()]
          )
        );
      }
      break;
    }

    case 'boolean': {
      if (typeof value !== 'boolean') {
        errors.push(
          createValidationError(
            'type-mismatch',
            ErrorCodes.EXPECTED_BOOLEAN,
            `Expected boolean, got ${typeof value}.`,
            path,
            value,
            'boolean (true or false)',
            []
          )
        );
      }
      break;
    }

    case 'datetime': {
      if (typeof value !== 'string') {
        errors.push(
          createValidationError(
            'type-mismatch',
            ErrorCodes.EXPECTED_STRING,
            `Expected datetime string, got ${typeof value}.`,
            path,
            value,
            'ISO 8601 datetime string',
            []
          )
        );
      } else if (isNaN(Date.parse(value))) {
        errors.push(
          createValidationError(
            'invalid-value',
            ErrorCodes.TYPE_MISMATCH,
            `Invalid datetime format: '${value}'.`,
            path,
            value,
            'ISO 8601 datetime string',
            []
          )
        );
      }
      break;
    }

    case 'entityType': {
      if (typeof value !== 'string') {
        errors.push(
          createValidationError(
            'type-mismatch',
            ErrorCodes.EXPECTED_STRING,
            `Expected entity type path, got ${typeof value}.`,
            path,
            value,
            'entity type path',
            []
          )
        );
        break;
      }
      if (!context.entities.hasType(value as TypePath)) {
        const allTypes = context.entities.getTypes('*').map((t) => t.type);
        const suggestions = findSimilar(value, allTypes);
        errors.push(
          createValidationError(
            'reference-invalid',
            ErrorCodes.ENTITY_TYPE_NOT_FOUND,
            `Entity type '${value}' not found. ${suggestions.length > 0 ? `Did you mean '${suggestions[0]}'?` : ''}`,
            path,
            value,
            'Valid entity type path',
            suggestions
          )
        );
      }
      break;
    }

    case 'entityProperty': {
      if (typeof value !== 'string') {
        errors.push(
          createValidationError(
            'type-mismatch',
            ErrorCodes.EXPECTED_STRING,
            `Expected property name, got ${typeof value}.`,
            path,
            value,
            'property name',
            []
          )
        );
        break;
      }

      // Resolve entity type
      const entityType =
        type.ofType === 'self'
          ? (context.config.props['entityType'] as string | undefined)
          : type.ofType;

      if (!entityType) {
        // Can't validate without entity type
        break;
      }

      if (!context.entities.hasProperty(entityType as TypePath, value as PropertyName)) {
        const props = context.entities.getProperties(entityType as TypePath);
        const propNames = props.map((p) => p.name);
        const suggestions = findSimilar(value, propNames);
        errors.push(
          createValidationError(
            'reference-invalid',
            ErrorCodes.PROPERTY_NOT_FOUND,
            `Property '${value}' not found on entity type '${entityType}'. ${suggestions.length > 0 ? `Did you mean '${suggestions[0]}'?` : ''}`,
            path,
            value,
            `Property name that exists on entity type '${entityType}'`,
            suggestions
          )
        );
      }
      break;
    }

    case 'entityReference': {
      // For now, just validate it's a string. Actual entity existence check
      // would require async DB lookup.
      if (typeof value !== 'string') {
        errors.push(
          createValidationError(
            'type-mismatch',
            ErrorCodes.EXPECTED_STRING,
            `Expected entity reference (ID), got ${typeof value}.`,
            path,
            value,
            'entity ID string',
            []
          )
        );
      }
      break;
    }

    case 'blockReference': {
      if (typeof value !== 'string') {
        errors.push(
          createValidationError(
            'type-mismatch',
            ErrorCodes.EXPECTED_STRING,
            `Expected block reference, got ${typeof value}.`,
            path,
            value,
            'block instance ID',
            []
          )
        );
      }
      // Block existence check would happen at view level
      break;
    }

    case 'enum': {
      if (typeof value !== 'string') {
        errors.push(
          createValidationError(
            'type-mismatch',
            ErrorCodes.EXPECTED_STRING,
            `Expected enum value, got ${typeof value}.`,
            path,
            value,
            `one of: ${type.values.join(', ')}`,
            []
          )
        );
        break;
      }
      if (!type.values.includes(value)) {
        const suggestions = findSimilar(value, type.values);
        errors.push(
          createValidationError(
            'invalid-value',
            ErrorCodes.INVALID_ENUM_VALUE,
            `Invalid enum value '${value}'. Must be one of: ${type.values.join(', ')}.`,
            path,
            value,
            `one of: ${type.values.join(', ')}`,
            suggestions
          )
        );
      }
      break;
    }

    case 'list': {
      if (!Array.isArray(value)) {
        errors.push(
          createValidationError(
            'type-mismatch',
            ErrorCodes.EXPECTED_ARRAY,
            `Expected array, got ${typeof value}.`,
            path,
            value,
            'array',
            []
          )
        );
        break;
      }
      if (type.minLength !== undefined && value.length < type.minLength) {
        errors.push(
          createValidationError(
            'invalid-value',
            ErrorCodes.LIST_TOO_SHORT,
            `Array has ${value.length} items, minimum is ${type.minLength}.`,
            path,
            value,
            `array with at least ${type.minLength} items`,
            []
          )
        );
      }
      if (type.maxLength !== undefined && value.length > type.maxLength) {
        errors.push(
          createValidationError(
            'invalid-value',
            ErrorCodes.LIST_TOO_LONG,
            `Array has ${value.length} items, maximum is ${type.maxLength}.`,
            path,
            value,
            `array with at most ${type.maxLength} items`,
            []
          )
        );
      }
      // Validate each element
      for (let i = 0; i < value.length; i++) {
        const element = value[i];
        if (element !== undefined) {
          const elementErrors = validatePropType(element, type.element, [...path, String(i)], context);
          errors.push(...elementErrors);
        }
      }
      break;
    }

    case 'record': {
      if (typeof value !== 'object' || value === null || Array.isArray(value)) {
        errors.push(
          createValidationError(
            'type-mismatch',
            ErrorCodes.EXPECTED_OBJECT,
            `Expected object, got ${Array.isArray(value) ? 'array' : typeof value}.`,
            path,
            value,
            'object',
            []
          )
        );
        break;
      }
      // Validate as nested props
      const recordValue = value as Record<string, PropValue>;
      const recordErrors = validateProps(recordValue, type.fields, path, context);
      errors.push(...recordErrors);
      break;
    }

    case 'union': {
      // Try each variant, collect errors, succeed if any passes
      const variantErrors: ValidationError[][] = [];
      for (const variant of type.variants) {
        const vErrors = validatePropType(value, variant, path, context);
        if (vErrors.length === 0) {
          // This variant matches
          return [];
        }
        variantErrors.push(vErrors);
      }
      // None matched, report the union failure
      errors.push(
        createValidationError(
          'type-mismatch',
          ErrorCodes.TYPE_MISMATCH,
          `Value does not match any variant of union type.`,
          path,
          value,
          formatPropType(type),
          []
        )
      );
      break;
    }

    case 'expression': {
      if (typeof value !== 'string') {
        errors.push(
          createValidationError(
            'type-mismatch',
            ErrorCodes.EXPECTED_STRING,
            `Expected expression string, got ${typeof value}.`,
            path,
            value,
            'Trellis expression string',
            []
          )
        );
      }
      // Syntax validation would be done by expression parser
      break;
    }

    case 'template': {
      if (typeof value !== 'string') {
        errors.push(
          createValidationError(
            'type-mismatch',
            ErrorCodes.EXPECTED_STRING,
            `Expected template string, got ${typeof value}.`,
            path,
            value,
            'template string',
            []
          )
        );
      }
      // Template syntax validation would check {{ }} or ${ } patterns
      break;
    }

    case 'style': {
      if (typeof value !== 'object' || value === null || Array.isArray(value)) {
        errors.push(
          createValidationError(
            'type-mismatch',
            ErrorCodes.EXPECTED_OBJECT,
            `Expected style object, got ${Array.isArray(value) ? 'array' : typeof value}.`,
            path,
            value,
            'style object',
            []
          )
        );
      }
      break;
    }

    case 'icon': {
      if (typeof value !== 'string') {
        errors.push(
          createValidationError(
            'type-mismatch',
            ErrorCodes.EXPECTED_STRING,
            `Expected icon name, got ${typeof value}.`,
            path,
            value,
            'icon name string',
            []
          )
        );
      }
      break;
    }

    case 'color': {
      if (typeof value !== 'string') {
        errors.push(
          createValidationError(
            'type-mismatch',
            ErrorCodes.EXPECTED_STRING,
            `Expected color value, got ${typeof value}.`,
            path,
            value,
            'color value (hex, rgb, or named)',
            []
          )
        );
      }
      break;
    }
  }

  return errors;
}

/**
 * Validate slots.
 */
function validateSlots(
  slots: Readonly<Record<string, readonly BlockConfig[]>>,
  slotSpecs: Readonly<Record<string, import('./types.js').SlotSpec>>,
  basePath: readonly string[],
  options: ValidatorOptions
): ValidationError[] {
  const errors: ValidationError[] = [];

  for (const [slotName, slotContent] of Object.entries(slots)) {
    const slotSpec = slotSpecs[slotName];
    const slotPath = [...basePath, slotName];

    if (!slotSpec) {
      const knownSlots = Object.keys(slotSpecs);
      const suggestions = findSimilar(slotName, knownSlots);
      errors.push(
        createValidationError(
          'unknown-prop',
          ErrorCodes.UNKNOWN_PROP,
          `Unknown slot '${slotName}'. ${suggestions.length > 0 ? `Did you mean '${suggestions[0]}'?` : ''}`,
          slotPath,
          slotContent,
          `Known slot name`,
          suggestions
        )
      );
      continue;
    }

    // Check cardinality
    if (slotSpec.cardinality === 'one' && slotContent.length > 1) {
      errors.push(
        createValidationError(
          'constraint-failed',
          ErrorCodes.CONSTRAINT_FAILED,
          `Slot '${slotName}' accepts only one block, but ${slotContent.length} were provided.`,
          slotPath,
          slotContent,
          'single block',
          []
        )
      );
    }

    // Validate each block in slot
    for (let i = 0; i < slotContent.length; i++) {
      const block = slotContent[i];
      if (!block) continue; // Skip undefined entries
      const blockPath = [...slotPath, String(i)];

      // Check if block type is accepted
      if (slotSpec.accepts && slotSpec.accepts.length > 0) {
        if (!slotSpec.accepts.includes(block.type)) {
          errors.push(
            createValidationError(
              'constraint-failed',
              ErrorCodes.CONSTRAINT_FAILED,
              `Block type '${block.type}' is not allowed in slot '${slotName}'. Allowed: ${slotSpec.accepts.join(', ')}.`,
              [...blockPath, 'type'],
              block.type,
              `One of: ${slotSpec.accepts.join(', ')}`,
              []
            )
          );
        }
      }

      // Check if block type is rejected
      if (slotSpec.rejects && slotSpec.rejects.includes(block.type)) {
        errors.push(
          createValidationError(
            'constraint-failed',
            ErrorCodes.CONSTRAINT_FAILED,
            `Block type '${block.type}' is not allowed in slot '${slotName}'.`,
            [...blockPath, 'type'],
            block.type,
            `Any block except: ${slotSpec.rejects.join(', ')}`,
            []
          )
        );
      }

      // Recursively validate the nested block
      const blockResult = validateBlockConfig(block, { ...options, basePath: blockPath });
      errors.push(...blockResult.errors);
    }
  }

  return errors;
}

/**
 * Interpolate error template with values.
 */
function interpolateTemplate(template: string, values: Record<string, unknown>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => {
    const val = values[key];
    if (val === undefined) return `{{${key}}}`;
    return String(val);
  });
}
