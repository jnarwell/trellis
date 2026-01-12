/**
 * Trellis TableBlock - Main Component
 *
 * The most common block for listing entities in a table format.
 * Supports sorting, pagination, filtering, selection, and row actions.
 */

import React, { useCallback, useMemo } from 'react';
import type { Entity, EntityId, BlockInstanceId } from '@trellis/kernel';
import type { TableBlockProps, TableBlockConfig } from './types.js';
import type { ActionConfig } from '../types.js';
import { useTableState } from './hooks.js';
import { TableHeader } from './TableHeader.js';
import { TableRow } from './TableRow.js';
import { TablePagination } from './TablePagination.js';
import { TableFilters } from './TableFilters.js';
import {
  tableContainer,
  tableWrapper,
  table,
  tbody,
  emptyState,
  loadingState,
  loadingOverlay,
  errorState,
  cn,
} from './styles.js';

// =============================================================================
// EMPTY STATE
// =============================================================================

interface EmptyStateProps {
  message?: string | undefined;
}

const EmptyState: React.FC<EmptyStateProps> = ({
  message = 'No data available',
}) => (
  <div className={emptyState.container}>
    <svg className={emptyState.icon} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
      />
    </svg>
    <p className={emptyState.message}>{message}</p>
  </div>
);

// =============================================================================
// LOADING STATE
// =============================================================================

interface LoadingStateProps {
  message?: string | undefined;
  overlay?: boolean | undefined;
}

const LoadingState: React.FC<LoadingStateProps> = ({
  message = 'Loading...',
  overlay = false,
}) => {
  const content = (
    <>
      <svg className={loadingState.spinner} viewBox="0 0 24 24" fill="none">
        <circle
          className="opacity-25"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="4"
        />
        <path
          className="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
        />
      </svg>
      <span className={loadingState.message}>{message}</span>
    </>
  );

  if (overlay) {
    return <div className={loadingOverlay.container}>{content}</div>;
  }

  return <div className={loadingState.container}>{content}</div>;
};

// =============================================================================
// ERROR STATE
// =============================================================================

interface ErrorStateProps {
  error: Error;
  onRetry?: () => void;
}

const ErrorState: React.FC<ErrorStateProps> = ({ error, onRetry }) => (
  <div className={errorState.container}>
    <svg className={errorState.icon} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
      />
    </svg>
    <p className={errorState.message}>{error.message}</p>
    {onRetry && (
      <button type="button" onClick={onRetry} className={errorState.retry}>
        Try again
      </button>
    )}
  </div>
);

// =============================================================================
// MAIN TABLE BLOCK COMPONENT
// =============================================================================

export const TableBlock: React.FC<TableBlockProps> = ({
  config,
  instanceId,
  className,
  onRowClick,
  onSelectionChange,
  data: externalData,
  loading: externalLoading,
  error: externalError,
  totalCount: externalTotalCount,
}) => {
  // Initialize table state
  const {
    state,
    setPage,
    setPageSize,
    toggleSort,
    setFilter,
    clearFilters,
    setSearch,
    toggleRow,
    selectAll,
    deselectAll,
    isSelected,
    selectedIdsArray,
  } = useTableState({
    pageSize: config.pagination?.pageSize ?? 25,
    defaultSortColumn: config.defaultSort?.column ?? null,
    defaultSortDirection: config.defaultSort?.direction ?? 'asc',
    defaultFilters: config.defaultFilters ?? {},
    selectionMode: config.selectionMode ?? 'multiple',
  });

  // Use external data if provided, otherwise use internal query
  const data = externalData ?? [];
  const loading = externalLoading ?? state.loading;
  const error = externalError ?? state.error;
  const totalCount = externalTotalCount;

  // Handle row click
  const handleRowClick = useCallback(
    (entity: Entity, index: number) => {
      if (config.onRowClick === 'select' && config.selectable) {
        toggleRow(entity.id);
      } else if (onRowClick) {
        onRowClick(entity, index);
      }
    },
    [config.onRowClick, config.selectable, toggleRow, onRowClick]
  );

  // Handle action click
  const handleAction = useCallback(
    (action: ActionConfig, entity: Entity) => {
      // In a full implementation, this would emit an event through the wiring system
      console.log('Action clicked:', action.label, 'on entity:', entity.id);
    },
    []
  );

  // Handle select all
  const handleSelectAll = useCallback(() => {
    if (state.selectedIds.size === data.length && data.length > 0) {
      deselectAll();
    } else {
      selectAll(data.map((e) => e.id));
    }
  }, [state.selectedIds.size, data, deselectAll, selectAll]);

  // Selection state
  const allSelected = data.length > 0 && state.selectedIds.size === data.length;
  const someSelected = state.selectedIds.size > 0 && state.selectedIds.size < data.length;

  // Notify parent of selection changes
  React.useEffect(() => {
    onSelectionChange?.(selectedIdsArray);
  }, [selectedIdsArray, onSelectionChange]);

  // Calculate has more for pagination
  const hasMore = useMemo(() => {
    if (totalCount !== undefined) {
      return state.page * state.pageSize < totalCount;
    }
    return data.length === state.pageSize;
  }, [totalCount, state.page, state.pageSize, data.length]);

  // Determine what to render
  const showFilters = config.filters && config.filters.length > 0;
  const showPagination = config.pagination !== undefined;
  const showSelection = config.selectable === true;
  const showActions = config.actions && config.actions.length > 0;

  return (
    <div className={cn('table-block', tableContainer.base, config.bordered && tableContainer.bordered, className)}>
      {/* Filters */}
      {(showFilters || config.searchable) && (
        <TableFilters
          filters={config.filters ?? []}
          values={state.filters}
          onChange={setFilter}
          onClear={clearFilters}
          searchQuery={config.searchable ? state.searchQuery : undefined}
          onSearchChange={config.searchable ? setSearch : undefined}
          searchPlaceholder={config.searchPlaceholder}
          compact={config.compact}
        />
      )}

      {/* Table wrapper */}
      <div className={cn(tableWrapper.base, 'relative')}>
        {/* Loading overlay */}
        {loading && data.length > 0 && <LoadingState overlay />}

        {/* Error state */}
        {error && !loading && <ErrorState error={error} />}

        {/* Loading state (no data) */}
        {loading && data.length === 0 && !error && (
          <LoadingState message={config.loadingMessage} />
        )}

        {/* Empty state */}
        {!loading && !error && data.length === 0 && (
          <EmptyState message={config.emptyMessage} />
        )}

        {/* Table */}
        {data.length > 0 && !error && (
          <table className={cn(table.base, config.bordered && table.bordered)}>
            <TableHeader
              columns={config.columns}
              sortColumn={state.sortColumn}
              sortDirection={state.sortDirection}
              onSort={toggleSort}
              showSelection={showSelection}
              allSelected={allSelected}
              someSelected={someSelected}
              onSelectAll={showSelection ? handleSelectAll : undefined}
              showRowNumbers={config.showRowNumbers}
              showActions={showActions}
            />

            <tbody className={tbody.base}>
              {data.map((entity, index) => (
                <TableRow
                  key={entity.id}
                  entity={entity}
                  index={(state.page - 1) * state.pageSize + index}
                  columns={config.columns}
                  selected={isSelected(entity.id)}
                  onSelect={
                    showSelection ? () => toggleRow(entity.id) : undefined
                  }
                  onClick={
                    config.onRowClick !== 'select'
                      ? () => handleRowClick(entity, index)
                      : undefined
                  }
                  actions={config.actions}
                  onAction={
                    showActions
                      ? (action) => handleAction(action, entity)
                      : undefined
                  }
                  showRowNumber={config.showRowNumbers}
                  showSelection={showSelection}
                  striped={config.striped}
                  hoverable={config.hoverable}
                  compact={config.compact}
                />
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {showPagination && data.length > 0 && (
        <TablePagination
          page={state.page}
          pageSize={state.pageSize}
          totalCount={totalCount}
          hasMore={hasMore}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
          pageSizeOptions={config.pagination?.pageSizeOptions}
          showTotal={config.pagination?.showTotal}
          compact={config.compact}
        />
      )}
    </div>
  );
};

// =============================================================================
// EXPORTS
// =============================================================================

export { EmptyState, LoadingState, ErrorState };
export type { TableBlockProps, TableBlockConfig };
