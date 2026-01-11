import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';

/**
 * FormBlock - Form interface for creating and editing entities
 *
 * Status: Placeholder (waiting for Instance 21)
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
      <div style={{ fontSize: '48px', marginBottom: '16px' }}>&#128221;</div>
      <h2 style={{ margin: '0 0 8px', color: '#404040' }}>{title}</h2>
      <p style={{ margin: 0, color: '#737373' }}>{description}</p>
    </div>
  );
}

const meta: Meta = {
  title: 'Blocks/Form',
  parameters: {
    layout: 'padded',
  },
};

export default meta;

type Story = StoryObj;

export const Create: Story = {
  render: () => (
    <PlaceholderBlock
      title="FormBlock - Create Mode"
      description="Entity creation form - Coming in Instance 21"
    />
  ),
};

export const Edit: Story = {
  render: () => (
    <PlaceholderBlock
      title="FormBlock - Edit Mode"
      description="Entity editing form - Coming in Instance 21"
    />
  ),
};

export const WithValidation: Story = {
  render: () => (
    <PlaceholderBlock
      title="FormBlock with Validation"
      description="Form with field validation - Coming in Instance 21"
    />
  ),
};

export const WithNestedFields: Story = {
  render: () => (
    <PlaceholderBlock
      title="FormBlock with Nested Fields"
      description="Complex form layout - Coming in Instance 21"
    />
  ),
};
