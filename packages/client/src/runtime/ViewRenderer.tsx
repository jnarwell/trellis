/**
 * Trellis ViewRenderer
 *
 * Renders views from ProductConfig based on current navigation state.
 * Supports both single-block and multi-block page layouts.
 */

import React, { useMemo, useState, useCallback } from 'react';
import { createScope, extendScope } from '../binding/scope.js';
import type { BindingScope } from '../binding/index.js';
import { BlockRenderer, SafeBlockRenderer } from '../blocks/BlockRenderer.js';
import type { BlockConfig } from '../blocks/BlockRenderer.js';
import { createWiringManager } from './wiring.js';
import type { WiringConfig } from '@trellis/server';
import { useNavigationState } from './NavigationProvider.js';
import type { Entity, EntityId } from '@trellis/kernel';

// =============================================================================
// TYPES
// =============================================================================

/**
 * Block configuration within a multi-block view.
 */
export interface MultiBlockConfig {
  /** Unique block ID within the view */
  readonly id: string;
  /** Block type */
  readonly type: string;
  /** Block-specific configuration */
  readonly config: Record<string, unknown>;
}

/**
 * View configuration from ProductConfig.
 * Supports either a single block or multiple blocks.
 */
export interface ViewConfig {
  /** Block type (for single-block views) */
  readonly block?: string | undefined;

  /** Multiple blocks (for multi-block views) */
  readonly blocks?: readonly MultiBlockConfig[] | undefined;

  /** View route pattern (e.g., '/products/:id') */
  readonly route?: string | undefined;

  /** View title */
  readonly title?: string | undefined;

  /** Wiring configuration for the view */
  readonly wiring?: readonly WiringConfig[] | undefined;

  /** Additional block-specific config */
  readonly [key: string]: unknown;
}

/**
 * Props for ViewRenderer.
 */
export interface ViewRendererProps {
  /** Views configuration map */
  readonly views: Record<string, ViewConfig>;

  /** Default view to show when no route matches */
  readonly defaultView?: string | undefined;

  /** Additional scope data to pass to blocks */
  readonly scope?: BindingScope | undefined;

  /** Whether to use error boundary */
  readonly safeMode?: boolean | undefined;
}

/**
 * Props for NotFound fallback component.
 */
interface NotFoundProps {
  readonly viewId?: string | undefined;
  readonly path: string;
}

// =============================================================================
// NOT FOUND COMPONENT
// =============================================================================

/**
 * Default not found component.
 */
function NotFound({ viewId, path }: NotFoundProps): React.ReactElement {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '200px',
        padding: '2rem',
        textAlign: 'center',
        color: '#6b7280',
      }}
    >
      <div
        style={{
          fontSize: '4rem',
          marginBottom: '1rem',
        }}
      >
        404
      </div>
      <h2
        style={{
          fontSize: '1.5rem',
          fontWeight: 600,
          color: '#374151',
          marginBottom: '0.5rem',
        }}
      >
        {viewId ? `View "${viewId}" not found` : 'Page not found'}
      </h2>
      <p style={{ fontSize: '0.875rem' }}>
        The path <code style={{ backgroundColor: '#f3f4f6', padding: '0.125rem 0.375rem', borderRadius: '0.25rem' }}>{path}</code> doesn&apos;t match any view.
      </p>
    </div>
  );
}

// =============================================================================
// VIEW RENDERER
// =============================================================================

/**
 * ViewRenderer renders the appropriate view based on navigation state.
 */
export function ViewRenderer({
  views,
  defaultView,
  scope: externalScope,
  safeMode = true,
}: ViewRendererProps): React.ReactElement {
  // Get current navigation state
  const navState = useNavigationState();

  // Determine which view to render
  const viewId = navState.viewId ?? defaultView;

  // Get view configuration
  const viewConfig = viewId ? views[viewId] : undefined;

  // Create wiring manager for this view
  const wiring = useMemo(() => {
    const manager = createWiringManager();

    // Register wiring from view config
    if (viewConfig?.wiring) {
      manager.registerWiring(viewConfig.wiring);
    }

    return manager;
  }, [viewConfig?.wiring]);

  // Build data binding scope
  const scope = useMemo<BindingScope>(() => {
    // Build route context - only include viewId if defined
    const routeContext: { path: string; viewId?: string } = { path: navState.path };
    if (navState.viewId !== undefined) {
      routeContext.viewId = navState.viewId;
    }

    // Start with external scope or create default
    const baseScope = externalScope ?? createScope({
      params: navState.params,
      query: navState.query,
      route: routeContext,
    });

    // Build $route extension - only include viewId if defined
    const routeExtension: Record<string, unknown> = {
      params: navState.params,
      query: navState.query,
      path: navState.path,
    };
    if (navState.viewId !== undefined) {
      routeExtension['viewId'] = navState.viewId;
    }

    // Build $view extension
    const viewExtension: Record<string, unknown> = { id: viewId };
    if (viewConfig?.title !== undefined) {
      viewExtension['title'] = viewConfig.title;
    }

    // Extend with view-specific data
    return extendScope(baseScope, {
      $route: routeExtension,
      $view: viewExtension,
    });
  }, [externalScope, navState, viewId, viewConfig?.title]);

  // Show not found if no view matched
  if (!viewConfig) {
    return <NotFound viewId={viewId} path={navState.path} />;
  }

  // Check if this is a multi-block view
  const isMultiBlock = viewConfig.blocks && viewConfig.blocks.length > 0;

  // Choose renderer based on safe mode
  const Renderer = safeMode ? SafeBlockRenderer : BlockRenderer;

  // Multi-block view
  if (isMultiBlock) {
    return (
      <MultiBlockView
        blocks={viewConfig.blocks!}
        wiring={wiring}
        scope={scope}
        Renderer={Renderer}
        params={navState.params}
      />
    );
  }

  // Single-block view (legacy format)
  // Build block config from view config
  // Spread all view config except view-specific fields
  const { route: _route, title: _title, wiring: _wiring, blocks: _blocks, ...blockConfig } = viewConfig;

  // Resolve any route parameter references in the config
  const resolvedConfig = resolveRouteParams(blockConfig as BlockConfig, navState.params);

  return (
    <Renderer
      config={resolvedConfig}
      wiring={wiring}
      scope={scope}
    />
  );
}

// =============================================================================
// MULTI-BLOCK VIEW
// =============================================================================

/**
 * CSS styles for multi-block layout.
 */
const multiBlockStyles = {
  container: {
    display: 'grid',
    gap: '1rem',
    padding: '1rem',
    minHeight: '400px',
  } as React.CSSProperties,
  containerSingle: {
    gridTemplateColumns: '1fr',
  } as React.CSSProperties,
  containerMulti: {
    gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
  } as React.CSSProperties,
  blockContainer: {
    background: 'white',
    border: '1px solid #e5e7eb',
    borderRadius: '0.5rem',
    padding: '1rem',
    overflow: 'auto',
    minHeight: '300px',
  } as React.CSSProperties,
  blockTitle: {
    fontSize: '0.875rem',
    fontWeight: 600,
    color: '#374151',
    marginBottom: '0.75rem',
    paddingBottom: '0.5rem',
    borderBottom: '1px solid #e5e7eb',
  } as React.CSSProperties,
};

/**
 * Props for MultiBlockView.
 */
interface MultiBlockViewProps {
  blocks: readonly MultiBlockConfig[];
  wiring: ReturnType<typeof createWiringManager>;
  scope: BindingScope;
  Renderer: typeof BlockRenderer | typeof SafeBlockRenderer;
  params: Record<string, string>;
}

/**
 * Renders multiple blocks in a grid layout with shared selection state.
 */
function MultiBlockView({
  blocks,
  wiring,
  scope,
  Renderer,
  params,
}: MultiBlockViewProps): React.ReactElement {
  // Shared selection state for block communication
  const [selectedEntity, setSelectedEntity] = useState<Entity | null>(null);

  // Handler for entity selection from table blocks
  const handleEntitySelect = useCallback((entity: Entity | null) => {
    setSelectedEntity(entity);
  }, []);

  // Extend scope with selection context
  const extendedScope = useMemo(() => {
    return extendScope(scope, {
      $selection: {
        entity: selectedEntity,
        entityId: selectedEntity?.id,
        hasSelection: selectedEntity !== null,
      },
    });
  }, [scope, selectedEntity]);

  const containerStyle = {
    ...multiBlockStyles.container,
    ...(blocks.length === 1
      ? multiBlockStyles.containerSingle
      : multiBlockStyles.containerMulti),
  };

  return (
    <div style={containerStyle} className="view-blocks">
      {blocks.map((blockDef) => {
        // Build block config with selection handlers
        const blockConfig: BlockConfig = {
          block: blockDef.type,
          id: blockDef.id,
          ...blockDef.config,
          // Inject selection handlers for table blocks
          ...(blockDef.type === 'table' && {
            onRowClick: handleEntitySelect,
          }),
          // Inject selected entity ID for detail blocks
          ...(blockDef.type === 'detail' && selectedEntity && {
            entityId: selectedEntity.id,
          }),
        };

        // Resolve route params in config
        const resolvedConfig = resolveRouteParams(blockConfig, params);

        const blockTitle = blockDef.config['title'] as string | undefined;

        return (
          <div key={blockDef.id} style={multiBlockStyles.blockContainer} className="block-container">
            {blockTitle != null && (
              <div style={multiBlockStyles.blockTitle}>
                {blockTitle}
              </div>
            )}
            <Renderer
              config={resolvedConfig}
              wiring={wiring}
              scope={extendedScope}
            />
          </div>
        );
      })}
    </div>
  );
}

// =============================================================================
// HELPERS
// =============================================================================

/**
 * Resolve $route.params references in block config.
 */
function resolveRouteParams(
  config: BlockConfig,
  params: Record<string, string>
): BlockConfig {
  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(config)) {
    result[key] = resolveValue(value, params);
  }

  return result as BlockConfig;
}

/**
 * Recursively resolve route parameters in a value.
 */
function resolveValue(
  value: unknown,
  params: Record<string, string>
): unknown {
  // String starting with $route.params
  if (typeof value === 'string') {
    if (value.startsWith('$route.params.')) {
      const paramName = value.slice('$route.params.'.length);
      return params[paramName];
    }
    // Template strings like "/products/${$route.params.id}"
    if (value.includes('$route.params.')) {
      return value.replace(/\$route\.params\.(\w+)/g, (_, name) => params[name] ?? '');
    }
    return value;
  }

  // Arrays
  if (Array.isArray(value)) {
    return value.map((item) => resolveValue(item, params));
  }

  // Objects (but not null)
  if (typeof value === 'object' && value !== null) {
    const result: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) {
      result[k] = resolveValue(v, params);
    }
    return result;
  }

  // Primitives
  return value;
}

// =============================================================================
// SINGLE VIEW RENDERER
// =============================================================================

/**
 * Props for SingleViewRenderer.
 */
export interface SingleViewRendererProps {
  /** View configuration */
  readonly config: ViewConfig;

  /** Additional scope data */
  readonly scope?: BindingScope | undefined;

  /** Route parameters (if any) */
  readonly params?: Record<string, string> | undefined;

  /** Whether to use error boundary */
  readonly safeMode?: boolean | undefined;
}

/**
 * Renders a single view without navigation context.
 */
export function SingleViewRenderer({
  config,
  scope: externalScope,
  params = {},
  safeMode = true,
}: SingleViewRendererProps): React.ReactElement {
  // Create wiring manager
  const wiring = useMemo(() => {
    const manager = createWiringManager();
    if (config.wiring) {
      manager.registerWiring(config.wiring);
    }
    return manager;
  }, [config.wiring]);

  // Build scope
  const scope = useMemo<BindingScope>(() => {
    const baseScope = externalScope ?? createScope({
      params,
      route: { path: '/' },
    });

    return extendScope(baseScope, {
      $route: { params },
      $view: { title: config.title },
    });
  }, [externalScope, params, config.title]);

  // Build block config
  const { route: _route, title: _title, wiring: _wiring, ...blockConfig } = config;
  const resolvedConfig = resolveRouteParams(blockConfig as BlockConfig, params);

  const Renderer = safeMode ? SafeBlockRenderer : BlockRenderer;

  return (
    <Renderer
      config={resolvedConfig}
      wiring={wiring}
      scope={scope}
    />
  );
}
