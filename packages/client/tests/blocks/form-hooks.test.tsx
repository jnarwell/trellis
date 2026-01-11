/**
 * Trellis FormBlock - Hooks Tests
 */

import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useForm, useField } from '../../src/blocks/form/hooks.js';
import type { FieldConfig } from '../../src/blocks/form/types.js';

describe('useForm', () => {
  describe('initialization', () => {
    it('initializes with default values', () => {
      const { result } = renderHook(() =>
        useForm({
          defaultValues: { name: 'Test', price: 10 },
        })
      );

      expect(result.current.getValue('name')).toBe('Test');
      expect(result.current.getValue('price')).toBe(10);
    });

    it('initializes with empty state when no defaults', () => {
      const { result } = renderHook(() => useForm());

      expect(result.current.state.values).toEqual({});
      expect(result.current.state.isDirty).toBe(false);
      expect(result.current.state.isValid).toBe(true);
    });

    it('initializes with version for optimistic locking', () => {
      const { result } = renderHook(() =>
        useForm({
          defaultValues: { name: 'Test' },
          version: 5,
        })
      );

      expect(result.current.state.version).toBe(5);
    });
  });

  describe('setValue', () => {
    it('updates field value', () => {
      const { result } = renderHook(() =>
        useForm({
          defaultValues: { name: '' },
        })
      );

      act(() => {
        result.current.setValue('name', 'New Name');
      });

      expect(result.current.getValue('name')).toBe('New Name');
    });

    it('marks form as dirty when value changes', () => {
      const { result } = renderHook(() =>
        useForm({
          defaultValues: { name: 'Original' },
        })
      );

      expect(result.current.state.isDirty).toBe(false);

      act(() => {
        result.current.setValue('name', 'Changed');
      });

      expect(result.current.state.isDirty).toBe(true);
    });

    it('marks form as not dirty when value reverts to initial', () => {
      const { result } = renderHook(() =>
        useForm({
          defaultValues: { name: 'Original' },
        })
      );

      act(() => {
        result.current.setValue('name', 'Changed');
      });
      expect(result.current.state.isDirty).toBe(true);

      act(() => {
        result.current.setValue('name', 'Original');
      });
      expect(result.current.state.isDirty).toBe(false);
    });
  });

  describe('setValues', () => {
    it('updates multiple values at once', () => {
      const { result } = renderHook(() =>
        useForm({
          defaultValues: { name: '', price: 0 },
        })
      );

      act(() => {
        result.current.setValues({ name: 'Product', price: 99 });
      });

      expect(result.current.getValue('name')).toBe('Product');
      expect(result.current.getValue('price')).toBe(99);
    });
  });

  describe('register', () => {
    it('returns field registration object', () => {
      const { result } = renderHook(() =>
        useForm({
          defaultValues: { name: 'Test' },
        })
      );

      const field = result.current.register('name');

      expect(field.name).toBe('name');
      expect(field.value).toBe('Test');
      expect(typeof field.onChange).toBe('function');
      expect(typeof field.onBlur).toBe('function');
    });

    it('onChange updates value', () => {
      const { result } = renderHook(() =>
        useForm({
          defaultValues: { name: '' },
        })
      );

      const field = result.current.register('name');

      act(() => {
        field.onChange('New Value');
      });

      expect(result.current.getValue('name')).toBe('New Value');
    });
  });

  describe('touchField', () => {
    it('marks field as touched', () => {
      const { result } = renderHook(() =>
        useForm({
          defaultValues: { name: '' },
        })
      );

      // First register the field
      result.current.register('name');

      act(() => {
        result.current.touchField('name');
      });

      const field = result.current.register('name');
      expect(field.isTouched).toBe(true);
    });
  });

  describe('reset', () => {
    it('resets to initial values', () => {
      const { result } = renderHook(() =>
        useForm({
          defaultValues: { name: 'Original' },
        })
      );

      act(() => {
        result.current.setValue('name', 'Changed');
      });

      act(() => {
        result.current.reset();
      });

      expect(result.current.getValue('name')).toBe('Original');
      expect(result.current.state.isDirty).toBe(false);
    });

    it('resets to new values when provided', () => {
      const { result } = renderHook(() =>
        useForm({
          defaultValues: { name: 'Original' },
        })
      );

      act(() => {
        result.current.reset({ name: 'New Default' });
      });

      expect(result.current.getValue('name')).toBe('New Default');
    });
  });

  describe('setError', () => {
    it('sets field error', () => {
      const { result } = renderHook(() =>
        useForm({
          defaultValues: { name: '' },
        })
      );

      // Register field first
      result.current.register('name');

      act(() => {
        result.current.setError('name', 'This field is required');
      });

      expect(result.current.getError('name')).toBe('This field is required');
      expect(result.current.state.isValid).toBe(false);
    });

    it('clears error when set to null', () => {
      const { result } = renderHook(() =>
        useForm({
          defaultValues: { name: '' },
        })
      );

      result.current.register('name');

      act(() => {
        result.current.setError('name', 'Error');
      });

      act(() => {
        result.current.setError('name', null);
      });

      expect(result.current.getError('name')).toBeNull();
      expect(result.current.state.isValid).toBe(true);
    });
  });

  describe('handleSubmit', () => {
    it('calls onSubmit with form values', async () => {
      const onSubmit = vi.fn();
      const { result } = renderHook(() =>
        useForm({
          defaultValues: { name: 'Test' },
          onSubmit,
        })
      );

      await act(async () => {
        await result.current.handleSubmit();
      });

      expect(onSubmit).toHaveBeenCalledWith({ name: 'Test' });
    });

    it('resets isSubmitting after successful submission', async () => {
      const onSubmit = vi.fn().mockImplementation(async () => {
        // Simulate async operation
        await new Promise((r) => setTimeout(r, 10));
      });
      const { result } = renderHook(() =>
        useForm({
          defaultValues: { name: 'Test' },
          onSubmit,
        })
      );

      // Initially not submitting
      expect(result.current.state.isSubmitting).toBe(false);

      await act(async () => {
        await result.current.handleSubmit();
      });

      // After submission completes, isSubmitting should be false
      expect(result.current.state.isSubmitting).toBe(false);
      expect(onSubmit).toHaveBeenCalledOnce();
    });

    it('handles submit error', async () => {
      const onSubmit = vi.fn().mockRejectedValue({
        code: 'VALIDATION_ERROR',
        message: 'Validation failed',
      });
      const onError = vi.fn();

      const { result } = renderHook(() =>
        useForm({
          defaultValues: { name: 'Test' },
          onSubmit,
          onError,
        })
      );

      // Ensure result.current is available
      expect(result.current).not.toBeNull();

      await act(async () => {
        if (result.current) {
          await result.current.handleSubmit();
        }
      });

      expect(onError).toHaveBeenCalled();
      expect(result.current?.state.submitError).toBe('Validation failed');
    });
  });

  describe('resolveConflict', () => {
    it('maintains values when no conflict', () => {
      const { result } = renderHook(() =>
        useForm({
          defaultValues: { name: 'Original' },
          version: 1,
        })
      );

      // Change a value
      act(() => {
        result.current.setValue('name', 'Local Change');
      });

      expect(result.current.getValue('name')).toBe('Local Change');

      // Try to resolve conflict when there is none - should be no-op
      act(() => {
        result.current.resolveConflict(true);
      });

      // Value should remain unchanged since there was no conflict
      expect(result.current.getValue('name')).toBe('Local Change');
    });
  });
});

describe('useField', () => {
  it('returns field props and state', () => {
    const config: FieldConfig = {
      property: 'name' as never,
      type: 'text',
      label: 'Name',
    };

    // Use both hooks together in the same render context
    const { result } = renderHook(() => {
      const form = useForm({
        defaultValues: { name: 'Test' },
      });
      const field = useField({
        name: 'name',
        config,
        form,
      });
      return { form, field };
    });

    expect(result.current.field.field.name).toBe('name');
    expect(result.current.field.field.value).toBe('Test');
    expect(result.current.field.label).toBe('Name');
    expect(result.current.field.hasError).toBe(false);
    expect(result.current.field.showError).toBe(false);
  });

  it('formats property name as label when not provided', () => {
    const config: FieldConfig = {
      property: 'product_name' as never,
      type: 'text',
    };

    const { result } = renderHook(() => {
      const form = useForm({
        defaultValues: { product_name: '' },
      });
      const field = useField({
        name: 'product_name',
        config,
        form,
      });
      return { form, field };
    });

    expect(result.current.field.label).toBe('Product name');
  });

  it('shows error only when touched', () => {
    const config: FieldConfig = {
      property: 'name' as never,
      type: 'text',
      required: true,
    };

    const { result, rerender } = renderHook(() => {
      const form = useForm({
        defaultValues: { name: '' },
      });
      const field = useField({
        name: 'name',
        config,
        form,
      });
      return { form, field };
    });

    // Initially not touched, shouldn't show error
    expect(result.current.field.showError).toBe(false);

    // Touch the field
    act(() => {
      result.current.field.field.onBlur();
    });

    rerender();

    // Now should show error
    expect(result.current.field.showError).toBe(true);
  });
});
