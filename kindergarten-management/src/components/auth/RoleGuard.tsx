import React from 'react';
import { Navigate } from 'react-router-dom';
import type { AppRole } from '@/types/domain';
import { useAuthStore } from '@/stores/authStore';

interface RoleGuardProps {
  allow: AppRole[];
  children: React.ReactNode;
}

export default function RoleGuard({ allow, children }: RoleGuardProps) {
  const { role, isAuthenticated } = useAuthStore();

  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (!role || !allow.includes(role)) return <Navigate to="/" replace />;

  return <>{children}</>;
}
