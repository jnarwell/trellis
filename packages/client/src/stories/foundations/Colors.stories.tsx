import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';

const colors = {
  primary: {
    50: '#eff6ff',
    100: '#dbeafe',
    200: '#bfdbfe',
    300: '#93c5fd',
    400: '#60a5fa',
    500: '#3b82f6',
    600: '#2563eb',
    700: '#1d4ed8',
    800: '#1e40af',
    900: '#1e3a8a',
  },
  neutral: {
    50: '#fafafa',
    100: '#f5f5f5',
    200: '#e5e5e5',
    300: '#d4d4d4',
    400: '#a3a3a3',
    500: '#737373',
    600: '#525252',
    700: '#404040',
    800: '#262626',
    900: '#171717',
  },
  success: {
    500: '#22c55e',
    600: '#16a34a',
  },
  warning: {
    500: '#eab308',
    600: '#ca8a04',
  },
  error: {
    500: '#ef4444',
    600: '#dc2626',
  },
};

function ColorSwatch({ name, hex }: { name: string; hex: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
      <div
        style={{
          width: '48px',
          height: '48px',
          backgroundColor: hex,
          borderRadius: '8px',
          border: '1px solid #e5e5e5',
        }}
      />
      <div>
        <div style={{ fontWeight: 500 }}>{name}</div>
        <div style={{ color: '#737373', fontFamily: 'monospace', fontSize: '14px' }}>{hex}</div>
      </div>
    </div>
  );
}

function ColorPalette({ title, shades }: { title: string; shades: Record<string, string> }) {
  return (
    <div style={{ marginBottom: '32px' }}>
      <h3 style={{ marginBottom: '16px', textTransform: 'capitalize' }}>{title}</h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '16px' }}>
        {Object.entries(shades).map(([shade, hex]) => (
          <ColorSwatch key={shade} name={`${title}-${shade}`} hex={hex} />
        ))}
      </div>
    </div>
  );
}

function ColorsShowcase() {
  return (
    <div style={{ padding: '24px', fontFamily: 'system-ui, sans-serif' }}>
      <h1 style={{ marginBottom: '8px' }}>Trellis Colors</h1>
      <p style={{ color: '#737373', marginBottom: '32px' }}>
        The Trellis color palette provides a consistent visual language across the platform.
      </p>

      <ColorPalette title="primary" shades={colors.primary} />
      <ColorPalette title="neutral" shades={colors.neutral} />
      <ColorPalette title="success" shades={colors.success} />
      <ColorPalette title="warning" shades={colors.warning} />
      <ColorPalette title="error" shades={colors.error} />
    </div>
  );
}

const meta: Meta = {
  title: 'Foundations/Colors',
  parameters: {
    layout: 'fullscreen',
  },
};

export default meta;

type Story = StoryObj;

export const Palette: Story = {
  render: () => <ColorsShowcase />,
};
