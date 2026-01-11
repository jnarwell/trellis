import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';

/**
 * TableBlock - Data grid for displaying and managing entity collections
 *
 * Status: Placeholder (waiting for Instance 20)
 */

function PlaceholderBlock({ title, description }: { title: string; description: string }) {
  return (
    <div
      style={{
        padding: '48px',
        textAlign: 'center',
        backgroundColor: '#f5f5f5',
        border: '2px dashed #d4d4d4',
        borderRadius: '8px',
        minHeight: '400px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'system-ui, sans-serif',
      }}
    >
      <div style={{ fontSize: '48px', marginBottom: '16px' }}>&#128203;</div>
      <h2 style={{ margin: '0 0 8px', color: '#404040' }}>{title}</h2>
      <p style={{ margin: 0, color: '#737373' }}>{description}</p>
    </div>
  );
}

const meta: Meta = {
  title: 'Blocks/Table',
  parameters: {
    layout: 'padded',
  },
};

export default meta;

type Story = StoryObj;

export const Default: Story = {
  render: () => (
    <PlaceholderBlock
      title="TableBlock"
      description="Data grid for entity collections - Coming in Instance 20"
    />
  ),
};

export const WithFilters: Story = {
  render: () => (
    <PlaceholderBlock
      title="TableBlock with Filters"
      description="Filterable data grid - Coming in Instance 20"
    />
  ),
};

export const WithPagination: Story = {
  render: () => (
    <PlaceholderBlock
      title="TableBlock with Pagination"
      description="Paginated data grid - Coming in Instance 20"
    />
  ),
};

export const WithSelection: Story = {
  render: () => (
    <PlaceholderBlock
      title="TableBlock with Selection"
      description="Multi-select data grid - Coming in Instance 20"
    />
  ),
};
