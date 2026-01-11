/**
 * Trellis NavigationProvider
 *
 * React context provider for navigation state and actions.
 */

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useMemo,
} from 'react';
import type { NavigationManager, NavigationState } from './navigation.js';

// =============================================================================
// TYPES
// =============================================================================

/**
 * Navigation context value.
 */
export interface NavigationContextValue {
  /** Current navigation state */
  readonly state: NavigationState;

  /** Navigation manager instance */
  readonly manager: NavigationManager;

  /** Navigate to a path */
  push: (path: string, query?: Record<string, string>) => void;

  /** Replace current path */
  replace: (path: string, query?: Record<string, string>) => void;

  /** Go back in history */
  back: () => void;

  /** Go forward in history */
  forward: () => void;

  /** Navigate to a view by ID */
  toView: (
    viewId: string,
    params?: Record<string, string>,
    query?: Record<string, string>
  ) => void;
}

/**
 * Props for NavigationProvider.
 */
export interface NavigationProviderProps {
  /** Navigation manager instance */
  manager: NavigationManager;

  /** Child components */
  children: React.ReactNode;
}

// =============================================================================
// CONTEXT
// =============================================================================

const NavigationContext = createContext<NavigationContextValue | null>(null);

/**
 * Hook to access navigation context.
 *
 * @throws Error if used outside NavigationProvider
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { state, push } = useNavigation();
 *
 *   return (
 *     <div>
 *       <p>Current path: {state.path}</p>
 *       <button onClick={() => push('/products')}>Go to Products</button>
 *     </div>
 *   );
 * }
 * ```
 */
export function useNavigation(): NavigationContextValue {
  const ctx = useContext(NavigationContext);
  if (!ctx) {
    throw new Error(
      'useNavigation must be used within a NavigationProvider. ' +
        'Make sure your component is wrapped in NavigationProvider.'
    );
  }
  return ctx;
}

/**
 * Hook to access current navigation state only.
 *
 * @throws Error if used outside NavigationProvider
 *
 * @example
 * ```tsx
 * function BreadcrumbComponent() {
 *   const state = useNavigationState();
 *   return <span>Current: {state.path}</span>;
 * }
 * ```
 */
export function useNavigationState(): NavigationState {
  const { state } = useNavigation();
  return state;
}

/**
 * Hook to get route parameters from current navigation state.
 *
 * @example
 * ```tsx
 * function ProductPage() {
 *   const params = useRouteParams();
 *   // If route is /products/:id, params.id contains the value
 *   return <ProductDetail id={params.id} />;
 * }
 * ```
 */
export function useRouteParams(): Record<string, string> {
  const { state } = useNavigation();
  return state.params;
}

/**
 * Hook to get query parameters from current navigation state.
 *
 * @example
 * ```tsx
 * function SearchResults() {
 *   const query = useRouteQuery();
 *   // ?q=search&page=2 -> { q: 'search', page: '2' }
 *   return <Results query={query.q} page={query.page} />;
 * }
 * ```
 */
export function useRouteQuery(): Record<string, string> {
  const { state } = useNavigation();
  return state.query;
}

/**
 * Hook to get the current view ID if matched.
 *
 * @example
 * ```tsx
 * function ViewIndicator() {
 *   const viewId = useCurrentViewId();
 *   return <span>Current view: {viewId ?? 'none'}</span>;
 * }
 * ```
 */
export function useCurrentViewId(): string | undefined {
  const { state } = useNavigation();
  return state.viewId;
}

// =============================================================================
// PROVIDER
// =============================================================================

/**
 * NavigationProvider provides navigation context to the component tree.
 *
 * It:
 * - Listens to navigation state changes
 * - Handles browser popstate events
 * - Provides navigation actions (push, replace, back, forward, toView)
 *
 * @example
 * ```tsx
 * const navManager = createNavigationManager('/');
 *
 * function App() {
 *   return (
 *     <NavigationProvider manager={navManager}>
 *       <AppContent />
 *     </NavigationProvider>
 *   );
 * }
 * ```
 */
export function NavigationProvider({
  manager,
  children,
}: NavigationProviderProps): React.ReactElement {
  // Track current navigation state
  const [state, setState] = useState<NavigationState>(manager.getState());

  // Subscribe to navigation changes
  useEffect(() => {
    return manager.subscribe(setState);
  }, [manager]);

  // Handle browser popstate events
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handlePopState = (event: PopStateEvent) => {
      manager.handlePopState(event);
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [manager]);

  // Navigation actions
  const push = useCallback(
    (path: string, query?: Record<string, string>) => {
      const params = query ? { path, query } : { path };
      manager.push(params);
    },
    [manager]
  );

  const replace = useCallback(
    (path: string, query?: Record<string, string>) => {
      const params = query ? { path, query } : { path };
      manager.replace(params);
    },
    [manager]
  );

  const back = useCallback(() => {
    manager.back();
  }, [manager]);

  const forward = useCallback(() => {
    manager.forward();
  }, [manager]);

  const toView = useCallback(
    (
      viewId: string,
      params?: Record<string, string>,
      query?: Record<string, string>
    ) => {
      const viewParams: {
        view: string;
        params?: Record<string, string>;
        query?: Record<string, string>;
      } = { view: viewId };
      if (params) viewParams.params = params;
      if (query) viewParams.query = query;
      manager.toView(viewParams);
    },
    [manager]
  );

  // Memoize context value
  const value = useMemo<NavigationContextValue>(
    () => ({
      state,
      manager,
      push,
      replace,
      back,
      forward,
      toView,
    }),
    [state, manager, push, replace, back, forward, toView]
  );

  return (
    <NavigationContext.Provider value={value}>
      {children}
    </NavigationContext.Provider>
  );
}

// =============================================================================
// LINK COMPONENT
// =============================================================================

/**
 * Props for Link component.
 */
export interface LinkProps
  extends Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, 'href'> {
  /** Target path */
  to: string;

  /** Query parameters */
  query?: Record<string, string>;

  /** Whether to replace instead of push */
  replace?: boolean;

  /** Children */
  children: React.ReactNode;
}

/**
 * Link component for navigation.
 *
 * Uses the navigation manager instead of native anchor behavior.
 *
 * @example
 * ```tsx
 * <Link to="/products">Products</Link>
 * <Link to="/search" query={{ q: 'widgets' }}>Search Widgets</Link>
 * <Link to="/dashboard" replace>Dashboard</Link>
 * ```
 */
export function Link({
  to,
  query,
  replace: shouldReplace = false,
  children,
  onClick,
  ...rest
}: LinkProps): React.ReactElement {
  const navigation = useNavigation();

  const handleClick = useCallback(
    (event: React.MouseEvent<HTMLAnchorElement>) => {
      // Allow cmd/ctrl+click to open in new tab
      if (event.metaKey || event.ctrlKey) {
        return;
      }

      event.preventDefault();

      // Call custom onClick handler if provided
      onClick?.(event);

      // Navigate
      if (shouldReplace) {
        navigation.replace(to, query);
      } else {
        navigation.push(to, query);
      }
    },
    [navigation, to, query, shouldReplace, onClick]
  );

  // Build href for accessibility
  const href = useMemo(() => {
    if (!query || Object.keys(query).length === 0) {
      return to;
    }
    const params = new URLSearchParams(query);
    return `${to}?${params.toString()}`;
  }, [to, query]);

  return (
    <a href={href} onClick={handleClick} {...rest}>
      {children}
    </a>
  );
}

/**
 * Props for NavLink component.
 */
export interface NavLinkProps extends LinkProps {
  /** Class name when active */
  activeClassName?: string;

  /** Style when active */
  activeStyle?: React.CSSProperties;

  /** Custom match function */
  isActive?: (currentPath: string, targetPath: string) => boolean;
}

/**
 * NavLink component with active state styling.
 *
 * @example
 * ```tsx
 * <NavLink to="/products" activeClassName="nav-active">
 *   Products
 * </NavLink>
 * ```
 */
export function NavLink({
  to,
  activeClassName = 'active',
  activeStyle,
  isActive: customIsActive,
  className,
  style,
  ...rest
}: NavLinkProps): React.ReactElement {
  const { state } = useNavigation();

  // Check if link is active
  const isActive = useMemo(() => {
    if (customIsActive) {
      return customIsActive(state.path, to);
    }
    // Default: exact match or starts with (for nested routes)
    return state.path === to || state.path.startsWith(`${to}/`);
  }, [state.path, to, customIsActive]);

  // Combine class names
  const combinedClassName = useMemo(() => {
    if (!isActive || !activeClassName) {
      return className;
    }
    return className ? `${className} ${activeClassName}` : activeClassName;
  }, [className, activeClassName, isActive]);

  // Combine styles
  const combinedStyle = useMemo(() => {
    if (!isActive || !activeStyle) {
      return style;
    }
    return { ...style, ...activeStyle };
  }, [style, activeStyle, isActive]);

  return (
    <Link
      to={to}
      className={combinedClassName}
      style={combinedStyle}
      {...rest}
    />
  );
}
