/**
 * Print a fee receipt using a new window with print-specific styling.
 */

interface ReceiptData {
  schoolName: string;
  studentName: string;
  className: string;
  feeTypeName: string;
  amount: number;
  paidAmount: number;
  month: number | null;
  schoolYear: string;
  paymentMethod: string | null;
  paidDate: string | null;
  receiptId: string;
}

const formatCurrency = (amount: number): string =>
  new Intl.NumberFormat('vi-VN').format(amount) + ' đ';

const formatDate = (dateStr: string | null): string => {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('vi-VN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
};

const paymentMethodLabel: Record<string, string> = {
  cash: 'Tiền mặt',
  bank_transfer: 'Chuyển khoản',
};

export function printReceipt(data: ReceiptData): void {
  const html = `
<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <title>Biên nhận học phí</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Segoe UI', Tahoma, Arial, sans-serif;
      font-size: 14px;
      color: #1E293B;
      padding: 40px;
      max-width: 600px;
      margin: 0 auto;
    }
    .header {
      text-align: center;
      margin-bottom: 24px;
      border-bottom: 2px solid #FF6B6B;
      padding-bottom: 16px;
    }
    .header h1 {
      font-size: 20px;
      color: #FF6B6B;
      margin-bottom: 4px;
    }
    .header p {
      font-size: 12px;
      color: #64748B;
    }
    .title {
      text-align: center;
      font-size: 18px;
      font-weight: 700;
      margin: 20px 0;
      text-transform: uppercase;
      letter-spacing: 1px;
    }
    .info-table {
      width: 100%;
      border-collapse: collapse;
      margin: 16px 0;
    }
    .info-table td {
      padding: 8px 12px;
      border: 1px solid #E2E8F0;
    }
    .info-table td:first-child {
      font-weight: 600;
      width: 40%;
      background: #F8FAFC;
    }
    .amount-row td {
      font-size: 16px;
      font-weight: 700;
      color: #FF6B6B;
    }
    .footer {
      margin-top: 40px;
      display: flex;
      justify-content: space-between;
    }
    .footer div {
      text-align: center;
    }
    .footer .label {
      font-weight: 600;
      margin-bottom: 60px;
    }
    .footer .sign {
      font-style: italic;
      color: #64748B;
      font-size: 12px;
    }
    .receipt-id {
      text-align: right;
      font-size: 11px;
      color: #94A3B8;
      margin-top: 8px;
    }
    @media print {
      body { padding: 20px; }
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>${escapeHtml(data.schoolName)}</h1>
    <p>BIÊN NHẬN THU HỌC PHÍ</p>
  </div>

  <div class="title">Biên nhận thanh toán</div>

  <table class="info-table">
    <tr>
      <td>Học sinh</td>
      <td>${escapeHtml(data.studentName)}</td>
    </tr>
    <tr>
      <td>Lớp</td>
      <td>${escapeHtml(data.className)}</td>
    </tr>
    <tr>
      <td>Loại phí</td>
      <td>${escapeHtml(data.feeTypeName)}</td>
    </tr>
    <tr>
      <td>Tháng / Năm học</td>
      <td>${data.month ? `Tháng ${data.month}` : '—'} / ${escapeHtml(data.schoolYear)}</td>
    </tr>
    <tr>
      <td>Số tiền phải đóng</td>
      <td>${formatCurrency(data.amount)}</td>
    </tr>
    <tr class="amount-row">
      <td>Số tiền đã đóng</td>
      <td>${formatCurrency(data.paidAmount)}</td>
    </tr>
    <tr>
      <td>Phương thức</td>
      <td>${paymentMethodLabel[data.paymentMethod || ''] || '—'}</td>
    </tr>
    <tr>
      <td>Ngày thanh toán</td>
      <td>${formatDate(data.paidDate)}</td>
    </tr>
  </table>

  <div class="footer">
    <div>
      <div class="label">Người nộp</div>
      <div class="sign">(Ký, ghi rõ họ tên)</div>
    </div>
    <div>
      <div class="label">Người thu</div>
      <div class="sign">(Ký, ghi rõ họ tên)</div>
    </div>
  </div>

  <div class="receipt-id">Mã: ${escapeHtml(data.receiptId)}</div>

  <script>window.onload = function() { window.print(); }</script>
</body>
</html>`;

  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.write(html);
    printWindow.document.close();
  }
}

function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
