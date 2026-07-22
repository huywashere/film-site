import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { authApi } from '@/lib/api';

export interface User {
  id: string;
  email: string;
  username: string;
  displayName?: string;
  avatarUrl?: string;
  bio?: string;
  role?: 'ADMIN' | 'USER' | 'MODERATOR';
  googleId?: string | null;
  twoFactorEnabled?: boolean;
  isLocked?: boolean;
}

interface AuthState {
  user: User | null;
  isLoading: boolean;
  setUser: (user: User | null) => void;
  login: (email: string, password: string) => Promise<any>;
  register: (email: string, username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  fetchMe: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isLoading: false,

      setUser: (user) => {
        if (typeof window !== 'undefined') {
          if (user) {
            document.cookie = 'cineverse-auth=true; path=/; max-age=31536000';
          } else {
            document.cookie = 'cineverse-auth=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
          }
        }
        set({ user });
      },

      login: async (email, password) => {
        set({ isLoading: true });
        try {
          const { data } = await authApi.login({ email, password });
          if (data && data.require2FA) {
            set({ isLoading: false });
            return data;
          }
          set({ isLoading: false });
          const { data: user } = await authApi.getMe();
          set({ user });
          return { success: true };
        } catch (err) {
          set({ isLoading: false });
          throw err;
        }
      },

      register: async (email, username, password) => {
        set({ isLoading: true });
        try {
          await authApi.register({ email, username, password });
          set({ isLoading: false });
          const { data: user } = await authApi.getMe();
          set({ user });
        } catch (err) {
          set({ isLoading: false });
          throw err;
        }
      },

      logout: async () => {
        try {
          const { signOut, firebaseAuth } = await import('@/lib/firebase');
          await signOut(firebaseAuth);
          await authApi.logout();
        } catch (e) {
          console.error('Logout error:', e);
        }
        set({ user: null });
      },

      fetchMe: async () => {
        try {
          const { data } = await authApi.getMe();
          set({ user: data });
        } catch {
          // Keep persisted user if offline
        }
      },
    }),
    {
      name: 'cineverse-auth',
      partialize: (state) => ({ user: state.user }),
    },
  ),
);
