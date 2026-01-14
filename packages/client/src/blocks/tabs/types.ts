/**
 * Trellis TabsBlock - Type Definitions
 *
 * Container block that shows one child block at a time with tab navigation.
 */

import type { EntityId } from '@trellis/kernel';
import type { BlockConfig } from '../BlockRenderer.js';

// =============================================================================
// CONFIGURATION TYPES
// =============================================================================

/**
 * Configuration for a single tab.
 */
export interface TabConfig {
  /** Unique tab identifier */
  readonly id: string;

  /** Display label for the tab */
  readonly label: string;

  /** Optional icon name */
  readonly icon?: string;

  /** Badge count or text */
  readonly badge?: string | number;

  /** Whether the tab is disabled */
  readonly disabled?: boolean;

  /** Child blocks to render when this tab is active */
  readonly blocks: readonly BlockConfig[];
}

/**
 * Configuration for TabsBlock (from YAML).
 */
export interface TabsBlockConfig {
  /** Block type identifier (required) */
  readonly block: 'tabs';

  /** Array of tab configurations */
  readonly tabs: readonly TabConfig[];

  /** Tab ID to show initially */
  readonly defaultTab?: string;

  /** Visual variant */
  readonly variant?: 'default' | 'pills' | 'underline';

  /** Position of tab navigation */
  readonly position?: 'top' | 'left';
}

// =============================================================================
// COMPONENT PROPS
// =============================================================================

/**
 * Props for TabsBlock component.
 */
export interface TabsBlockProps {
  /** Block configuration */
  readonly config: TabsBlockConfig;

  /** Entity ID (may be passed to child blocks) */
  readonly entityId?: EntityId;

  /** Event handler callback */
  readonly onEvent?: (event: TabsBlockEvent) => void;

  /** Additional CSS class */
  readonly className?: string;
}

// =============================================================================
// EVENT TYPES
// =============================================================================

/**
 * Events emitted by TabsBlock.
 */
export type TabsBlockEvent =
  | { type: 'tabChanged'; tabId: string; previousTabId: string | null }
  | { type: 'error'; error: Error };

// =============================================================================
// INTERNAL STATE
// =============================================================================

/**
 * Internal state for TabsBlock.
 */
export interface TabsBlockState {
  /** Currently active tab ID */
  readonly activeTabId: string;
}