/**
 * Trellis FormBlock - React Hooks
 *
 * useForm and useField hooks for form state management.
 */

import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import type { Entity, KernelError } from '@trellis/kernel';
import type {
  FormState,
  FieldState,
  UseFormOptions,
  UseFormReturn,
  FieldRegistration,
  UseFieldOptions,
  UseFieldReturn,
  FieldConfig,
} from './types.js';
import { validateField } from './validation.js';

// =============================================================================
// useForm HOOK
// =============================================================================

/**
 * Initial field state.
 */
function createInitialFieldState(value: unknown): FieldState {
  return {
    value,
    initialValue: value,
    isDirty: false,
    isTouched: false,
    error: null,
    isValidating: false,
  };
}

/**
 * Initial form state.
 */
function createInitialFormState(
  defaultValues: Record<string, unknown>,
  version: number | null
): FormState {
  const fields: Record<string, FieldState> = {};
  for (const [name, value] of Object.entries(defaultValues)) {
    fields[name] = createInitialFieldState(value);
  }

  return {
    values: defaultValues,
    fields,
    isDirty: false,
    isValid: true,
    isSubmitting: false,
    submitError: null,
    version,
    hasConflict: false,
    conflictEntity: null,
  };
}

/**
 * Hook for form state management.
 *
 * @example
 * ```tsx
 * const form = useForm({
 *   defaultValues: { name: '', price: 0 },
 *   onSubmit: async (values) => {
 *     await client.createEntity({ type: 'product', properties: values });
 *   },
 * });
 *
 * return (
 *   <form onSubmit={form.handleSubmit}>
 *     <input {...form.register('name')} />
 *     <input {...form.register('price')} type="number" />
 *     <button type="submit">Save</button>
 *   </form>
 * );
 * ```
 */
export function useForm(options: UseFormOptions = {}): UseFormReturn {
  const {
    defaultValues = {},
    version = null,
    validationMode = 'onBlur',
    onSubmit,
    onSuccess,
    onError,
  } = options;

  const [state, setState] = useState<FormState>(() =>
    createInitialFormState(defaultValues, version)
  );

  // Store field configs for validation
  const fieldConfigsRef = useRef<Map<string, FieldConfig>>(new Map());

  // Update version when it changes
  useEffect(() => {
    if (version !== null && version !== state.version) {
      setState((prev) => ({ ...prev, version }));
    }
  }, [version, state.version]);

  /**
   * Get field value.
   */
  const getValue = useCallback(
    (name: string): unknown => {
      return state.values[name];
    },
    [state.values]
  );

  /**
   * Set field value.
   */
  const setValue = useCallback(
    (name: string, value: unknown) => {
      setState((prev) => {
        const fieldState = prev.fields[name] || createInitialFieldState(undefined);
        const isDirty = value !== fieldState.initialValue;

        // Validate if in onChange mode
        let error = fieldState.error;
        if (validationMode === 'onChange') {
          const config = fieldConfigsRef.current.get(name);
          if (config) {
            error = validateField(value, config);
          }
        }

        // Create updated field state
        const updatedFieldState: FieldState = {
          ...fieldState,
          value,
          isDirty,
          error,
        };

        const newFields: Record<string, FieldState> = {
          ...prev.fields,
          [name]: updatedFieldState,
        };

        const newValues = {
          ...prev.values,
          [name]: value,
        };

        // Check if any field is dirty
        const formIsDirty = Object.values(newFields).some((f) => f.isDirty);

        return {
          ...prev,
          values: newValues,
          fields: newFields,
          isDirty: formIsDirty,
          isValid: !error && Object.values(newFields).every((f) => !f.error),
        };
      });
    },
    [validationMode]
  );

  /**
   * Set multiple values.
   */
  const setValues = useCallback(
    (values: Record<string, unknown>) => {
      for (const [name, value] of Object.entries(values)) {
        setValue(name, value);
      }
    },
    [setValue]
  );

  /**
   * Get field error.
   */
  const getError = useCallback(
    (name: string): string | null => {
      return state.fields[name]?.error ?? null;
    },
    [state.fields]
  );

  /**
   * Set field error.
   */
  const setError = useCallback((name: string, error: string | null) => {
    setState((prev) => {
      const fieldState = prev.fields[name];
      if (!fieldState) return prev;

      const newFields = {
        ...prev.fields,
        [name]: {
          ...fieldState,
          error,
        },
      };

      return {
        ...prev,
        fields: newFields,
        isValid: Object.values(newFields).every((f) => !f.error),
      };
    });
  }, []);

  /**
   * Mark field as touched.
   */
  const touchField = useCallback(
    (name: string) => {
      setState((prev) => {
        const fieldState = prev.fields[name];
        if (!fieldState || fieldState.isTouched) return prev;

        // Validate on blur if in onBlur mode
        let error = fieldState.error;
        if (validationMode === 'onBlur') {
          const config = fieldConfigsRef.current.get(name);
          if (config) {
            error = validateField(fieldState.value, config);
          }
        }

        const newFields = {
          ...prev.fields,
          [name]: {
            ...fieldState,
            isTouched: true,
            error,
          },
        };

        return {
          ...prev,
          fields: newFields,
          isValid: Object.values(newFields).every((f) => !f.error),
        };
      });
    },
    [validationMode]
  );

  /**
   * Track fields that need to be registered (to avoid setState during render).
   */
  const fieldsToRegister = useRef<Set<string>>(new Set());

  /**
   * Register a field.
   */
  const register = useCallback(
    (name: string, config?: FieldConfig): FieldRegistration => {
      // Store config for validation
      if (config) {
        fieldConfigsRef.current.set(name, config);
      }

      // Mark field for registration (will be processed in useEffect)
      if (!state.fields[name]) {
        fieldsToRegister.current.add(name);
      }

      const fieldState = state.fields[name] || createInitialFieldState(state.values[name]);

      return {
        name,
        value: fieldState.value,
        onChange: (value: unknown) => setValue(name, value),
        onBlur: () => touchField(name),
        error: fieldState.error,
        isTouched: fieldState.isTouched,
        isDirty: fieldState.isDirty,
      };
    },
    [state.fields, state.values, setValue, touchField]
  );

  /**
   * Effect to register fields marked during render.
   */
  useEffect(() => {
    if (fieldsToRegister.current.size > 0) {
      const fieldsToAdd = Array.from(fieldsToRegister.current);
      fieldsToRegister.current.clear();

      setState((prev) => {
        const newFields = { ...prev.fields };
        for (const name of fieldsToAdd) {
          if (!newFields[name]) {
            newFields[name] = createInitialFieldState(prev.values[name]);
          }
        }
        return { ...prev, fields: newFields };
      });
    }
  });

  /**
   * Check if field is dirty.
   */
  const isFieldDirty = useCallback(
    (name: string): boolean => {
      return state.fields[name]?.isDirty ?? false;
    },
    [state.fields]
  );

  /**
   * Reset form to initial values.
   */
  const reset = useCallback(
    (values?: Record<string, unknown>) => {
      const newDefaults = values || defaultValues;
      setState(createInitialFormState(newDefaults, version));
    },
    [defaultValues, version]
  );

  /**
   * Validate all fields.
   */
  const validate = useCallback((): boolean => {
    let isValid = true;

    setState((prev) => {
      const newFields = { ...prev.fields };

      for (const [name, fieldState] of Object.entries(newFields)) {
        const config = fieldConfigsRef.current.get(name);
        if (config) {
          const error = validateField(fieldState.value, config);
          if (error) {
            isValid = false;
          }
          newFields[name] = {
            ...fieldState,
            error,
            isTouched: true,
          };
        }
      }

      return {
        ...prev,
        fields: newFields,
        isValid,
      };
    });

    return isValid;
  }, []);

  /**
   * Handle form submission.
   */
  const handleSubmit = useCallback(
    async (e?: React.FormEvent) => {
      if (e) {
        e.preventDefault();
      }

      // Validate all fields
      if (!validate()) {
        return;
      }

      setState((prev) => ({
        ...prev,
        isSubmitting: true,
        submitError: null,
      }));

      try {
        if (onSubmit) {
          await onSubmit(state.values as Record<string, unknown>);
        }
      } catch (error) {
        const kernelError = error as KernelError;

        // Check for version conflict
        if (kernelError.code === 'VERSION_CONFLICT') {
          const details = kernelError.details as { entity?: Entity } | undefined;
          setState((prev) => ({
            ...prev,
            isSubmitting: false,
            hasConflict: true,
            conflictEntity: details?.entity ?? null,
            submitError: 'This record was modified by someone else. Please review the changes.',
          }));

          if (onError) {
            onError(error as Error);
          }
          return;
        }

        setState((prev) => ({
          ...prev,
          isSubmitting: false,
          submitError: kernelError.message || 'An error occurred',
        }));

        if (onError) {
          onError(error as Error);
        }
        return;
      }

      setState((prev) => ({
        ...prev,
        isSubmitting: false,
        isDirty: false,
      }));
    },
    [validate, onSubmit, onError, state.values]
  );

  /**
   * Resolve version conflict.
   */
  const resolveConflict = useCallback(
    (useServerValues: boolean) => {
      setState((prev) => {
        if (!prev.conflictEntity) return prev;

        if (useServerValues) {
          // Reset to server values
          const newValues: Record<string, unknown> = {};
          const newFields: Record<string, FieldState> = {};

          for (const [name, fieldState] of Object.entries(prev.fields)) {
            // Cast to access by string key
            const properties = prev.conflictEntity!.properties as Record<string, { value?: { value?: unknown } }>;
            const serverProperty = properties[name];
            let serverValue: unknown = fieldState.initialValue;

            if (serverProperty && serverProperty.value) {
              // Extract value from property
              const propValue = serverProperty.value;
              if (propValue && 'value' in propValue) {
                serverValue = propValue.value;
              }
            }

            newValues[name] = serverValue;
            newFields[name] = {
              ...fieldState,
              value: serverValue,
              initialValue: serverValue,
              isDirty: false,
              error: null,
            };
          }

          return {
            ...prev,
            values: newValues,
            fields: newFields,
            isDirty: false,
            hasConflict: false,
            conflictEntity: null,
            submitError: null,
            version: prev.conflictEntity!.version,
          };
        } else {
          // Keep local values but update version
          return {
            ...prev,
            hasConflict: false,
            conflictEntity: null,
            submitError: null,
            version: prev.conflictEntity!.version,
          };
        }
      });
    },
    []
  );

  return useMemo(
    () => ({
      state,
      register,
      getValue,
      setValue,
      setValues,
      getError,
      setError,
      touchField,
      reset,
      validate,
      handleSubmit,
      isFieldDirty,
      resolveConflict,
    }),
    [
      state,
      register,
      getValue,
      setValue,
      setValues,
      getError,
      setError,
      touchField,
      reset,
      validate,
      handleSubmit,
      isFieldDirty,
      resolveConflict,
    ]
  );
}

// =============================================================================
// useField HOOK
// =============================================================================

/**
 * Hook for individual field state.
 *
 * @example
 * ```tsx
 * function MyField({ name, config, form }) {
 *   const { field, label, hasError, showError } = useField({ name, config, form });
 *
 *   return (
 *     <div>
 *       <label>{label}</label>
 *       <input
 *         value={field.value}
 *         onChange={(e) => field.onChange(e.target.value)}
 *         onBlur={field.onBlur}
 *       />
 *       {showError && <span>{field.error}</span>}
 *     </div>
 *   );
 * }
 * ```
 */
export function useField(options: UseFieldOptions): UseFieldReturn {
  const { name, config, form } = options;

  const field = form.register(name, config);

  const state: FieldState = form.state.fields[name] || {
    value: field.value,
    initialValue: field.value,
    isDirty: false,
    isTouched: false,
    error: null,
    isValidating: false,
  };

  const label = config.label || formatPropertyName(name);
  const hasError = Boolean(field.error);
  const showError = hasError && field.isTouched;

  return useMemo(
    () => ({
      field,
      state,
      config,
      label,
      hasError,
      showError,
    }),
    [field, state, config, label, hasError, showError]
  );
}

/**
 * Format property name as display label.
 */
function formatPropertyName(name: string): string {
  return name
    .replace(/_/g, ' ')
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (s) => s.toUpperCase())
    .trim();
}
