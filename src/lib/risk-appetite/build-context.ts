import type { ScopeSelection, ThresholdContext } from '@/lib/types';

/**
 * Convert a ScopeSelection (Group/Region/Subsidiary) plus optional
 * businessLine and product into a ThresholdContext for risk appetite
 * threshold resolution.
 *
 * - Group scope → empty context (resolves to global thresholds)
 * - Region scope → { regionId }
 * - Subsidiary scope → { subsidiaryId }
 * - Plus optional businessLine/product overrides
 */
export function buildThresholdContext(
  scope?: ScopeSelection,
  overrides?: { businessLine?: string; product?: string },
): ThresholdContext {
  const ctx: ThresholdContext = {};

  if (scope) {
    if (scope.level === 'subsidiary' && scope.subsidiaryId) {
      ctx.subsidiaryId = scope.subsidiaryId;
    }
    if (scope.level === 'region' && scope.regionId) {
      ctx.regionId = scope.regionId;
    }
  }

  if (overrides?.businessLine) ctx.businessLine = overrides.businessLine;
  if (overrides?.product) ctx.product = overrides.product;

  return ctx;
}
