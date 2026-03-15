import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
import {
  authenticateIngestion,
  verifySubsidiaryScope,
  convertToUSD,
  logIngestionStart,
  logIngestionComplete,
  updateSyncWatermark,
  ewsEntityPayloadSchema,
  ewsFacilityAlertsPayloadSchema,
} from '@/lib/ingestion';
import { batchUpsert } from '@/lib/ingestion/upsert';

export async function POST(request: Request) {
  const authResult = await authenticateIngestion(request);
  if (!authResult.ok) {
    return NextResponse.json({ status: 'error', errors: [{ message: authResult.error }] }, { status: authResult.status });
  }

  let body: { subsidiary_id: number; type: 'entity' | 'alerts'; data?: Record<string, unknown>; rows?: Record<string, unknown>[] };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ status: 'error', errors: [{ message: 'Invalid JSON' }] }, { status: 400 });
  }

  const scopeError = verifySubsidiaryScope(authResult.context, body.subsidiary_id);
  if (scopeError) {
    return NextResponse.json({ status: 'error', errors: [{ message: scopeError }] }, { status: 403 });
  }

  try {
    if (body.type === 'entity') {
      ewsEntityPayloadSchema.parse(body);
      const logEntry = await logIngestionStart(body.subsidiary_id, 'ews_entity_summary', 'upsert');
      const row = { subsidiary_id: body.subsidiary_id, ...body.data };
      await convertToUSD([row], authResult.context.currencyCode, ['flagged_exposure']);
      const count = await batchUpsert('ews_entity_summary', [row], 'subsidiary_id');
      if (logEntry) await logIngestionComplete(logEntry.logId, count);
      await updateSyncWatermark(body.subsidiary_id, 'ews_entity_summary', null, count, logEntry?.batchId || '');
      return NextResponse.json({ status: 'ok', batchId: logEntry?.batchId, rowsUpserted: count });
    }

    if (body.type === 'alerts') {
      ewsFacilityAlertsPayloadSchema.parse(body);
      const logEntry = await logIngestionStart(body.subsidiary_id, 'ews_facility_alerts', 'upsert');
      const rows = (body.rows || []).map(r => ({ subsidiary_id: body.subsidiary_id, ...r }));
      await convertToUSD(rows, authResult.context.currencyCode, ['outstanding']);
      const count = await batchUpsert('ews_facility_alerts', rows, 'subsidiary_id,facility_ref');
      if (logEntry) await logIngestionComplete(logEntry.logId, count);
      await updateSyncWatermark(body.subsidiary_id, 'ews_facility_alerts', null, count, logEntry?.batchId || '');
      return NextResponse.json({ status: 'ok', batchId: logEntry?.batchId, rowsUpserted: count });
    }

    return NextResponse.json({ status: 'error', errors: [{ message: 'type must be "entity" or "alerts"' }] }, { status: 400 });
  } catch (err) {
    if (err instanceof ZodError) {
      return NextResponse.json({ status: 'error', errors: err.issues.map(e => ({ field: e.path.join('.'), message: e.message })) }, { status: 400 });
    }
    return NextResponse.json({ status: 'error', errors: [{ message: err instanceof Error ? err.message : 'Unknown error' }] }, { status: 500 });
  }
}
