/**
 * Trellis Product Configuration - Type Definitions
 *
 * All types for product YAML configuration.
 * Based on specs/config/product-config-spec.md
 */

import type { TypePath, PropertyName, TenantId } from '@trellis/kernel';
import type {
  BlockType,
  BlockInstanceId,
  BlockConfig,
  PropValue,
} from '@trellis/kernel';

// =============================================================================
// BRANDED TYPES
// =============================================================================

/** Product identifier (e.g., "plm", "acme.inventory") */
export type ProductId = string & { readonly __brand: 'ProductId' };

/** View identifier (e.g., "parts-list", "part-detail") */
export type ViewId = string & { readonly __brand: 'ViewId' };

// =============================================================================
// 1. PRODUCT MANIFEST
// =============================================================================

/**
 * Product manifest - the root configuration for a Trellis product.
 */
export interface ProductManifest {
  /** Unique product identifier (e.g., "plm", "acme.inventory") */
  readonly id: ProductId;

  /** Semantic version */
  readonly version: `${number}.${number}.${number}`;

  /** Human-readable name */
  readonly name: string;

  /** Description of what this product does */
  readonly description: string;

  /** Optional: base product to extend */
  readonly extends?: ProductId;

  /** Feature flags enabled for this product */
  readonly features?: readonly string[];

  /** Default view when product loads */
  readonly defaultView: ViewId;

  /** Required dependencies */
  readonly requires?: ProductRequirements;

  /** Product-level settings */
  readonly settings?: ProductSettings;

  /** File references (resolved at load time) */
  readonly includes?: ProductIncludes;
}

/**
 * Dependencies required for this product to function.
 */
export interface ProductRequirements {
  /** Minimum Trellis platform version */
  readonly platformVersion?: string;

  /** Required block types */
  readonly blocks?: readonly BlockType[];

  /** Required entity type libraries */
  readonly entityLibraries?: readonly string[];

  /** Required integrations */
  readonly integrations?: readonly string[];
}

/**
 * Product-level settings and defaults.
 */
export interface ProductSettings {
  /** Default locale */
  readonly locale?: string;

  /** Default timezone */
  readonly timezone?: string;

  /** Theme configuration */
  readonly theme?: ThemeConfig;

  /** Analytics configuration */
  readonly analytics?: AnalyticsConfig;

  /** Custom branding */
  readonly branding?: BrandingConfig;
}

/**
 * File includes for modular configuration.
 */
export interface ProductIncludes {
  /** Glob patterns for entity type files */
  readonly entities?: string | readonly string[];

  /** Glob patterns for view files */
  readonly views?: string | readonly string[];

  /** Glob patterns for relationship files */
  readonly relationships?: string | readonly string[];

  /** Glob patterns for workflow files */
  readonly workflows?: string | readonly string[];

  /** Glob patterns for permission files */
  readonly permissions?: string | readonly string[];
}

/**
 * Theme configuration.
 */
export interface ThemeConfig {
  /** Primary brand color */
  readonly primaryColor?: string;

  /** Color mode preference */
  readonly colorMode?: 'light' | 'dark' | 'system';

  /** Custom CSS variables */
  readonly variables?: Readonly<Record<string, string>>;
}

/**
 * Branding configuration.
 */
export interface BrandingConfig {
  /** Product logo URL */
  readonly logo?: string;

  /** Favicon URL */
  readonly favicon?: string;

  /** Page title template */
  readonly titleTemplate?: string;
}

/**
 * Analytics configuration.
 */
export interface AnalyticsConfig {
  /** Enable analytics */
  readonly enabled: boolean;

  /** Analytics provider */
  readonly provider?: 'trellis' | 'custom';

  /** Custom endpoint */
  readonly endpoint?: string;
}

// =============================================================================
// 2. ENTITY TYPE DEFINITION
// =============================================================================

/**
 * Dimension type for numeric properties.
 */
export type DimensionType =
  | 'length'
  | 'mass'
  | 'time'
  | 'current'
  | 'temperature'
  | 'amount'
  | 'luminosity'
  | 'area'
  | 'volume'
  | 'velocity'
  | 'acceleration'
  | 'force'
  | 'energy'
  | 'power'
  | 'pressure'
  | 'frequency'
  | 'voltage'
  | 'resistance'
  | 'currency'
  | 'density'
  | 'dimensionless';

/**
 * Entity type definition in product configuration.
 */
export interface EntityTypeConfig {
  /** Entity type identifier (becomes TypePath) */
  readonly id: string;

  /** Human-readable name */
  readonly name: string;

  /** Description */
  readonly description?: string;

  /** Icon for UI */
  readonly icon?: string;

  /** Parent type (for inheritance) */
  readonly extends?: string;

  /** Whether this is abstract (cannot be instantiated) */
  readonly abstract?: boolean;

  /** Property definitions */
  readonly properties: readonly PropertyConfig[];

  /** Lifecycle state machine (optional) */
  readonly lifecycle?: LifecycleConfig;

  /** UI configuration hints */
  readonly ui?: EntityUIConfig;

  /** Computed properties (expressions) */
  readonly computed?: readonly ComputedPropertyConfig[];

  /** Indexes for performance */
  readonly indexes?: readonly IndexConfig[];
}

/**
 * Property definition within an entity type.
 */
export interface PropertyConfig {
  /** Property name (becomes PropertyName) */
  readonly name: string;

  /** Display label */
  readonly label?: string;

  /** Property type */
  readonly type: PropertyTypeConfig;

  /** Whether this property is required */
  readonly required?: boolean;

  /** Whether this property must be unique across entities of this type */
  readonly unique?: boolean;

  /** Default value */
  readonly default?: unknown;

  /** Validation rules */
  readonly validation?: PropertyValidation;

  /** Description / help text */
  readonly description?: string;

  /** UI hints */
  readonly ui?: PropertyUIConfig;
}

/**
 * Property type configuration.
 */
export type PropertyTypeConfig =
  // Simple types (string shorthand)
  | 'text'
  | 'string'
  | 'number'
  | 'integer'
  | 'boolean'
  | 'datetime'
  | 'date'
  | 'duration'

  // Complex types (object form)
  | { readonly type: 'text'; readonly maxLength?: number }
  | { readonly type: 'number'; readonly dimension?: DimensionType; readonly unit?: string; readonly min?: number; readonly max?: number }
  | { readonly type: 'integer'; readonly min?: number; readonly max?: number }
  | { readonly type: 'boolean' }
  | { readonly type: 'datetime' }
  | { readonly type: 'date' }
  | { readonly type: 'duration' }
  | { readonly type: 'reference'; readonly entityType: string; readonly displayProperty?: string }
  | { readonly type: 'option'; readonly options: readonly OptionConfig[] }
  | { readonly type: 'list'; readonly element: PropertyTypeConfig; readonly minItems?: number; readonly maxItems?: number }
  | { readonly type: 'record'; readonly fields: Readonly<Record<string, PropertyConfig>> }
  | { readonly type: 'expression'; readonly expression: string; readonly dimension?: DimensionType; readonly unit?: string }
  | { readonly type: 'file'; readonly accept?: readonly string[]; readonly maxSize?: number }
  | { readonly type: 'image'; readonly accept?: readonly string[]; readonly maxSize?: number; readonly dimensions?: ImageDimensions };

/**
 * Image dimension constraints.
 */
export interface ImageDimensions {
  readonly minWidth?: number;
  readonly maxWidth?: number;
  readonly minHeight?: number;
  readonly maxHeight?: number;
}

/**
 * Option for enum-like properties.
 */
export interface OptionConfig {
  /** Value stored in database */
  readonly value: string;

  /** Display label */
  readonly label: string;

  /** Color for badges/chips */
  readonly color?: string;

  /** Icon */
  readonly icon?: string;

  /** Description */
  readonly description?: string;
}

/**
 * Property validation rules.
 */
export interface PropertyValidation {
  /** Regex pattern (for text) */
  readonly pattern?: string;

  /** Custom error message for pattern */
  readonly patternMessage?: string;

  /** Min length (for text/list) */
  readonly minLength?: number;

  /** Max length (for text/list) */
  readonly maxLength?: number;

  /** Min value (for number) */
  readonly min?: number;

  /** Max value (for number) */
  readonly max?: number;

  /** Custom validator expression */
  readonly custom?: string;

  /** Custom validator error message */
  readonly customMessage?: string;
}

/**
 * Lifecycle state machine configuration.
 */
export interface LifecycleConfig {
  /** Property that holds the state (defaults to 'status') */
  readonly stateProperty?: string;

  /** Available states */
  readonly states: readonly LifecycleState[];

  /** Allowed transitions */
  readonly transitions: readonly LifecycleTransition[];

  /** Initial state for new entities */
  readonly initialState: string;
}

/**
 * A state in the lifecycle.
 */
export interface LifecycleState {
  /** State value */
  readonly value: string;

  /** Display label */
  readonly label: string;

  /** Color for UI */
  readonly color?: string;

  /** Icon */
  readonly icon?: string;

  /** Whether entities in this state are editable */
  readonly editable?: boolean;

  /** Whether entities in this state can be deleted */
  readonly deletable?: boolean;
}

/**
 * A transition between states.
 */
export interface LifecycleTransition {
  /** Source state */
  readonly from: string | readonly string[];

  /** Target state */
  readonly to: string;

  /** Action name (for UI button) */
  readonly action: string;

  /** Display label */
  readonly label?: string;

  /** Required permission */
  readonly permission?: string;

  /** Condition expression (must be true to transition) */
  readonly when?: string;

  /** Actions to run on transition */
  readonly onTransition?: readonly TransitionAction[];
}

/**
 * Action to run on state transition.
 */
export interface TransitionAction {
  /** Action type */
  readonly type: 'set-property' | 'emit-event' | 'call-webhook' | 'send-notification';

  /** Action-specific configuration */
  readonly config: Readonly<Record<string, unknown>>;
}

/**
 * Computed property using expression.
 */
export interface ComputedPropertyConfig {
  /** Property name */
  readonly name: string;

  /** Display label */
  readonly label?: string;

  /** Expression to compute value */
  readonly expression: string;

  /** Result dimension (for numbers) */
  readonly dimension?: DimensionType;

  /** Result unit (for numbers) */
  readonly unit?: string;

  /** Description */
  readonly description?: string;

  /** Dependencies (auto-detected if not specified) */
  readonly dependencies?: readonly string[];
}

/**
 * Index configuration for performance.
 */
export interface IndexConfig {
  /** Index name */
  readonly name: string;

  /** Properties to index */
  readonly properties: readonly string[];

  /** Whether this is a unique index */
  readonly unique?: boolean;

  /** Partial index condition */
  readonly where?: string;
}

/**
 * UI configuration for entity type.
 */
export interface EntityUIConfig {
  /** Property to use as display name */
  readonly displayProperty?: string;

  /** Properties to show in list views */
  readonly listProperties?: readonly string[];

  /** Properties to show in search results */
  readonly searchProperties?: readonly string[];

  /** Property groupings for forms */
  readonly groups?: readonly PropertyGroup[];
}

/**
 * Property group for form layout.
 */
export interface PropertyGroup {
  /** Group name */
  readonly name: string;

  /** Group label */
  readonly label: string;

  /** Properties in this group */
  readonly properties: readonly string[];

  /** Whether collapsed by default */
  readonly collapsed?: boolean;
}

/**
 * UI configuration for a property.
 */
export interface PropertyUIConfig {
  /** Widget type override */
  readonly widget?: string;

  /** Placeholder text */
  readonly placeholder?: string;

  /** Help text shown below input */
  readonly helpText?: string;

  /** Whether to hide in list views */
  readonly hideInList?: boolean;

  /** Whether to hide in forms */
  readonly hideInForm?: boolean;

  /** Display width (columns) */
  readonly width?: number;
}

// =============================================================================
// 3. VIEW DEFINITION
// =============================================================================

/**
 * Route pattern with parameters.
 */
export type RoutePattern = string;

/**
 * View definition - a screen/page in the product.
 */
export interface ViewConfig {
  /** View identifier */
  readonly id: ViewId;

  /** Display name */
  readonly name: string;

  /** Description */
  readonly description?: string;

  /** Route pattern for this view */
  readonly route: RoutePattern;

  /** Layout definition */
  readonly layout: LayoutConfig;

  /** View-level data bindings */
  readonly data?: ViewDataConfig;

  /** Wiring between blocks in this view */
  readonly wiring?: readonly WiringConfig[];

  /** View-level permissions */
  readonly permissions?: ViewPermissions;

  /** Page metadata */
  readonly meta?: ViewMeta;
}

/**
 * View data configuration - how the view gets its data.
 */
export interface ViewDataConfig {
  /** Route parameters schema */
  readonly params?: Readonly<Record<string, ParamConfig>>;

  /** Query parameters schema */
  readonly query?: Readonly<Record<string, QueryParamConfig>>;

  /** Data queries to run on view load */
  readonly queries?: Readonly<Record<string, ViewQueryConfig>>;

  /** Computed values from params/queries */
  readonly computed?: Readonly<Record<string, string>>;
}

/**
 * Route parameter configuration.
 */
export interface ParamConfig {
  /** Parameter type */
  readonly type: 'entityId' | 'string' | 'number';

  /** Entity type (if type is 'entityId') */
  readonly entityType?: string;

  /** Whether to fetch the entity */
  readonly fetch?: boolean;

  /** Alias for the fetched entity in scope */
  readonly as?: string;
}

/**
 * Query parameter configuration.
 */
export interface QueryParamConfig {
  /** Parameter type */
  readonly type: 'string' | 'number' | 'boolean' | 'array';

  /** Default value */
  readonly default?: unknown;

  /** Whether parameter is required */
  readonly required?: boolean;

  /** Enum values (if constrained) */
  readonly enum?: readonly string[];
}

/**
 * Query configuration for loading data.
 */
export interface ViewQueryConfig {
  /** Entity type to query */
  readonly entityType: string;

  /** Filter expression */
  readonly filter?: string;

  /** Sort specification */
  readonly sort?: readonly SortSpec[];

  /** Relationships to include */
  readonly include?: readonly string[];

  /** Pagination */
  readonly limit?: number;
}

/**
 * Sort specification.
 */
export interface SortSpec {
  readonly property: string;
  readonly direction: 'asc' | 'desc';
}

/**
 * Layout configuration - how blocks are arranged.
 */
export type LayoutConfig =
  | SingleLayout
  | SplitLayout
  | TabsLayout
  | GridLayout
  | StackLayout;

/**
 * Single block layout.
 */
export interface SingleLayout {
  readonly type: 'single';
  readonly block: BlockPlacement;
}

/**
 * Split panel layout.
 */
export interface SplitLayout {
  readonly type: 'split';
  readonly direction: 'horizontal' | 'vertical';
  /** Sizes as percentages or pixels (e.g., [60, 40] or ["300px", "auto"]) */
  readonly sizes?: readonly (number | string)[];
  /** Whether panels are resizable */
  readonly resizable?: boolean;
  /** Minimum sizes for each panel */
  readonly minSizes?: readonly (number | string)[];
  /** Panel definitions */
  readonly panels: readonly PanelConfig[];
}

/**
 * Tab layout.
 */
export interface TabsLayout {
  readonly type: 'tabs';
  /** Tab position */
  readonly position?: 'top' | 'bottom' | 'left' | 'right';
  /** Default active tab index */
  readonly defaultTab?: number;
  /** Tab definitions */
  readonly tabs: readonly TabConfig[];
}

/**
 * Grid layout.
 */
export interface GridLayout {
  readonly type: 'grid';
  /** Number of columns */
  readonly columns: number;
  /** Gap between cells */
  readonly gap?: string;
  /** Row definitions */
  readonly rows: readonly GridRowConfig[];
}

/**
 * Stack layout (vertical or horizontal list of blocks).
 */
export interface StackLayout {
  readonly type: 'stack';
  readonly direction?: 'vertical' | 'horizontal';
  readonly gap?: string;
  readonly blocks: readonly BlockPlacement[];
}

/**
 * Panel in a split layout.
 */
export interface PanelConfig {
  /** Panel ID (for targeting in wiring) */
  readonly id?: string;
  /** Blocks in this panel */
  readonly blocks?: readonly BlockPlacement[];
  /** Nested layout (instead of blocks) */
  readonly layout?: LayoutConfig;
}

/**
 * Tab in a tabs layout.
 */
export interface TabConfig {
  /** Tab identifier */
  readonly id?: string;
  /** Tab label */
  readonly label: string;
  /** Tab icon */
  readonly icon?: string;
  /** Badge value or expression */
  readonly badge?: string | number;
  /** Condition for showing this tab */
  readonly showWhen?: string;
  /** Block(s) in this tab */
  readonly block?: BlockPlacement;
  readonly blocks?: readonly BlockPlacement[];
  /** Nested layout (instead of blocks) */
  readonly layout?: LayoutConfig;
}

/**
 * Grid row configuration.
 */
export interface GridRowConfig {
  /** Row height */
  readonly height?: string;
  /** Cells in this row */
  readonly cells: readonly GridCellConfig[];
}

/**
 * Grid cell configuration.
 */
export interface GridCellConfig {
  /** Column span */
  readonly colspan?: number;
  /** Row span */
  readonly rowspan?: number;
  /** Block in this cell */
  readonly block?: BlockPlacement;
  /** Nested layout */
  readonly layout?: LayoutConfig;
}

/**
 * Block placement within a layout.
 */
export interface BlockPlacement {
  /** Block type (from block registry) */
  readonly type: BlockType;

  /** Instance ID (for wiring) */
  readonly id?: BlockInstanceId;

  /** Block props */
  readonly props: Readonly<Record<string, PropValue | DataBinding>>;

  /** Slot contents */
  readonly slots?: Readonly<Record<string, readonly BlockPlacement[]>>;

  /** Condition for showing this block */
  readonly showWhen?: string;
}

/**
 * Data binding expression.
 * Syntax: $scope.path or ${expression}
 */
export type DataBinding = string;

/**
 * View permissions.
 */
export interface ViewPermissions {
  /** Permission required to access this view */
  readonly access?: string;

  /** Permission required for specific actions */
  readonly actions?: Readonly<Record<string, string>>;
}

/**
 * Page metadata.
 */
export interface ViewMeta {
  /** Page title (supports templates) */
  readonly title?: string;

  /** Meta description */
  readonly description?: string;

  /** Whether to show in browser history */
  readonly history?: boolean;
}

// =============================================================================
// 4. NAVIGATION
// =============================================================================

/**
 * Navigation configuration for the product.
 */
export interface NavigationConfig {
  /** Navigation sections */
  readonly sections: readonly NavSection[];

  /** Breadcrumb configuration */
  readonly breadcrumbs?: BreadcrumbConfig;

  /** Quick actions (global shortcuts) */
  readonly quickActions?: readonly QuickAction[];

  /** Search configuration */
  readonly search?: SearchConfig;
}

/**
 * Navigation section (group of items).
 */
export interface NavSection {
  /** Section identifier */
  readonly id?: string;

  /** Section label (null for ungrouped items) */
  readonly label?: string;

  /** Whether section is collapsible */
  readonly collapsible?: boolean;

  /** Whether collapsed by default */
  readonly collapsed?: boolean;

  /** Condition for showing this section */
  readonly showWhen?: string;

  /** Permission required to see this section */
  readonly permission?: string;

  /** Items in this section */
  readonly items: readonly NavItem[];
}

/**
 * Navigation item.
 */
export interface NavItem {
  /** Item identifier */
  readonly id: string;

  /** Display label */
  readonly label: string;

  /** Icon */
  readonly icon?: string;

  /** Target view ID */
  readonly view?: ViewId;

  /** External URL (mutually exclusive with view) */
  readonly href?: string;

  /** Badge configuration */
  readonly badge?: NavBadge;

  /** Condition for showing this item */
  readonly showWhen?: string;

  /** Permission required */
  readonly permission?: string;

  /** Nested items (sub-menu) */
  readonly children?: readonly NavItem[];

  /** Whether item is active for routes matching prefix */
  readonly activeOnPrefix?: boolean;

  /** Additional routes that mark this item active */
  readonly activeRoutes?: readonly string[];
}

/**
 * Navigation badge.
 */
export interface NavBadge {
  /** Badge type */
  readonly type: 'count' | 'dot' | 'text';

  /** Value (expression for count, static for text) */
  readonly value?: string | number;

  /** Query to get count */
  readonly query?: {
    readonly entityType: string;
    readonly filter?: string;
  };

  /** Color */
  readonly color?: 'default' | 'primary' | 'success' | 'warning' | 'error';

  /** Max value to show (shows "99+" if exceeded) */
  readonly max?: number;
}

/**
 * Breadcrumb configuration.
 */
export interface BreadcrumbConfig {
  /** Whether to show home link */
  readonly showHome?: boolean;

  /** Home link label */
  readonly homeLabel?: string;

  /** View-specific breadcrumb overrides */
  readonly overrides?: Readonly<Record<ViewId, BreadcrumbOverride>>;
}

/**
 * Breadcrumb override for a specific view.
 */
export interface BreadcrumbOverride {
  /** Static crumbs to prepend */
  readonly prepend?: readonly BreadcrumbItem[];

  /** Custom crumbs (replaces auto-generated) */
  readonly items?: readonly BreadcrumbItem[];
}

/**
 * A breadcrumb item.
 */
export interface BreadcrumbItem {
  /** Label (supports templates) */
  readonly label: string;

  /** View to link to */
  readonly view?: ViewId;

  /** View params */
  readonly params?: Readonly<Record<string, string>>;

  /** External href */
  readonly href?: string;
}

/**
 * Quick action (global shortcut).
 */
export interface QuickAction {
  /** Action identifier */
  readonly id: string;

  /** Display label */
  readonly label: string;

  /** Icon */
  readonly icon: string;

  /** Keyboard shortcut */
  readonly shortcut?: string;

  /** Action type */
  readonly action: QuickActionType;

  /** Permission required */
  readonly permission?: string;

  /** Condition for availability */
  readonly showWhen?: string;
}

/**
 * Quick action type.
 */
export type QuickActionType =
  | { readonly type: 'navigate'; readonly view: ViewId; readonly params?: Readonly<Record<string, string>> }
  | { readonly type: 'create'; readonly entityType: string }
  | { readonly type: 'search'; readonly scope?: string }
  | { readonly type: 'command'; readonly command: string };

/**
 * Global search configuration.
 */
export interface SearchConfig {
  /** Entity types to include in search */
  readonly entityTypes: readonly SearchEntityConfig[];

  /** Keyboard shortcut to focus search */
  readonly shortcut?: string;

  /** Placeholder text */
  readonly placeholder?: string;

  /** Recent searches count */
  readonly recentCount?: number;
}

/**
 * Search configuration for an entity type.
 */
export interface SearchEntityConfig {
  /** Entity type */
  readonly entityType: string;

  /** Properties to search */
  readonly searchProperties: readonly string[];

  /** Properties to display in results */
  readonly displayProperties: readonly string[];

  /** View to navigate to on selection */
  readonly targetView: ViewId;

  /** Param name for entity ID */
  readonly paramName?: string;
}

// =============================================================================
// 5. PRODUCT-LEVEL WIRING
// =============================================================================

/**
 * Product-level wiring configuration.
 */
export interface ProductWiringConfig {
  /** Cross-view navigation wiring */
  readonly navigation?: readonly NavigationWiring[];

  /** Global event handlers */
  readonly globalHandlers?: readonly GlobalEventHandler[];

  /** View lifecycle hooks */
  readonly viewHooks?: readonly ViewHookConfig[];
}

/**
 * Navigation wiring - events that trigger view navigation.
 */
export interface NavigationWiring {
  /** Source: which view and block */
  readonly source: WiringSource;

  /** Event that triggers navigation */
  readonly event: string;

  /** Target view */
  readonly targetView: ViewId;

  /** How to build route params from event payload */
  readonly params?: Readonly<Record<string, string>>;

  /** How to build query params from event payload */
  readonly query?: Readonly<Record<string, string>>;

  /** Navigation mode */
  readonly mode?: 'push' | 'replace';

  /** Condition for this wiring */
  readonly when?: string;
}

/**
 * Source specification for wiring.
 */
export interface WiringSource {
  /** View ID (or '*' for any view) */
  readonly view: ViewId | '*';

  /** Block instance ID (or '*' for any block of type) */
  readonly block: BlockInstanceId | '*';

  /** Block type (when block is '*') */
  readonly blockType?: BlockType;
}

/**
 * Global event handler - runs for events across all views.
 */
export interface GlobalEventHandler {
  /** Handler identifier */
  readonly id: string;

  /** Description */
  readonly description?: string;

  /** Event source pattern */
  readonly source: WiringSource;

  /** Event name pattern (supports wildcards) */
  readonly event: string | readonly string[];

  /** Handler actions */
  readonly actions: readonly GlobalAction[];

  /** Condition for this handler */
  readonly when?: string;

  /** Whether to prevent default handling */
  readonly preventDefault?: boolean;
}

/**
 * Global action types.
 */
export type GlobalAction =
  | { readonly type: 'analytics'; readonly event: string; readonly properties?: Readonly<Record<string, string>> }
  | { readonly type: 'notification'; readonly message: string; readonly level?: 'info' | 'success' | 'warning' | 'error' }
  | { readonly type: 'webhook'; readonly url: string; readonly method?: string; readonly payload?: Readonly<Record<string, string>> }
  | { readonly type: 'emit'; readonly event: string; readonly payload?: Readonly<Record<string, string>> }
  | { readonly type: 'log'; readonly level?: 'debug' | 'info' | 'warn' | 'error'; readonly message: string }
  | { readonly type: 'refresh'; readonly target: 'view' | 'block'; readonly blockId?: string };

/**
 * View lifecycle hook configuration.
 */
export interface ViewHookConfig {
  /** View ID (or '*' for all views) */
  readonly view: ViewId | '*';

  /** Lifecycle event */
  readonly lifecycle: 'enter' | 'leave' | 'update';

  /** Actions to run */
  readonly actions: readonly GlobalAction[];

  /** Condition */
  readonly when?: string;
}

// =============================================================================
// 6. VIEW-LEVEL WIRING
// =============================================================================

/**
 * Wiring configuration between blocks.
 */
export interface WiringConfig {
  /** Source block instance ID or special target */
  readonly from: BlockInstanceId | '$navigate' | '$system';

  /** Event name on source block */
  readonly event: string;

  /** Target block instance ID or special target */
  readonly to: BlockInstanceId | '$navigate' | '$system';

  /** Receiver name on target block */
  readonly receiver: string;

  /** Optional payload transformation */
  readonly transform?: TransformConfig;

  /** Conditional: only fire if condition is true */
  readonly condition?: string;
}

/**
 * Transform configuration for payload.
 */
export type TransformConfig =
  | { readonly kind: 'identity' }
  | { readonly kind: 'pick'; readonly fields: readonly string[] }
  | { readonly kind: 'rename'; readonly mapping: Readonly<Record<string, string>> }
  | { readonly kind: 'expression'; readonly expr: string };

// =============================================================================
// 7. VALIDATION
// =============================================================================

/**
 * Product error category.
 */
export type ProductErrorCategory =
  | 'manifest-invalid'
  | 'entity-invalid'
  | 'view-invalid'
  | 'navigation-invalid'
  | 'wiring-invalid'
  | 'permission-invalid'
  | 'reference-broken'
  | 'circular-dependency'
  | 'type-mismatch'
  | 'missing-required';

/**
 * Product validation error.
 */
export interface ProductValidationError {
  readonly category: ProductErrorCategory;
  readonly code: string;
  readonly message: string;
  readonly path: readonly string[];
  readonly value: unknown;
  readonly expected: string;
  readonly suggestions: readonly string[];
  readonly location?: {
    readonly file: string;
    readonly line: number;
    readonly column: number;
  };
  readonly docsUrl?: string;
}

/**
 * Product validation warning.
 */
export interface ProductValidationWarning {
  readonly code: string;
  readonly message: string;
  readonly path: readonly string[];
  readonly suggestion?: string;
}

/**
 * Product validation result.
 */
export interface ProductValidationResult {
  readonly valid: boolean;
  readonly productId: ProductId;
  readonly errors: readonly ProductValidationError[];
  readonly warnings: readonly ProductValidationWarning[];
  readonly byCategory: {
    readonly manifest: { readonly errors: readonly ProductValidationError[]; readonly warnings: readonly ProductValidationWarning[] };
    readonly entities: { readonly errors: readonly ProductValidationError[]; readonly warnings: readonly ProductValidationWarning[] };
    readonly views: { readonly errors: readonly ProductValidationError[]; readonly warnings: readonly ProductValidationWarning[] };
    readonly navigation: { readonly errors: readonly ProductValidationError[]; readonly warnings: readonly ProductValidationWarning[] };
    readonly wiring: { readonly errors: readonly ProductValidationError[]; readonly warnings: readonly ProductValidationWarning[] };
    readonly permissions: { readonly errors: readonly ProductValidationError[]; readonly warnings: readonly ProductValidationWarning[] };
  };
  readonly errorCount: number;
  readonly warningCount: number;
}

// =============================================================================
// 8. FULLY LOADED PRODUCT
// =============================================================================

/**
 * A fully loaded and validated product configuration.
 */
export interface ProductConfig {
  /** Product manifest */
  readonly manifest: ProductManifest;

  /** Entity type configurations */
  readonly entities: Readonly<Record<string, EntityTypeConfig>>;

  /** View configurations */
  readonly views: Readonly<Record<ViewId, ViewConfig>>;

  /** Navigation configuration */
  readonly navigation?: NavigationConfig;

  /** Product-level wiring */
  readonly wiring?: ProductWiringConfig;

  /** Base product (if extends) */
  readonly baseProduct?: ProductConfig;
}
