import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/components/common/Toast';

// ---------------------------------------------------------------------------
// Validation schema
// ---------------------------------------------------------------------------
const loginSchema = z.object({
  email: z
    .string()
    .min(1, 'Email không được để trống')
    .email('Email không hợp lệ'),
  password: z
    .string()
    .min(1, 'Mật khẩu không được để trống')
    .min(6, 'Mật khẩu phải có ít nhất 6 ký tự'),
});

type LoginFormValues = z.infer<typeof loginSchema>;

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuthStore();
  const [showPassword, setShowPassword] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [resetting, setResetting] = useState(false);
  const toast = useToast();

  const {
    register,
    handleSubmit,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = async (values: LoginFormValues) => {
    setServerError(null);
    const ok = await login(values.email, values.password);
    if (!ok) {
      setServerError('Email hoặc mật khẩu không đúng.');
      return;
    }

    navigate('/', { replace: true });
  };

  const handleForgotPassword = async () => {
    const email = getValues('email');
    if (!email || errors.email) {
      toast.error('Lỗi', 'Vui lòng nhập địa chỉ email hợp lệ trước khi đặt lại mật khẩu.');
      return;
    }
    
    setResetting(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setResetting(false);
    
    if (error) {
      toast.error('Lỗi', error.message);
    } else {
      toast.success('Thành công', 'Email hướng dẫn đặt lại mật khẩu đã được gửi.');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-[#F8FAFC]">
      {/* ------------------------------------------------------------------ */}
      {/* Decorative gradient blobs                                           */}
      {/* ------------------------------------------------------------------ */}
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
      <div
        aria-hidden="true"
        className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full opacity-5 blur-3xl"
        style={{ background: 'linear-gradient(135deg, #FF6B6B, #4ECDC4)' }}
      />

      {/* Subtle dot pattern */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            'radial-gradient(circle, #1E293B 1px, transparent 1px)',
          backgroundSize: '28px 28px',
        }}
      />

      {/* ------------------------------------------------------------------ */}
      {/* Login card                                                          */}
      {/* ------------------------------------------------------------------ */}
      <div className="relative z-10 w-full max-w-[440px] mx-4">
        <div
          className="bg-white rounded-3xl shadow-2xl px-10 py-10"
          style={{ boxShadow: '0 25px 60px rgba(0,0,0,0.12)' }}
        >
          {/* Logo & heading */}
          <div className="flex flex-col items-center mb-8">
            {/* Icon mark */}
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4 shadow-lg"
              style={{
                background: 'linear-gradient(135deg, #FF6B6B, #ff8e53)',
              }}
            >
              {/* Simple flower / garden icon */}
              <svg
                width="32"
                height="32"
                viewBox="0 0 32 32"
                fill="none"
                aria-hidden="true"
              >
                <circle cx="16" cy="16" r="5" fill="white" />
                <ellipse cx="16" cy="7" rx="4" ry="5" fill="white" opacity="0.85" />
                <ellipse cx="16" cy="25" rx="4" ry="5" fill="white" opacity="0.85" />
                <ellipse cx="7" cy="16" rx="5" ry="4" fill="white" opacity="0.85" />
                <ellipse cx="25" cy="16" rx="5" ry="4" fill="white" opacity="0.85" />
                <ellipse
                  cx="9.5"
                  cy="9.5"
                  rx="3.5"
                  ry="4.5"
                  fill="white"
                  opacity="0.6"
                  transform="rotate(-45 9.5 9.5)"
                />
                <ellipse
                  cx="22.5"
                  cy="9.5"
                  rx="3.5"
                  ry="4.5"
                  fill="white"
                  opacity="0.6"
                  transform="rotate(45 22.5 9.5)"
                />
                <ellipse
                  cx="9.5"
                  cy="22.5"
                  rx="3.5"
                  ry="4.5"
                  fill="white"
                  opacity="0.6"
                  transform="rotate(45 9.5 22.5)"
                />
                <ellipse
                  cx="22.5"
                  cy="22.5"
                  rx="3.5"
                  ry="4.5"
                  fill="white"
                  opacity="0.6"
                  transform="rotate(-45 22.5 22.5)"
                />
              </svg>
            </div>

            <h1
              className="text-3xl font-extrabold tracking-tight"
              style={{ color: '#FF6B6B' }}
            >
              KidGarden
            </h1>
            <p className="mt-1 text-sm text-center" style={{ color: '#64748B' }}>
              Hệ thống quản lý trường mầm non
            </p>
          </div>

          {/* Divider */}
          <div className="h-px bg-gradient-to-r from-transparent via-gray-200 to-transparent mb-7" />

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
                <svg
                  className="mt-0.5 shrink-0"
                  width="16"
                  height="16"
                  viewBox="0 0 16 16"
                  fill="none"
                  aria-hidden="true"
                >
                  <circle cx="8" cy="8" r="7.5" stroke="#EF4444" />
                  <path
                    d="M8 4.5v4M8 10.5v1"
                    stroke="#EF4444"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  />
                </svg>
                {serverError}
              </div>
            )}

            {/* Email field */}
            <div className="mb-5">
              <label
                htmlFor="email"
                className="block text-sm font-medium mb-1.5"
                style={{ color: '#1E293B' }}
              >
                Email
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="giaovien@kidgarden.vn"
                {...register('email')}
                className="w-full rounded-xl px-4 py-3 text-sm outline-none transition-all"
                style={{
                  border: errors.email ? '1.5px solid #EF4444' : '1.5px solid #E2E8F0',
                  background: '#F8FAFC',
                  color: '#1E293B',
                }}
                onFocus={(e) => {
                  if (!errors.email) {
                    e.currentTarget.style.border = '1.5px solid #FF6B6B';
                    e.currentTarget.style.boxShadow = '0 0 0 3px rgba(255,107,107,0.12)';
                  }
                }}
                onBlur={(e) => {
                  if (!errors.email) {
                    e.currentTarget.style.border = '1.5px solid #E2E8F0';
                    e.currentTarget.style.boxShadow = 'none';
                  }
                }}
              />
              {errors.email && (
                <p className="mt-1.5 text-xs" style={{ color: '#EF4444' }}>
                  {errors.email.message}
                </p>
              )}
            </div>

            {/* Password field */}
            <div className="mb-5">
              <div className="flex items-center justify-between mb-1.5">
                <label
                  htmlFor="password"
                  className="block text-sm font-medium"
                  style={{ color: '#1E293B' }}
                >
                  Mật khẩu
                </label>
                <button
                  type="button"
                  disabled={resetting}
                  className="text-xs font-medium transition-colors hover:underline disabled:opacity-50"
                  style={{ color: '#FF6B6B' }}
                  onClick={handleForgotPassword}
                >
                  {resetting ? 'Đang gửi...' : 'Quên mật khẩu?'}
                </button>
              </div>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="Nhập mật khẩu"
                  {...register('password')}
                  className="w-full rounded-xl px-4 py-3 pr-12 text-sm outline-none transition-all"
                  style={{
                    border: errors.password
                      ? '1.5px solid #EF4444'
                      : '1.5px solid #E2E8F0',
                    background: '#F8FAFC',
                    color: '#1E293B',
                  }}
                  onFocus={(e) => {
                    if (!errors.password) {
                      e.currentTarget.style.border = '1.5px solid #FF6B6B';
                      e.currentTarget.style.boxShadow =
                        '0 0 0 3px rgba(255,107,107,0.12)';
                    }
                  }}
                  onBlur={(e) => {
                    if (!errors.password) {
                      e.currentTarget.style.border = '1.5px solid #E2E8F0';
                      e.currentTarget.style.boxShadow = 'none';
                    }
                  }}
                />
                <button
                  type="button"
                  aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiển thị mật khẩu'}
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-lg transition-colors"
                  style={{ color: '#94A3B8' }}
                >
                  {showPassword ? (
                    <EyeOff size={18} />
                  ) : (
                    <Eye size={18} />
                  )}
                </button>
              </div>
              {errors.password && (
                <p className="mt-1.5 text-xs" style={{ color: '#EF4444' }}>
                  {errors.password.message}
                </p>
              )}
            </div>

            {/* Submit button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold text-white transition-all active:scale-[0.98]"
              style={{
                background: isSubmitting
                  ? '#FDA4A4'
                  : 'linear-gradient(135deg, #FF6B6B, #ff4f4f)',
                boxShadow: isSubmitting
                  ? 'none'
                  : '0 4px 15px rgba(255,107,107,0.4)',
                cursor: isSubmitting ? 'not-allowed' : 'pointer',
              }}
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Đang đăng nhập…
                </>
              ) : (
                'Đăng nhập'
              )}
            </button>
          </form>
        </div>

        {/* Footer note */}
        <p className="text-center mt-5 text-xs" style={{ color: '#94A3B8' }}>
          &copy; {new Date().getFullYear()} KidGarden · Hệ thống quản lý mầm non
        </p>

        {/* Sign up link */}
        <p className="text-center mt-3 text-sm" style={{ color: '#64748B' }}>
          Chưa có tài khoản?{' '}
          <Link to="/signup" className="font-semibold hover:underline" style={{ color: '#FF6B6B' }}>
            Đăng ký ngay
          </Link>
        </p>
      </div>
    </div>
  );
}
