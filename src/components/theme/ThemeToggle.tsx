'use client';

import { Moon, Sun } from 'lucide-react';
import { useTheme } from './ThemeProvider';

/**
 * Dark/light switch. Shows a sun in dark mode (tap for white mode) and a moon
 * in light mode (tap to go back). Styled like the other round header controls
 * so the light-mode stylesheet recolors it automatically.
 */
export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const toLight = theme === 'dark';

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={toLight ? 'Switch to light mode' : 'Switch to dark mode'}
      title={toLight ? 'White mode' : 'Dark mode'}
      className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-zinc-800 bg-zinc-950 text-zinc-400 transition-colors hover:bg-zinc-900 hover:text-zinc-100 cursor-pointer"
    >
      {toLight ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </button>
  );
}
