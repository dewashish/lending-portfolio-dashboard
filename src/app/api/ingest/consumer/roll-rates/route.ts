import { rollRatePayloadSchema } from '@/lib/ingestion/validators';
import { handleIngestion } from '../../_shared';

export async function POST(request: Request) {
  return handleIngestion(request, {
    tableName: 'roll_rate_series',
    schema: rollRatePayloadSchema,
    conflictColumns: 'subsidiary_id,bucket,metric,period',
    periodField: 'period',
  });
}
