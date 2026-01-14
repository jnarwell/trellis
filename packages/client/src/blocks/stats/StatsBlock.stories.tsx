/**
 * Storybook Stories for StatsBlock
 *
 * Demonstrates various configurations of the Stats block.
 */

import type { Meta, StoryObj } from '@storybook/react';
import { StatsBlock } from './StatsBlock.js';
import type { StatsBlockConfig } from './types.js';

const meta: Meta<typeof StatsBlock> = {
  title: 'Blocks/StatsBlock',
  component: StatsBlock,
  parameters: {
    layout: 'padded',
  },
  argTypes: {
    onEvent: { action: 'onEvent' },
  },
};

export default meta;
type Story = StoryObj<typeof StatsBlock>;

// =============================================================================
// BASIC STORIES
// =============================================================================

/**
 * Default stats with static values in row layout.
 */
export const Default: Story = {
  args: {
    config: {
      block: 'stats',
      layout: 'row',
      stats: [
        { label: 'Total Users', value: 1234 },
        { label: 'Active Projects', value: 56 },
        { label: 'Completed Tasks', value: 892 },
      ],
    },
  },
};

/**
 * Stats with various number formats.
 */
export const WithFormats: Story = {
  args: {
    config: {
      block: 'stats',
      layout: 'row',
      stats: [
        { label: 'Revenue', value: 125000, format: 'currency', prefix: '$' },
        { label: 'Growth', value: 0.23, format: 'percent' },
        { label: 'Orders', value: 1547, format: 'number' },
      ],
    },
  },
};

/**
 * Stats in grid layout with custom columns.
 */
export const GridLayout: Story = {
  args: {
    config: {
      block: 'stats',
      layout: 'grid',
      columns: 3,
      stats: [
        { label: 'Products', value: 342 },
        { label: 'Categories', value: 28 },
        { label: 'Brands', value: 15 },
        { label: 'Suppliers', value: 47 },
        { label: 'Warehouses', value: 8 },
        { label: 'Countries', value: 12 },
      ],
    },
  },
};

/**
 * Stats with comparison indicators.
 */
export const WithComparison: Story = {
  args: {
    config: {
      block: 'stats',
      layout: 'row',
      stats: [
        {
          label: 'Monthly Revenue',
          value: 84500,
          format: 'currency',
          prefix: '$',
          comparison: {
            label: 'vs last month',
            value: 72000,
            type: 'percent',
          },
        },
        {
          label: 'New Customers',
          value: 128,
          comparison: {
            label: 'vs last month',
            value: 95,
            type: 'absolute',
          },
        },
        {
          label: 'Churn Rate',
          value: 0.032,
          format: 'percent',
          comparison: {
            label: 'vs last month',
            value: 0.045,
            type: 'percent',
          },
        },
      ],
    },
  },
};

/**
 * Stats with custom colors.
 */
export const WithColors: Story = {
  args: {
    config: {
      block: 'stats',
      layout: 'row',
      stats: [
        { label: 'Success', value: 847, color: '#22c55e' },
        { label: 'Pending', value: 234, color: '#f59e0b' },
        { label: 'Failed', value: 12, color: '#ef4444' },
      ],
    },
  },
};

/**
 * Single stat card.
 */
export const SingleStat: Story = {
  args: {
    config: {
      block: 'stats',
      stats: [
        {
          label: 'Total Revenue',
          value: 1250000,
          format: 'currency',
          prefix: '$',
          comparison: {
            label: 'vs last year',
            value: 980000,
            type: 'percent',
          },
        },
      ],
    },
  },
};

/**
 * Empty state when no stats configured.
 */
export const Empty: Story = {
  args: {
    config: {
      block: 'stats',
      stats: [],
    },
  },
};
