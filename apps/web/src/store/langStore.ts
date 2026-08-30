import { create } from "zustand";
import { persist } from "zustand/middleware";
import { useEffect, useState, useCallback } from "react";
import { vi } from "@/locales/vi";
import { en } from "@/locales/en";
import { fr } from "@/locales/fr";
import { it } from "@/locales/it";

export type Lang = "vi" | "en" | "fr" | "it";

interface LangState {
  lang: Lang;
  setLang: (lang: Lang) => void;
}

export const useLangStore = create<LangState>()(
  persist(
    (set) => ({
      lang: "vi",
      setLang: (lang) => set({ lang }),
    }),
    {
      name: "netphim-lang",
    },
  ),
);

const dictionaries: Record<Lang, any> = { vi, en, fr, it };

export function useTranslation() {
  const { lang, setLang: _setLang } = useLangStore();
  const [mounted, setMounted] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const t = (
    key: string,
    paramsOrFallback?: Record<string, string | number> | string,
    fallback?: string,
  ): string => {
    const currentLang = mounted ? lang : "vi";
    const keys = key.split(".");
    let value = dictionaries[currentLang] || dictionaries["vi"];

    for (const k of keys) {
      if (value && typeof value === "object" && k in value) {
        value = value[k];
      } else {
        // Try fallback to vi dictionary if currentLang missing this key
        let viValue = dictionaries["vi"];
        for (const vik of keys) {
          if (viValue && typeof viValue === "object" && vik in viValue) {
            viValue = viValue[vik];
          } else {
            viValue = null;
            break;
          }
        }
        value = viValue;
        break;
      }
    }

    let result = typeof value === "string" ? value : "";

    if (!result) {
      if (typeof paramsOrFallback === "string") return paramsOrFallback;
      return fallback || key;
    }

    if (paramsOrFallback && typeof paramsOrFallback === "object") {
      Object.entries(paramsOrFallback).forEach(([paramKey, paramVal]) => {
        result = result.replace(new RegExp(`{${paramKey}}`, "g"), String(paramVal));
      });
    }

    return result;
  };

  const setLang = useCallback(
    (newLang: Lang) => {
      if (newLang === lang || isTransitioning) return;
      setIsTransitioning(true);
      _setLang(newLang);
      setTimeout(() => setIsTransitioning(false), 300);
    },
    [lang, _setLang, isTransitioning],
  );

  return { t, lang: mounted ? lang : "vi", setLang, mounted, isTransitioning };
}
