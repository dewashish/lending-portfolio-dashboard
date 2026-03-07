import useSWR from 'swr';
import * as queries from '@/lib/queries/consumer';
import { scopeKey } from '@/lib/queries/shared';
import type { ScopeSelection } from '@/lib/types';

export function useConsumerOverall(scope?: ScopeSelection) {
  return useSWR(scopeKey('consumer-overall', scope), () => queries.fetchConsumerOverall(scope));
}

export function useProductMetrics(scope?: ScopeSelection) {
  return useSWR(scopeKey('consumer-products', scope), () => queries.fetchProductMetrics(scope));
}

export function useNetFlowRates(scope?: ScopeSelection) {
  return useSWR(scopeKey('net-flow-rates', scope), () => queries.fetchNetFlowRates(scope));
}

export function useRollRates(scope?: ScopeSelection) {
  return useSWR(scopeKey('roll-rates', scope), () => queries.fetchRollRates(scope));
}

export function useCollectionMetrics(scope?: ScopeSelection) {
  return useSWR(scopeKey('collection-metrics', scope), () => queries.fetchCollectionMetrics(scope));
}

export function useVintagePoints(metricType?: string, scope?: ScopeSelection) {
  const key = metricType ? `vintage-points-${metricType}` : 'vintage-points';
  return useSWR(scopeKey(key, scope), () => queries.fetchVintagePoints(metricType, scope));
}

export function useNonStarters(scope?: ScopeSelection) {
  return useSWR(scopeKey('non-starters', scope), () => queries.fetchNonStarters(scope));
}

export function useTDDPre(scope?: ScopeSelection) {
  return useSWR(scopeKey('tdd-pre', scope), () => queries.fetchTDDPre(scope));
}

export function useTDDPost(scope?: ScopeSelection) {
  return useSWR(scopeKey('tdd-post', scope), () => queries.fetchTDDPost(scope));
}

export function useApprovedBase(scope?: ScopeSelection) {
  return useSWR(scopeKey('approved-base', scope), () => queries.fetchApprovedBase(scope));
}

export function useRejectedBase(scope?: ScopeSelection) {
  return useSWR(scopeKey('rejected-base', scope), () => queries.fetchRejectedBase(scope));
}

export function useLOSMetrics(scope?: ScopeSelection) {
  return useSWR(scopeKey('los-metrics', scope), () => queries.fetchLOSMetrics(scope));
}

export function useLOSFunnel(product?: string, scope?: ScopeSelection) {
  const key = product ? `los-funnel-${product}` : 'los-funnel';
  return useSWR(scopeKey(key, scope), () => queries.fetchLOSFunnel(product, scope));
}

export function useLOSDaily(scope?: ScopeSelection) {
  return useSWR(scopeKey('los-daily', scope), () => queries.fetchLOSDaily(scope));
}

// ── New: Scope Navigation Hooks ─────────────────────────────────

export function useSubsidiaries() {
  return useSWR('subsidiaries', queries.fetchSubsidiaries);
}

export function useRegions() {
  return useSWR('regions', queries.fetchRegions);
}

export function useSubsidiaryScorecard(scope?: ScopeSelection) {
  return useSWR(scopeKey('subsidiary-scorecard', scope), () => queries.fetchSubsidiaryScorecard(scope));
}
