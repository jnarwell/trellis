/**
 * Trellis TableBlock - Type Definitions
 */

import type { Entity, EntityId, BlockInstanceId } from '@trellis/kernel';
import type {
  ActionConfig,
  FilterConfig,
  PaginationConfig,
  CellFormat,
  CellFormatOptions,
} from '../types.js';

// =============================================================================
// COLUMN CONFIGURATION
// =============================================================================

/**
 * Column configuration for the table.
 */
export interface ColumnConfig {
  /** Property path to display (e.g., "name", "address.city") */
  readonly property: string;

  /** Column header label */
  readonly label?: string;

  /** Whether this column is sortable */
  readonly sortable?: boolean;

  /** Column width (px, %, or 'auto') */
  readonly width?: number | string;

  /** Minimum width */
  readonly minWidth?: number;

  /** Cell format */
  readonly format?: CellFormat;

  /** Format options */
  readonly formatOptions?: CellFormatOptions;

  /** Data binding expression (overrides property) */
  readonly expression?: string;

  /** Alignment */
  readonly align?: 'left' | 'center' | 'right';

  /** Whether column is hidden */
  readonly hidden?: boolean;

  /** CSS class for cells in this column */
  readonly className?: string;

  /** Custom cell renderer name */
  readonly renderer?: string;
}

// =============================================================================
// TABLE BLOCK CONFIG
// =============================================================================

/**
 * TableBlock configuration from YAML.
 */
export interface TableBlockConfig {
  /** Entity type to query */
  readonly source: string;

  /** Column definitions */
  readonly columns: readonly ColumnConfig[];

  /** Row actions */
  readonly actions?: readonly ActionConfig[];

  /** Pagination settings */
  readonly pagination?: PaginationConfig;

  /** Filter definitions */
  readonly filters?: readonly FilterConfig[];

  /** Enable row selection */
  readonly selectable?: boolean;

  /** Selection mode */
  readonly selectionMode?: 'single' | 'multiple';

  /** Enable search box */
  readonly searchable?: boolean;

  /** Search placeholder */
  readonly searchPlaceholder?: string;

  /** Properties to search in */
  readonly searchProperties?: readonly string[];

  /** Initial sort */
  readonly defaultSort?: {
    readonly column: string;
    readonly direction: 'asc' | 'desc';
  };

  /** Initial filter values */
  readonly defaultFilters?: Record<string, unknown>;

  /** Row click behavior */
  readonly onRowClick?: 'select' | 'emit' | 'navigate';

  /** Navigation target template (if onRowClick is 'navigate') */
  readonly rowClickTarget?: string;

  /** Show row numbers */
  readonly showRowNumbers?: boolean;

  /** Compact mode (less padding) */
  readonly compact?: boolean;

  /** Striped rows */
  readonly striped?: boolean;

  /** Hover highlight */
  readonly hoverable?: boolean;

  /** Border style */
  readonly bordered?: boolean;

  /** Empty state message */
  readonly emptyMessage?: string;

  /** Loading state message */
  readonly loadingMessage?: string;
}

// =============================================================================
// TABLE BLOCK PROPS
// =============================================================================

/**
 * Props for the TableBlock component.
 */
export interface TableBlockProps {
  /** Block configuration */
  readonly config: TableBlockConfig;

  /** Block instance ID */
  readonly instanceId?: BlockInstanceId;

  /** Additional CSS class */
  readonly className?: string;

  /** Callback when row is clicked */
  readonly onRowClick?: (entity: Entity, index: number) => void;

  /** Callback when selection changes */
  readonly onSelectionChange?: (selectedIds: EntityId[]) => void;

  /** External data (skip internal query) */
  readonly data?: readonly Entity[];

  /** External loading state */
  readonly loading?: boolean;

  /** External error */
  readonly error?: Error | null;

  /** External total count */
  readonly totalCount?: number;
}

// =============================================================================
// TABLE STATE
// =============================================================================

/**
 * Internal state for the table.
 */
export interface TableState {
  /** Current page (1-indexed) */
  page: number;

  /** Items per page */
  pageSize: number;

  /** Sort column */
  sortColumn: string | null;

  /** Sort direction */
  sortDirection: 'asc' | 'desc';

  /** Active filters */
  filters: Record<string, unknown>;

  /** Search query */
  searchQuery: string;

  /** Selected row IDs */
  selectedIds: Set<EntityId>;

  /** Loading state */
  loading: boolean;

  /** Error state */
  error: Error | null;
}

/**
 * Actions to update table state.
 */
export type TableAction =
  | { type: 'SET_PAGE'; page: number }
  | { type: 'SET_PAGE_SIZE'; pageSize: number }
  | { type: 'SET_SORT'; column: string; direction: 'asc' | 'desc' }
  | { type: 'TOGGLE_SORT'; column: string }
  | { type: 'SET_FILTER'; property: string; value: unknown }
  | { type: 'SET_FILTERS'; filters: Record<string, unknown> }
  | { type: 'CLEAR_FILTERS' }
  | { type: 'SET_SEARCH'; query: string }
  | { type: 'SELECT_ROW'; id: EntityId }
  | { type: 'DESELECT_ROW'; id: EntityId }
  | { type: 'TOGGLE_ROW'; id: EntityId }
  | { type: 'SELECT_ALL'; ids: readonly EntityId[] }
  | { type: 'DESELECT_ALL' }
  | { type: 'SET_LOADING'; loading: boolean }
  | { type: 'SET_ERROR'; error: Error | null };

// =============================================================================
// CELL PROPS
// =============================================================================

/**
 * Props for cell components.
 */
export interface CellProps {
  /** The value to render */
  readonly value: unknown;

  /** Column configuration */
  readonly column: ColumnConfig;

  /** Full entity */
  readonly entity: Entity;

  /** Row index */
  readonly rowIndex: number;
}

// =============================================================================
// HEADER PROPS
// =============================================================================

/**
 * Props for TableHeader component.
 */
export interface TableHeaderProps {
  /** Column definitions */
  readonly columns: readonly ColumnConfig[];

  /** Current sort column */
  readonly sortColumn: string | null;

  /** Current sort direction */
  readonly sortDirection: 'asc' | 'desc';

  /** Sort click handler */
  readonly onSort: (column: string) => void;

  /** Whether selection column is shown */
  readonly showSelection?: boolean | undefined;

  /** Whether all rows are selected */
  readonly allSelected?: boolean | undefined;

  /** Whether some rows are selected */
  readonly someSelected?: boolean | undefined;

  /** Select all handler */
  readonly onSelectAll?: (() => void) | undefined;

  /** Show row numbers column */
  readonly showRowNumbers?: boolean | undefined;

  /** Show actions column */
  readonly showActions?: boolean | undefined;
}

// =============================================================================
// ROW PROPS
// =============================================================================

/**
 * Props for TableRow component.
 */
export interface TableRowProps {
  /** Entity data */
  readonly entity: Entity;

  /** Row index */
  readonly index: number;

  /** Column definitions */
  readonly columns: readonly ColumnConfig[];

  /** Whether row is selected */
  readonly selected?: boolean | undefined;

  /** Selection toggle handler */
  readonly onSelect?: (() => void) | undefined;

  /** Row click handler */
  readonly onClick?: (() => void) | undefined;

  /** Double click handler */
  readonly onDoubleClick?: (() => void) | undefined;

  /** Row actions */
  readonly actions?: readonly ActionConfig[] | undefined;

  /** Action click handler */
  readonly onAction?: ((action: ActionConfig) => void) | undefined;

  /** Show row number */
  readonly showRowNumber?: boolean | undefined;

  /** Show selection checkbox */
  readonly showSelection?: boolean | undefined;

  /** Striped styling */
  readonly striped?: boolean | undefined;

  /** Hoverable styling */
  readonly hoverable?: boolean | undefined;

  /** Compact mode */
  readonly compact?: boolean | undefined;
}

// =============================================================================
// PAGINATION PROPS
// =============================================================================

/**
 * Props for TablePagination component.
 */
export interface TablePaginationProps {
  /** Current page (1-indexed) */
  readonly page: number;

  /** Items per page */
  readonly pageSize: number;

  /** Total item count */
  readonly totalCount?: number | undefined;

  /** Whether there are more items */
  readonly hasMore?: boolean | undefined;

  /** Page change handler */
  readonly onPageChange: (page: number) => void;

  /** Page size change handler */
  readonly onPageSizeChange?: ((pageSize: number) => void) | undefined;

  /** Available page sizes */
  readonly pageSizeOptions?: readonly number[] | undefined;

  /** Show total count */
  readonly showTotal?: boolean | undefined;

  /** Compact mode */
  readonly compact?: boolean | undefined;
}

// =============================================================================
// FILTER PROPS
// =============================================================================

/**
 * Props for TableFilters component.
 */
export interface TableFiltersProps {
  /** Filter definitions */
  readonly filters: readonly FilterConfig[];

  /** Current filter values */
  readonly values: Record<string, unknown>;

  /** Filter change handler */
  readonly onChange: (property: string, value: unknown) => void;

  /** Clear all filters */
  readonly onClear: () => void;

  /** Search query (if searchable) */
  readonly searchQuery?: string | undefined;

  /** Search change handler */
  readonly onSearchChange?: ((query: string) => void) | undefined;

  /** Search placeholder */
  readonly searchPlaceholder?: string | undefined;

  /** Compact mode */
  readonly compact?: boolean | undefined;
}
