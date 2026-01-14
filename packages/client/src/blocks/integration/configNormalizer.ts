/**
 * Trellis Block Config Normalizer
 *
 * Shared utilities for normalizing block configurations.
 * Handles:
 * - Property name aliases (entityType, source, entity)
 * - Route parameter resolution ($route.params.id → actual UUID)
 * - Expression evaluation in string templates
 */

import type { EntityId, TypePath } from '@trellis/kernel';

// =============================================================================
// TYPES
// =============================================================================

/**
 * Runtime context for resolving dynamic values.
 */
export interface RuntimeContext {
  /** Route parameters */
  readonly routeParams?: Record<string, string>;
  /** Scope variables */
  readonly scope?: Record<string, unknown>;
  /** Current entity (if in entity context) */
  readonly entity?: { id: EntityId };
}

/**
 * Generic block spec from config/YAML.
 */
export type BlockSpec = Record<string, unknown>;

// =============================================================================
// ENTITY TYPE NORMALIZATION
// =============================================================================

/**
 * Extract entity type from block config.
 * Handles multiple aliases: source, entityType, entity.
 */
export function normalizeEntityType(spec: BlockSpec): TypePath {
  // Priority order: source > entityType > entity
  const source = spec['source'] ?? spec['entityType'] ?? spec['entity'];
  return (source as TypePath) ?? '';
}

/**
 * Check if a value is a route parameter reference.
 */
export function isRouteParamValue(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  return value.startsWith('$route.params.') || value.startsWith('${route.params.');
}

/**
 * Check if a value is a scope reference.
 */
export function isScopeRefValue(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  return value.startsWith('$scope.') || value.startsWith('${scope.');
}

// =============================================================================
// VALUE RESOLUTION
// =============================================================================

/**
 * Resolve a route parameter reference to its actual value.
 *
 * @example
 * resolveRouteParam('$route.params.id', { id: 'abc-123' }) => 'abc-123'
 * resolveRouteParam('${route.params.productId}', { productId: 'xyz' }) => 'xyz'
 */
export function resolveRouteParam(
  value: string,
  routeParams: Record<string, string>
): string | undefined {
  // Handle $route.params.X format
  if (value.startsWith('$route.params.')) {
    const paramName = value.slice('$route.params.'.length);
    return routeParams[paramName];
  }

  // Handle ${route.params.X} format
  const match = value.match(/^\$\{route\.params\.(\w+)\}$/);
  if (match && match[1]) {
    return routeParams[match[1]];
  }

  return undefined;
}

/**
 * Resolve a scope reference to its actual value.
 *
 * @example
 * resolveScopeRef('$scope.selectedId', { selectedId: 'abc' }) => 'abc'
 */
export function resolveScopeRef(
  value: string,
  scope: Record<string, unknown>
): unknown {
  // Handle $scope.X format
  if (value.startsWith('$scope.')) {
    const path = value.slice('$scope.'.length);
    return getNestedValue(scope, path);
  }

  // Handle ${scope.X} format
  const match = value.match(/^\$\{scope\.(\w+(?:\.\w+)*)\}$/);
  if (match && match[1]) {
    return getNestedValue(scope, match[1]);
  }

  return undefined;
}

/**
 * Get nested value from object using dot-notation path.
 */
function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  const parts = path.split('.');
  let current: unknown = obj;

  for (const part of parts) {
    if (current === null || current === undefined) return undefined;
    if (typeof current !== 'object') return undefined;
    current = (current as Record<string, unknown>)[part];
  }

  return current;
}

/**
 * Resolve a dynamic value using runtime context.
 * Returns the original value if it's not a dynamic reference.
 */
export function resolveValue(
  value: unknown,
  context: RuntimeContext
): unknown {
  if (typeof value !== 'string') return value;

  // Resolve route params
  if (isRouteParamValue(value) && context.routeParams) {
    const resolved = resolveRouteParam(value, context.routeParams);
    return resolved ?? value; // Return original if not found
  }

  // Resolve scope refs
  if (isScopeRefValue(value) && context.scope) {
    const resolved = resolveScopeRef(value, context.scope);
    return resolved ?? value;
  }

  return value;
}

// =============================================================================
// ENTITY ID NORMALIZATION
// =============================================================================

/**
 * Normalize an entity ID from config.
 * Handles string literals, route params, and scope refs.
 */
export function normalizeEntityId(
  spec: BlockSpec,
  context: RuntimeContext
): EntityId | undefined {
  // Check multiple property names
  const rawId = spec['entityId'] ?? spec['entity_id'] ?? spec['id'];

  if (rawId === undefined || rawId === null) return undefined;

  const resolved = resolveValue(rawId, context);

  // If it's still a dynamic reference, it wasn't resolved
  if (typeof resolved === 'string' && (isRouteParamValue(resolved) || isScopeRefValue(resolved))) {
    console.warn('[configNormalizer] Unresolved entity ID:', resolved);
    return undefined;
  }

  return resolved as EntityId;
}

// =============================================================================
// BLOCK-SPECIFIC CONFIG BUILDERS
// =============================================================================

/**
 * Common base config for all data-fetching blocks.
 */
export interface NormalizedDataConfig {
  /** Entity type to query */
  readonly source: TypePath;
  /** Optional entity ID (for single-entity blocks) */
  readonly entityId?: EntityId;
  /** Filter expression */
  readonly filter?: unknown;
}

/**
 * Normalize common data config properties.
 */
export function normalizeDataConfig(
  spec: BlockSpec,
  context: RuntimeContext
): NormalizedDataConfig {
  const result: NormalizedDataConfig = {
    source: normalizeEntityType(spec),
  };

  const entityId = normalizeEntityId(spec, context);
  if (entityId !== undefined) {
    (result as { entityId: EntityId }).entityId = entityId;
  }

  const filter = spec['filter'];
  if (filter !== undefined) {
    (result as { filter: unknown }).filter = filter;
  }

  return result;
}

// =============================================================================
// FORM CONFIG NORMALIZATION
// =============================================================================

export interface NormalizedFormConfig {
  readonly source: TypePath;
  readonly entityId?: EntityId;
  readonly mode: 'create' | 'edit';
  readonly fields: readonly unknown[];
  readonly actions?: unknown;
}

/**
 * Normalize form block configuration.
 */
export function normalizeFormConfig(
  spec: BlockSpec,
  context: RuntimeContext
): NormalizedFormConfig {
  const base = normalizeDataConfig(spec, context);

  // Determine mode: if entityId is present, assume edit mode
  const explicitMode = spec['mode'] as 'create' | 'edit' | undefined;
  const mode = explicitMode ?? (base.entityId ? 'edit' : 'create');
  const actions = spec['actions'];

  const result: NormalizedFormConfig = {
    source: base.source,
    mode,
    fields: (spec['fields'] as readonly unknown[]) ?? [],
  };

  // Conditional assignment for exactOptionalPropertyTypes
  return {
    ...result,
    ...(base.entityId !== undefined && { entityId: base.entityId }),
    ...(actions !== undefined && { actions }),
  };
}

// =============================================================================
// DETAIL CONFIG NORMALIZATION
// =============================================================================

export interface NormalizedDetailConfig {
  readonly source: TypePath;
  readonly entityId: EntityId;
  readonly sections: readonly unknown[];
  readonly actions?: readonly unknown[];
}

/**
 * Normalize detail block configuration.
 */
export function normalizeDetailConfig(
  spec: BlockSpec,
  context: RuntimeContext
): NormalizedDetailConfig | null {
  const base = normalizeDataConfig(spec, context);

  // Detail block REQUIRES an entityId
  if (!base.entityId) {
    console.error('[configNormalizer] DetailBlock requires entityId');
    return null;
  }

  const actions = spec['actions'] as readonly unknown[] | undefined;

  const result: NormalizedDetailConfig = {
    source: base.source,
    entityId: base.entityId,
    sections: (spec['sections'] as readonly unknown[]) ?? [],
  };

  // Conditional assignment for exactOptionalPropertyTypes
  return {
    ...result,
    ...(actions !== undefined && { actions }),
  };
}

// =============================================================================
// KANBAN CONFIG NORMALIZATION
// =============================================================================

export interface NormalizedKanbanConfig {
  readonly source: TypePath;
  readonly statusProperty: string;
  readonly columns: readonly unknown[];
  readonly card?: unknown;
  readonly filter?: unknown;
}

/**
 * Normalize kanban block configuration.
 */
export function normalizeKanbanConfig(
  spec: BlockSpec,
  context: RuntimeContext
): NormalizedKanbanConfig {
  const base = normalizeDataConfig(spec, context);

  return {
    source: base.source,
    statusProperty: (spec['statusProperty'] as string) ?? 'status',
    columns: (spec['columns'] as readonly unknown[]) ?? [],
    card: spec['card'],
    filter: base.filter,
  };
}

// =============================================================================
// TABLE CONFIG NORMALIZATION
// =============================================================================

export interface NormalizedTableConfig {
  readonly source: TypePath;
  readonly columns: readonly unknown[];
  readonly pagination?: unknown;
  readonly filters?: unknown;
  readonly selectable?: boolean;
  readonly searchable?: boolean;
  readonly searchProperties?: readonly string[];
  readonly defaultSort?: unknown;
  readonly defaultFilters?: unknown;
  readonly onRowClick?: string;
  readonly rowClickTarget?: string;
  // Style options
  readonly showRowNumbers?: boolean;
  readonly compact?: boolean;
  readonly striped?: boolean;
  readonly hoverable?: boolean;
  readonly bordered?: boolean;
  readonly emptyMessage?: string;
  readonly loadingMessage?: string;
}

/**
 * Normalize table block configuration.
 */
export function normalizeTableConfig(
  spec: BlockSpec,
  _context: RuntimeContext
): NormalizedTableConfig {
  const source = normalizeEntityType(spec);

  const base: NormalizedTableConfig = {
    source,
    columns: (spec['columns'] as readonly unknown[]) ?? [],
  };

  const pagination = spec['pagination'];
  const filters = spec['filters'];
  const selectable = spec['selectable'] as boolean | undefined;
  const searchable = spec['searchable'] as boolean | undefined;
  const searchProperties = spec['searchProperties'] as readonly string[] | undefined;
  const defaultSort = spec['defaultSort'];
  const defaultFilters = spec['defaultFilters'];
  const onRowClick = spec['onRowClick'] as string | undefined;
  const rowClickTarget = spec['rowClickTarget'] as string | undefined;
  const showRowNumbers = spec['showRowNumbers'] as boolean | undefined;
  const compact = spec['compact'] as boolean | undefined;
  const striped = spec['striped'] as boolean | undefined;
  const hoverable = spec['hoverable'] as boolean | undefined;
  const bordered = spec['bordered'] as boolean | undefined;
  const emptyMessage = spec['emptyMessage'] as string | undefined;
  const loadingMessage = spec['loadingMessage'] as string | undefined;

  return {
    ...base,
    ...(pagination !== undefined && { pagination }),
    ...(filters !== undefined && { filters }),
    ...(selectable !== undefined && { selectable }),
    ...(searchable !== undefined && { searchable }),
    ...(searchProperties !== undefined && { searchProperties }),
    ...(defaultSort !== undefined && { defaultSort }),
    ...(defaultFilters !== undefined && { defaultFilters }),
    ...(onRowClick !== undefined && { onRowClick }),
    ...(rowClickTarget !== undefined && { rowClickTarget }),
    ...(showRowNumbers !== undefined && { showRowNumbers }),
    ...(compact !== undefined && { compact }),
    ...(striped !== undefined && { striped }),
    ...(hoverable !== undefined && { hoverable }),
    ...(bordered !== undefined && { bordered }),
    ...(emptyMessage !== undefined && { emptyMessage }),
    ...(loadingMessage !== undefined && { loadingMessage }),
  };
}

// =============================================================================
// STATS CONFIG NORMALIZATION
// =============================================================================

export interface NormalizedStatsConfig {
  readonly source: TypePath;
  readonly stats: readonly unknown[];
  readonly filter?: unknown;
}

/**
 * Normalize stats block configuration.
 */
export function normalizeStatsConfig(
  spec: BlockSpec,
  context: RuntimeContext
): NormalizedStatsConfig {
  const base = normalizeDataConfig(spec, context);

  const result: NormalizedStatsConfig = {
    source: base.source,
    stats: (spec['stats'] as readonly unknown[]) ?? [],
  };

  return {
    ...result,
    ...(base.filter !== undefined && { filter: base.filter }),
  };
}

// =============================================================================
// CHART CONFIG NORMALIZATION
// =============================================================================

export interface NormalizedChartConfig {
  readonly source?: TypePath;
  readonly type: 'bar' | 'line' | 'area' | 'pie' | 'doughnut';
  readonly labelProperty?: string;
  readonly valueProperty?: string;
  readonly aggregate?: 'count' | 'sum' | 'avg' | 'min' | 'max';
  readonly data?: readonly unknown[];
  readonly title?: string;
  readonly showLegend?: boolean;
  readonly showGrid?: boolean;
  readonly colors?: readonly string[];
  readonly height?: number;
}

/**
 * Normalize chart block configuration.
 */
export function normalizeChartConfig(
  spec: BlockSpec,
  _context: RuntimeContext
): NormalizedChartConfig {
  const source = normalizeEntityType(spec) || undefined;

  const base: NormalizedChartConfig = {
    type: (spec['type'] as NormalizedChartConfig['type']) ?? 'bar',
  };

  const labelProperty = spec['labelProperty'] as string | undefined;
  const valueProperty = spec['valueProperty'] as string | undefined;
  const aggregate = spec['aggregate'] as NormalizedChartConfig['aggregate'];
  const data = spec['data'] as readonly unknown[] | undefined;
  const title = spec['title'] as string | undefined;
  const showLegend = spec['showLegend'] as boolean | undefined;
  const showGrid = spec['showGrid'] as boolean | undefined;
  const colors = spec['colors'] as readonly string[] | undefined;
  const height = spec['height'] as number | undefined;

  return {
    ...base,
    ...(source !== undefined && { source }),
    ...(labelProperty !== undefined && { labelProperty }),
    ...(valueProperty !== undefined && { valueProperty }),
    ...(aggregate !== undefined && { aggregate }),
    ...(data !== undefined && { data }),
    ...(title !== undefined && { title }),
    ...(showLegend !== undefined && { showLegend }),
    ...(showGrid !== undefined && { showGrid }),
    ...(colors !== undefined && { colors }),
    ...(height !== undefined && { height }),
  };
}

// =============================================================================
// CALENDAR CONFIG NORMALIZATION
// =============================================================================

export interface NormalizedCalendarConfig {
  readonly source: TypePath;
  readonly dateProperty: string;
  readonly titleProperty?: string;
  readonly filter?: unknown;
}

/**
 * Normalize calendar block configuration.
 */
export function normalizeCalendarConfig(
  spec: BlockSpec,
  context: RuntimeContext
): NormalizedCalendarConfig {
  const base = normalizeDataConfig(spec, context);

  const result: NormalizedCalendarConfig = {
    source: base.source,
    dateProperty: (spec['dateProperty'] as string) ?? 'date',
  };

  const titleProperty = spec['titleProperty'] as string | undefined;

  return {
    ...result,
    ...(titleProperty !== undefined && { titleProperty }),
    ...(base.filter !== undefined && { filter: base.filter }),
  };
}

// =============================================================================
// TIMELINE CONFIG NORMALIZATION
// =============================================================================

export interface NormalizedTimelineConfig {
  readonly source: TypePath;
  readonly dateProperty: string;
  readonly titleProperty?: string;
  readonly descriptionProperty?: string;
  readonly groupBy?: 'day' | 'week' | 'month';
  readonly filter?: unknown;
}

/**
 * Normalize timeline block configuration.
 */
export function normalizeTimelineConfig(
  spec: BlockSpec,
  context: RuntimeContext
): NormalizedTimelineConfig {
  const base = normalizeDataConfig(spec, context);

  const result: NormalizedTimelineConfig = {
    source: base.source,
    dateProperty: (spec['dateProperty'] as string) ?? 'date',
  };

  const titleProperty = spec['titleProperty'] as string | undefined;
  const descriptionProperty = spec['descriptionProperty'] as string | undefined;
  const groupBy = spec['groupBy'] as 'day' | 'week' | 'month' | undefined;

  return {
    ...result,
    ...(titleProperty !== undefined && { titleProperty }),
    ...(descriptionProperty !== undefined && { descriptionProperty }),
    ...(groupBy !== undefined && { groupBy }),
    ...(base.filter !== undefined && { filter: base.filter }),
  };
}

// =============================================================================
// COMMENTS CONFIG NORMALIZATION
// =============================================================================

export interface NormalizedCommentsConfig {
  readonly source: TypePath;
  readonly entityId: EntityId;
  readonly allowReplies?: boolean;
  readonly allowEdit?: boolean;
  readonly allowDelete?: boolean;
}

/**
 * Normalize comments block configuration.
 */
export function normalizeCommentsConfig(
  spec: BlockSpec,
  context: RuntimeContext
): NormalizedCommentsConfig | null {
  const base = normalizeDataConfig(spec, context);

  // Comments block REQUIRES an entityId to attach comments to
  if (!base.entityId) {
    console.error('[configNormalizer] CommentsBlock requires entityId');
    return null;
  }

  const result: NormalizedCommentsConfig = {
    source: base.source,
    entityId: base.entityId,
  };

  const allowReplies = spec['allowReplies'] as boolean | undefined;
  const allowEdit = spec['allowEdit'] as boolean | undefined;
  const allowDelete = spec['allowDelete'] as boolean | undefined;

  return {
    ...result,
    ...(allowReplies !== undefined && { allowReplies }),
    ...(allowEdit !== undefined && { allowEdit }),
    ...(allowDelete !== undefined && { allowDelete }),
  };
}

// =============================================================================
// TREE CONFIG NORMALIZATION
// =============================================================================

export interface NormalizedTreeConfig {
  readonly source: TypePath;
  readonly parentProperty: string;
  readonly labelProperty?: string;
  readonly filter?: unknown;
}

/**
 * Normalize tree block configuration.
 */
export function normalizeTreeConfig(
  spec: BlockSpec,
  context: RuntimeContext
): NormalizedTreeConfig {
  const base = normalizeDataConfig(spec, context);

  const result: NormalizedTreeConfig = {
    source: base.source,
    parentProperty: (spec['parentProperty'] as string) ?? 'parent_id',
  };

  const labelProperty = spec['labelProperty'] as string | undefined;

  return {
    ...result,
    ...(labelProperty !== undefined && { labelProperty }),
    ...(base.filter !== undefined && { filter: base.filter }),
  };
}
