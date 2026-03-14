import { nonStarterPayloadSchema } from '@/lib/ingestion/validators';
import { handleIngestion } from '../../_shared';

export async function POST(request: Request) {
  return handleIngestion(request, {
    tableName: 'non_starters',
    schema: nonStarterPayloadSchema,
    conflictColumns: 'subsidiary_id,category,product,metric,period',
    amountFields: ['value'],
    periodField: 'period',
  });
}
