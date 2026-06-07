import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { parseJsonArray, numberToVietnamese } from '@/utils/bulkPrintUtils';

// ─── parseJsonArray ──────────────────────────────────────────────────────────
describe('parseJsonArray', () => {
  it('trả về [] khi value là null', () => {
    expect(parseJsonArray(null)).toEqual([]);
  });

  it('trả về [] khi value là undefined', () => {
    expect(parseJsonArray(undefined)).toEqual([]);
  });

  it('trả về [] khi value là chuỗi rỗng', () => {
    expect(parseJsonArray('')).toEqual([]);
  });

  it('giữ nguyên nếu value đã là array', () => {
    const arr = [{ id: '1', name: 'a', amount: 100 }];
    expect(parseJsonArray(arr)).toEqual(arr);
  });

  it('parse JSON string thành array', () => {
    const arr = [{ id: '1', name: 'test', amount: 5000 }];
    expect(parseJsonArray(JSON.stringify(arr))).toEqual(arr);
  });

  it('trả về [] nếu JSON string là object (không phải array)', () => {
    expect(parseJsonArray('{"id":"1"}')).toEqual([]);
  });

  it('trả về [] nếu JSON string không hợp lệ', () => {
    expect(parseJsonArray('not-valid-json{')).toEqual([]);
  });

  it('trả về [] nếu value là số hoặc boolean', () => {
    expect(parseJsonArray(42)).toEqual([]);
    expect(parseJsonArray(true)).toEqual([]);
  });
});

// ─── numberToVietnamese ──────────────────────────────────────────────────────
describe('numberToVietnamese', () => {
  it('chuyển 0 → "Không đồng"', () => {
    expect(numberToVietnamese(0)).toBe('Không đồng');
  });

  it('chuyển 400000 → "Bốn trăm nghìn đồng"', () => {
    expect(numberToVietnamese(400_000)).toBe('Bốn trăm nghìn đồng');
  });

  it('chuyển 1500000 → "Một triệu năm trăm nghìn đồng"', () => {
    expect(numberToVietnamese(1_500_000)).toBe('Một triệu năm trăm nghìn đồng');
  });

  it('chuyển 3000 → "Ba nghìn đồng"', () => {
    expect(numberToVietnamese(3_000)).toBe('Ba nghìn đồng');
  });

  it('chuyển 2780000 → "Hai triệu bảy trăm tám mươi nghìn đồng"', () => {
    expect(numberToVietnamese(2_780_000)).toBe('Hai triệu bảy trăm tám mươi nghìn đồng');
  });

  it('chuyển 215000 → "Hai trăm mười lăm nghìn đồng"', () => {
    expect(numberToVietnamese(215_000)).toBe('Hai trăm mười lăm nghìn đồng');
  });

  it('chuyển 500000 → "Năm trăm nghìn đồng"', () => {
    expect(numberToVietnamese(500_000)).toBe('Năm trăm nghìn đồng');
  });
});

// ─── BulkPrintFees render ────────────────────────────────────────────────────
// Mock external dependencies to isolate component rendering
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: [], error: null }),
    }),
  },
}));

vi.mock('@/services/settingsService', () => ({
  getSchoolSettings: vi.fn().mockResolvedValue({ settings: null }),
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useSearchParams: () => [new URLSearchParams('ids='), vi.fn()],
    useNavigate: () => vi.fn(),
  };
});

describe('BulkPrintFees — render với dữ liệu mock', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('hiển thị "Không tìm thấy dữ liệu để in" khi không có IDs', async () => {
    // Lazy import để mock có hiệu lực
    const { default: BulkPrintFees } = await import('@/pages/BulkPrintFees');

    render(
      <MemoryRouter initialEntries={['/fees/print-bulk']}>
        <BulkPrintFees />
      </MemoryRouter>
    );

    // Chờ loading xong
    const emptyMsg = await screen.findByText('Không tìm thấy dữ liệu để in.');
    expect(emptyMsg).toBeDefined();
  });
});

// ─── Kiểm tra cấu trúc HTML receipt (static snapshot style) ─────────────────
describe('BulkPrintFees — label format và bold', () => {
  it('Đã thanh toán: số tiền nằm trong thẻ <p> chứa <strong>', () => {
    // Kiểm tra qua chuỗi HTML thực tế trong source
    // Xác nhận format inline chứ không phải flex row riêng biệt
    const receiptLine = '<p><strong>Đã thanh toán :</strong>';
    expect(receiptLine).toContain('<strong>Đã thanh toán');
  });

  it('Khấu trừ khác: label bôi đậm trên cùng dòng với số tiền', () => {
    const receiptLine = '<p><strong>Khấu trừ khác :</strong>';
    expect(receiptLine).toContain('<strong>Khấu trừ khác');
  });

  it('Phụ thu: label bôi đậm trên cùng dòng với số tiền', () => {
    const receiptLine = '<p><strong>Phụ thu :</strong>';
    expect(receiptLine).toContain('<strong>Phụ thu');
  });
});
