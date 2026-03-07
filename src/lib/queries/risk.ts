import { supabase } from '../supabase';
import type {
  EWSEntitySummary,
  EWSFacilityAlert,
  FXRiskRow,
  CountryRiskRow,
  ScopeSelection,
  RAGStatus,
  IFRSStage,
} from '../types';
import { applyScopeAsync } from './shared';

// ── Query Functions ──────────────────────────────────────────────

export async function fetchEWSEntitySummary(scope?: ScopeSelection): Promise<EWSEntitySummary[]> {
  let query = supabase
    .from('ews_entity_summary')
    .select('*, subsidiaries!inner(name)')
    .order('id');
  query = await applyScopeAsync(query, scope);
  const { data, error } = await query;
  if (error) throw error;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return ((data ?? []) as any[]).map((r) => ({
    entity: r.subsidiaries?.name ?? '',
    score0: r.score0 ?? 0,
    score1: r.score1 ?? 0,
    score2: r.score2 ?? 0,
    score3: r.score3 ?? 0,
    score4Plus: r.score4_plus ?? 0,
    totalFacilities: r.total_facilities ?? 0,
    avgEWSScore: r.avg_ews_score ?? 0,
    flaggedExposure: r.flagged_exposure_usd ?? r.flagged_exposure ?? 0,
    rag: (r.rag_status ?? 'Green') as RAGStatus,
  }));
}

export async function fetchEWSFacilityAlerts(scope?: ScopeSelection): Promise<EWSFacilityAlert[]> {
  let query = supabase
    .from('ews_facility_alerts')
    .select('*, subsidiaries!inner(name)')
    .order('ews_score', { ascending: false });
  query = await applyScopeAsync(query, scope);
  const { data, error } = await query;
  if (error) throw error;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return ((data ?? []) as any[]).map((r) => ({
    facilityRef: r.facility_ref,
    entity: r.subsidiaries?.name ?? '',
    obligor: r.obligor,
    ewsScore: r.ews_score,
    outstanding: r.outstanding_usd ?? r.outstanding ?? 0,
    triggers: r.triggers ?? '',
    stage: (r.ifrs_stage ?? 'Stage 1') as IFRSStage,
    action: r.action ?? '',
  }));
}

export async function fetchFXRisk(scope?: ScopeSelection): Promise<FXRiskRow[]> {
  let query = supabase
    .from('fx_risk')
    .select('*, subsidiaries!inner(name)')
    .order('id');
  query = await applyScopeAsync(query, scope);
  const { data, error } = await query;
  if (error) throw error;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return ((data ?? []) as any[]).map((r) => ({
    entity: r.subsidiaries?.name ?? '',
    primaryCurrency: r.primary_currency,
    fxRate: r.fx_rate,
    volatility30Day: r.volatility_30d ?? 0,
    volatility90Day: r.volatility_90d ?? 0,
    ytdDepreciation: r.ytd_depreciation ?? 0,
    portfolioExposure: r.portfolio_exposure_usd ?? r.portfolio_exposure ?? 0,
    fxImpact: r.fx_impact_usd ?? r.fx_impact ?? 0,
    capitalControls: r.capital_controls,
    transferRisk: r.transfer_risk ?? 'Low',
    rag: (r.rag_status ?? 'Green') as RAGStatus,
  }));
}

export async function fetchCountryRisk(scope?: ScopeSelection): Promise<CountryRiskRow[]> {
  let query = supabase
    .from('country_risk')
    .select('*, subsidiaries!inner(name)')
    .order('id');
  query = await applyScopeAsync(query, scope);
  const { data, error } = await query;
  if (error) throw error;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return ((data ?? []) as any[]).map((r) => ({
    entity: r.subsidiaries?.name ?? '',
    sovereignRating: r.sovereign_rating ?? 0,
    countryRiskScore: r.country_risk_score ?? 0,
    regulatoryScore: r.regulatory_score ?? 0,
    politicalStabilityScore: r.political_stability_score ?? 0,
    compositeScore: r.composite_score ?? 0,
    exposure: r.exposure_usd ?? r.exposure ?? 0,
    rwaShare: r.rwa_share ?? 0,
    capitalImpact: r.capital_impact_usd ?? r.capital_impact ?? 0,
    recommendation: r.recommendation ?? '',
    rag: (r.rag_status ?? 'Green') as RAGStatus,
  }));
}
