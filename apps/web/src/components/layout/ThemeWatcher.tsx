'use client';
import { useEffect } from 'react';
import { useThemeStore } from '@/store/themeStore';

export function ThemeWatcher() {
  const { setTheme } = useThemeStore();

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const root = document.documentElement;
      root.setAttribute('data-theme', 'dark');
      root.classList.add('dark');
      setTheme('dark'); // Force store to be dark
    }
  }, [setTheme]);

  return null;
}
