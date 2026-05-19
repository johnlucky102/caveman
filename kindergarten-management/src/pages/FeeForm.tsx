import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Info, Printer, Receipt, Save, Trash2, Wallet, RefreshCw, Lock, AlertCircle } from 'lucide-react';
import Card from '@/components/common/Card';
import Button from '@/components/common/Button';
import Input from '@/components/common/Input';
import Select from '@/components/common/Select';
import { useToast } from '@/components/common/Toast';
import { DatePicker } from '@/components/common/DatePicker';
import CurrencyInput from '@/components/common/CurrencyInput';
import { listStudents } from '@/services/studentsService';
import { listClasses } from '@/services/classesService';
import { createFeeRecord, getFeeById, updateFeeRecord, deleteFeeRecord, syncFeeWithAttendance } from '@/services/feesService';
import { listAttendanceByClassAndDate } from '@/services/attendanceService';
import { calendarYearFromSchoolMonth, getCurrentSchoolYear } from '@/utils/schoolYearCalendar';
import { ConfirmModal } from '@/components/common/Modal';
import { supabase } from '@/lib/supabase';

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
  attendanceDeduction: string;
  otherDeduction: string;
  deductionDetails: string;
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

interface DeductionDetailItem {
  id: string;
  name: string;
  amount: number;
  absent_days: number;
  subtotal: number;
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

const schoolYearOptions: SelectOption[] = [{ value: getCurrentSchoolYear(), label: getCurrentSchoolYear() }];

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('vi-VN').format(value) + ' đ';
}

export default function FeeForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { user, role } = useAuthStore();
  const isEdit = Boolean(id);
  const [students, setStudents] = useState<StudentRecord[]>([]);
  const [classes, setClasses] = useState<SelectOption[]>([{ label: 'Tất cả lớp', value: '' }]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [feeStatus, setFeeStatus] = useState<FeeStatusValue>('unpaid');
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncError, setSyncError] = useState('');
  const [classFilter, setClassFilter] = useState('');
  const [formData, setFormData] = useState<FeeFormState>(() => {
    const today = new Date().toISOString().split('T')[0];
    const lastDayOfMonth = new Date(currentYear, currentMonth, 0).toISOString().split('T')[0];
    
    return {
      studentId: '',
      title: `Học phí tháng ${new Date().getMonth() + 1}`,
      amount: '',
      month: String(new Date().getMonth() + 1),
      schoolYear: getCurrentSchoolYear(),
      paidAmount: '0',
      paymentMethod: 'cash',
      dueDate: lastDayOfMonth,
      paidDate: today,
      baseAmount: '',
      attendanceDeduction: '0',
      otherDeduction: '0',
      deductionDetails: '',
      deductionNote: '',
    };
  });

  useEffect(() => {
    const loadOptions = async () => {
      setLoading(true);
      try {
        const [studentsResult, classesResult] = await Promise.all([
          listStudents({ page: 1, pageSize: 500, sortBy: 'full_name', sortDirection: 'asc' }),
          listClasses({ page: 1, pageSize: 200 })
        ]);
        
        if (studentsResult?.error) toast.error('Không tải được học sinh', studentsResult.error.message);
        if (studentsResult?.data) setStudents(studentsResult.data.items);

        if (classesResult?.error) toast.error('Không tải được lớp học', classesResult.error.message);
        if (classesResult?.data) {
          const classItems = classesResult.data.items.map((item) => ({
            label: item.name,
            value: String(item.id),
          }));
          setClasses([{ label: 'Tất cả lớp', value: '' }, ...classItems]);
        }

        if (id) {
          const feeResult = await getFeeById(id);
          if (feeResult?.error) {
            toast.error('Lỗi', feeResult.error.message);
            navigate('/fees');
          } else if (feeResult?.item) {
            const item = feeResult.item;
            setFeeStatus(item.status);
            setClassFilter(String(item.class_id || ''));
            
            let dueDate = item.due_date || '';
            if (!dueDate && item.month && item.school_year) {
              const year = calendarYearFromSchoolMonth(item.school_year, item.month) ?? new Date().getFullYear();
              dueDate = new Date(year, item.month, 0).toISOString().split('T')[0];
            }

            setFormData({
              studentId: item.student_id,
              title: item.title || '',
              amount: String(item.amount_vnd),
              month: String(item.month || 1),
              schoolYear: item.school_year,
              paidAmount: String(item.paid_amount_vnd),
              paymentMethod: item.payment_method || '',
              dueDate: dueDate,
              paidDate: item.paid_date || '',
              baseAmount: String(item.base_amount_vnd || item.amount_vnd),
              attendanceDeduction: String(item.attendance_deduction_vnd || 0),
              otherDeduction: String(item.other_deduction_vnd || 0),
              deductionDetails: JSON.stringify(item.deduction_details || []),
              deductionNote: item.deduction_note || '',
            });
          }
        }
      } catch (error) {
      } finally {
        setLoading(false);
      }
    };
    void loadOptions();
  }, [id]);

  const studentOptions: SelectOption[] = useMemo(
    () => {
      let filtered = students;
      
      // Filter by class if class filter is selected
      if (classFilter) {
        filtered = filtered.filter((student) => String(student.class_id) === classFilter);
      }
      
      return filtered.map((student) => ({ value: student.id, label: `${student.full_name} (${student.class_name})` }));
    },
    [students, classFilter]
  );

  const selectedStudent = useMemo(() => students.find((student) => student.id === formData.studentId), [formData.studentId, students]);

  // Auto-sync finance config when student and month are selected (for new fees only)
  useEffect(() => {
    const autoSyncFinance = async () => {
      if (isEdit || !formData.studentId || !formData.month) return;

      const student = students.find((s) => s.id === formData.studentId);
      if (!student || !student.class_id) return;

      setIsSyncing(true);
      setSyncError('');
      try {
        // Query finance config directly by class_id (unique key) — avoids maybeSingle error
        // when multiple classes share the same class_type
        const { data: configData, error: configError } = await supabase
          .from('class_finance_configs')
          .select('deduction_rules, class_type')
          .eq('class_id', student.class_id)
          .eq('del_yn', false)
          .maybeSingle();

        if (configError) {
          console.error('Failed to fetch finance config by class_id:', configError);
          setSyncError('Lỗi tải cấu hình tài chính.');
          return;
        }
        if (!configData) {
          console.error('No finance config found for class_id:', student.class_id);
          setSyncError('Chưa có cấu hình tài chính cho lớp này. Vui lòng thiết lập tài chính trước.');
          return;
        }

        // Set base amount if not already entered
        if (!formData.baseAmount || formData.baseAmount === '0') {
          const defaultAmount = configData.class_type === 'Evening' ? 1500000 : 2000000;
          setFormData((prev) => ({
            ...prev,
            baseAmount: String(defaultAmount),
          }));
        }

        const rules = (configData.deduction_rules || []) as any[];

        // Fetch attendance for the PREVIOUS month (same logic as syncFeeWithAttendance)
        const month = Number(formData.month);
        const calYear = calendarYearFromSchoolMonth(formData.schoolYear, month) ?? new Date().getFullYear();
        const pm = month === 1 ? 12 : month - 1;
        const py = month === 1 ? calYear - 1 : calYear;
        const startDate = `${py}-${String(pm).padStart(2, '0')}-01`;
        const endDateObj = new Date(py, pm, 0);
        const endDate = `${endDateObj.getFullYear()}-${String(endDateObj.getMonth() + 1).padStart(2, '0')}-${String(endDateObj.getDate()).padStart(2, '0')}`;

        const attendanceQuery: any = supabase
          .from('attendance')
          .select('status')
          .eq('student_id', formData.studentId)
          .eq('class_id', student.class_id)
          .gte('attendance_date', startDate)
          .lte('attendance_date', endDate)
          .eq('del_yn', false);
        const { data: attendanceData, error: attendanceError } = await attendanceQuery;

        if (attendanceError) {
          console.error('Failed to fetch attendance:', attendanceError);
          setSyncError('Lỗi tải dữ liệu điểm danh.');
          return;
        }

        // Calculate deduction — sum ALL rules (same as syncFeeWithAttendance)
        const absentDays = (attendanceData || []).filter((a: any) => a.status === 'absent').length;
        const ruleTotal = rules.reduce((sum: number, r: any) => sum + r.amount, 0);
        const totalDeduction = absentDays * ruleTotal;
        const ruleNames = rules.map((r: any) => `${r.name} ${r.amount.toLocaleString('vi-VN')}đ`).join(' + ');
        const note = absentDays > 0
          ? `Khấu trừ ${absentDays} ngày vắng tháng trước x (${ruleNames}) = ${totalDeduction.toLocaleString('vi-VN')}đ`
          : 'Đã đồng bộ chuyên cần (không có ngày vắng tháng trước)';

        setFormData((prev) => ({
          ...prev,
          attendanceDeduction: String(totalDeduction),
          deductionNote: note,
          deductionDetails: JSON.stringify(rules.map((r: any) => ({
            ...r,
            absent_days: absentDays,
            subtotal: absentDays * r.amount,
          }))),
        }));
      } catch (error) {
        console.error('Auto-sync finance config error:', error);
        setSyncError('Lỗi khi tải dữ liệu khấu trừ. Vui lòng thử lại.');
      } finally {
        setIsSyncing(false);
      }
    };

    void autoSyncFinance();
  }, [formData.studentId, formData.month, formData.schoolYear, isEdit, students]);

  const updateField = (field: keyof FeeFormState, value: string) => {
    setFormData((prev) => {
      const next = { ...prev, [field]: value };
      if (field === 'amount' && !isEdit) {
        if (!prev.baseAmount || prev.baseAmount === prev.amount) {
          next.baseAmount = value;
        }
      }
      if (field === 'month') {
        const autoPattern = /^(Học phí tháng \d{1,2})?$/;
        if (!prev.title || autoPattern.test(prev.title)) {
          next.title = `Học phí tháng ${value}`;
        }
      }
      return next;
    });
    if (errors[field as keyof FormErrors]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const handleSyncAttendance = async () => {
    if (!id) return;
    setLoading(true);
    const result = await syncFeeWithAttendance(id);
    setLoading(false);
    if (result.error) {
      toast.error('Đồng bộ thất bại', result.error.message);
      return;
    }
    if (result.item) {
      const item = result.item;
      setFormData(prev => ({
        ...prev,
        amount: String(item.amount_vnd),
        attendanceDeduction: String(item.attendance_deduction_vnd),
        otherDeduction: String(item.other_deduction_vnd || 0),
        deductionDetails: JSON.stringify(item.deduction_details || []),
        deductionNote: item.deduction_note || '',
      }));
      toast.success('Đã đồng bộ chuyên cần');
    }
  };

  const validate = (): boolean => {
    const nextErrors: FormErrors = {};
    const finalAmount = Number(formData.baseAmount || 0) - Number(formData.attendanceDeduction) - Number(formData.otherDeduction);
    if (Number(formData.paidAmount || '0') > finalAmount) nextErrors.paidAmount = 'Số tiền đã thu không được vượt quá số tiền phải thu';
    if (!formData.studentId) nextErrors.studentId = 'Vui lòng chọn học sinh';
    if (!formData.baseAmount || Number(formData.baseAmount) <= 0) nextErrors.amount = 'Số tiền không hợp lệ';
    if (!formData.month) nextErrors.month = 'Vui lòng chọn tháng';
    if (!formData.schoolYear.trim()) nextErrors.schoolYear = 'Vui lòng nhập năm học';
    if (!formData.dueDate) nextErrors.dueDate = 'Vui lòng nhập hạn nộp';

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

  const handleSave = async () => {
    if (!validate()) return;

    setSaving(true);

    const finalAmount = Number(formData.baseAmount || 0) - Number(formData.attendanceDeduction) - Number(formData.otherDeduction);
    const status: FeeStatusValue = Number(formData.paidAmount) >= finalAmount
      ? 'paid'
      : Number(formData.paidAmount) > 0
        ? 'partial'
        : 'unpaid';

    try {
      // Check if fee already exists for this student, month, school_year
      const { data: existingFee } = await supabase
        .from('fee_records')
        .select('id')
        .eq('student_id', formData.studentId)
        .eq('month', Number(formData.month))
        .eq('school_year', formData.schoolYear)
        .maybeSingle();

      if (existingFee && !isEdit) {
        toast.error('Phiếu thu đã tồn tại', 'Đã có phiếu thu cho học sinh này trong tháng/năm học này');
        setSaving(false);
        return;
      }

      let result;
      const payload: CreateFeeInput = {
        student_id: formData.studentId || '',
        class_id: selectedStudent?.class_id || 0,
        title: formData.title || 'Học phí',
        school_year: formData.schoolYear,
        month: Number(formData.month),
        paid_amount_vnd: Number(formData.paidAmount),
        paid_date: formData.paidDate || null,
        due_date: formData.dueDate || null,
        payment_method: formData.paymentMethod || null,
        status,
        base_amount_vnd: Number(formData.baseAmount || formData.amount),
        attendance_deduction_vnd: Number(formData.attendanceDeduction),
        other_deduction_vnd: Number(formData.otherDeduction),
        amount_vnd: finalAmount,
        deduction_note: formData.deductionNote,
      };

      if (isEdit && id) {
        result = await updateFeeRecord(id, payload);
      } else {
        result = await createFeeRecord(payload);
      }

      setSaving(false);

      if (result.error) {
        toast.error(isEdit ? 'Cập nhật thất bại' : 'Tạo mới thất bại', result.error.message);
        return;
      }

      toast.success(isEdit ? 'Đã cập nhật phiếu thu' : 'Đã tạo phiếu thu mới');
      navigate('/fees');
    } catch (error) {
      setSaving(false);
      toast.error('Lỗi hệ thống', 'Có lỗi xảy ra, vui lòng thử lại.');
    }
  };

  const handleDelete = async () => {
    if (!id) return;
    setDeleting(true);
    const result = await deleteFeeRecord(id);
    setDeleting(false);
    if (result.error) {
      toast.error('Xóa thất bại', result.error.message);
      return;
    }
    toast.success('Đã xóa phiếu thu');
    navigate('/fees');
  };

  const handlePrint = () => {
    if (id) {
      navigate(`/fees/print-bulk?ids=${id}`);
    }
  };

  const summary = useMemo(() => {
    const base = Number(formData.baseAmount || formData.amount);
    const deduction = Number(formData.attendanceDeduction);
    const other = Number(formData.otherDeduction);
    const finalAmount = Math.max(0, base - deduction - other);
    const paid = Number(formData.paidAmount);
    const due = Math.max(0, finalAmount - paid);
    return { base, deduction, other, finalAmount, paid, due };
  }, [formData]);

  const parsedDeductionDetails = useMemo<DeductionDetailItem[]>(() => {
    if (!formData.deductionDetails) return [];
    try {
      const parsed = JSON.parse(formData.deductionDetails);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }, [formData.deductionDetails]);

  const deductionPeriodLabel = useMemo(() => {
    const month = Number(formData.month);
    if (!month) return '';
    const calYear = calendarYearFromSchoolMonth(formData.schoolYear, month) ?? new Date().getFullYear();
    const pm = month === 1 ? 12 : month - 1;
    const py = month === 1 ? calYear - 1 : calYear;
    return `Vắng tháng ${pm}/${py}`;
  }, [formData.month, formData.schoolYear]);

  const isLocked = isEdit && feeStatus !== 'unpaid';
  const isFinancialReadOnly = isLocked;

  return (
    <div className="max-w-4xl mx-auto space-y-4 print:space-y-2">
      {/* Header */}
      <div className="flex items-center justify-between print:hidden">
        <Button variant="ghost" size="sm" leftIcon={<ArrowLeft className="w-4 h-4" />} onClick={() => navigate('/fees')}>
          Quay lại
        </Button>
        <div className="flex gap-2">
          {isEdit && (
            <Button variant="outline" size="sm" leftIcon={<RefreshCw className="w-4 h-4" />} onClick={handleSyncAttendance} loading={loading}>
              Đồng bộ chuyên cần
            </Button>
          )}
          {!isLocked && isEdit && (
            <Button variant="danger" size="sm" leftIcon={<Trash2 className="w-4 h-4" />} onClick={() => setShowDeleteConfirm(true)}>
              Xóa
            </Button>
          )}
          {isEdit && (
            <Button variant="outline" size="sm" leftIcon={<Printer className="w-4 h-4" />} onClick={handlePrint}>
              In biên lai
            </Button>
          )}
        </div>
      </div>

      {/* Form */}
      <Card>
        <div className="p-5 space-y-5">
          {/* Class Filter + Title row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 print:hidden">
            <Select
              label="Lọc theo lớp"
              value={classFilter}
              onChange={(v) => setClassFilter(v)}
              options={classes}
              placeholder="Tất cả lớp"
              fullWidth
            />
            <Input
              label="Tiêu đề"
              value={formData.title}
              onChange={(e) => updateField('title', e.target.value)}
              placeholder="VD: Học phí tháng 10"
              readOnly={isLocked}
              disabled={isLocked}
            />
          </div>

          {/* Student Selection row */}
          <div className="print:hidden">
            <Select
              label="Học sinh"
              value={formData.studentId}
              onChange={(v) => updateField('studentId', v)}
              options={studentOptions}
              placeholder="Chọn học sinh..."
              error={errors.studentId}
              required
              disabled={isEdit}
              fullWidth
            />
          </div>

          {/* Period */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 print:hidden">
            <Select
              label="Tháng"
              value={formData.month}
              onChange={(v) => updateField('month', v)}
              options={monthOptions}
              error={errors.month}
              required
              fullWidth
            />
            <DatePicker
              label="Hạn nộp"
              date={formData.dueDate}
              setDate={(v) => { updateField('dueDate', v); }}
              required
              error={errors.dueDate}
            />
          </div>

          {/* Amounts */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <CurrencyInput
              label="Học phí gốc"
              value={formData.baseAmount || formData.amount}
              onChange={(val) => updateField('baseAmount', val)}
              required
            />
            <CurrencyInput
              label="Khấu trừ khác"
              value={formData.otherDeduction}
              onChange={(val) => updateField('otherDeduction', val)}
            />
          </div>

          {/* Deduction Breakdown Card */}
          {(!isEdit || parsedDeductionDetails.length > 0 || isSyncing) && (
            <div className="border border-red-200/60 rounded-xl overflow-hidden">
              <div className="flex items-center gap-2 px-4 py-2.5 bg-red-50/50">
                <AlertCircle className="w-3.5 h-3.5 text-red-500 shrink-0" />
                <p className="text-xs font-semibold text-red-600">Chi tiết khấu trừ chuyên cần</p>
                {deductionPeriodLabel && (
                  <span className="ml-auto text-xs text-muted-foreground">{deductionPeriodLabel}</span>
                )}
              </div>
              {isSyncing ? (
                <div className="p-4 space-y-2">
                  <div className="h-3 bg-muted/40 rounded animate-pulse w-full" />
                  <div className="h-3 bg-muted/40 rounded animate-pulse w-4/5" />
                  <div className="h-3 bg-muted/40 rounded animate-pulse w-2/3" />
                </div>
              ) : parsedDeductionDetails.length > 0 ? (
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-muted/20 text-muted-foreground border-t border-red-200/40">
                      <th className="px-4 py-2 text-left font-medium">Khoản khấu trừ</th>
                      <th className="px-4 py-2 text-right font-medium">Đơn giá/ngày</th>
                      <th className="px-4 py-2 text-right font-medium">Ngày vắng</th>
                      <th className="px-4 py-2 text-right font-medium">Thành tiền</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parsedDeductionDetails.map((detail) => (
                      <tr key={detail.id} className="border-t border-border/40">
                        <td className="px-4 py-2">{detail.name}</td>
                        <td className="px-4 py-2 text-right text-muted-foreground">{formatCurrency(detail.amount)}</td>
                        <td className="px-4 py-2 text-right">{detail.absent_days} ngày</td>
                        <td className="px-4 py-2 text-right font-semibold text-red-500">-{formatCurrency(detail.subtotal)}</td>
                      </tr>
                    ))}
                    <tr className="border-t-2 border-red-200/60 bg-red-50/30 font-semibold">
                      <td className="px-4 py-2 text-red-600" colSpan={3}>Tổng khấu trừ chuyên cần</td>
                      <td className="px-4 py-2 text-right text-red-500">-{formatCurrency(summary.deduction)}</td>
                    </tr>
                  </tbody>
                </table>
              ) : syncError ? (
                <div className="px-4 py-3 flex items-start gap-2 text-xs text-red-500">
                  <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                  <span>{syncError}</span>
                </div>
              ) : (
                <p className="px-4 py-3 text-xs text-muted-foreground italic">
                  {formData.deductionNote
                    ? 'Không có ngày vắng tháng trước — không khấu trừ chuyên cần.'
                    : formData.studentId && formData.month
                      ? 'Đang tính toán dữ liệu khấu trừ...'
                      : 'Chọn học sinh và tháng để tính khấu trừ tự động.'}
                </p>
              )}
            </div>
          )}

          {/* Payment */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 print:hidden">
            <CurrencyInput
              label="Đã thanh toán"
              value={formData.paidAmount}
              onChange={(val) => updateField('paidAmount', val)}
              error={errors.paidAmount}
            />
            <Select
              label="Phương thức"
              value={formData.paymentMethod}
              onChange={(v) => updateField('paymentMethod', v)}
              options={paymentOptions}
              fullWidth
            />
          </div>

          {/* Dates */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 print:hidden">
            <DatePicker
              label="Ngày thanh toán"
              date={formData.paidDate}
              setDate={(v) => updateField('paidDate', v)}
            />
          </div>

          {/* Summary */}
          <div className="border border-primary/20 rounded-xl p-4 space-y-2 bg-primary/5">
            <div className="flex justify-between text-sm font-semibold">
              <span>Học phí gốc</span>
              <span>{formatCurrency(summary.base)}</span>
            </div>
            {summary.deduction > 0 && (
              <div className="space-y-0.5">
                <div className="flex justify-between text-sm text-red-500 items-center">
                  <span className="flex items-center gap-1">
                    Khấu trừ vắng mặt
                    {formData.deductionNote && (
                      <span className="relative group cursor-help">
                        <Info className="w-3 h-3 text-red-400" />
                        <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 w-64 bg-gray-800 text-white text-xs rounded-lg px-3 py-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 shadow-lg leading-relaxed">
                          {formData.deductionNote}
                        </span>
                      </span>
                    )}
                  </span>
                  <span>-{formatCurrency(summary.deduction)}</span>
                </div>
                {parsedDeductionDetails.map((detail) => (
                  <div key={detail.id} className="flex justify-between text-xs text-red-400/70 pl-3">
                    <span>• {detail.name}: {detail.absent_days} ngày × {formatCurrency(detail.amount)}</span>
                    <span>-{formatCurrency(detail.subtotal)}</span>
                  </div>
                ))}
              </div>
            )}
            {summary.other > 0 && (
              <div className="flex justify-between text-sm text-red-500">
                <span>Khấu trừ khác</span>
                <span>-{formatCurrency(summary.other)}</span>
              </div>
            )}
            <div className="flex justify-between text-lg font-black border-t border-primary/20 pt-2">
              <span>Tổng cộng</span>
              <span className="text-primary">{formatCurrency(summary.finalAmount)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Đã thanh toán</span>
              <span className={summary.paid > 0 ? 'text-emerald-500' : 'text-muted-foreground'}>{formatCurrency(summary.paid)}</span>
            </div>
            <div className="flex justify-between text-sm border-t border-border pt-2">
              <span className="font-bold">Còn lại</span>
              <span className={`font-bold ${summary.due <= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                {summary.due <= 0 ? 'Đã hoàn tất' : formatCurrency(summary.due)}
              </span>
            </div>
          </div>

          {/* Save button */}
          <Button onClick={handleSave} loading={saving} leftIcon={<Save className="w-4 h-4" />} fullWidth>
            {isEdit ? 'Cập nhật phiếu thu' : 'Tạo phiếu thu'}
          </Button>
        </div>
      </Card>

      {/* Print Invoice */}
      <div className="hidden print:block">
        <div className="bg-white border-[3px] border-black p-8">
          <div className="flex justify-between items-start border-b-[3px] border-black pb-6 mb-6">
            <div>
              <h2 className="text-xl font-black uppercase">Trường Mầm Non KidGarden</h2>
              <p className="text-[10px] text-gray-500 mt-1">123 Đường Láng, Đống Đa, Hà Nội | 0123 456 789</p>
            </div>
            <div className="text-right">
              <h1 className="text-2xl font-black text-primary uppercase">Biên Lai Thu Tiền</h1>
              <p className="text-[10px] font-mono mt-1 bg-gray-100 inline-block px-2 py-0.5 rounded">#{id ? id.slice(0, 8).toUpperCase() : 'MỚI'}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6 mb-6 text-sm">
            <div className="space-y-1.5">
              <p><span className="font-bold">Học sinh:</span> {selectedStudent?.full_name || formData.studentId}</p>
              <p><span className="font-bold">Lớp:</span> {selectedStudent?.class_name || '—'}</p>
              <p><span className="font-bold">Phụ huynh:</span> {selectedStudent?.parent_info?.full_name || '—'}</p>
            </div>
            <div className="space-y-1.5 text-right">
              <p><span className="font-bold">Kỳ thu:</span> Tháng {formData.month} / {formData.schoolYear}</p>
              <p><span className="font-bold">Ngày in:</span> {new Date().toLocaleDateString('vi-VN')}</p>
              <p><span className="font-bold">Trạng thái:</span> {status === 'paid' ? 'Đã thanh toán' : formData.paymentMethod ? 'Một phần' : 'Chưa đóng'}</p>
            </div>
          </div>

          <table className="w-full border-collapse mb-6">
            <thead>
              <tr className="bg-gray-100">
                <th className="border border-black px-4 py-2 text-left text-xs uppercase">Khoản thu</th>
                <th className="border border-black px-4 py-2 text-right w-40 text-xs uppercase">Số tiền</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              <tr>
                <td className="border border-black px-4 py-3 font-bold">{formData.title || 'Học phí'}</td>
                <td className="border border-black px-4 py-3 text-right font-bold">{formatCurrency(summary.base)}</td>
              </tr>
              {summary.deduction > 0 && (
                <tr className="text-red-600 italic">
                  <td className="border border-black px-4 py-2">- Khấu trừ vắng mặt</td>
                  <td className="border border-black px-4 py-2 text-right">-{formatCurrency(summary.deduction)}</td>
                </tr>
              )}
              <tr className="bg-gray-50">
                <td className="border-2 border-black px-4 py-4 text-right font-black uppercase">Tổng cộng thực thu</td>
                <td className="border-2 border-black px-4 py-4 text-right text-xl font-black text-primary">{formatCurrency(summary.finalAmount)}</td>
              </tr>
            </tbody>
          </table>

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
                <p className="font-bold uppercase text-[10px]">Người lập phiếu</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <ConfirmModal
        open={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleDelete}
        title="Xóa phiếu thu?"
        message="Hành động này không thể hoàn tác. Toàn bộ dữ liệu thanh toán của phiếu thu này sẽ bị mất."
        confirmLabel="Xóa"
        cancelLabel="Hủy"
        variant="danger"
        loading={deleting}
      />
    </div>
  );
}