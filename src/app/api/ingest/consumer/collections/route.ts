import { collectionPayloadSchema } from '@/lib/ingestion/validators';
import { handleIngestion } from '../../_shared';

export async function POST(request: Request) {
  return handleIngestion(request, {
    tableName: 'collection_metrics',
    schema: collectionPayloadSchema,
    conflictColumns: 'subsidiary_id,portfolio,bucket,period',
    amountFields: ['amount'],
    periodField: 'period',
  });
}
