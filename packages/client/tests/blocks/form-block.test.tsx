/**
 * Trellis FormBlock - Component Tests
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { FormBlock } from '../../src/blocks/form/FormBlock.js';
import type { FormBlockConfig } from '../../src/blocks/form/types.js';
import type { Entity, EntityId, TenantId, ActorId, TypePath, PropertyName } from '@trellis/kernel';

// Mock the hooks
vi.mock('../../src/state/hooks.js', () => ({
  useEntity: vi.fn(),
  useCreateEntity: vi.fn(),
  useUpdateEntity: vi.fn(),
}));

// Mock navigation
vi.mock('../../src/runtime/NavigationProvider.js', () => ({
  useNavigation: vi.fn(() => ({
    toView: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    push: vi.fn(),
    replace: vi.fn(),
    state: { path: '/', params: {}, query: {} },
  })),
}));

import { useEntity, useCreateEntity, useUpdateEntity } from '../../src/state/hooks.js';

const mockUseEntity = useEntity as ReturnType<typeof vi.fn>;
const mockUseCreateEntity = useCreateEntity as ReturnType<typeof vi.fn>;
const mockUseUpdateEntity = useUpdateEntity as ReturnType<typeof vi.fn>;

describe('FormBlock', () => {
  const baseConfig: FormBlockConfig = {
    block: 'form',
    source: 'product' as TypePath,
    mode: 'create',
    fields: [
      { property: 'name' as PropertyName, type: 'text', required: true, label: 'Product Name' },
      { property: 'price' as PropertyName, type: 'number', min: 0, label: 'Price' },
      { property: 'active' as PropertyName, type: 'boolean', label: 'Active' },
    ],
    actions: {
      submit: { type: 'submit', label: 'Save' },
      cancel: { type: 'cancel', label: 'Cancel' },
    },
  };

  const mockEntity: Entity = {
    id: 'ent_123' as EntityId,
    tenant_id: 'tenant_1' as TenantId,
    type: 'product' as TypePath,
    properties: {
      ['name' as PropertyName]: {
        source: 'literal',
        name: 'name' as PropertyName,
        value: { type: 'text', value: 'Test Product' },
      },
      ['price' as PropertyName]: {
        source: 'literal',
        name: 'price' as PropertyName,
        value: { type: 'number', value: 99.99 },
      },
      ['active' as PropertyName]: {
        source: 'literal',
        name: 'active' as PropertyName,
        value: { type: 'boolean', value: true },
      },
    },
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    created_by: 'actor_1' as ActorId,
    version: 1,
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Default mock implementations
    mockUseEntity.mockReturnValue({
      data: null,
      loading: false,
      error: null,
      refetch: vi.fn(),
    });

    mockUseCreateEntity.mockReturnValue({
      mutate: vi.fn().mockResolvedValue(mockEntity),
      loading: false,
      error: null,
      data: null,
      reset: vi.fn(),
    });

    mockUseUpdateEntity.mockReturnValue({
      mutate: vi.fn().mockResolvedValue(mockEntity),
      loading: false,
      error: null,
      data: null,
      reset: vi.fn(),
    });
  });

  describe('Create Mode', () => {
    it('renders form fields', () => {
      render(<FormBlock config={baseConfig} />);

      expect(screen.getByTestId('form-block')).toBeInTheDocument();
      expect(screen.getByLabelText(/Product Name/)).toBeInTheDocument();
      expect(screen.getByLabelText(/Price/)).toBeInTheDocument();
      expect(screen.getByLabelText(/Active/)).toBeInTheDocument();
    });

    it('renders submit and cancel buttons', () => {
      render(<FormBlock config={baseConfig} />);

      expect(screen.getByTestId('form-submit')).toHaveTextContent('Save');
      expect(screen.getByTestId('form-cancel')).toHaveTextContent('Cancel');
    });

    it('shows required indicator on required fields', () => {
      render(<FormBlock config={baseConfig} />);

      const nameLabel = screen.getByText('Product Name');
      expect(nameLabel.parentElement).toHaveTextContent('*');
    });

    it('validates required fields on submit', async () => {
      render(<FormBlock config={baseConfig} />);

      fireEvent.click(screen.getByTestId('form-submit'));

      await waitFor(() => {
        expect(screen.getByText('This field is required')).toBeInTheDocument();
      });
    });

    it('calls onSubmit with created entity on success', async () => {
      const onSubmit = vi.fn();
      const createMutate = vi.fn().mockResolvedValue(mockEntity);
      mockUseCreateEntity.mockReturnValue({
        mutate: createMutate,
        loading: false,
        error: null,
        data: null,
        reset: vi.fn(),
      });

      render(<FormBlock config={baseConfig} onSubmit={onSubmit} />);

      // Fill in required field
      fireEvent.change(screen.getByTestId('field-name'), {
        target: { value: 'New Product' },
      });
      fireEvent.blur(screen.getByTestId('field-name'));

      // Submit
      fireEvent.click(screen.getByTestId('form-submit'));

      await waitFor(() => {
        expect(createMutate).toHaveBeenCalled();
      });
    });

    it('calls onCancel when cancel button clicked', () => {
      const onCancel = vi.fn();
      render(<FormBlock config={baseConfig} onCancel={onCancel} />);

      fireEvent.click(screen.getByTestId('form-cancel'));

      expect(onCancel).toHaveBeenCalled();
    });
  });

  describe('Edit Mode', () => {
    const editConfig: FormBlockConfig = {
      ...baseConfig,
      mode: 'edit',
      entityId: 'ent_123' as EntityId,
    };

    it('shows loading state while fetching entity', () => {
      mockUseEntity.mockReturnValue({
        data: null,
        loading: true,
        error: null,
        refetch: vi.fn(),
      });

      render(<FormBlock config={editConfig} entityId={'ent_123' as EntityId} />);

      expect(screen.getByTestId('form-loading')).toBeInTheDocument();
    });

    it('shows error state when entity fetch fails', () => {
      mockUseEntity.mockReturnValue({
        data: null,
        loading: false,
        error: { code: 'NOT_FOUND', message: 'Entity not found' },
        refetch: vi.fn(),
      });

      render(<FormBlock config={editConfig} entityId={'ent_123' as EntityId} />);

      expect(screen.getByTestId('form-error')).toBeInTheDocument();
    });

    it('shows not found state when entity is null', () => {
      mockUseEntity.mockReturnValue({
        data: null,
        loading: false,
        error: null,
        refetch: vi.fn(),
      });

      render(<FormBlock config={editConfig} entityId={'ent_123' as EntityId} />);

      expect(screen.getByTestId('form-not-found')).toBeInTheDocument();
    });

    it('populates form with entity values', () => {
      mockUseEntity.mockReturnValue({
        data: mockEntity,
        loading: false,
        error: null,
        refetch: vi.fn(),
      });

      render(<FormBlock config={editConfig} entityId={'ent_123' as EntityId} />);

      expect(screen.getByTestId('field-name')).toHaveValue('Test Product');
      expect(screen.getByTestId('field-price')).toHaveValue(99.99);
      expect(screen.getByTestId('field-active')).toBeChecked();
    });

    it('calls updateEntity on submit', async () => {
      const updateMutate = vi.fn().mockResolvedValue(mockEntity);
      mockUseEntity.mockReturnValue({
        data: mockEntity,
        loading: false,
        error: null,
        refetch: vi.fn(),
      });
      mockUseUpdateEntity.mockReturnValue({
        mutate: updateMutate,
        loading: false,
        error: null,
        data: null,
        reset: vi.fn(),
      });

      render(<FormBlock config={editConfig} entityId={'ent_123' as EntityId} />);

      // Modify a field
      fireEvent.change(screen.getByTestId('field-name'), {
        target: { value: 'Updated Product' },
      });
      fireEvent.blur(screen.getByTestId('field-name'));

      // Submit
      fireEvent.click(screen.getByTestId('form-submit'));

      await waitFor(() => {
        expect(updateMutate).toHaveBeenCalledWith(
          expect.objectContaining({
            id: 'ent_123',
            expected_version: 1,
          })
        );
      });
    });
  });

  describe('Version Conflict', () => {
    const editConfig: FormBlockConfig = {
      ...baseConfig,
      mode: 'edit',
      entityId: 'ent_123' as EntityId,
    };

    it('shows conflict dialog on VERSION_CONFLICT error', async () => {
      const conflictEntity = { ...mockEntity, version: 2 };
      const updateMutate = vi.fn().mockRejectedValue({
        code: 'VERSION_CONFLICT',
        message: 'Version conflict',
        details: { entity: conflictEntity },
      });

      mockUseEntity.mockReturnValue({
        data: mockEntity,
        loading: false,
        error: null,
        refetch: vi.fn(),
      });
      mockUseUpdateEntity.mockReturnValue({
        mutate: updateMutate,
        loading: false,
        error: null,
        data: null,
        reset: vi.fn(),
      });

      render(<FormBlock config={editConfig} entityId={'ent_123' as EntityId} />);

      // Submit
      fireEvent.click(screen.getByTestId('form-submit'));

      await waitFor(() => {
        expect(screen.getByTestId('conflict-dialog')).toBeInTheDocument();
      });
    });
  });

  describe('Field Types', () => {
    it('renders text field', () => {
      const config: FormBlockConfig = {
        ...baseConfig,
        fields: [{ property: 'name' as PropertyName, type: 'text' }],
      };
      render(<FormBlock config={config} />);

      expect(screen.getByTestId('field-name')).toHaveAttribute('type', 'text');
    });

    it('renders number field', () => {
      const config: FormBlockConfig = {
        ...baseConfig,
        fields: [{ property: 'price' as PropertyName, type: 'number' }],
      };
      render(<FormBlock config={config} />);

      expect(screen.getByTestId('field-price')).toHaveAttribute('type', 'number');
    });

    it('renders boolean field as checkbox', () => {
      const config: FormBlockConfig = {
        ...baseConfig,
        fields: [{ property: 'active' as PropertyName, type: 'boolean' }],
      };
      render(<FormBlock config={config} />);

      expect(screen.getByTestId('field-active')).toHaveAttribute('type', 'checkbox');
    });

    it('renders select field', () => {
      const config: FormBlockConfig = {
        ...baseConfig,
        fields: [{
          property: 'status' as PropertyName,
          type: 'select',
          options: [
            { value: 'active', label: 'Active' },
            { value: 'inactive', label: 'Inactive' },
          ],
        }],
      };
      render(<FormBlock config={config} />);

      const select = screen.getByTestId('field-status');
      expect(select.tagName).toBe('SELECT');
    });

    it('renders textarea field', () => {
      const config: FormBlockConfig = {
        ...baseConfig,
        fields: [{ property: 'description' as PropertyName, type: 'textarea', rows: 5 }],
      };
      render(<FormBlock config={config} />);

      const textarea = screen.getByTestId('field-description');
      expect(textarea.tagName).toBe('TEXTAREA');
      expect(textarea).toHaveAttribute('rows', '5');
    });
  });
});
