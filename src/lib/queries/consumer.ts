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
} from '../types';

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

// ── Helpers ──────────────────────────────────────────────────────

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

// ── Query Functions ──────────────────────────────────────────────

export async function fetchConsumerOverall(): Promise<ConsumerMetricRow[]> {
  const { data, error } = await supabase
    .from('consumer_overall_metrics')
    .select('metric_type, metric, period, value, benchmark')
    .order('id');
  if (error) throw error;
  return pivotToMetricRows((data ?? []) as OverallRow[]);
}

export async function fetchProductMetrics(): Promise<ConsumerProductData[]> {
  const { data, error } = await supabase
    .from('consumer_product_metrics')
    .select('product_name, metric_type, metric, period, value, benchmark')
    .order('id');
  if (error) throw error;
  return pivotToProductData((data ?? []) as ProductRow[]);
}

export async function fetchNetFlowRates(): Promise<NetFlowRow[]> {
  const { data, error } = await supabase
    .from('net_flow_rates')
    .select('portfolio, bucket, period, value')
    .order('id');
  if (error) throw error;
  return pivotToNetFlowRows((data ?? []) as NetFlowDbRow[]);
}

export async function fetchRollRates(): Promise<RollRateTimeSeries[]> {
  const { data, error } = await supabase
    .from('roll_rate_series')
    .select('bucket, metric, period, value')
    .order('id');
  if (error) throw error;
  return pivotToRollRateSeries((data ?? []) as RollRateDbRow[]);
}

export async function fetchCollectionMetrics(): Promise<CollectionMetricRow[]> {
  const { data, error } = await supabase
    .from('collection_metrics')
    .select('portfolio, bucket, amount, transitions, normalized, roll_backward, stabilized, roll_forward, period')
    .order('id');
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

export async function fetchVintagePoints(metricType?: string): Promise<VintagePoint[]> {
  let query = supabase.from('vintage_points').select('vintage, loan_amount, mob, delinquency_rate, metric_type').order('id');
  if (metricType) query = query.eq('metric_type', metricType);
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

export async function fetchNonStarters(): Promise<NonStarterRow[]> {
  const { data, error } = await supabase
    .from('non_starters')
    .select('category, product, metric, period, value')
    .order('id');
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

export async function fetchTDDPre(): Promise<TDDPreDisbursal[]> {
  const { data, error } = await supabase
    .from('tdd_pre_disbursal')
    .select('metric, period, value')
    .order('id');
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

export async function fetchTDDPost(): Promise<TDDPostDisbursal[]> {
  const { data, error } = await supabase
    .from('tdd_post_disbursal')
    .select('variant, bureau_bucket, period, value')
    .order('id');
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

export async function fetchApprovedBase(): Promise<ApprovedBaseRow[]> {
  const { data, error } = await supabase
    .from('approved_base')
    .select('la_band, loan_band, count, amount')
    .order('id');
  if (error) throw error;

  const map = new Map<string, ApprovedBaseRow>();
  for (const r of (data ?? []) as ApprovedDbRow[]) {
    if (!map.has(r.la_band)) {
      map.set(r.la_band, { laBand: r.la_band, loanBands: {}, total: 0 });
    }
    const row = map.get(r.la_band)!;
    row.loanBands[r.loan_band] = r.count ?? 0;
    row.total += r.count ?? 0;
  }
  return Array.from(map.values());
}

export async function fetchRejectedBase(): Promise<RejectedBaseRow[]> {
  const { data, error } = await supabase
    .from('rejected_base')
    .select('loan_type, amount_band, count, amount')
    .order('id');
  if (error) throw error;

  const map = new Map<string, RejectedBaseRow>();
  for (const r of (data ?? []) as RejectedDbRow[]) {
    if (!map.has(r.loan_type)) {
      map.set(r.loan_type, { loanType: r.loan_type, amountBands: {}, total: 0 });
    }
    const row = map.get(r.loan_type)!;
    row.amountBands[r.amount_band] = r.count ?? 0;
    row.total += r.count ?? 0;
  }
  return Array.from(map.values());
}

export async function fetchLOSMetrics(): Promise<LOSComparisonMetric[]> {
  const { data, error } = await supabase
    .from('los_metrics')
    .select('metric, product, ftd, mtd, lmtd, lm_full, mom_change, target, achievement')
    .order('id');
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

export async function fetchLOSFunnel(product?: string): Promise<LOSFunnelStep[]> {
  let query = supabase.from('los_funnel').select('stage, product, ftd, mtd, lmtd, conversion_rate').order('id');
  if (product) query = query.eq('product', product);
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

export async function fetchLOSDaily(): Promise<LOSDisbursementDaily[]> {
  const { data, error } = await supabase
    .from('los_daily')
    .select('date, product, count, amount, avg_ticket_size')
    .order('date');
  if (error) throw error;
  return ((data ?? []) as LOSDailyDbRow[]).map((r) => ({
    date: r.date,
    product: r.product,
    count: r.count ?? 0,
    amount: r.amount ?? 0,
    avgTicketSize: r.avg_ticket_size ?? 0,
  }));
}
