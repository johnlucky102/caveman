import React from 'react';
import { ChevronLeft, ChevronRight, ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react';
import { cn } from '../../lib/utils';
import type { TableColumn, PaginationMeta } from '../../types';
import Loading from './Loading';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SortState {
  key: string;
  direction: 'asc' | 'desc';
}

interface TableProps<T extends object> {
  columns: TableColumn<T>[];
  data: T[];
  rowKey: keyof T | ((row: T) => string | number);
  loading?: boolean;
  sortState?: SortState;
  onSort?: (key: string) => void;
  onRowClick?: (row: T) => void;
  className?: string;
  pagination?: PaginationMeta;
  onPageChange?: (page: number) => void;
  emptyState?: React.ReactNode;
  emptyMessage?: string;
  selectedKeys?: (string | number)[];
  onSelectionChange?: (selected: (string | number)[]) => void;
  renderMobileCard?: (row: T, rowId: string | number) => React.ReactNode;
}

// ─── Sort Icon ────────────────────────────────────────────────────────────────

function SortIcon({ columnKey, sortState }: { columnKey: string; sortState?: SortState }) {
  const isActive = sortState?.key === columnKey;
  const direction = sortState?.direction;

  if (!isActive) {
    return <ChevronsUpDown className="w-3.5 h-3.5 inline ml-1 opacity-30" />;
  }

  return direction === 'asc'
    ? <ChevronUp className="w-3.5 h-3.5 inline ml-1 text-primary" />
    : <ChevronDown className="w-3.5 h-3.5 inline ml-1 text-primary" />;
}

// ─── Desktop Pagination ───────────────────────────────────────────────────────

function Pagination({ meta, onPageChange }: { meta: PaginationMeta; onPageChange: (page: number) => void }) {
  const { page, totalPages } = meta;
  const maxVisible = 5;

  let start = Math.max(1, page - Math.floor(maxVisible / 2));
  let end = Math.min(totalPages, start + maxVisible - 1);
  if (end - start + 1 < maxVisible) {
    start = Math.max(1, end - maxVisible + 1);
  }

  const pages: (number | 'ellipsis')[] = [];
  if (start > 1) {
    pages.push(1);
    if (start > 2) pages.push('ellipsis');
  }
  for (let i = start; i <= end; i++) pages.push(i);
  if (end < totalPages) {
    if (end < totalPages - 1) pages.push('ellipsis');
    pages.push(totalPages);
  }

  return (
    <div className="flex items-center justify-between px-4 py-3 border-t border-border">
      <span className="text-xs text-muted-foreground">
        Trang {page} / {totalPages}
      </span>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-30 disabled:pointer-events-none transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        {pages.map((p, i) =>
          p === 'ellipsis' ? (
            <span key={`e-${i}`} className="px-1 text-muted-foreground text-xs">...</span>
          ) : (
            <button
              key={p}
              onClick={() => onPageChange(p)}
              className={cn(
                'min-w-[32px] h-8 text-xs font-medium rounded-md transition-colors',
                p === page
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              )}
            >
              {p}
            </button>
          )
        )}
        <button
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-30 disabled:pointer-events-none transition-colors"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

// ─── Mobile Pagination ────────────────────────────────────────────────────────

function MobilePagination({ meta, onPageChange }: { meta: PaginationMeta; onPageChange: (page: number) => void }) {
  const { page, totalPages } = meta;
  if (totalPages <= 1) return null;
  return (
    <div className="flex items-center gap-2 px-4 py-3 border-t border-border">
      <button
        onClick={() => onPageChange(page - 1)}
        disabled={page <= 1}
        className="flex-1 py-2.5 text-sm font-medium text-center rounded-xl bg-muted text-foreground hover:bg-muted/70 disabled:opacity-30 disabled:pointer-events-none transition-colors"
      >
        Trang trước
      </button>
      <span className="text-xs text-muted-foreground shrink-0 min-w-[48px] text-center">
        {page} / {totalPages}
      </span>
      <button
        onClick={() => onPageChange(page + 1)}
        disabled={page >= totalPages}
        className="flex-1 py-2.5 text-sm font-medium text-center rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-30 disabled:pointer-events-none transition-colors"
      >
        Trang sau
      </button>
    </div>
  );
}

// ─── Mobile Select All Toolbar ────────────────────────────────────────────────

function MobileSelectAllToolbar({
  isAllSelected,
  onToggleAll,
  count,
}: {
  isAllSelected: boolean;
  onToggleAll: () => void;
  count: number;
}) {
  return (
    <div className="flex items-center gap-2 px-4 py-2 bg-muted/30 border-b border-border" onClick={(e) => e.stopPropagation()}>
      <input
        type="checkbox"
        className="rounded border-input text-primary focus:ring-primary cursor-pointer w-4 h-4 bg-background"
        checked={isAllSelected}
        onChange={() => onToggleAll()}
      />
      <span className="text-xs font-medium text-foreground">Chọn tất cả ({count})</span>
    </div>
  );
}

// ─── Default Mobile Card ──────────────────────────────────────────────────────

function DefaultMobileCard<T extends object>({
  row,
  columns,
  rowId,
  onRowClick,
}: {
  row: T;
  columns: TableColumn<T>[];
  rowId: string | number;
  onRowClick?: (row: T) => void;
}) {
  const dataCols = columns.filter(c => c.label && c.key !== 'actions');
  return (
    <div
      key={rowId}
      className={cn(
        'bg-card p-4 space-y-2',
        onRowClick && 'cursor-pointer active:bg-muted/50'
      )}
      onClick={() => onRowClick?.(row)}
    >
      {dataCols.map((col) => {
        const value = (row as Record<string, unknown>)[col.key as string];
        return (
          <div key={String(col.key)} className="flex justify-between items-start gap-2">
            <span className="text-xs text-muted-foreground shrink-0">{col.label}</span>
            <span className="text-sm text-foreground text-right">
              {col.render ? col.render(value as unknown, row) : value != null ? String(value) : '\u2014'}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function selectedSet(keys?: (string | number)[]): Set<string | number> {
  return new Set(keys || []);
}

function callOnChange(
  fn: ((selected: (string | number)[]) => void) | undefined,
  s: Set<string | number>,
) {
  if (fn) fn(Array.from(s));
}

// ─── Table Component ──────────────────────────────────────────────────────────

function Table<T extends object>({
  columns,
  data,
  rowKey,
  loading = false,
  sortState,
  onSort,
  onRowClick,
  className,
  pagination,
  onPageChange,
  emptyState,
  emptyMessage,
  selectedKeys,
  onSelectionChange,
  renderMobileCard,
}: TableProps<T>) {
  const isSelectable = !!onSelectionChange;
  const actionCol = columns.find(c => c.key === 'actions' || c.key === 'action');
  const sel = selectedSet(selectedKeys);

  const getRowId = (row: T, index: number): string | number => {
    if (typeof rowKey === 'function') return rowKey(row);
    return (row[rowKey] as string | number) ?? index;
  };

  const isAllSelected = data.length > 0 && !!selectedKeys && data.every((row, i) => sel.has(getRowId(row, i)));

  return (
    <div className={cn('bg-card border border-border rounded-xl overflow-hidden', className)}>
      {/* Desktop: table view */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              {isSelectable && (
                <th className="px-4 py-3 w-12">
                  <input
                    type="checkbox"
                    className="rounded border-input text-primary focus:ring-primary cursor-pointer w-4 h-4 bg-background"
                    checked={!!isAllSelected}
                    onChange={() => {
                      if (!selectedKeys || !onSelectionChange) return;
                      if (isAllSelected) {
                        callOnChange(onSelectionChange, new Set());
                      } else {
                        callOnChange(onSelectionChange, new Set(data.map((row, i) => getRowId(row, i))));
                      }
                    }}
                  />
                </th>
              )}
              {columns.map((col) => (
                <th
                  key={String(col.key)}
                  className={cn(
                    'px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap',
                    col.sortable && 'cursor-pointer select-none hover:text-foreground transition-colors'
                  )}
                  onClick={col.sortable ? () => onSort?.(String(col.key)) : undefined}
                  style={col.width ? { width: col.width } : undefined}
                >
                  {col.label}
                  {col.sortable && <SortIcon columnKey={String(col.key)} sortState={sortState} />}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={columns.length + (isSelectable ? 1 : 0)} className="px-4 py-12">
                  <Loading label="Đang tải..." />
                </td>
              </tr>
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={columns.length + (isSelectable ? 1 : 0)} className="px-4 py-12">
                  {emptyState || (
                    <div className="flex flex-col items-center justify-center text-center">
                      <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center mb-3">
                        <ChevronsUpDown className="w-6 h-6 text-muted-foreground/40" />
                      </div>
                      <p className="text-sm font-medium text-foreground">{emptyMessage || 'Không có dữ liệu'}</p>
                      <p className="text-xs text-muted-foreground mt-1">Chưa có bản ghi nào.</p>
                    </div>
                  )}
                </td>
              </tr>
            ) : (
              data.map((row, rowIndex) => {
                const rowId = getRowId(row, rowIndex);
                const isSelected = sel.has(rowId);
                return (
                  <tr
                    key={rowId}
                    className={cn(
                      'border-b border-border last:border-b-0 transition-colors',
                      isSelected ? 'bg-primary/5' : 'hover:bg-muted/30',
                      onRowClick && 'cursor-pointer'
                    )}
                    onClick={() => onRowClick?.(row)}
                  >
                    {onSelectionChange && (
                      <td className="px-4 py-3 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          className="rounded border-input text-primary focus:ring-primary cursor-pointer w-4 h-4 bg-background"
                          checked={!!isSelected}
                          onChange={(e) => {
                            const newSel = new Set(sel);
                            if (e.target.checked) {
                              newSel.add(rowId);
                            } else {
                              newSel.delete(rowId);
                            }
                            callOnChange(onSelectionChange, newSel);
                          }}
                        />
                      </td>
                    )}
                    {columns.map((col) => {
                    const value = (row as Record<string, unknown>)[col.key as string];
                    return (
                      <td key={String(col.key)} className={cn('px-4 py-3 text-foreground', col.wrap ? 'whitespace-normal min-w-[200px]' : 'whitespace-nowrap')}>
                        {col.render
                          ? col.render(value as unknown, row)
                          : value != null
                          ? String(value)
                          : '\u2014'}
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

      {/* Mobile: card view */}
      <div className="block md:hidden">
        {loading ? (
          <div className="px-4 py-12">
            <Loading label="Đang tải..." />
          </div>
        ) : data.length === 0 ? (
          <div className="px-4 py-12">
            {emptyState || (
              <div className="flex flex-col items-center justify-center text-center">
                <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center mb-3">
                  <ChevronsUpDown className="w-6 h-6 text-muted-foreground/40" />
                </div>
                <p className="text-sm font-medium text-foreground">{emptyMessage || 'Không có dữ liệu'}</p>
                <p className="text-xs text-muted-foreground mt-1">Chưa có bản ghi nào.</p>
              </div>
            )}
          </div>
        ) : (
          <div>
            {/* Select All toolbar */}
            {isSelectable && data.length > 0 && (
              <MobileSelectAllToolbar
                isAllSelected={!!isAllSelected}
                onToggleAll={() => {
                  if (!selectedKeys || !onSelectionChange) return;
                  if (isAllSelected) {
                    callOnChange(onSelectionChange, new Set());
                  } else {
                    callOnChange(onSelectionChange, new Set(data.map((row, i) => getRowId(row, i))));
                  }
                }}
                count={data.length}
              />
            )}

            {data.map((row, rowIndex) => {
              const rowId = getRowId(row, rowIndex);
              const isSelected = sel.has(rowId);
              const actionEl = actionCol?.render
                ? actionCol.render((row as Record<string, unknown>)[actionCol.key as string] as unknown, row)
                : null;

              return (
                <div
                  key={rowId}
                  className={cn(
                    'flex border-b border-border last:border-b-0',
                    isSelected && 'bg-primary/5'
                  )}
                >
                  {/* Checkbox column (beside card content) */}
                  {isSelectable && (
                    <div className="flex items-start pt-4 pl-3 shrink-0" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        className="rounded border-input text-primary focus:ring-primary cursor-pointer w-4 h-4 bg-background mt-0.5"
                        checked={!!isSelected}
                        onChange={(e) => {
                          const newSel = new Set(sel);
                          if (e.target.checked) {
                            newSel.add(rowId);
                          } else {
                            newSel.delete(rowId);
                          }
                          callOnChange(onSelectionChange, newSel);
                        }}
                      />
                    </div>
                  )}

                  {/* Content column */}
                  <div className="flex-1 min-w-0">
                    {/* Card content */}
                    {renderMobileCard ? (
                      renderMobileCard(row, rowId)
                    ) : (
                      <DefaultMobileCard row={row} columns={columns} rowId={rowId} onRowClick={onRowClick} />
                    )}

                    {/* Action buttons */}
                    {actionEl && (
                      <div
                        className="px-4 pb-3 pt-1 flex items-center gap-1 border-t border-border/50 mt-2 mx-4"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {actionEl}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {/* Mobile pagination */}
            {pagination && onPageChange && (
              <MobilePagination meta={pagination} onPageChange={onPageChange} />
            )}
          </div>
        )}
      </div>

      {/* Desktop pagination (hidden on mobile) */}
      {pagination && onPageChange && pagination.totalPages > 1 && (
        <div className="hidden md:block">
          <Pagination meta={pagination} onPageChange={onPageChange} />
        </div>
      )}
    </div>
  );
}

export default Table;
export type { TableProps };
