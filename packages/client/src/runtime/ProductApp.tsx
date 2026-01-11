/**
 * Trellis ProductApp
 *
 * Complete application shell for running Trellis products.
 */

import React, { useMemo, useEffect } from 'react';
import type { ViewId } from '@trellis/server';
import { TrellisClient } from '../sdk/client.js';
import { TrellisProvider } from '../state/store.js';
import { createScope } from '../binding/scope.js';
import type { BindingScope } from '../binding/index.js';
import { NavigationProvider, NavLink, useNavigation } from './NavigationProvider.js';
import { NavigationManager } from './navigation.js';
import { ViewRenderer } from './ViewRenderer.js';
import type { ViewConfig } from './ViewRenderer.js';

// =============================================================================
// TYPES
// =============================================================================

/**
 * Navigation item configuration.
 */
export interface NavigationItem {
  /** Display label */
  readonly label: string;

  /** View ID to navigate to */
  readonly view: string;

  /** Optional icon name or component */
  readonly icon?: string | undefined;

  /** Whether this item is hidden */
  readonly hidden?: boolean | undefined;
}

/**
 * Product configuration.
 */
export interface ProductConfig {
  /** Product name */
  readonly name: string;

  /** Product version */
  readonly version?: string | undefined;

  /** API configuration */
  readonly api?: {
    /** Base URL for API requests */
    readonly baseUrl?: string | undefined;
    /** Request timeout in milliseconds */
    readonly timeout?: number | undefined;
  } | undefined;

  /** View definitions */
  readonly views: Record<string, ViewConfig>;

  /** Navigation items */
  readonly navigation?: {
    /** Navigation items */
    readonly items: readonly NavigationItem[];
  } | undefined;

  /** Default view to show */
  readonly defaultView?: string | undefined;

  /** Theme configuration */
  readonly theme?: {
    /** Primary color */
    readonly primaryColor?: string | undefined;
    /** Accent color */
    readonly accentColor?: string | undefined;
  } | undefined;
}

/**
 * Props for ProductApp.
 */
export interface ProductAppProps {
  /** Product configuration */
  readonly config: ProductConfig;

  /** Optional TrellisClient (will be created if not provided) */
  readonly client?: TrellisClient | undefined;

  /** Additional scope data to pass to all views */
  readonly scope?: BindingScope | undefined;

  /** Whether to auto-connect WebSocket */
  readonly autoConnect?: boolean | undefined;

  /** Custom layout component */
  readonly Layout?: React.ComponentType<LayoutProps> | undefined;

  /** Custom not found component */
  readonly NotFound?: React.ComponentType | undefined;
}

/**
 * Props for layout components.
 */
export interface LayoutProps {
  /** Product configuration */
  readonly config: ProductConfig;

  /** Navigation items */
  readonly navigation: readonly NavigationItem[];

  /** Current view ID */
  readonly currentViewId?: string | undefined;

  /** Children to render in main content area */
  readonly children: React.ReactNode;
}

// =============================================================================
// DEFAULT LAYOUT
// =============================================================================

/**
 * Default sidebar navigation item styles.
 */
const navItemStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  padding: '0.75rem 1rem',
  color: '#374151',
  textDecoration: 'none',
  borderRadius: '0.375rem',
  transition: 'background-color 0.15s',
};

const navItemActiveStyle: React.CSSProperties = {
  backgroundColor: '#eff6ff',
  color: '#1d4ed8',
};

/**
 * Default layout component with sidebar navigation.
 */
function DefaultLayout({
  config,
  navigation,
  children,
}: LayoutProps): React.ReactElement {
  return (
    <div
      style={{
        display: 'flex',
        minHeight: '100vh',
        backgroundColor: '#f9fafb',
      }}
    >
      {/* Sidebar */}
      <aside
        style={{
          width: '16rem',
          backgroundColor: '#ffffff',
          borderRight: '1px solid #e5e7eb',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Logo/Title */}
        <div
          style={{
            padding: '1.5rem 1rem',
            borderBottom: '1px solid #e5e7eb',
          }}
        >
          <h1
            style={{
              fontSize: '1.25rem',
              fontWeight: 600,
              color: '#111827',
              margin: 0,
            }}
          >
            {config.name}
          </h1>
          {config.version && (
            <span
              style={{
                fontSize: '0.75rem',
                color: '#6b7280',
              }}
            >
              v{config.version}
            </span>
          )}
        </div>

        {/* Navigation */}
        <nav
          style={{
            flex: 1,
            padding: '1rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.25rem',
          }}
        >
          {navigation
            .filter((item) => !item.hidden)
            .map((item) => {
              const viewConfig = config.views[item.view];
              const route = viewConfig?.route ?? `/${item.view}`;

              return (
                <NavLink
                  key={item.view}
                  to={route}
                  style={navItemStyle}
                  activeStyle={navItemActiveStyle}
                >
                  {item.icon && (
                    <span style={{ marginRight: '0.75rem' }}>{item.icon}</span>
                  )}
                  {item.label}
                </NavLink>
              );
            })}
        </nav>
      </aside>

      {/* Main content */}
      <main
        style={{
          flex: 1,
          padding: '1.5rem',
          overflow: 'auto',
        }}
      >
        {children}
      </main>
    </div>
  );
}

/**
 * Minimal layout (no navigation, just content).
 */
export function MinimalLayout({
  children,
}: LayoutProps): React.ReactElement {
  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: '#f9fafb',
      }}
    >
      {children}
    </div>
  );
}

// =============================================================================
// INTERNAL COMPONENTS
// =============================================================================

/**
 * Internal component that uses navigation context.
 */
function ProductAppContent({
  config,
  scope,
  Layout,
}: {
  config: ProductConfig;
  scope: BindingScope;
  Layout: React.ComponentType<LayoutProps>;
}): React.ReactElement {
  const { state } = useNavigation();

  const navigationItems = config.navigation?.items ?? [];

  // Build children element
  const children = (
    <ViewRenderer
      views={config.views}
      defaultView={config.defaultView}
      scope={scope}
    />
  );

  // Build layout props - conditionally include currentViewId
  const layoutProps: LayoutProps = state.viewId !== undefined
    ? { config, navigation: navigationItems, currentViewId: state.viewId, children }
    : { config, navigation: navigationItems, children };

  return <Layout {...layoutProps} />;
}

// =============================================================================
// PRODUCT APP
// =============================================================================

/**
 * ProductApp is the complete application shell for running Trellis products.
 */
export function ProductApp({
  config,
  client: externalClient,
  scope: externalScope,
  autoConnect = false,
  Layout = DefaultLayout,
}: ProductAppProps): React.ReactElement {
  // Create TrellisClient if not provided
  const client = useMemo(() => {
    if (externalClient) {
      return externalClient;
    }

    const clientConfig: { baseUrl: string; timeout?: number } = {
      baseUrl: config.api?.baseUrl ?? '/api',
    };

    if (config.api?.timeout !== undefined) {
      clientConfig.timeout = config.api.timeout;
    }

    return new TrellisClient(clientConfig);
  }, [externalClient, config.api?.baseUrl, config.api?.timeout]);

  // Create NavigationManager
  const navManager = useMemo(() => {
    const initialPath =
      typeof window !== 'undefined' ? window.location.pathname : '/';
    const manager = new NavigationManager(initialPath);

    // Register routes for all views
    for (const [viewId, viewConfig] of Object.entries(config.views)) {
      const route = viewConfig.route ?? `/${viewId}`;
      manager.registerRoute(viewId as ViewId, route);
    }

    return manager;
  }, [config.views]);

  // Initialize navigation to match current URL
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const path = window.location.pathname;
    const match = navManager.matchPath(path);

    if (!match && config.defaultView) {
      // If no route matches and we have a default, navigate to it
      const defaultConfig = config.views[config.defaultView];
      if (defaultConfig) {
        const defaultRoute = defaultConfig.route ?? `/${config.defaultView}`;
        navManager.replace({ path: defaultRoute });
      }
    }
  }, [navManager, config.defaultView, config.views]);

  // Create default scope if not provided
  const scope = useMemo(() => {
    return externalScope ?? createScope();
  }, [externalScope]);

  return (
    <TrellisProvider client={client} autoConnect={autoConnect}>
      <NavigationProvider manager={navManager}>
        <ProductAppContent
          config={config}
          scope={scope}
          Layout={Layout}
        />
      </NavigationProvider>
    </TrellisProvider>
  );
}

// =============================================================================
// STANDALONE VIEW
// =============================================================================

/**
 * Props for StandaloneView.
 */
export interface StandaloneViewProps {
  /** View configuration */
  readonly config: ViewConfig;

  /** API base URL */
  readonly apiBaseUrl?: string | undefined;

  /** Optional client */
  readonly client?: TrellisClient | undefined;

  /** Route parameters */
  readonly params?: Record<string, string> | undefined;

  /** Additional scope */
  readonly scope?: BindingScope | undefined;
}

/**
 * Render a single view without the full ProductApp shell.
 */
export function StandaloneView({
  config,
  apiBaseUrl = '/api',
  client: externalClient,
  params = {},
  scope: externalScope,
}: StandaloneViewProps): React.ReactElement {
  // Create client if not provided
  const client = useMemo(() => {
    if (externalClient) return externalClient;
    return new TrellisClient({ baseUrl: apiBaseUrl });
  }, [externalClient, apiBaseUrl]);

  // Create minimal navigation manager
  const navManager = useMemo(() => {
    return new NavigationManager('/');
  }, []);

  // Build scope with params
  const scope = useMemo<BindingScope>(() => {
    if (externalScope) {
      return externalScope;
    }
    return createScope({
      params,
      route: { path: '/' },
    });
  }, [externalScope, params]);

  return (
    <TrellisProvider client={client}>
      <NavigationProvider manager={navManager}>
        <ViewRenderer
          views={{ standalone: config }}
          defaultView="standalone"
          scope={scope}
        />
      </NavigationProvider>
    </TrellisProvider>
  );
}
