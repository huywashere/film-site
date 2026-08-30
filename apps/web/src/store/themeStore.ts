import { create } from "zustand";
import { persist } from "zustand/middleware";

export type Theme = "dark" | "light";

interface ThemeState {
  theme: Theme;
  pureBlack: boolean;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
  setPureBlack: (val: boolean) => void;
  togglePureBlack: () => void;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      theme: "dark",
      pureBlack: false,
      setTheme: (theme) => set({ theme }),
      toggleTheme: () =>
        set((state) => ({ theme: state.theme === "dark" ? "light" : "dark" })),
      setPureBlack: (pureBlack) => set({ pureBlack }),
      togglePureBlack: () => set((state) => ({ pureBlack: !state.pureBlack })),
    }),
    {
      name: "netphim-theme",
    },
  ),
);
