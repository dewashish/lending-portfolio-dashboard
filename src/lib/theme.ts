'use client';

import { createTheme, type Theme } from '@mui/material/styles';

// ── Shared base ──────────────────────────────────────────────────
const sharedTypography = {
  fontFamily: '"DM Sans", "Inter", "Helvetica Neue", sans-serif',
  h3: { fontWeight: 800, letterSpacing: '-0.02em' },
  h4: { fontWeight: 700, letterSpacing: '-0.01em' },
  h5: { fontWeight: 700 },
  h6: { fontWeight: 600 },
  caption: {
    fontFamily: '"IBM Plex Mono", "JetBrains Mono", monospace',
    fontSize: '0.75rem',
  },
  body2: { fontSize: '0.875rem' },
} as const;

const sharedShape = { borderRadius: 12 };

const sharedComponents = {
  MuiPaper: { styleOverrides: { root: { backgroundImage: 'none' } } },
  MuiTab: {
    styleOverrides: {
      root: { textTransform: 'none' as const, fontWeight: 600, fontSize: '0.875rem', minHeight: 48 },
    },
  },
  MuiChip: { styleOverrides: { root: { fontWeight: 600, fontSize: '0.75rem' } } },
  MuiButton: { styleOverrides: { root: { textTransform: 'none' as const, fontWeight: 600 } } },
};

// ── Dark Theme ───────────────────────────────────────────────────
export const darkTheme: Theme = createTheme({
  palette: {
    mode: 'dark',
    primary: { main: '#00897b', light: '#4db6ac', dark: '#00695c' },
    secondary: { main: '#ff6f00', light: '#ffa040', dark: '#c43e00' },
    background: { default: '#0a0f1a', paper: '#111827' },
    error: { main: '#ef5350' },
    warning: { main: '#ffa726' },
    success: { main: '#66bb6a' },
    info: { main: '#42a5f5' },
    divider: 'rgba(255,255,255,0.08)',
    text: { primary: '#e2e8f0', secondary: '#94a3b8' },
  },
  typography: {
    ...sharedTypography,
    subtitle1: { fontWeight: 500, color: '#94a3b8' },
    subtitle2: { fontWeight: 500, fontSize: '0.8rem', color: '#64748b' },
  },
  shape: sharedShape,
  components: {
    ...sharedComponents,
    MuiCard: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          border: '1px solid rgba(255,255,255,0.06)',
          backdropFilter: 'blur(20px)',
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: { borderColor: 'rgba(255,255,255,0.06)', fontSize: '0.8125rem' },
        head: { fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#64748b' },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: { backgroundImage: 'none', backgroundColor: '#0a0f1a', borderBottom: '1px solid rgba(255,255,255,0.06)' },
      },
    },
  },
});

// ── Light Theme ──────────────────────────────────────────────────
export const lightTheme: Theme = createTheme({
  palette: {
    mode: 'light',
    primary: { main: '#00796b', light: '#4db6ac', dark: '#004d40' },
    secondary: { main: '#e65100', light: '#ff9100', dark: '#bf360c' },
    background: { default: '#f5f7fa', paper: '#ffffff' },
    error: { main: '#d32f2f' },
    warning: { main: '#ed6c02' },
    success: { main: '#2e7d32' },
    info: { main: '#0288d1' },
    divider: 'rgba(0,0,0,0.08)',
    text: { primary: '#1e293b', secondary: '#64748b' },
  },
  typography: {
    ...sharedTypography,
    subtitle1: { fontWeight: 500, color: '#64748b' },
    subtitle2: { fontWeight: 500, fontSize: '0.8rem', color: '#94a3b8' },
  },
  shape: sharedShape,
  components: {
    ...sharedComponents,
    MuiCard: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          border: '1px solid rgba(0,0,0,0.08)',
          boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: { borderColor: 'rgba(0,0,0,0.08)', fontSize: '0.8125rem' },
        head: { fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#475569' },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: { backgroundImage: 'none', backgroundColor: '#ffffff', borderBottom: '1px solid rgba(0,0,0,0.08)', color: '#1e293b' },
      },
    },
  },
});

// ── D3 Chart Color Tokens ────────────────────────────────────────
export interface D3Tokens {
  text: string;
  textMuted: string;
  textFaint: string;
  gridLine: string;
  gridStroke: string;
  axisDomain: string;
  bg: string;
  treemapLabel: string;
  hoverBg: string;
  cardBorder: string;
  tooltipBg: string;
  tooltipBorder: string;
  tooltipText: string;
}

export const D3_TOKENS: Record<'dark' | 'light', D3Tokens> = {
  dark: {
    text: '#e2e8f0',
    textMuted: '#94a3b8',
    textFaint: '#64748b',
    gridLine: 'rgba(255,255,255,0.05)',
    gridStroke: 'rgba(255,255,255,0.08)',
    axisDomain: 'rgba(255,255,255,0.1)',
    bg: '#0a0f1a',
    treemapLabel: '#0a0f1a',
    hoverBg: 'rgba(255,255,255,0.03)',
    cardBorder: 'rgba(255,255,255,0.06)',
    tooltipBg: 'rgba(15, 23, 42, 0.95)',
    tooltipBorder: 'rgba(255,255,255,0.12)',
    tooltipText: '#e2e8f0',
  },
  light: {
    text: '#1e293b',
    textMuted: '#64748b',
    textFaint: '#94a3b8',
    gridLine: 'rgba(0,0,0,0.06)',
    gridStroke: 'rgba(0,0,0,0.08)',
    axisDomain: 'rgba(0,0,0,0.15)',
    bg: '#f5f7fa',
    treemapLabel: '#ffffff',
    hoverBg: 'rgba(0,0,0,0.02)',
    cardBorder: 'rgba(0,0,0,0.08)',
    tooltipBg: 'rgba(255, 255, 255, 0.95)',
    tooltipBorder: 'rgba(0,0,0,0.12)',
    tooltipText: '#1e293b',
  },
};
