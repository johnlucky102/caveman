import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Receipt, Save } from 'lucide-react';
import Card from '@/components/common/Card';
import Button from '@/components/common/Button';
import Input from '@/components/common/Input';
import Select from '@/components/common/Select';
import { useToast } from '@/components/common/Toast';
import { listStudents } from '@/services/studentsService';
import { createFeeRecord, listFeeTypes } from '@/services/feesService';
import type { SelectOption } from '@/types';
import type { CreateFeeInput, FeeStatusValue, FeeTypeRecordP2, StudentRecord } from '@/types/domain';

interface FeeFormState {
  studentId: string;
  feeTypeId: string;
  amount: string;
  month: string;
  schoolYear: string;
  paidAmount: string;
  paymentMethod: '' | 'cash' | 'bank_transfer';
  dueDate: string;
  paidDate: string;
}

interface FormErrors {
  studentId?: string;
  feeTypeId?: string;
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
  const navigate = useNavigate();
  const toast = useToast();
  const [students, setStudents] = useState<StudentRecord[]>([]);
  const [feeTypes, setFeeTypes] = useState<FeeTypeRecordP2[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [formData, setFormData] = useState<FeeFormState>({
    studentId: '',
    feeTypeId: '',
    amount: '',
    month: String(currentMonth),
    schoolYear: `${currentYear}-${currentYear + 1}`,
    paidAmount: '0',
    paymentMethod: '',
    dueDate: new Date().toISOString().split('T')[0],
    paidDate: '',
  });

  useEffect(() => {
    const loadOptions = async () => {
      setLoading(true);
      const [studentsResult, feeTypesResult] = await Promise.all([
        listStudents({ page: 1, pageSize: 500, sortBy: 'full_name', sortDirection: 'asc' }),
        listFeeTypes(),
      ]);
      setLoading(false);

      if (studentsResult.error) toast.error('Không tải được học sinh', studentsResult.error.message);
      if (feeTypesResult.error) toast.error('Không tải được loại phí', feeTypesResult.error.message);

      setStudents(studentsResult.data.items);
      setFeeTypes(feeTypesResult.items);
    };
    void loadOptions();
  }, [toast]);

  const studentOptions: SelectOption[] = useMemo(
    () => students.map((student) => ({ value: student.id, label: `${student.full_name} (${student.class_name})` })),
    [students]
  );

  const feeTypeOptions: SelectOption[] = useMemo(
    () => feeTypes.map((feeType) => ({ value: String(feeType.id), label: feeType.name })),
    [feeTypes]
  );

  const selectedStudent = useMemo(() => students.find((student) => student.id === formData.studentId), [formData.studentId, students]);
  const selectedFeeType = useMemo(() => feeTypes.find((feeType) => String(feeType.id) === formData.feeTypeId), [feeTypes, formData.feeTypeId]);

  const updateField = (field: keyof FeeFormState, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field as keyof FormErrors]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const handleFeeTypeChange = (value: string) => {
    const type = feeTypes.find((item) => String(item.id) === value);
    setFormData((prev) => ({
      ...prev,
      feeTypeId: value,
      amount: type ? String(type.amount_vnd) : prev.amount,
    }));
    if (errors.feeTypeId) setErrors((prev) => ({ ...prev, feeTypeId: undefined }));
  };

  const validate = (): boolean => {
    const nextErrors: FormErrors = {};
    if (Number(formData.paidAmount || '0') > Number(formData.amount || '0')) nextErrors.paidAmount = 'So tien da thu khong duoc vuot qua so tien phai thu';
    if (!formData.studentId) nextErrors.studentId = 'Vui lòng chọn học sinh';
    if (!formData.feeTypeId) nextErrors.feeTypeId = 'Vui lòng chọn loại phí';
    if (!formData.amount || Number(formData.amount) <= 0) nextErrors.amount = 'Số tiền không hợp lệ';
    if (!formData.month) nextErrors.month = 'Vui lòng chọn tháng';
    if (!formData.schoolYear.trim()) nextErrors.schoolYear = 'Vui lòng nhập năm học';
    if (!formData.dueDate) nextErrors.dueDate = 'Vui lòng nhập hạn nộp';
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
      fee_type_id: Number(formData.feeTypeId),
      school_year: formData.schoolYear.trim(),
      month: Number(formData.month),
      amount_vnd: amount,
      paid_amount_vnd: paidAmount,
      paid_date: paidAmount > 0 ? (formData.paidDate || new Date().toISOString().split('T')[0]) : null,
      due_date: formData.dueDate || null,
      payment_method: formData.paymentMethod || null,
      status,
    };

    setSaving(true);
    const result = await createFeeRecord(payload);
    setSaving(false);
    if (result.error) {
      toast.error('Tạo bản ghi học phí thất bại', result.error.message);
      return;
    }

    toast.success('Tạo bản ghi học phí thành công');
    navigate('/fees');
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" leftIcon={<ArrowLeft className="w-4 h-4" />} onClick={() => navigate('/fees')} className="text-[#64748B]">
            Quay lại
          </Button>
          <div>
            <h1 className="text-xl font-bold text-[#1E293B]">Tạo bản ghi phí</h1>
            <p className="text-sm text-[#64748B]">Ghi nhận học phí theo tháng</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2">
          <Card header={<div className="text-base font-semibold text-[#1E293B]">Thông tin học phí</div>}>
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

              <Select
                label="Loại phí"
                options={feeTypeOptions}
                value={formData.feeTypeId}
                onChange={handleFeeTypeChange}
                required
                error={errors.feeTypeId}
                placeholder="Chọn loại phí"
              />

              <Input
                label="Số tiền"
                type="number"
                value={formData.amount}
                onChange={(event) => updateField('amount', event.target.value)}
                required
                error={errors.amount}
                hint={selectedFeeType ? `Mức phí gợi ý: ${formatCurrency(selectedFeeType.amount_vnd)}` : undefined}
              />

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
                  hint="0 nếu chưa thu"
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

            <div className="flex items-center justify-end gap-3 mt-6 pt-5 border-t border-[#E2E8F0]">
              <Button variant="outline" onClick={() => navigate('/fees')}>
                Hủy
              </Button>
              <Button leftIcon={<Save className="w-4 h-4" />} onClick={submit} loading={saving || loading}>
                Lưu bản ghi
              </Button>
            </div>
          </Card>
        </div>

        <div className="lg:col-span-1">
          <Card header={<div className="text-base font-semibold text-[#1E293B]">Tóm tắt</div>}>
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <Receipt className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-[#64748B]">Số tiền phải thu</p>
                  <p className="text-lg font-bold text-[#1E293B]">{formData.amount ? formatCurrency(Number(formData.amount)) : '—'}</p>
                </div>
              </div>
              <div className="pt-4 border-t border-[#E2E8F0] space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-[#64748B]">Học sinh</span>
                  <span className="text-[#1E293B] font-medium">{selectedStudent?.full_name || '—'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#64748B]">Loại phí</span>
                  <span className="text-[#1E293B] font-medium">{selectedFeeType?.name || '—'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#64748B]">Đã thu</span>
                  <span className="text-[#1E293B] font-medium">{formatCurrency(Number(formData.paidAmount || '0'))}</span>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
