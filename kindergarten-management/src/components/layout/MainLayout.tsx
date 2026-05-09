import React, { useEffect } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import { useAuthStore } from '../../stores/authStore';
import { useAppStore } from '../../stores/appStore';
import { cn } from '../../lib/utils';
import Toast from '../common/Toast';

/**
 * MainLayout wraps all protected pages with sidebar + header.
 * Redirects to /login if user is not authenticated.
 */
const MainLayout: React.FC = () => {
  const { isAuthenticated, isLoading, hasInitialized, initializeAuth } = useAuthStore();
  const { sidebarCollapsed } = useAppStore();

  // On mount, hydrate auth from persisted session / Supabase session
  useEffect(() => {
    if (!hasInitialized) {
      void initializeAuth();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasInitialized]);

  // While checking auth, show a loading screen
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-primary flex items-center justify-center shadow-lg">
            <span className="text-white font-bold text-xl">K</span>
          </div>
          <div className="flex gap-1.5">
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className="w-2 h-2 bg-primary rounded-full animate-bounce"
                style={{ animationDelay: `${i * 0.15}s` }}
              />
            ))}
          </div>
          <p className="text-sm text-muted-foreground">Đang tải...</p>
        </div>
      </div>
    );
  }

  // Not authenticated → redirect to login
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <Sidebar />

      {/* Main content area */}
      <div
        className={cn(
          'flex-1 flex flex-col min-w-0 transition-all duration-300',
          // Offset for sidebar width on desktop
          sidebarCollapsed ? 'md:ml-16' : 'md:ml-64'
        )}
      >
        {/* Header */}
        <Header />

        {/* Page content */}
        <main className="flex-1 overflow-auto p-4 md:p-6">
          <Outlet />
        </main>
      </div>

      {/* Global toast notifications */}
      <Toast />
    </div>
  );
};

export default MainLayout;
