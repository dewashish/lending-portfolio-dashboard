/**
 * Normalize various date/period formats to the standard Mon'YY format.
 */
export function normalizePeriod(input: string): string | null {
  // Already in correct format
  if (/^[A-Z][a-z]{2}'\d{2}$/.test(input)) return input;

  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  // ISO date: 2025-04-01 or 2025-04
  const isoMatch = input.match(/^(\d{4})-(\d{2})(?:-\d{2})?$/);
  if (isoMatch) {
    const monthIdx = parseInt(isoMatch[2], 10) - 1;
    if (monthIdx >= 0 && monthIdx < 12) {
      return `${MONTHS[monthIdx]}'${isoMatch[1].slice(2)}`;
    }
  }

  // Full month name: April 2025, April'25
  const fullMonthMatch = input.match(/^(January|February|March|April|May|June|July|August|September|October|November|December)[' ]?(\d{2,4})$/i);
  if (fullMonthMatch) {
    const monthName = fullMonthMatch[1];
    const yearStr = fullMonthMatch[2].length === 4 ? fullMonthMatch[2].slice(2) : fullMonthMatch[2];
    const monthIdx = [
      'january', 'february', 'march', 'april', 'may', 'june',
      'july', 'august', 'september', 'october', 'november', 'december',
    ].indexOf(monthName.toLowerCase());
    if (monthIdx >= 0) {
      return `${MONTHS[monthIdx]}'${yearStr}`;
    }
  }

  // MM/YYYY or MM-YYYY
  const mmyyyyMatch = input.match(/^(\d{1,2})[/-](\d{4})$/);
  if (mmyyyyMatch) {
    const monthIdx = parseInt(mmyyyyMatch[1], 10) - 1;
    if (monthIdx >= 0 && monthIdx < 12) {
      return `${MONTHS[monthIdx]}'${mmyyyyMatch[2].slice(2)}`;
    }
  }

  return null;
}

/**
 * Prepare rows for database insertion by adding subsidiary_id
 * and ensuring all required fields are present.
 */
export function prepareRows(
  rows: Record<string, unknown>[],
  subsidiaryId: number
): Record<string, unknown>[] {
  return rows.map((row) => ({
    subsidiary_id: subsidiaryId,
    ...row,
  }));
}
