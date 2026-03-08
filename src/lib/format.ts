/** Auto-scale a number so the integer part has at most 3 digits. */
function compactNumber(abs: number, decimals: number): [number, string] {
  const tiers: [number, string][] = [[1e12, 'T'], [1e9, 'B'], [1e6, 'M'], [1e3, 'K'], [1, '']];
  for (let i = 0; i < tiers.length; i++) {
    const [threshold, suffix] = tiers[i];
    if (abs >= threshold || i === tiers.length - 1) {
      const scaled = abs / threshold;
      // If rounding pushes to 4 digits, bump to the next larger tier
      if (parseFloat(scaled.toFixed(decimals)) >= 1000 && i > 0) {
        return [abs / tiers[i - 1][0], tiers[i - 1][1]];
      }
      return [scaled, suffix];
    }
  }
  return [abs, ''];
}

export function formatCurrency(
  value: number | null | undefined,
  decimals = 1,
): string {
  if (value == null || isNaN(value)) return '—';
  const abs = Math.abs(value);
  const sign = value < 0 ? '-' : '';
  const [scaled, suffix] = compactNumber(abs, decimals);
  return `${sign}$${scaled.toFixed(decimals)}${suffix}`;
}

/** Alias for formatCurrency with 2-decimal default. All DB values are in raw units. */
export function formatCurrencyMM(value: number | null | undefined, decimals = 2): string {
  if (value == null || isNaN(value)) return '—';
  return formatCurrency(value, decimals);
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
  const abs = Math.abs(value);
  if (abs >= 1000) {
    const sign = value < 0 ? '-' : '';
    const [scaled, suffix] = compactNumber(abs, decimals);
    return `${sign}${scaled.toFixed(decimals)}${suffix}`;
  }
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
