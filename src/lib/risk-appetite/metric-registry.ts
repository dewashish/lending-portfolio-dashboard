import type { MetricDefinition } from '@/lib/types';

export const METRIC_REGISTRY: MetricDefinition[] = [
  // ── Group Overview (cross-business-line blended KPIs) ─────────
  { key: 'group_dpd_30_plus', label: 'Group 30+ DPD', direction: 'lower_is_better', defaultAppetite: 0.05, defaultTolerance: 0.07, businessLine: 'group', category: 'Delinquency' },
  { key: 'group_npl', label: 'Group NPL Ratio', direction: 'lower_is_better', defaultAppetite: 0.03, defaultTolerance: 0.05, businessLine: 'group', category: 'Asset Quality' },
  { key: 'group_provision_cov', label: 'Group Provision Coverage', direction: 'higher_is_better', defaultAppetite: 0.80, defaultTolerance: 0.60, businessLine: 'group', category: 'Provisioning' },
  { key: 'group_credit_cost', label: 'Group Credit Cost', direction: 'lower_is_better', defaultAppetite: 0.02, defaultTolerance: 0.03, businessLine: 'group', category: 'Credit Cost' },
  { key: 'group_ews_critical', label: 'EWS Critical Count', direction: 'lower_is_better', defaultAppetite: 0, defaultTolerance: 2, businessLine: 'group', category: 'Early Warning' },

  // ── Consumer Finance ──────────────────────────────────────────
  { key: 'fpd_pct', label: 'FPD%', direction: 'lower_is_better', defaultAppetite: 0.03, defaultTolerance: 0.035, businessLine: 'consumer_finance', category: 'Delinquency' },
  { key: 'dpd_30_plus', label: '30+ DPD%', direction: 'lower_is_better', defaultAppetite: 0.05, defaultTolerance: 0.06, businessLine: 'consumer_finance', category: 'Delinquency' },
  { key: 'dpd_90_plus', label: '90+ DPD%', direction: 'lower_is_better', defaultAppetite: 0.015, defaultTolerance: 0.02, businessLine: 'consumer_finance', category: 'Delinquency' },
  { key: 'net_credit_loss', label: 'Net Credit Loss', direction: 'lower_is_better', defaultAppetite: 0.01, defaultTolerance: 0.015, businessLine: 'consumer_finance', category: 'Delinquency' },
  { key: 'non_starter_rate', label: 'Non-Starter Rate', direction: 'lower_is_better', defaultAppetite: 0.02, defaultTolerance: 0.04, businessLine: 'consumer_finance', category: 'Origination' },
  { key: 'roll_forward_rate', label: 'Roll Forward Rate', direction: 'lower_is_better', defaultAppetite: 0.1, defaultTolerance: 0.2, businessLine: 'consumer_finance', category: 'Collections' },
  { key: 'resolution_rate', label: 'Resolution Rate', direction: 'higher_is_better', defaultAppetite: 0.2, defaultTolerance: 0.1, businessLine: 'consumer_finance', category: 'Collections' },
  { key: 'approval_rate', label: 'Approval Rate', direction: 'higher_is_better', defaultAppetite: 0.5, defaultTolerance: 0.35, businessLine: 'consumer_finance', category: 'Origination' },
  { key: 'los_achievement', label: 'LOS Achievement', direction: 'higher_is_better', defaultAppetite: 0.45, defaultTolerance: 0.35, businessLine: 'consumer_finance', category: 'Origination' },

  // ── Trade Finance ─────────────────────────────────────────────
  { key: 'npl_ratio', label: 'NPL Ratio', direction: 'lower_is_better', defaultAppetite: 0.03, defaultTolerance: 0.05, businessLine: 'trade_finance', category: 'Asset Quality' },
  { key: 'stage_2_3_pct', label: 'Stage 2+3%', direction: 'lower_is_better', defaultAppetite: 0.07, defaultTolerance: 0.1, businessLine: 'trade_finance', category: 'Asset Quality' },
  { key: 'avg_ews_score', label: 'Avg EWS Score', direction: 'lower_is_better', defaultAppetite: 1.0, defaultTolerance: 2.0, businessLine: 'trade_finance', category: 'Early Warning' },
  { key: 'collection_efficiency', label: 'Collection Efficiency', direction: 'higher_is_better', defaultAppetite: 0.9, defaultTolerance: 0.75, businessLine: 'trade_finance', category: 'Collections' },
  { key: 'trade_utilization', label: 'Utilization Rate', direction: 'lower_is_better', defaultAppetite: 0.80, defaultTolerance: 0.90, businessLine: 'trade_finance', category: 'Utilization' },
  { key: 'trade_collateral_coverage', label: 'Collateral Coverage', direction: 'higher_is_better', defaultAppetite: 0.80, defaultTolerance: 0.65, businessLine: 'trade_finance', category: 'Collateral' },
  { key: 'watchlist_exposure_pct', label: 'Watchlist Exposure %', direction: 'lower_is_better', defaultAppetite: 0.05, defaultTolerance: 0.10, businessLine: 'trade_finance', category: 'Watchlist' },
  { key: 'trade_overdue_ratio', label: 'Overdue Ratio', direction: 'lower_is_better', defaultAppetite: 0.05, defaultTolerance: 0.10, businessLine: 'trade_finance', category: 'Asset Quality' },
  { key: 'downgrade_rate', label: 'Downgrade Rate (S1→S2)', direction: 'lower_is_better', defaultAppetite: 0.05, defaultTolerance: 0.08, businessLine: 'trade_finance', category: 'Stage Migration' },
  { key: 'cure_rate', label: 'Cure Rate (S2→S1)', direction: 'higher_is_better', defaultAppetite: 0.30, defaultTolerance: 0.20, businessLine: 'trade_finance', category: 'Stage Migration' },

  // ── Corporate Finance ─────────────────────────────────────────
  { key: 'provision_coverage', label: 'Provision Coverage', direction: 'higher_is_better', defaultAppetite: 0.8, defaultTolerance: 0.6, businessLine: 'corporate_finance', category: 'Provisioning' },
  { key: 'corp_delinquency_rate', label: 'Delinquency Rate', direction: 'lower_is_better', defaultAppetite: 0.03, defaultTolerance: 0.05, businessLine: 'corporate_finance', category: 'Asset Quality' },
  { key: 'corp_npa_rate', label: 'NPA Rate', direction: 'lower_is_better', defaultAppetite: 0.02, defaultTolerance: 0.04, businessLine: 'corporate_finance', category: 'Asset Quality' },
  { key: 'corp_security_cover', label: 'Security Cover', direction: 'higher_is_better', defaultAppetite: 1.0, defaultTolerance: 0.80, businessLine: 'corporate_finance', category: 'Collateral' },
  { key: 'corp_covenant_breach_rate', label: 'Covenant Breach Rate', direction: 'lower_is_better', defaultAppetite: 0.05, defaultTolerance: 0.10, businessLine: 'corporate_finance', category: 'Covenants' },
  { key: 'corp_pcr', label: 'Provision Coverage Ratio', direction: 'higher_is_better', defaultAppetite: 0.80, defaultTolerance: 0.60, businessLine: 'corporate_finance', category: 'Provisioning' },
];

/** Lookup a metric definition by key */
export function getMetricDef(key: string): MetricDefinition | undefined {
  return METRIC_REGISTRY.find((m) => m.key === key);
}

/** Group metrics by business line */
export function getMetricsByBusinessLine(): Record<string, MetricDefinition[]> {
  const groups: Record<string, MetricDefinition[]> = {};
  METRIC_REGISTRY.forEach((m) => {
    const bl = m.businessLine;
    if (!groups[bl]) groups[bl] = [];
    groups[bl].push(m);
  });
  return groups;
}
