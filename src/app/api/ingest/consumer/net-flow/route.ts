import { netFlowPayloadSchema } from '@/lib/ingestion/validators';
import { handleIngestion } from '../../_shared';

export async function POST(request: Request) {
  return handleIngestion(request, {
    tableName: 'net_flow_rates',
    schema: netFlowPayloadSchema,
    conflictColumns: 'subsidiary_id,portfolio,bucket,period',
    amountFields: ['value'],
    periodField: 'period',
  });
}
