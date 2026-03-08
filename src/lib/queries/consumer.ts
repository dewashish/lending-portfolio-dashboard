import { supabase } from '../supabase';
import type { Database } from '../database.types';
import type {
  ConsumerMetricRow,
  ConsumerProductData,
  NetFlowRow,
  RollRateTimeSeries,
  VintagePoint,
  CollectionMetricRow,
  NonStarterRow,
  TDDPreDisbursal,
  TDDPostDisbursal,
  ApprovedBaseRow,
  RejectedBaseRow,
  LOSComparisonMetric,
  LOSFunnelStep,
  LOSDisbursementDaily,
  ScopeSelection,
  SubsidiaryScorecard,
  ConsumerFilters,
} from '../types';
import {
  applyScopeAsync,
  getSubsidiaryIdsByRegion,
  fetchSubsidiaries,
  fetchRegions,
} from './shared';

// Re-export shared scope navigation queries
export { fetchSubsidiaries, fetchRegions };

// ── Type aliases for rows ──────────────────────────────────────
type OverallRow = Database['public']['Tables']['consumer_overall_metrics']['Row'];
type ProductRow = Database['public']['Tables']['consumer_product_metrics']['Row'];
type NetFlowDbRow = Database['public']['Tables']['net_flow_rates']['Row'];
type RollRateDbRow = Database['public']['Tables']['roll_rate_series']['Row'];
type CollectionDbRow = Database['public']['Tables']['collection_metrics']['Row'];
type VintageDbRow = Database['public']['Tables']['vintage_points']['Row'];
type NonStarterDbRow = Database['public']['Tables']['non_starters']['Row'];
type TDDPreDbRow = Database['public']['Tables']['tdd_pre_disbursal']['Row'];
type TDDPostDbRow = Database['public']['Tables']['tdd_post_disbursal']['Row'];
type ApprovedDbRow = Database['public']['Tables']['approved_base']['Row'];
type RejectedDbRow = Database['public']['Tables']['rejected_base']['Row'];
type LOSMetricDbRow = Database['public']['Tables']['los_metrics']['Row'];
type LOSFunnelDbRow = Database['public']['Tables']['los_funnel']['Row'];
type LOSDailyDbRow = Database['public']['Tables']['los_daily']['Row'];

// ── Pivot Helpers ────────────────────────────────────────────────

function pivotToMetricRows(rows: OverallRow[]): ConsumerMetricRow[] {
  const map = new Map<string, ConsumerMetricRow>();
  for (const r of rows) {
    const key = `${r.metric_type}|${r.metric}`;
    if (!map.has(key)) {
      map.set(key, { metricType: r.metric_type, metric: r.metric, values: {}, benchmark: r.benchmark });
    }
    map.get(key)!.values[r.period] = r.value;
  }
  return Array.from(map.values());
}

function pivotToProductData(rows: ProductRow[]): ConsumerProductData[] {
  const prodMap = new Map<string, ConsumerMetricRow[]>();
  const metricMap = new Map<string, ConsumerMetricRow>();

  for (const r of rows) {
    const metricKey = `${r.product_name}|${r.metric_type}|${r.metric}`;
    if (!metricMap.has(metricKey)) {
      const row: ConsumerMetricRow = { metricType: r.metric_type, metric: r.metric, values: {}, benchmark: r.benchmark };
      metricMap.set(metricKey, row);
      if (!prodMap.has(r.product_name)) prodMap.set(r.product_name, []);
      prodMap.get(r.product_name)!.push(row);
    }
    metricMap.get(metricKey)!.values[r.period] = r.value;
  }

  return Array.from(prodMap.entries()).map(([productName, metrics]) => ({ productName, metrics }));
}

function pivotToNetFlowRows(rows: NetFlowDbRow[]): NetFlowRow[] {
  const map = new Map<string, NetFlowRow>();
  for (const r of rows) {
    const key = `${r.portfolio}|${r.bucket}`;
    if (!map.has(key)) {
      map.set(key, { bucket: `${r.portfolio} — ${r.bucket}`, values: {} });
    }
    map.get(key)!.values[r.period] = r.value;
  }
  return Array.from(map.values());
}

function pivotToRollRateSeries(rows: RollRateDbRow[]): RollRateTimeSeries[] {
  const map = new Map<string, RollRateTimeSeries>();
  for (const r of rows) {
    const key = `${r.bucket} ${r.metric}`;
    if (!map.has(key)) {
      map.set(key, { metric: key, values: {} });
    }
    map.get(key)!.values[r.period] = r.value;
  }
  return Array.from(map.values());
}

// ── Metadata Queries (for filter options) ────────────────────────

export async function fetchConsumerPeriods(scope?: ScopeSelection): Promise<string[]> {
  let query = supabase
    .from('consumer_overall_metrics')
    .select('period')
    .order('period');
  query = await applyScopeAsync(query, scope);
  const { data, error } = await query;
  if (error) throw error;
  const unique = Array.from(new Set((data ?? []).map((r: { period: string }) => r.period)));
  return unique;
}

export async function fetchConsumerProductNames(scope?: ScopeSelection): Promise<string[]> {
  let query = supabase
    .from('product_catalog')
    .select('product_name')
    .eq('is_active', true)
    .order('product_name');
  query = await applyScopeAsync(query, scope);
  const { data, error } = await query;
  if (error) throw error;
  const unique = Array.from(new Set((data ?? []).map((r: { product_name: string }) => r.product_name)));
  return unique;
}

// ── Query Functions ──────────────────────────────────────────────

export async function fetchConsumerOverall(scope?: ScopeSelection, filters?: ConsumerFilters): Promise<ConsumerMetricRow[]> {
  let query = supabase
    .from('consumer_overall_metrics')
    .select('subsidiary_id, metric_type, metric, period, value, value_usd, benchmark')
    .order('id');
  query = await applyScopeAsync(query, scope);
  if (filters?.period) query = query.eq('period', filters.period);
  const { data, error } = await query;
  if (error) throw error;

  const useUsd = !scope || scope.level !== 'subsidiary';
  const rows = (data ?? []) as (OverallRow & { value_usd: number | null })[];

  if (useUsd && rows.length > 0 && rows[0].value_usd != null) {
    const amountMetrics = new Set([
      'Total AUM', 'On-Book AUM', 'Off-Book AUM', 'New Bookings',
      'Life-to-Date Disbursement', 'Write-offs', 'Recoveries', 'NCL',
      'Average Ticket Size',
    ]);
    const aggregated = new Map<string, OverallRow>();
    const countMap = new Map<string, number>();

    for (const r of rows) {
      const key = `${r.metric_type}|${r.metric}|${r.period}`;
      if (!aggregated.has(key)) {
        aggregated.set(key, {
          ...r,
          value: amountMetrics.has(r.metric) ? (r.value_usd ?? 0) : (r.value ?? 0),
        });
        countMap.set(key, 1);
      } else {
        const existing = aggregated.get(key)!;
        if (amountMetrics.has(r.metric)) {
          existing.value = (existing.value ?? 0) + (r.value_usd ?? 0);
        } else {
          existing.value = (existing.value ?? 0) + (r.value ?? 0);
          countMap.set(key, (countMap.get(key) ?? 0) + 1);
        }
      }
    }

    aggregated.forEach((row, key) => {
      if (!amountMetrics.has(row.metric)) {
        const count = countMap.get(key) ?? 1;
        row.value = (row.value ?? 0) / count;
      }
    });

    return pivotToMetricRows(Array.from(aggregated.values()));
  }

  return pivotToMetricRows(rows);
}

export async function fetchProductMetrics(scope?: ScopeSelection, filters?: ConsumerFilters): Promise<ConsumerProductData[]> {
  let query = supabase
    .from('consumer_product_metrics')
    .select('product_name, metric_type, metric, period, value, benchmark')
    .order('id');
  query = await applyScopeAsync(query, scope);
  if (filters?.period) query = query.eq('period', filters.period);
  if (filters?.products && filters.products.length > 0) query = query.in('product_name', filters.products);
  const { data, error } = await query;
  if (error) throw error;
  return pivotToProductData((data ?? []) as ProductRow[]);
}

export async function fetchNetFlowRates(scope?: ScopeSelection, filters?: ConsumerFilters): Promise<NetFlowRow[]> {
  let query = supabase
    .from('net_flow_rates')
    .select('portfolio, bucket, period, value')
    .order('id');
  query = await applyScopeAsync(query, scope);
  if (filters?.period) query = query.eq('period', filters.period);
  const { data, error } = await query;
  if (error) throw error;
  return pivotToNetFlowRows((data ?? []) as NetFlowDbRow[]);
}

export async function fetchRollRates(scope?: ScopeSelection, filters?: ConsumerFilters): Promise<RollRateTimeSeries[]> {
  let query = supabase
    .from('roll_rate_series')
    .select('bucket, metric, period, value')
    .order('id');
  query = await applyScopeAsync(query, scope);
  if (filters?.period) query = query.eq('period', filters.period);
  const { data, error } = await query;
  if (error) throw error;
  return pivotToRollRateSeries((data ?? []) as RollRateDbRow[]);
}

export async function fetchCollectionMetrics(scope?: ScopeSelection, filters?: ConsumerFilters): Promise<CollectionMetricRow[]> {
  let query = supabase
    .from('collection_metrics')
    .select('portfolio, bucket, amount, transitions, normalized, roll_backward, stabilized, roll_forward, period')
    .order('id');
  query = await applyScopeAsync(query, scope);
  if (filters?.period) query = query.eq('period', filters.period);
  const { data, error } = await query;
  if (error) throw error;
  return ((data ?? []) as CollectionDbRow[]).map((r) => ({
    portfolio: r.portfolio,
    bucket: r.bucket,
    amount: r.amount ?? 0,
    transitions: r.transitions ?? 0,
    normalized: r.normalized ?? 0,
    rollBackward: r.roll_backward ?? 0,
    stabilized: r.stabilized ?? 0,
    rollForward: r.roll_forward ?? 0,
  }));
}

export async function fetchVintagePoints(metricType?: string, scope?: ScopeSelection): Promise<VintagePoint[]> {
  let query = supabase.from('vintage_points').select('vintage, loan_amount, mob, delinquency_rate, metric_type').order('id');
  if (metricType) query = query.eq('metric_type', metricType);
  query = await applyScopeAsync(query, scope);
  const { data, error } = await query;
  if (error) throw error;
  return ((data ?? []) as VintageDbRow[]).map((r) => ({
    vintage: r.vintage,
    loanAmount: r.loan_amount ?? 0,
    mob: r.mob,
    delinquencyRate: r.delinquency_rate,
    metricType: r.metric_type,
  }));
}

export async function fetchNonStarters(scope?: ScopeSelection, filters?: ConsumerFilters): Promise<NonStarterRow[]> {
  let query = supabase
    .from('non_starters')
    .select('category, product, metric, period, value')
    .order('id');
  query = await applyScopeAsync(query, scope);
  if (filters?.period) query = query.eq('period', filters.period);
  if (filters?.products && filters.products.length > 0) query = query.in('product', filters.products);
  const { data, error } = await query;
  if (error) throw error;

  const map = new Map<string, NonStarterRow>();
  for (const r of (data ?? []) as NonStarterDbRow[]) {
    const key = `${r.category}|${r.product}|${r.metric}`;
    if (!map.has(key)) {
      map.set(key, {
        category: r.category,
        product: r.product,
        metric: r.metric,
        monthlyValues: {},
        yearlyAverages: {},
        quarterlyValues: {},
      });
    }
    map.get(key)!.monthlyValues[r.period] = r.value ?? 0;
  }
  return Array.from(map.values());
}

export async function fetchTDDPre(scope?: ScopeSelection, filters?: ConsumerFilters): Promise<TDDPreDisbursal[]> {
  let query = supabase
    .from('tdd_pre_disbursal')
    .select('metric, period, value')
    .order('id');
  query = await applyScopeAsync(query, scope);
  if (filters?.period) query = query.eq('period', filters.period);
  const { data, error } = await query;
  if (error) throw error;

  const map = new Map<string, TDDPreDisbursal>();
  for (const r of (data ?? []) as TDDPreDbRow[]) {
    if (!map.has(r.metric)) {
      map.set(r.metric, { metric: r.metric, values: {} });
    }
    map.get(r.metric)!.values[r.period] = r.value ?? 0;
  }
  return Array.from(map.values());
}

export async function fetchTDDPost(scope?: ScopeSelection, filters?: ConsumerFilters): Promise<TDDPostDisbursal[]> {
  let query = supabase
    .from('tdd_post_disbursal')
    .select('variant, bureau_bucket, period, value')
    .order('id');
  query = await applyScopeAsync(query, scope);
  if (filters?.period) query = query.eq('period', filters.period);
  const { data, error } = await query;
  if (error) throw error;

  const map = new Map<string, TDDPostDisbursal>();
  for (const r of (data ?? []) as TDDPostDbRow[]) {
    const key = `${r.variant}|${r.bureau_bucket}`;
    if (!map.has(key)) {
      map.set(key, { variant: r.variant, bureauBucket: r.bureau_bucket, values: {} });
    }
    map.get(key)!.values[r.period] = r.value ?? 0;
  }
  return Array.from(map.values());
}

export async function fetchApprovedBase(scope?: ScopeSelection): Promise<ApprovedBaseRow[]> {
  let query = supabase
    .from('approved_base')
    .select('la_band, loan_band, count, amount')
    .order('id');
  query = await applyScopeAsync(query, scope);
  const { data, error } = await query;
  if (error) throw error;

  const map = new Map<string, ApprovedBaseRow>();
  for (const r of (data ?? []) as ApprovedDbRow[]) {
    if (!map.has(r.la_band)) {
      map.set(r.la_band, { laBand: r.la_band, loanBands: {}, total: 0 });
    }
    const row = map.get(r.la_band)!;
    row.loanBands[r.loan_band] = (row.loanBands[r.loan_band] ?? 0) + (r.count ?? 0);
    row.total += r.count ?? 0;
  }
  return Array.from(map.values());
}

export async function fetchRejectedBase(scope?: ScopeSelection): Promise<RejectedBaseRow[]> {
  let query = supabase
    .from('rejected_base')
    .select('loan_type, amount_band, count, amount')
    .order('id');
  query = await applyScopeAsync(query, scope);
  const { data, error } = await query;
  if (error) throw error;

  const map = new Map<string, RejectedBaseRow>();
  for (const r of (data ?? []) as RejectedDbRow[]) {
    if (!map.has(r.loan_type)) {
      map.set(r.loan_type, { loanType: r.loan_type, amountBands: {}, total: 0 });
    }
    const row = map.get(r.loan_type)!;
    row.amountBands[r.amount_band] = (row.amountBands[r.amount_band] ?? 0) + (r.count ?? 0);
    row.total += r.count ?? 0;
  }
  return Array.from(map.values());
}

export async function fetchLOSMetrics(scope?: ScopeSelection, filters?: ConsumerFilters): Promise<LOSComparisonMetric[]> {
  let query = supabase
    .from('los_metrics')
    .select('metric, product, ftd, mtd, lmtd, lm_full, mom_change, target, achievement')
    .order('id');
  query = await applyScopeAsync(query, scope);
  if (filters?.products && filters.products.length > 0) query = query.in('product', filters.products);
  const { data, error } = await query;
  if (error) throw error;
  return ((data ?? []) as LOSMetricDbRow[]).map((r) => ({
    metric: r.metric,
    product: r.product,
    ftd: r.ftd ?? 0,
    mtd: r.mtd ?? 0,
    lmtd: r.lmtd ?? 0,
    lmFull: r.lm_full ?? 0,
    momChange: r.mom_change ?? 0,
    target: r.target,
    achievement: r.achievement,
  }));
}

export async function fetchLOSFunnel(product?: string, scope?: ScopeSelection, filters?: ConsumerFilters): Promise<LOSFunnelStep[]> {
  let query = supabase.from('los_funnel').select('stage, product, ftd, mtd, lmtd, conversion_rate').order('id');
  if (product) query = query.eq('product', product);
  if (filters?.products && filters.products.length > 0) query = query.in('product', filters.products);
  query = await applyScopeAsync(query, scope);
  const { data, error } = await query;
  if (error) throw error;
  return ((data ?? []) as LOSFunnelDbRow[]).map((r) => ({
    stage: r.stage,
    product: r.product,
    ftd: r.ftd ?? 0,
    mtd: r.mtd ?? 0,
    lmtd: r.lmtd ?? 0,
    conversionRate: r.conversion_rate ?? 0,
  }));
}

export async function fetchLOSDaily(scope?: ScopeSelection, filters?: ConsumerFilters): Promise<LOSDisbursementDaily[]> {
  let query = supabase
    .from('los_daily')
    .select('date, product, count, amount, avg_ticket_size')
    .order('date');
  query = await applyScopeAsync(query, scope);
  if (filters?.products && filters.products.length > 0) query = query.in('product', filters.products);
  const { data, error } = await query;
  if (error) throw error;
  return ((data ?? []) as LOSDailyDbRow[]).map((r) => ({
    date: r.date,
    product: r.product,
    count: r.count ?? 0,
    amount: r.amount ?? 0,
    avgTicketSize: r.avg_ticket_size ?? 0,
  }));
}

// ── Scorecard Query ──────────────────────────────────────────────

export async function fetchSubsidiaryScorecard(scope?: ScopeSelection): Promise<SubsidiaryScorecard[]> {
  let query = supabase
    .from('v_subsidiary_scorecard')
    .select('*');
  if (scope?.regionId) {
    const ids = await getSubsidiaryIdsByRegion(scope.regionId);
    query = query.in('subsidiary_id', ids);
  }
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []).map((r: Record<string, unknown>) => ({
    subsidiaryId: r.subsidiary_id as number,
    subsidiary: r.subsidiary as string,
    shortCode: r.short_code as string,
    country: r.country as string,
    currencyCode: r.currency_code as string,
    region: r.region as string,
    institutionType: r.institution_type as string,
    aumLocal: r.aum_local as number | null,
    aumUsd: r.aum_usd as number | null,
    latestPeriod: r.latest_period as string | null,
    delinquency30Plus: r.delinquency_30plus as number | null,
    delinquency90Plus: r.delinquency_90plus as number | null,
    netCreditLoss: r.net_credit_loss as number | null,
    fpdPct: r.fpd_pct as number | null,
  }));
}
