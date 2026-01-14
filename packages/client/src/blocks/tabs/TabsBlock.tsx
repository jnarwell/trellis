/**
 * Trellis TabsBlock - Main Component
 *
 * A container block that displays child blocks in tabbed panels.
 * Supports keyboard navigation and multiple visual variants.
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useOptionalBlockContext } from '../BlockProvider.js';
import { BlockRenderer } from '../BlockRenderer.js';
import type { TabsBlockProps, TabsBlockEvent, TabConfig } from './types.js';
import { styles, tabsTheme } from './styles.js';

// =============================================================================
// STATE COMPONENTS
// =============================================================================

const TabsLoading: React.FC = () => (
  <div
    className="tabs-block tabs-block--loading"
    style={{ ...tabsTheme, ...styles['container'], ...styles['loading'] }}
    data-testid="tabs-loading"
  >
    <div style={styles['loadingSpinner']} />
    <span>Loading...</span>
  </div>
);

const TabsError: React.FC<{ error: Error }> = ({ error }) => (
  <div
    className="tabs-block tabs-block--error"
    style={{ ...tabsTheme, ...styles['container'] }}
    data-testid="tabs-error"
  >
    <div style={styles['error']}>
      <span>Error: {error.message}</span>
    </div>
  </div>
);

const TabsEmpty: React.FC = () => (
  <div
    className="tabs-block tabs-block--empty"
    style={{ ...tabsTheme, ...styles['container'], ...styles['empty'] }}
    data-testid="tabs-empty"
  >
    <span>No tabs configured</span>
  </div>
);

// =============================================================================
// TAB BUTTON COMPONENT
// =============================================================================

interface TabButtonProps {
  tab: TabConfig;
  isActive: boolean;
  variant: 'default' | 'pills' | 'underline';
  onClick: () => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
  tabRef: React.RefObject<HTMLButtonElement>;
}

const TabButton: React.FC<TabButtonProps> = ({
  tab,
  isActive,
  variant,
  onClick,
  onKeyDown,
  tabRef,
}) => {
  const [isHovered, setIsHovered] = useState(false);

  // Build style based on state and variant
  const getTabStyle = (): React.CSSProperties => {
    let style: React.CSSProperties = { ...styles['tab'] };

    // Apply variant-specific base styles
    if (variant === 'pills') {
      style = { ...style, ...styles['tabPills'] };
    } else if (variant === 'underline') {
      style = { ...style, ...styles['tabUnderline'] };
    }

    // Apply state styles
    if (tab.disabled) {
      style = { ...style, ...styles['tabDisabled'] };
    } else if (isActive) {
      if (variant === 'pills') {
        style = { ...style, ...styles['tabPillsActive'] };
      } else if (variant === 'underline') {
        style = { ...style, ...styles['tabActive'], ...styles['tabUnderlineActive'] };
      } else {
        style = { ...style, ...styles['tabActive'] };
      }
    } else if (isHovered) {
      style = { ...style, ...styles['tabHover'] };
    }

    return style;
  };

  return (
    <button
      ref={tabRef}
      type="button"
      role="tab"
      id={`tab-${tab.id}`}
      aria-selected={isActive}
      aria-controls={`panel-${tab.id}`}
      aria-disabled={tab.disabled}
      tabIndex={isActive ? 0 : -1}
      style={getTabStyle()}
      onClick={onClick}
      onKeyDown={onKeyDown}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      disabled={tab.disabled}
      data-testid={`tab-${tab.id}`}
    >
      {tab.icon && <span className="tabs-block__icon">{tab.icon}</span>}
      <span>{tab.label}</span>
      {tab.badge !== undefined && tab.badge !== null && (
        <span style={styles['badge']} data-testid={`tab-badge-${tab.id}`}>
          {tab.badge}
        </span>
      )}
    </button>
  );
};

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export const TabsBlock: React.FC<TabsBlockProps> = ({
  config,
  entityId,
  onEvent,
  className,
}) => {
  // Get block context for rendering child blocks
  const blockContext = useOptionalBlockContext();

  // GUARD: Config must have tabs array
  const tabs = config.tabs ?? [];

  // Determine initial active tab
  const getInitialTab = (): string => {
    if (config.defaultTab && tabs.some(t => t.id === config.defaultTab)) {
      return config.defaultTab;
    }
    // Find first non-disabled tab
    const firstEnabled = tabs.find(t => !t.disabled);
    return firstEnabled?.id ?? tabs[0]?.id ?? '';
  };

  const [activeTabId, setActiveTabId] = useState<string>(getInitialTab);
  const tabRefs = useRef<Map<string, React.RefObject<HTMLButtonElement>>>(new Map());

  // Ensure we have refs for all tabs
  tabs.forEach(tab => {
    if (!tabRefs.current.has(tab.id)) {
      tabRefs.current.set(tab.id, React.createRef<HTMLButtonElement>());
    }
  });

  // Get active tab configuration
  const activeTab = tabs.find(t => t.id === activeTabId);

  // Handle tab change
  const handleTabChange = useCallback(
    (newTabId: string) => {
      const tab = tabs.find(t => t.id === newTabId);
      if (!tab || tab.disabled) return;

      const previousTabId = activeTabId;
      setActiveTabId(newTabId);

      console.log('[TabsBlock] Tab changed:', { from: previousTabId, to: newTabId });

      onEvent?.({
        type: 'tabChanged',
        tabId: newTabId,
        previousTabId,
      });
    },
    [activeTabId, tabs, onEvent]
  );

  // Keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      const enabledTabs = tabs.filter(t => !t.disabled);
      const currentIndex = enabledTabs.findIndex(t => t.id === activeTabId);
      const isVertical = config.position === 'left';

      let newIndex: number | null = null;

      switch (e.key) {
        case 'ArrowRight':
          if (!isVertical) {
            e.preventDefault();
            newIndex = (currentIndex + 1) % enabledTabs.length;
          }
          break;
        case 'ArrowLeft':
          if (!isVertical) {
            e.preventDefault();
            newIndex = (currentIndex - 1 + enabledTabs.length) % enabledTabs.length;
          }
          break;
        case 'ArrowDown':
          if (isVertical) {
            e.preventDefault();
            newIndex = (currentIndex + 1) % enabledTabs.length;
          }
          break;
        case 'ArrowUp':
          if (isVertical) {
            e.preventDefault();
            newIndex = (currentIndex - 1 + enabledTabs.length) % enabledTabs.length;
          }
          break;
        case 'Home':
          e.preventDefault();
          newIndex = 0;
          break;
        case 'End':
          e.preventDefault();
          newIndex = enabledTabs.length - 1;
          break;
      }

      if (newIndex !== null) {
        const newTab = enabledTabs[newIndex];
        if (newTab) {
          handleTabChange(newTab.id);
          // Focus the new tab
          tabRefs.current.get(newTab.id)?.current?.focus();
        }
      }
    },
    [activeTabId, tabs, config.position, handleTabChange]
  );

  // ==========================================================================
  // RENDER GUARDS
  // ==========================================================================

  // GUARD: Empty tabs array
  if (tabs.length === 0) {
    return <TabsEmpty />;
  }

  // GUARD: No block context (can't render child blocks)
  if (!blockContext) {
    return (
      <TabsError error={new Error('TabsBlock must be used within a BlockProvider')} />
    );
  }

  // ==========================================================================
  // MAIN RENDER
  // ==========================================================================

  const variant = config.variant ?? 'default';
  const position = config.position ?? 'top';
  const isVertical = position === 'left';

  const containerStyle: React.CSSProperties = {
    ...tabsTheme,
    ...styles['container'],
    ...(isVertical ? styles['containerLeft'] : {}),
  };

  const navStyle: React.CSSProperties = {
    ...styles['nav'],
    ...(isVertical ? styles['navLeft'] : {}),
  };

  const tabListStyle: React.CSSProperties = {
    ...styles['tabList'],
    ...(isVertical ? styles['tabListLeft'] : {}),
  };

  return (
    <div
      className={`tabs-block tabs-block--${variant} tabs-block--${position} ${className ?? ''}`}
      style={containerStyle}
      data-testid="tabs-block"
    >
      {/* Tab Navigation */}
      <div style={navStyle} role="navigation" aria-label="Tabs">
        <div role="tablist" style={tabListStyle} aria-orientation={isVertical ? 'vertical' : 'horizontal'}>
          {tabs.map(tab => (
            <TabButton
              key={tab.id}
              tab={tab}
              isActive={tab.id === activeTabId}
              variant={variant}
              onClick={() => handleTabChange(tab.id)}
              onKeyDown={handleKeyDown}
              tabRef={tabRefs.current.get(tab.id) ?? React.createRef()}
            />
          ))}
        </div>
      </div>

      {/* Tab Panels */}
      <div style={styles['content']}>
        {tabs.map(tab => {
          const isActive = tab.id === activeTabId;
          const panelStyle: React.CSSProperties = {
            ...styles['panel'],
            ...(isActive ? {} : styles['panelHidden']),
          };

          return (
            <div
              key={tab.id}
              id={`panel-${tab.id}`}
              role="tabpanel"
              aria-labelledby={`tab-${tab.id}`}
              hidden={!isActive}
              style={panelStyle}
              data-testid={`panel-${tab.id}`}
            >
              {isActive && (
                <>
                  {(tab.blocks ?? []).map((block, index) => (
                    <BlockRenderer
                      key={block.id ?? `block-${index}`}
                      config={block}
                      wiring={blockContext.wiring}
                      scope={blockContext.scope}
                    />
                  ))}
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default TabsBlock;
