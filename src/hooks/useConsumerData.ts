import useSWR from 'swr';
import * as queries from '@/lib/queries/consumer';

export function useConsumerOverall() {
  return useSWR('consumer-overall', queries.fetchConsumerOverall);
}

export function useProductMetrics() {
  return useSWR('consumer-products', queries.fetchProductMetrics);
}

export function useNetFlowRates() {
  return useSWR('net-flow-rates', queries.fetchNetFlowRates);
}

export function useRollRates() {
  return useSWR('roll-rates', queries.fetchRollRates);
}

export function useCollectionMetrics() {
  return useSWR('collection-metrics', queries.fetchCollectionMetrics);
}

export function useVintagePoints(metricType?: string) {
  return useSWR(
    metricType ? `vintage-points-${metricType}` : 'vintage-points',
    () => queries.fetchVintagePoints(metricType),
  );
}

export function useNonStarters() {
  return useSWR('non-starters', queries.fetchNonStarters);
}

export function useTDDPre() {
  return useSWR('tdd-pre', queries.fetchTDDPre);
}

export function useTDDPost() {
  return useSWR('tdd-post', queries.fetchTDDPost);
}

export function useApprovedBase() {
  return useSWR('approved-base', queries.fetchApprovedBase);
}

export function useRejectedBase() {
  return useSWR('rejected-base', queries.fetchRejectedBase);
}

export function useLOSMetrics() {
  return useSWR('los-metrics', queries.fetchLOSMetrics);
}

export function useLOSFunnel(product?: string) {
  return useSWR(
    product ? `los-funnel-${product}` : 'los-funnel',
    () => queries.fetchLOSFunnel(product),
  );
}

export function useLOSDaily() {
  return useSWR('los-daily', queries.fetchLOSDaily);
}
