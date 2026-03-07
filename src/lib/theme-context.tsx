'use client';

import { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { ThemeProvider, CssBaseline } from '@mui/material';
import { darkTheme, lightTheme, D3_TOKENS, type D3Tokens } from './theme';

type ThemeMode = 'dark' | 'light';

interface ThemeModeContextValue {
  mode: ThemeMode;
  toggleMode: () => void;
  d3Tokens: D3Tokens;
}

const ThemeModeContext = createContext<ThemeModeContextValue>({
  mode: 'dark',
  toggleMode: () => {},
  d3Tokens: D3_TOKENS.dark,
});

export function useThemeMode() {
  return useContext(ThemeModeContext);
}

export function ThemeModeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setMode] = useState<ThemeMode>('dark');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem('theme-mode') as ThemeMode | null;
    if (stored === 'light' || stored === 'dark') {
      setMode(stored);
    }
    setMounted(true);
  }, []);

  const toggleMode = () => {
    setMode((prev) => {
      const next = prev === 'dark' ? 'light' : 'dark';
      localStorage.setItem('theme-mode', next);
      return next;
    });
  };

  const theme = mode === 'dark' ? darkTheme : lightTheme;
  const d3Tokens = D3_TOKENS[mode];

  const value = useMemo(
    () => ({ mode, toggleMode, d3Tokens }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [mode],
  );

  // Prevent flash of wrong theme on SSR
  if (!mounted) {
    return (
      <ThemeProvider theme={darkTheme}>
        <CssBaseline />
        <div style={{ visibility: 'hidden' }}>{children}</div>
      </ThemeProvider>
    );
  }

  return (
    <ThemeModeContext.Provider value={value}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </ThemeProvider>
    </ThemeModeContext.Provider>
  );
}
