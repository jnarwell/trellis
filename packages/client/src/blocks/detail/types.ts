/**
 * Trellis DetailBlock - Type Definitions
 */

import type { Entity, EntityId, PropertyName } from '@trellis/kernel';

// =============================================================================
// CONFIGURATION TYPES
// =============================================================================

/**
 * Field display format options.
 */
export type FieldFormat =
  | 'text'
  | 'number'
  | 'currency'
  | 'datetime'
  | 'date'
  | 'time'
  | 'boolean'
  | 'badge'
  | 'link';

/**
 * Configuration for a single field in a detail section.
 */
export interface DetailFieldConfig {
  /** Property name on the entity */
  property: PropertyName;
  /** Display label (defaults to property name) */
  label?: string;
  /** How to format the value */
  format?: FieldFormat;
  /** Text to show when value is empty/undefined */
  emptyText?: string;
  /** Click handler event name */
  onClick?: string;
  /** Additional CSS class */
  className?: string;
}

/**
 * Configuration for a section of fields.
 */
export interface DetailSectionConfig {
  /** Section title */
  title: string;
  /** Fields in this section */
  fields: DetailFieldConfig[];
  /** Whether section can be collapsed */
  collapsible?: boolean;
  /** Start collapsed */
  defaultCollapsed?: boolean;
  /** Additional CSS class */
  className?: string;
}

/**
 * Configuration for an action button.
 */
export interface DetailActionConfig {
  /** Button label */
  label: string;
  /** Event name to emit */
  event: string;
  /** Navigation target (template string) */
  target?: string;
  /** Show confirmation dialog */
  confirm?: boolean;
  /** Confirmation message */
  confirmMessage?: string;
  /** Button variant */
  variant?: 'primary' | 'secondary' | 'danger';
  /** Disable condition (expression) */
  disabled?: string;
  /** Additional CSS class */
  className?: string;
}

// =============================================================================
// COMPONENT PROPS
// =============================================================================

/**
 * Props for DetailBlock component.
 */
export interface DetailBlockProps {
  /** Entity ID to display */
  entityId: EntityId;
  /** Entity type (for validation, optional) */
  source?: string;
  /** Sections to display */
  sections: DetailSectionConfig[];
  /** Action buttons */
  actions?: DetailActionConfig[];
  /** Event handler */
  onEvent?: (event: DetailBlockEvent) => void;
  /** Additional CSS class */
  className?: string;
}

/**
 * Props for DetailSection component.
 */
export interface DetailSectionProps {
  /** Section configuration */
  config: DetailSectionConfig;
  /** Entity data */
  entity: Entity;
  /** Field click handler */
  onFieldClick?: (property: PropertyName) => void;
}

/**
 * Props for DetailField component.
 */
export interface DetailFieldProps {
  /** Field configuration */
  config: DetailFieldConfig;
  /** The property value */
  value: unknown;
  /** Click handler */
  onClick?: () => void;
}

/**
 * Props for DetailActions component.
 */
export interface DetailActionsProps {
  /** Action configurations */
  actions: DetailActionConfig[];
  /** Entity data */
  entity: Entity;
  /** Action click handler */
  onAction: (action: DetailActionConfig) => void;
}

// =============================================================================
// EVENT TYPES
// =============================================================================

/**
 * Events emitted by DetailBlock.
 */
export type DetailBlockEvent =
  | { type: 'actionClicked'; action: string; entity: Entity }
  | { type: 'fieldClicked'; property: PropertyName; entity: Entity }
  | { type: 'navigate'; target: string; entity: Entity }
  | { type: 'delete'; entity: Entity }
  | { type: 'entityLoaded'; entity: Entity }
  | { type: 'error'; error: Error };

// =============================================================================
// UTILITY TYPES
// =============================================================================

/**
 * Result of extracting a property value.
 */
export interface PropertyValueResult {
  value: unknown;
  type: string | undefined;
  source: string | undefined;
}
