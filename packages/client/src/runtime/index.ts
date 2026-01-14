/**
 * Trellis Block Runtime - Public Exports
 *
 * Re-exports wiring, navigation, and block rendering utilities.
 */

// Wiring
export type {
  BlockEvent,
  EventReceiver,
  NavigationActions,
  WiringConnection,
} from './wiring.js';

export {
  WiringManager,
  createWiringManager,
} from './wiring.js';

// Navigation (core utilities)
export type {
  ParsedRoute,
  RouteSegment,
  RouteMatch,
  NavigationState,
  NavigationListener,
} from './navigation.js';

export {
  parseRoutePattern,
  matchRoute,
  buildPath,
  parseQueryString,
  buildQueryString,
  NavigationManager,
  createNavigationManager,
} from './navigation.js';

// Navigation Provider (React components)
export {
  NavigationProvider,
  useNavigation,
  useNavigationState,
  useRouteParams,
  useRouteQuery,
  useCurrentViewId,
  Link,
  NavLink,
} from './NavigationProvider.js';

export type {
  NavigationContextValue,
  NavigationProviderProps,
  LinkProps,
  NavLinkProps,
} from './NavigationProvider.js';

// Block Renderer (utilities)
export type {
  BlockInstance,
  BlockSpecRegistry,
} from './block-renderer.js';

export {
  resolveBlock,
  getVisibleBlocks,
  findBlockById,
  getAllBlockIds,
} from './block-renderer.js';

// View Renderer
export { ViewRenderer, SingleViewRenderer } from './ViewRenderer.js';

export type {
  ViewConfig,
  ViewRendererProps,
  SingleViewRendererProps,
} from './ViewRenderer.js';

// Product App
export {
  ProductApp,
  MinimalLayout,
  StandaloneView,
} from './ProductApp.js';

export type {
  ProductConfig,
  ProductAppProps,
  NavigationItem,
  LayoutProps,
  StandaloneViewProps,
} from './ProductApp.js';

// Layout Renderer
export { LayoutRenderer } from './LayoutRenderer.js';

export type {
  LayoutConfig,
  BlockPlacement,
  SingleLayout,
  SplitLayout,
  StackLayout,
  TabsLayout,
  GridLayout,
  LayoutRendererProps,
} from './LayoutRenderer.js';

// Product Config Loader
export {
  ConfigLoaderProvider,
  useConfigLoader,
  useProductConfig,
  ProductConfigWrapper,
  normalizeProductConfig,
} from './ProductConfigLoader.js';

export type {
  LoadedProductConfig,
  EntityTypeConfig,
  PropertyConfig,
  ViewConfig as LoadedViewConfig,
  NavigationConfig,
  NavItemConfig,
  WiringConfig as LoadedWiringConfig,
  ThemeConfig,
  ConfigLoadingState,
  ConfigLoaderContextValue,
  ConfigLoaderProviderProps,
  ProductConfigWrapperProps,
} from './ProductConfigLoader.js';

// Dynamic Product App
export {
  DynamicProductApp,
  DefaultLayout,
  DefaultLoading,
  DefaultError,
} from './DynamicProductApp.js';

export type {
  DynamicProductAppProps,
} from './DynamicProductApp.js';
