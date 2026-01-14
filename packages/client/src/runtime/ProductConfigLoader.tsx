/**
 * Trellis ProductConfigLoader
 *
 * Loads product configurations from the server.
 * The server parses YAML and returns JSON.
 *
 * This provides:
 * - Dynamic product loading at runtime
 * - Caching of loaded configs
 * - Loading states and error handling
 * - React hooks for easy integration
 */

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useMemo,
  useCallback,
  type ReactNode,
} from 'react';

// =============================================================================
// TYPES
// =============================================================================

/**
 * Product configuration (JSON format from server).
 * This matches the server's ProductConfig after YAML parsing.
 */
export interface LoadedProductConfig {
  /** Product name */
  readonly name: string;

  /** Product version */
  readonly version: string;

  /** Product description */
  readonly description?: string;

  /** Default view ID */
  readonly defaultView: string;

  /** Entity type definitions */
  readonly entities?: readonly EntityTypeConfig[];

  /** View definitions */
  readonly views: readonly ViewConfig[];

  /** Navigation configuration */
  readonly navigation?: NavigationConfig;

  /** Wiring configuration */
  readonly wiring?: readonly WiringConfig[];

  /** Theme settings */
  readonly theme?: ThemeConfig;
}

/**
 * Entity type from config.
 */
export interface EntityTypeConfig {
  readonly id: string;
  readonly name: string;
  readonly description?: string;
  readonly icon?: string;
  readonly properties: readonly PropertyConfig[];
}

/**
 * Property definition.
 */
export interface PropertyConfig {
  readonly name: string;
  readonly type: string;
  readonly required?: boolean;
  readonly default?: unknown;
  readonly description?: string;
}

/**
 * View configuration.
 */
export interface ViewConfig {
  readonly id: string;
  readonly name: string;
  readonly description?: string;
  readonly icon?: string;
  readonly route: string;
  readonly layout: LayoutConfig;
  readonly wiring?: readonly WiringConfig[];
}

/**
 * Layout configuration (union of layout types).
 */
export interface LayoutConfig {
  readonly type: 'single' | 'split' | 'stack' | 'tabs' | 'grid';
  readonly [key: string]: unknown;
}

/**
 * Navigation configuration.
 */
export interface NavigationConfig {
  readonly items: readonly NavItemConfig[];
}

/**
 * Navigation item.
 */
export interface NavItemConfig {
  readonly label: string;
  readonly view?: string;
  readonly icon?: string;
  readonly children?: readonly NavItemConfig[];
}

/**
 * Wiring configuration.
 */
export interface WiringConfig {
  readonly from: string;
  readonly event: string;
  readonly to?: string;
  readonly action?: string;
  readonly receiver?: string;
  readonly transform?: unknown;
}

/**
 * Theme configuration.
 */
export interface ThemeConfig {
  readonly primaryColor?: string;
  readonly colorMode?: 'light' | 'dark' | 'system';
}

/**
 * Loading state for a product config.
 */
export type ConfigLoadingState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; config: LoadedProductConfig }
  | { status: 'error'; error: Error };

/**
 * Config loader context value.
 */
export interface ConfigLoaderContextValue {
  /** Load a product config by ID */
  loadConfig: (productId: string) => Promise<LoadedProductConfig>;

  /** Get loading state for a product */
  getState: (productId: string) => ConfigLoadingState;

  /** Clear cached config */
  clearCache: (productId?: string) => void;

  /** Base URL for config API */
  baseUrl: string;
}

// =============================================================================
// CONTEXT
// =============================================================================

const ConfigLoaderContext = createContext<ConfigLoaderContextValue | null>(null);

/**
 * Hook to access config loader.
 */
export function useConfigLoader(): ConfigLoaderContextValue {
  const context = useContext(ConfigLoaderContext);
  if (!context) {
    throw new Error('useConfigLoader must be used within ConfigLoaderProvider');
  }
  return context;
}

// =============================================================================
// PROVIDER
// =============================================================================

/**
 * Props for ConfigLoaderProvider.
 */
export interface ConfigLoaderProviderProps {
  /** Base URL for config API (default: '/api/config/products') */
  baseUrl?: string;

  /** Children */
  children: ReactNode;
}

/**
 * Provider for product config loading.
 */
export function ConfigLoaderProvider({
  baseUrl = '/api/config/products',
  children,
}: ConfigLoaderProviderProps): React.ReactElement {
  // Cache of loaded configs
  const [cache, setCache] = useState<Map<string, ConfigLoadingState>>(new Map());

  // Load a product config
  const loadConfig = useCallback(
    async (productId: string): Promise<LoadedProductConfig> => {
      // Check cache first
      const cached = cache.get(productId);
      if (cached?.status === 'success') {
        return cached.config;
      }

      // Set loading state
      setCache((prev) => {
        const next = new Map(prev);
        next.set(productId, { status: 'loading' });
        return next;
      });

      try {
        // Fetch from server
        const response = await fetch(`${baseUrl}/${productId}`);

        if (!response.ok) {
          throw new Error(
            `Failed to load product config: ${response.status} ${response.statusText}`
          );
        }

        const config = (await response.json()) as LoadedProductConfig;

        // Cache success
        setCache((prev) => {
          const next = new Map(prev);
          next.set(productId, { status: 'success', config });
          return next;
        });

        return config;
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));

        // Cache error
        setCache((prev) => {
          const next = new Map(prev);
          next.set(productId, { status: 'error', error });
          return next;
        });

        throw error;
      }
    },
    [baseUrl, cache]
  );

  // Get loading state
  const getState = useCallback(
    (productId: string): ConfigLoadingState => {
      return cache.get(productId) ?? { status: 'idle' };
    },
    [cache]
  );

  // Clear cache
  const clearCache = useCallback((productId?: string) => {
    if (productId) {
      setCache((prev) => {
        const next = new Map(prev);
        next.delete(productId);
        return next;
      });
    } else {
      setCache(new Map());
    }
  }, []);

  const value = useMemo<ConfigLoaderContextValue>(
    () => ({
      loadConfig,
      getState,
      clearCache,
      baseUrl,
    }),
    [loadConfig, getState, clearCache, baseUrl]
  );

  return (
    <ConfigLoaderContext.Provider value={value}>
      {children}
    </ConfigLoaderContext.Provider>
  );
}

// =============================================================================
// HOOKS
// =============================================================================

/**
 * Hook to load and use a product config.
 */
export function useProductConfig(productId: string): {
  config: LoadedProductConfig | null;
  loading: boolean;
  error: Error | null;
  reload: () => void;
} {
  const { loadConfig, getState, clearCache } = useConfigLoader();
  const state = getState(productId);

  // Trigger load on mount
  useEffect(() => {
    if (state.status === 'idle') {
      loadConfig(productId).catch(() => {
        // Error is captured in state
      });
    }
  }, [productId, state.status, loadConfig]);

  // Reload function
  const reload = useCallback(() => {
    clearCache(productId);
    loadConfig(productId).catch(() => {
      // Error is captured in state
    });
  }, [productId, clearCache, loadConfig]);

  return {
    config: state.status === 'success' ? state.config : null,
    loading: state.status === 'loading',
    error: state.status === 'error' ? state.error : null,
    reload,
  };
}

// =============================================================================
// LOADING COMPONENT
// =============================================================================

/**
 * Default loading component.
 */
function DefaultLoading(): React.ReactElement {
  return (
    <div style={configLoadingStyle}>
      <div style={configSpinnerStyle} />
      <span>Loading product configuration...</span>
    </div>
  );
}

/**
 * Default error component.
 */
function DefaultError({
  error,
  onRetry,
}: {
  error: Error;
  onRetry: () => void;
}): React.ReactElement {
  return (
    <div style={configErrorStyle}>
      <h2 style={configErrorTitleStyle}>Failed to load configuration</h2>
      <p style={configErrorMessageStyle}>{error.message}</p>
      <button type="button" style={configRetryButtonStyle} onClick={onRetry}>
        Retry
      </button>
    </div>
  );
}

// =============================================================================
// CONFIG WRAPPER
// =============================================================================

/**
 * Props for ProductConfigWrapper.
 */
export interface ProductConfigWrapperProps {
  /** Product ID to load */
  productId: string;

  /** Render function when config is loaded */
  children: (config: LoadedProductConfig) => React.ReactNode;

  /** Custom loading component */
  LoadingComponent?: React.ComponentType;

  /** Custom error component */
  ErrorComponent?: React.ComponentType<{ error: Error; onRetry: () => void }>;
}

/**
 * Wrapper that loads a product config and renders children when ready.
 */
export function ProductConfigWrapper({
  productId,
  children,
  LoadingComponent = DefaultLoading,
  ErrorComponent = DefaultError,
}: ProductConfigWrapperProps): React.ReactElement {
  const { config, loading, error, reload } = useProductConfig(productId);

  if (loading) {
    return <LoadingComponent />;
  }

  if (error) {
    return <ErrorComponent error={error} onRetry={reload} />;
  }

  if (!config) {
    return <LoadingComponent />;
  }

  return <>{children(config)}</>;
}

// =============================================================================
// STYLES (typed explicitly to avoid index signature issues)
// =============================================================================

const configLoadingStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  minHeight: '200px',
  gap: '1rem',
  color: '#6b7280',
};

const configSpinnerStyle: React.CSSProperties = {
  width: '2rem',
  height: '2rem',
  border: '2px solid #e5e7eb',
  borderTopColor: '#6366f1',
  borderRadius: '50%',
};

const configErrorStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  minHeight: '200px',
  padding: '2rem',
  textAlign: 'center',
};

const configErrorTitleStyle: React.CSSProperties = {
  fontSize: '1.25rem',
  fontWeight: 600,
  color: '#991b1b',
  marginBottom: '0.5rem',
};

const configErrorMessageStyle: React.CSSProperties = {
  color: '#6b7280',
  marginBottom: '1rem',
};

const configRetryButtonStyle: React.CSSProperties = {
  padding: '0.5rem 1rem',
  backgroundColor: '#6366f1',
  color: 'white',
  border: 'none',
  borderRadius: '0.375rem',
  cursor: 'pointer',
  fontWeight: 500,
};

// =============================================================================
// UTILITIES
// =============================================================================

/**
 * Transform Kitchen Sink YAML structure to normalized ProductConfig.
 * This handles the differences between YAML format and internal format.
 */
export function normalizeProductConfig(raw: Record<string, unknown>): LoadedProductConfig {
  const name = (raw['name'] as string) ?? 'Unnamed Product';
  const version = (raw['version'] as string) ?? '1.0.0';
  const description = raw['description'] as string | undefined;
  const defaultView = (raw['defaultView'] as string) ?? 'default';

  // Normalize entities
  const rawEntities = raw['entities'] as readonly Record<string, unknown>[] | undefined;
  const entities = rawEntities?.map(normalizeEntityType);

  // Normalize views
  const rawViews = raw['views'] as readonly Record<string, unknown>[] | undefined;
  const views = rawViews?.map(normalizeViewConfig) ?? [];

  // Normalize navigation
  const rawNav = raw['navigation'] as Record<string, unknown> | undefined;
  const navigation = rawNav ? normalizeNavigationConfig(rawNav) : undefined;

  // Normalize wiring
  const rawWiring = raw['wiring'] as readonly Record<string, unknown>[] | undefined;
  const wiring = rawWiring?.map(normalizeWiringConfig);

  // Use conditional spread for exactOptionalPropertyTypes compliance
  const result: LoadedProductConfig = {
    name,
    version,
    defaultView,
    views,
  };

  return {
    ...result,
    ...(description !== undefined && { description }),
    ...(entities !== undefined && { entities }),
    ...(navigation !== undefined && { navigation }),
    ...(wiring !== undefined && { wiring }),
  };
}

/**
 * Normalize entity type config.
 */
function normalizeEntityType(raw: Record<string, unknown>): EntityTypeConfig {
  const id = raw['id'] as string;
  const name = raw['name'] as string;
  const description = raw['description'] as string | undefined;
  const icon = raw['icon'] as string | undefined;
  const properties = ((raw['properties'] as readonly Record<string, unknown>[]) ?? []).map(
    (p) => {
      const propName = p['name'] as string;
      const propType = p['type'] as string;
      const required = p['required'] as boolean | undefined;
      const defaultVal = p['default'];
      const propDesc = p['description'] as string | undefined;

      const prop: PropertyConfig = { name: propName, type: propType };
      return {
        ...prop,
        ...(required !== undefined && { required }),
        ...(defaultVal !== undefined && { default: defaultVal }),
        ...(propDesc !== undefined && { description: propDesc }),
      };
    }
  );

  const result: EntityTypeConfig = { id, name, properties };
  return {
    ...result,
    ...(description !== undefined && { description }),
    ...(icon !== undefined && { icon }),
  };
}

/**
 * Normalize view config.
 */
function normalizeViewConfig(raw: Record<string, unknown>): ViewConfig {
  const id = raw['id'] as string;
  const name = raw['name'] as string;
  const description = raw['description'] as string | undefined;
  const icon = raw['icon'] as string | undefined;
  const route = raw['route'] as string;
  const layout = normalizeLayoutConfig(raw['layout'] as Record<string, unknown>);
  const wiring = (raw['wiring'] as readonly Record<string, unknown>[] | undefined)?.map(
    normalizeWiringConfig
  );

  const result: ViewConfig = { id, name, route, layout };
  return {
    ...result,
    ...(description !== undefined && { description }),
    ...(icon !== undefined && { icon }),
    ...(wiring !== undefined && { wiring }),
  };
}

/**
 * Normalize layout config.
 */
function normalizeLayoutConfig(raw: Record<string, unknown>): LayoutConfig {
  const type = raw['type'] as LayoutConfig['type'];

  // Handle the kitchen sink format which uses 'children' instead of 'blocks'
  if (type === 'stack') {
    const children = raw['children'] as readonly Record<string, unknown>[] | undefined;
    const blocks = children?.map(normalizeBlockPlacement);
    return {
      type,
      direction: raw['direction'] as string | undefined,
      gap: raw['gap'] as string | undefined,
      blocks,
    };
  }

  if (type === 'split') {
    const children = raw['children'] as readonly Record<string, unknown>[] | undefined;
    const panels = children?.map((child) => {
      // Each child could be a block or nested layout
      if (child['type'] === 'stack' || child['type'] === 'split' || child['type'] === 'tabs' || child['type'] === 'grid') {
        return { layout: normalizeLayoutConfig(child) };
      }
      // It's a block placement
      return { blocks: [normalizeBlockPlacement(child)] };
    });
    return {
      type,
      direction: raw['direction'] as string | undefined,
      sizes: raw['sizes'] as readonly (number | string)[] | undefined,
      panels,
    };
  }

  if (type === 'single') {
    const children = raw['children'] as readonly Record<string, unknown>[] | undefined;
    const block = children?.[0] ? normalizeBlockPlacement(children[0]) : undefined;
    return { type, block };
  }

  // Pass through other layout types as-is with normalized nested structures
  return { ...raw, type } as LayoutConfig;
}

/**
 * Normalize block placement from kitchen sink format.
 */
function normalizeBlockPlacement(raw: Record<string, unknown>): {
  type: string;
  id?: string;
  props: Record<string, unknown>;
} {
  const blockType = raw['type'] as string;
  const id = raw['id'] as string | undefined;
  const props = (raw['props'] as Record<string, unknown>) ?? {};

  return {
    type: blockType,
    ...(id !== undefined && { id }),
    props,
  };
}

/**
 * Normalize navigation config.
 */
function normalizeNavigationConfig(raw: Record<string, unknown>): NavigationConfig {
  const items = (raw['items'] as readonly Record<string, unknown>[]) ?? [];
  return {
    items: items.map((item) => {
      const label = item['label'] as string;
      const view = item['view'] as string | undefined;
      const icon = item['icon'] as string | undefined;

      const base: NavItemConfig = { label };
      return {
        ...base,
        ...(view !== undefined && { view }),
        ...(icon !== undefined && { icon }),
      };
    }),
  };
}

/**
 * Normalize wiring config.
 */
function normalizeWiringConfig(raw: Record<string, unknown>): WiringConfig {
  const from = raw['from'] as string;
  const event = raw['event'] as string;
  const to = raw['to'] as string | undefined;
  const action = raw['action'] as string | undefined;
  const receiver = raw['receiver'] as string | undefined;
  const transform = raw['transform'];

  const base: WiringConfig = { from, event };
  return {
    ...base,
    ...(to !== undefined && { to }),
    ...(action !== undefined && { action }),
    ...(receiver !== undefined && { receiver }),
    ...(transform !== undefined && { transform }),
  };
}
