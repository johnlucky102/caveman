import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Printer, CheckCircle, Clock, AlertTriangle } from 'lucide-react';
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
  new Intl.NumberFormat('vi-VN').format(amount) + ' đ';

const formatDate = (dateStr: string | null) => {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

const paymentMethodLabel: Record<string, string> = {
  cash: 'Tiền mặt',
  bank_transfer: 'Chuyển khoản ngân hàng',
};

const printDate = new Date().toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });

export default function BulkPrintFees() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const ids = searchParams.get('ids')?.split(',').filter(Boolean) || [];
  const [data, setData] = useState<FeeReceiptData[]>([]);
  const [school, setSchool] = useState<SchoolSettings | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      if (ids.length === 0) { setLoading(false); return; }

      const [settingsRes, recordsRes] = await Promise.all([
        getSchoolSettings(),
        supabase
          .from('fee_records')
          .select(`id, title, month, school_year, amount_vnd, base_amount_vnd,
            attendance_deduction_vnd, deduction_details, deduction_note,
            due_date, paid_date, payment_method, paid_amount_vnd, status,
            students ( full_name, parent_name, classes ( name ) )`)
          .in('id', ids)
          .order('created_at', { ascending: true }),
      ]);

      if (settingsRes.settings) setSchool(settingsRes.settings);

      if (!recordsRes.error && recordsRes.data) {
        setData(recordsRes.data.map((r: any) => ({
          id: r.id,
          student_name: r.students?.full_name || '—',
          class_name: r.students?.classes?.name || '—',
          parent_name: r.students?.parent_name || '',
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
  }, [ids]);

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

  const schoolName = school?.school_name || 'Trường Mầm Non';
  const schoolAddress = school?.address || '';
  const schoolPhone = school?.phone || '';

  return (
    <>
      {/* Print-only global styles */}
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; margin: 0; padding: 0; }
          .receipt-page { break-after: page; page-break-after: always; }
          .receipt-page:last-child { break-after: avoid; page-break-after: avoid; }
          @page { size: A4; margin: 12mm 14mm; }
        }
      `}</style>

      <div className="min-h-screen bg-gray-100 print:bg-white">
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
            const remaining = item.amount_vnd - item.paid_amount_vnd;
            const isPaid = item.status === 'paid';
            const isPartial = item.status === 'partial';

            return (
              <div
                key={item.id}
                className="receipt-page max-w-[740px] mx-auto bg-white shadow-xl print:shadow-none border border-gray-200 print:border-0"
              >
                {/* ── Header ── */}
                <div className="border-b-4 border-double border-gray-800 px-10 pt-8 pb-6">
                  <div className="flex items-start justify-between gap-4">
                    {/* School info */}
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 rounded-xl bg-primary/10 border-2 border-primary/30 flex items-center justify-center shrink-0">
                        {school?.logo_url ? (
                          <img src={school.logo_url} alt="logo" className="w-12 h-12 object-contain rounded-lg" />
                        ) : (
                          <span className="text-2xl font-black text-primary">
                            {schoolName.charAt(0)}
                          </span>
                        )}
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">Đơn vị thu tiền</p>
                        <h2 className="text-base font-black text-gray-900 uppercase leading-tight">{schoolName}</h2>
                        {schoolAddress && <p className="text-[11px] text-gray-500 mt-0.5">{schoolAddress}</p>}
                        {schoolPhone && <p className="text-[11px] text-gray-500">ĐT: {schoolPhone}</p>}
                      </div>
                    </div>
                    {/* Receipt title */}
                    <div className="text-right shrink-0">
                      <h1 className="text-xl font-black text-primary uppercase tracking-tight">Phiếu Thu Học Phí</h1>
                      <p className="text-[11px] text-gray-400 mt-1">
                        Số: <span className="font-mono font-bold text-gray-700">#{item.id.slice(-8).toUpperCase()}</span>
                      </p>
                      <p className="text-[11px] text-gray-400 mt-0.5">Ngày in: <span className="font-semibold text-gray-700">{printDate}</span></p>
                    </div>
                  </div>
                </div>

                <div className="px-10 py-6 space-y-6">
                  {/* ── Student & Fee Period Info ── */}
                  <div className="grid grid-cols-2 gap-6">
                    {/* Left: Student info */}
                    <div className="space-y-1.5">
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Thông tin học sinh</p>
                      <div className="flex gap-2 text-sm">
                        <span className="text-gray-500 w-24 shrink-0">Họ và tên:</span>
                        <span className="font-black text-gray-900 uppercase">{item.student_name}</span>
                      </div>
                      <div className="flex gap-2 text-sm">
                        <span className="text-gray-500 w-24 shrink-0">Lớp:</span>
                        <span className="font-semibold text-gray-800">{item.class_name}</span>
                      </div>
                      <div className="flex gap-2 text-sm">
                        <span className="text-gray-500 w-24 shrink-0">Phụ huynh:</span>
                        <span className="font-semibold text-gray-800">{item.parent_name || '—'}</span>
                      </div>
                    </div>
                    {/* Right: Period info */}
                    <div className="space-y-1.5">
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Kỳ thu phí</p>
                      <div className="flex gap-2 text-sm">
                        <span className="text-gray-500 w-24 shrink-0">Tháng / Năm:</span>
                        <span className="font-bold text-gray-900">Tháng {item.month} / {item.school_year}</span>
                      </div>
                      <div className="flex gap-2 text-sm">
                        <span className="text-gray-500 w-24 shrink-0">Hạn nộp:</span>
                        <span className={`font-semibold ${item.due_date && new Date(item.due_date) < new Date() && !isPaid ? 'text-red-600' : 'text-gray-800'}`}>
                          {formatDate(item.due_date)}
                        </span>
                      </div>
                      <div className="flex gap-2 text-sm items-center">
                        <span className="text-gray-500 w-24 shrink-0">Trạng thái:</span>
                        <span className={`inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full ${
                          isPaid ? 'bg-emerald-100 text-emerald-700' :
                          isPartial ? 'bg-amber-100 text-amber-700' :
                          'bg-red-100 text-red-700'
                        }`}>
                          {isPaid ? <CheckCircle className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                          {isPaid ? 'Đã thanh toán' : isPartial ? 'Thanh toán một phần' : 'Chưa thanh toán'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* ── Fee Detail Table ── */}
                  <div>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Chi tiết khoản thu</p>
                    <table className="w-full border-collapse text-sm">
                      <thead>
                        <tr className="bg-gray-800 text-white">
                          <th className="px-4 py-2.5 text-left font-bold text-xs uppercase tracking-wide">STT</th>
                          <th className="px-4 py-2.5 text-left font-bold text-xs uppercase tracking-wide">Nội dung</th>
                          <th className="px-4 py-2.5 text-right font-bold text-xs uppercase tracking-wide w-40">Số tiền (VNĐ)</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="border-b border-gray-200">
                          <td className="px-4 py-3 text-gray-500">1</td>
                          <td className="px-4 py-3 font-semibold text-gray-800">{item.title}</td>
                          <td className="px-4 py-3 text-right font-bold text-gray-900">{formatCurrency(item.base_amount_vnd)}</td>
                        </tr>
                        {item.attendance_deduction_vnd > 0 && (
                          <tr className="border-b border-gray-200 bg-red-50">
                            <td className="px-4 py-3 text-gray-500">2</td>
                            <td className="px-4 py-3">
                              <span className="font-semibold text-red-700">(-) Khấu trừ vắng mặt</span>
                              {item.deduction_note && (
                                <p className="text-[11px] text-red-500 italic mt-0.5">{item.deduction_note}</p>
                              )}
                            </td>
                            <td className="px-4 py-3 text-right font-bold text-red-600">
                              -{formatCurrency(item.attendance_deduction_vnd)}
                            </td>
                          </tr>
                        )}
                        {/* Subtotal */}
                        <tr className="bg-gray-50 border-t-2 border-gray-800">
                          <td colSpan={2} className="px-4 py-3.5 text-right font-black text-gray-800 uppercase text-xs tracking-wide">
                            Tổng cộng phải nộp
                          </td>
                          <td className="px-4 py-3.5 text-right text-lg font-black text-primary">
                            {formatCurrency(item.amount_vnd)}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {/* ── Payment Summary ── */}
                  <div className="grid grid-cols-2 gap-6">
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-2 text-sm">
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Tình trạng thanh toán</p>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Phải nộp:</span>
                        <span className="font-bold text-gray-900">{formatCurrency(item.amount_vnd)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Đã nộp:</span>
                        <span className="font-bold text-emerald-600">{formatCurrency(item.paid_amount_vnd)}</span>
                      </div>
                      <div className="flex justify-between border-t border-gray-200 pt-2">
                        <span className="font-bold text-gray-700">Còn lại:</span>
                        <span className={`font-black text-base ${remaining > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                          {remaining > 0 ? formatCurrency(remaining) : '0 đ'}
                        </span>
                      </div>
                    </div>
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-2 text-sm">
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Phương thức thanh toán</p>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Hình thức:</span>
                        <span className="font-bold text-gray-900">
                          {item.payment_method ? paymentMethodLabel[item.payment_method] || item.payment_method : '—'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Ngày nộp:</span>
                        <span className="font-bold text-gray-900">{formatDate(item.paid_date)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Hạn cuối:</span>
                        <span className="font-bold text-gray-900">{formatDate(item.due_date)}</span>
                      </div>
                    </div>
                  </div>

                  {/* ── Signature area ── */}
                  <div className="grid grid-cols-2 gap-10 pt-2 border-t border-dashed border-gray-300 mt-2">
                    <div className="text-center">
                      <p className="text-[11px] font-bold text-gray-700 uppercase tracking-wide">Phụ huynh xác nhận</p>
                      <p className="text-[10px] text-gray-400 italic mt-0.5">(Ký và ghi rõ họ tên)</p>
                      <div className="h-14" />
                      <div className="border-b border-gray-300 mx-4" />
                    </div>
                    <div className="text-center">
                      <p className="text-[11px] font-bold text-gray-700 uppercase tracking-wide">Người lập phiếu</p>
                      <p className="text-[10px] text-gray-400 italic mt-0.5">{schoolName}, ngày {printDate}</p>
                      <div className="h-14" />
                      <div className="border-b border-gray-300 mx-4" />
                    </div>
                  </div>

                  {/* ── Note ── */}
                  <p className="text-[10px] text-gray-400 italic text-center pb-2">
                    Phiếu thu này có giá trị xác nhận thanh toán học phí. Vui lòng giữ lại để đối chiếu khi cần.
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}
