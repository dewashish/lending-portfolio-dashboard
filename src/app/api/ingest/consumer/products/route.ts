import { consumerProductPayloadSchema } from '@/lib/ingestion/validators';
import { handleIngestion } from '../../_shared';

export async function POST(request: Request) {
  return handleIngestion(request, {
    tableName: 'consumer_product_metrics',
    schema: consumerProductPayloadSchema,
    conflictColumns: 'subsidiary_id,product_name,metric_type,metric,period',
    amountFields: ['value'],
    periodField: 'period',
  });
}
