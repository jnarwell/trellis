import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';

const fontSizes = [
  { name: 'xs', size: '12px', lineHeight: '16px' },
  { name: 'sm', size: '14px', lineHeight: '20px' },
  { name: 'base', size: '16px', lineHeight: '24px' },
  { name: 'lg', size: '18px', lineHeight: '28px' },
  { name: 'xl', size: '20px', lineHeight: '28px' },
  { name: '2xl', size: '24px', lineHeight: '32px' },
  { name: '3xl', size: '30px', lineHeight: '36px' },
  { name: '4xl', size: '36px', lineHeight: '40px' },
];

const fontWeights = [
  { name: 'normal', weight: 400 },
  { name: 'medium', weight: 500 },
  { name: 'semibold', weight: 600 },
  { name: 'bold', weight: 700 },
];

function TypeScale() {
  return (
    <div style={{ padding: '24px', fontFamily: 'system-ui, sans-serif' }}>
      <h1 style={{ marginBottom: '8px' }}>Typography</h1>
      <p style={{ color: '#737373', marginBottom: '32px' }}>
        Trellis uses a modular type scale for consistent visual hierarchy.
      </p>

      <h2 style={{ marginBottom: '16px' }}>Font Sizes</h2>
      <div style={{ marginBottom: '48px' }}>
        {fontSizes.map(({ name, size, lineHeight }) => (
          <div
            key={name}
            style={{
              display: 'flex',
              alignItems: 'baseline',
              gap: '24px',
              marginBottom: '16px',
              paddingBottom: '16px',
              borderBottom: '1px solid #e5e5e5',
            }}
          >
            <div style={{ width: '80px', color: '#737373', fontFamily: 'monospace', fontSize: '14px' }}>
              {name}
            </div>
            <div style={{ width: '100px', color: '#737373', fontFamily: 'monospace', fontSize: '14px' }}>
              {size} / {lineHeight}
            </div>
            <div style={{ fontSize: size, lineHeight }}>
              The quick brown fox jumps over the lazy dog
            </div>
          </div>
        ))}
      </div>

      <h2 style={{ marginBottom: '16px' }}>Font Weights</h2>
      <div style={{ marginBottom: '48px' }}>
        {fontWeights.map(({ name, weight }) => (
          <div
            key={name}
            style={{
              display: 'flex',
              alignItems: 'baseline',
              gap: '24px',
              marginBottom: '16px',
              paddingBottom: '16px',
              borderBottom: '1px solid #e5e5e5',
            }}
          >
            <div style={{ width: '80px', color: '#737373', fontFamily: 'monospace', fontSize: '14px' }}>
              {name}
            </div>
            <div style={{ width: '100px', color: '#737373', fontFamily: 'monospace', fontSize: '14px' }}>
              {weight}
            </div>
            <div style={{ fontSize: '18px', fontWeight: weight }}>
              The quick brown fox jumps over the lazy dog
            </div>
          </div>
        ))}
      </div>

      <h2 style={{ marginBottom: '16px' }}>Recommended Font Stack</h2>
      <pre
        style={{
          backgroundColor: '#f5f5f5',
          padding: '16px',
          borderRadius: '8px',
          fontFamily: 'monospace',
          fontSize: '14px',
          overflow: 'auto',
        }}
      >
        {`font-family: system-ui, -apple-system, BlinkMacSystemFont,
  'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;`}
      </pre>
    </div>
  );
}

const meta: Meta = {
  title: 'Foundations/Typography',
  parameters: {
    layout: 'fullscreen',
  },
};

export default meta;

type Story = StoryObj;

export const Scale: Story = {
  render: () => <TypeScale />,
};
