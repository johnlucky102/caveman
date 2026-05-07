import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  BarChart3,
  Bell,
  Building2,
  CalendarCheck,
  ChevronLeft,
  ChevronRight,
  GraduationCap,
  History,
  Home,
  Settings,
  Users,
  UsersRound,
  Wallet,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/stores/appStore';
import { useAuthStore } from '@/stores/authStore';
import type { SidebarNavItem } from '@/types';
import type { AppRole } from '@/types/domain';
import { ROLE_LABELS } from '@/lib/rbac';

type NavItem = SidebarNavItem & { allow: AppRole[] };

const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard', path: '/', icon: Home, allow: ['Admin', 'Teacher', 'Accountant', 'Parent'] },
  { label: 'Học sinh', path: '/students', icon: Users, allow: ['Admin', 'Teacher', 'Accountant'] },
  { label: 'Lớp học', path: '/classes', icon: Building2, allow: ['Admin', 'Teacher', 'Accountant'] },
  { label: 'Giáo viên', path: '/teachers', icon: GraduationCap, allow: ['Admin'] },
  { label: 'Phụ huynh', path: '/parents', icon: UsersRound, allow: ['Admin', 'Teacher'] },
  { label: 'Điểm danh', path: '/attendance', icon: CalendarCheck, allow: ['Admin', 'Teacher'] },
  { label: 'Học phí', path: '/fees', icon: Wallet, allow: ['Admin', 'Accountant'] },
  { label: 'Báo cáo', path: '/reports', icon: BarChart3, allow: ['Admin', 'Teacher', 'Accountant'] },
  { label: 'Cài đặt', path: '/settings', icon: Settings, allow: ['Admin'] },
];

interface NavItemProps {
  item: SidebarNavItem;
  collapsed: boolean;
}

function NavItemRow({ item, collapsed }: NavItemProps) {
  const location = useLocation();
  const Icon = item.icon;
  const isActive = item.path === '/' ? location.pathname === '/' : location.pathname.startsWith(item.path);

  return (
    <NavLink
      to={item.path}
      title={collapsed ? item.label : undefined}
      className={cn(
        'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 group relative',
        isActive ? 'bg-primary text-white shadow-sm' : 'text-[#64748B] hover:bg-[#F1F5F9] hover:text-[#1E293B]',
        collapsed && 'justify-center px-2'
      )}
    >
      <Icon
        className={cn(
          'shrink-0 transition-colors',
          isActive ? 'text-white' : 'text-[#94A3B8] group-hover:text-[#1E293B]',
          collapsed ? 'w-5 h-5' : 'w-4 h-4'
        )}
      />
      {!collapsed && <span className="flex-1 truncate">{item.label}</span>}
      {collapsed && (
        <span className="absolute left-full ml-2 px-2 py-1 bg-[#1E293B] text-white text-xs rounded-md opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity whitespace-nowrap z-50">
          {item.label}
        </span>
      )}
    </NavLink>
  );
}

export default function Sidebar() {
  const { sidebarOpen, sidebarCollapsed, setSidebarOpen, toggleSidebarCollapsed } = useAppStore();
  const { role } = useAuthStore();
  const navItems = NAV_ITEMS.filter((item) => role && item.allow.includes(role));

  return (
    <>
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/40 z-30 lg:hidden" onClick={() => setSidebarOpen(false)} aria-hidden="true" />
      )}

      <aside
        className={cn(
          'fixed top-0 left-0 h-full bg-white border-r border-[#E2E8F0] z-40 flex flex-col transition-all duration-300 ease-in-out',
          sidebarCollapsed ? 'w-16' : 'w-64',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full',
          'lg:translate-x-0'
        )}
      >
        <div
          className={cn(
            'flex items-center h-16 border-b border-[#E2E8F0] px-4 shrink-0',
            sidebarCollapsed ? 'justify-center' : 'justify-between'
          )}
        >
          {!sidebarCollapsed ? (
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-primary flex items-center justify-center shrink-0">
                <span className="text-white font-bold text-sm">K</span>
              </div>
              <div className="leading-tight">
                <p className="font-bold text-[#1E293B] text-sm">KidGarden</p>
                <p className="text-[10px] text-[#64748B]">Quản lý mầm non</p>
              </div>
            </div>
          ) : (
            <div className="w-8 h-8 rounded-xl bg-primary flex items-center justify-center">
              <span className="text-white font-bold text-sm">K</span>
            </div>
          )}

          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden p-1 rounded-lg text-[#64748B] hover:text-[#1E293B] hover:bg-[#F1F5F9]"
            aria-label="Đóng sidebar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-1">
          {navItems.map((item) => (
            <NavItemRow key={item.path} item={item} collapsed={sidebarCollapsed} />
          ))}
        </nav>

        {!sidebarCollapsed && role && (
          <div className="px-3 pb-3 text-xs text-[#64748B]">{ROLE_LABELS[role]}</div>
        )}

        <div className="hidden lg:flex border-t border-[#E2E8F0] px-2 py-3">
          <button
            onClick={toggleSidebarCollapsed}
            className="flex items-center gap-2 w-full px-3 py-2 rounded-xl text-[#64748B] hover:text-[#1E293B] hover:bg-[#F1F5F9] text-sm transition-colors"
            aria-label={sidebarCollapsed ? 'Mở rộng sidebar' : 'Thu gọn sidebar'}
          >
            {sidebarCollapsed ? (
              <ChevronRight className="w-4 h-4 mx-auto" />
            ) : (
              <>
                <ChevronLeft className="w-4 h-4" />
                <span className="text-xs font-medium">Thu gọn</span>
              </>
            )}
          </button>
        </div>
      </aside>
    </>
  );
}
