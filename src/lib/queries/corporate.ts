import { supabase } from '../supabase';
import type { Database } from '../database.types';
import type {
  CorporateWatchlistRow,
  WatchlistTrendRow,
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
  CorporatePARTrendRow,
  ScopeSelection,
} from '../types';
import { applyScopeAsync } from './shared';

// ── Type aliases ─────────────────────────────────────────────────
// WatchlistDbRow, CovenantDbRow removed — using any[] cast for new columns not in generated types
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
    watchGrade: r.watch_grade ?? null,
    dpd: r.dpd ?? null,
    ifrsStage: r.ifrs_stage ?? null,
  }));
}

export async function fetchCorporateWatchlistTrend(scope?: ScopeSelection): Promise<WatchlistTrendRow[]> {
  let query = supabase.from('corporate_watchlist_trend').select('*').order('id');
  query = await applyScopeAsync(query, scope);
  const { data, error } = await query;
  if (error) throw error;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return ((data ?? []) as any[]).map((r) => ({
    period: r.period,
    activeCount: r.active_count ?? 0,
    escalatedCount: r.escalated_count ?? 0,
    monitoringCount: r.monitoring_count ?? 0,
    reviewPendingCount: r.review_pending_count ?? 0,
    totalCount: r.total_count ?? 0,
    totalExposure: r.total_exposure_usd ?? r.total_exposure ?? 0,
    newAdditions: r.new_additions ?? 0,
    removals: r.removals ?? 0,
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return ((data ?? []) as any[]).map((r) => ({
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
    creationDate: r.creation_date ?? '',
    submissionDate: r.submission_date ?? '',
    approvalForExtension: r.approval_for_extension ?? '',
    extendedClosureDate: r.extended_closure_date ?? null,
    npaFlag: r.npa_flag ?? false,
    restructuredFlag: r.restructured_flag ?? false,
    watchlistFlag: r.watchlist_flag ?? false,
    writeoffFlag: r.writeoff_flag ?? false,
    rmName: r.rm_name ?? '',
    rmEmail: r.rm_email ?? '',
    rmPhone: r.rm_phone ?? '',
    rmDepartment: r.rm_department ?? '',
    breached: r.breached ?? false,
    daysSinceBreach: r.days_since_breach ?? 0,
    thresholdValue: r.threshold_value ?? null,
    actualValue: r.actual_value ?? null,
    breachPct: r.breach_pct ?? null,
    waiverStatus: r.waiver_status ?? null,
    cureDeadline: r.cure_deadline ?? null,
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

export async function fetchCorporatePARTrend(scope?: ScopeSelection): Promise<CorporatePARTrendRow[]> {
  let query = supabase
    .from('corporate_par_trend')
    .select('*')
    .order('period')
    .order('dpd_bucket');
  query = await applyScopeAsync(query, scope);
  const { data, error } = await query;
  if (error) throw error;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rawRows = ((data ?? []) as any[]).map((r) => ({
    period: r.period as string,
    dpdBucket: r.dpd_bucket as string,
    parRate: (r.par_rate ?? 0) as number,
    totalPOS: ((r.total_pos_usd ?? r.total_pos ?? 0) as number),
    delinquentPOS: ((r.delinquent_pos_usd ?? r.delinquent_pos ?? 0) as number),
  }));

  // Aggregate by (period, dpdBucket) — at Group/Region level multiple subsidiaries
  // contribute rows for the same period+bucket; compute exposure-weighted PAR rate.
  const grouped = new Map<string, { totalPOS: number; delinquentPOS: number; period: string; dpdBucket: string }>();
  rawRows.forEach((r) => {
    const key = `${r.period}||${r.dpdBucket}`;
    const existing = grouped.get(key);
    if (existing) {
      existing.totalPOS += r.totalPOS;
      existing.delinquentPOS += r.delinquentPOS;
    } else {
      grouped.set(key, { period: r.period, dpdBucket: r.dpdBucket, totalPOS: r.totalPOS, delinquentPOS: r.delinquentPOS });
    }
  });

  const result: CorporatePARTrendRow[] = [];
  grouped.forEach((g) => {
    result.push({
      period: g.period,
      dpdBucket: g.dpdBucket,
      parRate: g.totalPOS > 0 ? g.delinquentPOS / g.totalPOS : 0,
      totalPOS: g.totalPOS,
      delinquentPOS: g.delinquentPOS,
    });
  });
  return result;
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
    disbursementLimit: r.disbursement_limit_usd ?? r.disbursement_limit ?? 0,
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
    disbursementLimit: r.disbursement_limit_usd ?? r.disbursement_limit ?? 0,
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

export async function fetchCorporateTopSanctioned(scope?: ScopeSelection): Promise<CorporateTopCustomerRow[]> {
  let query = supabase.from('corporate_top_customers').select('*').order('sanctioned_limit_usd', { ascending: false });
  query = await applyScopeAsync(query, scope);
  const { data, error } = await query;
  if (error) throw error;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return ((data ?? []) as any[]).map((r) => ({
    customerName: r.customer_name,
    sector: r.sector,
    sanctionedLimit: r.sanctioned_limit_usd ?? r.sanctioned_limit ?? 0,
    disbursementLimit: r.disbursement_limit_usd ?? r.disbursement_limit ?? 0,
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
    sanctioned: r.sanctioned_usd ?? r.sanctioned ?? 0,
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
    sanctioned: r.sanctioned_usd ?? r.sanctioned ?? 0,
    disbursed: r.disbursed_usd ?? r.disbursed ?? 0,
    pos: r.pos_usd ?? r.pos ?? 0,
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
    periodType: r.period_type ?? 'Actual',
    ifrsStage: r.ifrs_stage,
    grossExposure: r.gross_exposure_usd ?? r.gross_exposure ?? 0,
    provisionAmount: r.provision_amount_usd ?? r.provision_amount ?? 0,
    pcrPct: r.pcr_pct ?? 0,
    creditCost: r.credit_cost ?? 0,
    openingBalance: r.opening_balance_usd ?? r.opening_balance ?? null,
    newProvisions: r.new_provisions_usd ?? r.new_provisions ?? null,
    releases: r.releases_usd ?? r.releases ?? null,
    writeoffs: r.writeoffs_usd ?? r.writeoffs ?? null,
    closingBalance: r.closing_balance_usd ?? r.closing_balance ?? null,
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

  // Credit cost = total provisions / total gross exposure
  const creditCost = totalGross > 0 ? totalProvision / totalGross : 0;

  // Stage-level PCR and Credit Cost (latest period only)
  const provPeriods = Array.from(new Set(latestProv.map(r => r.period))).sort();
  const latestPeriod = provPeriods[provPeriods.length - 1] ?? '';
  const latestRows = latestProv.filter(r => r.period === latestPeriod);

  const findStage = (stage: string) => latestRows.find(r => r.ifrsStage === stage) ?? null;
  const s1 = findStage('Stage 1'), s2 = findStage('Stage 2'), s3 = findStage('Stage 3');
  const stagePCR = {
    stage1: s1 && s1.grossExposure > 0 ? s1.provisionAmount / s1.grossExposure : 0,
    stage2: s2 && s2.grossExposure > 0 ? s2.provisionAmount / s2.grossExposure : 0,
    stage3: s3 && s3.grossExposure > 0 ? s3.provisionAmount / s3.grossExposure : 0,
  };
  const latestTotalGross = latestRows.reduce((s, r) => s + r.grossExposure, 0);
  const stageCC = {
    stage1: s1 && latestTotalGross > 0 ? s1.provisionAmount / latestTotalGross : 0,
    stage2: s2 && latestTotalGross > 0 ? s2.provisionAmount / latestTotalGross : 0,
    stage3: s3 && latestTotalGross > 0 ? s3.provisionAmount / latestTotalGross : 0,
  };

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
    creditCost,
    stagePCR,
    stageCC,
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

// ── Corporate POS by Subsidiary ──────────────────────────────────
export async function fetchCorporatePOSBySubsidiary(
  scope?: ScopeSelection,
): Promise<Record<number, number>> {
  let query = supabase
    .from('corporate_portfolio')
    .select('subsidiary_id, principal_outstanding');
  query = await applyScopeAsync(query, scope);
  const { data, error } = await query;
  if (error) throw error;
  const result: Record<number, number> = {};
  for (const r of (data ?? []) as Record<string, unknown>[]) {
    const subId = r.subsidiary_id as number;
    const pos = r.principal_outstanding as number;
    result[subId] = (result[subId] ?? 0) + pos;
  }
  return result;
}

// ── Corporate Stage Balances (latest period) ─────────────────────
export async function fetchCorporateStageBalances(
  scope?: ScopeSelection,
): Promise<{ stage1: number; stage2: number; stage3: number }> {
  let query = supabase
    .from('corporate_provisioning_ecl')
    .select('ifrs_stage, gross_exposure, period');
  query = await applyScopeAsync(query, scope);
  const { data, error } = await query;
  if (error) throw error;
  const rows = (data ?? []) as Record<string, unknown>[];
  const periods = Array.from(new Set(rows.map(r => r.period as string))).sort();
  const latestPeriod = periods[periods.length - 1] ?? '';
  const latest = rows.filter(r => (r.period as string) === latestPeriod);
  const result = { stage1: 0, stage2: 0, stage3: 0 };
  for (const r of latest) {
    const stage = r.ifrs_stage as string;
    const exp = r.gross_exposure as number;
    if (stage === 'Stage 1') result.stage1 += exp;
    else if (stage === 'Stage 2') result.stage2 += exp;
    else if (stage === 'Stage 3') result.stage3 += exp;
  }
  return result;
}
