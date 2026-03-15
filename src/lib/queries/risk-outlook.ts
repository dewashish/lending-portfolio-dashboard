import { supabase } from '../supabase';
import type { Database } from '../database.types';
import type {
  ScopeSelection,
  EclForecastRow,
  EclWaterfallRow,
  StressScenarioLossRow,
  CET1TrajectoryRow,
  EclSensitivityRow,
  PDMigrationCell,
  PDTermStructureRow,
  RatingDistributionRow,
  VintageForecastRow,
  RollRateForecastRow,
  LeadingIndicatorRow,
  MacroCreditLinkageRow,
  RiskOutlookKPIs,
  SubsidiaryStressScoreRow,
  ManagementActionRow,
} from '../types';
import { applyScopeAsync } from './shared';

// ── Type aliases ─────────────────────────────────────────────────
type EclForecastDbRow = Database['public']['Tables']['ecl_forecast']['Row'];
type EclWaterfallDbRow = Database['public']['Tables']['ecl_waterfall']['Row'];
type StressScenarioLossDbRow = Database['public']['Tables']['stress_scenario_losses']['Row'];
type CET1TrajectoryDbRow = Database['public']['Tables']['cet1_trajectory']['Row'];
type EclSensitivityDbRow = Database['public']['Tables']['ecl_sensitivity']['Row'];
type PDMigrationDbRow = Database['public']['Tables']['pd_migration_matrix']['Row'];
type PDTermStructureDbRow = Database['public']['Tables']['pd_term_structure']['Row'];
type RatingDistributionDbRow = Database['public']['Tables']['rating_distribution']['Row'];
type VintageForecastDbRow = Database['public']['Tables']['vintage_forecast']['Row'];
type RollRateForecastDbRow = Database['public']['Tables']['roll_rate_forecast']['Row'];
type LeadingIndicatorDbRow = Database['public']['Tables']['leading_indicators']['Row'];
type MacroCreditLinkageDbRow = Database['public']['Tables']['macro_credit_linkage']['Row'];
type SubsidiaryStressScoreDbRow = Database['public']['Tables']['subsidiary_stress_scores']['Row'];
type ManagementActionDbRow = Database['public']['Tables']['management_actions']['Row'];

// ── Query Functions ──────────────────────────────────────────────

export async function fetchEclForecast(scope?: ScopeSelection, scenario?: string): Promise<EclForecastRow[]> {
  let query = supabase
    .from('ecl_forecast')
    .select('*')
    .order('id');
  if (scenario) query = query.eq('scenario', scenario);
  query = await applyScopeAsync(query, scope);
  const { data, error } = await query;
  if (error) throw error;
  const rows = (data ?? []) as EclForecastDbRow[];
  return rows.map((r) => ({
    id: r.id,
    subsidiaryId: r.subsidiary_id,
    stage: r.stage,
    scenario: r.scenario,
    quarter: r.quarter,
    eclAmount: r.ecl_amount,
    eclAmountUsd: r.ecl_amount_usd,
    coverageRatio: r.coverage_ratio,
  }));
}

export async function fetchEclWaterfall(scope?: ScopeSelection, scenario?: string): Promise<EclWaterfallRow[]> {
  let query = supabase
    .from('ecl_waterfall')
    .select('*')
    .order('sort_order');
  if (scenario) query = query.eq('scenario', scenario);
  query = await applyScopeAsync(query, scope);
  const { data, error } = await query;
  if (error) throw error;
  const rows = (data ?? []) as EclWaterfallDbRow[];
  return rows.map((r) => ({
    id: r.id,
    subsidiaryId: r.subsidiary_id,
    scenario: r.scenario,
    driver: r.driver,
    amount: r.amount,
    amountUsd: r.amount_usd,
    sortOrder: r.sort_order,
  }));
}

export async function fetchStressScenarioLosses(scope?: ScopeSelection): Promise<StressScenarioLossRow[]> {
  let query = supabase
    .from('stress_scenario_losses')
    .select('*')
    .order('id');
  query = await applyScopeAsync(query, scope);
  const { data, error } = await query;
  if (error) throw error;
  const rows = (data ?? []) as StressScenarioLossDbRow[];
  return rows.map((r) => ({
    id: r.id,
    subsidiaryId: r.subsidiary_id,
    segment: r.segment,
    scenario: r.scenario,
    lossRate: r.loss_rate,
    lossAmount: r.loss_amount,
    lossAmountUsd: r.loss_amount_usd,
  }));
}

export async function fetchCET1Trajectory(scope?: ScopeSelection): Promise<CET1TrajectoryRow[]> {
  let query = supabase
    .from('cet1_trajectory')
    .select('*')
    .order('id');
  query = await applyScopeAsync(query, scope);
  const { data, error } = await query;
  if (error) throw error;
  const rows = (data ?? []) as CET1TrajectoryDbRow[];
  return rows.map((r) => ({
    id: r.id,
    subsidiaryId: r.subsidiary_id,
    scenario: r.scenario,
    quarter: r.quarter,
    cet1Ratio: r.cet1_ratio,
    rwaAmount: r.rwa_amount,
    capitalAmount: r.capital_amount,
  }));
}

export async function fetchEclSensitivity(scope?: ScopeSelection): Promise<EclSensitivityRow[]> {
  let query = supabase
    .from('ecl_sensitivity')
    .select('*')
    .order('id');
  query = await applyScopeAsync(query, scope);
  const { data, error } = await query;
  if (error) throw error;
  const rows = (data ?? []) as EclSensitivityDbRow[];
  return rows.map((r) => ({
    id: r.id,
    subsidiaryId: r.subsidiary_id,
    factor: r.factor,
    direction: r.direction,
    eclImpactPct: r.ecl_impact_pct,
    eclImpactAmount: r.ecl_impact_amount,
  }));
}

export async function fetchPDMigrationMatrix(scope?: ScopeSelection): Promise<PDMigrationCell[]> {
  let query = supabase
    .from('pd_migration_matrix')
    .select('*')
    .order('id');
  query = await applyScopeAsync(query, scope);
  const { data, error } = await query;
  if (error) throw error;
  const rows = (data ?? []) as PDMigrationDbRow[];
  return rows.map((r) => ({
    id: r.id,
    subsidiaryId: r.subsidiary_id,
    fromGrade: r.from_grade,
    toGrade: r.to_grade,
    probability: r.probability,
    longRunAvg: r.long_run_avg,
  }));
}

export async function fetchPDTermStructure(scope?: ScopeSelection): Promise<PDTermStructureRow[]> {
  let query = supabase
    .from('pd_term_structure')
    .select('*')
    .order('id');
  query = await applyScopeAsync(query, scope);
  const { data, error } = await query;
  if (error) throw error;
  const rows = (data ?? []) as PDTermStructureDbRow[];
  return rows.map((r) => ({
    id: r.id,
    subsidiaryId: r.subsidiary_id,
    ratingGrade: r.rating_grade,
    horizonYears: r.horizon_years,
    cumulativePd: r.cumulative_pd,
  }));
}

export async function fetchRatingDistribution(scope?: ScopeSelection): Promise<RatingDistributionRow[]> {
  let query = supabase
    .from('rating_distribution')
    .select('*')
    .order('id');
  query = await applyScopeAsync(query, scope);
  const { data, error } = await query;
  if (error) throw error;
  const rows = (data ?? []) as RatingDistributionDbRow[];
  return rows.map((r) => ({
    id: r.id,
    subsidiaryId: r.subsidiary_id,
    ratingGrade: r.rating_grade,
    currentShare: r.current_share,
    projectedShare: r.projected_share,
    projectionQuarter: r.projection_quarter,
  }));
}

export async function fetchVintageForecast(scope?: ScopeSelection): Promise<VintageForecastRow[]> {
  let query = supabase
    .from('vintage_forecast')
    .select('*')
    .order('id');
  query = await applyScopeAsync(query, scope);
  const { data, error } = await query;
  if (error) throw error;
  const rows = (data ?? []) as VintageForecastDbRow[];
  return rows.map((r) => ({
    id: r.id,
    subsidiaryId: r.subsidiary_id,
    vintage: r.vintage,
    mob: r.mob,
    actualDelinqRate: r.actual_delinq_rate,
    projectedDelinqRate: r.projected_delinq_rate,
    isProjected: r.is_projected,
  }));
}

export async function fetchRollRateForecast(scope?: ScopeSelection): Promise<RollRateForecastRow[]> {
  let query = supabase
    .from('roll_rate_forecast')
    .select('*')
    .order('id');
  query = await applyScopeAsync(query, scope);
  const { data, error } = await query;
  if (error) throw error;
  const rows = (data ?? []) as RollRateForecastDbRow[];
  return rows.map((r) => ({
    id: r.id,
    subsidiaryId: r.subsidiary_id,
    fromBucket: r.from_bucket,
    toBucket: r.to_bucket,
    forecastMonth: r.forecast_month,
    transitionRate: r.transition_rate,
  }));
}

export async function fetchLeadingIndicators(scope?: ScopeSelection): Promise<LeadingIndicatorRow[]> {
  let query = supabase
    .from('leading_indicators')
    .select('*')
    .order('id');
  query = await applyScopeAsync(query, scope);
  const { data, error } = await query;
  if (error) throw error;
  const rows = (data ?? []) as LeadingIndicatorDbRow[];
  return rows.map((r) => ({
    id: r.id,
    subsidiaryId: r.subsidiary_id,
    indicatorName: r.indicator_name,
    currentValue: r.current_value,
    zScore: r.z_score,
    trend: r.trend,
    ragStatus: r.rag_status,
    category: r.category,
  }));
}

export async function fetchMacroCreditLinkage(scope?: ScopeSelection): Promise<MacroCreditLinkageRow[]> {
  let query = supabase
    .from('macro_credit_linkage')
    .select('*')
    .order('id');
  query = await applyScopeAsync(query, scope);
  const { data, error } = await query;
  if (error) throw error;
  const rows = (data ?? []) as MacroCreditLinkageDbRow[];
  return rows.map((r) => ({
    id: r.id,
    subsidiaryId: r.subsidiary_id,
    macroVariable: r.macro_variable,
    creditMetric: r.credit_metric,
    period: r.period,
    macroValue: r.macro_value,
    creditValue: r.credit_value,
    leadMonths: r.lead_months,
  }));
}

export async function fetchSubsidiaryStressScores(scope?: ScopeSelection): Promise<SubsidiaryStressScoreRow[]> {
  let query = supabase
    .from('subsidiary_stress_scores')
    .select('*')
    .order('id');
  query = await applyScopeAsync(query, scope);
  const { data, error } = await query;
  if (error) throw error;
  const rows = (data ?? []) as SubsidiaryStressScoreDbRow[];
  return rows.map((r) => ({
    id: r.id,
    subsidiaryId: r.subsidiary_id,
    dimension: r.dimension,
    score: Number(r.score),
    ragStatus: r.rag_status,
    drivers: (r.drivers ?? []) as { label: string; detail: string }[],
  }));
}

export async function fetchManagementActions(scope?: ScopeSelection): Promise<ManagementActionRow[]> {
  let query = supabase
    .from('management_actions')
    .select('*')
    .order('id');
  query = await applyScopeAsync(query, scope);
  const { data, error } = await query;
  if (error) throw error;
  const rows = (data ?? []) as ManagementActionDbRow[];
  return rows.map((r) => ({
    id: r.id,
    subsidiaryId: r.subsidiary_id,
    triggerSource: r.trigger_source,
    triggerIndicator: r.trigger_indicator,
    ragStatus: r.rag_status,
    actionCategory: r.action_category,
    actionDescription: r.action_description,
    priority: r.priority,
    owner: r.owner,
    deadline: r.deadline,
    status: r.status,
  }));
}

// ── KPI Aggregator ───────────────────────────────────────────────

export async function fetchRiskOutlookKPIs(scope?: ScopeSelection): Promise<RiskOutlookKPIs> {
  // Fetch ECL forecast — Base scenario only
  let eclQuery = supabase
    .from('ecl_forecast')
    .select('*')
    .eq('scenario', 'Base');
  eclQuery = await applyScopeAsync(eclQuery, scope);
  const { data: eclData, error: eclError } = await eclQuery;
  if (eclError) throw eclError;
  const eclRows = (eclData ?? []) as EclForecastDbRow[];

  // Find the latest quarter
  const quarters = eclRows.map((r) => r.quarter).sort();
  const latestQuarter = quarters[quarters.length - 1] ?? '';
  const latestEcl = eclRows.filter((r) => r.quarter === latestQuarter);

  // totalEcl: sum of ecl_amount_usd for latest quarter across stages
  const totalEcl = latestEcl.reduce((sum, r) => sum + (r.ecl_amount_usd ?? 0), 0);

  // provisionCoverage: weighted average of coverage_ratio from ecl_forecast
  const totalEclForWeight = latestEcl.reduce((sum, r) => sum + (r.ecl_amount ?? 0), 0);
  const provisionCoverage = totalEclForWeight > 0
    ? latestEcl.reduce((sum, r) => sum + (r.coverage_ratio ?? 0) * (r.ecl_amount ?? 0), 0) / totalEclForWeight
    : 0;

  // cet1UnderStress: min cet1_ratio from cet1_trajectory for Severe scenario
  let cet1Query = supabase
    .from('cet1_trajectory')
    .select('*')
    .eq('scenario', 'Severe');
  cet1Query = await applyScopeAsync(cet1Query, scope);
  const { data: cet1Data, error: cet1Error } = await cet1Query;
  if (cet1Error) throw cet1Error;
  const cet1Rows = (cet1Data ?? []) as CET1TrajectoryDbRow[];
  const cet1UnderStress = cet1Rows.length > 0
    ? Math.min(...cet1Rows.map((r) => r.cet1_ratio))
    : 0;

  // avgPd1Y: average of cumulative_pd where horizon_years = 1
  let pdQuery = supabase
    .from('pd_term_structure')
    .select('*')
    .eq('horizon_years', 1);
  pdQuery = await applyScopeAsync(pdQuery, scope);
  const { data: pdData, error: pdError } = await pdQuery;
  if (pdError) throw pdError;
  const pdRows = (pdData ?? []) as PDTermStructureDbRow[];
  const avgPd1Y = pdRows.length > 0
    ? pdRows.reduce((sum, r) => sum + r.cumulative_pd, 0) / pdRows.length
    : 0;

  // ewsAlerts: count of leading_indicators where rag_status = 'Red'
  let ewsQuery = supabase
    .from('leading_indicators')
    .select('*')
    .eq('rag_status', 'Red');
  ewsQuery = await applyScopeAsync(ewsQuery, scope);
  const { data: ewsData, error: ewsError } = await ewsQuery;
  if (ewsError) throw ewsError;
  const ewsRows = (ewsData ?? []) as LeadingIndicatorDbRow[];
  const ewsAlerts = ewsRows.length;

  return {
    totalEcl,
    provisionCoverage,
    cet1UnderStress,
    avgPd1Y,
    ewsAlerts,
  };
}
