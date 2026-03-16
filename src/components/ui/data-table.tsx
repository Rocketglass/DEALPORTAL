'use client';

import { useState, useMemo, useCallback, useRef, type ReactNode } from 'react';
import Link from 'next/link';
import { type LucideIcon, Download } from 'lucide-react';
import { Button } from './button';
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

export interface BulkAction {
  label: string;
  icon?: LucideIcon;
  variant?: 'primary' | 'secondary' | 'destructive';
  onClick: (selectedIds: string[]) => void | Promise<void>;
}

interface DataTableProps<T extends object> {
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
  exportFileName?: string;
  selectable?: boolean;
  bulkActions?: BulkAction[];
  idKey?: string;
}

function getNestedValue(obj: object, path: string): unknown {
  return path.split('.').reduce((current: unknown, key) => {
    if (current && typeof current === 'object') {
      return (current as Record<string, unknown>)[key];
    }
    return undefined;
  }, obj as unknown);
}

export function DataTable<T extends object>({
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
  exportFileName,
  selectable = false,
  bulkActions,
  idKey = 'id',
}: DataTableProps<T>) {
  const [search, setSearch] = useState('');
  const [filterValues, setFilterValues] = useState<Record<string, string>>({});
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkLoading, setBulkLoading] = useState(false);
  const bulkLockRef = useRef(false);

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

  // Reset page and selection when filters/search change
  function handleSearch(value: string) {
    setSearch(value);
    setCurrentPage(1);
    setSelectedIds(new Set());
  }

  function handleFilterChange(key: string, value: string) {
    setFilterValues((prev) => ({ ...prev, [key]: value }));
    setCurrentPage(1);
    setSelectedIds(new Set());
  }

  function handleSort(key: string, direction: SortDirection) {
    setSortKey(direction ? key : null);
    setSortDirection(direction);
  }

  const handleExportCsv = useCallback(() => {
    if (!exportFileName) return;

    // Use only visible (non-action) columns
    const exportColumns = columns.filter((col) => col.key !== '_actions');

    const escapeCell = (value: unknown): string => {
      const str = value == null ? '' : String(value);
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const headerRow = exportColumns.map((col) => escapeCell(col.label)).join(',');

    const dataRows = sorted.map((row) =>
      exportColumns
        .map((col) => {
          const raw = getNestedValue(row, col.key);
          return escapeCell(raw);
        })
        .join(','),
    );

    const csv = [headerRow, ...dataRows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${exportFileName}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [exportFileName, columns, sorted]);

  const hasActiveFilters = search || Object.values(filterValues).some(Boolean);
  const showEmpty = data.length === 0 || (sorted.length === 0 && hasActiveFilters);

  return (
    <div className="mt-6">
      {/* Toolbar: search + filters + export */}
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
        {exportFileName && sorted.length > 0 && (
          <div className="sm:ml-auto">
            <Button variant="secondary" size="sm" icon={Download} onClick={handleExportCsv}>
              Export
            </Button>
          </div>
        )}
      </div>

      {/* Bulk action toolbar */}
      {selectable && selectedIds.size > 0 && bulkActions && (
        <div className="mb-3 flex items-center gap-3 rounded-lg bg-primary-subtle border border-primary/10 px-4 py-2.5">
          <span className="text-[13px] font-medium text-primary">
            {selectedIds.size} selected
          </span>
          <div className="flex gap-2">
            {bulkActions.map((action) => (
              <Button
                key={action.label}
                variant={action.variant || 'secondary'}
                size="sm"
                icon={action.icon}
                loading={bulkLoading}
                disabled={bulkLoading}
                onClick={async () => {
                  if (bulkLockRef.current) return;
                  bulkLockRef.current = true;
                  setBulkLoading(true);
                  try {
                    await action.onClick(Array.from(selectedIds));
                    setSelectedIds(new Set());
                  } finally {
                    setBulkLoading(false);
                    bulkLockRef.current = false;
                  }
                }}
              >
                {action.label}
              </Button>
            ))}
          </div>
          <button
            onClick={() => setSelectedIds(new Set())}
            className="ml-auto text-[11px] text-muted-foreground hover:text-foreground transition-colors"
          >
            Clear selection
          </button>
        </div>
      )}

      {/* Table */}
      {showEmpty && sorted.length === 0 ? (
        <div className="rounded-xl border border-border-subtle bg-[var(--background-raised)] py-16 text-center">
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
            <Button
              variant="secondary"
              size="sm"
              className="mt-3"
              onClick={() => {
                setSearch('');
                setFilterValues({});
                setCurrentPage(1);
              }}
            >
              Clear all filters
            </Button>
          )}
          {!hasActiveFilters && emptyActionLabel && emptyActionHref && (
            <div className="mt-4">
              <Link href={emptyActionHref}>
                <Button variant="primary" size="sm">
                  {emptyActionLabel}
                </Button>
              </Link>
            </div>
          )}
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border-subtle bg-[var(--background-raised)]">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] table-fixed text-[13px]">
              <thead>
                <tr className="border-b border-border text-left bg-muted/40">
                  {selectable && (
                    <th scope="col" className="w-10 px-4 py-3">
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded accent-primary"
                        checked={
                          paginated.length > 0 &&
                          paginated.every((row) =>
                            selectedIds.has(
                              String(
                                (row as Record<string, unknown>)[idKey],
                              ),
                            ),
                          )
                        }
                        onChange={(e) => {
                          setSelectedIds((prev) => {
                            const next = new Set(prev);
                            for (const row of paginated) {
                              const rowId = String(
                                (row as Record<string, unknown>)[idKey],
                              );
                              if (e.target.checked) {
                                next.add(rowId);
                              } else {
                                next.delete(rowId);
                              }
                            }
                            return next;
                          });
                        }}
                      />
                    </th>
                  )}
                  {columns.map((col) => (
                    <th key={col.key} scope="col" className="px-4 py-3">
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
                {paginated.map((row, idx) => {
                  const rowId = String(
                    (row as Record<string, unknown>)[idKey] ??
                      (row as Record<string, unknown>).id ??
                      idx,
                  );
                  const isSelected = selectable && selectedIds.has(rowId);
                  return (
                    <tr
                      key={rowId}
                      className={`border-b border-border last:border-0 transition-colors duration-150 ${
                        isSelected ? 'bg-primary-subtle' : 'hover:bg-muted/30'
                      }`}
                    >
                      {selectable && (
                        <td className="w-10 px-4 py-3">
                          <input
                            type="checkbox"
                            className="h-4 w-4 rounded accent-primary"
                            checked={isSelected}
                            onChange={(e) => {
                              setSelectedIds((prev) => {
                                const next = new Set(prev);
                                if (e.target.checked) {
                                  next.add(rowId);
                                } else {
                                  next.delete(rowId);
                                }
                                return next;
                              });
                            }}
                          />
                        </td>
                      )}
                      {columns.map((col) => (
                        <td key={col.key} className="truncate px-4 py-3">
                          {col.render
                            ? col.render(row)
                            : (getNestedValue(row, col.key) as ReactNode) ?? ''}
                        </td>
                      ))}
                    </tr>
                  );
                })}
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
