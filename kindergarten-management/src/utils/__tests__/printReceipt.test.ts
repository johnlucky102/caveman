import { describe, it, expect, vi, beforeEach } from 'vitest';
import { printReceipt, numberToVietnameseWords } from '../printReceipt';

describe('numberToVietnameseWords', () => {
  it('converts 0 correctly', () => {
    expect(numberToVietnameseWords(0)).toBe('Không đồng');
  });

  it('converts basic numbers', () => {
    expect(numberToVietnameseWords(2800000)).toBe('Hai triệu tám trăm nghìn đồng');
    expect(numberToVietnameseWords(2780000)).toBe('Hai triệu bảy trăm tám mươi nghìn đồng');
    expect(numberToVietnameseWords(1500000)).toBe('Một triệu năm trăm nghìn đồng');
  });

  it('converts numbers with teen digits', () => {
    expect(numberToVietnameseWords(215000)).toBe('Hai trăm mười lăm nghìn đồng');
  });
});

describe('printReceipt', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    const mockWindow = {
      document: {
        write: vi.fn(),
        close: vi.fn(),
      },
    };
    vi.stubGlobal('window', {
      ...global.window,
      open: vi.fn().mockReturnValue(mockWindow),
    });
  });

  it('should print THÔNG BÁO HỌC PHÍ with correct layout', () => {
    const data = {
      schoolName: 'TRUNG TÂM TOÁN TƯ DUY EDUMATH TÔN ĐẢN - ĐÀ NẴNG',
      studentName: 'Nguyễn Hải Phong',
      className: 'BT2020 cô Dung',
      baseAmount: 2800000,
      deductionAmount: 20000,
      month: 5,
      schoolYear: '2025-2026',
      receiptId: 'E6CC',
      receiptCode: 'E6CC',
      address: '69 Tôn Đản - Hòa An - Cẩm Lệ - Đà Nẵng',
      phone: '0985860226',
      note: 'Phụ huynh nộp tiền học từ ngày 01 tới ngày 10 hàng tháng bằng tiền mặt hoặc chuyển khoản',
      bankAccount: '118122283',
      bankName: 'VP Bank',
      accountHolder: 'Phạm Thị Hiền',
      issueDate: '2026-05-01',
    };

    printReceipt(data);

    expect(window.open).toHaveBeenCalledWith('', '_blank');
    const mockWindow = (window.open as any).mock.results[0].value;
    expect(mockWindow.document.write).toHaveBeenCalled();
    expect(mockWindow.document.close).toHaveBeenCalled();

    const html = mockWindow.document.write.mock.calls[0][0];

    expect(html).toContain('TRUNG TÂM TOÁN TƯ DUY EDUMATH TÔN ĐẢN - ĐÀ NẴNG');
    expect(html).toContain('ĐC : 69 Tôn Đản - Hòa An - Cẩm Lệ - Đà Nẵng');
    expect(html).toContain('0985860226');
    expect(html).toContain('Thông báo học phí tháng 5 năm 2026');
    expect(html).toContain('text-transform: uppercase');
    expect(html).toContain('(Số phiếu E6CC)');
    expect(html).toContain('Học sinh :');
    expect(html).toContain('Nguyễn Hải Phong');
    expect(html).toContain('BT2020 cô Dung');
    expect(html).toContain('2.800.000đ');
    expect(html).toContain('-20.000đ');
    expect(html).toContain('Tổng cộng :');
    expect(html).toContain('2.780.000đ');
    expect(html).toContain('2.780.000 đ');
    expect(html).toContain('Hai triệu bảy trăm tám mươi nghìn đồng');
    expect(html).toContain('Số tk :');
    expect(html).toContain('118122283');
    expect(html).toContain('VP Bank');
    expect(html).toContain('Phạm Thị Hiền');
    expect(html).toContain('ngày<span class="underline">');
    expect(html).toContain('tháng<span class="underline">');
    expect(html).toContain('năm 2026');
    expect(html).toContain('Người thu');
  });

  it('should omit bank info when not provided', () => {
    const data = {
      schoolName: 'Kindergarten A',
      studentName: 'John Doe',
      className: 'Class 1',
      baseAmount: 500000,
      deductionAmount: 0,
      month: 3,
      schoolYear: '2024-2025',
      receiptId: 'REC-001',
    };

    printReceipt(data);

    const mockWindow = (window.open as any).mock.results[0].value;
    const html = mockWindow.document.write.mock.calls[0][0];

    expect(html).not.toContain('Số tk :');
    expect(html).toContain('Thông báo học phí tháng 3 năm 2025');
    expect(html).toContain('text-transform: uppercase');
    expect(html).toContain('500.000đ');
    expect(html).toContain('Tổng cộng :');
  });

  it('should omit note when not provided', () => {
    const data = {
      schoolName: 'Kindergarten B',
      studentName: 'Jane Doe',
      className: 'Class 2',
      baseAmount: 300000,
      deductionAmount: 0,
      month: null,
      schoolYear: '2024-2025',
      receiptId: 'REC-002',
    };

    printReceipt(data);

    const mockWindow = (window.open as any).mock.results[0].value;
    const html = mockWindow.document.write.mock.calls[0][0];

    expect(html).not.toContain('Phụ huynh nộp tiền');
    expect(html).toContain('tháng — năm');
  });
});
