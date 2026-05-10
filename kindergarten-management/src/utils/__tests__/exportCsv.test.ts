import { describe, it, expect, vi, beforeEach } from 'vitest';
import { exportToCsv } from '../exportCsv';

describe('exportToCsv', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mocking DOM globals
    vi.stubGlobal('URL', {
      createObjectURL: vi.fn(() => 'mock-url'),
      revokeObjectURL: vi.fn(),
    });
    
    // Spy on document.createElement to capture the link
    vi.spyOn(document, 'createElement');
    
    vi.spyOn(document.body, 'appendChild').mockImplementation((node) => node);
    vi.spyOn(document.body, 'removeChild').mockImplementation((node) => node);
  });

  it('should generate CSV content correctly', () => {
    const data = [
      { name: 'John Doe', age: 30 },
    ];
    const columns = [
      { key: 'name', label: 'Name' },
      { key: 'age', label: 'Age' },
    ];

    // We need to mock click on the element created
    const mockLink = {
      click: vi.fn(),
      setAttribute: vi.fn(),
      style: {},
      href: '',
      download: '',
    };
    (document.createElement as any).mockReturnValueOnce(mockLink);

    exportToCsv(data, columns, 'test-file');

    expect(document.createElement).toHaveBeenCalledWith('a');
    expect(mockLink.download).toBe('test-file.csv');
    expect(mockLink.click).toHaveBeenCalled();
  });

  it('should handle custom rendering', () => {
    const data = [{ id: 1, amount: 1000 }];
    const columns = [
      { key: 'id', label: 'ID' },
      { key: 'amount', label: 'Amount', render: (val: any) => `${val} VND` },
    ];

    exportToCsv(data, columns, 'render-test');

    expect(document.createElement).toHaveBeenCalledWith('a');
  });

  it('should return early if data is empty', () => {
    vi.clearAllMocks();
    exportToCsv([], [], 'empty');
    expect(document.createElement).not.toHaveBeenCalled();
  });
});
