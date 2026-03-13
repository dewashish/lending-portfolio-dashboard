import { supabase } from '../supabase';
import type { Database } from '../database.types';
import type {
  TradeFacility,
  EntityPerformance,
  ProductMixRow,
  AssetQualityByEntity,
  RatingDistribution,
  ConcentrationNode,
  CollectionEfficiency,
  WatchlistAccount,
  PortfolioSummary,
  ScopeSelection,
  RAGStatus,
  IFRSStage,
  TradeStageMigrationRow,
  TradeDPDRollRateRow,
  TradeDPDAgingRow,
} from '../types';
import { applyScopeAsync } from './shared';

// ── Type aliases ─────────────────────────────────────────────────
type FacilityRow = Database['public']['Tables']['trade_facilities']['Row'];
type ProductMixDbRow = Database['public']['Tables']['trade_product_mix']['Row'];
type RatingDistRow = Database['public']['Tables']['trade_rating_distribution']['Row'];
type WatchlistRow = Database['public']['Tables']['trade_watchlist']['Row'];

// ── Query Functions ──────────────────────────────────────────────

export async function fetchTradeFacilities(scope?: ScopeSelection): Promise<TradeFacility[]> {
  let query = supabase
    .from('trade_facilities')
    .select('*')
    .order('id');
  query = await applyScopeAsync(query, scope);
  const { data, error } = await query;
  if (error) throw error;
  return ((data ?? []) as FacilityRow[]).map((r) => ({
    facilityReference: r.facility_reference,
    entity: '', // resolved from subsidiary join if needed
    obligorName: r.obligor_name,
    region: '',
    country: '',
    sector: r.sector,
    commodity: r.commodity ?? '',
    productType: r.product_type,
    currency: r.currency,
    facilityLimit: r.facility_limit_usd ?? r.facility_limit,
    outstanding: r.outstanding_usd ?? r.outstanding,
    prevMonthOutstanding: r.prev_month_outstanding_usd ?? r.prev_month_outstanding ?? 0,
    tenorDays: r.tenor_days ?? 0,
    startDate: r.start_date ?? '',
    maturityDate: r.maturity_date ?? '',
    internalRating: r.internal_rating ?? 0,
    externalRating: r.external_rating ?? '',
    daysPastDue: r.days_past_due,
    ifrs9Stage: r.ifrs9_stage as IFRSStage,
    provisionRate: r.provision_rate ?? 0,
    provisionAmount: r.provision_amount_usd ?? r.provision_amount ?? 0,
    collateralValue: r.collateral_value_usd ?? r.collateral_value ?? 0,
    collateralCoverage: r.collateral_coverage ?? 0,
    riskWeight: r.risk_weight ?? 0,
    counterpartyBank: r.counterparty_bank,
    watchlistFlag: r.watchlist_flag,
    ewsScore: r.ews_score ?? 0,
    ewsTriggers: r.ews_triggers,
  }));
}

export async function fetchTradeEntityPerformance(scope?: ScopeSelection): Promise<EntityPerformance[]> {
  let query = supabase
    .from('trade_entity_performance')
    .select('*, subsidiaries!inner(name, country)')
    .order('id');
  query = await applyScopeAsync(query, scope);
  const { data, error } = await query;
  if (error) throw error;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return ((data ?? []) as any[]).map((r) => ({
    entity: r.subsidiaries?.name ?? '',
    geography: r.subsidiaries?.country ?? '',
    approvedLimit: r.approved_limit_usd ?? r.approved_limit,
    outstanding: r.outstanding_usd ?? r.outstanding,
    headroom: r.headroom ?? 0,
    utilization: r.utilization ?? 0,
    stage1: r.stage1_balance_usd ?? r.stage1_balance ?? 0,
    stage2: r.stage2_balance_usd ?? r.stage2_balance ?? 0,
    stage3: r.stage3_balance_usd ?? r.stage3_balance ?? 0,
    provisions: r.provisions_usd ?? r.provisions ?? 0,
    provisionCoverage: r.provision_coverage ?? 0,
    ragStatus: (r.rag_status ?? 'Green') as RAGStatus,
  }));
}

export async function fetchTradeProductMix(scope?: ScopeSelection): Promise<ProductMixRow[]> {
  let query = supabase
    .from('trade_product_mix')
    .select('*')
    .order('id');
  query = await applyScopeAsync(query, scope);
  const { data, error } = await query;
  if (error) throw error;
  return ((data ?? []) as ProductMixDbRow[]).map((r) => ({
    productType: r.product_type,
    facilities: r.facilities,
    limit: r.facility_limit_usd ?? r.facility_limit ?? 0,
    outstanding: r.outstanding_usd ?? r.outstanding ?? 0,
    portfolioShare: r.portfolio_share ?? 0,
    avgTenor: r.avg_tenor ?? 0,
    utilization: r.utilization ?? 0,
    stage2Plus3: r.stage2_plus3_pct ?? 0,
    avgRating: r.avg_rating ?? 0,
    watchlistCount: r.watchlist_count ?? 0,
  }));
}

export async function fetchTradeAssetQuality(scope?: ScopeSelection): Promise<AssetQualityByEntity[]> {
  let query = supabase
    .from('trade_asset_quality')
    .select('*, subsidiaries!inner(name)')
    .order('id');
  query = await applyScopeAsync(query, scope);
  const { data, error } = await query;
  if (error) throw error;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return ((data ?? []) as any[]).map((r) => ({
    entity: r.subsidiaries?.name ?? '',
    stage1Count: r.stage1_count ?? 0,
    stage1Balance: r.stage1_balance_usd ?? r.stage1_balance ?? 0,
    stage2Count: r.stage2_count ?? 0,
    stage2Balance: r.stage2_balance_usd ?? r.stage2_balance ?? 0,
    stage3Count: r.stage3_count ?? 0,
    stage3Balance: r.stage3_balance_usd ?? r.stage3_balance ?? 0,
    stage2Plus3Pct: r.stage2_plus3_pct ?? 0,
    provisionCoverage: r.provision_coverage ?? 0,
    rag: (r.rag_status ?? 'Green') as RAGStatus,
  }));
}

export async function fetchTradeRatingDistribution(scope?: ScopeSelection): Promise<RatingDistribution[]> {
  let query = supabase
    .from('trade_rating_distribution')
    .select('*')
    .order('id');
  query = await applyScopeAsync(query, scope);
  const { data, error } = await query;
  if (error) throw error;

  // Aggregate by rating_band across subsidiaries
  const map = new Map<string, RatingDistribution>();
  for (const r of (data ?? []) as RatingDistRow[]) {
    const key = r.rating_band;
    if (!map.has(key)) {
      map.set(key, {
        ratingBand: r.rating_band,
        count: 0,
        balance: 0,
        portfolioShare: 0,
        avgProvision: 0,
      });
    }
    const row = map.get(key)!;
    row.count += r.count;
    row.balance += r.balance_usd ?? r.balance ?? 0;
    row.avgProvision += r.avg_provision ?? 0;
  }
  const result = Array.from(map.values());
  const totalBalance = result.reduce((s, r) => s + r.balance, 0);
  const subsidiaryCount = new Set(((data ?? []) as RatingDistRow[]).map(r => r.subsidiary_id)).size || 1;
  for (const r of result) {
    r.portfolioShare = totalBalance > 0 ? r.balance / totalBalance : 0;
    r.avgProvision = r.avgProvision / subsidiaryCount;
  }
  return result;
}

export async function fetchTradeConcentrations(category?: string, scope?: ScopeSelection): Promise<ConcentrationNode[]> {
  let query = supabase
    .from('trade_concentrations')
    .select('*, subsidiaries!inner(name)')
    .order('value_usd', { ascending: false });
  if (category) query = query.eq('category', category);
  query = await applyScopeAsync(query, scope);
  const { data, error } = await query;
  if (error) throw error;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return ((data ?? []) as any[]).map((r) => ({
    name: r.name,
    entity: r.subsidiaries?.name ?? '',
    category: r.category,
    value: r.value_usd ?? r.value ?? 0,
    portfolioShare: r.portfolio_share ?? 0,
    facilities: r.facilities ?? 0,
    rating: r.rating ?? '',
  }));
}

export async function fetchTradeCollectionEfficiency(scope?: ScopeSelection): Promise<CollectionEfficiency[]> {
  let query = supabase
    .from('trade_collection_efficiency')
    .select('*, subsidiaries!inner(name)')
    .order('id');
  query = await applyScopeAsync(query, scope);
  const { data, error } = await query;
  if (error) throw error;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return ((data ?? []) as any[]).map((r) => ({
    entity: r.subsidiaries?.name ?? '',
    collectionEfficiencyRatio: r.collection_efficiency_ratio ?? 0,
    overdueRatio: r.overdue_ratio ?? 0,
    avgDPD: r.avg_dpd ?? 0,
    recoveryRate: r.recovery_rate,
    rolloverRate: r.rollover_rate ?? 0,
    provisionOutstanding: r.provision_outstanding_usd ?? r.provision_outstanding ?? 0,
    rag: (r.rag_status ?? 'Green') as RAGStatus,
  }));
}

export async function fetchTradeWatchlist(scope?: ScopeSelection): Promise<WatchlistAccount[]> {
  let query = supabase
    .from('trade_watchlist')
    .select('*')
    .order('outstanding_usd', { ascending: false });
  query = await applyScopeAsync(query, scope);
  const { data, error } = await query;
  if (error) throw error;
  return ((data ?? []) as WatchlistRow[]).map((r) => ({
    facilityRef: r.facility_ref,
    entity: '',
    obligorName: r.obligor_name,
    productType: r.product_type ?? '',
    outstanding: r.outstanding_usd ?? r.outstanding ?? 0,
    dpd: r.dpd ?? 0,
    stage: (r.ifrs_stage ?? 'Stage 1') as IFRSStage,
    rating: r.rating ?? 0,
    ewsScore: r.ews_score ?? 0,
    triggers: r.triggers ?? '',
    action: r.action ?? '',
  }));
}

export async function fetchTradeExecutiveSummary(scope?: ScopeSelection): Promise<PortfolioSummary | null> {
  // Build summary from entity performance + asset quality
  const [entityPerf, assetQuality] = await Promise.all([
    fetchTradeEntityPerformance(scope),
    fetchTradeAssetQuality(scope),
  ]);

  if (entityPerf.length === 0) return null;

  const totalOutstanding = entityPerf.reduce((s, e) => s + e.outstanding, 0);
  const totalProvisions = entityPerf.reduce((s, e) => s + e.provisions, 0);
  const totalStage2 = assetQuality.reduce((s, e) => s + e.stage2Balance, 0);
  const totalStage3 = assetQuality.reduce((s, e) => s + e.stage3Balance, 0);
  const totalFacilities = assetQuality.reduce((s, e) => s + e.stage1Count + e.stage2Count + e.stage3Count, 0);

  const stage2Plus3Pct = totalOutstanding > 0 ? (totalStage2 + totalStage3) / totalOutstanding : 0;

  return {
    totalAUM: totalOutstanding,
    totalFacilities,
    newBookings: 0,
    momChange: 0,
    momChangePercent: 0,
    nplRatio: totalOutstanding > 0 ? totalStage3 / totalOutstanding : 0,
    stage2Plus3Pct,
    provisionCoverage: (totalStage2 + totalStage3) > 0 ? totalProvisions / (totalStage2 + totalStage3) : 0,
    creditCost: totalOutstanding > 0 ? totalProvisions / totalOutstanding : 0,
    delinquency30Plus: stage2Plus3Pct,
    delinquency90Plus: totalOutstanding > 0 ? totalStage3 / totalOutstanding : 0,
    writeOffRate: 0,
    collectionEfficiency: 0,
    avgEWSScore: 0,
    watchlistCount: 0,
    watchlistExposure: 0,
  };
}

export async function fetchTradeStageMigration(scope?: ScopeSelection): Promise<TradeStageMigrationRow[]> {
  let query = supabase
    .from('trade_stage_migration')
    .select('*')
    .order('id');
  query = await applyScopeAsync(query, scope);
  const { data, error } = await query;
  if (error) throw error;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return ((data ?? []) as any[]).map((r) => ({
    period: r.period,
    priorStage: r.prior_stage as IFRSStage,
    currentStage: r.current_stage as IFRSStage,
    facilityCount: r.facility_count ?? 0,
    balance: r.balance_usd ?? r.balance ?? 0,
  }));
}

export async function fetchTradeDPDRollRates(scope?: ScopeSelection): Promise<TradeDPDRollRateRow[]> {
  let query = supabase
    .from('trade_dpd_roll_rates')
    .select('*')
    .order('id');
  query = await applyScopeAsync(query, scope);
  const { data, error } = await query;
  if (error) throw error;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return ((data ?? []) as any[]).map((r) => ({
    period: r.period,
    fromBucket: r.from_bucket,
    toBucket: r.to_bucket,
    facilityCount: r.facility_count ?? 0,
    balance: r.balance_usd ?? r.balance ?? 0,
    transitionPct: r.transition_pct ?? 0,
  }));
}

export async function fetchTradeDPDAgingByEntity(scope?: ScopeSelection): Promise<TradeDPDAgingRow[]> {
  let query = supabase
    .from('trade_dpd_aging_by_entity')
    .select('*, subsidiaries!inner(name)')
    .order('id');
  query = await applyScopeAsync(query, scope);
  const { data, error } = await query;
  if (error) throw error;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return ((data ?? []) as any[]).map((r) => ({
    subsidiaryName: r.subsidiaries?.name ?? '',
    dpdBucket: r.dpd_bucket,
    facilityCount: r.facility_count ?? 0,
    balance: r.balance_usd ?? r.balance ?? 0,
  }));
}
