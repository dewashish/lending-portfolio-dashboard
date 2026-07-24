import { npaCollectionPayloadSchema } from '@/lib/ingestion/validators';
import { handleIngestion } from '../../_shared';

export async function POST(request: Request) {
  return handleIngestion(request, {
    tableName: 'npa_collection',
    schema: npaCollectionPayloadSchema,
    conflictColumns: 'subsidiary_id,arc_type,period',
    amountFields: ['pos', 'money_collected'],
    periodField: 'period',
  });
}
