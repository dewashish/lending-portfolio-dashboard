import { corporateMetricsPayloadSchema } from '@/lib/ingestion/validators';
import { handleIngestion } from '../../_shared';

export async function POST(request: Request) {
  return handleIngestion(request, {
    tableName: 'corporate_portfolio_metrics',
    schema: corporateMetricsPayloadSchema,
    conflictColumns: 'subsidiary_id,particular,period',
    amountFields: ['total', 'fund_based', 'non_fund_based'],
    periodField: 'period',
  });
}
