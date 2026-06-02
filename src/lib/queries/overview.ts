import { supabase } from '../supabase';
import type { Database } from '../database.types';
import type {
  ScopeSelection,
  ConsumerMetricRow,
  EWSEntitySummary,
  FXRiskRow,
  CountryRiskRow,
  AssetQualityByEntity,
  EntityPerformance,
  PortfolioSummary,
  CorporatePortfolioSummary,
} from '../types';
import { applyScopeAsync } from './shared';
import { overrideScorecardRow } from '../baobab-overrides';
import { fetchConsumerOverall, fetchConsumerUnsecuredFPD } from './consumer';
import { fetchTradeExecutiveSummary, fetchTradeAssetQuality, fetchTradeEntityPerformance } from './trade';
import { fetchCorporateExecutiveSummary, fetchCorporatePOSBySubsidiary, fetchCorporateStageBalances } from './corporate';
import { fetchEWSEntitySummary, fetchFXRisk, fetchCountryRisk } from './risk';

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
  return ((data ?? []) as ScorecardViewRow[]).map((r) => overrideScorecardRow({
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

// ── Group Overview Composite Summary ─────────────────────────────
export interface GroupOverviewSummary {
  scorecard: ConsolidatedScorecardRow[];
  tradeSummary: PortfolioSummary | null;
  corporateSummary: CorporatePortfolioSummary | null;
  consumerOverall: ConsumerMetricRow[];
  ewsSummary: EWSEntitySummary[];
  fxRisk: FXRiskRow[];
  countryRisk: CountryRiskRow[];
  tradeAssetQuality: AssetQualityByEntity[];
  tradeEntityPerf: EntityPerformance[];
  unsecuredFPD: ConsumerMetricRow[];
  corporatePOSBySubsidiary: Record<number, number>;
  corporateStageBalances: { stage1: number; stage2: number; stage3: number };
}

export async function fetchGroupOverviewSummary(scope?: ScopeSelection): Promise<GroupOverviewSummary> {
  const [
    scorecard,
    tradeSummary,
    corporateSummary,
    consumerOverall,
    ewsSummary,
    fxRisk,
    countryRisk,
    tradeAssetQuality,
    tradeEntityPerf,
    unsecuredFPD,
    corporatePOSBySubsidiary,
    corporateStageBalances,
  ] = await Promise.all([
    fetchConsolidatedScorecard(scope).catch(() => [] as ConsolidatedScorecardRow[]),
    fetchTradeExecutiveSummary(scope).catch(() => null),
    fetchCorporateExecutiveSummary(scope).catch(() => null),
    fetchConsumerOverall(scope).catch(() => [] as ConsumerMetricRow[]),
    fetchEWSEntitySummary(scope).catch(() => [] as EWSEntitySummary[]),
    fetchFXRisk(scope).catch(() => [] as FXRiskRow[]),
    fetchCountryRisk(scope).catch(() => [] as CountryRiskRow[]),
    fetchTradeAssetQuality(scope).catch(() => [] as AssetQualityByEntity[]),
    fetchTradeEntityPerformance(scope).catch(() => [] as EntityPerformance[]),
    fetchConsumerUnsecuredFPD(scope).catch(() => [] as ConsumerMetricRow[]),
    fetchCorporatePOSBySubsidiary(scope).catch(() => ({} as Record<number, number>)),
    fetchCorporateStageBalances(scope).catch(() => ({ stage1: 0, stage2: 0, stage3: 0 })),
  ]);
  return {
    scorecard,
    tradeSummary,
    corporateSummary,
    consumerOverall,
    ewsSummary,
    fxRisk,
    countryRisk,
    tradeAssetQuality,
    tradeEntityPerf,
    unsecuredFPD,
    corporatePOSBySubsidiary,
    corporateStageBalances,
  };
}
