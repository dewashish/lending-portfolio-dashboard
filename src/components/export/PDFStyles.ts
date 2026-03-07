// PDF theme constants for executive summary generation
export const PDF_COLORS = {
  primary: '#00897b',
  primaryDark: '#004d40',
  accent: '#26a69a',
  danger: '#e53935',
  warning: '#ff9800',
  success: '#43a047',
  textDark: '#1a1a2e',
  textMedium: '#4a4a5a',
  textLight: '#8a8a9a',
  headerBg: '#004d40',
  headerText: '#ffffff',
  rowAlt: '#f5f7fa',
  border: '#e0e0e0',
  white: '#ffffff',
  coverGradientStart: '#004d40',
  coverGradientEnd: '#00897b',
} as const;

export const PDF_FONTS = {
  title: 24,
  subtitle: 14,
  sectionTitle: 12,
  body: 9,
  small: 7.5,
  tiny: 6.5,
} as const;

export const PDF_MARGINS = {
  page: { top: 15, right: 15, bottom: 20, left: 15 },
  section: 8,
} as const;

// Traffic light RAG styling
export function ragColor(value: number, greenMax: number, amberMax: number): string {
  if (value <= greenMax) return PDF_COLORS.success;
  if (value <= amberMax) return PDF_COLORS.warning;
  return PDF_COLORS.danger;
}

export function ragLabel(value: number, greenMax: number, amberMax: number): string {
  if (value <= greenMax) return 'GREEN';
  if (value <= amberMax) return 'AMBER';
  return 'RED';
}
