/**
 * Print a fee receipt (THÔNG BÁO HỌC PHÍ) using a new window with print-specific styling.
 */

interface ReceiptData {
  schoolName: string;
  studentName: string;
  className: string;
  baseAmount: number;
  deductionAmount: number;
  month: number | null;
  schoolYear: string;
  receiptId: string;
  address?: string;
  phone?: string;
  receiptCode?: string | null;
  bankAccount?: string | null;
  bankName?: string | null;
  accountHolder?: string | null;
  note?: string | null;
  issueDate?: string | null;
}

const units = ['', 'một', 'hai', 'ba', 'bốn', 'năm', 'sáu', 'bảy', 'tám', 'chín'];
const tens = ['', 'mười', 'hai mươi', 'ba mươi', 'bốn mươi', 'năm mươi', 'sáu mươi', 'bảy mươi', 'tám mươi', 'chín mươi'];
const scaleWords = ['', 'nghìn', 'triệu', 'tỷ'];

function readThreeDigits(n: number): string {
  const h = Math.floor(n / 100);
  const du = n % 100;
  const t = Math.floor(du / 10);
  const u = du % 10;
  let s = '';

  if (h > 0) s += units[h] + ' trăm ';

  if (du > 0) {
    if (t >= 2) {
      s += tens[t] + ' ';
      if (u === 5) s += 'lăm ';
      else if (u > 0) s += units[u] + ' ';
    } else if (t === 1) {
      s += 'mười ';
      if (u === 5) s += 'lăm ';
      else if (u > 0) s += units[u] + ' ';
    } else {
      if (h > 0) s += 'lẻ ';
      s += units[u] + ' ';
    }
  }

  return s.trim();
}

export function numberToVietnameseWords(num: number): string {
  if (num === 0) return 'Không đồng';

  let result = '';
  let scaleIdx = 0;
  let remaining = num;

  while (remaining > 0 && scaleIdx < scaleWords.length) {
    const group = remaining % 1000;
    if (group > 0) {
      const groupStr = readThreeDigits(group);
      result = groupStr + ' ' + scaleWords[scaleIdx] + ' ' + result;
    }
    remaining = Math.floor(remaining / 1000);
    scaleIdx++;
  }

  const words = result.trim().replace(/\s+/g, ' ');
  return words.charAt(0).toUpperCase() + words.slice(1) + ' đồng';
}

const fmtVnd = (amount: number): string =>
  new Intl.NumberFormat('vi-VN').format(amount);

function getCalendarYear(schoolYear: string, month: number | null): number {
  const [startYearStr] = schoolYear.split('-');
  const startYear = parseInt(startYearStr, 10);
  if (!month || Number.isNaN(startYear)) return startYear;
  return month >= 8 ? startYear : startYear + 1;
}

export function printReceipt(data: ReceiptData): void {
  const totalAmount = Math.max(0, data.baseAmount - data.deductionAmount);
  const amountText = numberToVietnameseWords(totalAmount);
  const issueDate = data.issueDate ? new Date(data.issueDate) : new Date();
  const receiptYear = getCalendarYear(data.schoolYear, data.month);
  const address = data.address?.trim() || '';
  const phone = data.phone?.trim() || '';
  const receiptCode = data.receiptCode || data.receiptId;
  const note = data.note?.trim() || null;
  const bankAccount = data.bankAccount?.trim() || null;
  const bankName = data.bankName?.trim() || null;
  const accountHolder = data.accountHolder?.trim() || null;

  const html = `
<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <title>Thông báo học phí</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Times New Roman', Times, serif;
      font-size: 15px;
      color: #000;
      padding: 32px 40px;
      max-width: 580px;
      margin: 0 auto;
      line-height: 1.7;
    }
    .center { text-align: center; }
    .header {
      text-align: center;
      margin-bottom: 8px;
    }
    .header h1 {
      font-size: 16px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 4px;
    }
    .header .contact {
      font-size: 14px;
    }
    .title {
      text-align: center;
      font-size: 16px;
      font-weight: 700;
      text-transform: uppercase;
      margin: 20px 0 16px;
      letter-spacing: 0.5px;
    }
    .info p {
      margin: 4px 0;
      font-size: 15px;
    }
    .info .total {
      font-weight: 700;
      margin-top: 8px;
    }
    .amount-words {
      margin: 4px 0;
      font-size: 15px;
    }
    .amount-words .amount-num {
      font-weight: 700;
    }
    .note-block {
      margin: 12px 0;
      font-size: 15px;
      font-style: italic;
    }
    .bank-info {
      margin: 8px 0;
      font-size: 15px;
    }
    .signature-line {
      margin-top: 28px;
      text-align: right;
      font-size: 15px;
      padding-right: 12px;
    }
    .signature {
      margin-top: 48px;
      text-align: center;
      font-size: 15px;
      font-weight: 600;
    }
    .underline {
      display: inline-block;
      min-width: 48px;
      border-bottom: 1px solid #000;
    }
    @media print {
      body { padding: 20px 28px; }
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>${escapeHtml(data.schoolName)}</h1>
    <p class="contact">
      ${address ? `ĐC : ${escapeHtml(address)}` : ''}${address && phone ? ' / ' : ''}${phone ? escapeHtml(phone) : ''}
    </p>
  </div>

  <div class="title">
    Thông báo học phí tháng ${data.month ?? '—'} năm ${receiptYear} (Số phiếu ${escapeHtml(receiptCode)})
  </div>

  <div class="info">
    <p><strong>Học sinh :</strong> ${escapeHtml(data.studentName)}</p>
    <p><strong>Lớp :</strong> ${escapeHtml(data.className)}</p>
    <p><strong>Học phí tháng này :</strong> ${fmtVnd(data.baseAmount)}đ</p>
    <p><strong>Khấu trừ tháng trước :</strong> -${fmtVnd(data.deductionAmount)}đ</p>
    <p class="total"><strong>Tổng cộng :</strong> ${fmtVnd(totalAmount)}đ</p>
    <p class="amount-words">
      <strong>Số tiền cần nộp :</strong>
      <span class="amount-num">${fmtVnd(totalAmount)} đ</span>
      (${amountText}).
    </p>
  </div>

  ${note ? `<div class="note-block">${escapeHtml(note)}</div>` : ''}

  ${bankAccount && bankName && accountHolder ? `
  <div class="bank-info">
    <strong>Số tk :</strong> ${escapeHtml(bankAccount)} ngân hàng ${escapeHtml(bankName)} chủ tài khoản ${escapeHtml(accountHolder)}
  </div>
  ` : ''}

  <div class="signature-line">
    ${address ? `${escapeHtml(address)}, ` : ''}ngày<span class="underline">&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</span>tháng<span class="underline">&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</span>năm ${issueDate.getFullYear()}
  </div>

  <div class="signature">Người thu</div>

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
