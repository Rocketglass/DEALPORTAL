'use client';

import { useState, useMemo, type ReactNode } from 'react';
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
        <div className="py-12 text-center text-muted-foreground">
          {EmptyIcon && <EmptyIcon className="mx-auto h-12 w-12 opacity-30" />}
          <p className="mt-4">
            {hasActiveFilters ? 'No results match your filters.' : emptyMessage}
          </p>
          {hasActiveFilters && (
            <button
              onClick={() => {
                setSearch('');
                setFilterValues({});
                setCurrentPage(1);
              }}
              className="mt-2 text-sm text-primary hover:underline"
            >
              Clear all filters
            </button>
          )}
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
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
                    className="border-b border-border last:border-0 hover:bg-muted/50"
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
