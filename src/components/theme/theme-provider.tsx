'use client';

import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { DEFAULT_THEME, isThemeId, THEME_STORAGE_KEY, type ThemeId } from '@/lib/theme';

type Ctx = {
  theme: ThemeId;
  setTheme: (next: ThemeId) => void;
};

const ThemeContext = createContext<Ctx | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<ThemeId>(DEFAULT_THEME);

  useEffect(() => {
    const stored = typeof window !== 'undefined' ? window.localStorage.getItem(THEME_STORAGE_KEY) : null;
    if (isThemeId(stored)) setThemeState(stored);
  }, []);

  const setTheme = useCallback((next: ThemeId) => {
    setThemeState(next);
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {}
    document.documentElement.setAttribute('data-theme', next);
    document.documentElement.classList.toggle('dark', next.startsWith('dark'));
  }, []);

  return <ThemeContext.Provider value={{ theme, setTheme }}>{children}</ThemeContext.Provider>;
}

export function useTheme(): Ctx {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme fuera de ThemeProvider');
  return ctx;
}
