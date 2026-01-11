/**
 * Trellis FormBlock - Public Exports
 *
 * Form block for creating and editing entities.
 */

// Main component
export { FormBlock } from './FormBlock.js';

// Sub-components
export { FormField } from './FormField.js';
export { FormActions } from './FormActions.js';
export { ConflictDialog } from './ConflictDialog.js';

// Field components
export {
  TextField,
  TextAreaField,
  NumberField,
  BooleanField,
  DateField,
  SelectField,
  RelationField,
  FieldComponents,
  getFieldComponent,
} from './fields/index.js';

// Hooks
export { useForm, useField } from './hooks.js';

// Validation
export { validateField, validateForm } from './validation.js';

// Types
export type {
  // Field types
  FieldType,
  FieldConfig,
  SelectOption,

  // Form configuration
  FormBlockConfig,
  FormAction,

  // Form state
  FormState,
  FieldState,

  // Hook types
  UseFormOptions,
  UseFormReturn,
  UseFieldOptions,
  UseFieldReturn,
  FieldRegistration,

  // Component props
  FormBlockProps,
  FormFieldProps,
  FormActionsProps,
  BaseFieldProps,
} from './types.js';

// Value utilities
export {
  extractValue,
  valuesToProperties,
  entityToValues,
} from './types.js';
