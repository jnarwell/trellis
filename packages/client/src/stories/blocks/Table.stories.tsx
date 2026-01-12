import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import type { Entity } from '@trellis/kernel';

import { TableBlock, TableCell } from '../../blocks/table/index.js';
import type { TableBlockProps, ColumnConfig, TableBlockConfig } from '../../blocks/table/types.js';
import { TrellisProvider } from '../../state/store.js';
import { MockTrellisClient } from '../../test-utils/mock-client.js';

/**
 * TableBlock - Data grid for displaying and managing entity collections
 *
 * Full-featured table with sorting, filtering, pagination, and row actions.
 */

// =============================================================================
// MOCK DATA
// =============================================================================

const mockEntity = (id: string, type: string, data: Record<string, unknown>): Entity => ({
  id: id as Entity['id'],
  type: type as Entity['type'],
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

const productEntities: Entity[] = [
  mockEntity('prod_001', 'product', {
    name: 'Widget Pro',
    sku: 'WGT-001',
    price: 29.99,
    quantity: 150,
    status: 'active',
  }),
  mockEntity('prod_002', 'product', {
    name: 'Gadget X',
    sku: 'GDG-002',
    price: 49.99,
    quantity: 75,
    status: 'active',
  }),
  mockEntity('prod_003', 'product', {
    name: 'Component Z',
    sku: 'CMP-003',
    price: 14.99,
    quantity: 0,
    status: 'draft',
  }),
  mockEntity('prod_004', 'product', {
    name: 'Module Alpha',
    sku: 'MOD-004',
    price: 199.99,
    quantity: 25,
    status: 'active',
  }),
  mockEntity('prod_005', 'product', {
    name: 'Part Beta',
    sku: 'PRT-005',
    price: 8.50,
    quantity: 500,
    status: 'discontinued',
  }),
];

// =============================================================================
// STORY DECORATORS
// =============================================================================

const mockClient = new MockTrellisClient({
  entities: Object.fromEntries(productEntities.map((e) => [e.id, e])),
  queryResults: { product: productEntities },
});

const withTrellisProvider = (Story: React.ComponentType) => (
  <TrellisProvider client={mockClient as any}>
    <Story />
  </TrellisProvider>
);

// =============================================================================
// META
// =============================================================================

const meta: Meta<typeof TableBlock> = {
  title: 'Blocks/Table',
  component: TableBlock,
  decorators: [withTrellisProvider],
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
};

export default meta;

type Story = StoryObj<typeof TableBlock>;

// =============================================================================
// STORIES
// =============================================================================

const defaultConfig: TableBlockConfig = {
  source: 'product',
  columns: [
    { property: 'name', label: 'Product Name', sortable: true },
    { property: 'sku', label: 'SKU', width: 120 },
    { property: 'price', format: 'currency', align: 'right', width: 100 },
    { property: 'quantity', label: 'Stock', format: 'number', align: 'right', width: 80 },
    { property: 'status', format: 'badge', width: 100 },
  ],
};

/**
 * Basic table with columns.
 */
export const Default: Story = {
  args: {
    config: defaultConfig,
    data: productEntities,
    onRowClick: (entity) => console.log('Row clicked:', entity.id),
  },
};

/**
 * Table with filters.
 */
export const WithFilters: Story = {
  args: {
    config: {
      source: 'product',
      columns: [
        { property: 'name', label: 'Product Name', sortable: true },
        { property: 'sku', label: 'SKU', width: 120 },
        { property: 'price', format: 'currency', align: 'right', width: 100 },
        { property: 'status', format: 'badge', width: 100 },
      ],
      searchable: true,
      searchPlaceholder: 'Search products...',
      searchProperties: ['name', 'sku'],
      filters: [
        {
          property: 'status',
          label: 'Status',
          type: 'select',
          options: [
            { value: 'active', label: 'Active' },
            { value: 'draft', label: 'Draft' },
            { value: 'discontinued', label: 'Discontinued' },
          ],
        },
      ],
    },
    data: productEntities,
  },
};

/**
 * Table with pagination.
 */
export const WithPagination: Story = {
  args: {
    config: {
      source: 'product',
      columns: [
        { property: 'name', label: 'Product Name', sortable: true },
        { property: 'sku', label: 'SKU', width: 120 },
        { property: 'price', format: 'currency', align: 'right', width: 100 },
        { property: 'status', format: 'badge', width: 100 },
      ],
      pagination: {
        pageSize: 10,
        pageSizeOptions: [10, 25, 50, 100],
        showPageSize: true,
        showTotal: true,
      },
    },
    data: productEntities,
    totalCount: productEntities.length,
  },
};

/**
 * Table with row selection.
 */
export const WithSelection: Story = {
  args: {
    config: {
      source: 'product',
      columns: [
        { property: 'name', label: 'Product Name', sortable: true },
        { property: 'sku', label: 'SKU', width: 120 },
        { property: 'price', format: 'currency', align: 'right', width: 100 },
      ],
      selectable: true,
      selectionMode: 'multiple',
    },
    data: productEntities,
    onSelectionChange: (ids) => console.log('Selected:', ids),
  },
};

/**
 * Table with row actions.
 */
export const WithActions: Story = {
  args: {
    config: {
      source: 'product',
      columns: [
        { property: 'name', label: 'Product Name', sortable: true },
        { property: 'sku', label: 'SKU', width: 120 },
        { property: 'status', format: 'badge', width: 100 },
      ],
      actions: [
        { label: 'View', event: 'view', icon: 'eye' },
        { label: 'Edit', event: 'edit', icon: 'pencil' },
        { label: 'Delete', event: 'delete', icon: 'trash', variant: 'danger', confirm: true },
      ],
    },
    data: productEntities,
  },
};

/**
 * Compact table style.
 */
export const Compact: Story = {
  args: {
    config: {
      source: 'product',
      columns: [
        { property: 'sku', label: 'SKU', width: 100 },
        { property: 'name', label: 'Name' },
        { property: 'price', format: 'currency', align: 'right', width: 80 },
      ],
      compact: true,
      striped: true,
    },
    data: productEntities,
  },
};

/**
 * Empty state.
 */
export const Empty: Story = {
  args: {
    config: {
      source: 'product',
      columns: [
        { property: 'name', label: 'Product Name' },
        { property: 'sku', label: 'SKU' },
      ],
      emptyMessage: 'No products found',
    },
    data: [],
  },
};

/**
 * Loading state.
 */
export const Loading: Story = {
  args: {
    config: {
      source: 'product',
      columns: [
        { property: 'name', label: 'Product Name' },
        { property: 'sku', label: 'SKU' },
      ],
    },
    data: [],
    loading: true,
  },
};

/**
 * Cell formatting demo.
 */
export const CellFormats: Story = {
  render: () => {
    // Create mock entities for each format demo
    const textEntity = mockEntity('demo_1', 'demo', { value: 'Product Name' });
    const numberEntity = mockEntity('demo_2', 'demo', { value: 1234567 });
    const currencyEntity = mockEntity('demo_3', 'demo', { value: 299.99 });
    const percentEntity = mockEntity('demo_4', 'demo', { value: 0.2534 });
    const dateEntity = mockEntity('demo_5', 'demo', { value: '2024-01-15T10:30:00Z' });
    const badgeEntity = mockEntity('demo_6', 'demo', { value: 'active' });
    const booleanEntity = mockEntity('demo_7', 'demo', { value: true });

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '600px' }}>
        <div>
          <h3 style={{ margin: '0 0 8px', fontSize: '14px', color: '#666' }}>Text</h3>
          <TableCell column={{ property: 'value', format: 'text' }} entity={textEntity} rowIndex={0} />
        </div>
        <div>
          <h3 style={{ margin: '0 0 8px', fontSize: '14px', color: '#666' }}>Number</h3>
          <TableCell column={{ property: 'value', format: 'number' }} entity={numberEntity} rowIndex={0} />
        </div>
        <div>
          <h3 style={{ margin: '0 0 8px', fontSize: '14px', color: '#666' }}>Currency</h3>
          <TableCell column={{ property: 'value', format: 'currency' }} entity={currencyEntity} rowIndex={0} />
        </div>
        <div>
          <h3 style={{ margin: '0 0 8px', fontSize: '14px', color: '#666' }}>Percent</h3>
          <TableCell column={{ property: 'value', format: 'percent' }} entity={percentEntity} rowIndex={0} />
        </div>
        <div>
          <h3 style={{ margin: '0 0 8px', fontSize: '14px', color: '#666' }}>Date</h3>
          <TableCell column={{ property: 'value', format: 'date' }} entity={dateEntity} rowIndex={0} />
        </div>
        <div>
          <h3 style={{ margin: '0 0 8px', fontSize: '14px', color: '#666' }}>Badge</h3>
          <TableCell column={{ property: 'value', format: 'badge' }} entity={badgeEntity} rowIndex={0} />
        </div>
        <div>
          <h3 style={{ margin: '0 0 8px', fontSize: '14px', color: '#666' }}>Boolean</h3>
          <TableCell column={{ property: 'value', format: 'boolean' }} entity={booleanEntity} rowIndex={0} />
        </div>
      </div>
    );
  },
};
