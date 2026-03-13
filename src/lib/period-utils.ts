const MONTH_INDEX: Record<string, number> = {
  Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5,
  Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11,
};

/** Parse "Feb'25" → sortable number (year*12 + month) */
export function parsePeriod(p: string): number {
  const m = p.match(/^(\w{3})'(\d{2})$/);
  if (!m) return 0;
  return (2000 + parseInt(m[2], 10)) * 12 + (MONTH_INDEX[m[1]] ?? 0);
}

/** Sort period strings chronologically (e.g. "Feb'25", "Mar'25", …) */
export function sortPeriods(periods: string[]): string[] {
  return [...periods].sort((a, b) => parsePeriod(a) - parsePeriod(b));
}
