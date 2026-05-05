import { create } from 'zustand';
import { type ToastMessage, type ToastType } from '../types';

interface AppState {
  // Sidebar
  sidebarOpen: boolean;
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  toggleSidebarCollapsed: () => void;

  // Toasts
  toasts: ToastMessage[];
  addToast: (type: ToastType, title: string, message?: string, duration?: number) => void;
  removeToast: (id: string) => void;
  clearToasts: () => void;

  // Global loading
  globalLoading: boolean;
  setGlobalLoading: (loading: boolean) => void;

  // Page title
  pageTitle: string;
  setPageTitle: (title: string) => void;

  // Search
  searchQuery: string;
  setSearchQuery: (query: string) => void;

  // Notification badge count
  unreadNotifications: number;
  setUnreadNotifications: (count: number) => void;
  decrementUnreadNotifications: () => void;

  // Modal state (generic overlay)
  activeModal: string | null;
  openModal: (modalId: string) => void;
  closeModal: () => void;
}

let toastIdCounter = 0;

export const useAppStore = create<AppState>((set, get) => ({
  // ─── Sidebar ────────────────────────────────────────────────────────────────
  sidebarOpen: true,
  sidebarCollapsed: false,

  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  toggleSidebarCollapsed: () =>
    set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),

  // ─── Toasts ─────────────────────────────────────────────────────────────────
  toasts: [],

  addToast: (type, title, message, duration = 4000) => {
    const id = `toast-${++toastIdCounter}-${Date.now()}`;
    const toast: ToastMessage = { id, type, title, message, duration };
    set((state) => ({ toasts: [...state.toasts, toast] }));

    // Auto-remove after duration
    if (duration && duration > 0) {
      setTimeout(() => {
        get().removeToast(id);
      }, duration);
    }
  },

  removeToast: (id) =>
    set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),

  clearToasts: () => set({ toasts: [] }),

  // ─── Global loading ──────────────────────────────────────────────────────────
  globalLoading: false,
  setGlobalLoading: (loading) => set((state) => {
    if (state.globalLoading === loading) return state;
    return { globalLoading: loading };
  }),

  // ─── Page title ──────────────────────────────────────────────────────────────
  pageTitle: 'KidGarden',
  setPageTitle: (title) => set((state) => {
    if (state.pageTitle === title) return state;
    return { pageTitle: title };
  }),

  // ─── Search ──────────────────────────────────────────────────────────────────
  searchQuery: '',
  setSearchQuery: (query) => set((state) => {
    if (state.searchQuery === query) return state;
    return { searchQuery: query };
  }),

  // ─── Notifications ───────────────────────────────────────────────────────────
  unreadNotifications: 0,
  setUnreadNotifications: (count) => set((state) => {
    if (state.unreadNotifications === count) return state;
    return { unreadNotifications: count };
  }),
  decrementUnreadNotifications: () =>
    set((state) => ({
      unreadNotifications: Math.max(0, state.unreadNotifications - 1),
    })),

  // ─── Modal ───────────────────────────────────────────────────────────────────
  activeModal: null,
  openModal: (modalId) => set({ activeModal: modalId }),
  closeModal: () => set({ activeModal: null }),
}));

// Convenience selectors
export const selectToasts = (state: AppState) => state.toasts;
export const selectSidebarOpen = (state: AppState) => state.sidebarOpen;
export const selectSidebarCollapsed = (state: AppState) => state.sidebarCollapsed;
export const selectPageTitle = (state: AppState) => state.pageTitle;
export const selectUnreadNotifications = (state: AppState) => state.unreadNotifications;

export default useAppStore;
