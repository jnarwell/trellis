import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import type { Entity } from '@trellis/kernel';

import { DetailBlock, DetailSection, DetailField } from '../../blocks/detail/index.js';
import type { DetailSectionConfig, DetailBlockProps } from '../../blocks/detail/types.js';
import { TrellisProvider } from '../../state/store.js';
import { MockTrellisClient } from '../../test-utils/mock-client.js';

/**
 * DetailBlock - Read-only detail view for single entities
 *
 * Displays entity properties in organized sections with formatting support.
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
  description: 'A high-precision industrial widget for manufacturing applications.',
  sku: 'PWP-001',
  status: 'active',
  price: 299.99,
  quantity: 150,
  category: 'Industrial Equipment',
  manufacturer: 'Acme Corp',
  created_at: '2024-01-15T10:30:00Z',
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

const meta: Meta<typeof DetailBlock> = {
  title: 'Blocks/Detail',
  component: DetailBlock,
  decorators: [withTrellisProvider],
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
};

export default meta;

type Story = StoryObj<typeof DetailBlock>;

// =============================================================================
// STORIES
// =============================================================================

/**
 * Basic detail view with sections.
 */
export const Default: Story = {
  args: {
    entityId: 'prod_123' as Entity['id'],
    sections: [
      {
        title: 'Basic Information',
        fields: [
          { property: 'name', label: 'Product Name' },
          { property: 'sku', label: 'SKU' },
          { property: 'description' },
        ],
      },
      {
        title: 'Pricing & Inventory',
        fields: [
          { property: 'price', format: 'currency' },
          { property: 'quantity', format: 'number' },
        ],
      },
      {
        title: 'Classification',
        fields: [
          { property: 'category' },
          { property: 'manufacturer' },
          { property: 'status', format: 'badge' },
        ],
      },
    ],
  },
};

/**
 * Detail view with action buttons.
 */
export const WithActions: Story = {
  args: {
    entityId: 'prod_123' as Entity['id'],
    sections: [
      {
        title: 'Product Details',
        fields: [
          { property: 'name', label: 'Product Name' },
          { property: 'sku', label: 'SKU' },
          { property: 'status', format: 'badge' },
          { property: 'price', format: 'currency' },
        ],
      },
    ],
    actions: [
      { label: 'Edit', event: 'edit', variant: 'primary' },
      { label: 'Duplicate', event: 'duplicate', variant: 'secondary' },
      { label: 'Delete', event: 'delete', variant: 'danger', confirm: true },
    ],
    onEvent: (event) => console.log('Event:', event),
  },
};

/**
 * Detail view with collapsible sections.
 */
export const CollapsibleSections: Story = {
  args: {
    entityId: 'prod_123' as Entity['id'],
    sections: [
      {
        title: 'Basic Information',
        fields: [
          { property: 'name', label: 'Product Name' },
          { property: 'sku', label: 'SKU' },
        ],
      },
      {
        title: 'Description',
        collapsible: true,
        fields: [{ property: 'description' }],
      },
      {
        title: 'Advanced Details',
        collapsible: true,
        defaultCollapsed: true,
        fields: [
          { property: 'manufacturer' },
          { property: 'category' },
          { property: 'created_at', format: 'datetime' },
        ],
      },
    ],
  },
};

/**
 * Individual field component demo.
 */
export const FieldFormats: Story = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div>
        <h3 style={{ margin: '0 0 12px', fontSize: '14px', color: '#666' }}>Text Format</h3>
        <DetailField config={{ property: 'name' }} value="Product Name" />
      </div>
      <div>
        <h3 style={{ margin: '0 0 12px', fontSize: '14px', color: '#666' }}>Number Format</h3>
        <DetailField config={{ property: 'quantity', format: 'number' }} value={1234567} />
      </div>
      <div>
        <h3 style={{ margin: '0 0 12px', fontSize: '14px', color: '#666' }}>Currency Format</h3>
        <DetailField config={{ property: 'price', format: 'currency' }} value={299.99} />
      </div>
      <div>
        <h3 style={{ margin: '0 0 12px', fontSize: '14px', color: '#666' }}>Badge Format</h3>
        <DetailField config={{ property: 'status', format: 'badge' }} value="active" />
      </div>
      <div>
        <h3 style={{ margin: '0 0 12px', fontSize: '14px', color: '#666' }}>Boolean Format</h3>
        <DetailField config={{ property: 'available', format: 'boolean' }} value={true} />
      </div>
      <div>
        <h3 style={{ margin: '0 0 12px', fontSize: '14px', color: '#666' }}>DateTime Format</h3>
        <DetailField
          config={{ property: 'created_at', format: 'datetime' }}
          value="2024-01-15T10:30:00Z"
        />
      </div>
      <div>
        <h3 style={{ margin: '0 0 12px', fontSize: '14px', color: '#666' }}>Empty Value</h3>
        <DetailField
          config={{ property: 'notes', emptyText: 'No notes available' }}
          value={undefined}
        />
      </div>
    </div>
  ),
};

/**
 * Section component demo.
 */
export const SectionDemo: Story = {
  render: () => (
    <div style={{ maxWidth: '600px' }}>
      <DetailSection
        config={{
          title: 'Product Information',
          fields: [
            { property: 'name', label: 'Product Name' },
            { property: 'sku', label: 'SKU' },
            { property: 'price', format: 'currency' },
            { property: 'status', format: 'badge' },
          ],
        }}
        entity={productEntity}
      />
    </div>
  ),
};

/**
 * Loading state.
 */
export const Loading: Story = {
  decorators: [
    (Story) => {
      const loadingClient = new MockTrellisClient({
        entities: {},
        loading: true,
      });
      return (
        <TrellisProvider client={loadingClient as any}>
          <Story />
        </TrellisProvider>
      );
    },
  ],
  args: {
    entityId: 'prod_123' as Entity['id'],
    sections: [
      {
        title: 'Basic Info',
        fields: [{ property: 'name' }],
      },
    ],
  },
};

/**
 * Entity not found state.
 */
export const NotFound: Story = {
  decorators: [
    (Story) => {
      const emptyClient = new MockTrellisClient({ entities: {} });
      return (
        <TrellisProvider client={emptyClient as any}>
          <Story />
        </TrellisProvider>
      );
    },
  ],
  args: {
    entityId: 'prod_nonexistent' as Entity['id'],
    sections: [
      {
        title: 'Basic Info',
        fields: [{ property: 'name' }],
      },
    ],
  },
};
