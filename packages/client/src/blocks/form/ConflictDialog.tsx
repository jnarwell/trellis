/**
 * Trellis FormBlock - ConflictDialog Component
 *
 * Dialog for resolving version conflicts during form submission.
 */

import React from 'react';
import type { Entity, Value } from '@trellis/kernel';
import type { UseFormReturn, FieldConfig } from './types.js';
import { extractValue } from './types.js';

export interface ConflictDialogProps {
  /** Form instance */
  readonly form: UseFormReturn;
  /** Field configurations */
  readonly fields: readonly FieldConfig[];
  /** Callback when user resolves conflict */
  readonly onResolve: (useServerValues: boolean) => void;
}

/**
 * ConflictDialog shows version conflict and lets user choose resolution.
 *
 * @example
 * ```tsx
 * {form.state.hasConflict && (
 *   <ConflictDialog
 *     form={form}
 *     fields={fields}
 *     onResolve={(useServer) => form.resolveConflict(useServer)}
 *   />
 * )}
 * ```
 */
export function ConflictDialog({
  form,
  fields,
  onResolve,
}: ConflictDialogProps): React.ReactElement | null {
  const { state } = form;

  if (!state.hasConflict || !state.conflictEntity) {
    return null;
  }

  const conflictEntity = state.conflictEntity;

  // Get changed fields
  const changedFields = fields.filter((field) => {
    const localValue = state.values[field.property];
    const serverProp = conflictEntity.properties[field.property];
    const serverValue = serverProp && 'value' in serverProp
      ? extractValue(serverProp as { value: Value })
      : undefined;

    return localValue !== serverValue;
  });

  return (
    <div
      role="dialog"
      aria-labelledby="conflict-title"
      aria-describedby="conflict-description"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
      }}
      data-testid="conflict-dialog"
    >
      <div
        style={{
          backgroundColor: '#fff',
          borderRadius: '8px',
          padding: '1.5rem',
          maxWidth: '600px',
          width: '90%',
          maxHeight: '80vh',
          overflow: 'auto',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
        }}
      >
        {/* Header */}
        <h2
          id="conflict-title"
          style={{
            margin: '0 0 0.5rem 0',
            color: '#dc3545',
            fontSize: '1.25rem',
          }}
        >
          Version Conflict
        </h2>

        <p
          id="conflict-description"
          style={{
            margin: '0 0 1rem 0',
            color: '#6c757d',
          }}
        >
          This record was modified by someone else while you were editing it.
          Please choose how to resolve this conflict.
        </p>

        {/* Changed fields comparison */}
        {changedFields.length > 0 && (
          <div
            style={{
              marginBottom: '1rem',
              border: '1px solid #dee2e6',
              borderRadius: '4px',
              overflow: 'hidden',
            }}
          >
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ backgroundColor: '#f8f9fa' }}>
                  <th style={{ padding: '0.5rem', textAlign: 'left', borderBottom: '1px solid #dee2e6' }}>
                    Field
                  </th>
                  <th style={{ padding: '0.5rem', textAlign: 'left', borderBottom: '1px solid #dee2e6' }}>
                    Your Value
                  </th>
                  <th style={{ padding: '0.5rem', textAlign: 'left', borderBottom: '1px solid #dee2e6' }}>
                    Server Value
                  </th>
                </tr>
              </thead>
              <tbody>
                {changedFields.map((field) => {
                  const localValue = state.values[field.property];
                  const serverProp = conflictEntity.properties[field.property];
                  const serverValue = serverProp && 'value' in serverProp
                    ? extractValue(serverProp as { value: Value })
                    : undefined;

                  return (
                    <tr key={field.property}>
                      <td style={{ padding: '0.5rem', borderBottom: '1px solid #dee2e6' }}>
                        {field.label || field.property}
                      </td>
                      <td style={{ padding: '0.5rem', borderBottom: '1px solid #dee2e6', color: '#0d6efd' }}>
                        {formatValue(localValue)}
                      </td>
                      <td style={{ padding: '0.5rem', borderBottom: '1px solid #dee2e6', color: '#198754' }}>
                        {formatValue(serverValue)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Actions */}
        <div
          style={{
            display: 'flex',
            gap: '0.75rem',
            justifyContent: 'flex-end',
          }}
        >
          <button
            type="button"
            onClick={() => onResolve(true)}
            style={{
              padding: '0.5rem 1rem',
              borderRadius: '4px',
              border: 'none',
              backgroundColor: '#198754',
              color: '#fff',
              cursor: 'pointer',
              fontSize: '1rem',
            }}
            data-testid="conflict-use-server"
          >
            Use Server Values
          </button>
          <button
            type="button"
            onClick={() => onResolve(false)}
            style={{
              padding: '0.5rem 1rem',
              borderRadius: '4px',
              border: 'none',
              backgroundColor: '#0d6efd',
              color: '#fff',
              cursor: 'pointer',
              fontSize: '1rem',
            }}
            data-testid="conflict-keep-mine"
          >
            Keep My Values &amp; Retry
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Format a value for display in the conflict table.
 */
function formatValue(value: unknown): string {
  if (value === undefined || value === null) {
    return '(empty)';
  }
  if (typeof value === 'boolean') {
    return value ? 'Yes' : 'No';
  }
  if (typeof value === 'object') {
    return JSON.stringify(value);
  }
  return String(value);
}
