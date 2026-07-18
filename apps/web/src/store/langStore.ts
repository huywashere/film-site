import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { vi } from '@/locales/vi';
import { en } from '@/locales/en';

type Lang = 'vi' | 'en';

interface LangState {
  lang: Lang;
  setLang: (lang: Lang) => void;
}

export const useLangStore = create<LangState>()(
  persist(
    (set) => ({
      lang: 'vi',
      setLang: (lang) => set({ lang }),
    }),
    {
      name: 'cineverse-lang',
    }
  )
);

import { useEffect, useState } from 'react';

const dictionaries: Record<Lang, any> = { vi, en };

export function useTranslation() {
  const { lang, setLang } = useLangStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const t = (key: string, fallback?: string): string => {
    const currentLang = mounted ? lang : 'vi';
    const keys = key.split('.');
    let value = dictionaries[currentLang];
    for (const k of keys) {
      if (value && k in value) {
        value = value[k];
      } else {
        return fallback || key;
      }
    }
    return typeof value === 'string' ? value : (fallback || key);
  };

  return { t, lang: mounted ? lang : 'vi', setLang, mounted };
}
