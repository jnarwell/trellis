/**
 * Trellis ModalBlock - Type Definitions
 *
 * Container block that displays content in an overlay dialog.
 */

import type { EntityId } from '@trellis/kernel';
import type { BlockConfig } from '../BlockRenderer.js';

// =============================================================================
// CONFIGURATION TYPES
// =============================================================================

/**
 * Modal action button configuration.
 */
export interface ModalAction {
  /** Button label */
  readonly label: string;

  /** Visual variant */
  readonly variant?: 'primary' | 'secondary' | 'danger';

  /** Action type */
  readonly action: 'close' | 'submit' | 'emit';

  /** Event name to emit (for 'emit' action) */
  readonly event?: string;
}

/**
 * Configuration for ModalBlock (from YAML).
 */
export interface ModalBlockConfig {
  /** Block type identifier (required) */
  readonly block: 'modal';

  /** How to open the modal */
  readonly trigger: 'button' | 'event';

  /** Button text when trigger is 'button' */
  readonly triggerLabel?: string;

  /** Event name to listen for when trigger is 'event' */
  readonly triggerEvent?: string;

  /** Modal header title */
  readonly title?: string;

  /** Modal size */
  readonly size?: 'small' | 'medium' | 'large' | 'fullscreen';

  /** Show close X button */
  readonly closable?: boolean;

  /** Close on overlay click */
  readonly closeOnOverlay?: boolean;

  /** Child blocks to render in modal body */
  readonly blocks: readonly BlockConfig[];

  /** Footer action buttons */
  readonly actions?: readonly ModalAction[];
}

// =============================================================================
// COMPONENT PROPS
// =============================================================================

/**
 * Props for ModalBlock component.
 */
export interface ModalBlockProps {
  /** Block configuration */
  readonly config: ModalBlockConfig;

  /** Entity ID (may be passed to child blocks) */
  readonly entityId?: EntityId;

  /** Event handler callback */
  readonly onEvent?: (event: ModalBlockEvent) => void;

  /** Additional CSS class */
  readonly className?: string;
}

// =============================================================================
// EVENT TYPES
// =============================================================================

/**
 * Events emitted by ModalBlock.
 */
export type ModalBlockEvent =
  | { type: 'opened' }
  | { type: 'closed'; reason: 'button' | 'overlay' | 'escape' | 'action' }
  | { type: 'submit' }
  | { type: 'custom'; event: string; payload?: unknown }
  | { type: 'error'; error: Error };

// =============================================================================
// INTERNAL STATE
// =============================================================================

/**
 * Internal state for ModalBlock.
 */
export interface ModalBlockState {
  /** Whether the modal is currently open */
  readonly isOpen: boolean;
}
