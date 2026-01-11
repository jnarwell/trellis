import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import type { Entity } from '@trellis/kernel';

import { KanbanBlock, KanbanColumn, KanbanCard } from '../../blocks/kanban/index.js';
import type { KanbanColumnConfig, KanbanCardConfig } from '../../blocks/kanban/types.js';
import { TrellisProvider } from '../../state/store.js';
import { MockTrellisClient } from '../../test-utils/mock-client.js';

/**
 * KanbanBlock - Board view for workflow management
 *
 * Displays entities in status-based columns with drag-and-drop support.
 */

// =============================================================================
// MOCK DATA
// =============================================================================

const mockEntity = (
  id: string,
  data: Record<string, unknown>
): Entity => ({
  id: id as Entity['id'],
  type: 'task' as Entity['type'],
  version: 1,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  properties: Object.fromEntries(
    Object.entries(data).map(([key, value]) => [
      key,
      { source: 'literal' as const, value: { type: 'text', value } },
    ])
  ),
});

const taskEntities: Entity[] = [
  mockEntity('task_1', {
    name: 'Design user interface',
    status: 'todo',
    priority: 'high',
    assignee: 'Alice',
  }),
  mockEntity('task_2', {
    name: 'Implement API endpoints',
    status: 'todo',
    priority: 'medium',
    assignee: 'Bob',
  }),
  mockEntity('task_3', {
    name: 'Write unit tests',
    status: 'in_progress',
    priority: 'high',
    assignee: 'Charlie',
  }),
  mockEntity('task_4', {
    name: 'Review pull request',
    status: 'in_progress',
    priority: 'medium',
    assignee: 'Alice',
  }),
  mockEntity('task_5', {
    name: 'Deploy to staging',
    status: 'done',
    priority: 'low',
    assignee: 'Bob',
  }),
  mockEntity('task_6', {
    name: 'Update documentation',
    status: 'done',
    priority: 'low',
    assignee: 'Charlie',
  }),
];

const defaultColumns: KanbanColumnConfig[] = [
  { value: 'todo', label: 'To Do', color: 'gray' },
  { value: 'in_progress', label: 'In Progress', color: 'blue' },
  { value: 'done', label: 'Done', color: 'green' },
];

const defaultCardConfig: KanbanCardConfig = {
  title: '${entity.name}',
  subtitle: '${entity.assignee}',
  badges: [{ property: 'priority' }],
};

// =============================================================================
// STORY DECORATORS
// =============================================================================

const mockClient = new MockTrellisClient({
  entities: Object.fromEntries(taskEntities.map((e) => [e.id, e])),
  queryResults: { task: taskEntities },
});

const withTrellisProvider = (Story: React.ComponentType) => (
  <TrellisProvider client={mockClient as any}>
    <Story />
  </TrellisProvider>
);

// =============================================================================
// META
// =============================================================================

const meta: Meta<typeof KanbanBlock> = {
  title: 'Blocks/Kanban',
  component: KanbanBlock,
  decorators: [withTrellisProvider],
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
};

export default meta;

type Story = StoryObj<typeof KanbanBlock>;

// =============================================================================
// STORIES
// =============================================================================

/**
 * Basic Kanban board with three columns.
 */
export const Default: Story = {
  args: {
    source: 'task',
    statusProperty: 'status',
    columns: defaultColumns,
    card: defaultCardConfig,
    onEvent: (event) => console.log('Event:', event),
  },
};

/**
 * Kanban board with WIP (Work In Progress) limits.
 */
export const WithWIPLimits: Story = {
  args: {
    source: 'task',
    statusProperty: 'status',
    columns: [
      { value: 'todo', label: 'To Do', color: 'gray' },
      { value: 'in_progress', label: 'In Progress', color: 'blue', limit: 2 },
      { value: 'done', label: 'Done', color: 'green' },
    ],
    card: defaultCardConfig,
  },
};

/**
 * Kanban board with custom column colors.
 */
export const CustomColors: Story = {
  args: {
    source: 'task',
    statusProperty: 'status',
    columns: [
      { value: 'todo', label: 'Backlog', color: '#6366f1' },
      { value: 'in_progress', label: 'Active', color: '#f97316' },
      { value: 'done', label: 'Complete', color: '#22c55e' },
    ],
    card: defaultCardConfig,
  },
};

/**
 * Kanban board with minimal card configuration.
 */
export const MinimalCards: Story = {
  args: {
    source: 'task',
    statusProperty: 'status',
    columns: defaultColumns,
    card: {
      title: '${entity.name}',
    },
  },
};

/**
 * Kanban board with card click handlers.
 */
export const ClickableCards: Story = {
  args: {
    source: 'task',
    statusProperty: 'status',
    columns: defaultColumns,
    card: {
      ...defaultCardConfig,
      onClick: 'viewTask',
    },
    onEvent: (event) => {
      if (event.type === 'cardClicked') {
        alert(`Clicked: ${(event.entity.properties['name']?.value as { value: string })?.value}`);
      }
    },
  },
};

/**
 * Individual card component demo.
 */
export const CardDemo: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
      <div style={{ width: '280px' }}>
        <h3 style={{ margin: '0 0 12px', fontSize: '14px', color: '#666' }}>
          High Priority
        </h3>
        <KanbanCard
          entity={taskEntities[0]}
          config={defaultCardConfig}
          isDragging={false}
          onDragStart={() => {}}
          onDragEnd={() => {}}
        />
      </div>
      <div style={{ width: '280px' }}>
        <h3 style={{ margin: '0 0 12px', fontSize: '14px', color: '#666' }}>
          Medium Priority
        </h3>
        <KanbanCard
          entity={taskEntities[1]}
          config={defaultCardConfig}
          isDragging={false}
          onDragStart={() => {}}
          onDragEnd={() => {}}
        />
      </div>
      <div style={{ width: '280px' }}>
        <h3 style={{ margin: '0 0 12px', fontSize: '14px', color: '#666' }}>
          Dragging State
        </h3>
        <KanbanCard
          entity={taskEntities[2]}
          config={defaultCardConfig}
          isDragging={true}
          onDragStart={() => {}}
          onDragEnd={() => {}}
        />
      </div>
    </div>
  ),
};

/**
 * Individual column component demo.
 */
export const ColumnDemo: Story = {
  render: () => {
    const todoTasks = taskEntities.filter(
      (e) =>
        (e.properties['status']?.value as { value: string })?.value === 'todo'
    );

    return (
      <div style={{ display: 'flex', gap: '16px' }}>
        <KanbanColumn
          config={{ value: 'todo', label: 'To Do', color: 'gray' }}
          entities={todoTasks}
          cardConfig={defaultCardConfig}
          isDropTarget={false}
          onDrop={() => {}}
          onDragOver={() => {}}
          onDragLeave={() => {}}
          onDragStart={() => {}}
          onDragEnd={() => {}}
        />
        <KanbanColumn
          config={{ value: 'empty', label: 'Empty Column', color: 'blue' }}
          entities={[]}
          cardConfig={defaultCardConfig}
          isDropTarget={false}
          onDrop={() => {}}
          onDragOver={() => {}}
          onDragLeave={() => {}}
          onDragStart={() => {}}
          onDragEnd={() => {}}
        />
        <KanbanColumn
          config={{
            value: 'with_limit',
            label: 'With WIP Limit',
            color: 'orange',
            limit: 2,
          }}
          entities={todoTasks}
          cardConfig={defaultCardConfig}
          isDropTarget={false}
          onDrop={() => {}}
          onDragOver={() => {}}
          onDragLeave={() => {}}
          onDragStart={() => {}}
          onDragEnd={() => {}}
        />
      </div>
    );
  },
};

/**
 * Loading state.
 */
export const Loading: Story = {
  decorators: [
    (Story) => {
      const loadingClient = new MockTrellisClient({
        entities: {},
        queryResults: {},
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
    source: 'task',
    statusProperty: 'status',
    columns: defaultColumns,
    card: defaultCardConfig,
  },
};

/**
 * Empty board state.
 */
export const EmptyBoard: Story = {
  decorators: [
    (Story) => {
      const emptyClient = new MockTrellisClient({
        entities: {},
        queryResults: { task: [] },
      });
      return (
        <TrellisProvider client={emptyClient as any}>
          <Story />
        </TrellisProvider>
      );
    },
  ],
  args: {
    source: 'task',
    statusProperty: 'status',
    columns: defaultColumns,
    card: defaultCardConfig,
  },
};
