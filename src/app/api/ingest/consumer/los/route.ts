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
  losMetricsPayloadSchema,
  losFunnelPayloadSchema,
  losDailyPayloadSchema,
} from '@/lib/ingestion';
import { batchUpsert } from '@/lib/ingestion/upsert';

export async function POST(request: Request) {
  const authResult = await authenticateIngestion(request);
  if (!authResult.ok) {
    return NextResponse.json({ status: 'error', errors: [{ message: authResult.error }] }, { status: authResult.status });
  }

  let body: { subsidiary_id: number; type: string; rows: Record<string, unknown>[] };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ status: 'error', errors: [{ message: 'Invalid JSON' }] }, { status: 400 });
  }

  const scopeError = verifySubsidiaryScope(authResult.context, body.subsidiary_id);
  if (scopeError) {
    return NextResponse.json({ status: 'error', errors: [{ message: scopeError }] }, { status: 403 });
  }

  const { type } = body;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const configs: Record<string, { schema: any; table: string; conflict: string; amountFields: string[] }> = {
    metrics: { schema: losMetricsPayloadSchema, table: 'los_metrics', conflict: 'subsidiary_id,metric,product,report_date', amountFields: ['ftd', 'mtd', 'lmtd', 'lm_full'] },
    funnel: { schema: losFunnelPayloadSchema, table: 'los_funnel', conflict: 'subsidiary_id,stage,product,report_date', amountFields: ['ftd', 'mtd', 'lmtd'] },
    daily: { schema: losDailyPayloadSchema, table: 'los_daily', conflict: 'subsidiary_id,date,product', amountFields: ['amount', 'avg_ticket_size'] },
  };

  const config = configs[type];
  if (!config) {
    return NextResponse.json({ status: 'error', errors: [{ message: `Invalid type "${type}". Use "metrics", "funnel", or "daily"` }] }, { status: 400 });
  }

  try {
    config.schema.parse(body);
  } catch (err) {
    if (err instanceof ZodError) {
      return NextResponse.json({ status: 'error', errors: err.issues.map(e => ({ field: e.path.join('.'), message: e.message })) }, { status: 400 });
    }
    return NextResponse.json({ status: 'error', errors: [{ message: 'Validation failed' }] }, { status: 400 });
  }

  const logEntry = await logIngestionStart(body.subsidiary_id, config.table, 'upsert');
  try {
    const rows = body.rows;
    const fxResult = await convertToUSD(rows, authResult.context.currencyCode, config.amountFields);
    const prepared = prepareRows(rows, body.subsidiary_id);
    const count = await batchUpsert(config.table, prepared, config.conflict);

    if (logEntry) await logIngestionComplete(logEntry.logId, count);
    await updateSyncWatermark(body.subsidiary_id, config.table, null, count, logEntry?.batchId || '');

    return NextResponse.json({ status: 'ok', batchId: logEntry?.batchId, rowsUpserted: count, usdConversionRate: fxResult.rate });
  } catch (err) {
    if (logEntry) await logIngestionFailed(logEntry.logId, err instanceof Error ? err.message : 'Unknown');
    return NextResponse.json({ status: 'error', errors: [{ message: err instanceof Error ? err.message : 'Unknown error' }] }, { status: 500 });
  }
}
