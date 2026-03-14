import { supabaseService } from '../supabase/service';

/**
 * Look up the FX rate for a given currency as of a date.
 * Returns the most recent rate on or before the given date.
 */
export async function lookupFxRate(
  currencyCode: string,
  asOfDate?: string
): Promise<{ rate: number; effectiveDate: string } | null> {
  if (currencyCode === 'USD') {
    return { rate: 1, effectiveDate: asOfDate || new Date().toISOString().split('T')[0] };
  }

  let query = supabaseService
    .from('fx_rates')
    .select('rate, effective_date')
    .eq('from_currency', currencyCode)
    .eq('to_currency', 'USD')
    .order('effective_date', { ascending: false })
    .limit(1);

  if (asOfDate) {
    query = query.lte('effective_date', asOfDate);
  }

  const { data, error } = await query;

  if (error || !data || data.length === 0) {
    return null;
  }

  return {
    rate: data[0].rate,
    effectiveDate: data[0].effective_date,
  };
}

/**
 * Convert period string (Mon'YY) to a date string for FX lookup.
 * Returns the last day of the month.
 */
export function periodToDate(period: string): string | null {
  const match = period.match(/^([A-Z][a-z]{2})'(\d{2})$/);
  if (!match) return null;

  const months: Record<string, number> = {
    Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5,
    Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11,
  };

  const monthIdx = months[match[1]];
  if (monthIdx === undefined) return null;

  const year = 2000 + parseInt(match[2], 10);
  // Last day of the month
  const lastDay = new Date(year, monthIdx + 1, 0);
  return lastDay.toISOString().split('T')[0];
}

/**
 * Batch-convert local currency amounts to USD for an array of rows.
 * Mutates the rows in place, adding _usd suffixed fields.
 */
export async function convertToUSD<T extends Record<string, unknown>>(
  rows: T[],
  currencyCode: string,
  amountFields: string[],
  asOfDate?: string
): Promise<{ rate: number; warnings: string[] }> {
  const warnings: string[] = [];

  const fxResult = await lookupFxRate(currencyCode, asOfDate);
  if (!fxResult) {
    throw new Error(`No FX rate available for ${currencyCode} as of ${asOfDate || 'today'}. Add a rate to fx_rates first.`);
  }

  // Warn if rate is stale (>30 days old)
  const rateDateMs = new Date(fxResult.effectiveDate).getTime();
  const nowMs = Date.now();
  const daysDiff = Math.floor((nowMs - rateDateMs) / (1000 * 60 * 60 * 24));
  if (daysDiff > 30) {
    warnings.push(`FX rate for ${currencyCode} is ${daysDiff} days old (effective ${fxResult.effectiveDate}). Consider updating fx_rates.`);
  }

  for (const row of rows) {
    for (const field of amountFields) {
      const localValue = row[field];
      if (typeof localValue === 'number' && !isNaN(localValue)) {
        (row as Record<string, unknown>)[`${field}_usd`] = Math.round(localValue * fxResult.rate * 100) / 100;
      }
    }
  }

  return { rate: fxResult.rate, warnings };
}
