'use client';
import { useEffect } from 'react';
import { useThemeStore } from '@/store/themeStore';

export function ThemeWatcher() {
  const { theme } = useThemeStore();

  useEffect(() => {
    if (typeof window !== 'undefined') {
      document.documentElement.setAttribute('data-theme', theme);
    }
  }, [theme]);

  return null;
}
