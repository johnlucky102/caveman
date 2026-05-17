import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Printer, AlertTriangle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { getSchoolSettings } from '@/services/settingsService';
import Button from '@/components/common/Button';
import type { SchoolSettings } from '@/types/domain';

interface FeeReceiptData {
  id: string;
  student_name: string;
  class_name: string;
  parent_name: string;
  title: string;
  month: number;
  school_year: string;
  amount_vnd: number;
  base_amount_vnd: number;
  attendance_deduction_vnd: number;
  deduction_details: any[];
  deduction_note: string | null;
  due_date: string | null;
  paid_date: string | null;
  payment_method: string | null;
  paid_amount_vnd: number;
  status: 'unpaid' | 'partial' | 'paid';
}

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('vi-VN').format(amount) + 'đ';

const printYear = new Date().getFullYear();

// ─── Chuyển số thành chữ Việt ─────────────────────────────────────────────
function numberToVietnamese(n: number): string {
  if (n === 0) return 'Không đồng';

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

// ─── Component ─────────────────────────────────────────────────────────────
export default function BulkPrintFees() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const idsParam = searchParams.get('ids') || '';
  const [data, setData] = useState<FeeReceiptData[]>([]);
  const [school, setSchool] = useState<SchoolSettings | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const ids = idsParam.split(',').filter(Boolean);
      if (ids.length === 0) { setLoading(false); return; }

      const [settingsRes, recordsRes] = await Promise.all([
        getSchoolSettings(),
        supabase
          .from('fee_records')
          .select(`id, title, month, school_year, amount_vnd, base_amount_vnd,
            attendance_deduction_vnd, deduction_details, deduction_note,
            due_date, paid_date, payment_method, paid_amount_vnd, status,
            students ( full_name, parent_info, classes ( name, users ( full_name ) ) )`)
          .in('id', ids)
          .eq('del_yn', false)
          .order('created_at', { ascending: true }),
      ]);

      if (settingsRes.settings) setSchool(settingsRes.settings);

      if (!recordsRes.error && recordsRes.data) {
        setData(recordsRes.data.map((r: any) => ({
          id: r.id,
          student_name: r.students?.full_name || '—',
          class_name: r.students?.classes?.name || '—',
          parent_name: (r.students?.parent_info as any)?.name || '',
          title: r.title || 'Học phí',
          month: r.month,
          school_year: r.school_year,
          amount_vnd: r.amount_vnd,
          base_amount_vnd: r.base_amount_vnd || r.amount_vnd,
          attendance_deduction_vnd: r.attendance_deduction_vnd || 0,
          deduction_details: Array.isArray(r.deduction_details) ? r.deduction_details : [],
          deduction_note: r.deduction_note,
          due_date: r.due_date,
          paid_date: r.paid_date,
          payment_method: r.payment_method,
          paid_amount_vnd: r.paid_amount_vnd || 0,
          status: r.status || 'unpaid',
        })));
      }

      setLoading(false);
    };
    void load();

    // Clear title during print to hide it from browser header
    const handleBeforePrint = () => { document.title = ''; };
    const handleAfterPrint = () => { document.title = 'KidGarden - Quản lý Trường Mầm Non'; };
    
    window.addEventListener('beforeprint', handleBeforePrint);
    window.addEventListener('afterprint', handleAfterPrint);
    
    return () => {
      window.removeEventListener('beforeprint', handleBeforePrint);
      window.removeEventListener('afterprint', handleAfterPrint);
    };
  }, [idsParam]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm text-gray-500 font-medium">Đang chuẩn bị dữ liệu in...</p>
        </div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center space-y-2">
          <AlertTriangle className="w-10 h-10 text-amber-500 mx-auto" />
          <p className="text-sm text-gray-500">Không tìm thấy dữ liệu để in.</p>
          <Button variant="outline" size="sm" onClick={() => navigate(-1)}>Quay lại</Button>
        </div>
      </div>
    );
  }

  const schoolName    = school?.school_name || 'Trường Mầm Non';
  const schoolAddress = school?.address || '';
  const schoolPhone   = school?.phone || '';

  return (
    <>
      {/* Print-only global styles */}
      <style>{`
        @media print {
          .no-print { display: none !important; }
          
          /* Hide everything in the body by default */
          body * {
            visibility: hidden;
          }
          
          /* Make only the receipts visible and positioned at the top left */
          .print-area, .print-area * {
            visibility: visible;
          }
          .print-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }

          html, body { 
            background: white !important; 
            margin: 0 !important; 
            padding: 0 !important; 
            font-family: 'Times New Roman', Times, serif; 
          }
          .receipt-page {
            break-inside: avoid;
            page-break-inside: avoid;
            break-after: page;
            page-break-after: always;
            border: none !important;
            box-shadow: none !important;
            padding: 10mm 15mm !important;
            margin: 0 !important;
            box-sizing: border-box;
          }
          .receipt-page:last-child { 
            break-after: auto; 
            page-break-after: auto; 
          }
          @page { 
            size: A5 landscape; 
            margin: 0 !important; /* Hides browser headers and footers */
          }
        }
        .receipt-page {
          font-family: 'Times New Roman', Times, serif;
        }
      `}</style>

      <div className="min-h-screen print:min-h-0 bg-gray-100 print:bg-white print-area">
        {/* Toolbar – hidden on print */}
        <div className="no-print sticky top-0 z-10 bg-white border-b border-gray-200 shadow-sm px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" leftIcon={<ArrowLeft className="w-4 h-4" />} onClick={() => navigate(-1)}>
              Quay lại
            </Button>
            <span className="text-sm text-gray-500">|</span>
            <span className="text-sm font-semibold text-gray-700">{data.length} phiếu thu sẵn sàng</span>
          </div>
          <Button leftIcon={<Printer className="w-4 h-4" />} onClick={() => window.print()}>
            In {data.length} phiếu
          </Button>
        </div>

        {/* Receipt pages */}
        <div className="py-8 px-4 print:p-0 space-y-8 print:space-y-0">
          {data.map((item) => {
            const deduction = item.base_amount_vnd - item.amount_vnd;
            const remaining_debt = Math.max(0, item.amount_vnd - item.paid_amount_vnd);

            return (
              <div
                key={item.id}
                className="receipt-page max-w-[600px] mx-auto bg-white shadow-md print:shadow-none border border-gray-300 print:border-0 p-8"
              >
                {/* ── Header ── */}
                <div className="text-center mb-1">
                  <p className="font-bold uppercase text-base leading-snug">{schoolName}</p>
                  {(schoolAddress || schoolPhone) && (
                    <p className="text-sm">
                      {schoolAddress && `ĐC : ${schoolAddress}`}
                      {schoolAddress && schoolPhone && ' / '}
                      {schoolPhone}
                    </p>
                  )}
                </div>

                <div className="border-b border-gray-500 my-3" />

                {/* ── Title ── */}
                <p className="text-center font-bold uppercase text-sm my-3">
                  THÔNG BÁO HỌC PHÍ THÁNG {item.month} NĂM {item.school_year}
                  {' '}(Số phiếu {item.id.slice(-4).toUpperCase()})
                </p>

                {/* ── Student info ── */}
                <div className="flex justify-between text-sm mb-2">
                  <span><strong>Học sinh :</strong>  {item.student_name}</span>
                  <span><strong>Lớp :</strong> {item.class_name}</span>
                </div>

                {/* ── Fee detail ── */}
                <div className="text-sm space-y-0.5 mb-3">
                  <p><strong>Học phí tháng này :</strong> {formatCurrency(item.base_amount_vnd)}</p>
                  {deduction > 0 && (
                    <p><strong>Khấu trừ tháng trước :</strong> -{formatCurrency(deduction)}</p>
                  )}
                  <p><strong>Tổng cộng :</strong> {formatCurrency(item.amount_vnd)}</p>
                  {item.paid_amount_vnd > 0 && (
                    <p><strong>Đã thanh toán :</strong> {formatCurrency(item.paid_amount_vnd)}</p>
                  )}
                </div>

                {/* ── Amount in words ── */}
                <p className="font-bold italic text-sm mb-3">
                  Số tiền cần nộp : {new Intl.NumberFormat('vi-VN').format(remaining_debt)} đ ({numberToVietnamese(remaining_debt)}).
                </p>

                {/* ── Payment instructions ── */}
                <p className="text-sm mb-1">
                  Phụ huynh nộp tiền học từ <u>ngày 01 tới ngày 10</u> hàng tháng bằng tiền mặt hoặc chuyển khoản
                </p>
                <p className="font-bold italic text-sm mb-3">
                  Số tk : 118122283 ngân hàng VP Bank chủ tài khoản Phạm Thị Hiền
                </p>

                {/* ── Footer ── */}
                <div className="flex justify-end text-sm mt-4">
                  <div className="text-center">
                    <p className="italic">
                      {schoolAddress ? schoolAddress.split(',')[0].trim() : schoolName},
                      {' '}ngày..........tháng..........năm {printYear}
                    </p>
                    <p className="font-bold mt-4">Người thu</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}
