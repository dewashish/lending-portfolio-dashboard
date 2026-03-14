import { corporateWatchlistPayloadSchema } from '@/lib/ingestion/validators';
import { handleIngestion } from '../../_shared';

export async function POST(request: Request) {
  return handleIngestion(request, {
    tableName: 'corporate_watchlist',
    schema: corporateWatchlistPayloadSchema,
    conflictColumns: 'subsidiary_id,borrower',
    amountFields: ['exposure'],
  });
}
