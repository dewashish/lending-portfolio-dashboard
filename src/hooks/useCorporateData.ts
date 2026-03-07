import useSWR from 'swr';
import * as queries from '@/lib/queries/corporate';
import { scopeKey } from '@/lib/queries/shared';
import type { ScopeSelection } from '@/lib/types';

export function useCorporateWatchlist(scope?: ScopeSelection) {
  return useSWR(scopeKey('corporate-watchlist', scope), () => queries.fetchCorporateWatchlist(scope));
}

export function useCorporateCovenants(scope?: ScopeSelection) {
  return useSWR(scopeKey('corporate-covenants', scope), () => queries.fetchCorporateCovenants(scope));
}

export function useCorporateDelinquency(scope?: ScopeSelection) {
  return useSWR(scopeKey('corporate-delinquency', scope), () => queries.fetchCorporateDelinquency(scope));
}

export function useCorporatePortfolioMetrics(scope?: ScopeSelection) {
  return useSWR(scopeKey('corporate-portfolio', scope), () => queries.fetchCorporatePortfolioMetrics(scope));
}
