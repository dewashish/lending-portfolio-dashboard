import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
import {
  authenticateIngestion,
  verifySubsidiaryScope,
  convertToUSD,
  logIngestionStart,
  logIngestionComplete,
  logIngestionFailed,
  updateSyncWatermark,
  prepareRows,
  approvedBasePayloadSchema,
  rejectedBasePayloadSchema,
} from '@/lib/ingestion';
import { batchUpsert } from '@/lib/ingestion/upsert';

export async function POST(request: Request) {
  const authResult = await authenticateIngestion(request);
  if (!authResult.ok) {
    return NextResponse.json({ status: 'error', errors: [{ message: authResult.error }] }, { status: authResult.status });
  }

  let body: { subsidiary_id: number; type: 'approved' | 'rejected'; rows: Record<string, unknown>[] };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ status: 'error', errors: [{ message: 'Invalid JSON' }] }, { status: 400 });
  }

  const scopeError = verifySubsidiaryScope(authResult.context, body.subsidiary_id);
  if (scopeError) {
    return NextResponse.json({ status: 'error', errors: [{ message: scopeError }] }, { status: 403 });
  }

  const config = body.type === 'approved'
    ? { schema: approvedBasePayloadSchema, table: 'approved_base', conflict: 'subsidiary_id,la_band,loan_band' }
    : body.type === 'rejected'
    ? { schema: rejectedBasePayloadSchema, table: 'rejected_base', conflict: 'subsidiary_id,loan_type,amount_band' }
    : null;

  if (!config) {
    return NextResponse.json({ status: 'error', errors: [{ message: 'type must be "approved" or "rejected"' }] }, { status: 400 });
  }

  try {
    config.schema.parse(body);
  } catch (err) {
    if (err instanceof ZodError) {
      return NextResponse.json({ status: 'error', errors: err.issues.map(e => ({ field: e.path.join('.'), message: e.message })) }, { status: 400 });
    }
  }

  const logEntry = await logIngestionStart(body.subsidiary_id, config.table, 'upsert');
  try {
    await convertToUSD(body.rows, authResult.context.currencyCode, ['amount']);
    const prepared = prepareRows(body.rows, body.subsidiary_id);
    const count = await batchUpsert(config.table, prepared, config.conflict);
    if (logEntry) await logIngestionComplete(logEntry.logId, count);
    await updateSyncWatermark(body.subsidiary_id, config.table, null, count, logEntry?.batchId || '');
    return NextResponse.json({ status: 'ok', batchId: logEntry?.batchId, rowsUpserted: count });
  } catch (err) {
    if (logEntry) await logIngestionFailed(logEntry.logId, err instanceof Error ? err.message : 'Unknown');
    return NextResponse.json({ status: 'error', errors: [{ message: err instanceof Error ? err.message : 'Unknown error' }] }, { status: 500 });
  }
}
