import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import type { Entity } from '@trellis/kernel';

import { FormBlock } from '../../blocks/form/index.js';
import type { FormBlockConfig } from '../../blocks/form/types.js';
import { TrellisProvider } from '../../state/store.js';
import { MockTrellisClient } from '../../test-utils/mock-client.js';

/**
 * FormBlock - Form interface for creating and editing entities
 *
 * Provides forms with validation, field groups, and optimistic updates.
 */

// =============================================================================
// MOCK DATA
// =============================================================================

const mockEntity = (id: string, data: Record<string, unknown>): Entity => ({
  id: id as Entity['id'],
  type: 'product' as Entity['type'],
  version: 1,
  created_at: '2024-01-15T10:30:00Z',
  updated_at: '2024-01-20T14:45:00Z',
  properties: Object.fromEntries(
    Object.entries(data).map(([key, value]) => [
      key,
      { source: 'literal' as const, value: { type: 'text', value } },
    ])
  ),
});

const productEntity = mockEntity('prod_123', {
  name: 'Precision Widget Pro',
  description: 'A high-precision industrial widget.',
  sku: 'PWP-001',
  status: 'active',
  price: 299.99,
  quantity: 150,
});

// =============================================================================
// STORY DECORATORS
// =============================================================================

const mockClient = new MockTrellisClient({
  entities: { prod_123: productEntity },
});

const withTrellisProvider = (Story: React.ComponentType) => (
  <TrellisProvider client={mockClient as any}>
    <Story />
  </TrellisProvider>
);

// =============================================================================
// META
// =============================================================================

const meta: Meta<typeof FormBlock> = {
  title: 'Blocks/Form',
  component: FormBlock,
  decorators: [withTrellisProvider],
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
};

export default meta;

type Story = StoryObj<typeof FormBlock>;

// =============================================================================
// STORIES
// =============================================================================

const createConfig: FormBlockConfig = {
  block: 'form',
  source: 'product' as any,
  mode: 'create',
  fields: [
    { property: 'name' as any, label: 'Product Name', required: true },
    { property: 'sku' as any, label: 'SKU', required: true, maxLength: 20 },
    { property: 'description' as any, type: 'textarea', rows: 4 },
    { property: 'price' as any, type: 'number', min: 0 },
    { property: 'quantity' as any, type: 'number', min: 0 },
    {
      property: 'status' as any,
      type: 'select',
      options: [
        { value: 'draft', label: 'Draft' },
        { value: 'active', label: 'Active' },
        { value: 'discontinued', label: 'Discontinued' },
      ],
    },
  ],
};

/**
 * Create mode - new entity form.
 */
export const Create: Story = {
  args: {
    config: createConfig,
    onSubmit: (entity) => console.log('Submit:', entity),
    onCancel: () => console.log('Cancel'),
  },
};

/**
 * Edit mode - existing entity form.
 */
export const Edit: Story = {
  args: {
    config: {
      block: 'form',
      source: 'product' as any,
      mode: 'edit',
      entityId: 'prod_123' as any,
      fields: [
        { property: 'name' as any, label: 'Product Name', required: true },
        { property: 'sku' as any, label: 'SKU', required: true, readOnly: true },
        { property: 'description' as any, type: 'textarea', rows: 4 },
        { property: 'price' as any, type: 'number', min: 0 },
        { property: 'quantity' as any, type: 'number', min: 0 },
      ],
    },
    entityId: 'prod_123' as any,
    onSubmit: (entity) => console.log('Submit:', entity),
    onCancel: () => console.log('Cancel'),
  },
};

/**
 * Form with validation rules.
 */
export const WithValidation: Story = {
  args: {
    config: {
      block: 'form',
      source: 'product' as any,
      mode: 'create',
      fields: [
        {
          property: 'name' as any,
          label: 'Product Name',
          required: true,
          minLength: 3,
          maxLength: 100,
          helpText: 'Must be between 3 and 100 characters',
        },
        {
          property: 'sku' as any,
          label: 'SKU',
          required: true,
          pattern: '^[A-Z0-9-]+$',
          helpText: 'Uppercase letters, numbers, and hyphens only',
        },
        {
          property: 'price' as any,
          type: 'number',
          required: true,
          min: 0.01,
          max: 999999.99,
          helpText: 'Price must be between $0.01 and $999,999.99',
        },
      ],
    },
    onSubmit: (entity) => console.log('Submit:', entity),
  },
};

/**
 * Form with different field types.
 */
export const FieldTypes: Story = {
  args: {
    config: {
      block: 'form',
      source: 'product' as any,
      mode: 'create',
      fields: [
        { property: 'name' as any, type: 'text', label: 'Text Field', placeholder: 'Enter name' },
        { property: 'quantity' as any, type: 'number', label: 'Number Field', min: 0 },
        { property: 'active' as any, type: 'boolean', label: 'Boolean Field' },
        {
          property: 'status' as any,
          type: 'select',
          label: 'Select Field',
          options: [
            { value: 'draft', label: 'Draft' },
            { value: 'active', label: 'Active' },
            { value: 'archived', label: 'Archived' },
          ],
        },
        { property: 'description' as any, type: 'textarea', label: 'Textarea Field', rows: 3 },
        { property: 'created' as any, type: 'date', label: 'Date Field' },
      ],
    },
    onSubmit: (entity) => console.log('Submit:', entity),
  },
};

/**
 * Documentation: FormBlock Configuration
 *
 * The FormBlock component accepts a `config` prop with these options:
 *
 * ```typescript
 * interface FormBlockConfig {
 *   block: 'form';
 *   source: TypePath;        // Entity type
 *   mode: 'create' | 'edit'; // Form mode
 *   entityId?: EntityId;     // Entity ID for edit mode
 *   fields: FieldConfig[];   // Field configurations
 *   actions?: {              // Custom action buttons
 *     submit?: FormAction;
 *     cancel?: FormAction;
 *   };
 * }
 * ```
 *
 * Field types: 'text', 'textarea', 'number', 'boolean', 'date', 'datetime', 'select', 'relation'
 */
export const Documentation: Story = {
  render: () => (
    <div style={{ padding: '24px', fontFamily: 'system-ui, sans-serif' }}>
      <h2>FormBlock Component</h2>
      <p>
        The FormBlock is used for creating and editing entities. It supports various field types,
        validation, and optimistic locking for concurrent edit detection.
      </p>
      <h3>Key Features</h3>
      <ul>
        <li>Create and Edit modes</li>
        <li>Multiple field types (text, number, boolean, select, date, relation)</li>
        <li>Built-in validation with custom error messages</li>
        <li>Optimistic locking with conflict resolution</li>
        <li>Field groups and collapsible sections</li>
      </ul>
      <h3>Usage</h3>
      <pre style={{ background: '#f5f5f5', padding: '12px', borderRadius: '4px', overflow: 'auto' }}>
{`<FormBlock
  config={{
    block: 'form',
    source: 'product',
    mode: 'create',
    fields: [
      { property: 'name', required: true },
      { property: 'price', type: 'number', min: 0 },
    ],
  }}
  onSubmit={(entity) => console.log('Created:', entity)}
/>`}
      </pre>
    </div>
  ),
};
