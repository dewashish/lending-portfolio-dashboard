import { supabaseService } from '../supabase/service';

const DEFAULT_BATCH_SIZE = 500;

/**
 * Batch upsert rows into a Supabase table with ON CONFLICT handling.
 * Chunks large payloads to avoid request size limits.
 *
 * @param table - Target table name
 * @param rows - Array of row objects to upsert
 * @param conflictColumns - Comma-separated UNIQUE constraint columns for ON CONFLICT
 * @param batchSize - Max rows per request (default 500)
 * @returns Total rows upserted
 */
export async function batchUpsert(
  table: string,
  rows: Record<string, unknown>[],
  conflictColumns: string,
  batchSize: number = DEFAULT_BATCH_SIZE
): Promise<number> {
  if (rows.length === 0) return 0;

  let totalUpserted = 0;

  for (let i = 0; i < rows.length; i += batchSize) {
    const chunk = rows.slice(i, i + batchSize);

    const { error, count } = await supabaseService
      .from(table)
      .upsert(chunk as never[], {
        onConflict: conflictColumns,
        count: 'exact',
      });

    if (error) {
      throw new Error(`Upsert failed on ${table} (batch ${Math.floor(i / batchSize) + 1}): ${error.message}`);
    }

    totalUpserted += count ?? chunk.length;
  }

  return totalUpserted;
}

/**
 * Batch insert rows (no upsert — for append-only tables like snapshots).
 */
export async function batchInsert(
  table: string,
  rows: Record<string, unknown>[],
  batchSize: number = DEFAULT_BATCH_SIZE
): Promise<number> {
  if (rows.length === 0) return 0;

  let totalInserted = 0;

  for (let i = 0; i < rows.length; i += batchSize) {
    const chunk = rows.slice(i, i + batchSize);

    const { error, count } = await supabaseService
      .from(table)
      .insert(chunk as never[], { count: 'exact' });

    if (error) {
      throw new Error(`Insert failed on ${table} (batch ${Math.floor(i / batchSize) + 1}): ${error.message}`);
    }

    totalInserted += count ?? chunk.length;
  }

  return totalInserted;
}
