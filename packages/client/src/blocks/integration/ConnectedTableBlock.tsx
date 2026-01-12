/**
 * Trellis ConnectedTableBlock
 *
 * SDK-integrated wrapper for TableBlock that handles data fetching.
 */

import React, { useMemo, useCallback, useEffect, useRef } from 'react';
import type { Entity, EntityId, BlockInstanceId } from '@trellis/kernel';
import { useQuery } from '../../state/hooks.js';
import { TableBlock } from '../table/index.js';
import type { TableBlockConfig, ColumnConfig } from '../table/types.js';
import { useOptionalBlockContext } from '../BlockProvider.js';

// =============================================================================
// TYPES
// =============================================================================

/**
 * Props for ConnectedTableBlock.
 */
export interface ConnectedTableBlockProps {
  /** Table configuration */
  readonly config: TableBlockConfig;

  /** Block instance ID */
  readonly instanceId?: BlockInstanceId | undefined;

  /** Additional CSS class */
  readonly className?: string | undefined;

  /** Callback when row is clicked */
  readonly onRowClick?: ((entity: Entity, index: number) => void) | undefined;

  /** Callback when selection changes */
  readonly onSelectionChange?: ((selectedIds: EntityId[]) => void) | undefined;
}

/**
 * Internal state for query parameters.
 */
interface QueryState {
  page: number;
  pageSize: number;
  sortColumn: string | null;
  sortDirection: 'asc' | 'desc';
  filters: Record<string, unknown>;
  searchQuery: string;
}

// =============================================================================
// COMPONENT
// =============================================================================

/**
 * ConnectedTableBlock wraps TableBlock with SDK data fetching.
 */
export function ConnectedTableBlock({
  config,
  instanceId,
  className,
  onRowClick,
  onSelectionChange,
}: ConnectedTableBlockProps): React.ReactElement {
  const blockContext = useOptionalBlockContext();

  // Track query state internally
  const [queryState, setQueryState] = React.useState<QueryState>({
    page: 1,
    pageSize: config.pagination?.pageSize ?? 25,
    sortColumn: config.defaultSort?.column ?? null,
    sortDirection: config.defaultSort?.direction ?? 'asc',
    filters: config.defaultFilters ?? {},
    searchQuery: '',
  });

  // Build query options from state
  const queryOptions = useMemo(() => {
    const options: Record<string, unknown> = {
      limit: queryState.pageSize,
      includeTotal: true,
    };

    // Add filters
    if (Object.keys(queryState.filters).length > 0 || queryState.searchQuery) {
      const filter: Record<string, unknown> = { ...queryState.filters };

      // Add search filter if present
      if (queryState.searchQuery && config.searchProperties?.length) {
        filter['_search'] = {
          query: queryState.searchQuery,
          properties: config.searchProperties,
        };
      }

      options['filter'] = filter;
    }

    // Add sort
    if (queryState.sortColumn) {
      options['sort'] = [
        {
          path: queryState.sortColumn,
          direction: queryState.sortDirection,
        },
      ];
    }

    return options;
  }, [queryState, config.searchProperties]);

  // Query data from SDK
  const { data, loading, error, pagination, refetch, fetchMore } = useQuery(
    config.source,
    queryOptions
  );

  // Handle page changes from TableBlock
  const prevPage = useRef(queryState.page);
  useEffect(() => {
    if (queryState.page !== prevPage.current) {
      if (queryState.page > prevPage.current && pagination?.hasMore) {
        void fetchMore();
      } else {
        void refetch();
      }
      prevPage.current = queryState.page;
    }
  }, [queryState.page, pagination?.hasMore, fetchMore, refetch]);

  // Refetch when sort/filter changes
  const prevSort = useRef({ column: queryState.sortColumn, direction: queryState.sortDirection });
  const prevFilters = useRef(queryState.filters);
  useEffect(() => {
    const sortChanged =
      prevSort.current.column !== queryState.sortColumn ||
      prevSort.current.direction !== queryState.sortDirection;
    const filtersChanged = JSON.stringify(prevFilters.current) !== JSON.stringify(queryState.filters);

    if (sortChanged || filtersChanged) {
      setQueryState((prev) => ({ ...prev, page: 1 }));
      prevSort.current = { column: queryState.sortColumn, direction: queryState.sortDirection };
      prevFilters.current = queryState.filters;
    }
  }, [queryState.sortColumn, queryState.sortDirection, queryState.filters]);

  // Handle row click
  const handleRowClick = useCallback(
    (entity: Entity, index: number) => {
      if (blockContext) {
        blockContext.emit('rowClicked', { entity, index });
      }
      onRowClick?.(entity, index);

      if (config.onRowClick === 'navigate' && config.rowClickTarget) {
        blockContext?.emit('navigate', {
          target: config.rowClickTarget,
          entity,
        });
      }
    },
    [blockContext, onRowClick, config.onRowClick, config.rowClickTarget]
  );

  // Handle selection change
  const handleSelectionChange = useCallback(
    (selectedIds: EntityId[]) => {
      if (blockContext) {
        blockContext.emit('selectionChanged', { selectedIds });
      }
      onSelectionChange?.(selectedIds);
    },
    [blockContext, onSelectionChange]
  );

  // Emit data loaded event
  useEffect(() => {
    if (data.length > 0 && blockContext) {
      blockContext.emit('dataLoaded', {
        entities: data,
        totalCount: pagination?.totalCount,
      });
    }
  }, [data, pagination?.totalCount, blockContext]);

  // Emit error event
  useEffect(() => {
    if (error && blockContext) {
      blockContext.emit('error', { error });
    }
  }, [error, blockContext]);

  // Build props for TableBlock - handle optional props properly
  const tableBlockProps: {
    config: TableBlockConfig;
    data: readonly Entity[];
    loading: boolean;
    onRowClick: (entity: Entity, index: number) => void;
    onSelectionChange: (selectedIds: EntityId[]) => void;
    instanceId?: BlockInstanceId;
    className?: string;
    error?: Error;
    totalCount?: number;
  } = {
    config,
    data,
    loading,
    onRowClick: handleRowClick,
    onSelectionChange: handleSelectionChange,
  };

  if (instanceId !== undefined) {
    tableBlockProps.instanceId = instanceId;
  }
  if (className !== undefined) {
    tableBlockProps.className = className;
  }
  if (error) {
    tableBlockProps.error = new Error(error.message ?? 'Query failed');
  }
  if (pagination?.totalCount !== undefined) {
    tableBlockProps.totalCount = pagination.totalCount;
  }

  return <TableBlock {...tableBlockProps} />;
}

/**
 * Build a TableBlockConfig from a generic block spec.
 */
export function buildTableBlockConfig(
  blockSpec: Record<string, unknown>
): TableBlockConfig {
  // Build config object directly to avoid type assertion issues
  // Support both 'source' and 'entityType' for backwards compatibility
  const configObj: Record<string, unknown> = {
    source: (blockSpec['source'] as string) ?? (blockSpec['entityType'] as string) ?? '',
    columns: blockSpec['columns'] ?? [],
  };

  // Only add optional properties if they exist
  if (blockSpec['actions'] !== undefined) {
    configObj['actions'] = blockSpec['actions'];
  }
  if (blockSpec['pagination'] !== undefined) {
    configObj['pagination'] = blockSpec['pagination'];
  }
  if (blockSpec['filters'] !== undefined) {
    configObj['filters'] = blockSpec['filters'];
  }
  if (blockSpec['selectable'] !== undefined) {
    configObj['selectable'] = blockSpec['selectable'];
  }
  if (blockSpec['selectionMode'] !== undefined) {
    configObj['selectionMode'] = blockSpec['selectionMode'];
  }
  if (blockSpec['searchable'] !== undefined) {
    configObj['searchable'] = blockSpec['searchable'];
  }
  if (blockSpec['searchPlaceholder'] !== undefined) {
    configObj['searchPlaceholder'] = blockSpec['searchPlaceholder'];
  }
  if (blockSpec['searchProperties'] !== undefined) {
    configObj['searchProperties'] = blockSpec['searchProperties'];
  }
  if (blockSpec['defaultSort'] !== undefined) {
    configObj['defaultSort'] = blockSpec['defaultSort'];
  }
  if (blockSpec['defaultFilters'] !== undefined) {
    configObj['defaultFilters'] = blockSpec['defaultFilters'];
  }
  if (blockSpec['onRowClick'] !== undefined) {
    configObj['onRowClick'] = blockSpec['onRowClick'];
  }
  if (blockSpec['rowClickTarget'] !== undefined) {
    configObj['rowClickTarget'] = blockSpec['rowClickTarget'];
  }
  if (blockSpec['showRowNumbers'] !== undefined) {
    configObj['showRowNumbers'] = blockSpec['showRowNumbers'];
  }
  if (blockSpec['compact'] !== undefined) {
    configObj['compact'] = blockSpec['compact'];
  }
  if (blockSpec['striped'] !== undefined) {
    configObj['striped'] = blockSpec['striped'];
  }
  if (blockSpec['hoverable'] !== undefined) {
    configObj['hoverable'] = blockSpec['hoverable'];
  }
  if (blockSpec['bordered'] !== undefined) {
    configObj['bordered'] = blockSpec['bordered'];
  }
  if (blockSpec['emptyMessage'] !== undefined) {
    configObj['emptyMessage'] = blockSpec['emptyMessage'];
  }
  if (blockSpec['loadingMessage'] !== undefined) {
    configObj['loadingMessage'] = blockSpec['loadingMessage'];
  }

  return configObj as unknown as TableBlockConfig;
}

/**
 * Hook to build a config for ConnectedTableBlock from ProductConfig block spec.
 */
export function useTableBlockConfig(
  blockSpec: Record<string, unknown>
): TableBlockConfig {
  return useMemo(() => buildTableBlockConfig(blockSpec), [blockSpec]);
}
