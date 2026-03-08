import useSWR from 'swr';
import * as queries from '@/lib/queries/trade';
import { scopeKey } from '@/lib/queries/shared';
import type { ScopeSelection } from '@/lib/types';

export function useTradeFacilities(scope?: ScopeSelection) {
  return useSWR(scopeKey('trade-facilities', scope), () => queries.fetchTradeFacilities(scope));
}

export function useTradeEntityPerformance(scope?: ScopeSelection) {
  return useSWR(scopeKey('trade-entity-perf', scope), () => queries.fetchTradeEntityPerformance(scope));
}

export function useTradeProductMix(scope?: ScopeSelection) {
  return useSWR(scopeKey('trade-product-mix', scope), () => queries.fetchTradeProductMix(scope));
}

export function useTradeAssetQuality(scope?: ScopeSelection) {
  return useSWR(scopeKey('trade-asset-quality', scope), () => queries.fetchTradeAssetQuality(scope));
}

export function useTradeRatingDistribution(scope?: ScopeSelection) {
  return useSWR(scopeKey('trade-rating-dist', scope), () => queries.fetchTradeRatingDistribution(scope));
}

export function useTradeConcentrations(category?: string, scope?: ScopeSelection) {
  const key = category ? `trade-concentrations-${category}` : 'trade-concentrations';
  return useSWR(scopeKey(key, scope), () => queries.fetchTradeConcentrations(category, scope));
}

export function useTradeCollectionEfficiency(scope?: ScopeSelection) {
  return useSWR(scopeKey('trade-coll-eff', scope), () => queries.fetchTradeCollectionEfficiency(scope));
}

export function useTradeWatchlist(scope?: ScopeSelection) {
  return useSWR(scopeKey('trade-watchlist', scope), () => queries.fetchTradeWatchlist(scope));
}

export function useTradeExecutiveSummary(scope?: ScopeSelection) {
  return useSWR(scopeKey('trade-exec-summary', scope), () => queries.fetchTradeExecutiveSummary(scope));
}

export function useTradeStageMigration(scope?: ScopeSelection) {
  return useSWR(scopeKey('trade-stage-migration', scope), () => queries.fetchTradeStageMigration(scope));
}

export function useTradeDPDRollRates(scope?: ScopeSelection) {
  return useSWR(scopeKey('trade-dpd-roll-rates', scope), () => queries.fetchTradeDPDRollRates(scope));
}

export function useTradeDPDAgingByEntity(scope?: ScopeSelection) {
  return useSWR(scopeKey('trade-dpd-aging', scope), () => queries.fetchTradeDPDAgingByEntity(scope));
}
