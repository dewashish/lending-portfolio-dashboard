import { vintagePayloadSchema } from '@/lib/ingestion/validators';
import { handleIngestion } from '../../_shared';

export async function POST(request: Request) {
  return handleIngestion(request, {
    tableName: 'vintage_points',
    schema: vintagePayloadSchema,
    conflictColumns: 'subsidiary_id,vintage,mob,metric_type,portfolio_segment,product_name',
    amountFields: ['loan_amount'],
    periodField: undefined,
  });
}
