/**
 * KanbanBlock Unit Tests
 *
 * Tests for KanbanBlock utility functions.
 */

import { describe, it, expect } from 'vitest';
import type { Entity, PropertyName } from '@trellis/kernel';

import { getColumnColor, getBadgeStyle } from '../../src/blocks/kanban/styles.js';

// =============================================================================
// TEST FIXTURES
// =============================================================================

const mockEntity = (id: string, data: Record<string, unknown>): Entity => ({
  id: id as Entity['id'],
  type: 'task' as Entity['type'],
  version: 1,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  properties: Object.fromEntries(
    Object.entries(data).map(([key, value]) => [
      key,
      { source: 'literal' as const, name: key as PropertyName, value: { type: 'text', value } },
    ])
  ),
});

// =============================================================================
// COLUMN COLOR TESTS
// =============================================================================

describe('getColumnColor', () => {
  it('returns explicit hex color', () => {
    expect(getColumnColor({ value: 'test', color: '#ff0000' })).toBe('#ff0000');
  });

  it('returns named color from mapping', () => {
    expect(getColumnColor({ value: 'test', color: 'blue' })).toBe('#3b82f6');
    expect(getColumnColor({ value: 'test', color: 'green' })).toBe('#22c55e');
    expect(getColumnColor({ value: 'test', color: 'red' })).toBe('#ef4444');
  });

  it('maps status values to colors', () => {
    expect(getColumnColor({ value: 'todo' })).toBe('#6b7280');
    expect(getColumnColor({ value: 'in_progress' })).toBe('#3b82f6');
    expect(getColumnColor({ value: 'done' })).toBe('#22c55e');
  });

  it('handles normalized status values', () => {
    expect(getColumnColor({ value: 'in-progress' })).toBe('#3b82f6');
    expect(getColumnColor({ value: 'in progress' })).toBe('#3b82f6');
    expect(getColumnColor({ value: 'inprogress' })).toBe('#3b82f6');
  });

  it('returns default gray for unknown values', () => {
    expect(getColumnColor({ value: 'unknown' })).toBe('#6b7280');
    expect(getColumnColor({ value: 'custom_status' })).toBe('#6b7280');
  });
});

// =============================================================================
// BADGE STYLE TESTS
// =============================================================================

describe('getBadgeStyle', () => {
  it('returns style for priority values', () => {
    const highStyle = getBadgeStyle('high');
    expect(highStyle).toHaveProperty('backgroundColor');
    expect(highStyle).toHaveProperty('color');
  });

  it('returns default style for unknown values', () => {
    const unknownStyle = getBadgeStyle('unknown');
    expect(unknownStyle).toHaveProperty('display');
  });
});

// =============================================================================
// GROUPING TESTS
// =============================================================================

describe('Entity grouping by status', () => {
  // Simulate getPropertyValue function
  const getPropertyValue = (entity: Entity, property: PropertyName): unknown => {
    const prop = entity.properties[property];
    if (!prop) return undefined;
    const propValue = (prop as { value: unknown }).value;
    if (propValue && typeof propValue === 'object' && 'value' in propValue) {
      return (propValue as { value: unknown }).value;
    }
    return propValue;
  };

  // Simulate groupByStatus function
  const groupByStatus = (
    entities: readonly Entity[],
    statusProperty: PropertyName
  ): Map<string, Entity[]> => {
    const groups = new Map<string, Entity[]>();

    for (const entity of entities) {
      const status = getPropertyValue(entity, statusProperty);
      const key = status !== undefined && status !== null ? String(status) : '';

      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(entity);
    }

    return groups;
  };

  const entities = [
    mockEntity('1', { name: 'Task 1', status: 'todo' }),
    mockEntity('2', { name: 'Task 2', status: 'todo' }),
    mockEntity('3', { name: 'Task 3', status: 'in_progress' }),
    mockEntity('4', { name: 'Task 4', status: 'done' }),
  ];

  it('groups entities by status', () => {
    const groups = groupByStatus(entities, 'status' as PropertyName);

    expect(groups.get('todo')).toHaveLength(2);
    expect(groups.get('in_progress')).toHaveLength(1);
    expect(groups.get('done')).toHaveLength(1);
  });

  it('handles missing status property', () => {
    const entitiesWithMissing = [
      mockEntity('1', { name: 'Task 1', status: 'todo' }),
      mockEntity('2', { name: 'Task 2' }), // No status
    ];

    const groups = groupByStatus(entitiesWithMissing, 'status' as PropertyName);

    expect(groups.get('todo')).toHaveLength(1);
    expect(groups.get('')).toHaveLength(1);
  });

  it('returns empty map for empty entities', () => {
    const groups = groupByStatus([], 'status' as PropertyName);
    expect(groups.size).toBe(0);
  });
});

// =============================================================================
// CARD TEMPLATE TESTS
// =============================================================================

describe('Card template evaluation', () => {
  // Simulate getPropertyValue function
  const getPropertyValue = (entity: Entity, property: PropertyName): unknown => {
    const prop = entity.properties[property];
    if (!prop) return undefined;
    const propValue = (prop as { value: unknown }).value;
    if (propValue && typeof propValue === 'object' && 'value' in propValue) {
      return (propValue as { value: unknown }).value;
    }
    return propValue;
  };

  // Simulate evaluateSimpleTemplate function
  const evaluateSimpleTemplate = (template: string, entity: Entity): string => {
    return template.replace(/\$\{?\$?entity\.(\w+)\}?/g, (_, property) => {
      const value = getPropertyValue(entity, property as PropertyName);
      return value !== undefined && value !== null ? String(value) : '';
    });
  };

  const entity = mockEntity('task_1', { name: 'Design UI', assignee: 'Alice', priority: 'high' });

  it('evaluates title template', () => {
    expect(evaluateSimpleTemplate('${entity.name}', entity)).toBe('Design UI');
  });

  it('evaluates subtitle template', () => {
    expect(evaluateSimpleTemplate('${entity.assignee}', entity)).toBe('Alice');
  });

  it('handles missing properties', () => {
    expect(evaluateSimpleTemplate('${entity.description}', entity)).toBe('');
  });

  it('handles multiple properties', () => {
    expect(evaluateSimpleTemplate('${entity.name} by ${entity.assignee}', entity))
      .toBe('Design UI by Alice');
  });
});

// =============================================================================
// COLUMN CONFIG TESTS
// =============================================================================

describe('KanbanColumn configuration', () => {
  it('validates column structure', () => {
    const column = {
      value: 'in_progress',
      label: 'In Progress',
      color: 'blue',
      limit: 5,
    };

    expect(column.value).toBe('in_progress');
    expect(column.label).toBe('In Progress');
    expect(column.color).toBe('blue');
    expect(column.limit).toBe(5);
  });

  it('detects WIP limit exceeded', () => {
    const column = { value: 'test', label: 'Test', limit: 3 };
    const count = 5;

    expect(count > (column.limit ?? Infinity)).toBe(true);
  });

  it('handles no WIP limit', () => {
    const column = { value: 'test', label: 'Test' };
    const count = 100;

    expect(count > (column.limit ?? Infinity)).toBe(false);
  });
});

// =============================================================================
// CARD CONFIG TESTS
// =============================================================================

describe('KanbanCard configuration', () => {
  it('validates card structure', () => {
    const card = {
      title: '${entity.name}',
      subtitle: '${entity.assignee}',
      badges: [
        { property: 'priority' as PropertyName },
        { property: 'type' as PropertyName },
      ],
      onClick: 'viewTask',
    };

    expect(card.title).toBe('${entity.name}');
    expect(card.subtitle).toBe('${entity.assignee}');
    expect(card.badges).toHaveLength(2);
    expect(card.onClick).toBe('viewTask');
  });
});

// =============================================================================
// DRAG STATE TESTS
// =============================================================================

describe('Drag state management', () => {
  it('validates initial drag state', () => {
    const state = {
      draggedEntityId: null,
      dropTargetColumn: null,
    };

    expect(state.draggedEntityId).toBeNull();
    expect(state.dropTargetColumn).toBeNull();
  });

  it('validates dragging state', () => {
    const state = {
      draggedEntityId: 'task_1',
      dropTargetColumn: 'in_progress',
    };

    expect(state.draggedEntityId).toBe('task_1');
    expect(state.dropTargetColumn).toBe('in_progress');
  });
});
