import { useState } from 'react';
import { Icon } from './icons';

export type Theme = 'dark' | 'light';
const KEY = 'olga-admin.theme';

/** Saved choice first, then the OS preference. */
export function storedTheme(): Theme {
  try {
    const saved = localStorage.getItem(KEY);
    if (saved === 'light' || saved === 'dark') return saved;
  } catch { /* storage unavailable */ }
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function applyTheme(theme: Theme, persist = false) {
  document.documentElement.dataset.theme = theme;
  if (!persist) return;
  try { localStorage.setItem(KEY, theme); } catch { /* storage unavailable */ }
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>(storedTheme);
  const next: Theme = theme === 'dark' ? 'light' : 'dark';
  return (
    <button className="icon-btn" onClick={() => { applyTheme(next, true); setTheme(next); }}
      aria-label={`Switch to ${next} theme`} title={`Switch to ${next} theme`}>
      <Icon name={theme === 'dark' ? 'sun' : 'moon'} />
    </button>
  );
}
