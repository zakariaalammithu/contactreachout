'use client';

import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';

export type SiteTheme = 'dark' | 'light';

const STORAGE_KEY = 'cr-theme';

const ThemeContext = createContext<{ theme: SiteTheme; toggleTheme: () => void }>({
  theme: 'dark',
  toggleTheme: () => undefined,
});

export function useTheme() {
  return useContext(ThemeContext);
}

/**
 * Site theme. Dark is the default (the running design); the user can switch
 * to light (white) mode from the dashboard header. The choice is persisted in
 * localStorage and applied as a `light` class on <html>, so every page flips
 * at once. A tiny inline script in the root layout applies the stored class
 * before paint to avoid a flash.
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<SiteTheme>('dark');

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored === 'light' || stored === 'dark') setTheme(stored);
    } catch {
      // Private mode etc: stay on the dark default.
    }
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'light') root.classList.add('light');
    else root.classList.remove('light');
    try {
      window.localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      // Ignore storage failures; the in-memory theme still applies.
    }
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme((current) => (current === 'light' ? 'dark' : 'light'));
  }, []);

  return <ThemeContext.Provider value={{ theme, toggleTheme }}>{children}</ThemeContext.Provider>;
}
