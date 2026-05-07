/**
 * Export data to CSV file with proper Vietnamese encoding.
 * Uses UTF-8 BOM to ensure Excel opens with correct encoding.
 */

interface CsvColumn<T> {
  key: keyof T | string;
  label: string;
  render?: (value: unknown, row: T) => string;
}

export function exportToCsv<T extends object>(
  data: T[],
  columns: CsvColumn<T>[],
  filename: string
): void {
  if (data.length === 0) return;

  // Build header row
  const header = columns.map((col) => escapeCell(col.label)).join(',');

  // Build data rows
  const rows = data.map((row) =>
    columns
      .map((col) => {
        if (col.render) {
          return escapeCell(col.render((row as any)[col.key], row));
        }
        const value = (row as any)[col.key];
        return escapeCell(String(value ?? ''));
      })
      .join(',')
  );

  // UTF-8 BOM + content
  const BOM = '\uFEFF';
  const csvContent = BOM + [header, ...rows].join('\n');

  // Create and download blob
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename.endsWith('.csv') ? filename : `${filename}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function escapeCell(value: string): string {
  // If contains comma, newline, or double-quote, wrap in quotes
  if (value.includes(',') || value.includes('\n') || value.includes('"')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}
