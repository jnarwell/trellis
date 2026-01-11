/**
 * Trellis Server Configuration - Public Exports
 *
 * Re-exports all configuration types, loaders, and validators.
 */

// Database configuration
export type { DatabaseConfig } from './database.js';
export { loadDatabaseConfig } from './database.js';

// Server configuration
export type { ServerConfig } from './server.js';
export { loadServerConfig } from './server.js';

// Product configuration types
export type {
  // Branded types
  ProductId,
  ViewId,

  // Product manifest
  ProductManifest,
  ProductRequirements,
  ProductSettings,
  ProductIncludes,
  ThemeConfig,
  BrandingConfig,
  AnalyticsConfig,

  // Entity types
  DimensionType,
  EntityTypeConfig,
  PropertyConfig,
  PropertyTypeConfig,
  ImageDimensions,
  OptionConfig,
  PropertyValidation,
  LifecycleConfig,
  LifecycleState,
  LifecycleTransition,
  TransitionAction,
  ComputedPropertyConfig,
  IndexConfig,
  EntityUIConfig,
  PropertyGroup,
  PropertyUIConfig,

  // View types
  RoutePattern,
  ViewConfig,
  ViewDataConfig,
  ParamConfig,
  QueryParamConfig,
  ViewQueryConfig,
  SortSpec,
  LayoutConfig,
  SingleLayout,
  SplitLayout,
  TabsLayout,
  GridLayout,
  StackLayout,
  PanelConfig,
  TabConfig,
  GridRowConfig,
  GridCellConfig,
  BlockPlacement,
  DataBinding,
  ViewPermissions,
  ViewMeta,

  // Navigation types
  NavigationConfig,
  NavSection,
  NavItem,
  NavBadge,
  BreadcrumbConfig,
  BreadcrumbOverride,
  BreadcrumbItem,
  QuickAction,
  QuickActionType,
  SearchConfig,
  SearchEntityConfig,

  // Product wiring types
  ProductWiringConfig,
  NavigationWiring,
  WiringSource,
  GlobalEventHandler,
  GlobalAction,
  ViewHookConfig,

  // View wiring types
  WiringConfig,
  TransformConfig,

  // Validation types
  ProductErrorCategory,
  ProductValidationError,
  ProductValidationWarning,
  ProductValidationResult,

  // Full product
  ProductConfig,
} from './types.js';

// Loader
export {
  loadProduct,
  loadYamlFile,
  parseYaml,
  YamlParseError,
  asProductId,
  asViewId,
  type LoadOptions,
  type YamlLoadResult,
} from './loader.js';

// Validator
export {
  validateProduct,
  createEntityRegistryFromConfig,
  type ProductValidationContext,
} from './validator.js';
