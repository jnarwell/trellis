/**
 * Trellis FormBlock - Field Components
 *
 * Export all field input components.
 */

export { TextField } from './TextField.js';
export { TextAreaField } from './TextAreaField.js';
export { NumberField } from './NumberField.js';
export { BooleanField } from './BooleanField.js';
export { DateField } from './DateField.js';
export { SelectField } from './SelectField.js';
export { RelationField } from './RelationField.js';

import type React from 'react';
import type { FieldType, BaseFieldProps } from '../types.js';
import { TextField } from './TextField.js';
import { TextAreaField } from './TextAreaField.js';
import { NumberField } from './NumberField.js';
import { BooleanField } from './BooleanField.js';
import { DateField } from './DateField.js';
import { SelectField } from './SelectField.js';
import { RelationField } from './RelationField.js';

/**
 * Map of field types to components.
 */
export const FieldComponents: Record<
  FieldType,
  React.ComponentType<BaseFieldProps>
> = {
  text: TextField,
  textarea: TextAreaField,
  number: NumberField,
  boolean: BooleanField,
  date: DateField,
  datetime: DateField,
  select: SelectField,
  relation: RelationField,
};

/**
 * Get the appropriate field component for a field type.
 */
export function getFieldComponent(
  type: FieldType
): React.ComponentType<BaseFieldProps> {
  return FieldComponents[type] ?? TextField;
}
