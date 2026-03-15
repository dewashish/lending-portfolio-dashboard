import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { authenticateIngestion, fxRatesPayloadSchema, logIngestionStart, logIngestionComplete } from '@/lib/ingestion';
import { batchUpsert } from '@/lib/ingestion/upsert';

export async function POST(request: Request) {
  const authResult = await authenticateIngestion(request);
  if (!authResult.ok) {
    return NextResponse.json({ status: 'error', errors: [{ message: authResult.error }] }, { status: authResult.status });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ status: 'error', errors: [{ message: 'Invalid JSON' }] }, { status: 400 });
  }

  try {
    const validated = fxRatesPayloadSchema.parse(body);
    const logEntry = await logIngestionStart(authResult.context.subsidiaryId, 'fx_rates', 'upsert');

    const count = await batchUpsert('fx_rates', validated.rows, 'from_currency,to_currency,effective_date');

    if (logEntry) await logIngestionComplete(logEntry.logId, count);
    return NextResponse.json({ status: 'ok', batchId: logEntry?.batchId, rowsUpserted: count });
  } catch (err) {
    if (err instanceof ZodError) {
      return NextResponse.json({ status: 'error', errors: err.issues.map(e => ({ field: e.path.join('.'), message: e.message })) }, { status: 400 });
    }
    return NextResponse.json({ status: 'error', errors: [{ message: err instanceof Error ? err.message : 'Unknown error' }] }, { status: 500 });
  }
}
