import { create } from 'zustand';

export type AuthModalMode = 'login' | 'register';

interface AuthModalState {
  isOpen: boolean;
  mode: AuthModalMode;
  openModal: (mode?: AuthModalMode) => void;
  closeModal: () => void;
  setMode: (mode: AuthModalMode) => void;
}

export const useAuthModalStore = create<AuthModalState>((set) => ({
  isOpen: false,
  mode: 'login',
  openModal: (mode = 'login') => set({ isOpen: true, mode }),
  closeModal: () => set({ isOpen: false }),
  setMode: (mode) => set({ mode }),
}));
