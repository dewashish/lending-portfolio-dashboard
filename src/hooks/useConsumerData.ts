import useSWR from 'swr';
import * as queries from '@/lib/queries/consumer';
import { scopeKey, consumerFilterKey } from '@/lib/queries/shared';
import type { ScopeSelection, ConsumerFilters } from '@/lib/types';

export function useConsumerOverall(scope?: ScopeSelection, filters?: ConsumerFilters) {
  return useSWR(consumerFilterKey(scopeKey('consumer-overall', scope), filters), () => queries.fetchConsumerOverall(scope, filters));
}

export function useProductMetrics(scope?: ScopeSelection, filters?: ConsumerFilters) {
  return useSWR(consumerFilterKey(scopeKey('consumer-products', scope), filters), () => queries.fetchProductMetrics(scope, filters));
}

export function useNetFlowRates(scope?: ScopeSelection, filters?: ConsumerFilters) {
  return useSWR(consumerFilterKey(scopeKey('net-flow-rates', scope), filters), () => queries.fetchNetFlowRates(scope, filters));
}

export function useRollRates(scope?: ScopeSelection, filters?: ConsumerFilters) {
  return useSWR(consumerFilterKey(scopeKey('roll-rates', scope), filters), () => queries.fetchRollRates(scope, filters));
}

export function useCollectionMetrics(scope?: ScopeSelection, filters?: ConsumerFilters) {
  return useSWR(consumerFilterKey(scopeKey('collection-metrics', scope), filters), () => queries.fetchCollectionMetrics(scope, filters));
}

export function useVintagePoints(metricType?: string, scope?: ScopeSelection) {
  const key = metricType ? `vintage-points-${metricType}` : 'vintage-points';
  return useSWR(scopeKey(key, scope), () => queries.fetchVintagePoints(metricType, scope));
}

export function useNonStarters(scope?: ScopeSelection, filters?: ConsumerFilters) {
  return useSWR(consumerFilterKey(scopeKey('non-starters', scope), filters), () => queries.fetchNonStarters(scope, filters));
}

export function useTDDPre(scope?: ScopeSelection, filters?: ConsumerFilters) {
  return useSWR(consumerFilterKey(scopeKey('tdd-pre', scope), filters), () => queries.fetchTDDPre(scope, filters));
}

export function useTDDPost(scope?: ScopeSelection, filters?: ConsumerFilters) {
  return useSWR(consumerFilterKey(scopeKey('tdd-post', scope), filters), () => queries.fetchTDDPost(scope, filters));
}

export function useApprovedBase(scope?: ScopeSelection) {
  return useSWR(scopeKey('approved-base', scope), () => queries.fetchApprovedBase(scope));
}

export function useRejectedBase(scope?: ScopeSelection) {
  return useSWR(scopeKey('rejected-base', scope), () => queries.fetchRejectedBase(scope));
}

export function useLOSMetrics(scope?: ScopeSelection, filters?: ConsumerFilters) {
  return useSWR(consumerFilterKey(scopeKey('los-metrics', scope), filters), () => queries.fetchLOSMetrics(scope, filters));
}

export function useLOSFunnel(product?: string, scope?: ScopeSelection, filters?: ConsumerFilters) {
  const key = product ? `los-funnel-${product}` : 'los-funnel';
  return useSWR(consumerFilterKey(scopeKey(key, scope), filters), () => queries.fetchLOSFunnel(product, scope, filters));
}

export function useLOSDaily(scope?: ScopeSelection, filters?: ConsumerFilters) {
  return useSWR(consumerFilterKey(scopeKey('los-daily', scope), filters), () => queries.fetchLOSDaily(scope, filters));
}

// ── Scope Navigation Hooks ─────────────────────────────────────

export function useSubsidiaries() {
  return useSWR('subsidiaries', queries.fetchSubsidiaries);
}

export function useRegions() {
  return useSWR('regions', queries.fetchRegions);
}

export function useSubsidiaryScorecard(scope?: ScopeSelection) {
  return useSWR(scopeKey('subsidiary-scorecard', scope), () => queries.fetchSubsidiaryScorecard(scope));
}

// ── Filter Metadata Hooks ──────────────────────────────────────

export function useConsumerPeriods(scope?: ScopeSelection) {
  return useSWR(scopeKey('consumer-periods', scope), () => queries.fetchConsumerPeriods(scope));
}

export function useConsumerProducts(scope?: ScopeSelection) {
  return useSWR(scopeKey('consumer-product-names', scope), () => queries.fetchConsumerProductNames(scope));
}
