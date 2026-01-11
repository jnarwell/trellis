/**
 * Trellis TableBlock - Header Component
 */

import React from 'react';
import type { TableHeaderProps, ColumnConfig } from './types.js';
import { thead, th, sortIcon, checkbox, cn } from './styles.js';

// =============================================================================
// SORT ICON
// =============================================================================

interface SortIconProps {
  active: boolean;
  direction: 'asc' | 'desc';
}

const SortIcon: React.FC<SortIconProps> = ({ active, direction }) => {
  if (!active) {
    // Inactive - show both arrows faded
    return (
      <svg className={cn(sortIcon.base, sortIcon.inactive)} viewBox="0 0 16 16" fill="currentColor">
        <path d="M8 4L4 8h8L8 4z" opacity={0.5} />
        <path d="M8 12l4-4H4l4 4z" opacity={0.5} />
      </svg>
    );
  }

  // Active - show single arrow
  return (
    <svg className={cn(sortIcon.base, sortIcon.active)} viewBox="0 0 16 16" fill="currentColor">
      {direction === 'asc' ? (
        <path d="M8 4L4 8h8L8 4z" />
      ) : (
        <path d="M8 12l4-4H4l4 4z" />
      )}
    </svg>
  );
};

// =============================================================================
// COLUMN HEADER
// =============================================================================

interface ColumnHeaderProps {
  column: ColumnConfig;
  isSorted: boolean;
  sortDirection: 'asc' | 'desc';
  onSort: () => void;
  compact?: boolean;
}

const ColumnHeader: React.FC<ColumnHeaderProps> = ({
  column,
  isSorted,
  sortDirection,
  onSort,
  compact,
}) => {
  const label = column.label ?? formatPropertyName(column.property);
  const isSortable = column.sortable !== false;

  const handleClick = () => {
    if (isSortable) {
      onSort();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (isSortable && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      onSort();
    }
  };

  const alignment = column.align ?? 'left';

  return (
    <th
      className={cn(
        th.base,
        compact && th.compact,
        th.align[alignment],
        isSortable && th.sortable,
        isSorted && th.sorted
      )}
      style={{
        width: column.width,
        minWidth: column.minWidth,
      }}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      tabIndex={isSortable ? 0 : undefined}
      role={isSortable ? 'button' : undefined}
      aria-sort={isSorted ? (sortDirection === 'asc' ? 'ascending' : 'descending') : undefined}
    >
      <div className="flex items-center gap-1">
        <span>{label}</span>
        {isSortable && (
          <SortIcon active={isSorted} direction={sortDirection} />
        )}
      </div>
    </th>
  );
};

// =============================================================================
// SELECTION HEADER
// =============================================================================

interface SelectionHeaderProps {
  allSelected: boolean;
  someSelected: boolean;
  onSelectAll: () => void;
  compact?: boolean;
}

const SelectionHeader: React.FC<SelectionHeaderProps> = ({
  allSelected,
  someSelected,
  onSelectAll,
  compact,
}) => {
  const checkboxRef = React.useRef<HTMLInputElement>(null);

  // Handle indeterminate state
  React.useEffect(() => {
    if (checkboxRef.current) {
      checkboxRef.current.indeterminate = someSelected && !allSelected;
    }
  }, [someSelected, allSelected]);

  return (
    <th className={cn(th.base, compact && th.compact, 'w-10')}>
      <input
        ref={checkboxRef}
        type="checkbox"
        className={cn(checkbox.base, checkbox.indeterminate)}
        checked={allSelected}
        onChange={onSelectAll}
        aria-label={allSelected ? 'Deselect all' : 'Select all'}
      />
    </th>
  );
};

// =============================================================================
// ROW NUMBER HEADER
// =============================================================================

interface RowNumberHeaderProps {
  compact?: boolean;
}

const RowNumberHeader: React.FC<RowNumberHeaderProps> = ({ compact }) => (
  <th className={cn(th.base, compact && th.compact, 'w-12 text-center')}>#</th>
);

// =============================================================================
// ACTIONS HEADER
// =============================================================================

interface ActionsHeaderProps {
  compact?: boolean;
}

const ActionsHeader: React.FC<ActionsHeaderProps> = ({ compact }) => (
  <th className={cn(th.base, compact && th.compact, 'w-20 text-right')}>
    <span className="sr-only">Actions</span>
  </th>
);

// =============================================================================
// MAIN TABLE HEADER COMPONENT
// =============================================================================

export const TableHeader: React.FC<TableHeaderProps> = ({
  columns,
  sortColumn,
  sortDirection,
  onSort,
  showSelection = false,
  allSelected = false,
  someSelected = false,
  onSelectAll,
  showRowNumbers = false,
  showActions = false,
}) => {
  // Filter out hidden columns
  const visibleColumns = columns.filter((col) => !col.hidden);

  return (
    <thead className={thead.base}>
      <tr>
        {showSelection && onSelectAll && (
          <SelectionHeader
            allSelected={allSelected}
            someSelected={someSelected}
            onSelectAll={onSelectAll}
          />
        )}

        {showRowNumbers && <RowNumberHeader />}

        {visibleColumns.map((column) => (
          <ColumnHeader
            key={column.property}
            column={column}
            isSorted={sortColumn === column.property}
            sortDirection={sortDirection}
            onSort={() => onSort(column.property)}
          />
        ))}

        {showActions && <ActionsHeader />}
      </tr>
    </thead>
  );
};

// =============================================================================
// UTILITIES
// =============================================================================

/**
 * Format a property name as a label.
 * Converts snake_case or camelCase to Title Case.
 */
function formatPropertyName(name: string): string {
  return name
    // Insert space before capitals in camelCase
    .replace(/([A-Z])/g, ' $1')
    // Replace underscores with spaces
    .replace(/_/g, ' ')
    // Capitalize first letter of each word
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim();
}

export { formatPropertyName };
