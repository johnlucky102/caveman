import React from 'react';
import { Navigate } from 'react-router-dom';
import type { AppRole } from '@/types/domain';
import { useAuthStore } from '@/stores/authStore';

interface RoleGuardProps {
  allow: AppRole[];
  children: React.ReactNode;
}

export default function RoleGuard({ allow, children }: RoleGuardProps) {
  const { role, isAuthenticated, user } = useAuthStore();

  if (!isAuthenticated) return <Navigate to="/login" replace />;
  
  const effectiveRole: AppRole = role || (user?.user_metadata?.role as AppRole) || 'Parent';
  
  if (!allow.includes(effectiveRole)) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-sm border border-[#E2E8F0] p-8 text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-[#1E293B] mb-2">Không có quyền truy cập</h2>
          <p className="text-[#64748B] mb-6">
            Bạn không có quyền truy cập trang này. Vai trò của bạn: <strong>{effectiveRole}</strong>
          </p>
          <button
            onClick={() => window.history.back()}
            className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
          >
            Quay lại
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
