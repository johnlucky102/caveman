import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Receipt, Wallet, ArrowLeft, Printer } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import Button from '@/components/common/Button';

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
  meal_deduction_vnd: number;
  tuition_deduction_vnd: number;
  deduction_note: string;
  due_date: string;
  payment_method: string;
  paid_amount_vnd: number;
}

export default function BulkPrintFees() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const ids = searchParams.get('ids')?.split(',') || [];
  const [data, setData] = useState<FeeReceiptData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      if (ids.length === 0) {
        setLoading(false);
        return;
      }

      const { data: records, error } = await supabase
        .from('fee_records')
        .select(`
          *,
          students (
            full_name,
            parent_name,
            classes (name)
          )
        `)
        .in('id', ids);

      if (error) {
        console.error(error);
        setLoading(false);
        return;
      }

      const mapped: FeeReceiptData[] = (records || []).map(r => ({
        id: r.id,
        student_name: r.students?.full_name,
        class_name: r.students?.classes?.name,
        parent_name: r.students?.parent_name,
        title: r.title,
        month: r.month,
        school_year: r.school_year,
        amount_vnd: r.amount_vnd,
        base_amount_vnd: r.base_amount_vnd || r.amount_vnd,
        meal_deduction_vnd: r.meal_deduction_vnd || 0,
        tuition_deduction_vnd: r.tuition_deduction_vnd || 0,
        deduction_note: r.deduction_note,
        due_date: r.due_date,
        payment_method: r.payment_method,
        paid_amount_vnd: r.paid_amount_vnd,
      }));

      setData(mapped);
      setLoading(false);
    };

    void load();
  }, [ids]);

  const formatCurrency = (amount: number) => 
    new Intl.NumberFormat('vi-VN').format(amount) + ' đ';

  if (loading) return <div className="p-10 text-center">Đang chuẩn bị dữ liệu in...</div>;
  if (data.length === 0) return <div className="p-10 text-center text-red-500">Không tìm thấy dữ liệu để in.</div>;

  return (
    <div className="min-h-screen bg-gray-100 p-8 print:p-0 print:bg-white">
      {/* Controls */}
      <div className="max-w-[800px] mx-auto mb-8 flex justify-between items-center print:hidden">
        <Button variant="ghost" leftIcon={<ArrowLeft className="w-4 h-4" />} onClick={() => navigate(-1)}>Quay lại</Button>
        <div className="flex items-center gap-4">
          <p className="text-sm text-muted-foreground font-medium">Đã chọn {data.length} biên lai</p>
          <Button leftIcon={<Printer className="w-4 h-4" />} onClick={() => window.print()}>In tất cả</Button>
        </div>
      </div>

      {/* Receipts */}
      <div className="space-y-10 print:space-y-0">
        {data.map((item, index) => (
          <div key={item.id} className={`max-w-[800px] mx-auto bg-white border-[3px] border-black p-10 relative print:shadow-none shadow-xl ${index > 0 ? 'print:break-before-page' : ''}`}>
            {/* Header */}
            <div className="flex justify-between items-start border-b-[3px] border-black pb-8 mb-8">
              <div className="flex gap-6">
                <div className="w-16 h-16 bg-primary flex items-center justify-center rounded-2xl shrink-0">
                  <Receipt className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-black uppercase">Trường Mầm Non KidGarden</h2>
                  <p className="text-xs text-gray-500 mt-1">123 Đường Láng, Đống Đa, Hà Nội | 0123 456 789</p>
                </div>
              </div>
              <div className="text-right">
                <h1 className="text-2xl font-black text-primary uppercase">Biên Lai Thu Tiền</h1>
                <p className="text-xs font-mono mt-1 bg-gray-100 inline-block px-2 py-0.5 rounded">#{item.id.slice(0, 8).toUpperCase()}</p>
              </div>
            </div>

            {/* Info */}
            <div className="grid grid-cols-2 gap-8 mb-8 text-sm">
              <div className="space-y-2">
                <div className="flex justify-between border-b border-gray-100 pb-1">
                  <span className="font-bold">Học sinh:</span>
                  <span className="font-black uppercase">{item.student_name}</span>
                </div>
                <div className="flex justify-between border-b border-gray-100 pb-1">
                  <span className="font-bold">Lớp:</span>
                  <span>{item.class_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-bold">Phụ huynh:</span>
                  <span>{item.parent_name || '—'}</span>
                </div>
              </div>
              <div className="space-y-2 text-right">
                <div className="flex justify-between border-b border-gray-100 pb-1">
                  <span className="font-bold">Kỳ thu:</span>
                  <span className="font-bold">Tháng {item.month} / {item.school_year}</span>
                </div>
                <div className="flex justify-between border-b border-gray-100 pb-1">
                  <span className="font-bold">Ngày in:</span>
                  <span>{new Date().toLocaleDateString('vi-VN')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-bold">Trạng thái:</span>
                  <span className="font-bold uppercase underline">
                    {item.paid_amount_vnd >= item.amount_vnd ? 'Đã thanh toán' : item.payment_method ? 'Một phần' : 'Chưa đóng'}
                  </span>
                </div>
              </div>
            </div>

            {/* Table */}
            <table className="w-full border-collapse mb-8">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border border-black px-4 py-2 text-left text-xs uppercase">Khoản thu</th>
                  <th className="border border-black px-4 py-2 text-right w-40 text-xs uppercase">Số tiền</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                <tr>
                  <td className="border border-black px-4 py-3 font-bold">{item.title || 'Học phí'}</td>
                  <td className="border border-black px-4 py-3 text-right font-bold">{formatCurrency(item.base_amount_vnd)}</td>
                </tr>
                {item.meal_deduction_vnd > 0 && (
                  <tr className="text-red-600 italic">
                    <td className="border border-black px-4 py-2">- Khấu trừ tiền cơm (Vắng)</td>
                    <td className="border border-black px-4 py-2 text-right">-{formatCurrency(item.meal_deduction_vnd)}</td>
                  </tr>
                )}
                {item.tuition_deduction_vnd > 0 && (
                  <tr className="text-red-600 italic">
                    <td className="border border-black px-4 py-2">- Khấu trừ học phí ({item.deduction_note || 'Khác'})</td>
                    <td className="border border-black px-4 py-2 text-right">-{formatCurrency(item.tuition_deduction_vnd)}</td>
                  </tr>
                )}
                <tr className="bg-gray-50">
                  <td className="border-2 border-black px-4 py-4 text-right font-black uppercase">Tổng cộng thực thu</td>
                  <td className="border-2 border-black px-4 py-4 text-right text-xl font-black text-primary">{formatCurrency(item.amount_vnd)}</td>
                </tr>
              </tbody>
            </table>

            {/* Footer */}
            <div className="grid grid-cols-3 gap-6 items-start">
              <div className="col-span-1 border border-dashed border-gray-300 p-3 rounded-lg bg-gray-50/50 flex flex-col items-center">
                <div className="w-20 h-20 bg-white border border-gray-100 rounded-md mb-2 flex items-center justify-center opacity-50">
                  <Wallet className="w-6 h-6 text-gray-300" />
                </div>
                <p className="text-[8px] text-center font-bold text-gray-400 uppercase">VietQR Payment</p>
              </div>
              <div className="col-span-2 flex justify-between pt-2">
                <div className="text-center flex-1">
                  <p className="font-bold uppercase text-[10px] mb-12">Người nộp</p>
                </div>
                <div className="text-center flex-1">
                  <p className="text-[10px] italic mb-1">Hà Nội, {new Date().toLocaleDateString('vi-VN')}</p>
                  <p className="font-bold uppercase text-[10px] mb-12">Người lập phiếu</p>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
