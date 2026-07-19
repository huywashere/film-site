import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { authApi } from '@/lib/api';

interface User {
  id: string;
  email: string;
  username: string;
  displayName?: string;
  avatarUrl?: string;
  bio?: string;
  googleId?: string | null;
  twoFactorEnabled?: boolean;
  isLocked?: boolean;
}

interface AuthState {
  user: User | null;
  isLoading: boolean;
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

      login: async (email, password) => {
        set({ isLoading: true });
        try {
          const { data } = await authApi.login({ email, password });
          if (data && data.require2FA) {
            set({ isLoading: false });
            return data; // { require2FA: true, tempToken: "..." }
          }
          set({ isLoading: false });
          // Fetch user data
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
          await authApi.logout();
        } catch (e) {
          console.error('Logout failed on server', e);
        }
        set({ user: null });
      },

      fetchMe: async () => {
        try {
          const { data } = await authApi.getMe();
          set({ user: data });
        } catch {
          // Ignore, user is not logged in or token is invalid
          set({ user: null });
        }
      },
    }),
    {
      name: 'cineverse-auth',
      partialize: (state) => ({ user: state.user }),
    },
  ),
);
