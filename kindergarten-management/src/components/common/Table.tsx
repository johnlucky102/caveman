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
}

// ─── Sort Icon ────────────────────────────────────────────────────────────────

const SortIcon: React.FC<{ columnKey: string; sortState?: SortState }> = ({
  columnKey,
  sortState,
}) => {
  if (sortState?.key !== columnKey) return <ChevronsUpDown className="w-3.5 h-3.5 text-[#CBD5E1]" />;
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
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t border-[#E2E8F0] bg-[#F8FAFC] rounded-b-xl">
      <p className="text-xs text-[#64748B]">
        Hiển thị <span className="font-medium text-[#1E293B]">{start}–{end}</span> trong{' '}
        <span className="font-medium text-[#1E293B]">{total}</span> kết quả
      </p>

      <div className="flex items-center gap-1">
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          className="p-1.5 rounded-lg text-[#64748B] hover:bg-white hover:text-[#1E293B] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
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
                <span className="px-1.5 text-[#94A3B8] text-sm">…</span>
              )}
              <button
                onClick={() => onPageChange(p)}
                className={cn(
                  'w-8 h-8 rounded-lg text-sm font-medium transition-colors',
                  p === page
                    ? 'bg-primary text-white shadow-sm'
                    : 'text-[#64748B] hover:bg-white hover:text-[#1E293B]'
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
          className="p-1.5 rounded-lg text-[#64748B] hover:bg-white hover:text-[#1E293B] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
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
}: TableProps<T>) {
  return (
    <div className={cn('bg-white border border-[#E2E8F0] rounded-xl overflow-hidden', className)}>
      <div className="overflow-x-auto">
        <table className="w-full min-w-max text-sm">
          {/* Head */}
          <thead>
            <tr className="bg-[#F8FAFC] border-b border-[#E2E8F0]">
              {columns.map((col) => (
                <th
                  key={String(col.key)}
                  className={cn(
                    'px-4 py-3 text-left text-xs font-semibold text-[#64748B] uppercase tracking-wide whitespace-nowrap',
                    col.sortable && 'cursor-pointer hover:text-[#1E293B] select-none',
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
          <tbody className="divide-y divide-[#F1F5F9]">
            {loading ? (
              // Loading skeleton rows
              Array.from({ length: 5 }).map((_, idx) => (
                <tr key={idx}>
                  {columns.map((col) => (
                    <td key={String(col.key)} className="px-4 py-3">
                      <div className="h-4 bg-[#F1F5F9] rounded animate-pulse" />
                    </td>
                  ))}
                </tr>
              ))
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-12 text-center">
                  <div className="flex flex-col items-center gap-2">
                    <Loading size="md" variant="spinner" className="text-[#94A3B8]" />
                    <p className="text-sm text-[#94A3B8]">{emptyMessage}</p>
                  </div>
                </td>
              </tr>
            ) : (
              data.map((row, idx) => (
                <tr
                  key={String((row as Record<string, unknown>)[rowKey as string]) || idx}
                  onClick={() => onRowClick?.(row)}
                  className={cn(
                    'hover:bg-[#F8FAFC] transition-colors',
                    onRowClick && 'cursor-pointer'
                  )}
                >
                  {columns.map((col) => {
                    const value = (row as Record<string, unknown>)[col.key as string];
                    return (
                      <td key={String(col.key)} className="px-4 py-3 text-[#1E293B] whitespace-nowrap">
                        {col.render
                          ? col.render(value as unknown, row)
                          : value != null
                          ? String(value)
                          : '—'}
                      </td>
                    );
                  })}
                </tr>
              ))
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
