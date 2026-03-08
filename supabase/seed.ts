import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

// =============================================================================
// Type aliases
// =============================================================================
type Row = Record<string, unknown>;

// =============================================================================
// Helpers
// =============================================================================

/** Insert rows in batches to avoid hitting request-size limits */
async function batchInsert(table: string, rows: Row[], batchSize = 500) {
  if (rows.length === 0) return;
  let inserted = 0;
  for (let i = 0; i < rows.length; i += batchSize) {
    const chunk = rows.slice(i, i + batchSize);
    const { error } = await supabase.from(table).insert(chunk);
    if (error) {
      console.error(`  ERROR inserting into ${table} (batch ${Math.floor(i / batchSize) + 1}):`, error.message);
      throw error;
    }
    inserted += chunk.length;
  }
  console.log(`  ✓ ${table}: ${inserted} rows`);
}

/** Upsert rows in batches — used for dimension tables that may already exist */
async function batchUpsert(table: string, rows: Row[], batchSize = 500) {
  if (rows.length === 0) return;
  let upserted = 0;
  for (let i = 0; i < rows.length; i += batchSize) {
    const chunk = rows.slice(i, i + batchSize);
    const { error } = await supabase.from(table).upsert(chunk);
    if (error) {
      console.error(`  ERROR upserting into ${table} (batch ${Math.floor(i / batchSize) + 1}):`, error.message);
      throw error;
    }
    upserted += chunk.length;
  }
  console.log(`  ✓ ${table}: ${upserted} rows (upsert)`);
}

/** Delete from all tables in correct FK order */
async function clearAll() {
  const tables = [
    // Trade & Corporate tables (FK -> data_sources, subsidiaries)
    'corporate_portfolio_metrics',
    'corporate_delinquency',
    'corporate_covenants',
    'corporate_watchlist',
    'corporate_executive_summary',
    'corporate_facilities',
    'trade_concentrations',
    'trade_asset_quality',
    'trade_top_exposures',
    'trade_maturity_profile',
    'trade_product_mix',
    'trade_facilities',
    // Consumer PQR summary tables (FK -> subsidiaries)
    'los_daily',
    'los_funnel',
    'los_metrics',
    'rejected_base',
    'approved_base',
    'tdd_post_disbursal',
    'tdd_pre_disbursal',
    'non_starters',
    'vintage_points',
    'collection_metrics',
    'roll_rate_series',
    'net_flow_rates',
    'consumer_product_metrics',
    'consumer_overall_metrics',
    // Consolidated scorecard
    'consolidated_scorecard',
    // Operational tables (FK -> lms_accounts, los_customers etc.)
    'col_legal_cases',
    'col_recovery_payments',
    'col_actions',
    'col_assignments',
    'col_agencies',
    'lms_restructures',
    'lms_writeoffs',
    'lms_collateral',
    'lms_payment_transactions',
    'lms_dpd_history',
    'lms_balance_snapshots',
    'lms_accounts',
    'los_disbursements',
    'los_decisions',
    'los_credit_bureau_pulls',
    'los_applications',
    'los_customers',
    // Risk appetite
    'risk_appetite_settings',
    // Dimension tables
    'product_catalog',
    'data_sources',
    'fx_rates',
    'currencies',
    'subsidiaries',
    'regions',
  ];
  for (const t of tables) {
    const { error } = await supabase.from(t).delete().gte('id', 0);
    if (error && !error.message.includes('does not exist')) {
      console.error(`  WARN: could not clear ${t}: ${error.message}`);
    }
  }
  // currencies uses char PK, not serial id
  const { error: currErr } = await supabase.from('currencies').delete().neq('code', '');
  if (currErr && !currErr.message.includes('does not exist')) {
    console.error(`  WARN: could not clear currencies: ${currErr.message}`);
  }
  console.log('Cleared all tables.\n');
}

/** Convert local currency amount to USD */
function toUSD(localAmount: number, currencyCode: string, fxMap: Record<string, number>): number {
  if (currencyCode === 'USD') return localAmount;
  const rate = fxMap[currencyCode];
  if (!rate) return localAmount;
  return +(localAmount * rate).toFixed(2);
}

/** Deterministic noise: returns value in [0.92, 1.08] */
function noise(...seeds: number[]): number {
  let x = 0;
  for (let i = 0; i < seeds.length; i++) {
    x += seeds[i] * (i * 7.3 + 3.1);
  }
  return 0.92 + (Math.sin(x) * 0.5 + 0.5) * 0.16;
}

/** Deterministic noise: returns value in [lo, hi] */
function noiseRange(lo: number, hi: number, ...seeds: number[]): number {
  let x = 0;
  for (let i = 0; i < seeds.length; i++) {
    x += seeds[i] * (i * 11.3 + 5.7);
  }
  return lo + (Math.sin(x) * 0.5 + 0.5) * (hi - lo);
}

// =============================================================================
// Constants
// =============================================================================

const FX_MAP: Record<string, number> = {
  INR: 0.0119,
  PKR: 0.0036,
  RSD: 0.0093,
  COP: 0.000245,
  EGP: 0.0203,
  USD: 1.0,
};

const PERIODS_7 = ["Feb'25", "Mar'25", "Apr'25", "May'25", "Jun'25", "Jul'25", "Aug'25"];
const PERIODS_5 = ["Apr'25", "May'25", "Jun'25", "Jul'25", "Aug'25"];

interface SubsidiaryProfile {
  id: number;
  name: string;
  shortCode: string;
  country: string;
  countryCode: string;
  regionId: number;
  currencyCode: string;
  institutionType: string;
  delinqMult: number;
  /** AUM in local currency (absolute number, not abbreviated) */
  aumLocal: number;
  products: string[];
  /** data_source_id offset: subsidiary 1 gets 1,2,3; subsidiary 2 gets 4,5,6; etc. */
  dsOffset: number;
}

const SUBSIDIARIES: SubsidiaryProfile[] = [
  {
    id: 1, name: 'Samman Capital', shortCode: 'SAM',
    country: 'India', countryCode: 'IN', regionId: 1,
    currencyCode: 'INR', institutionType: 'NBFC',
    delinqMult: 0.7, aumLocal: 24000000000, // ~2400 Cr
    products: ['Home Loan', 'LAP', 'Personal Loan'],
    dsOffset: 1,
  },
  {
    id: 2, name: 'First Woman Bank Limited', shortCode: 'FWBL',
    country: 'Pakistan', countryCode: 'PK', regionId: 1,
    currencyCode: 'PKR', institutionType: 'Bank',
    delinqMult: 1.1, aumLocal: 45000000000, // ~45B PKR
    products: ['Auto Loan', 'Personal Loan', 'Credit Card', 'Home Loan'],
    dsOffset: 4,
  },
  {
    id: 3, name: 'Mirabank', shortCode: 'MIR',
    country: 'Serbia', countryCode: 'RS', regionId: 2,
    currencyCode: 'RSD', institutionType: 'Commercial Bank',
    delinqMult: 0.6, aumLocal: 8000000000, // ~8B RSD
    products: ['Consumer Loan', 'Housing Loan', 'Personal Loan'],
    dsOffset: 7,
  },
  {
    id: 4, name: 'LuloBank', shortCode: 'LUL',
    country: 'Colombia', countryCode: 'CO', regionId: 3,
    currencyCode: 'COP', institutionType: 'Digital Bank',
    delinqMult: 1.3, aumLocal: 1200000000000, // ~1.2T COP
    products: ['Personal Loan', 'Credit Card'],
    dsOffset: 10,
  },
  {
    id: 5, name: 'Beltone', shortCode: 'BEL',
    country: 'Egypt', countryCode: 'EG', regionId: 4,
    currencyCode: 'EGP', institutionType: 'NBFI',
    delinqMult: 1.0, aumLocal: 12000000000, // ~12B EGP
    products: ['Consumer Loan', 'Leasing', 'Mortgage'],
    dsOffset: 13,
  },
];

// =============================================================================
// Dimension Table Builders
// =============================================================================

function buildRegions(): Row[] {
  return [
    { id: 1, name: 'South Asia', display_order: 1 },
    { id: 2, name: 'Europe', display_order: 2 },
    { id: 3, name: 'LATAM', display_order: 3 },
    { id: 4, name: 'MENA', display_order: 4 },
  ];
}

function buildSubsidiaries(): Row[] {
  return SUBSIDIARIES.map(s => ({
    id: s.id,
    name: s.name,
    short_code: s.shortCode,
    country: s.country,
    country_code: s.countryCode,
    region_id: s.regionId,
    currency_code: s.currencyCode,
    institution_type: s.institutionType,
    is_active: true,
  }));
}

function buildCurrencies(): Row[] {
  return [
    { code: 'USD', name: 'US Dollar', symbol: '$' },
    { code: 'INR', name: 'Indian Rupee', symbol: '₹' },
    { code: 'PKR', name: 'Pakistani Rupee', symbol: '₨' },
    { code: 'RSD', name: 'Serbian Dinar', symbol: 'RSD' },
    { code: 'COP', name: 'Colombian Peso', symbol: 'COL$' },
    { code: 'EGP', name: 'Egyptian Pound', symbol: 'E£' },
  ];
}

function buildFxRates(): Row[] {
  const pairs: { from: string; rate: number }[] = [
    { from: 'INR', rate: 0.0119 },
    { from: 'PKR', rate: 0.0036 },
    { from: 'RSD', rate: 0.0093 },
    { from: 'COP', rate: 0.000245 },
    { from: 'EGP', rate: 0.0203 },
  ];
  return pairs.map(p => ({
    from_currency: p.from,
    to_currency: 'USD',
    rate: p.rate,
    effective_date: '2025-08-01',
  }));
}

function buildDataSources(): Row[] {
  const rows: Row[] = [];
  const types = ['LMS', 'LOS', 'Collections'];
  for (const s of SUBSIDIARIES) {
    for (let ti = 0; ti < types.length; ti++) {
      rows.push({
        id: s.dsOffset + ti,
        subsidiary_id: s.id,
        source_type: types[ti],
        source_name: `${s.shortCode}-${types[ti]}`,
        status: 'active',
      });
    }
  }
  return rows;
}

function buildProductCatalog(): Row[] {
  const categoryMap: Record<string, string> = {
    'Home Loan': 'Secured',
    'LAP': 'Secured',
    'Personal Loan': 'Unsecured',
    'Auto Loan': 'Secured',
    'Credit Card': 'Unsecured',
    'Consumer Loan': 'Unsecured',
    'Housing Loan': 'Secured',
    'Leasing': 'Secured',
    'Mortgage': 'Secured',
  };
  const rows: Row[] = [];
  let id = 1;
  for (const s of SUBSIDIARIES) {
    for (const p of s.products) {
      rows.push({
        id: id++,
        subsidiary_id: s.id,
        product_name: p,
        product_category: categoryMap[p] || 'Other',
        is_active: true,
      });
    }
  }
  return rows;
}

// =============================================================================
// PQR Summary Table Builders
// =============================================================================

// ---------------------------------------------------------------------------
// 1. consumer_overall_metrics
// ---------------------------------------------------------------------------
function buildConsumerOverallMetrics(): Row[] {
  // Base values are in "millions of local currency" conceptually.
  // For each subsidiary we scale AUM to their local magnitude and apply delinqMult.

  interface MetricDef {
    metric_type: string;
    metric: string;
    baseValues: number[]; // 7 periods
    benchmark: number | null;
    isRate: boolean;        // true = delinquency/percentage, false = monetary
    isAbsolute: boolean;    // true = not scaled by AUM (e.g. tenor, ROI)
  }

  const defs: MetricDef[] = [
    // Book Size and Growth
    { metric_type: 'Book Size and Growth', metric: 'Total AUM', baseValues: [0.88, 0.90, 0.92, 0.94, 0.95, 0.97, 1.0], benchmark: null, isRate: false, isAbsolute: false },
    { metric_type: 'Book Size and Growth', metric: 'On-Book AUM', baseValues: [0.70, 0.72, 0.74, 0.75, 0.76, 0.78, 0.80], benchmark: null, isRate: false, isAbsolute: false },
    { metric_type: 'Book Size and Growth', metric: 'Off-Book AUM', baseValues: [0.18, 0.18, 0.18, 0.19, 0.19, 0.19, 0.20], benchmark: null, isRate: false, isAbsolute: false },
    { metric_type: 'Book Size and Growth', metric: 'New Bookings', baseValues: [0.058, 0.062, 0.060, 0.065, 0.063, 0.068, 0.073], benchmark: null, isRate: false, isAbsolute: false },
    { metric_type: 'Book Size and Growth', metric: 'Wt Avg ROI', baseValues: [0.158, 0.156, 0.162, 0.159, 0.161, 0.160, 0.162], benchmark: 0.15, isRate: false, isAbsolute: true },
    { metric_type: 'Book Size and Growth', metric: 'Wt Avg Tenor', baseValues: [42, 42, 43, 42, 43, 42, 43], benchmark: 42, isRate: false, isAbsolute: true },

    // Delinquency
    { metric_type: 'Delinquency', metric: '30+ Rate', baseValues: [0.062, 0.060, 0.058, 0.055, 0.052, 0.049, 0.047], benchmark: 0.06, isRate: true, isAbsolute: false },
    { metric_type: 'Delinquency', metric: '90+ Rate', baseValues: [0.022, 0.021, 0.020, 0.019, 0.018, 0.017, 0.016], benchmark: 0.02, isRate: true, isAbsolute: false },
    { metric_type: 'Delinquency', metric: '30+ Amt%', baseValues: [0.062, 0.058, 0.055, 0.053, 0.050, 0.048, 0.045], benchmark: 0.06, isRate: true, isAbsolute: false },
    { metric_type: 'Delinquency', metric: '90+ Amt%', baseValues: [0.022, 0.021, 0.019, 0.018, 0.017, 0.016, 0.015], benchmark: 0.02, isRate: true, isAbsolute: false },

    // Origination Quality
    { metric_type: 'Origination Quality', metric: 'FPD%', baseValues: [0.038, 0.036, 0.035, 0.033, 0.032, 0.031, 0.029], benchmark: 0.035, isRate: true, isAbsolute: false },
    { metric_type: 'Origination Quality', metric: 'Current BKT Bounce Rate', baseValues: [0.082, 0.080, 0.078, 0.075, 0.073, 0.071, 0.069], benchmark: 0.08, isRate: true, isAbsolute: false },

    // Collection Efficiency
    { metric_type: 'Collection Efficiency', metric: 'Collection Efficiency', baseValues: [0.92, 0.925, 0.93, 0.935, 0.94, 0.945, 0.95], benchmark: 0.95, isRate: false, isAbsolute: true },
    { metric_type: 'Collection Efficiency', metric: 'Net Credit Loss', baseValues: [0.0035, 0.0030, 0.0026, 0.0021, 0.0018, 0.0014, 0.0011], benchmark: 0.003, isRate: true, isAbsolute: false },
    { metric_type: 'Collection Efficiency', metric: 'NCL', baseValues: [0.85, 0.78, 0.75, 0.62, 0.52, 0.43, 0.33], benchmark: null, isRate: false, isAbsolute: false },
    { metric_type: 'Collection Efficiency', metric: 'Recoveries', baseValues: [0.38, 0.40, 0.45, 0.48, 0.50, 0.52, 0.55], benchmark: null, isRate: false, isAbsolute: false },
    { metric_type: 'Collection Efficiency', metric: 'Write-offs', baseValues: [1.23, 1.18, 1.20, 1.10, 1.02, 0.95, 0.88], benchmark: null, isRate: false, isAbsolute: false },
  ];

  const rows: Row[] = [];
  for (const sub of SUBSIDIARIES) {
    const dsId = sub.dsOffset; // LMS data_source_id
    for (let di = 0; di < defs.length; di++) {
      const d = defs[di];
      for (let pi = 0; pi < PERIODS_7.length; pi++) {
        let value: number;
        let valueUsd: number | null = null;

        if (d.isAbsolute) {
          // Rates/tenor/ROI — just add subsidiary noise
          value = +(d.baseValues[pi] * noise(sub.id, di, pi)).toFixed(6);
          valueUsd = null;
        } else if (d.isRate) {
          // Delinquency rates — multiply by subsidiary delinquency multiplier
          value = +(d.baseValues[pi] * sub.delinqMult * noise(sub.id, di, pi)).toFixed(6);
          valueUsd = null;
        } else {
          // Monetary — scale by AUM. baseValues are fractions of aumLocal.
          value = +(sub.aumLocal * d.baseValues[pi] * noise(sub.id, di, pi)).toFixed(2);
          valueUsd = toUSD(value, sub.currencyCode, FX_MAP);
        }

        rows.push({
          subsidiary_id: sub.id,
          metric_type: d.metric_type,
          metric: d.metric,
          period: PERIODS_7[pi],
          value,
          value_usd: valueUsd,
          benchmark: d.benchmark,
          data_source_id: dsId,
        });
      }
    }
  }
  return rows;
}

// ---------------------------------------------------------------------------
// 2. consumer_product_metrics
// ---------------------------------------------------------------------------
function buildConsumerProductMetrics(): Row[] {
  interface MetricDef {
    metric_type: string;
    metric: string;
    baseValues: number[];
    benchmark: number | null;
    isRate: boolean;
    isAbsolute: boolean;
  }

  const defs: MetricDef[] = [
    { metric_type: 'Book Size and Growth', metric: 'Total AUM', baseValues: [0.88, 0.90, 0.92, 0.94, 0.95, 0.97, 1.0], benchmark: null, isRate: false, isAbsolute: false },
    { metric_type: 'Book Size and Growth', metric: 'New Bookings', baseValues: [0.058, 0.062, 0.060, 0.065, 0.063, 0.068, 0.073], benchmark: null, isRate: false, isAbsolute: false },
    { metric_type: 'Book Size and Growth', metric: 'Wt Avg ROI', baseValues: [0.158, 0.156, 0.162, 0.159, 0.161, 0.160, 0.162], benchmark: 0.15, isRate: false, isAbsolute: true },
    { metric_type: 'Delinquency', metric: '30+ Amt%', baseValues: [0.062, 0.058, 0.055, 0.053, 0.050, 0.048, 0.045], benchmark: 0.06, isRate: true, isAbsolute: false },
    { metric_type: 'Delinquency', metric: '90+ Amt%', baseValues: [0.022, 0.021, 0.019, 0.018, 0.017, 0.016, 0.015], benchmark: 0.02, isRate: true, isAbsolute: false },
    { metric_type: 'Origination Quality', metric: 'FPD%', baseValues: [0.038, 0.036, 0.035, 0.033, 0.032, 0.031, 0.029], benchmark: 0.035, isRate: true, isAbsolute: false },
    { metric_type: 'Collection Efficiency', metric: 'Collection Efficiency', baseValues: [0.92, 0.925, 0.93, 0.935, 0.94, 0.945, 0.95], benchmark: 0.95, isRate: false, isAbsolute: true },
  ];

  // Product weight within each subsidiary: evenly distributed with slight product-specific risk
  const productDelinqMult: Record<string, number> = {
    'Home Loan': 0.65, 'LAP': 0.75, 'Personal Loan': 1.40,
    'Auto Loan': 0.85, 'Credit Card': 1.55,
    'Consumer Loan': 1.0, 'Housing Loan': 0.65,
    'Leasing': 0.80, 'Mortgage': 0.60,
  };

  const rows: Row[] = [];
  for (const sub of SUBSIDIARIES) {
    const nProducts = sub.products.length;
    for (let pri = 0; pri < nProducts; pri++) {
      const product = sub.products[pri];
      const productWeight = 1 / nProducts; // even split for AUM share
      const prodDelinq = productDelinqMult[product] || 1.0;

      for (let di = 0; di < defs.length; di++) {
        const d = defs[di];
        for (let pi = 0; pi < PERIODS_7.length; pi++) {
          let value: number;
          let valueUsd: number | null = null;
          const n = noise(sub.id, pri, di, pi);

          if (d.isAbsolute) {
            value = +(d.baseValues[pi] * n).toFixed(6);
          } else if (d.isRate) {
            value = +(d.baseValues[pi] * sub.delinqMult * prodDelinq * n).toFixed(6);
          } else {
            // Monetary: share of AUM
            value = +(sub.aumLocal * d.baseValues[pi] * productWeight * n).toFixed(2);
            valueUsd = toUSD(value, sub.currencyCode, FX_MAP);
          }

          rows.push({
            subsidiary_id: sub.id,
            product_name: product,
            metric_type: d.metric_type,
            metric: d.metric,
            period: PERIODS_7[pi],
            value,
            value_usd: valueUsd,
            benchmark: d.benchmark,
            data_source_id: sub.dsOffset,
          });
        }
      }
    }
  }
  return rows;
}

// ---------------------------------------------------------------------------
// 3. net_flow_rates
// ---------------------------------------------------------------------------
function buildNetFlowRates(): Row[] {
  const bucketNames = [
    'AUM', 'Current Bkt',
    '1-30 DPD', '31-60 DPD', '61-90 DPD', '91-120 DPD',
    '121-150 DPD', '151-180 DPD', '180-210 DPD', '210+ DPD',
    'FWOF',
    'B1 Flow', 'B2 Flow', 'B3 Flow', 'B4 Flow', 'B5 Flow', 'B6 Flow',
    'POF%',
  ];

  // Base fractions of AUM for amount buckets (these multiply the subsidiary AUM)
  const amountFractions: Record<string, number[]> = {
    'AUM':         [0.88, 0.90, 0.92, 0.94, 0.95, 0.97, 1.0],
    'Current Bkt': [0.76, 0.78, 0.80, 0.81, 0.82, 0.84, 0.87],
    '1-30 DPD':    [0.063, 0.062, 0.061, 0.060, 0.059, 0.058, 0.058],
    '31-60 DPD':   [0.033, 0.032, 0.032, 0.031, 0.030, 0.029, 0.029],
    '61-90 DPD':   [0.021, 0.020, 0.020, 0.019, 0.019, 0.018, 0.018],
    '91-120 DPD':  [0.014, 0.013, 0.013, 0.012, 0.012, 0.011, 0.011],
    '121-150 DPD': [0.009, 0.009, 0.008, 0.008, 0.008, 0.007, 0.007],
    '151-180 DPD': [0.007, 0.007, 0.007, 0.006, 0.006, 0.006, 0.006],
    '180-210 DPD': [0.004, 0.004, 0.004, 0.004, 0.004, 0.003, 0.003],
    '210+ DPD':    [0.004, 0.003, 0.003, 0.003, 0.003, 0.003, 0.003],
    'FWOF':        [0.0015, 0.0014, 0.0013, 0.0012, 0.0012, 0.0011, 0.0010],
  };

  // Flow rates are pure percentages — scale by delinqMult
  const flowBase: Record<string, number[]> = {
    'B1 Flow': [0.34, 0.33, 0.32, 0.31, 0.30, 0.29, 0.28],
    'B2 Flow': [0.42, 0.41, 0.40, 0.39, 0.38, 0.37, 0.36],
    'B3 Flow': [0.45, 0.44, 0.43, 0.42, 0.41, 0.40, 0.39],
    'B4 Flow': [0.49, 0.48, 0.47, 0.46, 0.45, 0.44, 0.43],
    'B5 Flow': [0.54, 0.53, 0.52, 0.51, 0.50, 0.49, 0.48],
    'B6 Flow': [0.59, 0.58, 0.57, 0.56, 0.55, 0.54, 0.53],
    'POF%':    [0.024, 0.023, 0.022, 0.021, 0.020, 0.019, 0.018],
  };

  const amountBuckets = new Set(Object.keys(amountFractions));
  const flowBuckets = new Set(Object.keys(flowBase));

  const portfolios = ['Total Active Portfolio', 'Total Active Portfolio Secured'];

  const rows: Row[] = [];
  for (const sub of SUBSIDIARIES) {
    for (let pi = 0; pi < PERIODS_7.length; pi++) {
      for (const bkt of bucketNames) {
        for (let portIdx = 0; portIdx < portfolios.length; portIdx++) {
          const portfolio = portfolios[portIdx];
          const securedScale = portIdx === 1 ? 0.70 : 1.0;
          const n = noise(sub.id, pi, bucketNames.indexOf(bkt), portIdx);

          let value: number;
          let valueUsd: number | null = null;

          if (amountBuckets.has(bkt)) {
            const frac = amountFractions[bkt][pi];
            value = +(sub.aumLocal * frac * sub.delinqMult * securedScale * n).toFixed(2);
            // For AUM and Current Bkt, don't multiply by delinqMult
            if (bkt === 'AUM' || bkt === 'Current Bkt') {
              value = +(sub.aumLocal * frac * securedScale * n).toFixed(2);
            }
            valueUsd = toUSD(value, sub.currencyCode, FX_MAP);
          } else if (flowBuckets.has(bkt)) {
            const base = flowBase[bkt][pi];
            const flowDelinqScale = portIdx === 1 ? 0.80 : 1.0; // secured has lower flow rates
            value = +(base * sub.delinqMult * flowDelinqScale * n).toFixed(6);
            valueUsd = null;
          } else {
            value = 0;
          }

          rows.push({
            subsidiary_id: sub.id,
            portfolio,
            bucket: bkt,
            period: PERIODS_7[pi],
            value,
            value_usd: valueUsd,
            data_source_id: sub.dsOffset,
          });
        }
      }
    }
  }
  return rows;
}

// ---------------------------------------------------------------------------
// 4. roll_rate_series
// ---------------------------------------------------------------------------
function buildRollRateSeries(): Row[] {
  const buckets = ['B1', 'B2', 'B3', 'B4', 'B5', 'B6'];
  const metrics = ['Resolution', 'Roll Forward', 'Roll Backward'];

  // Base values per bucket [resolution, rollForward, rollBackward]
  const baseValues: Record<string, number[]> = {
    B1: [0.71, 0.21, 0.00],
    B2: [0.18, 0.595, 0.12],
    B3: [0.10, 0.72, 0.10],
    B4: [0.065, 0.79, 0.08],
    B5: [0.045, 0.85, 0.055],
    B6: [0.03, 0.90, 0.035],
  };

  const rows: Row[] = [];
  for (const sub of SUBSIDIARIES) {
    for (let bi = 0; bi < buckets.length; bi++) {
      for (let mi = 0; mi < metrics.length; mi++) {
        for (let pi = 0; pi < PERIODS_7.length; pi++) {
          let v = baseValues[buckets[bi]][mi];
          // Better-risk subsidiaries have higher resolution, lower roll-forward
          if (mi === 0) v *= (2 - sub.delinqMult); // resolution inverse of delinq
          if (mi === 1) v *= sub.delinqMult;        // roll forward scales with delinq
          // Add period trend (improving over time)
          const trend = pi * 0.003 * (mi === 0 ? 1 : mi === 1 ? -1 : 0);
          const n = noise(sub.id, bi, mi, pi);
          v = Math.max(0, +((v + trend) * n).toFixed(4));
          // Cap at 1
          v = Math.min(1, v);

          rows.push({
            subsidiary_id: sub.id,
            bucket: buckets[bi],
            metric: metrics[mi],
            period: PERIODS_7[pi],
            value: v,
            data_source_id: sub.dsOffset,
          });
        }
      }
    }
  }
  return rows;
}

// ---------------------------------------------------------------------------
// 5. collection_metrics
// ---------------------------------------------------------------------------
function buildCollectionMetrics(): Row[] {
  const buckets = ['Current', '1-30', '31-60', '61-90', '91-120', '120+'];

  interface BktDef {
    amountFrac: number;
    transitions: number;
    normalized: number;
    roll_backward: number;
    stabilized: number;
    roll_forward: number;
  }

  const baseDefs: BktDef[] = [
    { amountFrac: 0.84, transitions: 0,   normalized: 0,    roll_backward: 0,    stabilized: 0.92, roll_forward: 0.08 },
    { amountFrac: 0.063, transitions: 0.017, normalized: 0.27, roll_backward: 0.68, stabilized: 0.04, roll_forward: 0.28 },
    { amountFrac: 0.031, transitions: 0.012, normalized: 0.39, roll_backward: 0.18, stabilized: 0.05, roll_forward: 0.62 },
    { amountFrac: 0.020, transitions: 0.010, normalized: 0.50, roll_backward: 0.10, stabilized: 0.04, roll_forward: 0.72 },
    { amountFrac: 0.013, transitions: 0.008, normalized: 0.61, roll_backward: 0.07, stabilized: 0.03, roll_forward: 0.80 },
    { amountFrac: 0.033, transitions: 0.025, normalized: 0.75, roll_backward: 0.03, stabilized: 0.02, roll_forward: 0.90 },
  ];

  const portfolios = ['Total', 'Secured', 'Unsecured'];

  const rows: Row[] = [];
  for (const sub of SUBSIDIARIES) {
    for (let pi = 0; pi < PERIODS_7.length; pi++) {
      for (let bi = 0; bi < buckets.length; bi++) {
        for (let portIdx = 0; portIdx < portfolios.length; portIdx++) {
          const bd = baseDefs[bi];
          const securedScale = portIdx === 1 ? 0.65 : portIdx === 2 ? 0.35 : 1.0;
          const n = noise(sub.id, pi, bi, portIdx);

          const amount = +(sub.aumLocal * bd.amountFrac * securedScale * n).toFixed(2);
          const amountUsd = toUSD(amount, sub.currencyCode, FX_MAP);
          const transitions = +(sub.aumLocal * bd.transitions * securedScale * n).toFixed(2);

          // Roll rates adjusted for subsidiary risk and secured/unsecured
          const riskAdj = portIdx === 1 ? 0.85 : portIdx === 2 ? 1.20 : 1.0;
          const rb = +(bd.roll_backward * (2 - sub.delinqMult) * riskAdj * noise(sub.id, bi, portIdx, 1)).toFixed(4);
          const rf = +(bd.roll_forward * sub.delinqMult * riskAdj * noise(sub.id, bi, portIdx, 2)).toFixed(4);

          rows.push({
            subsidiary_id: sub.id,
            portfolio: portfolios[portIdx],
            bucket: buckets[bi],
            amount,
            amount_usd: amountUsd,
            transitions,
            normalized: +(bd.normalized * n).toFixed(4),
            roll_backward: Math.min(1, Math.max(0, rb)),
            stabilized: +(bd.stabilized * noise(sub.id, bi, pi, portIdx)).toFixed(4),
            roll_forward: Math.min(1, Math.max(0, rf)),
            period: PERIODS_7[pi],
            data_source_id: sub.dsOffset,
          });
        }
      }
    }
  }
  return rows;
}

// ---------------------------------------------------------------------------
// 6. vintage_points
// ---------------------------------------------------------------------------
function buildVintagePoints(): Row[] {
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const vintages: string[] = [];
  for (let y = 23; y <= 24; y++) {
    for (let m = 0; m < 12; m++) {
      vintages.push(`${monthNames[m]}'${y}`);
    }
  }
  for (let m = 0; m < 6; m++) {
    vintages.push(`${monthNames[m]}'25`);
  }

  const metricTypes = ['X+', '30+', '60+', '90+', 'Gross Loss', 'Recoveries', 'NCL'];
  const metricMultipliers: Record<string, number> = {
    'X+': 1.5, '30+': 1.0, '60+': 0.6, '90+': 0.35,
    'Gross Loss': 0.25, 'Recoveries': 0.08, 'NCL': 0.17,
  };

  // S-curve for delinquency
  function delinqCurve(mob: number): number {
    if (mob <= 0) return 0;
    return 0.065 * (1 - Math.exp(-0.35 * mob));
  }

  // Older vintages are worse
  function vintageQuality(vi: number): number {
    return 1.15 - (vi / 29) * 0.30;
  }

  const rows: Row[] = [];
  for (const sub of SUBSIDIARIES) {
    // Loan amount per vintage in local currency
    const baseVintageLoan = sub.aumLocal * 0.003; // ~0.3% of AUM per vintage

    for (let vi = 0; vi < vintages.length; vi++) {
      const loanAmount = +(baseVintageLoan * (0.8 + (vi / 29) * 0.4) * noise(sub.id, vi)).toFixed(2);
      const loanAmountUsd = toUSD(loanAmount, sub.currencyCode, FX_MAP);
      const quality = vintageQuality(vi);

      for (let mob = 1; mob <= 13; mob++) {
        const base30 = delinqCurve(mob) * quality * sub.delinqMult;

        for (let mti = 0; mti < metricTypes.length; mti++) {
          const mt = metricTypes[mti];
          let rate = base30 * metricMultipliers[mt];
          const n = Math.sin(sub.id * 2.1 + vi * 3.1 + mob * 7.7 + mti * 5.3) * 0.002;
          rate = Math.max(0, +(rate + n).toFixed(6));

          rows.push({
            subsidiary_id: sub.id,
            vintage: vintages[vi],
            portfolio_segment: 'Total',
            loan_amount: loanAmount,
            loan_amount_usd: loanAmountUsd,
            mob,
            delinquency_rate: rate,
            metric_type: mt,
            data_source_id: sub.dsOffset,
          });
        }
      }
    }
  }
  return rows;
}

// ---------------------------------------------------------------------------
// 7. non_starters
// ---------------------------------------------------------------------------
function buildNonStarters(): Row[] {
  const category = 'Non-Starter 90+';
  const metricNames = ['Count', 'Amount', '% of Origination', 'Avg DPD at 3MOB'];

  // Base counts/amounts per product type (will be scaled per subsidiary)
  const productBaseData: Record<string, { count: number[]; amount: number[]; pctOrig: number[]; avgDPD: number[] }> = {
    'Home Loan':     { count: [7, 7, 6, 6, 5],         amount: [2.4, 2.3, 2.1, 2.0, 1.9],     pctOrig: [0.017, 0.016, 0.015, 0.014, 0.013], avgDPD: [41, 40, 38, 37, 36] },
    'LAP':           { count: [10, 9, 8, 8, 7],         amount: [3.2, 3.0, 2.8, 2.6, 2.4],     pctOrig: [0.022, 0.021, 0.019, 0.018, 0.017], avgDPD: [45, 43, 41, 39, 37] },
    'Personal Loan': { count: [17, 16, 15, 14, 13],     amount: [1.15, 1.1, 1.0, 0.92, 0.85],  pctOrig: [0.048, 0.045, 0.042, 0.039, 0.036], avgDPD: [63, 60, 57, 54, 50] },
    'Auto Loan':     { count: [21, 20, 18, 17, 15],     amount: [3.1, 2.9, 2.7, 2.4, 2.2],     pctOrig: [0.027, 0.026, 0.024, 0.022, 0.021], avgDPD: [47, 45, 43, 41, 39] },
    'Credit Card':   { count: [25, 23, 22, 20, 18],     amount: [0.8, 0.75, 0.7, 0.65, 0.6],   pctOrig: [0.055, 0.052, 0.049, 0.046, 0.043], avgDPD: [68, 65, 62, 59, 55] },
    'Consumer Loan': { count: [58, 55, 52, 48, 45],     amount: [5.6, 5.2, 4.9, 4.5, 4.2],     pctOrig: [0.034, 0.032, 0.030, 0.028, 0.026], avgDPD: [54, 52, 49, 46, 43] },
    'Housing Loan':  { count: [7, 7, 6, 6, 5],          amount: [2.4, 2.3, 2.1, 2.0, 1.9],     pctOrig: [0.017, 0.016, 0.015, 0.014, 0.013], avgDPD: [41, 40, 38, 37, 36] },
    'Leasing':       { count: [12, 11, 10, 10, 9],      amount: [4.0, 3.7, 3.4, 3.2, 3.0],     pctOrig: [0.025, 0.023, 0.021, 0.020, 0.019], avgDPD: [48, 46, 44, 42, 40] },
    'Mortgage':      { count: [5, 5, 4, 4, 4],          amount: [2.8, 2.6, 2.4, 2.3, 2.2],     pctOrig: [0.015, 0.014, 0.013, 0.012, 0.011], avgDPD: [39, 38, 36, 35, 34] },
  };

  const rows: Row[] = [];
  for (const sub of SUBSIDIARIES) {
    // Scale factor for amounts: base data is in "millions of abstract units"; we convert to local
    const amountScale = sub.aumLocal / 300000000; // normalize so base amounts land in sensible range

    for (const product of sub.products) {
      const bd = productBaseData[product];
      if (!bd) continue;

      for (let pi = 0; pi < PERIODS_5.length; pi++) {
        const n = noise(sub.id, sub.products.indexOf(product), pi);

        const countVal = Math.round(bd.count[pi] * sub.delinqMult * n);
        const amountVal = +(bd.amount[pi] * amountScale * sub.delinqMult * n).toFixed(2);
        const amountUsd = toUSD(amountVal, sub.currencyCode, FX_MAP);
        const pctOrigVal = +(bd.pctOrig[pi] * sub.delinqMult * n).toFixed(6);
        const avgDPDVal = Math.round(bd.avgDPD[pi] * sub.delinqMult * n);

        const vals = [countVal, amountVal, pctOrigVal, avgDPDVal];
        const usdVals = [null, amountUsd, null, null];

        for (let mi = 0; mi < metricNames.length; mi++) {
          rows.push({
            subsidiary_id: sub.id,
            category,
            product,
            metric: metricNames[mi],
            period: PERIODS_5[pi],
            value: vals[mi],
            value_usd: usdVals[mi],
            data_source_id: sub.dsOffset,
          });
        }
      }
    }
  }
  return rows;
}

// ---------------------------------------------------------------------------
// 8. tdd_pre_disbursal
// ---------------------------------------------------------------------------
function buildTddPreDisbursal(): Row[] {
  const bands = ['<550', '550-600', '600-650', '650-700', '700-750', '750-800', '800+', 'Total'];

  // Base distributions per period (improving credit mix over time)
  const baseDist: number[][] = [
    [0.038, 0.035, 0.032, 0.028, 0.025],  // <550
    [0.075, 0.072, 0.068, 0.062, 0.058],  // 550-600
    [0.148, 0.145, 0.140, 0.135, 0.128],  // 600-650
    [0.255, 0.258, 0.262, 0.265, 0.268],  // 650-700
    [0.272, 0.278, 0.282, 0.288, 0.295],  // 700-750
    [0.158, 0.160, 0.163, 0.168, 0.172],  // 750-800
    [0.054, 0.052, 0.053, 0.054, 0.054],  // 800+
    [1.0, 1.0, 1.0, 1.0, 1.0],            // Total
  ];

  const rows: Row[] = [];
  for (const sub of SUBSIDIARIES) {
    for (let bi = 0; bi < bands.length; bi++) {
      for (let pi = 0; pi < PERIODS_5.length; pi++) {
        let value: number;
        if (bands[bi] === 'Total') {
          value = 1.0;
        } else {
          // Higher delinquency subsidiaries have more in lower score bands
          const n = noise(sub.id, bi, pi);
          if (bi < 3) {
            // Low score bands — scale up with delinqMult
            value = +(baseDist[bi][pi] * sub.delinqMult * n).toFixed(6);
          } else {
            // High score bands — scale inversely
            value = +(baseDist[bi][pi] * (2 - sub.delinqMult) * n).toFixed(6);
          }
        }
        rows.push({
          subsidiary_id: sub.id,
          metric: bands[bi],
          period: PERIODS_5[pi],
          value,
          data_source_id: sub.dsOffset + 1, // LOS source
        });
      }
    }
  }
  return rows;
}

// ---------------------------------------------------------------------------
// 9. tdd_post_disbursal
// ---------------------------------------------------------------------------
function buildTddPostDisbursal(): Row[] {
  const bands = ['<550', '550-600', '600-650', '650-700', '700-750', '750-800', '800+', 'Total'];
  const variants = ['Fresh', 'Renewal', 'Topup'];

  // Base distributions by variant
  const variantDist: Record<string, number[][]> = {
    Fresh: [
      [0.040, 0.037, 0.034, 0.030, 0.027],
      [0.078, 0.075, 0.070, 0.065, 0.060],
      [0.150, 0.147, 0.142, 0.138, 0.132],
      [0.252, 0.255, 0.260, 0.263, 0.266],
      [0.268, 0.274, 0.280, 0.285, 0.292],
      [0.158, 0.160, 0.162, 0.166, 0.170],
      [0.054, 0.052, 0.052, 0.053, 0.053],
      [1.0, 1.0, 1.0, 1.0, 1.0],
    ],
    Renewal: [
      [0.018, 0.016, 0.015, 0.013, 0.012],
      [0.042, 0.040, 0.038, 0.035, 0.032],
      [0.098, 0.095, 0.090, 0.085, 0.080],
      [0.235, 0.238, 0.242, 0.245, 0.248],
      [0.318, 0.322, 0.328, 0.335, 0.342],
      [0.218, 0.220, 0.222, 0.225, 0.228],
      [0.071, 0.069, 0.065, 0.062, 0.058],
      [1.0, 1.0, 1.0, 1.0, 1.0],
    ],
    Topup: [
      [0.032, 0.030, 0.028, 0.025, 0.022],
      [0.065, 0.062, 0.058, 0.054, 0.050],
      [0.135, 0.132, 0.128, 0.124, 0.118],
      [0.258, 0.262, 0.265, 0.268, 0.272],
      [0.285, 0.290, 0.295, 0.300, 0.308],
      [0.170, 0.172, 0.174, 0.177, 0.180],
      [0.055, 0.052, 0.052, 0.052, 0.050],
      [1.0, 1.0, 1.0, 1.0, 1.0],
    ],
  };

  const rows: Row[] = [];
  for (const sub of SUBSIDIARIES) {
    for (const variant of variants) {
      const dist = variantDist[variant];
      for (let bi = 0; bi < bands.length; bi++) {
        for (let pi = 0; pi < PERIODS_5.length; pi++) {
          let value: number;
          if (bands[bi] === 'Total') {
            value = 1.0;
          } else {
            const n = noise(sub.id, variants.indexOf(variant), bi, pi);
            if (bi < 3) {
              value = +(dist[bi][pi] * sub.delinqMult * n).toFixed(6);
            } else {
              value = +(dist[bi][pi] * (2 - sub.delinqMult) * n).toFixed(6);
            }
          }
          rows.push({
            subsidiary_id: sub.id,
            variant,
            bureau_bucket: bands[bi],
            period: PERIODS_5[pi],
            value,
            data_source_id: sub.dsOffset + 1,
          });
        }
      }
    }
  }
  return rows;
}

// ---------------------------------------------------------------------------
// 10. approved_base
// ---------------------------------------------------------------------------
function buildApprovedBase(): Row[] {
  const laBands = ['<50K', '50K-100K', '100K-250K', '250K-500K', '500K-1M', '1M+'];

  // Base data: count and amount (in abstract millions) per la_band per product
  // We'll map subsidiary products to these base patterns
  const bandProfiles: Record<string, { countBase: number; amountBase: number }[]> = {
    // Each array = one la_band in order [<50K, 50K-100K, 100K-250K, 250K-500K, 500K-1M, 1M+]
    'Home Loan':     [{ countBase: 0, amountBase: 0 }, { countBase: 50, amountBase: 3.75 }, { countBase: 200, amountBase: 30 }, { countBase: 180, amountBase: 63 }, { countBase: 120, amountBase: 84 }, { countBase: 30, amountBase: 45 }],
    'LAP':           [{ countBase: 0, amountBase: 0 }, { countBase: 30, amountBase: 2.25 }, { countBase: 150, amountBase: 22.5 }, { countBase: 120, amountBase: 42 }, { countBase: 80, amountBase: 56 }, { countBase: 20, amountBase: 30 }],
    'Personal Loan': [{ countBase: 800, amountBase: 32 }, { countBase: 320, amountBase: 24 }, { countBase: 120, amountBase: 18 }, { countBase: 25, amountBase: 8.75 }, { countBase: 5, amountBase: 3.5 }, { countBase: 2, amountBase: 3 }],
    'Auto Loan':     [{ countBase: 150, amountBase: 6 }, { countBase: 400, amountBase: 30 }, { countBase: 350, amountBase: 52.5 }, { countBase: 80, amountBase: 28 }, { countBase: 15, amountBase: 10.5 }, { countBase: 5, amountBase: 7.5 }],
    'Credit Card':   [{ countBase: 1500, amountBase: 15 }, { countBase: 600, amountBase: 45 }, { countBase: 200, amountBase: 30 }, { countBase: 40, amountBase: 14 }, { countBase: 8, amountBase: 5.6 }, { countBase: 2, amountBase: 3 }],
    'Consumer Loan': [{ countBase: 1200, amountBase: 48 }, { countBase: 900, amountBase: 67.5 }, { countBase: 600, amountBase: 90 }, { countBase: 150, amountBase: 52.5 }, { countBase: 40, amountBase: 28 }, { countBase: 10, amountBase: 15 }],
    'Housing Loan':  [{ countBase: 0, amountBase: 0 }, { countBase: 50, amountBase: 3.75 }, { countBase: 200, amountBase: 30 }, { countBase: 180, amountBase: 63 }, { countBase: 120, amountBase: 84 }, { countBase: 30, amountBase: 45 }],
    'Leasing':       [{ countBase: 80, amountBase: 3.2 }, { countBase: 250, amountBase: 18.75 }, { countBase: 300, amountBase: 45 }, { countBase: 100, amountBase: 35 }, { countBase: 30, amountBase: 21 }, { countBase: 8, amountBase: 12 }],
    'Mortgage':      [{ countBase: 0, amountBase: 0 }, { countBase: 40, amountBase: 3 }, { countBase: 180, amountBase: 27 }, { countBase: 200, amountBase: 70 }, { countBase: 130, amountBase: 91 }, { countBase: 35, amountBase: 52.5 }],
  };

  // Scale factor: base amounts are in "abstract millions"; we convert to local currency
  const rows: Row[] = [];
  for (const sub of SUBSIDIARIES) {
    const amountScale = sub.aumLocal / 300000000;

    for (const product of sub.products) {
      const profiles = bandProfiles[product];
      if (!profiles) continue;

      for (let bi = 0; bi < laBands.length; bi++) {
        const bp = profiles[bi];
        const n = noise(sub.id, bi, sub.products.indexOf(product));
        const count = Math.round(bp.countBase * n);
        const amount = +(bp.amountBase * amountScale * n).toFixed(2);
        const amountUsd = toUSD(amount, sub.currencyCode, FX_MAP);

        rows.push({
          subsidiary_id: sub.id,
          la_band: laBands[bi],
          loan_band: product,
          count,
          amount,
          amount_usd: amountUsd,
          data_source_id: sub.dsOffset + 1,
        });
      }
    }
  }
  return rows;
}

// ---------------------------------------------------------------------------
// 11. rejected_base
// ---------------------------------------------------------------------------
function buildRejectedBase(): Row[] {
  const amountBands = ['<50K', '50K-100K', '100K-250K', '250K-500K', '500K+'];

  // Base rejection data per product
  const rejectionProfiles: Record<string, { count: number; amount: number }[]> = {
    'Home Loan':     [{ count: 0, amount: 0 }, { count: 15, amount: 1.1 }, { count: 55, amount: 8.3 }, { count: 52, amount: 18.2 }, { count: 45, amount: 38.5 }],
    'LAP':           [{ count: 0, amount: 0 }, { count: 10, amount: 0.75 }, { count: 40, amount: 6 }, { count: 35, amount: 12.25 }, { count: 30, amount: 25.5 }],
    'Personal Loan': [{ count: 280, amount: 11.2 }, { count: 112, amount: 8.4 }, { count: 38, amount: 5.7 }, { count: 8, amount: 2.8 }, { count: 2, amount: 1.9 }],
    'Auto Loan':     [{ count: 42, amount: 1.7 }, { count: 110, amount: 8.3 }, { count: 95, amount: 14.3 }, { count: 24, amount: 8.4 }, { count: 6, amount: 5.4 }],
    'Credit Card':   [{ count: 450, amount: 4.5 }, { count: 180, amount: 13.5 }, { count: 60, amount: 9 }, { count: 12, amount: 4.2 }, { count: 3, amount: 2.7 }],
    'Consumer Loan': [{ count: 380, amount: 15.2 }, { count: 270, amount: 20.3 }, { count: 185, amount: 27.8 }, { count: 48, amount: 16.8 }, { count: 15, amount: 12.8 }],
    'Housing Loan':  [{ count: 0, amount: 0 }, { count: 15, amount: 1.1 }, { count: 55, amount: 8.3 }, { count: 52, amount: 18.2 }, { count: 45, amount: 38.5 }],
    'Leasing':       [{ count: 25, amount: 1 }, { count: 75, amount: 5.6 }, { count: 90, amount: 13.5 }, { count: 30, amount: 10.5 }, { count: 10, amount: 8.5 }],
    'Mortgage':      [{ count: 0, amount: 0 }, { count: 12, amount: 0.9 }, { count: 50, amount: 7.5 }, { count: 58, amount: 20.3 }, { count: 50, amount: 42.5 }],
  };

  const rows: Row[] = [];
  for (const sub of SUBSIDIARIES) {
    const amountScale = sub.aumLocal / 300000000;

    for (const product of sub.products) {
      const profiles = rejectionProfiles[product];
      if (!profiles) continue;

      for (let bi = 0; bi < amountBands.length; bi++) {
        const rp = profiles[bi];
        const n = noise(sub.id, bi, sub.products.indexOf(product));
        // Higher delinquency subsidiaries have more rejections
        const count = Math.round(rp.count * sub.delinqMult * n);
        const amount = +(rp.amount * amountScale * sub.delinqMult * n).toFixed(2);
        const amountUsd = toUSD(amount, sub.currencyCode, FX_MAP);

        rows.push({
          subsidiary_id: sub.id,
          loan_type: product,
          amount_band: amountBands[bi],
          count,
          amount,
          amount_usd: amountUsd,
          data_source_id: sub.dsOffset + 1,
        });
      }
    }
  }
  return rows;
}

// ---------------------------------------------------------------------------
// 12. los_metrics
// ---------------------------------------------------------------------------
function buildLosMetrics(): Row[] {
  const reportDate = '2025-08-15';

  interface MetricDef {
    metric: string;
    ftd: number;
    mtd: number;
    lmtd: number;
    lm_full: number;
    target: number | null;
    achievement: number | null;
    isVolume: boolean; // true = scale by subsidiary size; false = average/rate
  }

  const allProductDefs: MetricDef[] = [
    { metric: 'Applications Received', ftd: 52, mtd: 780, lmtd: 745, lm_full: 1520, target: 1600, achievement: 0.4875, isVolume: true },
    { metric: 'Login Count', ftd: 85, mtd: 1275, lmtd: 1210, lm_full: 2480, target: null, achievement: null, isVolume: true },
    { metric: 'Sanctions Count', ftd: 38, mtd: 570, lmtd: 535, lm_full: 1100, target: 1150, achievement: 0.4957, isVolume: true },
    { metric: 'Sanctions Amount', ftd: 3.6, mtd: 54.2, lmtd: 50.8, lm_full: 104.5, target: 110, achievement: 0.4927, isVolume: true },
    { metric: 'Disbursements Count', ftd: 32, mtd: 480, lmtd: 458, lm_full: 940, target: 1000, achievement: 0.48, isVolume: true },
    { metric: 'Disbursements Amount', ftd: 3.1, mtd: 46.5, lmtd: 43.8, lm_full: 90.2, target: 95, achievement: 0.4895, isVolume: true },
    { metric: 'Rejections', ftd: 14, mtd: 210, lmtd: 210, lm_full: 420, target: null, achievement: null, isVolume: true },
    { metric: 'Avg Ticket Size', ftd: 0.097, mtd: 0.097, lmtd: 0.096, lm_full: 0.096, target: null, achievement: null, isVolume: false },
    { metric: 'TAT (days)', ftd: 4.2, mtd: 4.5, lmtd: 4.8, lm_full: 4.6, target: 4.0, achievement: null, isVolume: false },
  ];

  // Amount metrics that need USD conversion
  const amountMetrics = new Set(['Sanctions Amount', 'Disbursements Amount', 'Avg Ticket Size']);

  const rows: Row[] = [];
  for (const sub of SUBSIDIARIES) {
    // Volume scale factor: proportional to AUM in USD terms
    const aumUsd = toUSD(sub.aumLocal, sub.currencyCode, FX_MAP);
    const volumeScale = aumUsd / 300000000; // normalize to ~1.0 for a mid-size subsidiary
    const amountScale = sub.aumLocal / 300000000; // local currency scale

    const allProducts = ['All Products', ...sub.products];

    for (let prodIdx = 0; prodIdx < allProducts.length; prodIdx++) {
      const product = allProducts[prodIdx];
      const productWeight = prodIdx === 0 ? 1.0 : (1 / sub.products.length);

      for (let di = 0; di < allProductDefs.length; di++) {
        const d = allProductDefs[di];
        const n = noise(sub.id, prodIdx, di);
        const isAmount = amountMetrics.has(d.metric);

        let ftd: number, mtd: number, lmtd: number, lm_full: number;
        let target: number | null, ftdUsd: number | null, mtdUsd: number | null;
        let lmtdUsd: number | null, lmFullUsd: number | null, targetUsd: number | null;

        if (d.isVolume) {
          const scale = isAmount ? amountScale * productWeight : volumeScale * productWeight;
          ftd = +(d.ftd * scale * n).toFixed(2);
          mtd = +(d.mtd * scale * n).toFixed(2);
          lmtd = +(d.lmtd * scale * n).toFixed(2);
          lm_full = +(d.lm_full * scale * n).toFixed(2);
          target = d.target !== null ? +(d.target * scale * n).toFixed(2) : null;

          if (isAmount) {
            ftdUsd = toUSD(ftd, sub.currencyCode, FX_MAP);
            mtdUsd = toUSD(mtd, sub.currencyCode, FX_MAP);
            lmtdUsd = toUSD(lmtd, sub.currencyCode, FX_MAP);
            lmFullUsd = toUSD(lm_full, sub.currencyCode, FX_MAP);
            targetUsd = target !== null ? toUSD(target, sub.currencyCode, FX_MAP) : null;
          } else {
            // Count metrics — no USD conversion
            ftdUsd = null;
            mtdUsd = null;
            lmtdUsd = null;
            lmFullUsd = null;
            targetUsd = null;
          }
        } else {
          // Non-volume (rates/averages) — slight noise per subsidiary
          ftd = +(d.ftd * n).toFixed(4);
          mtd = +(d.mtd * n).toFixed(4);
          lmtd = +(d.lmtd * n).toFixed(4);
          lm_full = +(d.lm_full * n).toFixed(4);
          target = d.target !== null ? +(d.target * n).toFixed(4) : null;

          if (isAmount) {
            // Avg Ticket Size is monetary
            const atsScale = amountScale / volumeScale; // local-to-volume ratio
            ftd = +(d.ftd * atsScale * n).toFixed(4);
            mtd = +(d.mtd * atsScale * n).toFixed(4);
            lmtd = +(d.lmtd * atsScale * n).toFixed(4);
            lm_full = +(d.lm_full * atsScale * n).toFixed(4);
            target = null;
            ftdUsd = toUSD(ftd, sub.currencyCode, FX_MAP);
            mtdUsd = toUSD(mtd, sub.currencyCode, FX_MAP);
            lmtdUsd = toUSD(lmtd, sub.currencyCode, FX_MAP);
            lmFullUsd = toUSD(lm_full, sub.currencyCode, FX_MAP);
            targetUsd = null;
          } else {
            ftdUsd = null;
            mtdUsd = null;
            lmtdUsd = null;
            lmFullUsd = null;
            targetUsd = null;
          }
        }

        const momChange = lmtd !== 0 ? +((mtd - lmtd) / lmtd).toFixed(4) : null;

        rows.push({
          subsidiary_id: sub.id,
          metric: d.metric,
          product,
          ftd,
          mtd,
          lmtd,
          lm_full,
          ftd_usd: ftdUsd,
          mtd_usd: mtdUsd,
          lmtd_usd: lmtdUsd,
          lm_full_usd: lmFullUsd,
          mom_change: momChange,
          target,
          target_usd: targetUsd,
          achievement: d.achievement,
          report_date: reportDate,
          data_source_id: sub.dsOffset + 1,
        });
      }
    }
  }
  return rows;
}

// ---------------------------------------------------------------------------
// 13. los_funnel
// ---------------------------------------------------------------------------
function buildLosFunnel(): Row[] {
  const reportDate = '2025-08-15';

  interface FunnelDef {
    stage: string;
    ftd: number;
    mtd: number;
    lmtd: number;
    conversion_rate: number;
  }

  const baseFunnel: FunnelDef[] = [
    { stage: 'Website Clicks',          ftd: 360, mtd: 5400, lmtd: 5150, conversion_rate: 1.0 },
    { stage: 'Leads Created',           ftd: 120, mtd: 1800, lmtd: 1720, conversion_rate: 0.333 },
    { stage: 'Applications Submitted',  ftd: 52,  mtd: 780,  lmtd: 745,  conversion_rate: 0.433 },
    { stage: 'Documents Submitted',     ftd: 43,  mtd: 650,  lmtd: 615,  conversion_rate: 0.833 },
    { stage: 'KYC Verified',            ftd: 39,  mtd: 590,  lmtd: 558,  conversion_rate: 0.908 },
    { stage: 'Credit Sanctioned',       ftd: 38,  mtd: 570,  lmtd: 535,  conversion_rate: 0.966 },
    { stage: 'Disbursement Initiated',  ftd: 34,  mtd: 510,  lmtd: 485,  conversion_rate: 0.895 },
    { stage: 'Disbursement Completed',  ftd: 32,  mtd: 480,  lmtd: 458,  conversion_rate: 0.941 },
  ];

  const rows: Row[] = [];
  for (const sub of SUBSIDIARIES) {
    const aumUsd = toUSD(sub.aumLocal, sub.currencyCode, FX_MAP);
    const volumeScale = aumUsd / 300000000;
    const amountScale = sub.aumLocal / 300000000;

    const allProducts = ['All Products', ...sub.products];

    for (let prodIdx = 0; prodIdx < allProducts.length; prodIdx++) {
      const product = allProducts[prodIdx];
      const productWeight = prodIdx === 0 ? 1.0 : (1 / sub.products.length);

      for (let si = 0; si < baseFunnel.length; si++) {
        const s = baseFunnel[si];
        const n = noise(sub.id, prodIdx, si);
        const scale = volumeScale * productWeight;

        const ftd = Math.round(s.ftd * scale * n);
        const mtd = Math.round(s.mtd * scale * n);
        const lmtd = Math.round(s.lmtd * scale * n);

        // Amounts in local currency (rough: multiply count-like base by amountScale ratio)
        const ftdUsd = +(ftd * 0.095).toFixed(2); // avg ticket ~0.095M USD
        const mtdUsd = +(mtd * 0.095).toFixed(2);
        const lmtdUsd = +(lmtd * 0.095).toFixed(2);

        rows.push({
          subsidiary_id: sub.id,
          stage: s.stage,
          product,
          ftd,
          mtd,
          lmtd,
          ftd_usd: ftdUsd,
          mtd_usd: mtdUsd,
          lmtd_usd: lmtdUsd,
          conversion_rate: +(s.conversion_rate * noise(sub.id, prodIdx, si, 99)).toFixed(3),
          report_date: reportDate,
          data_source_id: sub.dsOffset + 1,
        });
      }
    }
  }
  return rows;
}

// ---------------------------------------------------------------------------
// 14. los_daily
// ---------------------------------------------------------------------------
function buildLosDaily(): Row[] {
  const rows: Row[] = [];

  for (const sub of SUBSIDIARIES) {
    const aumUsd = toUSD(sub.aumLocal, sub.currencyCode, FX_MAP);
    const volumeScale = aumUsd / 300000000;
    const amountScale = sub.aumLocal / 300000000;

    const allProducts = ['All Products', ...sub.products];

    for (let prodIdx = 0; prodIdx < allProducts.length; prodIdx++) {
      const product = allProducts[prodIdx];
      const productWeight = prodIdx === 0 ? 1.0 : (1 / sub.products.length);

      for (let day = 1; day <= 15; day++) {
        const dateStr = `2025-08-${day.toString().padStart(2, '0')}`;
        const d = new Date(2025, 7, day);
        const dow = d.getDay();
        const isWeekend = dow === 0 || dow === 6;

        const n = noise(sub.id, prodIdx, day);

        let baseCount: number;
        let baseAmount: number;

        if (isWeekend) {
          baseCount = 5 + Math.round(Math.sin(day * 2.3) * 3.5 + 3.5);
          baseAmount = +(0.5 + Math.sin(day * 1.7) * 0.3 + 0.3).toFixed(2);
        } else {
          baseCount = 28 + Math.round(Math.sin(day * 1.1) * 5 + 5);
          baseAmount = +(2.7 + Math.sin(day * 0.9) * 0.45 + 0.45).toFixed(2);
        }

        const count = Math.max(1, Math.round(baseCount * volumeScale * productWeight * n));
        const amount = +(baseAmount * amountScale * productWeight * n).toFixed(2);
        const amountUsd = toUSD(amount, sub.currencyCode, FX_MAP);
        const avgTicket = count > 0 ? +(amount / count).toFixed(4) : 0;
        const avgTicketUsd = count > 0 ? +(amountUsd / count).toFixed(4) : 0;

        rows.push({
          subsidiary_id: sub.id,
          date: dateStr,
          product,
          count,
          amount,
          amount_usd: amountUsd,
          avg_ticket_size: avgTicket,
          avg_ticket_size_usd: avgTicketUsd,
          data_source_id: sub.dsOffset + 1,
        });
      }
    }
  }
  return rows;
}

// =============================================================================
// Main
// =============================================================================

async function main() {
  console.log('=== Lending Portfolio Dashboard — Multi-Subsidiary Seed Script ===\n');

  // -----------------------------------------------------------
  // 0. Clear all existing data
  // -----------------------------------------------------------
  console.log('Clearing all tables...');
  await clearAll();

  // -----------------------------------------------------------
  // 1. Dimension tables (seed first — PQR tables FK to these)
  // -----------------------------------------------------------
  console.log('--- Dimension Tables ---');

  // Check if dimension tables already have data (RLS may block writes on these)
  const { count: regCount } = await supabase.from('regions').select('*', { count: 'exact', head: true });
  if (!regCount) {
    console.log('Seeding regions...');
    await batchUpsert('regions', buildRegions());
    console.log('Seeding subsidiaries...');
    await batchUpsert('subsidiaries', buildSubsidiaries());
    console.log('Seeding currencies...');
    await batchUpsert('currencies', buildCurrencies());
    console.log('Seeding fx_rates...');
    await batchUpsert('fx_rates', buildFxRates());
    console.log('Seeding data_sources...');
    await batchUpsert('data_sources', buildDataSources());
    console.log('Seeding product_catalog...');
    await batchUpsert('product_catalog', buildProductCatalog());
  } else {
    console.log(`Dimension tables already populated (${regCount} regions found) — skipping.`);
  }

  // -----------------------------------------------------------
  // 2. PQR Summary tables (14 tables)
  // -----------------------------------------------------------
  console.log('\n--- PQR Summary Tables ---');

  console.log('Seeding consumer_overall_metrics...');
  await batchInsert('consumer_overall_metrics', buildConsumerOverallMetrics());

  console.log('Seeding consumer_product_metrics...');
  await batchInsert('consumer_product_metrics', buildConsumerProductMetrics());

  console.log('Seeding net_flow_rates...');
  await batchInsert('net_flow_rates', buildNetFlowRates());

  console.log('Seeding roll_rate_series...');
  await batchInsert('roll_rate_series', buildRollRateSeries());

  console.log('Seeding collection_metrics...');
  await batchInsert('collection_metrics', buildCollectionMetrics());

  console.log('Seeding vintage_points...');
  await batchInsert('vintage_points', buildVintagePoints());

  console.log('Seeding non_starters...');
  await batchInsert('non_starters', buildNonStarters());

  console.log('Seeding tdd_pre_disbursal...');
  await batchInsert('tdd_pre_disbursal', buildTddPreDisbursal());

  console.log('Seeding tdd_post_disbursal...');
  await batchInsert('tdd_post_disbursal', buildTddPostDisbursal());

  console.log('Seeding approved_base...');
  await batchInsert('approved_base', buildApprovedBase());

  console.log('Seeding rejected_base...');
  await batchInsert('rejected_base', buildRejectedBase());

  console.log('Seeding los_metrics...');
  await batchInsert('los_metrics', buildLosMetrics());

  console.log('Seeding los_funnel...');
  await batchInsert('los_funnel', buildLosFunnel());

  console.log('Seeding los_daily...');
  await batchInsert('los_daily', buildLosDaily());

  // -----------------------------------------------------------
  // Risk Appetite Settings (14 global defaults)
  // -----------------------------------------------------------
  console.log('\n--- Risk Appetite Settings ---');
  console.log('Seeding risk_appetite_settings...');
  try { await batchInsert('risk_appetite_settings', [
    { metric_key: 'fpd_pct', scope_level: 'global', appetite: 0.03, tolerance: 0.035 },
    { metric_key: 'dpd_30_plus', scope_level: 'global', appetite: 0.05, tolerance: 0.06 },
    { metric_key: 'dpd_90_plus', scope_level: 'global', appetite: 0.015, tolerance: 0.02 },
    { metric_key: 'net_credit_loss', scope_level: 'global', appetite: 0.01, tolerance: 0.015 },
    { metric_key: 'non_starter_rate', scope_level: 'global', appetite: 0.02, tolerance: 0.04 },
    { metric_key: 'roll_forward_rate', scope_level: 'global', appetite: 0.1, tolerance: 0.2 },
    { metric_key: 'resolution_rate', scope_level: 'global', appetite: 0.2, tolerance: 0.1 },
    { metric_key: 'approval_rate', scope_level: 'global', appetite: 0.5, tolerance: 0.35 },
    { metric_key: 'los_achievement', scope_level: 'global', appetite: 0.45, tolerance: 0.35 },
    { metric_key: 'npl_ratio', scope_level: 'global', appetite: 0.03, tolerance: 0.05 },
    { metric_key: 'stage_2_3_pct', scope_level: 'global', appetite: 0.07, tolerance: 0.1 },
    { metric_key: 'avg_ews_score', scope_level: 'global', appetite: 1.0, tolerance: 2.0 },
    { metric_key: 'collection_efficiency', scope_level: 'global', appetite: 0.9, tolerance: 0.75 },
    { metric_key: 'provision_coverage', scope_level: 'global', appetite: 0.8, tolerance: 0.6 },
  ]); } catch { console.log('  ⚠ risk_appetite_settings table not found — skipping.'); }

  console.log('\n=== Seeding complete! ===');
}

main().catch((err) => {
  console.error('Seed script failed:', err);
  process.exit(1);
});
