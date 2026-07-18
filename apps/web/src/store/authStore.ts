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
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, username: string, password: string) => Promise<void>;
  logout: () => void;
  fetchMe: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      isLoading: false,

      login: async (email, password) => {
        set({ isLoading: true });
        try {
          const { data } = await authApi.login({ email, password });
          localStorage.setItem('accessToken', data.accessToken);
          localStorage.setItem('refreshToken', data.refreshToken);
          set({ accessToken: data.accessToken, isLoading: false });
          // Fetch user data
          const { data: user } = await authApi.getMe();
          set({ user });
        } catch (err) {
          set({ isLoading: false });
          throw err;
        }
      },

      register: async (email, username, password) => {
        set({ isLoading: true });
        try {
          const { data } = await authApi.register({ email, username, password });
          localStorage.setItem('accessToken', data.accessToken);
          localStorage.setItem('refreshToken', data.refreshToken);
          set({ accessToken: data.accessToken, isLoading: false });
          const { data: user } = await authApi.getMe();
          set({ user });
        } catch (err) {
          set({ isLoading: false });
          throw err;
        }
      },

      logout: () => {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        set({ user: null, accessToken: null });
      },

      fetchMe: async () => {
        const token = localStorage.getItem('accessToken');
        if (!token) return;
        try {
          const { data } = await authApi.getMe();
          set({ user: data });
        } catch {
          // Token invalid
        }
      },
    }),
    {
      name: 'cineverse-auth',
      partialize: (state) => ({ user: state.user, accessToken: state.accessToken }),
    },
  ),
);
