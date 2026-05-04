import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error('Missing Supabase env vars. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    storageKey: 'kidgarden_session',
  },
});

export interface AuthUser {
  id: string;
  email?: string;
  user_metadata?: {
    full_name?: string;
    name?: string;
    role?: string;
    avatar_url?: string;
  };
}

export interface AuthSession {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
  user: AuthUser;
}

export interface AuthError {
  message: string;
  status?: number;
}

export async function signInWithPassword(
  email: string,
  password: string
): Promise<{ session: AuthSession | null; error: AuthError | null }> {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    return {
      session: null,
      error: {
        message: error.message || 'Email hoặc mật khẩu không chính xác.',
        status: error.status,
      },
    };
  }
  if (!data.session) return { session: null, error: { message: 'Không có phiên làm việc.' } };
  const session: AuthSession = {
    access_token: data.session.access_token,
    refresh_token: data.session.refresh_token,
    expires_in: data.session.expires_in,
    token_type: data.session.token_type,
    user: {
      id: data.session.user.id,
      email: data.session.user.email,
      user_metadata: data.session.user.user_metadata,
    },
  };
  return { session, error: null };
}

export async function signOut(): Promise<void> {
  await supabase.auth.signOut();
}

export async function getSession(): Promise<AuthSession | null> {
  const { data } = await supabase.auth.getSession();
  if (!data.session) return null;
  return {
    access_token: data.session.access_token,
    refresh_token: data.session.refresh_token,
    expires_in: data.session.expires_in,
    token_type: data.session.token_type,
    user: {
      id: data.session.user.id,
      email: data.session.user.email,
      user_metadata: data.session.user.user_metadata,
    },
  };
}

export function getCurrentUserFromSession(session: AuthSession | null): AuthUser | null {
  return session?.user ?? null;
}

export async function signUp(
  email: string,
  password: string,
  fullName: string,
  phone: string,
  role: string = 'Parent'
): Promise<{ session: AuthSession | null; error: AuthError | null }> {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
        phone,
        role,
      },
    },
  });

  if (error) {
    return {
      session: null,
      error: {
        message: error.message || 'Đăng ký thất bại. Vui lòng thử lại.',
        status: error.status,
      },
    };
  }

  if (!data.session) {
    return { session: null, error: null };
  }

  const session: AuthSession = {
    access_token: data.session.access_token,
    refresh_token: data.session.refresh_token,
    expires_in: data.session.expires_in,
    token_type: data.session.token_type,
    user: {
      id: data.session.user.id,
      email: data.session.user.email,
      user_metadata: data.session.user.user_metadata,
    },
  };

  return { session, error: null };
}

export default supabase;
