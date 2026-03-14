import { corporateCovenantsPayloadSchema } from '@/lib/ingestion/validators';
import { handleIngestion } from '../../_shared';

export async function POST(request: Request) {
  return handleIngestion(request, {
    tableName: 'corporate_covenants',
    schema: corporateCovenantsPayloadSchema,
    conflictColumns: 'subsidiary_id,group_id,cust_id,covenant_category,covenant_type',
    amountFields: ['sanctioned_limit', 'disbursed_amount', 'current_pos'],
  });
}
