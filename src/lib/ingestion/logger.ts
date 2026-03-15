import { supabaseService } from '../supabase/service';

/**
 * Create an ingestion log entry when a batch starts.
 */
export async function logIngestionStart(
  subsidiaryId: number,
  tableName: string,
  operation: string,
  sourceSystem?: string
): Promise<{ logId: number; batchId: string } | null> {
  const { data, error } = await supabaseService
    .from('data_ingestion_log')
    .insert({
      subsidiary_id: subsidiaryId,
      table_name: tableName,
      operation,
      status: 'started',
      source_system: sourceSystem || null,
    })
    .select('id, batch_id')
    .single();

  if (error || !data) {
    console.error('[ingestion-log] Failed to create log entry:', error);
    return null;
  }

  return { logId: data.id, batchId: data.batch_id };
}

/**
 * Mark an ingestion log entry as completed.
 */
export async function logIngestionComplete(
  logId: number,
  rowCount: number,
  periodStart?: string,
  periodEnd?: string
): Promise<void> {
  const { error } = await supabaseService
    .from('data_ingestion_log')
    .update({
      status: 'completed',
      row_count: rowCount,
      period_start: periodStart || null,
      period_end: periodEnd || null,
      completed_at: new Date().toISOString(),
    })
    .eq('id', logId);

  if (error) {
    console.error('[ingestion-log] Failed to complete log entry:', error);
  }
}

/**
 * Mark an ingestion log entry as failed.
 */
export async function logIngestionFailed(
  logId: number,
  errorMessage: string,
  validationErrors?: unknown[]
): Promise<void> {
  const { error } = await supabaseService
    .from('data_ingestion_log')
    .update({
      status: 'failed',
      error_message: errorMessage,
      validation_errors: validationErrors || null,
      completed_at: new Date().toISOString(),
    })
    .eq('id', logId);

  if (error) {
    console.error('[ingestion-log] Failed to update log entry:', error);
  }
}

/**
 * Update the sync watermark for a subsidiary + table after successful ingestion.
 */
export async function updateSyncWatermark(
  subsidiaryId: number,
  tableName: string,
  lastPeriod: string | null,
  rowCount: number,
  batchId: string
): Promise<void> {
  const { error } = await supabaseService
    .from('sync_watermarks')
    .upsert(
      {
        subsidiary_id: subsidiaryId,
        table_name: tableName,
        last_synced_at: new Date().toISOString(),
        last_period: lastPeriod,
        last_batch_id: batchId,
        row_count: rowCount,
      },
      { onConflict: 'subsidiary_id,table_name' }
    );

  if (error) {
    console.error('[sync-watermark] Failed to update watermark:', error);
  }
}
