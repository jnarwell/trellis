/**
 * Trellis FormBlock - Type Definitions
 *
 * Types for form configuration, field state, and validation.
 */

import type {
  EntityId,
  Entity,
  PropertyName,
  TypePath,
  Value,
  ValueType,
  ReferenceValue,
} from '@trellis/kernel';

// =============================================================================
// FIELD CONFIGURATION
// =============================================================================

/**
 * Field types supported by FormBlock.
 */
export type FieldType =
  | 'text'
  | 'textarea'
  | 'number'
  | 'boolean'
  | 'date'
  | 'datetime'
  | 'select'
  | 'relation';

/**
 * Select option for enum/select fields.
 */
export interface SelectOption {
  readonly value: string | number;
  readonly label: string;
  readonly disabled?: boolean;
}

/**
 * Configuration for a single form field.
 */
export interface FieldConfig {
  /** Property name on the entity */
  readonly property: PropertyName;

  /** Display label (defaults to property name) */
  readonly label?: string;

  /** Field type override (auto-detected from value type if not specified) */
  readonly type?: FieldType;

  /** Whether field is required */
  readonly required?: boolean;

  /** Placeholder text */
  readonly placeholder?: string;

  /** Help text displayed below field */
  readonly helpText?: string;

  /** Whether field is disabled */
  readonly disabled?: boolean;

  /** Whether field is read-only */
  readonly readOnly?: boolean;

  // Number field options
  /** Minimum value for number fields */
  readonly min?: number;
  /** Maximum value for number fields */
  readonly max?: number;
  /** Step for number fields */
  readonly step?: number;
  /** Number format (e.g., 'currency', 'percent') */
  readonly format?: string;

  // Text field options
  /** Maximum length for text fields */
  readonly maxLength?: number;
  /** Minimum length for text fields */
  readonly minLength?: number;
  /** Regex pattern for validation */
  readonly pattern?: string;

  // Textarea options
  /** Number of rows for textarea */
  readonly rows?: number;

  // Select options
  /** Options for select fields */
  readonly options?: readonly SelectOption[];

  // Relation field options
  /** Target entity type for relation fields */
  readonly target?: TypePath;
  /** Property to display for related entities */
  readonly display?: PropertyName;
  /** Allow multiple selections */
  readonly multiple?: boolean;

  // Validation
  /** Custom validation function */
  readonly validate?: (value: unknown) => string | null;
}

// =============================================================================
// FORM CONFIGURATION
// =============================================================================

/**
 * Form action configuration.
 */
export interface FormAction {
  /** Action type */
  readonly type: 'submit' | 'cancel' | 'reset' | 'custom';
  /** Button label */
  readonly label: string;
  /** Event to emit on click */
  readonly event?: string;
  /** Navigation target for cancel */
  readonly target?: string;
  /** Whether button is disabled */
  readonly disabled?: boolean;
  /** Button variant */
  readonly variant?: 'primary' | 'secondary' | 'danger';
}

/**
 * FormBlock configuration (from YAML).
 */
export interface FormBlockConfig {
  /** Block type identifier */
  readonly block: 'form';

  /** Entity type to create/edit */
  readonly source: TypePath;

  /** Form mode */
  readonly mode: 'create' | 'edit';

  /** Entity ID for edit mode */
  readonly entityId?: EntityId;

  /** Field configurations */
  readonly fields: readonly FieldConfig[];

  /** Form actions */
  readonly actions?: {
    readonly submit?: FormAction;
    readonly cancel?: FormAction;
  };
}

// =============================================================================
// FORM STATE
// =============================================================================

/**
 * State for a single field.
 */
export interface FieldState {
  /** Current field value */
  readonly value: unknown;
  /** Initial value (for dirty checking) */
  readonly initialValue: unknown;
  /** Whether field has been modified */
  readonly isDirty: boolean;
  /** Whether field has been touched (blurred) */
  readonly isTouched: boolean;
  /** Validation error message */
  readonly error: string | null;
  /** Whether field is currently being validated */
  readonly isValidating: boolean;
}

/**
 * Complete form state.
 */
export interface FormState {
  /** All field values */
  readonly values: Readonly<Record<string, unknown>>;
  /** Field states */
  readonly fields: Readonly<Record<string, FieldState>>;
  /** Whether form has any changes */
  readonly isDirty: boolean;
  /** Whether form is valid */
  readonly isValid: boolean;
  /** Whether form is currently submitting */
  readonly isSubmitting: boolean;
  /** Form-level error */
  readonly submitError: string | null;
  /** Entity version (for optimistic locking) */
  readonly version: number | null;
  /** Whether there's a version conflict */
  readonly hasConflict: boolean;
  /** The conflicting entity (if any) */
  readonly conflictEntity: Entity | null;
}

// =============================================================================
// FORM HOOKS
// =============================================================================

/**
 * Options for useForm hook.
 */
export interface UseFormOptions {
  /** Initial form values */
  readonly defaultValues?: Readonly<Record<string, unknown>>;
  /** Entity version for optimistic locking */
  readonly version?: number;
  /** Validation mode */
  readonly validationMode?: 'onChange' | 'onBlur' | 'onSubmit';
  /** Submit handler */
  readonly onSubmit?: (values: Record<string, unknown>) => Promise<void>;
  /** Success callback */
  readonly onSuccess?: (entity: Entity) => void;
  /** Error callback */
  readonly onError?: (error: Error) => void;
}

/**
 * Return type for useForm hook.
 */
export interface UseFormReturn {
  /** Current form state */
  readonly state: FormState;
  /** Register a field */
  readonly register: (name: string, config?: FieldConfig) => FieldRegistration;
  /** Get field value */
  readonly getValue: (name: string) => unknown;
  /** Set field value */
  readonly setValue: (name: string, value: unknown) => void;
  /** Set multiple values */
  readonly setValues: (values: Record<string, unknown>) => void;
  /** Get field error */
  readonly getError: (name: string) => string | null;
  /** Set field error */
  readonly setError: (name: string, error: string | null) => void;
  /** Mark field as touched */
  readonly touchField: (name: string) => void;
  /** Reset form to initial values */
  readonly reset: (values?: Record<string, unknown>) => void;
  /** Validate all fields */
  readonly validate: () => boolean;
  /** Submit the form */
  readonly handleSubmit: (e?: React.FormEvent) => Promise<void>;
  /** Check if field is dirty */
  readonly isFieldDirty: (name: string) => boolean;
  /** Resolve version conflict by accepting server version */
  readonly resolveConflict: (useServerValues: boolean) => void;
}

/**
 * Field registration returned by register().
 */
export interface FieldRegistration {
  readonly name: string;
  readonly value: unknown;
  readonly onChange: (value: unknown) => void;
  readonly onBlur: () => void;
  readonly error: string | null;
  readonly isTouched: boolean;
  readonly isDirty: boolean;
}

/**
 * Options for useField hook.
 */
export interface UseFieldOptions {
  /** Field name */
  readonly name: string;
  /** Field configuration */
  readonly config: FieldConfig;
  /** Form instance */
  readonly form: UseFormReturn;
}

/**
 * Return type for useField hook.
 */
export interface UseFieldReturn {
  /** Field registration props */
  readonly field: FieldRegistration;
  /** Field state */
  readonly state: FieldState;
  /** Field configuration */
  readonly config: FieldConfig;
  /** Computed label */
  readonly label: string;
  /** Whether field has an error */
  readonly hasError: boolean;
  /** Whether field should show error */
  readonly showError: boolean;
}

// =============================================================================
// COMPONENT PROPS
// =============================================================================

/**
 * Props for FormBlock component.
 */
export interface FormBlockProps {
  /** Form configuration */
  readonly config: FormBlockConfig;
  /** Entity ID for edit mode */
  readonly entityId?: EntityId;
  /** Override mode */
  readonly mode?: 'create' | 'edit';
  /** Callback when form is submitted successfully */
  readonly onSubmit?: (entity: Entity) => void;
  /** Callback when form is cancelled */
  readonly onCancel?: () => void;
  /** Additional CSS class */
  readonly className?: string;
}

/**
 * Props for FormField component.
 */
export interface FormFieldProps {
  /** Field configuration */
  readonly config: FieldConfig;
  /** Form instance */
  readonly form: UseFormReturn;
  /** Additional CSS class */
  readonly className?: string;
}

/**
 * Base props for field input components.
 */
export interface BaseFieldProps {
  /** Field name */
  readonly name: string;
  /** Current value */
  readonly value: unknown;
  /** Change handler */
  readonly onChange: (value: unknown) => void;
  /** Blur handler */
  readonly onBlur: () => void;
  /** Field configuration */
  readonly config: FieldConfig;
  /** Error message */
  readonly error?: string | null;
  /** Whether field is disabled */
  readonly disabled?: boolean;
  /** Additional CSS class */
  readonly className?: string;
}

/**
 * Props for FormActions component.
 */
export interface FormActionsProps {
  /** Form instance */
  readonly form: UseFormReturn;
  /** Submit action config */
  readonly submitAction?: FormAction;
  /** Cancel action config */
  readonly cancelAction?: FormAction;
  /** Cancel callback */
  readonly onCancel?: () => void;
  /** Additional CSS class */
  readonly className?: string;
}

// =============================================================================
// VALUE CONVERSION
// =============================================================================

/**
 * Extract primitive value from Property value structure.
 */
export function extractValue(property: { value: Value } | undefined): unknown {
  if (!property?.value) return undefined;

  const value = property.value;
  switch (value.type) {
    case 'text':
    case 'number':
    case 'boolean':
      return value.value;
    case 'datetime':
      return value.value; // ISO string
    case 'duration':
      return value.value; // ISO duration string
    case 'reference':
      return value.entity_id;
    case 'list':
      return value.values.map((v) => extractValue({ value: v }));
    case 'record':
      return Object.fromEntries(
        Object.entries(value.fields).map(([k, v]) => [k, extractValue({ value: v })])
      );
    default:
      return undefined;
  }
}

/**
 * Convert form values to entity properties for create/update.
 */
export function valuesToProperties(
  values: Record<string, unknown>,
  fields: readonly FieldConfig[]
): Record<PropertyName, { source: 'literal'; value: Value }> {
  const properties: Record<PropertyName, { source: 'literal'; value: Value }> = {};

  for (const field of fields) {
    const value = values[field.property];
    if (value === undefined) continue;

    const converted = convertToValue(value, field);
    if (converted) {
      properties[field.property] = {
        source: 'literal',
        value: converted,
      };
    }
  }

  return properties;
}

/**
 * Convert a single form value to a kernel Value.
 */
function convertToValue(value: unknown, field: FieldConfig): Value | null {
  if (value === null || value === undefined) return null;

  switch (field.type) {
    case 'text':
    case 'textarea':
      return { type: 'text', value: String(value) };

    case 'number':
      return { type: 'number', value: Number(value) };

    case 'boolean':
      return { type: 'boolean', value: Boolean(value) };

    case 'date':
    case 'datetime':
      return { type: 'datetime', value: String(value) };

    case 'select':
      // Could be string or number based on options
      if (typeof value === 'number') {
        return { type: 'number', value };
      }
      return { type: 'text', value: String(value) };

    case 'relation':
      if (field.multiple && Array.isArray(value)) {
        const refValues: Value[] = value.map((id) => {
          const ref: ReferenceValue = {
            type: 'reference',
            entity_id: id as EntityId,
          };
          if (field.target !== undefined) {
            return { ...ref, expected_type: field.target };
          }
          return ref;
        });
        return {
          type: 'list',
          element_type: 'reference',
          values: refValues,
        };
      }
      {
        const ref: ReferenceValue = {
          type: 'reference',
          entity_id: value as EntityId,
        };
        if (field.target !== undefined) {
          return { ...ref, expected_type: field.target };
        }
        return ref;
      }

    default:
      // Default to text
      return { type: 'text', value: String(value) };
  }
}

/**
 * Extract form values from an entity.
 */
export function entityToValues(
  entity: Entity,
  fields: readonly FieldConfig[]
): Record<string, unknown> {
  const values: Record<string, unknown> = {};

  for (const field of fields) {
    const property = entity.properties[field.property];
    if (property && 'value' in property) {
      values[field.property] = extractValue(property as { value: Value });
    }
  }

  return values;
}
