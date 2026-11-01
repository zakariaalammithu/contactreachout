'use client';

import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { isPublicRoute } from './theme-sections';

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
 * Split theme system (2026-11-01).
 *
 * - Public website routes (homepage, pricing, about, contact, ...) are
 *   ALWAYS dark. The dashboard theme choice never changes them, so a
 *   dashboard toggle cannot spoil the public site's default theme.
 * - Dashboard / admin / campaign / CRM and every other app route follow
 *   the stored dashboard preference, defaulting to WHITE (light) when
 *   nothing is stored. The toggle in the dashboard header flips that
 *   stored preference, so the whole dashboard, admin and campaign
 *   interface flips at once — every page, card, table, form, modal,
 *   dropdown and the sidebar together, because they all read the same
 *   `light` class on <html>.
 * - The choice persists in localStorage across logins and page refreshes.
 *   A stored value always wins over the default, so a user who chose dark
 *   keeps dark.
 * - `theme` is the EFFECTIVE theme for the current page (public pages
 *   always report 'dark'), so consumers such as the signup logo pick the
 *   variant that matches what is actually rendered.
 * - The inline script in the root layout applies the same rule before
 *   paint to avoid a flash; this provider re-applies it on navigation,
 *   because client-side route changes do not re-run that script. While
 *   the stored value is still loading, the provider leaves the class
 *   alone so the script's pre-paint choice stands.
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [dashboardTheme, setDashboardTheme] = useState<SiteTheme | null>(null);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      setDashboardTheme(stored === 'dark' ? 'dark' : 'light');
    } catch {
      // Private mode etc: fall back to the dashboard default (white).
      setDashboardTheme('light');
    }
  }, []);

  const publicPage = isPublicRoute(pathname);
  const theme: SiteTheme = publicPage ? 'dark' : (dashboardTheme ?? 'dark');

  useEffect(() => {
    if (dashboardTheme === null) return;
    const root = document.documentElement;
    if (publicPage) root.classList.remove('light');
    else if (dashboardTheme === 'light') root.classList.add('light');
    else root.classList.remove('light');
  }, [dashboardTheme, publicPage]);

  useEffect(() => {
    if (dashboardTheme === null) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, dashboardTheme);
    } catch {
      // Ignore storage failures; the in-memory theme still applies.
    }
  }, [dashboardTheme]);

  const toggleTheme = useCallback(() => {
    setDashboardTheme((current) => ((current ?? 'light') === 'light' ? 'dark' : 'light'));
  }, []);

  return <ThemeContext.Provider value={{ theme, toggleTheme }}>{children}</ThemeContext.Provider>;
}
