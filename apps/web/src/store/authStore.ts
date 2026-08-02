import { create } from "zustand";
import { persist } from "zustand/middleware";
import { authApi } from "@/lib/api";

export interface User {
  id: string;
  email: string;
  username: string;
  displayName?: string;
  avatarUrl?: string;
  bio?: string;
  role?: "ADMIN" | "USER" | "MODERATOR";
  googleId?: string | null;
  twoFactorEnabled?: boolean;
  isLocked?: boolean;
}

export interface RegisterInput {
  email: string;
  username: string;
  displayName?: string;
  password: string;
  turnstileToken?: string;
}

export interface LoginResult {
  success?: boolean;
  user?: User;
  require2FA?: boolean;
  tempToken?: string;
}

interface AuthState {
  user: User | null;
  isLoading: boolean;
  setUser: (user: User | null) => void;
  login: (
    email: string,
    password: string,
    turnstileToken?: string,
  ) => Promise<LoginResult>;
  register: (input: RegisterInput) => Promise<LoginResult>;
  logout: () => Promise<void>;
  fetchMe: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isLoading: false,

      setUser: (user) => {
        if (typeof window !== "undefined") {
          if (user) {
            document.cookie = "cineverse-auth=true; path=/; max-age=31536000";
          } else {
            document.cookie =
              "cineverse-auth=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
          }
        }
        set({ user });
      },

      login: async (email, password, turnstileToken) => {
        set({ isLoading: true });
        try {
          const { data } = await authApi.login({
            email,
            password,
            turnstileToken,
          });
          if (data && data.require2FA) {
            set({ isLoading: false });
            return data as LoginResult;
          }
          set({ isLoading: false });
          const { data: user } = await authApi.getMe();
          get().setUser(user);
          return { success: true, user };
        } catch (err) {
          set({ isLoading: false });
          throw err;
        }
      },

      register: async ({ email, username, password, turnstileToken }) => {
        set({ isLoading: true });
        try {
          await authApi.register({ email, username, password, turnstileToken });
          set({ isLoading: false });
          const { data: user } = await authApi.getMe();
          get().setUser(user);
          return { success: true, user };
        } catch (err) {
          set({ isLoading: false });
          throw err;
        }
      },

      logout: async () => {
        try {
          const { signOut, firebaseAuth } = await import("@/lib/firebase");
          await signOut(firebaseAuth);
          await authApi.logout();
        } catch (e) {
          console.error("Logout error:", e);
        }
        get().setUser(null);
      },

      fetchMe: async () => {
        try {
          const { data } = await authApi.getMe();
          get().setUser(data);
        } catch {
          // Persisted UI state is not proof of an API session. Clearing it
          // avoids presenting a user as signed in when its cookie session has
          // expired or was revoked on another device.
          get().setUser(null);
        }
      },
    }),
    {
      name: "cineverse-auth",
      partialize: (state) => ({ user: state.user }),
    },
  ),
);
