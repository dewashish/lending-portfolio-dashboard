import { supabase } from '../supabase';
import type { Database } from '../database.types';
import type { ScopeSelection } from '../types';
import { applyScopeAsync } from './shared';

// ── Consolidated Scorecard Row ───────────────────────────────────
type ScorecardViewRow = Database['public']['Views']['v_group_consolidated_scorecard']['Row'];

export interface ConsolidatedScorecardRow {
  subsidiaryId: number;
  subsidiary: string;
  shortCode: string;
  country: string;
  currencyCode: string;
  region: string;
  institutionType: string;
  consumerAumUsd: number | null;
  consumerLatestPeriod: string | null;
  consumerDelinquency30Plus: number | null;
  consumerDelinquency90Plus: number | null;
  tradeOutstandingUsd: number | null;
  tradeUtilization: number | null;
  tradeNplRatio: number | null;
  corporateWatchlistCount: number;
  corporateWatchlistExposureUsd: number | null;
  avgEwsScore: number | null;
  ewsFlaggedExposureUsd: number | null;
  ewsRagStatus: string | null;
  fxYtdDepreciation: number | null;
  fxRagStatus: string | null;
  countryRiskScore: number | null;
  countryRiskRagStatus: string | null;
}

export async function fetchConsolidatedScorecard(scope?: ScopeSelection): Promise<ConsolidatedScorecardRow[]> {
  let query = supabase
    .from('v_group_consolidated_scorecard')
    .select('*');
  query = await applyScopeAsync(query, scope);
  const { data, error } = await query;
  if (error) throw error;
  return ((data ?? []) as ScorecardViewRow[]).map((r) => ({
    subsidiaryId: r.subsidiary_id,
    subsidiary: r.subsidiary,
    shortCode: r.short_code,
    country: r.country,
    currencyCode: r.currency_code,
    region: r.region,
    institutionType: r.institution_type,
    consumerAumUsd: r.consumer_aum_usd,
    consumerLatestPeriod: r.consumer_latest_period,
    consumerDelinquency30Plus: r.consumer_delinquency_30plus,
    consumerDelinquency90Plus: r.consumer_delinquency_90plus,
    tradeOutstandingUsd: r.trade_outstanding_usd,
    tradeUtilization: r.trade_utilization,
    tradeNplRatio: r.trade_npl_ratio,
    corporateWatchlistCount: r.corporate_watchlist_count,
    corporateWatchlistExposureUsd: r.corporate_watchlist_exposure_usd,
    avgEwsScore: r.avg_ews_score,
    ewsFlaggedExposureUsd: r.ews_flagged_exposure_usd,
    ewsRagStatus: r.ews_rag_status,
    fxYtdDepreciation: r.fx_ytd_depreciation,
    fxRagStatus: r.fx_rag_status,
    countryRiskScore: r.country_risk_score,
    countryRiskRagStatus: r.country_risk_rag_status,
  }));
}
