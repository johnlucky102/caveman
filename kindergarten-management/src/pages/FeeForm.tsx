import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Printer, Receipt, Save, Trash2 } from 'lucide-react';
import Card from '@/components/common/Card';
import Button from '@/components/common/Button';
import Input from '@/components/common/Input';
import Select from '@/components/common/Select';
import { useToast } from '@/components/common/Toast';
import { listStudents } from '@/services/studentsService';
import { createFeeRecord, getFeeById, updateFeeRecord, deleteFeeRecord, syncFeeWithAttendance } from '@/services/feesService';
import { ConfirmModal } from '@/components/common/Modal';
import { RefreshCw } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import type { SelectOption } from '@/types';
import type { CreateFeeInput, FeeRecordP2, FeeStatusValue, StudentRecord } from '@/types/domain';

interface FeeFormState {
  studentId: string;
  title: string;
  amount: string;
  month: string;
  schoolYear: string;
  paidAmount: string;
  paymentMethod: '' | 'cash' | 'bank_transfer';
  dueDate: string;
  paidDate: string;
  baseAmount: string;
  mealDeduction: string;
  tuitionDeduction: string;
  deductionNote: string;
}

interface FormErrors {
  studentId?: string;
  title?: string;
  amount?: string;
  month?: string;
  schoolYear?: string;
  paidAmount?: string;
  dueDate?: string;
}

const currentYear = new Date().getFullYear();
const currentMonth = new Date().getMonth() + 1;

const monthOptions: SelectOption[] = Array.from({ length: 12 }, (_, i) => ({
  value: String(i + 1),
  label: `Tháng ${i + 1}`,
}));

const paymentOptions: SelectOption[] = [
  { value: '', label: 'Chưa thanh toán' },
  { value: 'cash', label: 'Tiền mặt' },
  { value: 'bank_transfer', label: 'Chuyển khoản' },
];

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('vi-VN').format(value) + ' đ';
}

export default function FeeForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { user } = useAuthStore();
  const isEdit = Boolean(id);
  const [students, setStudents] = useState<StudentRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [formData, setFormData] = useState<FeeFormState>({
    studentId: '',
    title: '',
    amount: '',
    month: String(currentMonth),
    schoolYear: `${currentYear}-${currentYear + 1}`,
    paidAmount: '0',
    paymentMethod: '',
    dueDate: new Date().toISOString().split('T')[0],
    paidDate: '',
    baseAmount: '',
    mealDeduction: '0',
    tuitionDeduction: '0',
    deductionNote: '',
  });

  useEffect(() => {
    const loadOptions = async () => {
      setLoading(true);
      const studentsResult = await listStudents({ page: 1, pageSize: 500, sortBy: 'full_name', sortDirection: 'asc' });
      
      if (studentsResult.error) toast.error('Không tải được học sinh', studentsResult.error.message);
      setStudents(studentsResult.data.items);

      if (id) {
        const feeResult = await getFeeById(id);
        if (feeResult.error) {
          toast.error('Lỗi', feeResult.error.message);
          navigate('/fees');
        } else if (feeResult.item) {
          const item = feeResult.item;
          setFormData({
            studentId: item.student_id,
            title: item.title || '',
            amount: String(item.amount_vnd),
            month: String(item.month || 1),
            schoolYear: item.school_year,
            paidAmount: String(item.paid_amount_vnd),
            paymentMethod: item.payment_method || '',
            dueDate: item.due_date || '',
            paidDate: item.paid_date || '',
            baseAmount: String(item.base_amount_vnd || item.amount_vnd),
            mealDeduction: String(item.meal_deduction_vnd || 0),
            tuitionDeduction: String(item.tuition_deduction_vnd || 0),
            deductionNote: item.deduction_note || '',
          });
        }
      }
      setLoading(false);
    };
    void loadOptions();
  }, [id, navigate, toast]);

  const studentOptions: SelectOption[] = useMemo(
    () => students.map((student) => ({ value: student.id, label: `${student.full_name} (${student.class_name})` })),
    [students]
  );

  const selectedStudent = useMemo(() => students.find((student) => student.id === formData.studentId), [formData.studentId, students]);

  const updateField = (field: keyof FeeFormState, value: string) => {
    setFormData((prev) => {
      const next = { ...prev, [field]: value };
      // If payment method is "Chưa thanh toán", reset paidAmount to 0
      // Sync baseAmount with amount for new records if they match or baseAmount is empty
      if (field === 'amount' && !isEdit) {
        if (!prev.baseAmount || prev.baseAmount === prev.amount) {
          next.baseAmount = value;
        }
      }
      return next;
    });
    if (errors[field as keyof FormErrors]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };


  const validate = (): boolean => {
    const nextErrors: FormErrors = {};
    if (Number(formData.paidAmount || '0') > Number(formData.amount || '0')) nextErrors.paidAmount = 'Số tiền đã thu không được vượt quá số tiền phải thu';
    if (!formData.studentId) nextErrors.studentId = 'Vui lòng chọn học sinh';
    if (!formData.amount || Number(formData.amount) <= 0) nextErrors.amount = 'Số tiền không hợp lệ';
    if (!formData.month) nextErrors.month = 'Vui lòng chọn tháng';
    if (!formData.schoolYear.trim()) nextErrors.schoolYear = 'Vui lòng nhập năm học';
    if (!formData.dueDate) nextErrors.dueDate = 'Vui lòng nhập hạn nộp';

    // Hạn nộp >= Tháng
    if (formData.dueDate) {
      const [startYear] = formData.schoolYear.split('-').map(Number);
      const selectedMonth = Number(formData.month);
      const due = new Date(formData.dueDate);
      const monthStart = new Date(startYear || new Date().getFullYear(), selectedMonth - 1, 1);
      if (due < monthStart) {
        nextErrors.dueDate = 'Hạn nộp không được trước tháng thu phí';
      }
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const submit = async () => {
    if (!validate()) return;
    if (!selectedStudent) {
      toast.error('Dữ liệu học sinh không hợp lệ');
      return;
    }

    const amount = Number(formData.amount);
    const paidAmount = Number(formData.paidAmount || '0');
    const status: FeeStatusValue = paidAmount <= 0 ? 'unpaid' : paidAmount >= amount ? 'paid' : 'partial';

    const payload: CreateFeeInput = {
      student_id: formData.studentId,
      class_id: selectedStudent.class_id,
      title: formData.title || 'Học phí',
      school_year: formData.schoolYear.trim(),
      month: Number(formData.month),
      amount_vnd: amount,
      paid_amount_vnd: paidAmount,
      paid_date: paidAmount > 0 ? (formData.paidDate || new Date().toISOString().split('T')[0]) : null,
      due_date: formData.dueDate || null,
      payment_method: formData.paymentMethod || null,
      status,
      base_amount_vnd: Number(formData.baseAmount || formData.amount),
      meal_deduction_vnd: Number(formData.mealDeduction),
      tuition_deduction_vnd: Number(formData.tuitionDeduction),
      deduction_note: formData.deductionNote,
    };

    setSaving(true);
    const result = isEdit 
      ? await updateFeeRecord(id!, payload) 
      : await createFeeRecord(payload);
    setSaving(false);

    if (result.error) {
      toast.error(isEdit ? 'Cập nhật học phí thất bại' : 'Tạo bản ghi học phí thất bại', result.error.message);
      return;
    }

    toast.success(isEdit ? 'Cập nhật học phí thành công' : 'Tạo bản ghi học phí thành công');
    navigate('/fees');
  };

  const handleDelete = async () => {
    if (!id) return;
    setDeleting(true);
    const result = await deleteFeeRecord(id);
    setDeleting(false);
    if (result.error) {
      toast.error('Xóa học phí thất bại', result.error.message);
      return;
    }
    toast.success('Đã xóa bản ghi học phí');
    navigate('/fees');
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" leftIcon={<ArrowLeft className="w-4 h-4" />} onClick={() => navigate('/fees')} className="text-muted-foreground">
            Quay lại
          </Button>
          <div>
            <h1 className="text-xl font-bold text-foreground">{isEdit ? 'Chỉnh sửa học phí' : 'Tạo bản ghi phí'}</h1>
            <p className="text-sm text-muted-foreground">{isEdit ? 'Cập nhật thông tin học phí' : 'Ghi nhận học phí theo tháng'}</p>
          </div>
        </div>
        {isEdit && (
          <>
            <Button 
              variant="outline" 
              size="sm" 
              leftIcon={<RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />}
              disabled={loading}
              onClick={async () => {
                setLoading(true);
                const res = await syncFeeWithAttendance(id!);
                setLoading(false);
                if (res.error) toast.error('Lỗi', res.error.message);
                else if (res.item) {
                  const item = res.item;
                  setFormData(prev => ({
                    ...prev,
                    amount: String(item.amount_vnd),
                    baseAmount: String(item.base_amount_vnd),
                    mealDeduction: String(item.meal_deduction_vnd),
                    tuitionDeduction: String(item.tuition_deduction_vnd),
                    deductionNote: item.deduction_note || ''
                  }));
                  toast.success('Đã cập nhật khấu trừ từ chuyên cần');
                }
              }}
            >
              Đồng bộ chuyên cần
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              leftIcon={<Printer className="w-4 h-4" />}
              onClick={handlePrint}
            >
              In biên lai
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              className="text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/20"
              leftIcon={<Trash2 className="w-4 h-4" />}
              onClick={() => setShowDeleteConfirm(true)}
            >
              Xóa
            </Button>
          </>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2">
          <Card header={<div className="text-base font-semibold text-foreground">Thông tin học phí</div>}>
            <div className="space-y-5">
              <Select
                label="Học sinh"
                options={studentOptions}
                value={formData.studentId}
                onChange={(value) => updateField('studentId', value)}
                required
                error={errors.studentId}
                placeholder="Chọn học sinh"
              />

              <Input
                label="Tên khoản thu"
                value={formData.title}
                onChange={(event) => updateField('title', event.target.value)}
                placeholder="VD: Học phí tháng 10"
              />

              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Học phí gốc"
                  type="number"
                  value={formData.baseAmount || formData.amount}
                  onChange={(event) => updateField('baseAmount', event.target.value)}
                  required
                />
                <Input
                  label="Số tiền phải thu (Sau khấu trừ)"
                  type="number"
                  value={formData.amount}
                  onChange={(event) => updateField('amount', event.target.value)}
                  required
                  error={errors.amount}
                  hint="Sẽ tự động cập nhật khi Đồng bộ chuyên cần"
                />
              </div>

              {(Number(formData.mealDeduction) > 0 || Number(formData.tuitionDeduction) > 0) && (
                <div className="p-4 bg-amber-500/5 border border-amber-500/20 rounded-xl space-y-3">
                  <p className="text-xs font-bold text-amber-600 uppercase tracking-wider">Chi tiết khấu trừ</p>
                  <div className="grid grid-cols-2 gap-4">
                    <Input
                      label="Trừ tiền cơm"
                      type="number"
                      value={formData.mealDeduction}
                      onChange={(event) => updateField('mealDeduction', event.target.value)}
                    />
                    <Input
                      label="Khấu trừ học phí (Viện/Nghỉ)"
                      type="number"
                      value={formData.tuitionDeduction}
                      onChange={(event) => updateField('tuitionDeduction', event.target.value)}
                    />
                  </div>
                  <Input
                    label="Ghi chú khấu trừ"
                    value={formData.deductionNote}
                    onChange={(event) => updateField('deductionNote', event.target.value)}
                    placeholder="VD: Trừ 5 ngày cơm..."
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <Select label="Tháng" options={monthOptions} value={formData.month} onChange={(value) => updateField('month', value)} required error={errors.month} />
                <Input
                  label="Năm học"
                  value={formData.schoolYear}
                  onChange={(event) => updateField('schoolYear', event.target.value)}
                  required
                  error={errors.schoolYear}
                  placeholder="VD: 2025-2026"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Đã thu"
                  type="number"
                  value={formData.paidAmount}
                  onChange={(event) => updateField('paidAmount', event.target.value)}
                  error={errors.paidAmount}
                  disabled={formData.paymentMethod === ''}
                  hint={formData.paymentMethod === '' ? 'Chọn phương thức để nhập số tiền' : 'Nhập số tiền đã thu'}
                />
                <Select label="Phương thức" options={paymentOptions} value={formData.paymentMethod} onChange={(value) => updateField('paymentMethod', value)} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Hạn nộp"
                  type="date"
                  value={formData.dueDate}
                  onChange={(event) => updateField('dueDate', event.target.value)}
                  required
                  error={errors.dueDate}
                />
                <Input label="Ngày thu" type="date" value={formData.paidDate} onChange={(event) => updateField('paidDate', event.target.value)} />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 mt-6 pt-5 border-t border-border">
              <Button variant="outline" onClick={() => navigate('/fees')}>
                Hủy
              </Button>
              <Button leftIcon={<Save className="w-4 h-4" />} onClick={submit} loading={saving || loading}>
                {isEdit ? 'Lưu thay đổi' : 'Lưu bản ghi'}
              </Button>
            </div>
          </Card>
        </div>

        <div className="lg:col-span-1">
          <Card header={<div className="text-base font-semibold text-foreground">Tóm tắt</div>}>
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <Receipt className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Số tiền phải thu</p>
                  <p className="text-lg font-bold text-foreground">{formData.amount ? formatCurrency(Number(formData.amount)) : '—'}</p>
                </div>
              </div>
              <div className="pt-4 border-t border-border space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Học sinh</span>
                  <span className="text-foreground font-medium">{selectedStudent?.full_name || '—'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tên khoản thu</span>
                  <span className="text-foreground font-medium">{formData.title || 'Học phí'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Đã thu</span>
                  <span className="text-foreground font-medium">{formatCurrency(Number(formData.paidAmount || '0'))}</span>
                </div>
                {Number(formData.mealDeduction) + Number(formData.tuitionDeduction) > 0 && (
                  <div className="flex justify-between text-red-500">
                    <span className="font-medium text-xs italic">Tổng khấu trừ</span>
                    <span className="font-medium text-xs italic">-{formatCurrency(Number(formData.mealDeduction) + Number(formData.tuitionDeduction))}</span>
                  </div>
                )}
              </div>
            </div>
          </Card>
        </div>
      </div>
      
      <ConfirmModal
        open={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleDelete}
        title="Xóa học phí"
        message="Bạn có chắc chắn muốn xóa bản ghi học phí này? Hành động này không thể hoàn tác."
        confirmLabel="Xóa"
        loading={deleting}
      />

      {/* Hidden Invoice for Printing */}
      <div className="hidden print:block fixed inset-0 bg-white z-[9999] p-10 text-black overflow-y-auto">
        <div className="max-w-[800px] mx-auto border-2 border-black p-8">
          <div className="flex justify-between items-start border-b-2 border-black pb-6 mb-6">
            <div className="flex gap-4">
              <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center border-2 border-primary/20 shrink-0">
                <Receipt className="w-8 h-8 text-primary" />
              </div>
              <div>
                <h2 className="text-xl font-bold uppercase">Trường Mầm Non KidGarden</h2>
                <p className="text-sm">Địa chỉ: 123 Đường Láng, Đống Đa, Hà Nội</p>
                <p className="text-sm">Hotline: 0123 456 789</p>
              </div>
            </div>
            <div className="text-right">
              <h1 className="text-2xl font-black text-primary uppercase">Biên Lai Thu Tiền</h1>
              <p className="text-sm font-mono mt-1">Số: #{id?.slice(0, 8).toUpperCase()}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-y-3 mb-8 text-sm">
            <div className="flex gap-2">
              <span className="font-bold w-28">Học sinh:</span>
              <span>{selectedStudent?.full_name}</span>
            </div>
            <div className="flex gap-2 text-right justify-end">
              <span className="font-bold">Ngày in:</span>
              <span>{new Date().toLocaleDateString('vi-VN')}</span>
            </div>
            <div className="flex gap-2">
              <span className="font-bold w-28">Lớp:</span>
              <span>{selectedStudent?.class_name}</span>
            </div>
            <div className="flex gap-2 text-right justify-end">
              <span className="font-bold">Kỳ thu phí:</span>
              <span>Tháng {formData.month} / {formData.schoolYear}</span>
            </div>
          </div>

          <table className="w-full border-collapse mb-8">
            <thead>
              <tr className="bg-gray-100">
                <th className="border border-black px-4 py-2 text-left">Nội dung khoản thu</th>
                <th className="border border-black px-4 py-2 text-right w-40">Số tiền</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border border-black px-4 py-3">
                  <p className="font-bold">{formData.title || 'Học phí'}</p>
                  <p className="text-xs text-gray-600 italic">Mức học phí cơ sở áp dụng cho lớp {selectedStudent?.class_name}</p>
                </td>
                <td className="border border-black px-4 py-3 text-right">
                  {formatCurrency(Number(formData.baseAmount || formData.amount))}
                </td>
              </tr>
              {Number(formData.mealDeduction) > 0 && (
                <tr>
                  <td className="border border-black px-4 py-2 italic text-sm">
                    - Khấu trừ tiền ăn (Số ngày vắng)
                  </td>
                  <td className="border border-black px-4 py-2 text-right text-red-600">
                    -{formatCurrency(Number(formData.mealDeduction))}
                  </td>
                </tr>
              )}
              {Number(formData.tuitionDeduction) > 0 && (
                <tr>
                  <td className="border border-black px-4 py-2 italic text-sm">
                    - Khấu trừ học phí ({formData.deductionNote || 'Lý do khác'})
                  </td>
                  <td className="border border-black px-4 py-2 text-right text-red-600">
                    -{formatCurrency(Number(formData.tuitionDeduction))}
                  </td>
                </tr>
              )}
              <tr className="bg-primary/5 font-black text-xl">
                <td className="border-2 border-black px-4 py-5 text-right uppercase tracking-wider">
                  Tổng cộng phải nộp
                </td>
                <td className="border-2 border-black px-4 py-5 text-right text-primary">
                  {formatCurrency(Number(formData.amount))}
                </td>
              </tr>
            </tbody>
          </table>

          <div className="flex justify-between items-start gap-10">
            <div className="flex-1 italic text-xs">
              <p className="font-bold mb-1">Ghi chú:</p>
              <p>- Quý phụ huynh vui lòng thanh toán trước ngày {formData.dueDate ? new Date(formData.dueDate).toLocaleDateString('vi-VN') : '—'}.</p>
              <p>- Mọi thắc mắc vui lòng liên hệ văn phòng trường.</p>
              <p>- Trạng thái: <span className="font-bold uppercase underline">
                {formData.paymentMethod ? 'Đã thanh toán' : 'Chưa thanh toán'}
              </span></p>
            </div>
            <div className="flex flex-col items-center gap-20">
              <div className="text-center">
                <p className="text-sm italic">Hà Nội, ngày .... tháng .... năm 20...</p>
                <p className="font-bold uppercase mt-1">Người lập phiếu</p>
              </div>
              <p className="font-bold uppercase">{user?.user_metadata?.full_name || 'Hệ thống'}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
