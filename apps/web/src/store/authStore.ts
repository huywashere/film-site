import { create } from "zustand";
import { persist } from "zustand/middleware";
import { authApi } from "@/lib/api";

export interface User {
  id: string;
  email: string;
  username: string;
  displayName?: string;
  avatarUrl?: string;
  nameColor?: string;
  avatarFrameColor?: string;
  bio?: string;
  role?: "ADMIN" | "USER" | "MODERATOR" | "CONTENT_EDITOR" | "OPERATIONS" | "ANALYST";
  adminAccessEnabled?: boolean;
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
  requiresEmailVerification?: boolean;
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
            document.cookie = "netphim-auth=true; path=/; max-age=31536000";
          } else {
            document.cookie =
              "netphim-auth=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
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
          const { data } = await authApi.register({
            email,
            username,
            password,
            turnstileToken,
          });
          set({ isLoading: false });
          get().setUser(null);
          return {
            success: true,
            requiresEmailVerification: Boolean(data?.requiresEmailVerification),
          };
        } catch (err) {
          set({ isLoading: false });
          throw err;
        }
      },

      logout: async () => {
        try {
          const { signOut, firebaseAuth } = await import("@/lib/firebase");
          if (firebaseAuth) await signOut(firebaseAuth);
          await authApi.logout();
        } catch (e) {
          console.error("Logout error:", e);
        }
        get().setUser(null);
      },

      fetchMe: async () => {
        try {
          const { data } = await authApi.getMe();
          if (data && (data.id || data.username || data.email)) {
            const currentUser = get().user;
            const avatarUrl =
              data.avatarUrl || currentUser?.avatarUrl || undefined;
            get().setUser({ ...data, avatarUrl });
            return;
          }
        } catch {
          // If backend fetch fails (e.g. offline/guest mode), check Firebase Auth user
          try {
            const { firebaseAuth } = await import("@/lib/firebase");
            const fbUser = firebaseAuth?.currentUser;
            if (fbUser) {
              const name =
                fbUser.displayName || fbUser.email?.split("@")[0] || "User";
              get().setUser({
                id: fbUser.uid,
                email: fbUser.email || `${fbUser.uid}@google.com`,
                username: fbUser.email?.split("@")[0] || fbUser.uid,
                displayName: name,
                avatarUrl: fbUser.photoURL || undefined,
                role: "USER",
              });
              return;
            }
          } catch {
            // Keep existing persisted user in Zustand
          }
        }
      },
    }),
    {
      name: "netphim-auth",
      partialize: (state) => ({ user: state.user }),
    },
  ),
);
