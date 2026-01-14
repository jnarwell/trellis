/**
 * Trellis LayoutRenderer
 *
 * Renders hierarchical layouts from ProductConfig.
 * Supports: single, split, stack, grid, tabs
 *
 * This is the general-purpose layout system that handles any
 * product configuration's view layouts.
 */

import React, { useState, useMemo, useCallback } from 'react';
import { BlockRenderer, SafeBlockRenderer } from '../blocks/BlockRenderer.js';
import type { BlockConfig } from '../blocks/BlockRenderer.js';
import type { WiringManager } from './wiring.js';
import type { BindingScope } from '../binding/index.js';

// =============================================================================
// TYPES (matching server/src/config/types.ts)
// =============================================================================

/**
 * Block placement within a layout.
 */
export interface BlockPlacement {
  readonly type: string;
  readonly id?: string;
  readonly props: Record<string, unknown>;
  readonly showWhen?: string;
}

/**
 * Single block layout.
 */
export interface SingleLayout {
  readonly type: 'single';
  readonly block: BlockPlacement;
}

/**
 * Panel in a split layout.
 */
export interface PanelConfig {
  readonly id?: string;
  readonly blocks?: readonly BlockPlacement[];
  readonly layout?: LayoutConfig;
}

/**
 * Split panel layout.
 */
export interface SplitLayout {
  readonly type: 'split';
  readonly direction: 'horizontal' | 'vertical';
  readonly sizes?: readonly (number | string)[];
  readonly resizable?: boolean;
  readonly minSizes?: readonly (number | string)[];
  readonly panels: readonly PanelConfig[];
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
 * Tab configuration.
 */
export interface TabConfig {
  readonly id?: string;
  readonly label: string;
  readonly icon?: string;
  readonly badge?: string | number;
  readonly showWhen?: string;
  readonly block?: BlockPlacement;
  readonly blocks?: readonly BlockPlacement[];
  readonly layout?: LayoutConfig;
}

/**
 * Tab layout.
 */
export interface TabsLayout {
  readonly type: 'tabs';
  readonly position?: 'top' | 'bottom' | 'left' | 'right';
  readonly defaultTab?: number | string;
  readonly tabs: readonly TabConfig[];
}

/**
 * Grid cell configuration.
 */
export interface GridCellConfig {
  readonly colspan?: number;
  readonly rowspan?: number;
  readonly block?: BlockPlacement;
  readonly layout?: LayoutConfig;
}

/**
 * Grid row configuration.
 */
export interface GridRowConfig {
  readonly height?: string;
  readonly cells: readonly GridCellConfig[];
}

/**
 * Grid layout.
 */
export interface GridLayout {
  readonly type: 'grid';
  readonly columns: number;
  readonly gap?: string;
  readonly rows: readonly GridRowConfig[];
}

/**
 * Union of all layout types.
 */
export type LayoutConfig =
  | SingleLayout
  | SplitLayout
  | StackLayout
  | TabsLayout
  | GridLayout;

/**
 * Props for LayoutRenderer.
 */
export interface LayoutRendererProps {
  readonly layout: LayoutConfig;
  readonly wiring: WiringManager;
  readonly scope: BindingScope;
  readonly params?: Record<string, string>;
  readonly safeMode?: boolean;
  readonly className?: string;
}

// =============================================================================
// MAIN LAYOUT RENDERER
// =============================================================================

/**
 * LayoutRenderer renders any layout configuration recursively.
 */
export function LayoutRenderer({
  layout,
  wiring,
  scope,
  params = {},
  safeMode = true,
  className,
}: LayoutRendererProps): React.ReactElement {
  const Renderer = safeMode ? SafeBlockRenderer : BlockRenderer;

  switch (layout.type) {
    case 'single':
      return (
        <SingleLayoutRenderer
          layout={layout}
          wiring={wiring}
          scope={scope}
          params={params}
          Renderer={Renderer}
          {...(className !== undefined && { className })}
        />
      );

    case 'split':
      return (
        <SplitLayoutRenderer
          layout={layout}
          wiring={wiring}
          scope={scope}
          params={params}
          safeMode={safeMode}
          {...(className !== undefined && { className })}
        />
      );

    case 'stack':
      return (
        <StackLayoutRenderer
          layout={layout}
          wiring={wiring}
          scope={scope}
          params={params}
          Renderer={Renderer}
          {...(className !== undefined && { className })}
        />
      );

    case 'tabs':
      return (
        <TabsLayoutRenderer
          layout={layout}
          wiring={wiring}
          scope={scope}
          params={params}
          safeMode={safeMode}
          {...(className !== undefined && { className })}
        />
      );

    case 'grid':
      return (
        <GridLayoutRenderer
          layout={layout}
          wiring={wiring}
          scope={scope}
          params={params}
          safeMode={safeMode}
          {...(className !== undefined && { className })}
        />
      );

    default:
      return (
        <div className="layout-error" style={layoutErrorStyle}>
          Unknown layout type: {(layout as { type: string }).type}
        </div>
      );
  }
}

// =============================================================================
// SINGLE LAYOUT
// =============================================================================

interface SingleLayoutRendererProps {
  layout: SingleLayout;
  wiring: WiringManager;
  scope: BindingScope;
  params: Record<string, string>;
  Renderer: typeof BlockRenderer | typeof SafeBlockRenderer;
  className?: string;
}

function SingleLayoutRenderer({
  layout,
  wiring,
  scope,
  params,
  Renderer,
  className,
}: SingleLayoutRendererProps): React.ReactElement {
  const config = buildBlockConfig(layout.block, params);

  return (
    <div className={className} style={singleStyle}>
      <Renderer config={config} wiring={wiring} scope={scope} />
    </div>
  );
}

// =============================================================================
// SPLIT LAYOUT
// =============================================================================

interface SplitLayoutRendererProps {
  layout: SplitLayout;
  wiring: WiringManager;
  scope: BindingScope;
  params: Record<string, string>;
  safeMode: boolean;
  className?: string;
}

function SplitLayoutRenderer({
  layout,
  wiring,
  scope,
  params,
  safeMode,
  className,
}: SplitLayoutRendererProps): React.ReactElement {
  const { direction, sizes, panels } = layout;
  const isHorizontal = direction === 'horizontal';
  const Renderer = safeMode ? SafeBlockRenderer : BlockRenderer;

  // Calculate flex basis for each panel
  const panelSizes = useMemo(() => {
    if (!sizes || sizes.length === 0) {
      // Equal distribution
      return panels.map(() => `${100 / panels.length}%`);
    }
    return sizes.map((size) => {
      if (typeof size === 'number') {
        return `${size}%`;
      }
      return size;
    });
  }, [sizes, panels.length]);

  const containerStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: isHorizontal ? 'row' : 'column',
    height: '100%',
    width: '100%',
    gap: '1px',
    backgroundColor: '#e5e7eb',
  };

  return (
    <div className={`layout-split ${className ?? ''}`} style={containerStyle}>
      {panels.map((panel, index) => {
        const panelStyle: React.CSSProperties = {
          flex: `0 0 ${panelSizes[index]}`,
          overflow: 'auto',
          backgroundColor: '#ffffff',
          padding: '1rem',
        };

        return (
          <div
            key={panel.id ?? `panel-${index}`}
            className="layout-split-panel"
            style={panelStyle}
          >
            {/* Nested layout */}
            {panel.layout && (
              <LayoutRenderer
                layout={panel.layout}
                wiring={wiring}
                scope={scope}
                params={params}
                safeMode={safeMode}
              />
            )}

            {/* Block list */}
            {panel.blocks && !panel.layout && (
              <div style={blockListStyle}>
                {panel.blocks.map((block, blockIndex) => {
                  const config = buildBlockConfig(block, params);
                  return (
                    <Renderer
                      key={block.id ?? `block-${blockIndex}`}
                      config={config}
                      wiring={wiring}
                      scope={scope}
                    />
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// =============================================================================
// STACK LAYOUT
// =============================================================================

interface StackLayoutRendererProps {
  layout: StackLayout;
  wiring: WiringManager;
  scope: BindingScope;
  params: Record<string, string>;
  Renderer: typeof BlockRenderer | typeof SafeBlockRenderer;
  className?: string;
}

function StackLayoutRenderer({
  layout,
  wiring,
  scope,
  params,
  Renderer,
  className,
}: StackLayoutRendererProps): React.ReactElement {
  const { direction = 'vertical', gap = '1rem', blocks } = layout;
  const isVertical = direction === 'vertical';

  const containerStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: isVertical ? 'column' : 'row',
    gap,
    width: '100%',
  };

  return (
    <div className={`layout-stack ${className ?? ''}`} style={containerStyle}>
      {blocks.map((block, index) => {
        const config = buildBlockConfig(block, params);
        return (
          <div
            key={block.id ?? `block-${index}`}
            className="layout-stack-item"
            style={stackItemStyle}
          >
            <Renderer config={config} wiring={wiring} scope={scope} />
          </div>
        );
      })}
    </div>
  );
}

// =============================================================================
// TABS LAYOUT
// =============================================================================

interface TabsLayoutRendererProps {
  layout: TabsLayout;
  wiring: WiringManager;
  scope: BindingScope;
  params: Record<string, string>;
  safeMode: boolean;
  className?: string;
}

function TabsLayoutRenderer({
  layout,
  wiring,
  scope,
  params,
  safeMode,
  className,
}: TabsLayoutRendererProps): React.ReactElement {
  const { tabs, defaultTab, position = 'top' } = layout;
  const Renderer = safeMode ? SafeBlockRenderer : BlockRenderer;

  // Determine initial tab
  const initialTab = useMemo(() => {
    if (typeof defaultTab === 'number') {
      return defaultTab;
    }
    if (typeof defaultTab === 'string') {
      const index = tabs.findIndex((t) => t.id === defaultTab);
      return index >= 0 ? index : 0;
    }
    return 0;
  }, [defaultTab, tabs]);

  const [activeTab, setActiveTab] = useState(initialTab);

  const handleTabClick = useCallback((index: number) => {
    setActiveTab(index);
  }, []);

  const isVertical = position === 'left' || position === 'right';
  const isReversed = position === 'bottom' || position === 'right';

  const containerStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: isVertical
      ? (isReversed ? 'row-reverse' : 'row')
      : (isReversed ? 'column-reverse' : 'column'),
    height: '100%',
    width: '100%',
  };

  const tabListStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: isVertical ? 'column' : 'row',
    gap: '0.25rem',
    padding: '0.5rem',
    backgroundColor: '#f9fafb',
    borderBottom: !isVertical ? '1px solid #e5e7eb' : undefined,
    borderRight: isVertical && !isReversed ? '1px solid #e5e7eb' : undefined,
    borderLeft: isVertical && isReversed ? '1px solid #e5e7eb' : undefined,
  };

  const activeTabConfig = tabs[activeTab];

  return (
    <div className={`layout-tabs ${className ?? ''}`} style={containerStyle}>
      {/* Tab list */}
      <div className="layout-tabs-list" style={tabListStyle}>
        {tabs.map((tab, index) => {
          const isActive = index === activeTab;
          const tabStyle: React.CSSProperties = {
            padding: '0.5rem 1rem',
            cursor: 'pointer',
            borderRadius: '0.375rem',
            backgroundColor: isActive ? '#ffffff' : 'transparent',
            color: isActive ? '#1f2937' : '#6b7280',
            fontWeight: isActive ? 500 : 400,
            boxShadow: isActive ? '0 1px 2px rgba(0,0,0,0.05)' : undefined,
            transition: 'all 0.15s ease',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
          };

          return (
            <button
              key={tab.id ?? `tab-${index}`}
              type="button"
              className={`layout-tab ${isActive ? 'active' : ''}`}
              style={tabStyle}
              onClick={() => handleTabClick(index)}
            >
              {tab.icon && <span className="tab-icon">{tab.icon}</span>}
              <span className="tab-label">{tab.label}</span>
              {tab.badge !== undefined && (
                <span
                  className="tab-badge"
                  style={tabBadgeStyle}
                >
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      <div className="layout-tabs-content" style={tabContentStyle}>
        {activeTabConfig && (
          <>
            {/* Nested layout */}
            {activeTabConfig.layout && (
              <LayoutRenderer
                layout={activeTabConfig.layout}
                wiring={wiring}
                scope={scope}
                params={params}
                safeMode={safeMode}
              />
            )}

            {/* Single block */}
            {activeTabConfig.block && !activeTabConfig.layout && (
              <Renderer
                config={buildBlockConfig(activeTabConfig.block, params)}
                wiring={wiring}
                scope={scope}
              />
            )}

            {/* Multiple blocks */}
            {activeTabConfig.blocks && !activeTabConfig.layout && !activeTabConfig.block && (
              <div style={blockListStyle}>
                {activeTabConfig.blocks.map((block, blockIndex) => {
                  const config = buildBlockConfig(block, params);
                  return (
                    <Renderer
                      key={block.id ?? `block-${blockIndex}`}
                      config={config}
                      wiring={wiring}
                      scope={scope}
                    />
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// =============================================================================
// GRID LAYOUT
// =============================================================================

interface GridLayoutRendererProps {
  layout: GridLayout;
  wiring: WiringManager;
  scope: BindingScope;
  params: Record<string, string>;
  safeMode: boolean;
  className?: string;
}

function GridLayoutRenderer({
  layout,
  wiring,
  scope,
  params,
  safeMode,
  className,
}: GridLayoutRendererProps): React.ReactElement {
  const { columns, gap = '1rem', rows } = layout;
  const Renderer = safeMode ? SafeBlockRenderer : BlockRenderer;

  const containerStyle: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: `repeat(${columns}, 1fr)`,
    gap,
    width: '100%',
  };

  return (
    <div className={`layout-grid ${className ?? ''}`} style={containerStyle}>
      {rows.flatMap((row, rowIndex) =>
        row.cells.map((cell, cellIndex) => {
          const cellStyle: React.CSSProperties = {
            gridColumn: cell.colspan ? `span ${cell.colspan}` : undefined,
            gridRow: cell.rowspan ? `span ${cell.rowspan}` : undefined,
            minHeight: row.height,
          };

          return (
            <div
              key={`cell-${rowIndex}-${cellIndex}`}
              className="layout-grid-cell"
              style={cellStyle}
            >
              {/* Nested layout */}
              {cell.layout && (
                <LayoutRenderer
                  layout={cell.layout}
                  wiring={wiring}
                  scope={scope}
                  params={params}
                  safeMode={safeMode}
                />
              )}

              {/* Single block */}
              {cell.block && !cell.layout && (
                <Renderer
                  config={buildBlockConfig(cell.block, params)}
                  wiring={wiring}
                  scope={scope}
                />
              )}
            </div>
          );
        })
      )}
    </div>
  );
}

// =============================================================================
// HELPERS
// =============================================================================

/**
 * Build a BlockConfig from a BlockPlacement, resolving route params.
 */
function buildBlockConfig(
  block: BlockPlacement,
  params: Record<string, string>
): BlockConfig {
  const config: BlockConfig = {
    block: block.type,
    ...(block.id !== undefined && { id: block.id }),
    ...resolveRouteParams(block.props, params),
  };
  return config;
}

/**
 * Resolve $route.params references in props.
 */
function resolveRouteParams(
  props: Record<string, unknown>,
  params: Record<string, string>
): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(props)) {
    result[key] = resolveValue(value, params);
  }

  return result;
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
    // Template strings like "${$route.params.id}"
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
// STYLES
// =============================================================================

const singleStyle: React.CSSProperties = {
  width: '100%',
  height: '100%',
};

const blockListStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '1rem',
};

const stackItemStyle: React.CSSProperties = {
  flex: '0 0 auto',
};

const tabContentStyle: React.CSSProperties = {
  flex: 1,
  overflow: 'auto',
  padding: '1rem',
};

const tabBadgeStyle: React.CSSProperties = {
  fontSize: '0.75rem',
  backgroundColor: '#e5e7eb',
  color: '#374151',
  padding: '0.125rem 0.5rem',
  borderRadius: '9999px',
};

const layoutErrorStyle: React.CSSProperties = {
  padding: '1rem',
  backgroundColor: '#fef3c7',
  color: '#92400e',
  borderRadius: '0.375rem',
  border: '1px solid #fcd34d',
};

// =============================================================================
// EXPORTS
// =============================================================================

export {
  buildBlockConfig,
  resolveRouteParams,
  resolveValue,
};
