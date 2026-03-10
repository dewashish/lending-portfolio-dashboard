import { sortPeriodsChronologically } from '@/lib/format';
import type { NonStarterRow } from '@/lib/types';

export interface AugmentedNonStarterRow extends NonStarterRow {
  difference: number | null;
}

const MONTH_MAP: Record<string, number> = {
  Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5,
  Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11,
};

function parseMonthYear(period: string): { month: number; year: number } | null {
  const match = period.match(/([A-Za-z]+)'?(\d{2,4})/);
  if (!match) return null;
  const month = MONTH_MAP[match[1]] ?? 0;
  let year = parseInt(match[2], 10);
  if (year < 100) year += 2000;
  return { month, year };
}

export function augmentNonStarterRows(rows: NonStarterRow[]): AugmentedNonStarterRow[] {
  return rows.map((row) => {
    const sortedKeys = sortPeriodsChronologically(Object.keys(row.monthlyValues));

    // MoM Difference
    let difference: number | null = null;
    if (sortedKeys.length >= 2) {
      const latest = row.monthlyValues[sortedKeys[sortedKeys.length - 1]];
      const prev = row.monthlyValues[sortedKeys[sortedKeys.length - 2]];
      difference = latest - prev;
    }

    // Yearly Averages
    const yearBuckets: Record<string, number[]> = {};
    for (const key of sortedKeys) {
      const parsed = parseMonthYear(key);
      if (!parsed) continue;
      const yk = `Avg ${parsed.year}`;
      if (!yearBuckets[yk]) yearBuckets[yk] = [];
      yearBuckets[yk].push(row.monthlyValues[key]);
    }
    const yearlyAverages: Record<string, number> = {};
    for (const [yk, vals] of Object.entries(yearBuckets)) {
      yearlyAverages[yk] = vals.reduce((a, b) => a + b, 0) / vals.length;
    }

    // Quarterly Sums
    const qBuckets: Record<string, number[]> = {};
    for (const key of sortedKeys) {
      const parsed = parseMonthYear(key);
      if (!parsed) continue;
      const q = Math.floor(parsed.month / 3) + 1;
      const qk = `Q${q} ${parsed.year}`;
      if (!qBuckets[qk]) qBuckets[qk] = [];
      qBuckets[qk].push(row.monthlyValues[key]);
    }
    const quarterlyValues: Record<string, number> = {};
    for (const [qk, vals] of Object.entries(qBuckets)) {
      quarterlyValues[qk] = vals.reduce((a, b) => a + b, 0);
    }

    return { ...row, yearlyAverages, quarterlyValues, difference };
  });
}
