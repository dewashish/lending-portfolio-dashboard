import { tradeFacilitiesPayloadSchema } from '@/lib/ingestion/validators';
import { handleIngestion } from '../../_shared';

export async function POST(request: Request) {
  return handleIngestion(request, {
    tableName: 'trade_facilities',
    schema: tradeFacilitiesPayloadSchema,
    conflictColumns: 'subsidiary_id,facility_reference',
    amountFields: ['facility_limit', 'outstanding', 'prev_month_outstanding', 'provision_amount', 'collateral_value'],
    periodField: 'report_date',
  });
}
