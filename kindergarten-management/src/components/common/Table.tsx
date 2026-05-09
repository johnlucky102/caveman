import React from 'react';
import { ChevronLeft, ChevronRight, ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react';
import { cn } from '../../lib/utils';
import type { TableColumn, PaginationMeta } from '../../types';
import Loading from './Loading';

// ─── Types ────────────────────────────────────────────────────────────────────

interface SortState {
  key: string;
  direction: 'asc' | 'desc';
}

interface TableProps<T extends object> {
  /** Column definitions */
  columns: TableColumn<T>[];
  /** Row data */
  data: T[];
  /** Unique key field for rows */
  rowKey?: keyof T;
  /** Show loading skeleton */
  loading?: boolean;
  /** Message shown when data is empty */
  emptyMessage?: string;
  /** Pagination metadata */
  pagination?: PaginationMeta;
  /** Called when page changes */
  onPageChange?: (page: number) => void;
  /** Active sort state */
  sortState?: SortState;
  /** Called when a sortable column header is clicked */
  onSort?: (key: string) => void;
  /** Called when a row is clicked */
  onRowClick?: (row: T) => void;
  /** Additional class for the table container */
  className?: string;
  /** Array of selected row keys */
  selectedKeys?: string[];
  /** Called when row selection changes */
  onSelectionChange?: (keys: string[]) => void;
}

// ─── Sort Icon ────────────────────────────────────────────────────────────────

const SortIcon: React.FC<{ columnKey: string; sortState?: SortState }> = ({
  columnKey,
  sortState,
}) => {
  if (sortState?.key !== columnKey) return <ChevronsUpDown className="w-3.5 h-3.5 text-muted-foreground/40" />;
  return sortState.direction === 'asc' ? (
    <ChevronUp className="w-3.5 h-3.5 text-primary" />
  ) : (
    <ChevronDown className="w-3.5 h-3.5 text-primary" />
  );
};

// ─── Pagination ───────────────────────────────────────────────────────────────

interface PaginationProps {
  meta: PaginationMeta;
  onPageChange: (page: number) => void;
}

const Pagination: React.FC<PaginationProps> = ({ meta, onPageChange }) => {
  const { page, pageSize, total, totalPages } = meta;
  const start = Math.min((page - 1) * pageSize + 1, total);
  const end = Math.min(page * pageSize, total);

  const pages = Array.from({ length: totalPages }, (_, i) => i + 1).filter(
    (p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1
  );

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t border-border bg-muted/50 rounded-b-xl">
      <p className="text-xs text-muted-foreground">
        Hiển thị <span className="font-medium text-foreground">{start}–{end}</span> trong{' '}
        <span className="font-medium text-foreground">{total}</span> kết quả
      </p>

      <div className="flex items-center gap-1">
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          className="p-1.5 rounded-lg text-muted-foreground hover:bg-card hover:text-foreground disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          aria-label="Trang trước"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        {pages.map((p, idx) => {
          const prev = pages[idx - 1];
          const showEllipsis = prev != null && p - prev > 1;
          return (
            <React.Fragment key={p}>
              {showEllipsis && (
                <span className="px-1.5 text-muted-foreground/40 text-sm">…</span>
              )}
              <button
                onClick={() => onPageChange(p)}
                className={cn(
                  'w-8 h-8 rounded-lg text-sm font-medium transition-colors',
                  p === page
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:bg-card hover:text-foreground'
                )}
              >
                {p}
              </button>
            </React.Fragment>
          );
        })}

        <button
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          className="p-1.5 rounded-lg text-muted-foreground hover:bg-card hover:text-foreground disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          aria-label="Trang tiếp"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

// ─── Table Component ──────────────────────────────────────────────────────────

/**
 * Responsive data table with sorting, pagination, loading state, and row click.
 */
function Table<T extends object>({
  columns,
  data,
  rowKey = 'id' as keyof T,
  loading = false,
  emptyMessage = 'Không có dữ liệu',
  pagination,
  onPageChange,
  sortState,
  onSort,
  onRowClick,
  className,
  selectedKeys = [],
  onSelectionChange,
}: TableProps<T>) {
  const isAllSelected = data.length > 0 && selectedKeys.length === data.length;
  const isIndeterminate = selectedKeys.length > 0 && selectedKeys.length < data.length;

  const handleSelectAll = () => {
    if (isAllSelected) {
      onSelectionChange?.([]);
    } else {
      const allKeys = data.map((row) => String((row as Record<string, unknown>)[rowKey as string]));
      onSelectionChange?.(allKeys);
    }
  };

  const handleSelectRow = (e: React.MouseEvent, key: string) => {
    e.stopPropagation();
    const newSelected = selectedKeys.includes(key)
      ? selectedKeys.filter((k) => k !== key)
      : [...selectedKeys, key];
    onSelectionChange?.(newSelected);
  };

  return (
    <div className={cn('bg-card border border-border rounded-xl overflow-hidden', className)}>
      <div className="overflow-x-auto">
        <table className="w-full min-w-max text-sm">
          {/* Head */}
          <thead>
            <tr className="bg-muted/50 border-b border-border">
              {onSelectionChange && (
                <th className="px-4 py-3 w-10">
                  <input
                    type="checkbox"
                    className="rounded border-input text-primary focus:ring-primary cursor-pointer w-4 h-4 bg-background"
                    checked={isAllSelected}
                    ref={(input) => {
                      if (input) input.indeterminate = isIndeterminate;
                    }}
                    onChange={handleSelectAll}
                  />
                </th>
              )}
              {columns.map((col) => (
                <th
                  key={String(col.key)}
                  className={cn(
                    'px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap',
                    col.sortable && 'cursor-pointer hover:text-foreground select-none',
                    col.width && `w-[${col.width}]`
                  )}
                  onClick={col.sortable ? () => onSort?.(String(col.key)) : undefined}
                >
                  <span className="flex items-center gap-1">
                    {col.label}
                    {col.sortable && <SortIcon columnKey={String(col.key)} sortState={sortState} />}
                  </span>
                </th>
              ))}
            </tr>
          </thead>

          {/* Body */}
          <tbody className="divide-y divide-border">
            {loading ? (
              // Loading skeleton rows
              Array.from({ length: 5 }).map((_, idx) => (
                <tr key={idx}>
                  {onSelectionChange && <td className="px-4 py-3" />}
                  {columns.map((col) => (
                    <td key={String(col.key)} className="px-4 py-3">
                      <div className="h-4 bg-muted rounded animate-pulse" />
                    </td>
                  ))}
                </tr>
              ))
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={columns.length + (onSelectionChange ? 1 : 0)} className="px-4 py-12 text-center">
                  <div className="flex flex-col items-center gap-2">
                    <Loading size="md" variant="spinner" className="text-[#94A3B8]" />
                    <p className="text-sm text-[#94A3B8]">{emptyMessage}</p>
                  </div>
                </td>
              </tr>
            ) : (
              data.map((row, idx) => {
                const rowId = String((row as Record<string, unknown>)[rowKey as string]) || String(idx);
                const isSelected = selectedKeys.includes(rowId);
                
                return (
                  <tr
                    key={rowId}
                    onClick={() => onRowClick?.(row)}
                    className={cn(
                      'transition-colors',
                      isSelected ? 'bg-primary/10' : 'hover:bg-muted/30',
                      onRowClick && 'cursor-pointer'
                    )}
                  >
                    {onSelectionChange && (
                      <td className="px-4 py-3 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          className="rounded border-input text-primary focus:ring-primary cursor-pointer w-4 h-4 bg-background"
                          checked={isSelected}
                          onChange={(e) => handleSelectRow(e as unknown as React.MouseEvent, rowId)}
                        />
                      </td>
                    )}
                    {columns.map((col) => {
                    const value = (row as Record<string, unknown>)[col.key as string];
                    return (
                      <td key={String(col.key)} className="px-4 py-3 text-foreground whitespace-nowrap">
                        {col.render
                          ? col.render(value as unknown, row)
                          : value != null
                          ? String(value)
                          : '—'}
                      </td>
                    );
                  })}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pagination && onPageChange && pagination.totalPages > 1 && (
        <Pagination meta={pagination} onPageChange={onPageChange} />
      )}
    </div>
  );
}

export default Table;
export type { TableProps, SortState };
