/**
 * Trellis TableBlock - Tailwind Styles
 *
 * Centralized style definitions using Tailwind classes.
 */

// =============================================================================
// TABLE CONTAINER
// =============================================================================

export const tableContainer = {
  base: 'w-full overflow-hidden',
  bordered: 'border border-gray-200 dark:border-gray-700 rounded-lg',
};

export const tableWrapper = {
  base: 'overflow-x-auto',
};

export const table = {
  base: 'w-full text-sm text-left',
  bordered: 'border-collapse',
};

// =============================================================================
// HEADER
// =============================================================================

export const thead = {
  base: 'bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-xs uppercase tracking-wider',
};

export const th = {
  base: 'px-4 py-3 font-semibold whitespace-nowrap',
  compact: 'px-3 py-2',
  sortable: 'cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 select-none',
  sorted: 'bg-gray-100 dark:bg-gray-700',
  align: {
    left: 'text-left',
    center: 'text-center',
    right: 'text-right',
  },
};

export const sortIcon = {
  base: 'inline-block ml-1 w-4 h-4',
  active: 'text-blue-600 dark:text-blue-400',
  inactive: 'text-gray-400 dark:text-gray-500',
};

// =============================================================================
// BODY
// =============================================================================

export const tbody = {
  base: 'divide-y divide-gray-200 dark:divide-gray-700',
};

export const tr = {
  base: 'transition-colors',
  striped: 'odd:bg-white even:bg-gray-50 dark:odd:bg-gray-900 dark:even:bg-gray-800',
  hoverable: 'hover:bg-gray-100 dark:hover:bg-gray-700',
  selected: 'bg-blue-50 dark:bg-blue-900/30 hover:bg-blue-100 dark:hover:bg-blue-900/50',
  clickable: 'cursor-pointer',
};

export const td = {
  base: 'px-4 py-3 text-gray-900 dark:text-gray-100',
  compact: 'px-3 py-2',
  align: {
    left: 'text-left',
    center: 'text-center',
    right: 'text-right',
  },
};

// =============================================================================
// CELLS
// =============================================================================

export const cell = {
  text: 'truncate max-w-xs',
  number: 'font-mono tabular-nums',
  currency: 'font-mono tabular-nums',
  date: '',
  boolean: 'flex items-center justify-center',
  badge: 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
  link: 'text-blue-600 dark:text-blue-400 hover:underline',
  image: 'w-8 h-8 rounded object-cover',
};

export const badge = {
  base: 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
  colors: {
    gray: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
    red: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
    yellow: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
    green: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    blue: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
    purple: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
    pink: 'bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-400',
  },
};

// =============================================================================
// CHECKBOX
// =============================================================================

export const checkbox = {
  base: 'w-4 h-4 rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500 focus:ring-2 cursor-pointer',
  indeterminate: 'indeterminate:bg-blue-600 indeterminate:border-blue-600',
};

// =============================================================================
// ACTIONS
// =============================================================================

export const actionsCell = {
  base: 'flex items-center gap-1',
};

export const actionButton = {
  base: 'inline-flex items-center justify-center p-1.5 rounded text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:bg-gray-700 transition-colors',
  primary: 'text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:text-blue-400 dark:hover:text-blue-300 dark:hover:bg-blue-900/30',
  danger: 'text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-900/30',
  icon: 'w-4 h-4',
};

// =============================================================================
// PAGINATION
// =============================================================================

export const pagination = {
  container: 'flex items-center justify-between px-4 py-3 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700',
  compact: 'px-3 py-2',
  info: 'text-sm text-gray-700 dark:text-gray-300',
  controls: 'flex items-center gap-2',
  button: 'inline-flex items-center justify-center px-3 py-1.5 text-sm font-medium rounded border transition-colors',
  buttonEnabled: 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700',
  buttonDisabled: 'border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500 cursor-not-allowed',
  buttonActive: 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400',
  select: 'px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300',
};

// =============================================================================
// FILTERS
// =============================================================================

export const filters = {
  container: 'flex flex-wrap items-center gap-3 px-4 py-3 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700',
  compact: 'px-3 py-2 gap-2',
  group: 'flex items-center gap-2',
  label: 'text-sm font-medium text-gray-700 dark:text-gray-300',
  input: 'px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-blue-500',
  select: 'px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500',
  clearButton: 'text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200',
  searchInput: 'pl-9 pr-3 py-1.5',
  searchIcon: 'absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400',
};

// =============================================================================
// EMPTY STATE
// =============================================================================

export const emptyState = {
  container: 'flex flex-col items-center justify-center py-12 px-4',
  icon: 'w-12 h-12 text-gray-400 dark:text-gray-500 mb-4',
  message: 'text-gray-500 dark:text-gray-400 text-center',
};

// =============================================================================
// LOADING STATE
// =============================================================================

export const loadingState = {
  container: 'flex items-center justify-center py-12',
  spinner: 'w-6 h-6 text-blue-600 dark:text-blue-400 animate-spin',
  message: 'ml-3 text-gray-500 dark:text-gray-400',
};

export const loadingOverlay = {
  container: 'absolute inset-0 bg-white/50 dark:bg-gray-900/50 flex items-center justify-center',
};

// =============================================================================
// ERROR STATE
// =============================================================================

export const errorState = {
  container: 'flex flex-col items-center justify-center py-12 px-4',
  icon: 'w-12 h-12 text-red-400 mb-4',
  message: 'text-red-600 dark:text-red-400 text-center',
  retry: 'mt-4 px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded transition-colors',
};

// =============================================================================
// UTILITIES
// =============================================================================

/**
 * Combine class names conditionally.
 */
export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ');
}
