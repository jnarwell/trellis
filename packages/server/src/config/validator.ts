/**
 * Trellis Product Configuration - Validator
 *
 * Validates product configurations against the spec.
 */

import type { BlockRegistry, EntitySchemaRegistry, TypeSchemaInfo, PropertySchemaInfo } from '@trellis/kernel';
import type { TypePath, PropertyName, TenantId } from '@trellis/kernel';
import { findSimilar } from '@trellis/kernel';
import type {
  ProductConfig,
  ProductValidationResult,
  ProductValidationError,
  ProductValidationWarning,
  ProductErrorCategory,
  EntityTypeConfig,
  ViewConfig,
  ViewId,
  LayoutConfig,
  BlockPlacement,
} from './types.js';

// =============================================================================
// VALIDATION CONTEXT
// =============================================================================

/**
 * Context for product validation.
 */
export interface ProductValidationContext {
  /** The product being validated */
  readonly product: ProductConfig;

  /** Entity schema registry (built from product config) */
  readonly entities: EntitySchemaRegistry;

  /** Block registry */
  readonly blocks: BlockRegistry;

  /** Tenant ID */
  readonly tenantId: TenantId;

  /** All view IDs in product */
  readonly viewIds: Set<ViewId>;

  /** All entity type IDs in product */
  readonly entityTypeIds: Set<string>;

  /** Current file being validated */
  currentFile?: string;
}

/**
 * Create an entity schema registry from product config.
 */
// Helper to build PropertySchemaInfo with optional description
function buildPropertySchemaInfo(
  name: PropertyName,
  valueType: string,
  required: boolean,
  description?: string
): PropertySchemaInfo {
  const base = { name, valueType, required };
  return description ? { ...base, description } : base;
}

// Helper to build TypeSchemaInfo with optional description
function buildTypeSchemaInfo(
  type: TypePath,
  name: string,
  properties: readonly PropertySchemaInfo[],
  description?: string
): TypeSchemaInfo {
  const base = { type, name, properties };
  return description ? { ...base, description } : base;
}

export function createEntityRegistryFromConfig(
  entities: Record<string, EntityTypeConfig>
): EntitySchemaRegistry {
  const schemas = new Map<string, TypeSchemaInfo>();

  for (const [id, config] of Object.entries(entities)) {
    const properties: PropertySchemaInfo[] = config.properties.map((p) =>
      buildPropertySchemaInfo(
        p.name as PropertyName,
        typeof p.type === 'string' ? p.type : p.type.type,
        p.required ?? false,
        p.description
      )
    );

    // Add computed properties
    if (config.computed) {
      for (const cp of config.computed) {
        properties.push(
          buildPropertySchemaInfo(
            cp.name as PropertyName,
            'number', // Computed properties are typically numbers
            false,
            cp.description
          )
        );
      }
    }

    schemas.set(
      id,
      buildTypeSchemaInfo(id as TypePath, config.name, properties, config.description)
    );
  }

  return {
    hasType: (type) => schemas.has(type),
    getType: (type) => schemas.get(type),
    getTypes: (pattern) => {
      if (pattern === '*') return Array.from(schemas.values());
      return Array.from(schemas.values()).filter((s) =>
        s.type.includes(pattern) || new RegExp(pattern).test(s.type)
      );
    },
    getProperties: (type) => schemas.get(type)?.properties ?? [],
    hasProperty: (type, property) => {
      const schema = schemas.get(type);
      return schema?.properties.some((p) => p.name === property) ?? false;
    },
    getProperty: (type, property) => {
      const schema = schemas.get(type);
      return schema?.properties.find((p) => p.name === property);
    },
  };
}

// =============================================================================
// VALIDATION HELPERS
// =============================================================================

/**
 * Create a validation error.
 */
function createError(
  category: ProductErrorCategory,
  code: string,
  message: string,
  path: readonly string[],
  value: unknown,
  expected: string,
  suggestions: readonly string[] = [],
  file?: string,
  line?: number
): ProductValidationError {
  const base: ProductValidationError = {
    category,
    code,
    message,
    path: [...path],
    value,
    expected,
    suggestions: [...suggestions],
  };

  if (file) {
    return { ...base, location: { file, line: line ?? 0, column: 0 } };
  }
  return base;
}

/**
 * Create a validation warning.
 */
function createWarning(
  code: string,
  message: string,
  path: readonly string[],
  suggestion?: string
): ProductValidationWarning {
  const base: ProductValidationWarning = {
    code,
    message,
    path: [...path],
  };

  if (suggestion) {
    return { ...base, suggestion };
  }
  return base;
}

// =============================================================================
// VALIDATORS
// =============================================================================

/**
 * Validate a product configuration.
 */
export function validateProduct(
  product: ProductConfig,
  blocks: BlockRegistry,
  tenantId: TenantId
): ProductValidationResult {
  const errors: ProductValidationError[] = [];
  const warnings: ProductValidationWarning[] = [];

  const manifestErrors: ProductValidationError[] = [];
  const manifestWarnings: ProductValidationWarning[] = [];
  const entityErrors: ProductValidationError[] = [];
  const entityWarnings: ProductValidationWarning[] = [];
  const viewErrors: ProductValidationError[] = [];
  const viewWarnings: ProductValidationWarning[] = [];
  const navErrors: ProductValidationError[] = [];
  const navWarnings: ProductValidationWarning[] = [];
  const wiringErrors: ProductValidationError[] = [];
  const wiringWarnings: ProductValidationWarning[] = [];
  const permissionErrors: ProductValidationError[] = [];
  const permissionWarnings: ProductValidationWarning[] = [];

  // Build context
  const viewIds = new Set(Object.keys(product.views) as ViewId[]);
  const entityTypeIds = new Set(Object.keys(product.entities));

  const entities = createEntityRegistryFromConfig(product.entities);

  const context: ProductValidationContext = {
    product,
    entities,
    blocks,
    tenantId,
    viewIds,
    entityTypeIds,
  };

  // Validate manifest
  validateManifest(product, context, manifestErrors, manifestWarnings);

  // Validate entity types
  for (const [id, entity] of Object.entries(product.entities)) {
    validateEntityType(id, entity, context, entityErrors, entityWarnings);
  }

  // Validate views
  for (const [id, view] of Object.entries(product.views)) {
    validateView(id as ViewId, view, context, viewErrors, viewWarnings);
  }

  // Validate navigation
  if (product.navigation) {
    validateNavigation(product.navigation, context, navErrors, navWarnings);
  }

  // Validate product wiring
  if (product.wiring) {
    validateProductWiring(product.wiring, context, wiringErrors, wiringWarnings);
  }

  // Aggregate errors
  errors.push(
    ...manifestErrors,
    ...entityErrors,
    ...viewErrors,
    ...navErrors,
    ...wiringErrors,
    ...permissionErrors
  );
  warnings.push(
    ...manifestWarnings,
    ...entityWarnings,
    ...viewWarnings,
    ...navWarnings,
    ...wiringWarnings,
    ...permissionWarnings
  );

  return {
    valid: errors.length === 0,
    productId: product.manifest.id,
    errors,
    warnings,
    byCategory: {
      manifest: { errors: manifestErrors, warnings: manifestWarnings },
      entities: { errors: entityErrors, warnings: entityWarnings },
      views: { errors: viewErrors, warnings: viewWarnings },
      navigation: { errors: navErrors, warnings: navWarnings },
      wiring: { errors: wiringErrors, warnings: wiringWarnings },
      permissions: { errors: permissionErrors, warnings: permissionWarnings },
    },
    errorCount: errors.length,
    warningCount: warnings.length,
  };
}

/**
 * Validate the product manifest.
 */
function validateManifest(
  product: ProductConfig,
  context: ProductValidationContext,
  errors: ProductValidationError[],
  warnings: ProductValidationWarning[]
): void {
  const { manifest } = product;

  // Validate product ID format
  if (!/^[a-z][a-z0-9_.-]*$/.test(manifest.id)) {
    errors.push(
      createError(
        'manifest-invalid',
        'INVALID_PRODUCT_ID',
        `Product ID '${manifest.id}' is invalid. Must start with lowercase letter, contain only lowercase letters, numbers, underscores, dots, or hyphens.`,
        ['id'],
        manifest.id,
        'Valid product ID (e.g., "plm", "acme.inventory")',
        [manifest.id.toLowerCase().replace(/[^a-z0-9_.-]/g, '-')]
      )
    );
  }

  // Validate version format
  if (!/^\d+\.\d+\.\d+$/.test(manifest.version)) {
    errors.push(
      createError(
        'manifest-invalid',
        'INVALID_VERSION',
        `Version '${manifest.version}' is not valid semver. Expected format: X.Y.Z`,
        ['version'],
        manifest.version,
        'Semantic version (e.g., "1.0.0")',
        ['1.0.0']
      )
    );
  }

  // Validate defaultView exists
  if (!context.viewIds.has(manifest.defaultView)) {
    const suggestions = findSimilar(
      manifest.defaultView,
      Array.from(context.viewIds)
    );
    errors.push(
      createError(
        'reference-broken',
        'DEFAULT_VIEW_NOT_FOUND',
        `Default view '${manifest.defaultView}' not found.${suggestions.length > 0 ? ` Did you mean '${suggestions[0]}'?` : ''}`,
        ['defaultView'],
        manifest.defaultView,
        'Valid view ID from product views',
        suggestions
      )
    );
  }
}

/**
 * Validate an entity type.
 */
function validateEntityType(
  id: string,
  entity: EntityTypeConfig,
  context: ProductValidationContext,
  errors: ProductValidationError[],
  warnings: ProductValidationWarning[]
): void {
  const basePath = ['entities', id];

  // Validate ID format
  if (!/^[a-z][a-z0-9_]*$/.test(id)) {
    errors.push(
      createError(
        'entity-invalid',
        'INVALID_ENTITY_ID',
        `Entity type ID '${id}' is invalid. Must be lowercase with underscores.`,
        basePath,
        id,
        'Valid entity type ID (e.g., "part", "assembly")',
        [id.toLowerCase().replace(/[^a-z0-9_]/g, '_')]
      )
    );
  }

  // Validate properties
  const propertyNames = new Set<string>();
  for (let i = 0; i < entity.properties.length; i++) {
    const prop = entity.properties[i];
    if (!prop) continue;
    const propPath = [...basePath, 'properties', String(i)];

    // Check property name format
    if (!/^[a-z][a-z0-9_]*$/.test(prop.name)) {
      errors.push(
        createError(
          'entity-invalid',
          'INVALID_PROPERTY_NAME',
          `Property name '${prop.name}' is invalid. Use snake_case.`,
          propPath,
          prop.name,
          'Valid property name (e.g., "part_number", "unit_cost")',
          [prop.name.toLowerCase().replace(/[^a-z0-9_]/g, '_')]
        )
      );
    }

    // Check for duplicates
    if (propertyNames.has(prop.name)) {
      errors.push(
        createError(
          'entity-invalid',
          'DUPLICATE_PROPERTY',
          `Duplicate property name '${prop.name}'.`,
          propPath,
          prop.name,
          'Unique property name',
          []
        )
      );
    }
    propertyNames.add(prop.name);

    // Validate reference types
    const propType = prop.type;
    if (typeof propType === 'object' && propType.type === 'reference') {
      if (!context.entityTypeIds.has(propType.entityType)) {
        const suggestions = findSimilar(
          propType.entityType,
          Array.from(context.entityTypeIds)
        );
        errors.push(
          createError(
            'reference-broken',
            'REFERENCE_TYPE_NOT_FOUND',
            `Referenced entity type '${propType.entityType}' not found.${suggestions.length > 0 ? ` Did you mean '${suggestions[0]}'?` : ''}`,
            [...propPath, 'type', 'entityType'],
            propType.entityType,
            'Valid entity type ID',
            suggestions
          )
        );
      }
    }
  }

  // Validate lifecycle
  if (entity.lifecycle) {
    validateLifecycle(entity.lifecycle, basePath, errors, warnings);
  }
}

/**
 * Validate lifecycle configuration.
 */
function validateLifecycle(
  lifecycle: import('./types.js').LifecycleConfig,
  basePath: readonly string[],
  errors: ProductValidationError[],
  warnings: ProductValidationWarning[]
): void {
  const lifecyclePath = [...basePath, 'lifecycle'];
  const stateValues = new Set(lifecycle.states.map((s) => s.value));

  // Check for duplicate states
  const seenStates = new Set<string>();
  for (let i = 0; i < lifecycle.states.length; i++) {
    const state = lifecycle.states[i];
    if (!state) continue;
    if (seenStates.has(state.value)) {
      errors.push(
        createError(
          'entity-invalid',
          'DUPLICATE_LIFECYCLE_STATE',
          `Duplicate lifecycle state '${state.value}'.`,
          [...lifecyclePath, 'states', String(i)],
          state.value,
          'Unique state value',
          []
        )
      );
    }
    seenStates.add(state.value);
  }

  // Validate initial state exists
  if (!stateValues.has(lifecycle.initialState)) {
    const suggestions = findSimilar(lifecycle.initialState, Array.from(stateValues));
    errors.push(
      createError(
        'entity-invalid',
        'INITIAL_STATE_NOT_FOUND',
        `Initial state '${lifecycle.initialState}' not found in states.`,
        [...lifecyclePath, 'initialState'],
        lifecycle.initialState,
        'Valid state value',
        suggestions
      )
    );
  }

  // Validate transitions reference valid states
  for (let i = 0; i < lifecycle.transitions.length; i++) {
    const transition = lifecycle.transitions[i];
    if (!transition) continue;
    const transPath = [...lifecyclePath, 'transitions', String(i)];

    // Check 'from' states
    const fromStates = Array.isArray(transition.from) ? transition.from : [transition.from];
    for (const fromState of fromStates) {
      if (!stateValues.has(fromState)) {
        const suggestions = findSimilar(fromState, Array.from(stateValues));
        errors.push(
          createError(
            'entity-invalid',
            'TRANSITION_STATE_NOT_FOUND',
            `Transition 'from' state '${fromState}' not found.`,
            [...transPath, 'from'],
            fromState,
            'Valid state value',
            suggestions
          )
        );
      }
    }

    // Check 'to' state
    if (!stateValues.has(transition.to)) {
      const suggestions = findSimilar(transition.to, Array.from(stateValues));
      errors.push(
        createError(
          'entity-invalid',
          'TRANSITION_STATE_NOT_FOUND',
          `Transition 'to' state '${transition.to}' not found.`,
          [...transPath, 'to'],
          transition.to,
          'Valid state value',
          suggestions
        )
      );
    }
  }
}

/**
 * Validate a view.
 */
function validateView(
  id: ViewId,
  view: ViewConfig,
  context: ProductValidationContext,
  errors: ProductValidationError[],
  warnings: ProductValidationWarning[]
): void {
  const basePath = ['views', id];

  // Validate view ID format
  if (!/^[a-z][a-z0-9-]*$/.test(id)) {
    errors.push(
      createError(
        'view-invalid',
        'INVALID_VIEW_ID',
        `View ID '${id}' is invalid. Use kebab-case.`,
        basePath,
        id,
        'Valid view ID (e.g., "parts-list", "part-detail")',
        [id.toLowerCase().replace(/[^a-z0-9-]/g, '-')]
      )
    );
  }

  // Validate route format
  if (!/^\/[a-z0-9/:_-]*$/.test(view.route)) {
    errors.push(
      createError(
        'view-invalid',
        'INVALID_ROUTE',
        `Route '${view.route}' is invalid. Must start with / and contain valid path segments.`,
        [...basePath, 'route'],
        view.route,
        'Valid route pattern',
        [`/${id}`]
      )
    );
  }

  // Validate route params are defined
  if (view.data?.params) {
    const routeParams = view.route.match(/:([a-zA-Z]+)/g)?.map((p) => p.slice(1)) ?? [];
    const definedParams = Object.keys(view.data.params);

    for (const param of routeParams) {
      if (!definedParams.includes(param)) {
        errors.push(
          createError(
            'view-invalid',
            'UNDEFINED_ROUTE_PARAM',
            `Route parameter ':${param}' is not defined in data.params.`,
            [...basePath, 'data', 'params'],
            param,
            'Defined parameter',
            [`Add '${param}' to data.params`]
          )
        );
      }
    }
  }

  // Validate layout
  validateLayout(view.layout, [...basePath, 'layout'], context, errors, warnings);

  // Validate view wiring
  if (view.wiring) {
    for (let i = 0; i < view.wiring.length; i++) {
      // Basic wiring validation
      const wiring = view.wiring[i];
      if (!wiring) continue;
      const wiringPath = [...basePath, 'wiring', String(i)];

      // Validate source and target exist or are special values
      const specialTargets = ['$navigate', '$system'];
      if (wiring.from && !specialTargets.includes(wiring.from)) {
        // Block reference - would need to validate against blocks in view
      }
      if (wiring.to && !specialTargets.includes(wiring.to)) {
        // Block reference - would need to validate against blocks in view
      }
    }
  }
}

/**
 * Validate a layout configuration recursively.
 */
function validateLayout(
  layout: LayoutConfig,
  basePath: readonly string[],
  context: ProductValidationContext,
  errors: ProductValidationError[],
  warnings: ProductValidationWarning[]
): void {
  switch (layout.type) {
    case 'single':
      validateBlockPlacement(layout.block, [...basePath, 'block'], context, errors, warnings);
      break;

    case 'stack':
      for (let i = 0; i < layout.blocks.length; i++) {
        const block = layout.blocks[i];
        if (!block) continue;
        validateBlockPlacement(block, [...basePath, 'blocks', String(i)], context, errors, warnings);
      }
      break;

    case 'split':
      for (let i = 0; i < layout.panels.length; i++) {
        const panel = layout.panels[i];
        if (!panel) continue;
        if (panel.blocks) {
          for (let j = 0; j < panel.blocks.length; j++) {
            const block = panel.blocks[j];
            if (!block) continue;
            validateBlockPlacement(block, [...basePath, 'panels', String(i), 'blocks', String(j)], context, errors, warnings);
          }
        }
        if (panel.layout) {
          validateLayout(panel.layout, [...basePath, 'panels', String(i), 'layout'], context, errors, warnings);
        }
      }
      break;

    case 'tabs':
      for (let i = 0; i < layout.tabs.length; i++) {
        const tab = layout.tabs[i];
        if (!tab) continue;
        if (tab.block) {
          validateBlockPlacement(tab.block, [...basePath, 'tabs', String(i), 'block'], context, errors, warnings);
        }
        if (tab.blocks) {
          for (let j = 0; j < tab.blocks.length; j++) {
            const block = tab.blocks[j];
            if (!block) continue;
            validateBlockPlacement(block, [...basePath, 'tabs', String(i), 'blocks', String(j)], context, errors, warnings);
          }
        }
        if (tab.layout) {
          validateLayout(tab.layout, [...basePath, 'tabs', String(i), 'layout'], context, errors, warnings);
        }
      }
      break;

    case 'grid':
      for (let i = 0; i < layout.rows.length; i++) {
        const row = layout.rows[i];
        if (!row) continue;
        for (let j = 0; j < row.cells.length; j++) {
          const cell = row.cells[j];
          if (!cell) continue;
          if (cell.block) {
            validateBlockPlacement(cell.block, [...basePath, 'rows', String(i), 'cells', String(j), 'block'], context, errors, warnings);
          }
          if (cell.layout) {
            validateLayout(cell.layout, [...basePath, 'rows', String(i), 'cells', String(j), 'layout'], context, errors, warnings);
          }
        }
      }
      break;
  }
}

/**
 * Validate a block placement.
 */
function validateBlockPlacement(
  block: BlockPlacement,
  basePath: readonly string[],
  context: ProductValidationContext,
  errors: ProductValidationError[],
  warnings: ProductValidationWarning[]
): void {
  // Check if block type exists
  if (!context.blocks.hasBlock(block.type)) {
    const availableTypes = context.blocks.getBlocks().map((s) => s.type);
    const suggestions = findSimilar(block.type, availableTypes);
    errors.push(
      createError(
        'view-invalid',
        'BLOCK_TYPE_NOT_FOUND',
        `Block type '${block.type}' not found.${suggestions.length > 0 ? ` Did you mean '${suggestions[0]}'?` : ''}`,
        [...basePath, 'type'],
        block.type,
        'Valid block type from registry',
        suggestions
      )
    );
    return; // Can't validate props without spec
  }

  // Validate data bindings in props
  for (const [propName, propValue] of Object.entries(block.props)) {
    if (typeof propValue === 'string' && propValue.startsWith('$')) {
      // This is a data binding - validation would check scope
      // For now, just check basic syntax
      if (!isValidDataBindingExpression(propValue)) {
        errors.push(
          createError(
            'view-invalid',
            'INVALID_DATA_BINDING',
            `Invalid data binding expression: '${propValue}'.`,
            [...basePath, 'props', propName],
            propValue,
            'Valid data binding expression',
            []
          )
        );
      }
    }
  }

  // Recursively validate slots
  if (block.slots) {
    for (const [slotName, slotBlocks] of Object.entries(block.slots)) {
      for (let i = 0; i < slotBlocks.length; i++) {
        const slotBlock = slotBlocks[i];
        if (!slotBlock) continue;
        validateBlockPlacement(slotBlock, [...basePath, 'slots', slotName, String(i)], context, errors, warnings);
      }
    }
  }
}

/**
 * Check if a string is a valid data binding expression.
 */
function isValidDataBindingExpression(expr: string): boolean {
  // Basic validation: starts with $ followed by valid identifier
  if (expr.startsWith('$')) {
    // $scope.prop, $params.x, $can('...'), etc.
    return /^\$[a-zA-Z_][a-zA-Z0-9_.]*(\([^)]*\))?$/.test(expr) ||
           /^\$[a-zA-Z_][a-zA-Z0-9_]*\.[a-zA-Z_][a-zA-Z0-9_]*/.test(expr) ||
           expr.startsWith('$can(') ||
           expr.startsWith('$hasRole(');
  }
  return true;
}

/**
 * Validate navigation configuration.
 */
function validateNavigation(
  nav: import('./types.js').NavigationConfig,
  context: ProductValidationContext,
  errors: ProductValidationError[],
  warnings: ProductValidationWarning[]
): void {
  const basePath = ['navigation'];
  const seenIds = new Set<string>();

  for (let i = 0; i < nav.sections.length; i++) {
    const section = nav.sections[i];
    if (!section) continue;
    const sectionPath = [...basePath, 'sections', String(i)];

    for (let j = 0; j < section.items.length; j++) {
      const item = section.items[j];
      if (!item) continue;
      const itemPath = [...sectionPath, 'items', String(j)];

      // Check for duplicate IDs
      if (seenIds.has(item.id)) {
        errors.push(
          createError(
            'navigation-invalid',
            'DUPLICATE_NAV_ID',
            `Duplicate navigation item ID '${item.id}'.`,
            [...itemPath, 'id'],
            item.id,
            'Unique navigation item ID',
            []
          )
        );
      }
      seenIds.add(item.id);

      // Check view reference
      if (item.view && !context.viewIds.has(item.view)) {
        const suggestions = findSimilar(item.view, Array.from(context.viewIds));
        errors.push(
          createError(
            'reference-broken',
            'NAV_VIEW_NOT_FOUND',
            `Navigation item references unknown view '${item.view}'.`,
            [...itemPath, 'view'],
            item.view,
            'Valid view ID',
            suggestions
          )
        );
      }

      // Check badge query entity type
      if (item.badge?.query?.entityType) {
        if (!context.entityTypeIds.has(item.badge.query.entityType)) {
          const suggestions = findSimilar(
            item.badge.query.entityType,
            Array.from(context.entityTypeIds)
          );
          errors.push(
            createError(
              'reference-broken',
              'BADGE_ENTITY_NOT_FOUND',
              `Badge query references unknown entity type '${item.badge.query.entityType}'.`,
              [...itemPath, 'badge', 'query', 'entityType'],
              item.badge.query.entityType,
              'Valid entity type ID',
              suggestions
            )
          );
        }
      }
    }
  }
}

/**
 * Validate product-level wiring.
 */
function validateProductWiring(
  wiring: import('./types.js').ProductWiringConfig,
  context: ProductValidationContext,
  errors: ProductValidationError[],
  warnings: ProductValidationWarning[]
): void {
  const basePath = ['wiring'];

  // Validate navigation wiring
  if (wiring.navigation) {
    for (let i = 0; i < wiring.navigation.length; i++) {
      const nav = wiring.navigation[i];
      if (!nav) continue;
      const navPath = [...basePath, 'navigation', String(i)];

      // Validate source view (unless wildcard)
      if (nav.source.view !== '*' && !context.viewIds.has(nav.source.view as ViewId)) {
        const suggestions = findSimilar(nav.source.view, Array.from(context.viewIds));
        errors.push(
          createError(
            'wiring-invalid',
            'WIRING_SOURCE_VIEW_NOT_FOUND',
            `Wiring source references unknown view '${nav.source.view}'.`,
            [...navPath, 'source', 'view'],
            nav.source.view,
            'Valid view ID or "*"',
            ['*', ...suggestions]
          )
        );
      }

      // Validate target view
      if (typeof nav.targetView === 'string' && !nav.targetView.includes('$')) {
        // Not a dynamic expression
        if (!context.viewIds.has(nav.targetView as ViewId)) {
          const suggestions = findSimilar(nav.targetView, Array.from(context.viewIds));
          errors.push(
            createError(
              'wiring-invalid',
              'WIRING_TARGET_VIEW_NOT_FOUND',
              `Wiring target view '${nav.targetView}' not found.`,
              [...navPath, 'targetView'],
              nav.targetView,
              'Valid view ID',
              suggestions
            )
          );
        }
      }
    }
  }
}
