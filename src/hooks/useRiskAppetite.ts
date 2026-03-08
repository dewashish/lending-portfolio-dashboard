import useSWR from 'swr';
import { fetchAllThresholds } from '@/lib/queries/risk-appetite';
import { resolveThreshold, getRAGColor, getRAGStatus } from '@/lib/risk-appetite/resolve-thresholds';
import { getMetricDef } from '@/lib/risk-appetite/metric-registry';
import type { RiskAppetiteRow, RAGStatus, ThresholdContext, ResolvedThreshold } from '@/lib/types';

const SWR_KEY = 'risk-appetite-thresholds';

export function useRiskAppetite() {
  const { data: thresholds, error, isLoading, mutate } = useSWR<RiskAppetiteRow[]>(
    SWR_KEY,
    fetchAllThresholds,
    { revalidateOnFocus: false, dedupingInterval: 30000 },
  );

  /** Get resolved RAG color for a metric value */
  function getColor(metricKey: string, value: number, context?: ThresholdContext): string {
    const rows = thresholds ?? [];
    const resolved = resolveThreshold(metricKey, rows, context ?? {});
    const def = getMetricDef(metricKey);
    return getRAGColor(value, resolved.appetite, resolved.tolerance, def?.direction ?? 'lower_is_better');
  }

  /** Get resolved RAG status for a metric value */
  function getStatus(metricKey: string, value: number, context?: ThresholdContext): RAGStatus {
    const rows = thresholds ?? [];
    const resolved = resolveThreshold(metricKey, rows, context ?? {});
    const def = getMetricDef(metricKey);
    return getRAGStatus(value, resolved.appetite, resolved.tolerance, def?.direction ?? 'lower_is_better');
  }

  /** Get resolved threshold for a metric */
  function getThreshold(metricKey: string, context?: ThresholdContext): ResolvedThreshold {
    const rows = thresholds ?? [];
    return resolveThreshold(metricKey, rows, context ?? {});
  }

  return { thresholds: thresholds ?? [], error, isLoading, mutate, getColor, getStatus, getThreshold };
}
