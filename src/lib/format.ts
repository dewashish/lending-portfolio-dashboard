export function formatCurrency(
  value: number | null | undefined,
  decimals = 1,
): string {
  if (value == null || isNaN(value)) return '—';
  const abs = Math.abs(value);
  const sign = value < 0 ? '-' : '';
  if (abs >= 1_000_000_000) return `${sign}$${(abs / 1_000_000_000).toFixed(decimals)}B`;
  if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(decimals)}M`;
  if (abs >= 1_000) return `${sign}$${(abs / 1_000).toFixed(decimals)}K`;
  return `${sign}$${abs.toFixed(decimals)}`;
}

export function formatCurrencyMM(value: number | null | undefined, decimals = 2): string {
  if (value == null || isNaN(value)) return '—';
  return `$${value.toFixed(decimals)}mm`;
}

export function formatPercent(
  value: number | null | undefined,
  decimals = 2,
): string {
  if (value == null || isNaN(value)) return '—';
  // If value is already in decimal form (e.g. 0.05 = 5%), multiply by 100
  const pct = Math.abs(value) <= 1 && Math.abs(value) > 0 ? value * 100 : value;
  return `${pct.toFixed(decimals)}%`;
}

export function formatNumber(
  value: number | null | undefined,
  decimals = 0,
): string {
  if (value == null || isNaN(value)) return '—';
  return value.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

export function formatDate(value: string | Date | null | undefined): string {
  if (!value) return '—';
  const d = typeof value === 'string' ? new Date(value) : value;
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

export function formatRating(value: number | null | undefined): string {
  if (value == null || isNaN(value)) return '—';
  return value.toFixed(1);
}

export function ragFromValue(
  value: number,
  greenThreshold: number,
  amberThreshold: number,
): 'Green' | 'Amber' | 'Red' {
  if (value <= greenThreshold) return 'Green';
  if (value <= amberThreshold) return 'Amber';
  return 'Red';
}
