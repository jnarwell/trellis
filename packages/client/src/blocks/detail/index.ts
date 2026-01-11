/**
 * Trellis DetailBlock - Public Exports
 */

// Main component
export { DetailBlock, default } from './DetailBlock.js';

// Sub-components
export { DetailSection } from './DetailSection.js';
export { DetailField } from './DetailField.js';
export { DetailActions } from './DetailActions.js';

// Types
export type {
  DetailBlockProps,
  DetailSectionProps,
  DetailFieldProps,
  DetailActionsProps,
  DetailSectionConfig,
  DetailFieldConfig,
  DetailActionConfig,
  DetailBlockEvent,
  FieldFormat,
} from './types.js';

// Styles (for customization)
export { styles as detailStyles, detailTheme, getBadgeStyle } from './styles.js';
