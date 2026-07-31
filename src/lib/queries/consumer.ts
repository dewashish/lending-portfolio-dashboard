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

// ── Pagination Helper ──────────────────────────────────────────────
// Supabase caps responses at 1000 rows per request. Many consumer tables
// exceed this at group scope. This helper fetches all pages.

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function fetchAllPages<T>(buildPage: (offset: number) => Promise<{ data: any; error: any }>): Promise<T[]> {
  const PAGE = 1000;
  const all: T[] = [];
  let offset = 0;
  let hasMore = true;
  while (hasMore) {
    const { data, error } = await buildPage(offset);
    if (error) throw error;
    const page = (data ?? []) as T[];
    all.push(...page);
    hasMore = page.length === PAGE;
    offset += PAGE;
  }
  return all;
}

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

// Rate/ratio metrics — must be AUM-weighted averaged (not summed or simple-averaged)
const RATE_METRICS = new Set([
  'Wt Avg ROI', 'Wt Avg Tenor', 'Average Ticket Size',
  'Collection Efficiency',
  'Current BKT Bounce Rate', 'FPD%', 'FPD To GCL Trend',
  'X+ Amt% excl w/o', '30+ Amt% excl w/o', '60+ Amt% excl w/o', '90+ Amt% excl w/o',
  'Net Credit Loss %', 'Policy Deviation (%account)',
  // Collateral & LTV (ratios — weighted-averaged across products/subsidiaries)
  'Average LTV at disbursement', 'Average current LTV', '% loans LTV 75-90%', '% loans LTV >90%',
  // Auction Recovery / Gold Context rates (counts & ₹Cr amounts are left to SUM)
  'Auction recovery rate (%)', 'Avg appraisal TAT (mins)', 'Gold price month-end (₹/g)',
  '% pledged value insured', 'Largest single customer exposure (%)',
]);
// Note: '#' counts and '₹Cr' amounts (accounts, kg pledged, auctioned/recovery value) are SUMMED, not averaged

/**
 * Aggregates multiple products into a single "All Products" entry.
 * Monetary metrics are summed; rate metrics are AUM-weighted averaged.
 * Returns [aggregate, ...individual products] when multiple products exist.
 */
function aggregateAcrossProducts(products: ConsumerProductData[]): ConsumerProductData[] {
  if (products.length <= 1) return products;

  // Collect all periods and all metric keys across all products
  const allPeriods = new Set<string>();
  const metricDefs = new Map<string, { metricType: string; metric: string; benchmark: number | string | null }>();

  for (const prod of products) {
    for (const m of prod.metrics) {
      const key = `${m.metricType}|${m.metric}`;
      if (!metricDefs.has(key)) {
        metricDefs.set(key, { metricType: m.metricType, metric: m.metric, benchmark: m.benchmark });
      }
      Object.keys(m.values).forEach((p) => allPeriods.add(p));
    }
  }

  // Build AUM weights per product per period (for weighted averaging)
  const aumByProductPeriod = new Map<string, Map<string, number>>(); // productName → period → aum
  for (const prod of products) {
    const aumMetric = prod.metrics.find((m) => m.metric === 'Total AUM');
    if (aumMetric) {
      const periodMap = new Map<string, number>();
      Object.entries(aumMetric.values).forEach(([p, v]) => {
        if (typeof v === 'number') periodMap.set(p, v);
      });
      aumByProductPeriod.set(prod.productName, periodMap);
    }
  }

  // Aggregate each metric across products
  const aggregatedMetrics: ConsumerMetricRow[] = [];

  metricDefs.forEach(({ metricType, metric, benchmark }, key) => {
    const isRate = RATE_METRICS.has(metric);
    const aggValues: Record<string, number | null> = {};

    allPeriods.forEach((period) => {
      if (isRate) {
        // AUM-weighted average
        let weightedSum = 0;
        let totalWeight = 0;
        for (const prod of products) {
          const m = prod.metrics.find((r) => `${r.metricType}|${r.metric}` === key);
          const v = m?.values[period];
          if (typeof v !== 'number') continue;
          const aum = aumByProductPeriod.get(prod.productName)?.get(period) ?? 1;
          weightedSum += v * aum;
          totalWeight += aum;
        }
        aggValues[period] = totalWeight > 0 ? weightedSum / totalWeight : null;
      } else {
        // Sum for monetary metrics
        let sum = 0;
        let hasValue = false;
        for (const prod of products) {
          const m = prod.metrics.find((r) => `${r.metricType}|${r.metric}` === key);
          const v = m?.values[period];
          if (typeof v === 'number') {
            sum += v;
            hasValue = true;
          }
        }
        aggValues[period] = hasValue ? sum : null;
      }
    });

    aggregatedMetrics.push({ metricType, metric, values: aggValues, benchmark });
  });

  const aggregate: ConsumerProductData = {
    productName: 'All Products',
    metrics: aggregatedMetrics,
  };

  return [aggregate, ...products];
}

function pivotToNetFlowRows(rows: NetFlowDbRow[]): NetFlowRow[] {
  const flowBuckets = new Set(['B1 Flow', 'B2 Flow', 'B3 Flow', 'B4 Flow', 'B5 Flow', 'B6 Flow', 'POF%']);
  const map = new Map<string, { bucket: string; sums: Record<string, number>; counts: Record<string, number> }>();
  for (const r of rows) {
    const key = `${r.portfolio}|${r.bucket}`;
    if (!map.has(key)) {
      map.set(key, { bucket: `${r.portfolio} — ${r.bucket}`, sums: {}, counts: {} });
    }
    const entry = map.get(key)!;
    entry.sums[r.period] = (entry.sums[r.period] ?? 0) + r.value;
    entry.counts[r.period] = (entry.counts[r.period] ?? 0) + 1;
  }
  return Array.from(map.values()).map(({ bucket, sums, counts }) => {
    const bucketName = bucket.split(' — ')[1] ?? bucket;
    const isFlow = flowBuckets.has(bucketName);
    const values: Record<string, number> = {};
    for (const [period, sum] of Object.entries(sums)) {
      values[period] = isFlow ? sum / (counts[period] ?? 1) : sum;
    }
    return { bucket, values };
  });
}

function pivotToRollRateSeries(rows: RollRateDbRow[]): RollRateTimeSeries[] {
  const map = new Map<string, { metric: string; sums: Record<string, number>; counts: Record<string, number> }>();
  for (const r of rows) {
    const key = `${r.bucket} ${r.metric}`;
    if (!map.has(key)) {
      map.set(key, { metric: key, sums: {}, counts: {} });
    }
    const entry = map.get(key)!;
    entry.sums[r.period] = (entry.sums[r.period] ?? 0) + r.value;
    entry.counts[r.period] = (entry.counts[r.period] ?? 0) + 1;
  }
  return Array.from(map.values()).map(({ metric, sums, counts }) => {
    const values: Record<string, number> = {};
    for (const [period, sum] of Object.entries(sums)) {
      values[period] = sum / (counts[period] ?? 1); // always average for rates
    }
    return { metric, values };
  });
}

// ── Metadata Queries (for filter options) ────────────────────────

export interface ProductCatalogEntry {
  productName: string;
  productCategory: string;
}

export async function fetchProductCatalog(scope?: ScopeSelection): Promise<ProductCatalogEntry[]> {
  let query = supabase
    .from('product_catalog')
    .select('product_name, product_category')
    .eq('is_active', true)
    .order('product_name');
  query = await applyScopeAsync(query, scope);
  const { data, error } = await query;
  if (error) throw error;
  const seen = new Set<string>();
  return (data ?? []).filter((r: { product_name: string }) => {
    if (seen.has(r.product_name)) return false;
    seen.add(r.product_name);
    return true;
  }).map((r: { product_name: string; product_category: string }) => ({
    productName: r.product_name,
    productCategory: r.product_category,
  }));
}

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
  if (filters?.period) query = query.eq('period', filters.period);
  query = await applyScopeAsync(query, scope);
  const { data, error } = await query;
  if (error) throw error;

  const useUsd = !scope || scope.level !== 'subsidiary';
  const rows = (data ?? []) as (OverallRow & { value_usd: number | null })[];

  if (useUsd && rows.length > 1) {
    // Build AUM lookup per subsidiary × period for weighted averaging
    const aumLookup = new Map<string, number>();
    for (const r of rows) {
      if (r.metric === 'Total AUM') {
        const ak = `${r.subsidiary_id}|${r.period}`;
        aumLookup.set(ak, r.value_usd ?? r.value ?? 0);
      }
    }

    // Rate metrics need AUM-weighted average; everything else is summed
    const overallRateMetrics = new Set([
      '30+ Rate', '90+ Rate', '30+ Amt%', '60+ Amt%', '90+ Amt%',
      'FPD%', 'Current BKT Bounce Rate', 'Collection Efficiency', 'Net Credit Loss',
      'Wt Avg ROI', 'Wt Avg Tenor',
    ]);

    const sumMap = new Map<string, number>();
    const weightMap = new Map<string, number>();
    const templateMap = new Map<string, OverallRow>();

    for (const r of rows) {
      const key = `${r.metric_type}|${r.metric}|${r.period}`;
      const isRate = overallRateMetrics.has(r.metric);

      if (!templateMap.has(key)) {
        templateMap.set(key, { ...r });
        sumMap.set(key, 0);
        if (isRate) weightMap.set(key, 0);
      }

      if (isRate) {
        const ak = `${r.subsidiary_id}|${r.period}`;
        const aum = aumLookup.get(ak) ?? 1;
        sumMap.set(key, (sumMap.get(key) ?? 0) + (r.value ?? 0) * aum);
        weightMap.set(key, (weightMap.get(key) ?? 0) + aum);
      } else {
        sumMap.set(key, (sumMap.get(key) ?? 0) + (r.value_usd ?? r.value ?? 0));
      }
    }

    const finalRows: OverallRow[] = [];
    templateMap.forEach((template, key) => {
      const isRate = overallRateMetrics.has(template.metric);
      let value: number;
      if (isRate) {
        const w = weightMap.get(key) ?? 1;
        value = w > 0 ? (sumMap.get(key) ?? 0) / w : 0;
      } else {
        value = sumMap.get(key) ?? 0;
      }
      finalRows.push({ ...template, value });
    });

    return pivotToMetricRows(finalRows);
  }

  return pivotToMetricRows(rows);
}

export async function fetchProductMetrics(scope?: ScopeSelection, filters?: ConsumerFilters): Promise<ConsumerProductData[]> {
  const rows = await fetchAllPages<ProductRow & { value_usd: number | null }>(async (offset) => {
    let q = supabase
      .from('consumer_product_metrics')
      .select('product_name, metric_type, metric, period, value, value_usd, benchmark')
      .order('id')
      .range(offset, offset + 999);
    if (filters?.period) q = q.eq('period', filters.period);
    if (filters?.products && filters.products.length > 0) q = q.in('product_name', filters.products);
    q = await applyScopeAsync(q, scope);
    return q;
  });
  const useUsd = !scope || scope.level !== 'subsidiary';

  if (useUsd && rows.length > 1) {
    // Step 1: Build AUM lookup per subsidiary × product × period for weighted averaging
    const aumLookup = new Map<string, number>(); // "subId|product|period" → AUM in USD
    for (const r of rows) {
      if (r.metric === 'Total AUM') {
        const aumKey = `${r.subsidiary_id}|${r.product_name}|${r.period}`;
        aumLookup.set(aumKey, r.value_usd ?? r.value ?? 0);
      }
    }

    // Step 2: Aggregate across subsidiaries per product
    // Key: "product|metricType|metric|period"
    // For monetary/count metrics: sum value_usd
    // For rate metrics: accumulate (value × AUM) and total AUM, then divide
    const sumMap = new Map<string, number>();      // summed value or weighted numerator
    const weightMap = new Map<string, number>();    // total AUM weight (for rates only)
    const templateMap = new Map<string, ProductRow>(); // template row for metadata

    for (const r of rows) {
      const key = `${r.product_name}|${r.metric_type}|${r.metric}|${r.period}`;
      const isRate = RATE_METRICS.has(r.metric);

      if (!templateMap.has(key)) {
        templateMap.set(key, { ...r });
        sumMap.set(key, 0);
        if (isRate) weightMap.set(key, 0);
      }

      if (isRate) {
        // AUM-weighted: accumulate value × AUM
        const aumKey = `${r.subsidiary_id}|${r.product_name}|${r.period}`;
        const aum = aumLookup.get(aumKey) ?? 1;
        sumMap.set(key, (sumMap.get(key) ?? 0) + (r.value ?? 0) * aum);
        weightMap.set(key, (weightMap.get(key) ?? 0) + aum);
      } else {
        // Monetary or count: sum value_usd (fallback to value for absolute counts)
        sumMap.set(key, (sumMap.get(key) ?? 0) + (r.value_usd ?? r.value ?? 0));
      }
    }

    // Step 3: Finalize — divide weighted sums by total weight for rate metrics
    const finalRows: ProductRow[] = [];
    templateMap.forEach((template, key) => {
      const isRate = RATE_METRICS.has(template.metric);
      let value: number;
      if (isRate) {
        const totalWeight = weightMap.get(key) ?? 1;
        value = totalWeight > 0 ? (sumMap.get(key) ?? 0) / totalWeight : 0;
      } else {
        value = sumMap.get(key) ?? 0;
      }
      finalRows.push({ ...template, value });
    });

    return aggregateAcrossProducts(pivotToProductData(finalRows));
  }

  return aggregateAcrossProducts(pivotToProductData(rows));
}

export async function fetchNetFlowRates(scope?: ScopeSelection, filters?: ConsumerFilters): Promise<NetFlowRow[]> {
  const rows = await fetchAllPages<NetFlowDbRow>(async (offset) => {
    let q = supabase
      .from('net_flow_rates')
      .select('portfolio, bucket, period, value, product_name')
      .order('id')
      .range(offset, offset + 999);
    if (filters?.period) q = q.eq('period', filters.period);
    if (filters?.products && filters.products.length > 0) {
      q = q.in('product_name', filters.products);
    } else {
      q = q.is('product_name', null);
    }
    q = await applyScopeAsync(q, scope);
    return q;
  });
  return pivotToNetFlowRows(rows);
}

export async function fetchRollRates(scope?: ScopeSelection, filters?: ConsumerFilters): Promise<RollRateTimeSeries[]> {
  const rows = await fetchAllPages<RollRateDbRow>(async (offset) => {
    let q = supabase
      .from('roll_rate_series')
      .select('bucket, metric, period, value, product_name')
      .order('id')
      .range(offset, offset + 999);
    if (filters?.period) q = q.eq('period', filters.period);
    if (filters?.products && filters.products.length > 0) {
      q = q.in('product_name', filters.products);
    } else {
      q = q.is('product_name', null);
    }
    q = await applyScopeAsync(q, scope);
    return q;
  });
  return pivotToRollRateSeries(rows);
}

export async function fetchCollectionMetrics(scope?: ScopeSelection, filters?: ConsumerFilters): Promise<CollectionMetricRow[]> {
  const rows = await fetchAllPages<CollectionDbRow>(async (offset) => {
    let q = supabase
      .from('collection_metrics')
      .select('portfolio, bucket, amount, transitions, normalized, roll_backward, stabilized, roll_forward, period, product_name')
      .order('id')
      .range(offset, offset + 999);
    if (filters?.period) q = q.eq('period', filters.period);
    if (filters?.products && filters.products.length > 0) {
      q = q.in('product_name', filters.products);
    } else {
      q = q.is('product_name', null);
    }
    q = await applyScopeAsync(q, scope);
    return q;
  });
  return rows.map((r) => ({
    portfolio: r.portfolio,
    bucket: r.bucket,
    amount: r.amount ?? 0,
    transitions: r.transitions ?? 0,
    normalized: r.normalized ?? 0,
    rollBackward: r.roll_backward ?? 0,
    stabilized: r.stabilized ?? 0,
    rollForward: r.roll_forward ?? 0,
    period: r.period,
  }));
}

export async function fetchVintagePoints(metricType?: string, scope?: ScopeSelection, products?: string[]): Promise<VintagePoint[]> {
  const rows = await fetchAllPages<VintageDbRow & { product_name?: string }>(async (offset) => {
    let q = supabase
      .from('vintage_points')
      .select('vintage, loan_amount, mob, delinquency_rate, metric_type, product_name')
      .order('id')
      .range(offset, offset + 999);
    if (metricType) q = q.eq('metric_type', metricType);
    if (products && products.length > 0) q = q.in('product_name', products);
    q = await applyScopeAsync(q, scope);
    return q;
  });
  return rows.map((r) => ({
    vintage: r.vintage,
    loanAmount: r.loan_amount ?? 0,
    mob: r.mob,
    delinquencyRate: r.delinquency_rate,
    metricType: r.metric_type,
  }));
}

export async function fetchNonStarters(scope?: ScopeSelection, filters?: ConsumerFilters, category?: string): Promise<NonStarterRow[]> {
  const data = await fetchAllPages<NonStarterDbRow & { value_usd: number | null }>(async (offset) => {
    let q = supabase
      .from('non_starters')
      .select('category, product, metric, period, value, value_usd')
      .order('id')
      .range(offset, offset + 999);
    if (category) q = q.eq('category', category);
    if (filters?.products && filters.products.length > 0) q = q.in('product', filters.products);
    q = await applyScopeAsync(q, scope);
    return q;
  });

  const map = new Map<string, NonStarterRow>();
  for (const r of data) {
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
  if (filters?.period) query = query.eq('period', filters.period);
  query = await applyScopeAsync(query, scope);
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
  if (filters?.period) query = query.eq('period', filters.period);
  query = await applyScopeAsync(query, scope);
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
  if (filters?.products && filters.products.length > 0) query = query.in('product', filters.products);
  query = await applyScopeAsync(query, scope);
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
  if (filters?.products && filters.products.length > 0) query = query.in('product', filters.products);
  query = await applyScopeAsync(query, scope);
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

export async function fetchConsumerUnsecuredFPD(scope?: ScopeSelection): Promise<ConsumerMetricRow[]> {
  const catalog = await fetchProductCatalog(scope);
  const unsecuredProducts = catalog.filter(p => p.productCategory === 'Unsecured').map(p => p.productName);
  if (unsecuredProducts.length === 0) return [];

  let query = supabase
    .from('consumer_product_metrics')
    .select('subsidiary_id, product_name, metric_type, metric, period, value, value_usd, benchmark')
    .eq('metric', 'FPD%')
    .in('product_name', unsecuredProducts)
    .order('period');
  query = await applyScopeAsync(query, scope);
  const { data, error } = await query;
  if (error) throw error;

  const periodMap = new Map<string, { sum: number; count: number }>();
  for (const r of (data ?? []) as Record<string, unknown>[]) {
    const val = r.value as number;
    if (val == null) continue;
    const period = r.period as string;
    const entry = periodMap.get(period) ?? { sum: 0, count: 0 };
    entry.sum += val;
    entry.count += 1;
    periodMap.set(period, entry);
  }

  const values: Record<string, number> = {};
  periodMap.forEach((v, k) => { values[k] = v.sum / v.count; });

  return [{ metricType: 'Origination Quality', metric: 'FPD% (Unsecured)', values, benchmark: 0.035 }];
}
