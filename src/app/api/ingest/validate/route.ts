import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { authenticateIngestion, verifySubsidiaryScope } from '@/lib/ingestion';
import { SCHEMA_MAP } from '@/lib/ingestion/validators';

export async function POST(request: Request) {
  const authResult = await authenticateIngestion(request);
  if (!authResult.ok) {
    return NextResponse.json({ status: 'error', errors: [{ message: authResult.error }] }, { status: authResult.status });
  }

  let body: { subsidiary_id: number; table: string; rows: unknown[] };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ status: 'error', errors: [{ message: 'Invalid JSON' }] }, { status: 400 });
  }

  const scopeError = verifySubsidiaryScope(authResult.context, body.subsidiary_id);
  if (scopeError) {
    return NextResponse.json({ status: 'error', errors: [{ message: scopeError }] }, { status: 403 });
  }

  const schema = SCHEMA_MAP[body.table];
  if (!schema) {
    return NextResponse.json({
      status: 'error',
      errors: [{ message: `Unknown table "${body.table}". Available: ${Object.keys(SCHEMA_MAP).join(', ')}` }],
    }, { status: 400 });
  }

  try {
    schema.parse(body);
    return NextResponse.json({
      status: 'ok',
      message: 'Validation passed. No data was persisted (dry-run).',
      rowCount: body.rows?.length || 0,
    });
  } catch (err) {
    if (err instanceof ZodError) {
      return NextResponse.json({
        status: 'error',
        errors: err.issues.map(e => ({ field: e.path.join('.'), message: e.message })),
      }, { status: 400 });
    }
    return NextResponse.json({ status: 'error', errors: [{ message: 'Validation failed' }] }, { status: 400 });
  }
}
