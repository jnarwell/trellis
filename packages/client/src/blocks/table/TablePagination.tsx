/**
 * Trellis TableBlock - Pagination Component
 */

import React from 'react';
import type { TablePaginationProps } from './types.js';
import { pagination, cn } from './styles.js';

// =============================================================================
// PAGINATION BUTTON
// =============================================================================

interface PaginationButtonProps {
  onClick: () => void;
  disabled?: boolean;
  active?: boolean;
  children: React.ReactNode;
  ariaLabel?: string;
}

const PaginationButton: React.FC<PaginationButtonProps> = ({
  onClick,
  disabled = false,
  active = false,
  children,
  ariaLabel,
}) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    className={cn(
      pagination.button,
      disabled
        ? pagination.buttonDisabled
        : active
          ? pagination.buttonActive
          : pagination.buttonEnabled
    )}
    aria-label={ariaLabel}
    aria-current={active ? 'page' : undefined}
  >
    {children}
  </button>
);

// =============================================================================
// PAGE SIZE SELECTOR
// =============================================================================

interface PageSizeSelectorProps {
  pageSize: number;
  options: readonly number[];
  onChange: (size: number) => void;
}

const PageSizeSelector: React.FC<PageSizeSelectorProps> = ({
  pageSize,
  options,
  onChange,
}) => (
  <div className="flex items-center gap-2">
    <label htmlFor="page-size" className="text-sm text-gray-600 dark:text-gray-400">
      Show
    </label>
    <select
      id="page-size"
      value={pageSize}
      onChange={(e) => onChange(Number(e.target.value))}
      className={pagination.select}
    >
      {options.map((size) => (
        <option key={size} value={size}>
          {size}
        </option>
      ))}
    </select>
  </div>
);

// =============================================================================
// PAGINATION INFO
// =============================================================================

interface PaginationInfoProps {
  page: number;
  pageSize: number;
  totalCount?: number | undefined;
  showTotal: boolean;
}

const PaginationInfo: React.FC<PaginationInfoProps> = ({
  page,
  pageSize,
  totalCount,
  showTotal,
}) => {
  const start = (page - 1) * pageSize + 1;
  const end = totalCount
    ? Math.min(page * pageSize, totalCount)
    : page * pageSize;

  if (!showTotal || totalCount === undefined) {
    return (
      <span className={pagination.info}>
        Page {page}
      </span>
    );
  }

  if (totalCount === 0) {
    return (
      <span className={pagination.info}>
        No results
      </span>
    );
  }

  return (
    <span className={pagination.info}>
      Showing <span className="font-medium">{start}</span> to{' '}
      <span className="font-medium">{end}</span> of{' '}
      <span className="font-medium">{totalCount.toLocaleString()}</span> results
    </span>
  );
};

// =============================================================================
// MAIN TABLE PAGINATION COMPONENT
// =============================================================================

export const TablePagination: React.FC<TablePaginationProps> = ({
  page,
  pageSize,
  totalCount,
  hasMore = false,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 25, 50, 100],
  showTotal = true,
  compact = false,
}) => {
  // Calculate total pages
  const totalPages = totalCount !== undefined
    ? Math.ceil(totalCount / pageSize)
    : undefined;

  // Determine if we can go to previous/next
  const canGoPrevious = page > 1;
  const canGoNext = totalPages !== undefined
    ? page < totalPages
    : hasMore;

  // Generate page numbers to display
  const pageNumbers = React.useMemo(() => {
    if (totalPages === undefined) return [];

    const pages: (number | 'ellipsis')[] = [];
    const maxVisible = 7;

    if (totalPages <= maxVisible) {
      // Show all pages
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Always show first page
      pages.push(1);

      if (page > 3) {
        pages.push('ellipsis');
      }

      // Show pages around current
      const start = Math.max(2, page - 1);
      const end = Math.min(totalPages - 1, page + 1);

      for (let i = start; i <= end; i++) {
        pages.push(i);
      }

      if (page < totalPages - 2) {
        pages.push('ellipsis');
      }

      // Always show last page
      if (totalPages > 1) {
        pages.push(totalPages);
      }
    }

    return pages;
  }, [page, totalPages]);

  return (
    <div className={cn(pagination.container, compact && pagination.compact)}>
      {/* Left side - info and page size */}
      <div className="flex items-center gap-4">
        <PaginationInfo
          page={page}
          pageSize={pageSize}
          totalCount={totalCount}
          showTotal={showTotal}
        />

        {onPageSizeChange && (
          <PageSizeSelector
            pageSize={pageSize}
            options={pageSizeOptions}
            onChange={onPageSizeChange}
          />
        )}
      </div>

      {/* Right side - navigation */}
      <div className={pagination.controls}>
        {/* Previous button */}
        <PaginationButton
          onClick={() => onPageChange(page - 1)}
          disabled={!canGoPrevious}
          ariaLabel="Previous page"
        >
          <ChevronLeftIcon />
        </PaginationButton>

        {/* Page numbers */}
        {pageNumbers.length > 0 && (
          <div className="hidden sm:flex items-center gap-1">
            {pageNumbers.map((pageNum, idx) => (
              pageNum === 'ellipsis' ? (
                <span key={`ellipsis-${idx}`} className="px-2 text-gray-500">
                  ...
                </span>
              ) : (
                <PaginationButton
                  key={pageNum}
                  onClick={() => onPageChange(pageNum)}
                  active={pageNum === page}
                  ariaLabel={`Page ${pageNum}`}
                >
                  {pageNum}
                </PaginationButton>
              )
            ))}
          </div>
        )}

        {/* Next button */}
        <PaginationButton
          onClick={() => onPageChange(page + 1)}
          disabled={!canGoNext}
          ariaLabel="Next page"
        >
          <ChevronRightIcon />
        </PaginationButton>
      </div>
    </div>
  );
};

// =============================================================================
// ICONS
// =============================================================================

const ChevronLeftIcon: React.FC = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
  </svg>
);

const ChevronRightIcon: React.FC = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
  </svg>
);
