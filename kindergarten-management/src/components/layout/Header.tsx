import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, ChevronDown, LogOut, Menu, Search, Settings, User, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/stores/authStore';
import { useAppStore } from '@/stores/appStore';
import { ROLE_LABELS } from '@/lib/rbac';

interface UserMenuProps {
  onClose: () => void;
}

function UserMenu({ onClose }: UserMenuProps) {
  const navigate = useNavigate();
  const { user, profile, role, logout } = useAuthStore();
  const fullName = profile?.full_name || user?.user_metadata?.full_name || user?.user_metadata?.name || user?.email?.split('@')[0] || 'Người dùng';

  const handleLogout = async () => {
    onClose();
    await logout();
    navigate('/login');
  };

  return (
    <div className="absolute right-0 top-full mt-2 w-56 bg-white border border-[#E2E8F0] rounded-xl shadow-lg z-50 overflow-hidden animate-fade-in">
      <div className="px-4 py-3 border-b border-[#E2E8F0] bg-[#F8FAFC]">
        <p className="font-semibold text-[#1E293B] text-sm truncate">{fullName}</p>
        <p className="text-xs text-[#64748B] truncate">{user?.email}</p>
        {role && <p className="text-xs text-[#94A3B8] mt-1">{ROLE_LABELS[role]}</p>}
      </div>
      <div className="py-1.5">
        <button
          onClick={() => {
            navigate('/settings');
            onClose();
          }}
          className="flex items-center gap-2.5 w-full px-4 py-2 text-sm text-[#1E293B] hover:bg-[#F1F5F9] transition-colors"
        >
          <User className="w-4 h-4 text-[#64748B]" />
          Hồ sơ cá nhân
        </button>
        <button
          onClick={() => {
            navigate('/settings');
            onClose();
          }}
          className="flex items-center gap-2.5 w-full px-4 py-2 text-sm text-[#1E293B] hover:bg-[#F1F5F9] transition-colors"
        >
          <Settings className="w-4 h-4 text-[#64748B]" />
          Cài đặt
        </button>
      </div>
      <div className="py-1.5 border-t border-[#E2E8F0]">
        <button onClick={handleLogout} className="flex items-center gap-2.5 w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors">
          <LogOut className="w-4 h-4" />
          Đăng xuất
        </button>
      </div>
    </div>
  );
}

export default function Header() {
  const navigate = useNavigate();
  const { toggleSidebar, unreadNotifications } = useAppStore();
  const { user, profile } = useAuthStore();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
  const [searchValue, setSearchValue] = useState('');
  const userMenuRef = useRef<HTMLDivElement>(null);

  const fullName = profile?.full_name || user?.user_metadata?.full_name || user?.user_metadata?.name || user?.email?.split('@')[0] || 'Người dùng';
  const initials = fullName
    .split(' ')
    .slice(-2)
    .map((name) => name[0]?.toUpperCase())
    .join('');

  useEffect(() => {
    const onClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  const handleSearchKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' && searchValue.trim()) {
      navigate(`/students?search=${encodeURIComponent(searchValue.trim())}`);
    }
    if (event.key === 'Escape') {
      setSearchValue('');
      setSearchFocused(false);
    }
  };

  return (
    <header className="h-16 bg-white border-b border-[#E2E8F0] flex items-center gap-4 px-4 lg:px-6 shrink-0">
      <button onClick={toggleSidebar} className="lg:hidden p-2 rounded-lg text-[#64748B] hover:text-[#1E293B] hover:bg-[#F1F5F9] transition-colors" aria-label="Mở menu">
        <Menu className="w-5 h-5" />
      </button>

      <div
        className={cn(
          'flex items-center gap-2 flex-1 max-w-md bg-[#F8FAFC] border rounded-xl px-3 py-2 transition-all duration-150',
          searchFocused ? 'border-primary ring-2 ring-primary/10' : 'border-[#E2E8F0]'
        )}
      >
        <Search className="w-4 h-4 text-[#94A3B8] shrink-0" />
        <input
          type="text"
          value={searchValue}
          onChange={(e) => setSearchValue(e.target.value)}
          onFocus={() => setSearchFocused(true)}
          onBlur={() => setSearchFocused(false)}
          onKeyDown={handleSearchKeyDown}
          placeholder="Tìm kiếm học sinh, lớp học..."
          className="flex-1 bg-transparent text-sm text-[#1E293B] placeholder:text-[#94A3B8] outline-none"
        />
        {searchValue && (
          <button onClick={() => setSearchValue('')} className="p-0.5 text-[#94A3B8] hover:text-[#64748B] transition-colors">
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      <div className="flex items-center gap-2 ml-auto">
        <button
          onClick={() => navigate('/notifications')}
          className="relative p-2 rounded-xl text-[#64748B] hover:text-[#1E293B] hover:bg-[#F1F5F9] transition-colors"
          aria-label="Thông báo"
        >
          <Bell className="w-5 h-5" />
          {unreadNotifications > 0 && (
            <span className="absolute top-1 right-1 w-4 h-4 bg-primary text-white text-[10px] font-bold rounded-full flex items-center justify-center leading-none">
              {unreadNotifications > 9 ? '9+' : unreadNotifications}
            </span>
          )}
        </button>

        <div ref={userMenuRef} className="relative">
          <button
            onClick={() => setShowUserMenu((prev) => !prev)}
            className="flex items-center gap-2 px-2 py-1.5 rounded-xl hover:bg-[#F1F5F9] transition-colors"
            aria-label="Menu người dùng"
          >
            <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white text-xs font-bold shrink-0">
              {initials || 'U'}
            </div>
            <span className="hidden sm:block text-sm font-medium text-[#1E293B] max-w-[120px] truncate">{fullName}</span>
            <ChevronDown className={cn('hidden sm:block w-3.5 h-3.5 text-[#64748B] transition-transform', showUserMenu && 'rotate-180')} />
          </button>
          {showUserMenu && <UserMenu onClose={() => setShowUserMenu(false)} />}
        </div>
      </div>
    </header>
  );
}
