import useSWR from 'swr';
import * as queries from '@/lib/queries/overview';
import { scopeKey } from '@/lib/queries/shared';
import type { ScopeSelection } from '@/lib/types';

export function useConsolidatedScorecard(scope?: ScopeSelection) {
  return useSWR(scopeKey('consolidated-scorecard', scope), () => queries.fetchConsolidatedScorecard(scope));
}
