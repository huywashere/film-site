'use client';
import { useEffect } from 'react';
import { useThemeStore } from '@/store/themeStore';

export function ThemeWatcher() {
  const { theme } = useThemeStore();

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const root = document.documentElement;
      if (theme === 'light') {
        root.setAttribute('data-theme', 'light');
        root.classList.add('light');
        root.classList.remove('dark');
      } else {
        root.setAttribute('data-theme', 'dark');
        root.classList.add('dark');
        root.classList.remove('light');
      }
    }
  }, [theme]);

  return null;
}
