import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Info, Printer, Receipt, Save, Trash2, Wallet, RefreshCw, Lock, AlertCircle, Plus, ChevronDown } from 'lucide-react';
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
import { cn } from '@/lib/utils';

import { useAuthStore } from '@/stores/authStore';
import type { SelectOption } from '@/types';
import type { CreateFeeInput, FeeRecordP2, FeeStatusValue, StudentRecord, AdditionalChargeDetail, OtherDeductionDetail } from '@/types/domain';

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
  otherDeductionDetails: OtherDeductionDetail[];
  deductionDetails: string;
  deductionNote: string;
  additionalChargeDetails: AdditionalChargeDetail[];
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
  note?: string | null;
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
  const [showOtherDeductionDetails, setShowOtherDeductionDetails] = useState(false);
  const [showAdditionalChargeDetails, setShowAdditionalChargeDetails] = useState(false);
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
      otherDeductionDetails: [],
      deductionDetails: '',
      deductionNote: '',
      additionalChargeDetails: [],
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

            // Parse additional charge details with backward compatibility
            let additionalDetails: AdditionalChargeDetail[] = [];
            if (item.additional_charge_details && item.additional_charge_details.length > 0) {
              additionalDetails = item.additional_charge_details;
            } else if (item.additional_charge_vnd > 0) {
              // Convert old format to new format
              additionalDetails = [{
                id: crypto.randomUUID(),
                name: item.additional_charge_note || 'Phụ thu',
                amount: item.additional_charge_vnd,
                note: null,
              }];
            }

            // Parse other deduction details with backward compatibility
            let otherDeductionDetails: OtherDeductionDetail[] = [];
            if (item.other_deduction_details && item.other_deduction_details.length > 0) {
              otherDeductionDetails = item.other_deduction_details;
            } else if (item.other_deduction_vnd > 0) {
              // Convert old format to new format
              otherDeductionDetails = [{
                id: crypto.randomUUID(),
                name: 'Khấu trừ khác',
                amount: item.other_deduction_vnd,
                note: null,
              }];
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
              otherDeductionDetails: otherDeductionDetails,
              deductionDetails: JSON.stringify(item.deduction_details || []),
              deductionNote: item.deduction_note || '',
              additionalChargeDetails: additionalDetails,
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

  // Auto-open toggles when items exist
  useEffect(() => {
    if (formData.otherDeductionDetails.length > 0) {
      setShowOtherDeductionDetails(true);
    }
  }, [formData.otherDeductionDetails.length]);

  useEffect(() => {
    if (formData.additionalChargeDetails.length > 0) {
      setShowAdditionalChargeDetails(true);
    }
  }, [formData.additionalChargeDetails.length]);

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
        // 1. Resolve class_type from classes
        const { data: classData, error: classError } = await supabase
          .from('classes')
          .select('class_type')
          .eq('id', student.class_id)
          .eq('del_yn', false)
          .single();

        if (classError || !classData?.class_type) {
          console.error('Failed to fetch class type:', classError);
          setSyncError('Không tìm thấy thông tin lớp học.');
          return;
        }
        const classType = classData.class_type;

        // 2. Query finance config by class_type
        const { data: configData, error: configError } = await supabase
          .from('class_finance_configs')
          .select('deduction_rules, class_type')
          .eq('class_type', classType)
          .eq('del_yn', false)
          .maybeSingle();

        if (configError) {
          console.error('Failed to fetch finance config by class_type:', configError);
          setSyncError('Lỗi tải cấu hình tài chính.');
          return;
        }
        if (!configData) {
          console.error('No finance config found for class_type:', classType);
          setSyncError(`Chưa có cấu hình tài chính cho loại lớp "${classType}". Vui lòng thiết lập tài chính trước.`);
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

  const updateField = (field: keyof FeeFormState, value: string | AdditionalChargeDetail[] | OtherDeductionDetail[]) => {
    setFormData((prev) => {
      const next = { ...prev, [field]: value };
      if (field === 'amount' && !isEdit && typeof value === 'string') {
        if (!prev.baseAmount || prev.baseAmount === prev.amount) {
          next.baseAmount = value;
        }
      }
      if (field === 'month' && typeof value === 'string') {
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
        otherDeductionDetails: item.other_deduction_details || prev.otherDeductionDetails,
        deductionDetails: JSON.stringify(item.deduction_details || []),
        deductionNote: item.deduction_note || '',
        additionalChargeDetails: item.additional_charge_details || prev.additionalChargeDetails,
      }));
      toast.success('Đã đồng bộ chuyên cần');
    }
  };

  const validate = (): boolean => {
    const nextErrors: FormErrors = {};
    const finalAmount = Number(formData.baseAmount || 0) - Number(formData.attendanceDeduction) - otherDeductionTotal + additionalChargeTotal;
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

    const finalAmount = Number(formData.baseAmount || 0) - Number(formData.attendanceDeduction) - otherDeductionTotal + additionalChargeTotal;
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
        other_deduction_vnd: otherDeductionTotal,
        other_deduction_details: formData.otherDeductionDetails,
        amount_vnd: finalAmount,
        deduction_note: formData.deductionNote,
        additional_charge_vnd: additionalChargeTotal,
        additional_charge_note: JSON.stringify(formData.additionalChargeDetails),
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

  const otherDeductionTotal = useMemo(() => {
    return formData.otherDeductionDetails.reduce((sum, item) => sum + item.amount, 0);
  }, [formData.otherDeductionDetails]);

  const additionalChargeTotal = useMemo(() => {
    return formData.additionalChargeDetails.reduce((sum, item) => sum + item.amount, 0);
  }, [formData.additionalChargeDetails]);

  const summary = useMemo(() => {
    const base = Number(formData.baseAmount || formData.amount);
    const deduction = Number(formData.attendanceDeduction);
    const other = otherDeductionTotal;
    const additional = additionalChargeTotal;
    const finalAmount = Math.max(0, base - deduction - other + additional);
    const paid = Number(formData.paidAmount);
    const due = Math.max(0, finalAmount - paid);
    return { base, deduction, other, additional, finalAmount, paid, due };
  }, [formData, otherDeductionTotal, additionalChargeTotal]);

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

  // Lock cấu trúc học phí khi đã partial/paid (để tránh thay đổi gốc)
  const isLocked = isEdit && feeStatus !== 'unpaid';
  // Đã thanh toán và Phương thức luôn cho phép sửa khi edit
  const isFinancialReadOnly = false;

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
        <div className="p-5 space-y-6">

          {/* ===== SECTION 1: THÔNG TIN CƠ BẢN ===== */}
          <div className="space-y-4 pb-6 border-b border-border">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Thông tin cơ bản
            </h3>

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
          </div>

          {/* ===== SECTION 2: TIỀN BẠC ===== */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Tiền bạc
            </h3>

          {/* Học phí gốc */}
          <CurrencyInput
            label="Học phí gốc"
            value={formData.baseAmount || formData.amount}
            onChange={(val) => updateField('baseAmount', val)}
            required
          />

          {/* Chi tiết khấu trừ khác - Collapsible */}
          <div className="space-y-3">
            <button
              type="button"
              onClick={() => setShowOtherDeductionDetails(!showOtherDeductionDetails)}
              className="flex items-center justify-between w-full text-left p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center gap-2">
                <ChevronDown
                  className={cn(
                    "w-4 h-4 transition-transform text-muted-foreground",
                    showOtherDeductionDetails && "rotate-180"
                  )}
                />
                <label className="text-sm font-medium text-foreground cursor-pointer">
                  Chi tiết khấu trừ khác
                  {formData.otherDeductionDetails.length > 0 && (
                    <span className="ml-2 text-xs text-muted-foreground">
                      ({formData.otherDeductionDetails.length} khoản)
                    </span>
                  )}
                </label>
              </div>
              <Button
                variant="outline"
                size="sm"
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  const newItem: OtherDeductionDetail = {
                    id: crypto.randomUUID(),
                    name: '',
                    amount: 0,
                    note: null,
                  };
                  updateField('otherDeductionDetails', [...formData.otherDeductionDetails, newItem]);
                  setShowOtherDeductionDetails(true);
                }}
                leftIcon={<Plus className="w-3 h-3" />}
              >
                Thêm khoản
              </Button>
            </button>

            {showOtherDeductionDetails && (
              <div className="space-y-2 pl-6">
                {formData.otherDeductionDetails.length === 0 ? (
                  <div className="border border-dashed border-border rounded-lg p-4 text-center text-sm text-muted-foreground">
                    Chưa có khoản khấu trừ. Nhấn "Thêm khoản" để thêm.
                  </div>
                ) : (
                  <>
                    {formData.otherDeductionDetails.map((item, index) => (
                      <div key={item.id} className="border border-border rounded-lg p-3 space-y-2">
                        <div className="flex items-center gap-2">
                          <Input
                            placeholder="Tên khoản khấu trừ"
                            value={item.name}
                            onChange={(e) => {
                              const newDetails = [...formData.otherDeductionDetails];
                              newDetails[index] = { ...item, name: e.target.value };
                              updateField('otherDeductionDetails', newDetails);
                            }}
                            className="flex-1"
                          />
                          <CurrencyInput
                            value={String(item.amount)}
                            onChange={(val) => {
                              const newDetails = [...formData.otherDeductionDetails];
                              newDetails[index] = { ...item, amount: Number(val) };
                              updateField('otherDeductionDetails', newDetails);
                            }}
                            className="w-40"
                          />
                          <Button
                            variant="ghost"
                            size="sm"
                            type="button"
                            onClick={() => {
                              const newDetails = formData.otherDeductionDetails.filter((_, i) => i !== index);
                              updateField('otherDeductionDetails', newDetails);
                            }}
                            leftIcon={<Trash2 className="w-3 h-3 text-red-500" />}
                          />
                        </div>
                        <Input
                          placeholder="Ghi chú (tùy chọn)"
                          value={item.note || ''}
                          onChange={(e) => {
                            const newDetails = [...formData.otherDeductionDetails];
                            newDetails[index] = { ...item, note: e.target.value };
                            updateField('otherDeductionDetails', newDetails);
                          }}
                        />
                      </div>
                    ))}

                    {/* Tổng khấu trừ khác */}
                    <div className="border-t border-red-200/60 pt-2 flex justify-between items-center font-semibold text-red-600">
                      <span>Tổng khấu trừ khác</span>
                      <span>-{formatCurrency(otherDeductionTotal)}</span>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Chi tiết phụ thu - Collapsible */}
          <div className="space-y-3">
            <button
              type="button"
              onClick={() => setShowAdditionalChargeDetails(!showAdditionalChargeDetails)}
              className="flex items-center justify-between w-full text-left p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center gap-2">
                <ChevronDown
                  className={cn(
                    "w-4 h-4 transition-transform text-muted-foreground",
                    showAdditionalChargeDetails && "rotate-180"
                  )}
                />
                <label className="text-sm font-medium text-foreground cursor-pointer">
                  Chi tiết phụ thu
                  {formData.additionalChargeDetails.length > 0 && (
                    <span className="ml-2 text-xs text-muted-foreground">
                      ({formData.additionalChargeDetails.length} khoản)
                    </span>
                  )}
                </label>
              </div>
              <Button
                variant="outline"
                size="sm"
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  const newItem: AdditionalChargeDetail = {
                    id: crypto.randomUUID(),
                    name: '',
                    amount: 0,
                    note: null,
                  };
                  updateField('additionalChargeDetails', [...formData.additionalChargeDetails, newItem]);
                  setShowAdditionalChargeDetails(true);
                }}
                leftIcon={<Plus className="w-3 h-3" />}
              >
                Thêm khoản
              </Button>
            </button>

            {showAdditionalChargeDetails && (
              <div className="space-y-2 pl-6">
            {formData.additionalChargeDetails.length === 0 ? (
              <div className="border border-dashed border-border rounded-lg p-4 text-center text-sm text-muted-foreground">
                Chưa có khoản phụ thu. Nhấn "Thêm khoản" để thêm.
              </div>
            ) : (
              <>
                {formData.additionalChargeDetails.map((item, index) => (
                  <div key={item.id} className="border border-border rounded-lg p-3 space-y-2">
                    <div className="flex items-center gap-2">
                      <Input
                        placeholder="Tên khoản phụ thu"
                        value={item.name}
                        onChange={(e) => {
                          const newDetails = [...formData.additionalChargeDetails];
                          newDetails[index] = { ...item, name: e.target.value };
                          updateField('additionalChargeDetails', newDetails);
                        }}
                        className="flex-1"
                      />
                      <CurrencyInput
                        value={String(item.amount)}
                        onChange={(val) => {
                          const newDetails = [...formData.additionalChargeDetails];
                          newDetails[index] = { ...item, amount: Number(val) };
                          updateField('additionalChargeDetails', newDetails);
                        }}
                        className="w-40"
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        type="button"
                        onClick={() => {
                          const newDetails = formData.additionalChargeDetails.filter((_, i) => i !== index);
                          updateField('additionalChargeDetails', newDetails);
                        }}
                        leftIcon={<Trash2 className="w-3 h-3 text-red-500" />}
                      />
                    </div>
                    <Input
                      placeholder="Ghi chú (tùy chọn)"
                      value={item.note || ''}
                      onChange={(e) => {
                        const newDetails = [...formData.additionalChargeDetails];
                        newDetails[index] = { ...item, note: e.target.value };
                        updateField('additionalChargeDetails', newDetails);
                      }}
                    />
                  </div>
                ))}

                {/* Tổng phụ thu */}
                <div className="border-t border-primary/20 pt-2 flex justify-between items-center font-semibold text-green-600">
                  <span>Tổng phụ thu</span>
                  <span>+{formatCurrency(additionalChargeTotal)}</span>
                </div>
              </>
            )}
              </div>
            )}
          </div>

          {/* Thanh toán */}
          <CurrencyInput
            label="Đã thanh toán"
            value={formData.paidAmount}
            onChange={(val) => updateField('paidAmount', val)}
            error={errors.paidAmount}
            disabled={isFinancialReadOnly}
          />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 print:hidden">
            <Select
              label="Phương thức"
              value={formData.paymentMethod}
              onChange={(v) => updateField('paymentMethod', v)}
              options={paymentOptions}
              disabled={isFinancialReadOnly}
              fullWidth
            />
            <DatePicker
              label="Ngày thanh toán"
              date={formData.paidDate}
              setDate={(v) => { updateField('paidDate', v); }}
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
                  <div key={detail.id}>
                    <div className="flex justify-between text-xs text-red-400/70 pl-3">
                      <span>• {detail.name}: {detail.absent_days} ngày × {formatCurrency(detail.amount)}</span>
                      <span>-{formatCurrency(detail.subtotal)}</span>
                    </div>
                    {detail.note && (
                      <div className="text-xs text-muted-foreground italic pl-5">
                        {detail.note}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
            {summary.other > 0 && (
              <div className="space-y-0.5">
                <div className="flex justify-between text-sm text-red-500">
                  <span>Khấu trừ khác</span>
                  <span>-{formatCurrency(summary.other)}</span>
                </div>
                {/* Chi tiết inline */}
                {formData.otherDeductionDetails.map((item) => (
                  <div key={item.id} className="flex justify-between text-xs text-red-400/70 pl-3">
                    <span className="flex items-center gap-1">
                      • {item.name || 'Chưa đặt tên'}
                      {item.note && (
                        <span className="relative group cursor-help">
                          <Info className="w-2.5 h-2.5" />
                          <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 w-48 bg-gray-800 text-white text-xs rounded px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                            {item.note}
                          </span>
                        </span>
                      )}
                    </span>
                    <span>-{formatCurrency(item.amount)}</span>
                  </div>
                ))}
              </div>
            )}
            {summary.additional > 0 && (
              <div className="space-y-1">
                <div className="flex justify-between text-sm text-green-600 font-semibold">
                  <span>Phụ thu</span>
                  <span>+{formatCurrency(summary.additional)}</span>
                </div>
                {/* Chi tiết từng khoản */}
                {formData.additionalChargeDetails.map((item) => (
                  <div key={item.id} className="flex justify-between text-xs text-green-500/70 pl-3">
                    <span className="flex items-center gap-1">
                      • {item.name || 'Chưa đặt tên'}
                      {item.note && (
                        <span className="relative group cursor-help">
                          <Info className="w-2.5 h-2.5" />
                          <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 w-48 bg-gray-800 text-white text-xs rounded px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                            {item.note}
                          </span>
                        </span>
                      )}
                    </span>
                    <span>+{formatCurrency(item.amount)}</span>
                  </div>
                ))}
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