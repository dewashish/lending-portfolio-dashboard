import { corporateDelinquencyPayloadSchema } from '@/lib/ingestion/validators';
import { handleIngestion } from '../../_shared';

export async function POST(request: Request) {
  return handleIngestion(request, {
    tableName: 'corporate_delinquency',
    schema: corporateDelinquencyPayloadSchema,
    conflictColumns: 'subsidiary_id,group_id,cust_id',
    amountFields: ['sanctioned_limit', 'disbursed_amount', 'current_pos'],
  });
}
