/**
 * Trellis TableBlock - Row Component
 */

import React from 'react';
import type { TableRowProps, ColumnConfig } from './types.js';
import type { ActionConfig } from '../types.js';
import { TableCell } from './TableCell.js';
import { tr, td, checkbox, actionsCell, actionButton, cn } from './styles.js';

// =============================================================================
// ACTION BUTTON
// =============================================================================

interface ActionButtonProps {
  action: ActionConfig;
  onClick: () => void;
}

const ActionButton: React.FC<ActionButtonProps> = ({ action, onClick }) => {
  const variant = action.variant ?? 'default';

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent row click
    onClick();
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className={cn(
        actionButton.base,
        variant === 'primary' && actionButton.primary,
        variant === 'danger' && actionButton.danger
      )}
      title={action.label}
      aria-label={action.label}
    >
      {action.icon ? (
        <ActionIcon name={action.icon} />
      ) : (
        <span className="text-xs">{action.label}</span>
      )}
    </button>
  );
};

// =============================================================================
// ACTION ICON
// =============================================================================

interface ActionIconProps {
  name: string;
}

const ActionIcon: React.FC<ActionIconProps> = ({ name }) => {
  // Common icons - in a real app, this would use an icon library
  const icons: Record<string, React.ReactNode> = {
    edit: (
      <svg className={actionButton.icon} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
      </svg>
    ),
    delete: (
      <svg className={actionButton.icon} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
      </svg>
    ),
    view: (
      <svg className={actionButton.icon} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
      </svg>
    ),
    copy: (
      <svg className={actionButton.icon} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
      </svg>
    ),
    more: (
      <svg className={actionButton.icon} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
      </svg>
    ),
  };

  return icons[name] ?? <span className="text-xs">{name}</span>;
};

// =============================================================================
// SELECTION CELL
// =============================================================================

interface SelectionCellProps {
  selected: boolean;
  onSelect: () => void;
  compact?: boolean;
}

const SelectionCell: React.FC<SelectionCellProps> = ({
  selected,
  onSelect,
  compact,
}) => {
  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent row click
  };

  return (
    <td className={cn(td.base, compact && td.compact, 'w-10')} onClick={handleClick}>
      <input
        type="checkbox"
        className={checkbox.base}
        checked={selected}
        onChange={onSelect}
        aria-label={selected ? 'Deselect row' : 'Select row'}
      />
    </td>
  );
};

// =============================================================================
// ROW NUMBER CELL
// =============================================================================

interface RowNumberCellProps {
  index: number;
  compact?: boolean;
}

const RowNumberCell: React.FC<RowNumberCellProps> = ({ index, compact }) => (
  <td className={cn(td.base, compact && td.compact, 'w-12 text-center text-gray-500')}>
    {index + 1}
  </td>
);

// =============================================================================
// ACTIONS CELL
// =============================================================================

interface ActionsCellProps {
  actions: readonly ActionConfig[];
  onAction: (action: ActionConfig) => void;
  compact?: boolean;
}

const ActionsCell: React.FC<ActionsCellProps> = ({ actions, onAction, compact }) => (
  <td className={cn(td.base, compact && td.compact, 'w-20')}>
    <div className={cn(actionsCell.base, 'justify-end')}>
      {actions.map((action, i) => (
        <ActionButton
          key={action.label + i}
          action={action}
          onClick={() => onAction(action)}
        />
      ))}
    </div>
  </td>
);

// =============================================================================
// MAIN TABLE ROW COMPONENT
// =============================================================================

export const TableRow: React.FC<TableRowProps> = ({
  entity,
  index,
  columns,
  selected = false,
  onSelect,
  onClick,
  onDoubleClick,
  actions,
  onAction,
  showRowNumber = false,
  showSelection = false,
  striped = false,
  hoverable = true,
  compact = false,
}) => {
  // Filter out hidden columns
  const visibleColumns = columns.filter((col) => !col.hidden);

  const handleClick = () => {
    onClick?.();
  };

  const handleDoubleClick = () => {
    onDoubleClick?.();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      onClick?.();
    }
  };

  return (
    <tr
      className={cn(
        tr.base,
        striped && tr.striped,
        hoverable && tr.hoverable,
        selected && tr.selected,
        onClick && tr.clickable
      )}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
      onKeyDown={handleKeyDown}
      tabIndex={onClick ? 0 : undefined}
      role={onClick ? 'button' : undefined}
      aria-selected={selected}
    >
      {showSelection && onSelect && (
        <SelectionCell
          selected={selected}
          onSelect={onSelect}
          compact={compact}
        />
      )}

      {showRowNumber && <RowNumberCell index={index} compact={compact} />}

      {visibleColumns.map((column) => (
        <td
          key={column.property}
          className={cn(
            td.base,
            compact && td.compact,
            td.align[column.align ?? 'left'],
            column.className
          )}
          style={{
            width: column.width,
            minWidth: column.minWidth,
          }}
        >
          <TableCell
            column={column}
            entity={entity}
            rowIndex={index}
          />
        </td>
      ))}

      {actions && actions.length > 0 && onAction && (
        <ActionsCell
          actions={actions}
          onAction={onAction}
          compact={compact}
        />
      )}
    </tr>
  );
};

export { ActionButton, ActionIcon };
