/**
 * Trellis TableBlock - React Hooks
 */

import { useReducer, useCallback, useMemo, useEffect } from 'react';
import type { Entity, EntityId } from '@trellis/kernel';
import type { TableState, TableAction, TableBlockConfig } from './types.js';

// =============================================================================
// TABLE STATE REDUCER
// =============================================================================

function tableReducer(state: TableState, action: TableAction): TableState {
  switch (action.type) {
    case 'SET_PAGE':
      return { ...state, page: action.page };

    case 'SET_PAGE_SIZE':
      return { ...state, pageSize: action.pageSize, page: 1 };

    case 'SET_SORT':
      return {
        ...state,
        sortColumn: action.column,
        sortDirection: action.direction,
        page: 1,
      };

    case 'TOGGLE_SORT': {
      const newDirection =
        state.sortColumn === action.column && state.sortDirection === 'asc'
          ? 'desc'
          : 'asc';
      return {
        ...state,
        sortColumn: action.column,
        sortDirection: newDirection,
        page: 1,
      };
    }

    case 'SET_FILTER':
      return {
        ...state,
        filters: { ...state.filters, [action.property]: action.value },
        page: 1,
      };

    case 'SET_FILTERS':
      return { ...state, filters: action.filters, page: 1 };

    case 'CLEAR_FILTERS':
      return { ...state, filters: {}, searchQuery: '', page: 1 };

    case 'SET_SEARCH':
      return { ...state, searchQuery: action.query, page: 1 };

    case 'SELECT_ROW':
      return {
        ...state,
        selectedIds: new Set([...state.selectedIds, action.id]),
      };

    case 'DESELECT_ROW': {
      const newIds = new Set(state.selectedIds);
      newIds.delete(action.id);
      return { ...state, selectedIds: newIds };
    }

    case 'TOGGLE_ROW': {
      const newIds = new Set(state.selectedIds);
      if (newIds.has(action.id)) {
        newIds.delete(action.id);
      } else {
        newIds.add(action.id);
      }
      return { ...state, selectedIds: newIds };
    }

    case 'SELECT_ALL':
      return { ...state, selectedIds: new Set(action.ids) };

    case 'DESELECT_ALL':
      return { ...state, selectedIds: new Set() };

    case 'SET_LOADING':
      return { ...state, loading: action.loading };

    case 'SET_ERROR':
      return { ...state, error: action.error, loading: false };

    default:
      return state;
  }
}

// =============================================================================
// USE TABLE STATE HOOK
// =============================================================================

export interface UseTableStateOptions {
  /** Initial page size */
  pageSize?: number;

  /** Default sort column */
  defaultSortColumn?: string | null;

  /** Default sort direction */
  defaultSortDirection?: 'asc' | 'desc';

  /** Default filter values */
  defaultFilters?: Record<string, unknown>;

  /** Selection mode */
  selectionMode?: 'single' | 'multiple';
}

export interface UseTableStateReturn {
  /** Current state */
  state: TableState;

  /** Dispatch action */
  dispatch: React.Dispatch<TableAction>;

  /** Go to page */
  setPage: (page: number) => void;

  /** Change page size */
  setPageSize: (pageSize: number) => void;

  /** Toggle sort on column */
  toggleSort: (column: string) => void;

  /** Set explicit sort */
  setSort: (column: string, direction: 'asc' | 'desc') => void;

  /** Set filter value */
  setFilter: (property: string, value: unknown) => void;

  /** Set multiple filters */
  setFilters: (filters: Record<string, unknown>) => void;

  /** Clear all filters */
  clearFilters: () => void;

  /** Set search query */
  setSearch: (query: string) => void;

  /** Toggle row selection */
  toggleRow: (id: EntityId) => void;

  /** Select all rows */
  selectAll: (ids: readonly EntityId[]) => void;

  /** Deselect all rows */
  deselectAll: () => void;

  /** Check if row is selected */
  isSelected: (id: EntityId) => boolean;

  /** Get selected IDs as array */
  selectedIdsArray: EntityId[];

  /** Set loading state */
  setLoading: (loading: boolean) => void;

  /** Set error state */
  setError: (error: Error | null) => void;
}

/**
 * Hook for managing table state.
 */
export function useTableState(
  options: UseTableStateOptions = {}
): UseTableStateReturn {
  const {
    pageSize = 25,
    defaultSortColumn = null,
    defaultSortDirection = 'asc',
    defaultFilters = {},
    selectionMode = 'multiple',
  } = options;

  const initialState: TableState = {
    page: 1,
    pageSize,
    sortColumn: defaultSortColumn,
    sortDirection: defaultSortDirection,
    filters: defaultFilters,
    searchQuery: '',
    selectedIds: new Set(),
    loading: false,
    error: null,
  };

  const [state, dispatch] = useReducer(tableReducer, initialState);

  // Actions
  const setPage = useCallback(
    (page: number) => dispatch({ type: 'SET_PAGE', page }),
    []
  );

  const setPageSize = useCallback(
    (pageSize: number) => dispatch({ type: 'SET_PAGE_SIZE', pageSize }),
    []
  );

  const toggleSort = useCallback(
    (column: string) => dispatch({ type: 'TOGGLE_SORT', column }),
    []
  );

  const setSort = useCallback(
    (column: string, direction: 'asc' | 'desc') =>
      dispatch({ type: 'SET_SORT', column, direction }),
    []
  );

  const setFilter = useCallback(
    (property: string, value: unknown) =>
      dispatch({ type: 'SET_FILTER', property, value }),
    []
  );

  const setFilters = useCallback(
    (filters: Record<string, unknown>) =>
      dispatch({ type: 'SET_FILTERS', filters }),
    []
  );

  const clearFilters = useCallback(
    () => dispatch({ type: 'CLEAR_FILTERS' }),
    []
  );

  const setSearch = useCallback(
    (query: string) => dispatch({ type: 'SET_SEARCH', query }),
    []
  );

  const toggleRow = useCallback(
    (id: EntityId) => {
      if (selectionMode === 'single') {
        // For single selection, either select or deselect
        if (state.selectedIds.has(id)) {
          dispatch({ type: 'DESELECT_ALL' });
        } else {
          dispatch({ type: 'SELECT_ALL', ids: [id] });
        }
      } else {
        dispatch({ type: 'TOGGLE_ROW', id });
      }
    },
    [selectionMode, state.selectedIds]
  );

  const selectAll = useCallback(
    (ids: readonly EntityId[]) => dispatch({ type: 'SELECT_ALL', ids }),
    []
  );

  const deselectAll = useCallback(
    () => dispatch({ type: 'DESELECT_ALL' }),
    []
  );

  const isSelected = useCallback(
    (id: EntityId) => state.selectedIds.has(id),
    [state.selectedIds]
  );

  const selectedIdsArray = useMemo(
    () => Array.from(state.selectedIds),
    [state.selectedIds]
  );

  const setLoading = useCallback(
    (loading: boolean) => dispatch({ type: 'SET_LOADING', loading }),
    []
  );

  const setError = useCallback(
    (error: Error | null) => dispatch({ type: 'SET_ERROR', error }),
    []
  );

  return {
    state,
    dispatch,
    setPage,
    setPageSize,
    toggleSort,
    setSort,
    setFilter,
    setFilters,
    clearFilters,
    setSearch,
    toggleRow,
    selectAll,
    deselectAll,
    isSelected,
    selectedIdsArray,
    setLoading,
    setError,
  };
}

// =============================================================================
// USE TABLE DATA HOOK
// =============================================================================

export interface UseTableDataOptions {
  /** Entity type to query */
  entityType: string;

  /** Current page (1-indexed) */
  page: number;

  /** Page size */
  pageSize: number;

  /** Sort column */
  sortColumn: string | null;

  /** Sort direction */
  sortDirection: 'asc' | 'desc';

  /** Active filters */
  filters: Record<string, unknown>;

  /** Search query */
  searchQuery: string;

  /** Properties to search in */
  searchProperties?: readonly string[];

  /** Skip fetching */
  skip?: boolean;
}

export interface UseTableDataReturn {
  /** Fetched data */
  data: readonly Entity[];

  /** Loading state */
  loading: boolean;

  /** Error */
  error: Error | null;

  /** Total count */
  totalCount: number | undefined;

  /** Has more pages */
  hasMore: boolean;

  /** Refetch data */
  refetch: () => void;
}

/**
 * Hook for fetching table data.
 *
 * Note: This is a placeholder implementation. In a real app, this would
 * integrate with the TrellisClient via React context.
 */
export function useTableData(options: UseTableDataOptions): UseTableDataReturn {
  // This is a stub - real implementation would use TrellisClient from context
  // For now, return empty state
  return {
    data: [],
    loading: false,
    error: null,
    totalCount: undefined,
    hasMore: false,
    refetch: () => {},
  };
}

// =============================================================================
// UTILITY HOOKS
// =============================================================================

/**
 * Hook to build query parameters from table state.
 */
export function useQueryParams(
  state: TableState,
  config: TableBlockConfig
): {
  filter: Record<string, unknown>;
  sort: { path: string; direction: 'asc' | 'desc' } | null;
  pagination: { limit: number; offset: number };
} {
  return useMemo(() => {
    // Build filter from state
    const filter: Record<string, unknown> = { ...state.filters };

    // Add search to filter if present
    if (state.searchQuery && config.searchProperties?.length) {
      // This would be an OR filter across search properties
      filter['_search'] = {
        query: state.searchQuery,
        properties: config.searchProperties,
      };
    }

    // Build sort
    const sort = state.sortColumn
      ? { path: state.sortColumn, direction: state.sortDirection }
      : null;

    // Build pagination
    const pagination = {
      limit: state.pageSize,
      offset: (state.page - 1) * state.pageSize,
    };

    return { filter, sort, pagination };
  }, [state, config.searchProperties]);
}

/**
 * Hook for debounced search.
 */
export function useDebouncedValue<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}

// Import useState for useDebouncedValue
import { useState } from 'react';
