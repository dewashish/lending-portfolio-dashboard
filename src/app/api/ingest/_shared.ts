import { NextResponse } from 'next/server';
import { ZodError, type ZodType } from 'zod';
import {
  authenticateIngestion,
  verifySubsidiaryScope,
  convertToUSD,
  logIngestionStart,
  logIngestionComplete,
  logIngestionFailed,
  updateSyncWatermark,
  runPostIngestionChecks,
  prepareRows,
} from '@/lib/ingestion';
import { batchUpsert } from '@/lib/ingestion/upsert';
import type { IngestionResult, IngestionValidationError } from '@/lib/types';

interface IngestionHandlerOptions {
  tableName: string;
  schema: ZodType;
  conflictColumns: string;
  amountFields?: string[];
  periodField?: string; // field name to extract period range from (default: 'period')
  rowsKey?: string; // key in validated body that contains rows (default: 'rows')
}

/**
 * Standard ingestion handler. Handles auth, validation, FX conversion, upsert, logging, and DQ checks.
 */
export async function handleIngestion(
  request: Request,
  options: IngestionHandlerOptions
): Promise<NextResponse<IngestionResult>> {
  const { tableName, schema, conflictColumns, amountFields = [], periodField = 'period', rowsKey = 'rows' } = options;

  // 1. Authenticate
  const authResult = await authenticateIngestion(request);
  if (!authResult.ok) {
    return NextResponse.json(
      { status: 'error' as const, errors: [{ message: authResult.error }] },
      { status: authResult.status }
    );
  }
  const { context } = authResult;

  // 2. Parse request body
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { status: 'error' as const, errors: [{ message: 'Invalid JSON body' }] },
      { status: 400 }
    );
  }

  // 3. Validate with Zod schema
  let validated: Record<string, unknown>;
  try {
    validated = schema.parse(body) as Record<string, unknown>;
  } catch (err) {
    if (err instanceof ZodError) {
      const errors: IngestionValidationError[] = err.issues.map((e) => ({
        field: e.path.join('.'),
        message: e.message,
      }));
      return NextResponse.json({ status: 'error' as const, errors }, { status: 400 });
    }
    return NextResponse.json(
      { status: 'error' as const, errors: [{ message: 'Validation failed' }] },
      { status: 400 }
    );
  }

  // 4. Verify subsidiary scope
  const subsidiaryId = validated.subsidiary_id as number;
  const scopeError = verifySubsidiaryScope(context, subsidiaryId);
  if (scopeError) {
    return NextResponse.json(
      { status: 'error' as const, errors: [{ message: scopeError }] },
      { status: 403 }
    );
  }

  // 5. Start ingestion log
  const logEntry = await logIngestionStart(subsidiaryId, tableName, 'upsert');
  const batchId = logEntry?.batchId || 'unknown';

  try {
    const rows = validated[rowsKey] as Record<string, unknown>[];

    // 6. Convert to USD if amount fields specified
    let usdRate: number | undefined;
    const warnings: string[] = [];
    if (amountFields.length > 0) {
      // Determine asOfDate from the first row's period
      let asOfDate: string | undefined;
      if (periodField && rows[0] && typeof rows[0][periodField] === 'string') {
        const { periodToDate } = await import('@/lib/ingestion/fx');
        asOfDate = periodToDate(rows[0][periodField] as string) || undefined;
      }

      const fxResult = await convertToUSD(rows, context.currencyCode, amountFields, asOfDate);
      usdRate = fxResult.rate;
      warnings.push(...fxResult.warnings);
    }

    // 7. Prepare rows with subsidiary_id
    const preparedRows = prepareRows(rows, subsidiaryId);

    // 8. Batch upsert
    const rowsUpserted = await batchUpsert(tableName, preparedRows, conflictColumns);

    // 9. Extract period range
    let periodStart: string | undefined;
    let periodEnd: string | undefined;
    if (periodField) {
      const periods = rows
        .map((r) => r[periodField] as string | undefined)
        .filter(Boolean)
        .sort();
      if (periods.length > 0) {
        periodStart = periods[0];
        periodEnd = periods[periods.length - 1];
      }
    }

    // 10. Complete log
    if (logEntry) {
      await logIngestionComplete(logEntry.logId, rowsUpserted, periodStart, periodEnd);
    }

    // 11. Update watermark
    await updateSyncWatermark(subsidiaryId, tableName, periodEnd || null, rowsUpserted, batchId);

    // 12. Run DQ checks (non-blocking)
    runPostIngestionChecks(subsidiaryId, tableName, batchId).catch((err) => {
      console.error('[dq-checks] Post-ingestion checks failed:', err);
    });

    return NextResponse.json({
      status: 'ok',
      batchId,
      rowsUpserted,
      usdConversionRate: usdRate,
      warnings: warnings.length > 0 ? warnings : undefined,
    });
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    if (logEntry) {
      await logIngestionFailed(logEntry.logId, errorMessage);
    }
    return NextResponse.json(
      { status: 'error' as const, errors: [{ message: errorMessage }] },
      { status: 500 }
    );
  }
}
