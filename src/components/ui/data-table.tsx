'use client';

import { useState, useMemo, type ReactNode } from 'react';
import Link from 'next/link';
import { type LucideIcon } from 'lucide-react';
import { SearchInput } from './search-input';
import { FilterDropdown } from './filter-dropdown';
import { SortableHeader, type SortDirection } from './sortable-header';
import { Pagination } from './pagination';

interface Column<T> {
  key: string;
  label: string;
  sortable?: boolean;
  render?: (row: T) => ReactNode;
}

interface FilterConfig {
  key: string;
  label: string;
  options: { value: string; label: string }[];
}

interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  searchKeys: string[];
  filters?: FilterConfig[];
  pageSize?: number;
  emptyIcon?: LucideIcon;
  emptyMessage?: string;
  emptyDescription?: string;
  emptyActionLabel?: string;
  emptyActionHref?: string;
  searchPlaceholder?: string;
}

function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  return path.split('.').reduce((current: unknown, key) => {
    if (current && typeof current === 'object') {
      return (current as Record<string, unknown>)[key];
    }
    return undefined;
  }, obj);
}

export function DataTable<T extends Record<string, unknown>>({
  data,
  columns,
  searchKeys,
  filters,
  pageSize = 10,
  emptyIcon: EmptyIcon,
  emptyMessage = 'No results found.',
  emptyDescription,
  emptyActionLabel,
  emptyActionHref,
  searchPlaceholder,
}: DataTableProps<T>) {
  const [search, setSearch] = useState('');
  const [filterValues, setFilterValues] = useState<Record<string, string>>({});
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);
  const [currentPage, setCurrentPage] = useState(1);

  // Filter and search
  const filtered = useMemo(() => {
    let result = data;

    // Apply search
    if (search) {
      const lower = search.toLowerCase();
      result = result.filter((row) =>
        searchKeys.some((key) => {
          const val = getNestedValue(row, key);
          return val != null && String(val).toLowerCase().includes(lower);
        }),
      );
    }

    // Apply filters
    if (filters) {
      for (const filter of filters) {
        const filterVal = filterValues[filter.key];
        if (filterVal) {
          result = result.filter((row) => {
            const val = getNestedValue(row, filter.key);
            return String(val) === filterVal;
          });
        }
      }
    }

    return result;
  }, [data, search, searchKeys, filters, filterValues]);

  // Sort
  const sorted = useMemo(() => {
    if (!sortKey || !sortDirection) return filtered;

    return [...filtered].sort((a, b) => {
      const aVal = getNestedValue(a, sortKey);
      const bVal = getNestedValue(b, sortKey);

      if (aVal == null && bVal == null) return 0;
      if (aVal == null) return 1;
      if (bVal == null) return -1;

      let comparison: number;
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        comparison = aVal - bVal;
      } else {
        comparison = String(aVal).localeCompare(String(bVal));
      }

      return sortDirection === 'desc' ? -comparison : comparison;
    });
  }, [filtered, sortKey, sortDirection]);

  // Paginate
  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const paginated = sorted.slice((safePage - 1) * pageSize, safePage * pageSize);

  // Reset page when filters/search change
  function handleSearch(value: string) {
    setSearch(value);
    setCurrentPage(1);
  }

  function handleFilterChange(key: string, value: string) {
    setFilterValues((prev) => ({ ...prev, [key]: value }));
    setCurrentPage(1);
  }

  function handleSort(key: string, direction: SortDirection) {
    setSortKey(direction ? key : null);
    setSortDirection(direction);
  }

  const hasActiveFilters = search || Object.values(filterValues).some(Boolean);
  const showEmpty = data.length === 0 || (sorted.length === 0 && hasActiveFilters);

  return (
    <div className="mt-6">
      {/* Toolbar: search + filters */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="w-full sm:max-w-xs">
          <SearchInput
            value={search}
            onChange={handleSearch}
            placeholder={searchPlaceholder || 'Search...'}
          />
        </div>
        {filters && filters.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {filters.map((filter) => (
              <FilterDropdown
                key={filter.key}
                label={filter.label}
                options={filter.options}
                value={filterValues[filter.key] || ''}
                onChange={(val) => handleFilterChange(filter.key, val)}
                allowAll
              />
            ))}
          </div>
        )}
      </div>

      {/* Table */}
      {showEmpty && sorted.length === 0 ? (
        <div className="rounded-xl border border-border bg-white py-16 text-center">
          {EmptyIcon && (
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-muted">
              <EmptyIcon className="h-6 w-6 text-muted-foreground" />
            </div>
          )}
          <p className="mt-4 text-sm font-medium text-foreground">
            {hasActiveFilters ? 'No results match your filters' : emptyMessage}
          </p>
          {!hasActiveFilters && emptyDescription && (
            <p className="mx-auto mt-1.5 max-w-sm text-sm text-muted-foreground">
              {emptyDescription}
            </p>
          )}
          {hasActiveFilters && (
            <button
              onClick={() => {
                setSearch('');
                setFilterValues({});
                setCurrentPage(1);
              }}
              className="mt-3 inline-flex items-center rounded-lg border border-border px-3.5 py-2 text-sm font-medium text-foreground transition-colors duration-150 hover:bg-muted"
            >
              Clear all filters
            </button>
          )}
          {!hasActiveFilters && emptyActionLabel && emptyActionHref && (
            <div className="mt-4">
              <Link
                href={emptyActionHref}
                className="inline-flex items-center rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition-colors duration-150 hover:bg-primary-light"
              >
                {emptyActionLabel}
              </Link>
            </div>
          )}
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-b border-border text-left">
                  {columns.map((col) => (
                    <th key={col.key} className="px-4 py-3">
                      {col.sortable ? (
                        <SortableHeader
                          label={col.label}
                          sortKey={col.key}
                          currentSort={sortKey}
                          currentDirection={sortDirection}
                          onSort={handleSort}
                        />
                      ) : (
                        <span className="font-medium text-muted-foreground">
                          {col.label}
                        </span>
                      )}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {paginated.map((row, idx) => (
                  <tr
                    key={(row.id as string | number) ?? idx}
                    className="border-b border-border last:border-0 transition-colors duration-150 hover:bg-muted/50"
                  >
                    {columns.map((col) => (
                      <td key={col.key} className="px-4 py-3">
                        {col.render
                          ? col.render(row)
                          : (getNestedValue(row, col.key) as ReactNode) ?? ''}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="border-t border-border px-2">
            <Pagination
              currentPage={safePage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
            />
          </div>
        </div>
      )}

      {/* Result count */}
      {sorted.length > 0 && (
        <p className="mt-2 text-xs text-muted-foreground">
          Showing {(safePage - 1) * pageSize + 1}–{Math.min(safePage * pageSize, sorted.length)} of{' '}
          {sorted.length} result{sorted.length !== 1 ? 's' : ''}
        </p>
      )}
    </div>
  );
}
