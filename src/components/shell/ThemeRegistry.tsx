'use client';

import { ThemeModeProvider } from '@/lib/theme-context';

export function ThemeRegistry({ children }: { children: React.ReactNode }) {
  return <ThemeModeProvider>{children}</ThemeModeProvider>;
}
