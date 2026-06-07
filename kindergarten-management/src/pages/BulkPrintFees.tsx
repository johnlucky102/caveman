import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Printer, AlertTriangle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { getSchoolSettings } from '@/services/settingsService';
import Button from '@/components/common/Button';
import type { SchoolSettings } from '@/types/domain';
import type {
  FeeDeductionDetail,
  OtherDeductionDetail,
  AdditionalChargeDetail,
} from '../types/domain';
import { parseJsonArray, numberToVietnamese } from '@/utils/bulkPrintUtils';

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
  other_deduction_vnd: number;
  deduction_details: Array<{
    id: string;
    name: string;
    amount: number;
    absent_days?: number;
    subtotal?: number;
    note?: string | null;
  }>;
  deduction_note: string | null;
  due_date: string | null;
  paid_date: string | null;
  payment_method: string | null;
  paid_amount_vnd: number;
  status: 'unpaid' | 'partial' | 'paid';
  additional_charge_vnd: number;
  other_deduction_details: OtherDeductionDetail[];
  additional_charge_details: AdditionalChargeDetail[];
}

const parseAdditionalChargeDetails = (
  value: string | null
): AdditionalChargeDetail[] => parseJsonArray<AdditionalChargeDetail>(value);

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('vi-VN').format(amount) + 'đ';

const printYear = new Date().getFullYear();

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
            attendance_deduction_vnd, other_deduction_vnd, other_deduction_details,
            additional_charge_vnd, additional_charge_note,
            deduction_details, deduction_note,
            due_date, paid_date, payment_method, paid_amount_vnd, status,
            students ( full_name, parent_info, classes ( name, users ( full_name ) ) )`)
          .in('id', ids)
          .eq('del_yn', false)
          .order('created_at', { ascending: true }),
      ]);

      if (settingsRes.settings) setSchool(settingsRes.settings);

      if (!recordsRes.error && recordsRes.data) {
        setData(recordsRes.data.map((row: any) => ({
          id: row.id,
          student_name: row.students?.full_name || '—',
          class_name: row.students?.classes?.name || '—',
          parent_name: (row.students?.parent_info as any)?.name || '',
          title: row.title || 'Học phí',
          month: row.month,
          school_year: row.school_year,
          amount_vnd: row.amount_vnd || 0,
          base_amount_vnd: row.base_amount_vnd || 0,
          attendance_deduction_vnd: row.attendance_deduction_vnd || 0,
          other_deduction_vnd: row.other_deduction_vnd || 0,
          additional_charge_vnd: row.additional_charge_vnd || 0,
          deduction_details: parseJsonArray(row.deduction_details),
          other_deduction_details: parseJsonArray(row.other_deduction_details),
          additional_charge_details: parseAdditionalChargeDetails(row.additional_charge_note),
          deduction_note: row.deduction_note,
          due_date: row.due_date,
          paid_date: row.paid_date,
          payment_method: row.payment_method,
          paid_amount_vnd: row.paid_amount_vnd || 0,
          status: row.status || 'unpaid',
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
            color: black !important;
            margin: 0 !important; 
            padding: 0 !important; 
            font-family: 'Times New Roman', Times, serif; 
          }
          .receipt-page, .receipt-page * {
            color: black !important;
            background: white !important;
            -webkit-print-color-adjust: exact;
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
        .receipt-page, .receipt-page * {
          color: black;
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
            const attendanceDeduction = item.attendance_deduction_vnd || 0;
            const hasDeductionDetails = item.deduction_details.some(d => (d.subtotal ?? 0) > 0);
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

                  {attendanceDeduction > 0 && (
                    <>
                      <p><strong>Khấu trừ tháng trước :</strong> -{formatCurrency(attendanceDeduction)}</p>
                      {hasDeductionDetails && (
                        <div className="pl-4 text-xs space-y-0.5 text-gray-600 italic">
                          {item.deduction_details
                            .filter(d => (d.subtotal ?? 0) > 0)
                            .map(d => (
                              <p key={d.id}>
                                – {d.name}: {d.absent_days ?? 0} ngày × {new Intl.NumberFormat('vi-VN').format(d.amount)}đ = -{new Intl.NumberFormat('vi-VN').format(d.subtotal ?? 0)}đ
                                {d.note ? ` (${d.note})` : ''}
                              </p>
                            ))}
                        </div>
                      )}
                    </>
                  )}

                  {item.other_deduction_vnd > 0 && (
                    <>
                      <p><strong>Khấu trừ khác :</strong> -{formatCurrency(item.other_deduction_vnd)}</p>
                      {item.other_deduction_details.length > 0 && (
                        <div className="pl-4 text-xs space-y-0.5 text-gray-600 italic">
                          {item.other_deduction_details.map((detail) => (
                            <p key={detail.id}>– {detail.name}: -{formatCurrency(detail.amount)}</p>
                          ))}
                        </div>
                      )}
                    </>
                  )}

                  {item.deduction_note && attendanceDeduction > 0 && !hasDeductionDetails && (
                    <p className="pl-4 text-xs italic text-gray-500">{item.deduction_note}</p>
                  )}

                  {item.additional_charge_vnd > 0 && (
                    <>
                      <p><strong>Phụ thu :</strong> +{formatCurrency(item.additional_charge_vnd)}</p>
                      {item.additional_charge_details.length > 0 && (
                        <div className="pl-4 text-xs space-y-0.5 text-gray-600 italic">
                          {item.additional_charge_details.map((detail) => (
                            <p key={detail.id}>– {detail.name}: +{formatCurrency(detail.amount)}</p>
                          ))}
                        </div>
                      )}
                    </>
                  )}

                  <p><strong>Tổng cộng :</strong> {formatCurrency(item.amount_vnd)}</p>
                  <p><strong>Đã thanh toán :</strong> {formatCurrency(item.paid_amount_vnd)}</p>
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
