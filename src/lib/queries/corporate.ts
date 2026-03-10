import { supabase } from '../supabase';
import type { Database } from '../database.types';
import type {
  CorporateWatchlistRow,
  CovenantTrackingRow,
  CorporateDelinquencyRow,
  CorporatePortfolioRow,
  CorporateTopCustomerRow,
  CorporateIndustryConcentrationRow,
  CorporateCollateralRow,
  CorporateLTVRow,
  CorporateMaturityRow,
  CorporateProvisioningRow,
  CorporateRatingAnalysisRow,
  CorporateRatingMigrationRow,
  CorporatePortfolioSummary,
  CorporatePDDistributionRow,
  CorporatePipelineRow,
  ScopeSelection,
} from '../types';
import { applyScopeAsync } from './shared';

// ── Type aliases ─────────────────────────────────────────────────
// WatchlistDbRow removed — using any[] cast for new columns not in generated types
type CovenantDbRow = Database['public']['Tables']['corporate_covenants']['Row'];
type DelinquencyDbRow = Database['public']['Tables']['corporate_delinquency']['Row'];
type PortfolioMetricDbRow = Database['public']['Tables']['corporate_portfolio_metrics']['Row'];

// ── Query Functions ──────────────────────────────────────────────

export async function fetchCorporateWatchlist(scope?: ScopeSelection): Promise<CorporateWatchlistRow[]> {
  let query = supabase
    .from('corporate_watchlist')
    .select('*')
    .order('exposure_usd', { ascending: false });
  query = await applyScopeAsync(query, scope);
  const { data, error } = await query;
  if (error) throw error;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return ((data ?? []) as any[]).map((r) => ({
    borrower: r.borrower,
    sector: r.sector,
    exposure: String(r.exposure_usd ?? r.exposure ?? 0),
    exposureNum: Number(r.exposure_usd ?? r.exposure ?? 0),
    ewsTriggerType: r.ews_trigger_type ?? '',
    triggerCategory: r.trigger_category ?? '',
    internalRating: r.internal_rating ?? '',
    priorRating: r.prior_rating ?? '',
    status: r.status ?? '',
    remedialAction: r.remedial_action ?? '',
    dateAdded: r.date_added ?? '',
    daysOnWatchlist: r.days_on_watchlist ?? 0,
  }));
}

export async function fetchCorporateCovenants(scope?: ScopeSelection): Promise<CovenantTrackingRow[]> {
  let query = supabase
    .from('corporate_covenants')
    .select('*')
    .order('id');
  query = await applyScopeAsync(query, scope);
  const { data, error } = await query;
  if (error) throw error;
  return ((data ?? []) as CovenantDbRow[]).map((r) => ({
    groupId: r.group_id,
    custId: r.cust_id,
    customerName: r.customer_name,
    dateOfDisbursal: r.date_of_disbursal ?? '',
    sanctionedLimit: r.sanctioned_limit_usd ?? r.sanctioned_limit ?? 0,
    disbursedAmount: r.disbursed_amount_usd ?? r.disbursed_amount ?? 0,
    currentPOS: r.current_pos_usd ?? r.current_pos ?? 0,
    facilityType: r.facility_type ?? '',
    securityType: r.security_type ?? '',
    securityCover: r.security_cover ?? 0,
    riskRating: r.risk_rating ?? '',
    covenantCategory: r.covenant_category ?? '',
    covenantType: r.covenant_type ?? '',
    covenantDescription: r.covenant_description ?? '',
    covenantFrequency: r.covenant_frequency ?? '',
    submissionDate: r.submission_date ?? '',
    approvalForExtension: r.approval_for_extension ?? '',
    npaFlag: r.npa_flag,
    restructuredFlag: r.restructured_flag,
    watchlistFlag: r.watchlist_flag,
    writeoffFlag: r.writeoff_flag,
  }));
}

export async function fetchCorporateDelinquency(scope?: ScopeSelection): Promise<CorporateDelinquencyRow[]> {
  let query = supabase
    .from('corporate_delinquency')
    .select('*')
    .order('current_dpd', { ascending: false });
  query = await applyScopeAsync(query, scope);
  const { data, error } = await query;
  if (error) throw error;
  return ((data ?? []) as DelinquencyDbRow[]).map((r) => ({
    groupId: r.group_id,
    custId: r.cust_id,
    customerName: r.customer_name,
    sector: r.sector ?? '',
    industry: r.industry ?? '',
    sanctionedLimit: r.sanctioned_limit_usd ?? r.sanctioned_limit ?? 0,
    disbursedAmount: r.disbursed_amount_usd ?? r.disbursed_amount ?? 0,
    currentPOS: r.current_pos_usd ?? r.current_pos ?? 0,
    facilityType: r.facility_type ?? '',
    securityType: r.security_type ?? '',
    securityCover: r.security_cover ?? 0,
    ratingAtDisbursement: r.rating_at_disbursement ?? '',
    currentRating: r.current_rating ?? '',
    renewalDone: r.renewal_done,
    dpdAtMonthEnd: r.dpd_at_month_end ?? 0,
    currentDPD: r.current_dpd ?? 0,
    reasonForDelinquency: r.reason_for_delinquency ?? '',
    lastRemedialAction: r.last_remedial_action ?? '',
    updateOnRemedial: r.update_on_remedial ?? '',
    currentStatus: r.current_status ?? '',
    nextStep: r.next_step ?? '',
  }));
}

export async function fetchCorporatePortfolioMetrics(scope?: ScopeSelection): Promise<CorporatePortfolioRow[]> {
  let query = supabase
    .from('corporate_portfolio_metrics')
    .select('*')
    .order('id');
  query = await applyScopeAsync(query, scope);
  const { data, error } = await query;
  if (error) throw error;

  // Pivot: group by particular, nest periods
  const map = new Map<string, CorporatePortfolioRow>();
  for (const r of (data ?? []) as PortfolioMetricDbRow[]) {
    if (!map.has(r.particular)) {
      map.set(r.particular, { particular: r.particular, months: {} });
    }
    map.get(r.particular)!.months[r.period] = {
      total: r.total_usd ?? r.total ?? 0,
      fundBased: r.fund_based_usd ?? r.fund_based ?? 0,
      nonFB: r.non_fund_based_usd ?? r.non_fund_based ?? 0,
    };
  }
  return Array.from(map.values());
}

export async function fetchCorporateTopCustomers(scope?: ScopeSelection): Promise<CorporateTopCustomerRow[]> {
  let query = supabase.from('corporate_top_customers').select('*').order('rank_by_pos', { ascending: true });
  query = await applyScopeAsync(query, scope);
  const { data, error } = await query;
  if (error) throw error;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return ((data ?? []) as any[]).map((r) => ({
    customerName: r.customer_name,
    sector: r.sector,
    sanctionedLimit: r.sanctioned_limit_usd ?? r.sanctioned_limit ?? 0,
    disbursedAmount: r.disbursed_amount_usd ?? r.disbursed_amount ?? 0,
    currentPOS: r.current_pos_usd ?? r.current_pos ?? 0,
    facilityType: r.facility_type ?? '',
    riskRating: r.risk_rating ?? '',
    dpd: r.dpd ?? 0,
    ifrsStage: r.ifrs_stage ?? 'Stage 1',
    rankByDisbursement: r.rank_by_disbursement ?? 0,
    rankByPOS: r.rank_by_pos ?? 0,
    pceAmount: r.pce_amount_usd ?? r.pce_amount ?? 0,
    irr: r.irr ?? null,
    securityType: r.security_type ?? '',
    securityCover: r.security_cover ?? 0,
    industry: r.industry ?? '',
  }));
}

export async function fetchCorporateTopDisbursements(scope?: ScopeSelection): Promise<CorporateTopCustomerRow[]> {
  let query = supabase.from('corporate_top_customers').select('*').order('rank_by_disbursement', { ascending: true });
  query = await applyScopeAsync(query, scope);
  const { data, error } = await query;
  if (error) throw error;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return ((data ?? []) as any[]).map((r) => ({
    customerName: r.customer_name,
    sector: r.sector,
    sanctionedLimit: r.sanctioned_limit_usd ?? r.sanctioned_limit ?? 0,
    disbursedAmount: r.disbursed_amount_usd ?? r.disbursed_amount ?? 0,
    currentPOS: r.current_pos_usd ?? r.current_pos ?? 0,
    facilityType: r.facility_type ?? '',
    riskRating: r.risk_rating ?? '',
    dpd: r.dpd ?? 0,
    ifrsStage: r.ifrs_stage ?? 'Stage 1',
    rankByDisbursement: r.rank_by_disbursement ?? 0,
    rankByPOS: r.rank_by_pos ?? 0,
    pceAmount: r.pce_amount_usd ?? r.pce_amount ?? 0,
    irr: r.irr ?? null,
    securityType: r.security_type ?? '',
    securityCover: r.security_cover ?? 0,
    industry: r.industry ?? '',
  }));
}

export async function fetchCorporateIndustryConcentration(scope?: ScopeSelection): Promise<CorporateIndustryConcentrationRow[]> {
  let query = supabase.from('corporate_industry_concentration').select('*').order('portfolio_share', { ascending: false });
  query = await applyScopeAsync(query, scope);
  const { data, error } = await query;
  if (error) throw error;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return ((data ?? []) as any[]).map((r) => ({
    sector: r.sector,
    period: r.period,
    disbursement: r.disbursement_usd ?? r.disbursement ?? 0,
    pos: r.pos_usd ?? r.pos ?? 0,
    portfolioShare: r.portfolio_share ?? 0,
    irr: r.irr,
    facilityCount: r.facility_count ?? 0,
  }));
}

export async function fetchCorporateCollateralAnalysis(scope?: ScopeSelection): Promise<CorporateCollateralRow[]> {
  let query = supabase.from('corporate_collateral_analysis').select('*').order('exposure_covered_usd', { ascending: false });
  query = await applyScopeAsync(query, scope);
  const { data, error } = await query;
  if (error) throw error;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return ((data ?? []) as any[]).map((r) => ({
    collateralType: r.collateral_type,
    facilityCount: r.facility_count ?? 0,
    collateralValue: r.collateral_value_usd ?? r.collateral_value ?? 0,
    exposureCovered: r.exposure_covered_usd ?? r.exposure_covered ?? 0,
    coverageRatio: r.coverage_ratio ?? 0,
    sanctionedAmount: r.sanctioned_amount_usd ?? r.sanctioned_amount ?? 0,
    disbursedAmount: r.disbursed_amount_usd ?? r.disbursed_amount ?? 0,
    principalOS: r.principal_os_usd ?? r.principal_os ?? 0,
    principalShare: r.principal_share ?? 0,
    particulars: r.particulars ?? '',
  }));
}

export async function fetchCorporateLTVDistribution(scope?: ScopeSelection): Promise<CorporateLTVRow[]> {
  let query = supabase.from('corporate_ltv_distribution').select('*').order('id');
  query = await applyScopeAsync(query, scope);
  const { data, error } = await query;
  if (error) throw error;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return ((data ?? []) as any[]).map((r) => ({
    ltvBand: r.ltv_band,
    facilityCount: r.facility_count ?? 0,
    balance: r.balance_usd ?? r.balance ?? 0,
    portfolioShare: r.portfolio_share ?? 0,
  }));
}

export async function fetchCorporateMaturityProfile(scope?: ScopeSelection): Promise<CorporateMaturityRow[]> {
  let query = supabase.from('corporate_maturity_profile').select('*').order('id');
  query = await applyScopeAsync(query, scope);
  const { data, error } = await query;
  if (error) throw error;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return ((data ?? []) as any[]).map((r) => ({
    maturityBand: r.maturity_band,
    facilityBasis: r.facility_basis,
    facilityCount: r.facility_count ?? 0,
    balance: r.balance_usd ?? r.balance ?? 0,
    portfolioShare: r.portfolio_share ?? 0,
    sanctionedAmount: r.sanctioned_amount_usd ?? r.sanctioned_amount ?? 0,
    disbursedAmount: r.disbursed_amount_usd ?? r.disbursed_amount ?? 0,
  }));
}

export async function fetchCorporateProvisioningECL(scope?: ScopeSelection): Promise<CorporateProvisioningRow[]> {
  let query = supabase.from('corporate_provisioning_ecl').select('*').order('id');
  query = await applyScopeAsync(query, scope);
  const { data, error } = await query;
  if (error) throw error;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return ((data ?? []) as any[]).map((r) => ({
    period: r.period,
    ifrsStage: r.ifrs_stage,
    grossExposure: r.gross_exposure_usd ?? r.gross_exposure ?? 0,
    provisionAmount: r.provision_amount_usd ?? r.provision_amount ?? 0,
    pcrPct: r.pcr_pct ?? 0,
  }));
}

export async function fetchCorporateRatingAnalysis(scope?: ScopeSelection): Promise<CorporateRatingAnalysisRow[]> {
  let query = supabase.from('corporate_rating_analysis').select('*').order('id');
  query = await applyScopeAsync(query, scope);
  const { data, error } = await query;
  if (error) throw error;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return ((data ?? []) as any[]).map((r) => ({
    period: r.period,
    ratingBand: r.rating_band,
    disbursement: r.disbursement_usd ?? r.disbursement ?? 0,
    pos: r.pos_usd ?? r.pos ?? 0,
    facilityCount: r.facility_count ?? 0,
    portfolioShare: r.portfolio_share ?? 0,
  }));
}

export async function fetchCorporateRatingMigration(scope?: ScopeSelection): Promise<CorporateRatingMigrationRow[]> {
  let query = supabase.from('corporate_rating_migration').select('*').order('id');
  query = await applyScopeAsync(query, scope);
  const { data, error } = await query;
  if (error) throw error;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return ((data ?? []) as any[]).map((r) => ({
    customerName: r.customer_name,
    sector: r.sector ?? '',
    priorRating: r.prior_rating,
    currentRating: r.current_rating,
    migrationDirection: r.migration_direction,
    triggerReason: r.trigger_reason ?? '',
    exposure: r.exposure_usd ?? r.exposure ?? 0,
    migrationDate: r.migration_date ?? '',
  }));
}

export async function fetchCorporateExecutiveSummary(scope?: ScopeSelection): Promise<CorporatePortfolioSummary | null> {
  const [watchlist, covenants, delinquency, provisioning, collateral] = await Promise.all([
    fetchCorporateWatchlist(scope),
    fetchCorporateCovenants(scope),
    fetchCorporateDelinquency(scope),
    fetchCorporateProvisioningECL(scope).catch(() => []),
    fetchCorporateCollateralAnalysis(scope).catch(() => []),
  ]);

  const totalPOS = delinquency.reduce((s, r) => s + r.currentPOS, 0) || 0;
  const totalDisbursement = delinquency.reduce((s, r) => s + r.disbursedAmount, 0) || 0;
  const totalSanctioned = delinquency.reduce((s, r) => s + r.sanctionedLimit, 0) || 0;
  const delinquentCount = delinquency.filter(r => r.currentDPD > 0).length;
  const delinquencyRate = delinquency.length > 0 ? delinquentCount / delinquency.length : 0;
  const npaCount = delinquency.filter(r => r.currentDPD > 90).length;
  const npaRate = delinquency.length > 0 ? npaCount / delinquency.length : 0;
  const avgSecurityCover = collateral.length > 0
    ? collateral.reduce((s, r) => s + r.coverageRatio, 0) / collateral.length
    : 0;
  const breachedCovenants = covenants.filter(r => r.npaFlag || r.watchlistFlag).length;
  const covenantBreachRate = covenants.length > 0 ? breachedCovenants / covenants.length : 0;

  // Get latest period provisioning
  const latestProv = provisioning.length > 0 ? provisioning : [];
  const totalGross = latestProv.reduce((s, r) => s + r.grossExposure, 0);
  const totalProvision = latestProv.reduce((s, r) => s + r.provisionAmount, 0);
  const pcr = totalGross > 0 ? totalProvision / totalGross : 0;

  return {
    totalPOS,
    totalDisbursement,
    totalSanctioned,
    delinquencyRate,
    npaRate,
    avgSecurityCover,
    covenantBreachRate,
    provisionCoverageRatio: pcr,
    watchlistCount: watchlist.length,
    delinquentCount,
  };
}

export async function fetchCorporatePDDistribution(scope?: ScopeSelection): Promise<CorporatePDDistributionRow[]> {
  let query = supabase.from('corporate_pd_distribution').select('*').order('id');
  query = await applyScopeAsync(query, scope);
  const { data, error } = await query;
  if (error) throw error;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return ((data ?? []) as any[]).map((r) => ({
    pdBand: r.pd_band,
    sanctionedAmount: r.sanctioned_amount_usd ?? r.sanctioned_amount ?? 0,
    disbursedAmount: r.disbursed_amount_usd ?? r.disbursed_amount ?? 0,
    principalOS: r.principal_os_usd ?? r.principal_os ?? 0,
    principalShare: r.principal_share ?? 0,
  }));
}

export async function fetchCorporatePipeline(scope?: ScopeSelection): Promise<CorporatePipelineRow[]> {
  let query = supabase.from('corporate_pipeline').select('*').order('id');
  query = await applyScopeAsync(query, scope);
  const { data, error } = await query;
  if (error) throw error;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return ((data ?? []) as any[]).map((r) => ({
    stage: r.stage,
    grossAmount: r.gross_amount_usd ?? r.gross_amount ?? 0,
    productBid: r.product_bid_usd ?? r.product_bid ?? 0,
    pcrPct: r.pcr_pct ?? 0,
  }));
}
