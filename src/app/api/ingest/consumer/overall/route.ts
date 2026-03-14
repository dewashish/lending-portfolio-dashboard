import { consumerOverallPayloadSchema } from '@/lib/ingestion/validators';
import { handleIngestion } from '../../_shared';

export async function POST(request: Request) {
  return handleIngestion(request, {
    tableName: 'consumer_overall_metrics',
    schema: consumerOverallPayloadSchema,
    conflictColumns: 'subsidiary_id,metric_type,metric,period',
    amountFields: ['value'],
    periodField: 'period',
  });
}
