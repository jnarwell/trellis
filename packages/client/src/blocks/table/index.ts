/**
 * Trellis TableBlock - Public Exports
 */

// Main component
export { TableBlock, EmptyState, LoadingState, ErrorState } from './TableBlock.js';

// Sub-components
export { TableHeader, formatPropertyName } from './TableHeader.js';
export { TableRow, ActionButton, ActionIcon } from './TableRow.js';
export {
  TableCell,
  TextCell,
  NumberCell,
  CurrencyCell,
  PercentCell,
  DateCell,
  DateTimeCell,
  TimeCell,
  RelativeCell,
  BooleanCell,
  BadgeCell,
  LinkCell,
  ImageCell,
  getPropertyValue,
} from './TableCell.js';
export { TablePagination } from './TablePagination.js';
export { TableFilters } from './TableFilters.js';

// Hooks
export {
  useTableState,
  useTableData,
  useQueryParams,
  useDebouncedValue,
} from './hooks.js';
export type {
  UseTableStateOptions,
  UseTableStateReturn,
  UseTableDataOptions,
  UseTableDataReturn,
} from './hooks.js';

// Types
export type {
  ColumnConfig,
  TableBlockConfig,
  TableBlockProps,
  TableState,
  TableAction,
  CellProps,
  TableHeaderProps,
  TableRowProps,
  TablePaginationProps,
  TableFiltersProps,
} from './types.js';

// Styles
export * from './styles.js';
