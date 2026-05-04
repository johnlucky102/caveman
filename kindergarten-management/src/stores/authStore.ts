import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  getCurrentUserFromSession,
  getSession,
  signInWithPassword,
  signOut,
  supabase,
  type AuthSession,
  type AuthUser,
} from '@/lib/supabase';
import type { AppRole, UserProfile } from '@/types/domain';
import { fetchMyProfile, normalizeRole } from '@/services/usersService';

interface AuthState {
  user: AuthUser | null;
  session: AuthSession | null;
  profile: UserProfile | null;
  role: AppRole | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  clearError: () => void;
  initializeAuth: () => Promise<void>;
  hasRole: (roles: AppRole[]) => boolean;
}

function mapSessionToRole(user?: AuthUser | null, profile?: UserProfile | null): AppRole {
  if (profile?.role) return profile.role;
  return normalizeRole(user?.user_metadata?.role);
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number, fallback: T): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((resolve) => setTimeout(() => resolve(fallback), timeoutMs)),
  ]);
}

async function hydrateProfile(user: AuthUser | null): Promise<UserProfile | null> {
  if (!user?.id) return null;
  try {
    const result = await withTimeout(fetchMyProfile(user.id), 7000, { profile: null, error: null });
    return result.profile;
  } catch {
    return null;
  }
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      session: null,
      profile: null,
      role: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      login: async (email: string, password: string): Promise<boolean> => {
        set({ isLoading: true, error: null });
        try {
          const { session, error } = await withTimeout(
            signInWithPassword(email, password),
            10000,
            { session: null, error: { message: 'Đăng nhập timeout.' } }
          );

          if (error || !session) {
            set({
              isLoading: false,
              error: error?.message || 'Đăng nhập thất bại.',
              isAuthenticated: false,
              user: null,
              session: null,
              profile: null,
              role: null,
            });
            return false;
          }

          const user = session.user;
          const profile = await withTimeout(hydrateProfile(user), 7000, null);
          const role = mapSessionToRole(user, profile);

          set({
            isLoading: false,
            session,
            user,
            profile,
            role,
            isAuthenticated: true,
            error: null,
          });
          return true;
        } catch (err) {
          const message = err instanceof Error ? err.message : 'Đăng nhập thất bại.';
          set({
            isLoading: false,
            error: message,
            isAuthenticated: false,
            user: null,
            session: null,
            profile: null,
            role: null,
          });
          return false;
        }
      },

      logout: async () => {
        set({ isLoading: true });
        try {
          await signOut();
        } catch {
          // ignore
        } finally {
          set({
            user: null,
            session: null,
            profile: null,
            role: null,
            isAuthenticated: false,
            isLoading: false,
            error: null,
          });
        }
      },

      clearError: () => set({ error: null }),

      initializeAuth: async () => {
        const state = get();
        if (state.isLoading) return;

        set({ isLoading: true, error: null });
        try {
          const session = await withTimeout(getSession(), 7000, null);
          const user = getCurrentUserFromSession(session);

          if (!session || !user) {
            set({
              user: null,
              session: null,
              profile: null,
              role: null,
              isAuthenticated: false,
              isLoading: false,
            });
            return;
          }

          const profile = await withTimeout(hydrateProfile(user), 7000, null);
          const role = mapSessionToRole(user, profile);
          set({
            user,
            session,
            profile,
            role,
            isAuthenticated: true,
            isLoading: false,
          });
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Không thể khởi tạo phiên đăng nhập.';
          set({
            isLoading: false,
            error: message,
            isAuthenticated: false,
            user: null,
            session: null,
            role: null,
            profile: null,
          });
        }
      },

      hasRole: (roles) => {
        const role = get().role;
        if (!role) return false;
        return roles.includes(role);
      },
    }),
    {
      name: 'kidgarden-auth',
      partialize: (state) => ({
        user: state.user,
        session: state.session,
        profile: state.profile,
        role: state.role,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);

supabase.auth.onAuthStateChange(async (event, session) => {
  try {
    if (event === 'SIGNED_OUT') {
      useAuthStore.setState({
        user: null,
        session: null,
        profile: null,
        role: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
      });
      return;
    }

    if (!session) return;

    const authSession: AuthSession = {
      access_token: session.access_token,
      refresh_token: session.refresh_token,
      expires_in: session.expires_in,
      token_type: session.token_type,
      user: {
        id: session.user.id,
        email: session.user.email,
        user_metadata: session.user.user_metadata,
      },
    };

    const user = authSession.user;
    const profile = await withTimeout(hydrateProfile(user), 7000, null);
    const role = mapSessionToRole(user, profile);

    useAuthStore.setState({
      session: authSession,
      user,
      profile,
      role,
      isAuthenticated: true,
      isLoading: false,
      error: null,
    });
  } catch {
    useAuthStore.setState({
      isLoading: false,
      isAuthenticated: false,
      user: null,
      session: null,
      role: null,
      profile: null,
      error: null,
    });
  }
});

export default useAuthStore;
