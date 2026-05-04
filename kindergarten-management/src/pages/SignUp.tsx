import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate, Link } from 'react-router-dom';
import { Eye, EyeOff, Loader2, ArrowLeft } from 'lucide-react';
import { signUp } from '@/lib/supabase';

// ---------------------------------------------------------------------------
// Validation schema
// ---------------------------------------------------------------------------
const signUpSchema = z.object({
  fullName: z
    .string()
    .min(2, 'Họ tên phải có ít nhất 2 ký tự')
    .max(100, 'Họ tên không được quá 100 ký tự'),
  email: z
    .string()
    .min(1, 'Email không được để trống')
    .email('Email không hợp lệ'),
  phone: z
    .string()
    .min(10, 'Số điện thoại phải có ít nhất 10 số')
    .max(15, 'Số điện thoại không được quá 15 số')
    .regex(/^[0-9]+$/, 'Số điện thoại chỉ bao gồm số'),
  password: z
    .string()
    .min(6, 'Mật khẩu phải có ít nhất 6 ký tự')
    .max(100, 'Mật khẩu không được quá 100 ký tự'),
  confirmPassword: z.string().min(1, 'Vui lòng xác nhận mật khẩu'),
  role: z.enum(['Admin', 'Teacher', 'Accountant', 'Parent']),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Mật khẩu xác nhận không khớp',
  path: ['confirmPassword'],
});

type SignUpFormValues = z.infer<typeof signUpSchema>;

// Role options for school staff
const roleOptions = [
  { value: 'Admin', label: 'Quản trị viên' },
  { value: 'Teacher', label: 'Giáo viên' },
  { value: 'Accountant', label: 'Kế toán' },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export default function SignUp() {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignUpFormValues>({
    resolver: zodResolver(signUpSchema),
    defaultValues: {
      fullName: '',
      email: '',
      phone: '',
      password: '',
      confirmPassword: '',
      role: 'Teacher',
    },
  });

  const onSubmit = async (values: SignUpFormValues) => {
    setServerError(null);
    setSuccessMessage(null);

    const { error } = await signUp(
      values.email,
      values.password,
      values.fullName,
      values.phone,
      values.role
    );

    if (error) {
      setServerError(error.message);
      return;
    }

    // Show success message instead of redirecting
    setSuccessMessage('Đăng ký thành công! Vui lòng kiểm tra email để xác thực tài khoản trước khi đăng nhập.');
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-[#F8FAFC]">
      {/* Decorative blobs */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-40 -left-40 w-96 h-96 rounded-full opacity-20 blur-3xl"
        style={{ background: '#FF6B6B' }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-40 -right-40 w-96 h-96 rounded-full opacity-20 blur-3xl"
        style={{ background: '#4ECDC4' }}
      />

      {/* Sign up card */}
      <div className="relative z-10 w-full max-w-[480px] mx-4">
        <div
          className="bg-white rounded-3xl shadow-2xl px-10 py-10"
          style={{ boxShadow: '0 25px 60px rgba(0,0,0,0.12)' }}
        >
          {/* Back to login link */}
          <Link
            to="/login"
            className="inline-flex items-center gap-1 text-sm mb-6 transition-colors"
            style={{ color: '#64748B' }}
          >
            <ArrowLeft size={16} />
            Quay lại đăng nhập
          </Link>

          {/* Logo & heading */}
          <div className="flex flex-col items-center mb-8">
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4 shadow-lg"
              style={{
                background: 'linear-gradient(135deg, #FF6B6B, #ff8e53)',
              }}
            >
              <svg width="32" height="32" viewBox="0 0 32 32" fill="none" aria-hidden="true">
                <circle cx="16" cy="16" r="5" fill="white" />
                <ellipse cx="16" cy="7" rx="4" ry="5" fill="white" opacity="0.85" />
                <ellipse cx="16" cy="25" rx="4" ry="5" fill="white" opacity="0.85" />
                <ellipse cx="7" cy="16" rx="5" ry="4" fill="white" opacity="0.85" />
                <ellipse cx="25" cy="16" rx="5" ry="4" fill="white" opacity="0.85" />
              </svg>
            </div>

            <h1
              className="text-3xl font-extrabold tracking-tight"
              style={{ color: '#FF6B6B' }}
            >
              Đăng ký tài khoản
            </h1>
            <p className="mt-1 text-sm text-center" style={{ color: '#64748B' }}>
              Tạo tài khoản để sử dụng hệ thống KidGarden
            </p>
          </div>

          {/* Success message */}
          {successMessage && (
            <div
              className="mb-5 flex items-start gap-3 rounded-xl px-4 py-3 text-sm"
              style={{
                background: '#DCFCE7',
                border: '1px solid #86EFAC',
                color: '#166534',
              }}
            >
              <svg className="shrink-0 mt-0.5" width="16" height="16" viewBox="0 0 16 16" fill="none">
                <circle cx="8" cy="8" r="7.5" stroke="#22C55E" />
                <path d="M5 8l2 2 4-4" stroke="#22C55E" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              {successMessage}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit(onSubmit)} noValidate>
            {/* Server error banner */}
            {serverError && (
              <div
                className="mb-5 flex items-start gap-3 rounded-xl px-4 py-3 text-sm"
                style={{
                  background: '#FEF2F2',
                  border: '1px solid #FECACA',
                  color: '#EF4444',
                }}
              >
                <svg className="mt-0.5 shrink-0" width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <circle cx="8" cy="8" r="7.5" stroke="#EF4444" />
                  <path d="M8 4.5v4M8 10.5v1" stroke="#EF4444" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
                {serverError}
              </div>
            )}

            {/* Full Name */}
            <div className="mb-4">
              <label htmlFor="fullName" className="block text-sm font-medium mb-1.5" style={{ color: '#1E293B' }}>
                Họ và tên <span className="text-red-500">*</span>
              </label>
              <input
                id="fullName"
                type="text"
                placeholder="Nguyễn Văn A"
                {...register('fullName')}
                className="w-full rounded-xl px-4 py-3 text-sm outline-none transition-all"
                style={{
                  border: errors.fullName ? '1.5px solid #EF4444' : '1.5px solid #E2E8F0',
                  background: '#F8FAFC',
                  color: '#1E293B',
                }}
              />
              {errors.fullName && (
                <p className="mt-1.5 text-xs" style={{ color: '#EF4444' }}>{errors.fullName.message}</p>
              )}
            </div>

            {/* Email */}
            <div className="mb-4">
              <label htmlFor="email" className="block text-sm font-medium mb-1.5" style={{ color: '#1E293B' }}>
                Email <span className="text-red-500">*</span>
              </label>
              <input
                id="email"
                type="email"
                placeholder="email@example.com"
                {...register('email')}
                className="w-full rounded-xl px-4 py-3 text-sm outline-none transition-all"
                style={{
                  border: errors.email ? '1.5px solid #EF4444' : '1.5px solid #E2E8F0',
                  background: '#F8FAFC',
                  color: '#1E293B',
                }}
              />
              {errors.email && (
                <p className="mt-1.5 text-xs" style={{ color: '#EF4444' }}>{errors.email.message}</p>
              )}
            </div>

            {/* Phone */}
            <div className="mb-4">
              <label htmlFor="phone" className="block text-sm font-medium mb-1.5" style={{ color: '#1E293B' }}>
                Số điện thoại <span className="text-red-500">*</span>
              </label>
              <input
                id="phone"
                type="tel"
                placeholder="0912345678"
                {...register('phone')}
                className="w-full rounded-xl px-4 py-3 text-sm outline-none transition-all"
                style={{
                  border: errors.phone ? '1.5px solid #EF4444' : '1.5px solid #E2E8F0',
                  background: '#F8FAFC',
                  color: '#1E293B',
                }}
              />
              {errors.phone && (
                <p className="mt-1.5 text-xs" style={{ color: '#EF4444' }}>{errors.phone.message}</p>
              )}
            </div>

            {/* Role */}
            <div className="mb-4">
              <label htmlFor="role" className="block text-sm font-medium mb-1.5" style={{ color: '#1E293B' }}>
                Vai trò <span className="text-red-500">*</span>
              </label>
              <select
                id="role"
                {...register('role')}
                className="w-full rounded-xl px-4 py-3 text-sm outline-none transition-all"
                style={{
                  border: errors.role ? '1.5px solid #EF4444' : '1.5px solid #E2E8F0',
                  background: '#F8FAFC',
                  color: '#1E293B',
                }}
              >
                {roleOptions.map((role) => (
                  <option key={role.value} value={role.value}>
                    {role.label}
                  </option>
                ))}
              </select>
              {errors.role && (
                <p className="mt-1.5 text-xs" style={{ color: '#EF4444' }}>{errors.role.message}</p>
              )}
            </div>

            {/* Password */}
            <div className="mb-4">
              <label htmlFor="password" className="block text-sm font-medium mb-1.5" style={{ color: '#1E293B' }}>
                Mật khẩu <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Ít nhất 6 ký tự"
                  {...register('password')}
                  className="w-full rounded-xl px-4 py-3 pr-12 text-sm outline-none transition-all"
                  style={{
                    border: errors.password ? '1.5px solid #EF4444' : '1.5px solid #E2E8F0',
                    background: '#F8FAFC',
                    color: '#1E293B',
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-lg"
                  style={{ color: '#94A3B8' }}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {errors.password && (
                <p className="mt-1.5 text-xs" style={{ color: '#EF4444' }}>{errors.password.message}</p>
              )}
            </div>

            {/* Confirm Password */}
            <div className="mb-6">
              <label htmlFor="confirmPassword" className="block text-sm font-medium mb-1.5" style={{ color: '#1E293B' }}>
                Xác nhận mật khẩu <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  id="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  placeholder="Nhập lại mật khẩu"
                  {...register('confirmPassword')}
                  className="w-full rounded-xl px-4 py-3 pr-12 text-sm outline-none transition-all"
                  style={{
                    border: errors.confirmPassword ? '1.5px solid #EF4444' : '1.5px solid #E2E8F0',
                    background: '#F8FAFC',
                    color: '#1E293B',
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-lg"
                  style={{ color: '#94A3B8' }}
                >
                  {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {errors.confirmPassword && (
                <p className="mt-1.5 text-xs" style={{ color: '#EF4444' }}>{errors.confirmPassword.message}</p>
              )}
            </div>

            {/* Submit button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold text-white transition-all active:scale-[0.98]"
              style={{
                background: isSubmitting ? '#FDA4A4' : 'linear-gradient(135deg, #FF6B6B, #ff4f4f)',
                boxShadow: isSubmitting ? 'none' : '0 4px 15px rgba(255,107,107,0.4)',
                cursor: isSubmitting ? 'not-allowed' : 'pointer',
              }}
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Đang đăng ký…
                </>
              ) : (
                'Đăng ký'
              )}
            </button>
          </form>

          {/* Login link */}
          <div className="mt-6 text-center">
            <p className="text-sm" style={{ color: '#64748B' }}>
              Đã có tài khoản?{' '}
              <Link to="/login" className="font-medium hover:underline" style={{ color: '#FF6B6B' }}>
                Đăng nhập ngay
              </Link>
            </p>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center mt-5 text-xs" style={{ color: '#94A3B8' }}>
          &copy; {new Date().getFullYear()} KidGarden · Hệ thống quản lý mầm non
        </p>
      </div>
    </div>
  );
}