/**
 * Trellis TableBlock - Filters Component
 */

import React from 'react';
import type { TableFiltersProps } from './types.js';
import type { FilterConfig, FilterOption } from '../types.js';
import { filters as filterStyles, cn } from './styles.js';

// =============================================================================
// SEARCH INPUT
// =============================================================================

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string | undefined;
}

const SearchInput: React.FC<SearchInputProps> = ({
  value,
  onChange,
  placeholder = 'Search...',
}) => (
  <div className="relative">
    <SearchIcon />
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={cn(filterStyles.input, filterStyles.searchInput)}
      aria-label="Search"
    />
  </div>
);

// =============================================================================
// TEXT FILTER
// =============================================================================

interface TextFilterProps {
  filter: FilterConfig;
  value: unknown;
  onChange: (value: string) => void;
}

const TextFilter: React.FC<TextFilterProps> = ({ filter, value, onChange }) => (
  <div className={filterStyles.group}>
    {filter.label && (
      <label className={filterStyles.label}>{filter.label}</label>
    )}
    <input
      type="text"
      value={String(value ?? '')}
      onChange={(e) => onChange(e.target.value)}
      placeholder={filter.placeholder ?? `Filter by ${filter.property}...`}
      className={filterStyles.input}
    />
  </div>
);

// =============================================================================
// SELECT FILTER
// =============================================================================

interface SelectFilterProps {
  filter: FilterConfig;
  value: unknown;
  onChange: (value: string) => void;
}

const SelectFilter: React.FC<SelectFilterProps> = ({ filter, value, onChange }) => {
  const options = normalizeOptions(filter.options);

  return (
    <div className={filterStyles.group}>
      {filter.label && (
        <label className={filterStyles.label}>{filter.label}</label>
      )}
      <select
        value={String(value ?? '')}
        onChange={(e) => onChange(e.target.value)}
        className={filterStyles.select}
      >
        <option value="">All</option>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
};

// =============================================================================
// MULTISELECT FILTER
// =============================================================================

interface MultiselectFilterProps {
  filter: FilterConfig;
  value: unknown;
  onChange: (value: string[]) => void;
}

const MultiselectFilter: React.FC<MultiselectFilterProps> = ({
  filter,
  value,
  onChange,
}) => {
  const options = normalizeOptions(filter.options);
  const selectedValues = Array.isArray(value) ? value : [];

  const handleToggle = (optValue: string) => {
    const newValues = selectedValues.includes(optValue)
      ? selectedValues.filter((v) => v !== optValue)
      : [...selectedValues, optValue];
    onChange(newValues);
  };

  return (
    <div className={filterStyles.group}>
      {filter.label && (
        <label className={filterStyles.label}>{filter.label}</label>
      )}
      <div className="flex flex-wrap gap-1">
        {options.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => handleToggle(opt.value)}
            className={cn(
              'px-2 py-1 text-xs rounded border transition-colors',
              selectedValues.includes(opt.value)
                ? 'bg-blue-100 border-blue-300 text-blue-800 dark:bg-blue-900/30 dark:border-blue-600 dark:text-blue-400'
                : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700'
            )}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
};

// =============================================================================
// NUMBER FILTER
// =============================================================================

interface NumberFilterProps {
  filter: FilterConfig;
  value: unknown;
  onChange: (value: number | null) => void;
}

const NumberFilter: React.FC<NumberFilterProps> = ({ filter, value, onChange }) => (
  <div className={filterStyles.group}>
    {filter.label && (
      <label className={filterStyles.label}>{filter.label}</label>
    )}
    <input
      type="number"
      value={value === null || value === undefined ? '' : String(value)}
      onChange={(e) => {
        const val = e.target.value;
        onChange(val === '' ? null : Number(val));
      }}
      placeholder={filter.placeholder ?? `Filter by ${filter.property}...`}
      className={cn(filterStyles.input, 'w-32')}
    />
  </div>
);

// =============================================================================
// DATE FILTER
// =============================================================================

interface DateFilterProps {
  filter: FilterConfig;
  value: unknown;
  onChange: (value: string) => void;
}

const DateFilter: React.FC<DateFilterProps> = ({ filter, value, onChange }) => (
  <div className={filterStyles.group}>
    {filter.label && (
      <label className={filterStyles.label}>{filter.label}</label>
    )}
    <input
      type="date"
      value={String(value ?? '')}
      onChange={(e) => onChange(e.target.value)}
      className={filterStyles.input}
    />
  </div>
);

// =============================================================================
// DATE RANGE FILTER
// =============================================================================

interface DateRangeFilterProps {
  filter: FilterConfig;
  value: unknown;
  onChange: (value: { start: string; end: string }) => void;
}

const DateRangeFilter: React.FC<DateRangeFilterProps> = ({ filter, value, onChange }) => {
  const rangeValue = value as { start?: string; end?: string } | undefined;

  return (
    <div className={filterStyles.group}>
      {filter.label && (
        <label className={filterStyles.label}>{filter.label}</label>
      )}
      <div className="flex items-center gap-2">
        <input
          type="date"
          value={rangeValue?.start ?? ''}
          onChange={(e) => onChange({ start: e.target.value, end: rangeValue?.end ?? '' })}
          className={filterStyles.input}
          aria-label={`${filter.label} start date`}
        />
        <span className="text-gray-500">to</span>
        <input
          type="date"
          value={rangeValue?.end ?? ''}
          onChange={(e) => onChange({ start: rangeValue?.start ?? '', end: e.target.value })}
          className={filterStyles.input}
          aria-label={`${filter.label} end date`}
        />
      </div>
    </div>
  );
};

// =============================================================================
// BOOLEAN FILTER
// =============================================================================

interface BooleanFilterProps {
  filter: FilterConfig;
  value: unknown;
  onChange: (value: boolean | null) => void;
}

const BooleanFilter: React.FC<BooleanFilterProps> = ({ filter, value, onChange }) => (
  <div className={filterStyles.group}>
    {filter.label && (
      <label className={filterStyles.label}>{filter.label}</label>
    )}
    <select
      value={value === null || value === undefined ? '' : String(value)}
      onChange={(e) => {
        const val = e.target.value;
        onChange(val === '' ? null : val === 'true');
      }}
      className={filterStyles.select}
    >
      <option value="">All</option>
      <option value="true">Yes</option>
      <option value="false">No</option>
    </select>
  </div>
);

// =============================================================================
// FILTER RENDERER
// =============================================================================

interface FilterRendererProps {
  filter: FilterConfig;
  value: unknown;
  onChange: (value: unknown) => void;
}

const FilterRenderer: React.FC<FilterRendererProps> = ({ filter, value, onChange }) => {
  switch (filter.type) {
    case 'text':
      return <TextFilter filter={filter} value={value} onChange={onChange} />;

    case 'select':
      return <SelectFilter filter={filter} value={value} onChange={onChange} />;

    case 'multiselect':
      return (
        <MultiselectFilter
          filter={filter}
          value={value}
          onChange={onChange as (value: string[]) => void}
        />
      );

    case 'number':
      return (
        <NumberFilter
          filter={filter}
          value={value}
          onChange={onChange as (value: number | null) => void}
        />
      );

    case 'date':
      return <DateFilter filter={filter} value={value} onChange={onChange} />;

    case 'daterange':
      return (
        <DateRangeFilter
          filter={filter}
          value={value}
          onChange={onChange as (value: { start: string; end: string }) => void}
        />
      );

    case 'boolean':
      return (
        <BooleanFilter
          filter={filter}
          value={value}
          onChange={onChange as (value: boolean | null) => void}
        />
      );

    default:
      return <TextFilter filter={filter} value={value} onChange={onChange} />;
  }
};

// =============================================================================
// MAIN TABLE FILTERS COMPONENT
// =============================================================================

export const TableFilters: React.FC<TableFiltersProps> = ({
  filters,
  values,
  onChange,
  onClear,
  searchQuery,
  onSearchChange,
  searchPlaceholder,
  compact = false,
}) => {
  // Check if any filters are active
  const hasActiveFilters = Object.values(values).some((v) => {
    if (v === null || v === undefined || v === '') return false;
    if (Array.isArray(v) && v.length === 0) return false;
    return true;
  }) || (searchQuery && searchQuery.length > 0);

  return (
    <div className={cn(filterStyles.container, compact && filterStyles.compact)}>
      {/* Search input */}
      {onSearchChange && (
        <SearchInput
          value={searchQuery ?? ''}
          onChange={onSearchChange}
          placeholder={searchPlaceholder}
        />
      )}

      {/* Filter inputs */}
      {filters.map((filter) => (
        <FilterRenderer
          key={filter.property}
          filter={filter}
          value={values[filter.property]}
          onChange={(value) => onChange(filter.property, value)}
        />
      ))}

      {/* Clear button */}
      {hasActiveFilters && (
        <button
          type="button"
          onClick={onClear}
          className={filterStyles.clearButton}
        >
          Clear all
        </button>
      )}
    </div>
  );
};

// =============================================================================
// UTILITIES
// =============================================================================

/**
 * Normalize filter options to FilterOption format.
 */
function normalizeOptions(
  options?: readonly (string | FilterOption)[]
): FilterOption[] {
  if (!options) return [];

  return options.map((opt) => {
    if (typeof opt === 'string') {
      return { value: opt, label: formatOptionLabel(opt) };
    }
    return opt;
  });
}

/**
 * Format an option value as a label.
 */
function formatOptionLabel(value: string): string {
  return value
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

// =============================================================================
// ICONS
// =============================================================================

const SearchIcon: React.FC = () => (
  <svg className={filterStyles.searchIcon} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
  </svg>
);
