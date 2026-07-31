import { arcPerformancePayloadSchema } from '@/lib/ingestion/validators';
import { handleIngestion } from '../../_shared';

export async function POST(request: Request) {
  return handleIngestion(request, {
    tableName: 'arc_performance',
    schema: arcPerformancePayloadSchema,
    conflictColumns: 'subsidiary_id,arc_name,period',
    amountFields: [
      'original_pos',
      'current_pos',
      'lifetime_recoveries',
      'expected_recoveries_agreed',
      'current_month_recoveries',
    ],
    periodField: 'period',
  });
}
