import { describe, it, expect, vi, beforeEach } from 'vitest';
import { printReceipt } from '../printReceipt';

describe('printReceipt', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock window.open
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

  it('should open a print window and write HTML content', () => {
    const data = {
      schoolName: 'Kindergarten A',
      studentName: 'John Doe',
      className: 'Class 1',
      feeTypeName: 'Tuition',
      amount: 1000000,
      paidAmount: 1000000,
      month: 10,
      schoolYear: '2023-2024',
      paymentMethod: 'cash',
      paidDate: '2023-10-01',
      receiptId: 'REC-001',
    };

    printReceipt(data);

    expect(window.open).toHaveBeenCalledWith('', '_blank');
    const mockWindow = (window.open as any).mock.results[0].value;
    expect(mockWindow.document.write).toHaveBeenCalled();
    expect(mockWindow.document.close).toHaveBeenCalled();
    
    const writtenHtml = mockWindow.document.write.mock.calls[0][0];
    expect(writtenHtml).toContain('Kindergarten A');
    expect(writtenHtml).toContain('John Doe');
    expect(writtenHtml).toContain('1.000.000 đ');
    expect(writtenHtml).toContain('Tiền mặt');
  });

  it('should handle null values gracefully', () => {
    const data = {
      schoolName: 'Kindergarten A',
      studentName: 'John Doe',
      className: 'Class 1',
      feeTypeName: 'Tuition',
      amount: 1000000,
      paidAmount: 0,
      month: null,
      schoolYear: '2023-2024',
      paymentMethod: null,
      paidDate: null,
      receiptId: 'REC-002',
    };

    printReceipt(data);

    const mockWindow = (window.open as any).mock.results[0].value;
    const writtenHtml = mockWindow.document.write.mock.calls[0][0];
    expect(writtenHtml).toContain('—');
    expect(writtenHtml).toContain('0 đ');
  });
});
