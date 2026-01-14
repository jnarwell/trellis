/**
 * Trellis DynamicProductApp
 *
 * A complete application shell that loads product configuration
 * dynamically at runtime. This is the general-purpose entry point
 * for any Trellis product - no hardcoded configuration needed.
 *
 * Usage:
 *   <DynamicProductApp productId="kitchen-sink" />
 *
 * The app will:
 * 1. Fetch the product config from /api/config/products/:productId
 * 2. Initialize navigation based on the config
 * 3. Render the appropriate view/layout based on current route
 * 4. Handle all block rendering through Connected wrappers
 */

import React, { useMemo, useCallback } from 'react';
import { TrellisProvider } from '../state/store.js';
import { TrellisClient } from '../sdk/client.js';
import { createScope, extendScope } from '../binding/scope.js';
import type { BindingScope } from '../binding/index.js';
import { NavigationProvider, useNavigationState, useNavigation } from './NavigationProvider.js';
import { NavigationManager } from './navigation.js';
import { createWiringManager } from './wiring.js';
import type { WiringManager } from './wiring.js';
import { LayoutRenderer } from './LayoutRenderer.js';
import type { LayoutConfig, BlockPlacement } from './LayoutRenderer.js';
import type { WiringConfig as ServerWiringConfig } from '@trellis/server';
import {
  ConfigLoaderProvider,
  useProductConfig,
  type LoadedProductConfig,
  type ViewConfig,
  type NavItemConfig,
  type WiringConfig as ClientWiringConfig,
} from './ProductConfigLoader.js';

// =============================================================================
// TYPES
// =============================================================================

/**
 * Props for DynamicProductApp.
 */
export interface DynamicProductAppProps {
  /** Product ID to load (e.g., "kitchen-sink") */
  readonly productId: string;

  /** API base URL for Trellis server */
  readonly apiBaseUrl?: string;

  /** Config API base URL (defaults to apiBaseUrl + /config/products) */
  readonly configBaseUrl?: string;

  /** Custom loading component */
  readonly LoadingComponent?: React.ComponentType;

  /** Custom error component */
  readonly ErrorComponent?: React.ComponentType<{ error: Error; onRetry: () => void }>;

  /** Custom layout component */
  readonly LayoutComponent?: React.ComponentType<{ children: React.ReactNode; config: LoadedProductConfig }>;
}

// =============================================================================
// DEFAULT COMPONENTS
// =============================================================================

/**
 * Default loading screen.
 */
function DefaultLoading(): React.ReactElement {
  return (
    <div style={loadingContainerStyle}>
      <div style={loadingSpinnerStyle} />
      <div style={loadingTextStyle}>Loading application...</div>
    </div>
  );
}

/**
 * Default error screen.
 */
function DefaultError({
  error,
  onRetry,
}: {
  error: Error;
  onRetry: () => void;
}): React.ReactElement {
  return (
    <div style={errorContainerStyle}>
      <div style={errorIconStyle}>!</div>
      <h2 style={errorTitleStyle}>Failed to Load Application</h2>
      <p style={errorMessageStyle}>{error.message}</p>
      <button type="button" style={retryButtonStyle} onClick={onRetry}>
        Retry
      </button>
    </div>
  );
}

/**
 * Default sidebar layout.
 */
function DefaultLayout({
  children,
  config,
}: {
  children: React.ReactNode;
  config: LoadedProductConfig;
}): React.ReactElement {
  const { push } = useNavigation();
  const navState = useNavigationState();

  const handleNavClick = useCallback(
    (item: NavItemConfig) => {
      if (item.view) {
        // Find the view config to get its route
        const viewConfig = config.views.find((v) => v.id === item.view);
        if (viewConfig) {
          push(viewConfig.route);
        }
      }
    },
    [config.views, push]
  );

  // Find active nav item
  const activeViewId = navState.viewId;

  return (
    <div style={appContainerStyle}>
      {/* Sidebar */}
      <aside style={sidebarStyle}>
        <div style={sidebarHeaderStyle}>
          <h1 style={appTitleStyle}>{config.name}</h1>
          {config.version && (
            <span style={appVersionStyle}>v{config.version}</span>
          )}
        </div>

        <nav style={navStyle}>
          {config.navigation?.items.map((item, index) => {
            const isActive = item.view === activeViewId;
            return (
              <button
                key={item.view ?? `nav-${index}`}
                type="button"
                style={{
                  ...navItemStyle,
                  ...(isActive ? navItemActiveStyle : {}),
                }}
                onClick={() => handleNavClick(item)}
              >
                {item.icon && <span style={navIconStyle}>{item.icon}</span>}
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </aside>

      {/* Main content */}
      <main style={mainStyle}>{children}</main>
    </div>
  );
}

// =============================================================================
// PRODUCT RENDERER
// =============================================================================

/**
 * Internal component that renders the loaded product.
 */
function ProductRenderer({
  config,
  LayoutComponent,
}: {
  config: LoadedProductConfig;
  LayoutComponent: React.ComponentType<{ children: React.ReactNode; config: LoadedProductConfig }>;
}): React.ReactElement {
  const navState = useNavigationState();

  // Find the view config for the current route
  const currentView = useMemo((): ViewConfig | undefined => {
    // Try exact viewId match first
    if (navState.viewId) {
      const view = config.views.find((v) => v.id === navState.viewId);
      if (view) return view;
    }

    // Try route pattern matching
    for (const view of config.views) {
      if (matchRoute(view.route, navState.path)) {
        return view;
      }
    }

    // Fall back to default view
    if (config.defaultView) {
      return config.views.find((v) => v.id === config.defaultView);
    }

    // Return first view as last resort
    return config.views[0];
  }, [config.views, config.defaultView, navState.viewId, navState.path]);

  // Create wiring manager for this view
  const wiring = useMemo((): WiringManager => {
    const manager = createWiringManager();
    if (currentView?.wiring) {
      // Convert client WiringConfig to server WiringConfig format
      const serverWiring: ServerWiringConfig[] = currentView.wiring.map((w: ClientWiringConfig) => ({
        from: w.from as ServerWiringConfig['from'],
        event: w.event,
        to: (w.to ?? w.receiver ?? '$system') as ServerWiringConfig['to'],
        receiver: w.receiver ?? w.action ?? 'receive',
      }));
      manager.registerWiring(serverWiring);
    }
    return manager;
  }, [currentView?.wiring]);

  // Build binding scope
  const scope = useMemo<BindingScope>(() => {
    const baseScope = createScope({
      params: navState.params,
      query: navState.query,
    });

    return extendScope(baseScope, {
      $route: {
        params: navState.params,
        query: navState.query,
        path: navState.path,
        viewId: navState.viewId,
      },
      $view: {
        id: currentView?.id,
        name: currentView?.name,
      },
      $product: {
        id: config.name,
        version: config.version,
      },
    });
  }, [navState, currentView, config.name, config.version]);

  // Render not found if no view
  if (!currentView) {
    return (
      <LayoutComponent config={config}>
        <NotFound path={navState.path} />
      </LayoutComponent>
    );
  }

  // Render the view layout
  return (
    <LayoutComponent config={config}>
      <ViewRenderer
        view={currentView}
        wiring={wiring}
        scope={scope}
        params={navState.params}
      />
    </LayoutComponent>
  );
}

// =============================================================================
// VIEW RENDERER
// =============================================================================

/**
 * Renders a single view using its layout configuration.
 */
function ViewRenderer({
  view,
  wiring,
  scope,
  params,
}: {
  view: ViewConfig;
  wiring: WiringManager;
  scope: BindingScope;
  params: Record<string, string>;
}): React.ReactElement {
  // Normalize the layout config
  const layout = useMemo((): LayoutConfig => {
    return normalizeLayout(view.layout);
  }, [view.layout]);

  return (
    <div className="view-container" style={viewContainerStyle}>
      {view.name && <h2 style={viewTitleStyle}>{view.name}</h2>}
      <LayoutRenderer
        layout={layout}
        wiring={wiring}
        scope={scope}
        params={params}
        safeMode={true}
      />
    </div>
  );
}

// =============================================================================
// NOT FOUND
// =============================================================================

function NotFound({ path }: { path: string }): React.ReactElement {
  return (
    <div style={notFoundStyle}>
      <div style={notFoundCodeStyle}>404</div>
      <h2 style={notFoundTitleStyle}>View Not Found</h2>
      <p style={notFoundMessageStyle}>
        No view configured for path: <code>{path}</code>
      </p>
    </div>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

/**
 * Inner component that uses the config loader context.
 */
function DynamicProductAppInner({
  productId,
  apiBaseUrl,
  LoadingComponent = DefaultLoading,
  ErrorComponent = DefaultError,
  LayoutComponent = DefaultLayout,
}: Omit<DynamicProductAppProps, 'configBaseUrl'>): React.ReactElement {
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

  // Build navigation manager from config
  const navManager = useMemo(() => {
    const defaultView = config.views.find((v) => v.id === config.defaultView);
    const defaultPath = defaultView?.route ?? '/';
    const manager = new NavigationManager(defaultPath);
    // Register all view routes
    for (const view of config.views) {
      manager.registerRoute(view.id as Parameters<NavigationManager['registerRoute']>[0], view.route);
    }
    return manager;
  }, [config.views, config.defaultView]);

  // Create TrellisClient for the provider
  const client = useMemo(() => {
    return new TrellisClient({ baseUrl: apiBaseUrl ?? '' });
  }, [apiBaseUrl]);

  return (
    <TrellisProvider client={client}>
      <NavigationProvider manager={navManager}>
        <ProductRenderer config={config} LayoutComponent={LayoutComponent} />
      </NavigationProvider>
    </TrellisProvider>
  );
}

/**
 * DynamicProductApp - Load and render any Trellis product.
 */
export function DynamicProductApp({
  productId,
  apiBaseUrl = '',
  configBaseUrl,
  ...props
}: DynamicProductAppProps): React.ReactElement {
  const baseUrl = configBaseUrl ?? `${apiBaseUrl}/config/products`;

  return (
    <ConfigLoaderProvider baseUrl={baseUrl}>
      <DynamicProductAppInner
        productId={productId}
        apiBaseUrl={apiBaseUrl}
        {...props}
      />
    </ConfigLoaderProvider>
  );
}

// =============================================================================
// HELPERS
// =============================================================================

/**
 * Match a route pattern against a path.
 */
function matchRoute(pattern: string, path: string): boolean {
  // Simple pattern matching: /foo/:id matches /foo/123
  const patternParts = pattern.split('/').filter(Boolean);
  const pathParts = path.split('/').filter(Boolean);

  if (patternParts.length !== pathParts.length) {
    return false;
  }

  return patternParts.every((part, index) => {
    if (part.startsWith(':')) {
      return true; // Parameter matches anything
    }
    return part === pathParts[index];
  });
}

/**
 * Normalize a layout config from YAML format to internal format.
 */
function normalizeLayout(layout: Record<string, unknown>): LayoutConfig {
  const type = layout['type'] as LayoutConfig['type'];

  if (!type) {
    // Default to stack if no type specified
    return {
      type: 'stack',
      direction: 'vertical',
      blocks: normalizeBlocks(layout['children'] as readonly Record<string, unknown>[] | undefined),
    };
  }

  switch (type) {
    case 'single': {
      const children = layout['children'] as readonly Record<string, unknown>[] | undefined;
      const block = children?.[0] ? normalizeBlock(children[0]) : {
        type: 'unknown',
        props: {},
      };
      return { type: 'single', block };
    }

    case 'stack': {
      const direction = (layout['direction'] as 'vertical' | 'horizontal') ?? 'vertical';
      const gap = layout['gap'] as string | undefined;
      const blocks = normalizeBlocks(layout['children'] as readonly Record<string, unknown>[] | undefined);
      const result: LayoutConfig = { type: 'stack', direction, blocks };
      return {
        ...result,
        ...(gap !== undefined && { gap }),
      } as LayoutConfig;
    }

    case 'split': {
      const children = layout['children'] as readonly Record<string, unknown>[] | undefined;
      const panels = children?.map((child) => {
        // Check if child is a nested layout
        if (child['type'] === 'stack' || child['type'] === 'split' || child['type'] === 'tabs' || child['type'] === 'grid') {
          return { layout: normalizeLayout(child) };
        }
        // Otherwise it's a block
        return { blocks: [normalizeBlock(child)] };
      }) ?? [];

      const direction = (layout['direction'] as 'horizontal' | 'vertical') ?? 'horizontal';
      const sizes = layout['sizes'] as readonly (number | string)[] | undefined;
      const result: LayoutConfig = { type: 'split', direction, panels };
      return {
        ...result,
        ...(sizes !== undefined && { sizes }),
      } as LayoutConfig;
    }

    case 'tabs': {
      const tabs = (layout['tabs'] as readonly Record<string, unknown>[])?.map((tab) => {
        const id = tab['id'] as string | undefined;
        const label = (tab['label'] as string) ?? 'Tab';
        const icon = tab['icon'] as string | undefined;
        const blocks = normalizeBlocks(tab['blocks'] as readonly Record<string, unknown>[] | undefined);
        const tabBase = { label, blocks };
        return {
          ...tabBase,
          ...(id !== undefined && { id }),
          ...(icon !== undefined && { icon }),
        };
      }) ?? [];

      const position = (layout['position'] as 'top' | 'bottom' | 'left' | 'right') ?? 'top';
      const defaultTab = layout['defaultTab'] as number | string | undefined;
      const result: LayoutConfig = { type: 'tabs', position, tabs };
      return {
        ...result,
        ...(defaultTab !== undefined && { defaultTab }),
      } as LayoutConfig;
    }

    case 'grid': {
      const columns = (layout['columns'] as number) ?? 2;
      const gap = layout['gap'] as string | undefined;
      const rows = (layout['rows'] as readonly Record<string, unknown>[])?.map((row) => {
        const height = row['height'] as string | undefined;
        const cells = (row['cells'] as readonly Record<string, unknown>[])?.map((cell) => {
          const colspan = cell['colspan'] as number | undefined;
          const rowspan = cell['rowspan'] as number | undefined;
          const block = cell['block'] ? normalizeBlock(cell['block'] as Record<string, unknown>) : undefined;
          const cellBase: Record<string, unknown> = {};
          return {
            ...cellBase,
            ...(colspan !== undefined && { colspan }),
            ...(rowspan !== undefined && { rowspan }),
            ...(block !== undefined && { block }),
          };
        }) ?? [];
        const rowBase = { cells };
        return {
          ...rowBase,
          ...(height !== undefined && { height }),
        };
      }) ?? [];
      const result: LayoutConfig = { type: 'grid', columns, rows };
      return {
        ...result,
        ...(gap !== undefined && { gap }),
      } as LayoutConfig;
    }

    default:
      // Return as-is for unknown types
      return layout as unknown as LayoutConfig;
  }
}

/**
 * Normalize multiple blocks.
 */
function normalizeBlocks(
  blocks: readonly Record<string, unknown>[] | undefined
): BlockPlacement[] {
  if (!blocks) return [];
  return blocks.map(normalizeBlock);
}

/**
 * Normalize a single block from YAML format.
 */
function normalizeBlock(block: Record<string, unknown>): BlockPlacement {
  // Kitchen sink format: { id, type, props: {...} }
  const blockType = block['type'] as string | undefined;
  const props = (block['props'] as Record<string, unknown>) ?? {};
  const id = block['id'] as string | undefined;

  // The type might be in props.block for some formats
  const effectiveType = blockType ?? (props['block'] as string) ?? 'unknown';

  // Merge props, removing 'block' if it was there
  const { block: _block, ...restProps } = props;

  return {
    type: effectiveType,
    ...(id !== undefined && { id }),
    props: restProps,
  };
}

// =============================================================================
// STYLES (explicitly typed to avoid index signature issues)
// =============================================================================

const appContainerStyle: React.CSSProperties = {
  display: 'flex',
  minHeight: '100vh',
  backgroundColor: '#f9fafb',
};

const sidebarStyle: React.CSSProperties = {
  width: '240px',
  backgroundColor: '#1f2937',
  color: '#ffffff',
  display: 'flex',
  flexDirection: 'column',
};

const sidebarHeaderStyle: React.CSSProperties = {
  padding: '1rem',
  borderBottom: '1px solid #374151',
};

const appTitleStyle: React.CSSProperties = {
  fontSize: '1.25rem',
  fontWeight: 600,
  margin: 0,
};

const appVersionStyle: React.CSSProperties = {
  fontSize: '0.75rem',
  color: '#9ca3af',
};

const navStyle: React.CSSProperties = {
  flex: 1,
  padding: '0.5rem',
  display: 'flex',
  flexDirection: 'column',
  gap: '0.25rem',
};

const navItemStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '0.75rem',
  padding: '0.75rem 1rem',
  color: '#d1d5db',
  backgroundColor: 'transparent',
  border: 'none',
  borderRadius: '0.375rem',
  cursor: 'pointer',
  textAlign: 'left',
  fontSize: '0.875rem',
  transition: 'all 0.15s ease',
};

const navItemActiveStyle: React.CSSProperties = {
  backgroundColor: '#374151',
  color: '#ffffff',
};

const navIconStyle: React.CSSProperties = {
  fontSize: '1rem',
};

const mainStyle: React.CSSProperties = {
  flex: 1,
  padding: '1.5rem',
  overflow: 'auto',
};

const viewContainerStyle: React.CSSProperties = {
  backgroundColor: '#ffffff',
  borderRadius: '0.5rem',
  padding: '1.5rem',
  minHeight: '400px',
  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
};

const viewTitleStyle: React.CSSProperties = {
  fontSize: '1.25rem',
  fontWeight: 600,
  marginTop: 0,
  marginBottom: '1rem',
  color: '#111827',
};

const loadingContainerStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  minHeight: '100vh',
  backgroundColor: '#f9fafb',
};

const loadingSpinnerStyle: React.CSSProperties = {
  width: '3rem',
  height: '3rem',
  border: '3px solid #e5e7eb',
  borderTopColor: '#6366f1',
  borderRadius: '50%',
};

const loadingTextStyle: React.CSSProperties = {
  marginTop: '1rem',
  color: '#6b7280',
  fontSize: '0.875rem',
};

const errorContainerStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  minHeight: '100vh',
  backgroundColor: '#fef2f2',
  padding: '2rem',
  textAlign: 'center',
};

const errorIconStyle: React.CSSProperties = {
  width: '3rem',
  height: '3rem',
  backgroundColor: '#ef4444',
  color: 'white',
  borderRadius: '50%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: '1.5rem',
  fontWeight: 'bold',
};

const errorTitleStyle: React.CSSProperties = {
  marginTop: '1rem',
  fontSize: '1.25rem',
  fontWeight: 600,
  color: '#991b1b',
};

const errorMessageStyle: React.CSSProperties = {
  color: '#6b7280',
  marginBottom: '1.5rem',
};

const retryButtonStyle: React.CSSProperties = {
  padding: '0.75rem 1.5rem',
  backgroundColor: '#6366f1',
  color: 'white',
  border: 'none',
  borderRadius: '0.375rem',
  cursor: 'pointer',
  fontWeight: 500,
};

const notFoundStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '4rem',
  textAlign: 'center',
  color: '#6b7280',
};

const notFoundCodeStyle: React.CSSProperties = {
  fontSize: '4rem',
  fontWeight: 'bold',
  color: '#d1d5db',
};

const notFoundTitleStyle: React.CSSProperties = {
  fontSize: '1.5rem',
  fontWeight: 600,
  color: '#374151',
  margin: '1rem 0 0.5rem',
};

const notFoundMessageStyle: React.CSSProperties = {
  fontSize: '0.875rem',
};

// =============================================================================
// EXPORTS
// =============================================================================

export { DefaultLayout, DefaultLoading, DefaultError };
export type { LoadedProductConfig };
