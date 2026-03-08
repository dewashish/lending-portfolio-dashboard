import type { RAGStatus, RiskAppetiteRow, ResolvedThreshold, MetricDirection, ThresholdContext } from '@/lib/types';
import { getMetricDef } from './metric-registry';
import { RAG_COLORS } from '@/lib/constants';

/**
 * Resolve the effective threshold for a metric by walking up the inheritance chain:
 * product → business_line → subsidiary → region → global
 */
export function resolveThreshold(
  metricKey: string,
  allRows: RiskAppetiteRow[],
  context: ThresholdContext,
): ResolvedThreshold {
  const rows = allRows.filter((r) => r.metric_key === metricKey);
  const def = getMetricDef(metricKey);

  // Try product-level
  if (context.product && context.businessLine && context.subsidiaryId) {
    const match = rows.find(
      (r) =>
        r.scope_level === 'product' &&
        r.subsidiary_id === context.subsidiaryId &&
        r.business_line === context.businessLine &&
        r.product_name === context.product,
    );
    if (match) return { appetite: Number(match.appetite), tolerance: Number(match.tolerance), scopeLevel: 'product', isInherited: false };
  }

  // Try business_line-level
  if (context.businessLine && context.subsidiaryId) {
    const match = rows.find(
      (r) =>
        r.scope_level === 'business_line' &&
        r.subsidiary_id === context.subsidiaryId &&
        r.business_line === context.businessLine,
    );
    if (match) return { appetite: Number(match.appetite), tolerance: Number(match.tolerance), scopeLevel: 'business_line', isInherited: true };
  }

  // Try subsidiary-level
  if (context.subsidiaryId) {
    const match = rows.find(
      (r) => r.scope_level === 'subsidiary' && r.subsidiary_id === context.subsidiaryId,
    );
    if (match) return { appetite: Number(match.appetite), tolerance: Number(match.tolerance), scopeLevel: 'subsidiary', isInherited: true };
  }

  // Try region-level
  if (context.regionId) {
    const match = rows.find(
      (r) => r.scope_level === 'region' && r.region_id === context.regionId,
    );
    if (match) return { appetite: Number(match.appetite), tolerance: Number(match.tolerance), scopeLevel: 'region', isInherited: true };
  }

  // Global-level
  const globalMatch = rows.find((r) => r.scope_level === 'global');
  if (globalMatch) {
    return { appetite: Number(globalMatch.appetite), tolerance: Number(globalMatch.tolerance), scopeLevel: 'global', isInherited: true };
  }

  // Fallback to metric defaults
  if (def) {
    return { appetite: def.defaultAppetite, tolerance: def.defaultTolerance, scopeLevel: 'global', isInherited: true };
  }

  return { appetite: 0, tolerance: 0, scopeLevel: 'global', isInherited: true };
}

/**
 * Get RAG status for a value given appetite/tolerance thresholds and direction.
 *
 * lower_is_better:  value ≤ appetite → Green, value ≤ tolerance → Amber, else Red
 * higher_is_better: value ≥ appetite → Green, value ≥ tolerance → Amber, else Red
 */
export function getRAGStatus(
  value: number,
  appetite: number,
  tolerance: number,
  direction: MetricDirection,
): RAGStatus {
  if (direction === 'lower_is_better') {
    if (value <= appetite) return 'Green';
    if (value <= tolerance) return 'Amber';
    return 'Red';
  }
  // higher_is_better
  if (value >= appetite) return 'Green';
  if (value >= tolerance) return 'Amber';
  return 'Red';
}

/**
 * Get RAG color hex string for a value.
 */
export function getRAGColor(
  value: number,
  appetite: number,
  tolerance: number,
  direction: MetricDirection,
): string {
  const status = getRAGStatus(value, appetite, tolerance, direction);
  return RAG_COLORS[status];
}

/**
 * Convenience: resolve threshold + get color in one call.
 */
export function resolveRAGColor(
  metricKey: string,
  value: number,
  allRows: RiskAppetiteRow[],
  context: ThresholdContext,
): { color: string; status: RAGStatus; threshold: ResolvedThreshold } {
  const threshold = resolveThreshold(metricKey, allRows, context);
  const def = getMetricDef(metricKey);
  const direction = def?.direction ?? 'lower_is_better';
  const status = getRAGStatus(value, threshold.appetite, threshold.tolerance, direction);
  return { color: RAG_COLORS[status], status, threshold };
}
