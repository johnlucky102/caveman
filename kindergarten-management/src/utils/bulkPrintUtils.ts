/**
 * Utilities for BulkPrintFees — extracted for testability.
 */

/**
 * Safely parses a value that may be an array, a JSON-encoded array string,
 * null, or undefined (e.g. Supabase columns stored as JSONB text).
 */
export const parseJsonArray = <T>(value: unknown): T[] => {
  if (!value) return [];
  if (Array.isArray(value)) return value as T[];
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
};

const ones = ['', 'một', 'hai', 'ba', 'bốn', 'năm', 'sáu', 'bảy', 'tám', 'chín'];

function readTens(t: number, o: number, hasHundred: boolean): string {
  if (t === 0) {
    if (o === 0) return '';
    return hasHundred ? 'lẻ ' + ones[o] : ones[o];
  }
  if (t === 1) {
    if (o === 0) return 'mười';
    if (o === 5) return 'mười lăm';
    return 'mười ' + ones[o];
  }
  let s = ones[t] + ' mươi';
  if (o === 1) s += ' mốt';
  else if (o === 5) s += ' lăm';
  else if (o > 0) s += ' ' + ones[o];
  return s;
}

function readHundreds(num: number, isFirstGroup: boolean): string {
  const h = Math.floor(num / 100);
  const rest = num % 100;
  let s = '';

  if (h > 0) {
    s = ones[h] + ' trăm ';
    s += readTens(Math.floor(rest / 10), rest % 10, true);
  } else {
    if (!isFirstGroup && num > 0) {
      s = 'không trăm ';
      s += readTens(Math.floor(rest / 10), rest % 10, true);
    } else {
      s += readTens(Math.floor(rest / 10), rest % 10, false);
    }
  }
  return s.trim();
}

/**
 * Converts a Vietnamese Dong amount (integer) to its Vietnamese word representation.
 * E.g. 400000 → "Bốn trăm nghìn đồng"
 */
export function numberToVietnamese(n: number): string {
  if (n === 0) return 'Không đồng';

  const billions  = Math.floor(n / 1_000_000_000);
  const millions  = Math.floor((n % 1_000_000_000) / 1_000_000);
  const thousands = Math.floor((n % 1_000_000) / 1_000);
  const remainder = n % 1_000;

  let result = '';
  let hasPrefix = false;

  if (billions > 0) {
    result += readHundreds(billions, !hasPrefix) + ' tỷ ';
    hasPrefix = true;
  }
  if (millions > 0) {
    result += readHundreds(millions, !hasPrefix) + ' triệu ';
    hasPrefix = true;
  }
  if (thousands > 0) {
    result += readHundreds(thousands, !hasPrefix) + ' nghìn ';
    hasPrefix = true;
  }
  if (remainder > 0) {
    result += readHundreds(remainder, !hasPrefix) + ' ';
  }

  result = result.replace(/\s+/g, ' ').trim();
  if (!result) return 'Không đồng';
  return result.charAt(0).toUpperCase() + result.slice(1) + ' đồng';
}
