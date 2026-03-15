import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
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
    // Forward Outlook tables (FK -> subsidiaries)
    'subsidiary_stress_scores', 'management_actions',
    // Risk Outlook tables (FK -> subsidiaries)
    'ecl_forecast', 'ecl_waterfall', 'stress_scenario_losses', 'cet1_trajectory',
    'ecl_sensitivity', 'pd_migration_matrix', 'pd_term_structure', 'rating_distribution',
    'vintage_forecast', 'roll_rate_forecast', 'leading_indicators', 'macro_credit_linkage',
    // Trade & Corporate tables (FK -> data_sources, subsidiaries)
    'corporate_portfolio_metrics',
    'corporate_delinquency',
    'corporate_covenants',
    'corporate_watchlist',
    'corporate_industry_concentration',
    'corporate_executive_summary',
    'corporate_facilities',
    'trade_watchlist',
    'trade_collection_efficiency',
    'trade_rating_distribution',
    'trade_concentrations',
    'trade_asset_quality',
    'trade_entity_performance',
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
const PERIODS_12 = [
  "Apr'25", "May'25", "Jun'25", "Jul'25", "Aug'25", "Sep'25",
  "Oct'25", "Nov'25", "Dec'25", "Jan'26", "Feb'26", "Mar'26",
];
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
    { metric_type: 'Delinquency', metric: '60+ Amt%', baseValues: [0.040, 0.038, 0.035, 0.033, 0.031, 0.029, 0.027], benchmark: 0.04, isRate: true, isAbsolute: false },
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
    // ── Book Size and Growth ──
    { metric_type: 'Book Size and Growth', metric: 'Total AUM', baseValues: [0.88, 0.90, 0.92, 0.94, 0.95, 0.97, 1.0], benchmark: null, isRate: false, isAbsolute: false },
    { metric_type: 'Book Size and Growth', metric: 'On-Book AUM', baseValues: [0.70, 0.72, 0.74, 0.75, 0.76, 0.78, 0.80], benchmark: null, isRate: false, isAbsolute: false },
    { metric_type: 'Book Size and Growth', metric: 'Off-Book AUM', baseValues: [0.18, 0.18, 0.18, 0.19, 0.19, 0.19, 0.20], benchmark: null, isRate: false, isAbsolute: false },
    { metric_type: 'Book Size and Growth', metric: 'New Bookings', baseValues: [0.058, 0.062, 0.060, 0.065, 0.063, 0.068, 0.073], benchmark: null, isRate: false, isAbsolute: false },
    { metric_type: 'Book Size and Growth', metric: 'Life-to-Date Disbursement', baseValues: [2.8, 2.9, 3.0, 3.1, 3.2, 3.3, 3.5], benchmark: null, isRate: false, isAbsolute: false },
    { metric_type: 'Book Size and Growth', metric: 'Wt Avg ROI', baseValues: [0.158, 0.156, 0.162, 0.159, 0.161, 0.160, 0.162], benchmark: 0.15, isRate: false, isAbsolute: true },
    { metric_type: 'Book Size and Growth', metric: 'Wt Avg Tenor', baseValues: [36, 36, 37, 37, 38, 38, 39], benchmark: null, isRate: false, isAbsolute: true },
    { metric_type: 'Book Size and Growth', metric: 'Average Ticket Size', baseValues: [12500, 12800, 13100, 13200, 13500, 13800, 14000], benchmark: null, isRate: false, isAbsolute: true },
    // ── Entry Rates ──
    { metric_type: 'Entry Rates', metric: 'Current BKT Bounce Rate', baseValues: [0.12, 0.115, 0.11, 0.108, 0.105, 0.10, 0.098], benchmark: 0.10, isRate: true, isAbsolute: false },
    { metric_type: 'Entry Rates', metric: 'FPD%', baseValues: [0.038, 0.036, 0.035, 0.033, 0.032, 0.031, 0.029], benchmark: 0.035, isRate: true, isAbsolute: false },
    { metric_type: 'Entry Rates', metric: 'FPD To GCL Trend', baseValues: [0.35, 0.34, 0.33, 0.32, 0.31, 0.30, 0.29], benchmark: null, isRate: true, isAbsolute: false },
    // ── Portfolio Performance ──
    { metric_type: 'Portfolio Performance', metric: 'Foreclosure (M USD)', baseValues: [0.015, 0.016, 0.017, 0.018, 0.019, 0.020, 0.022], benchmark: null, isRate: false, isAbsolute: false },
    { metric_type: 'Portfolio Performance', metric: 'X+ Amt% excl w/o', baseValues: [0.082, 0.078, 0.075, 0.072, 0.069, 0.066, 0.063], benchmark: 0.08, isRate: true, isAbsolute: false },
    { metric_type: 'Portfolio Performance', metric: 'X+ Amt excl w/o (M USD)', baseValues: [0.072, 0.070, 0.068, 0.066, 0.064, 0.062, 0.060], benchmark: null, isRate: false, isAbsolute: false },
    { metric_type: 'Portfolio Performance', metric: '30+ Amt% excl w/o', baseValues: [0.062, 0.058, 0.055, 0.053, 0.050, 0.048, 0.045], benchmark: 0.06, isRate: true, isAbsolute: false },
    { metric_type: 'Portfolio Performance', metric: '30+ Amt excl w/o (M USD)', baseValues: [0.054, 0.052, 0.050, 0.048, 0.046, 0.044, 0.042], benchmark: null, isRate: false, isAbsolute: false },
    { metric_type: 'Portfolio Performance', metric: '60+ Amt% excl w/o', baseValues: [0.040, 0.038, 0.035, 0.033, 0.031, 0.029, 0.027], benchmark: 0.04, isRate: true, isAbsolute: false },
    { metric_type: 'Portfolio Performance', metric: '60+ Amt excl w/o (M USD)', baseValues: [0.035, 0.034, 0.032, 0.030, 0.029, 0.027, 0.025], benchmark: null, isRate: false, isAbsolute: false },
    { metric_type: 'Portfolio Performance', metric: '90+ Amt% excl w/o', baseValues: [0.022, 0.021, 0.019, 0.018, 0.017, 0.016, 0.015], benchmark: 0.02, isRate: true, isAbsolute: false },
    { metric_type: 'Portfolio Performance', metric: '90+ Amt excl w/o (M USD)', baseValues: [0.019, 0.018, 0.017, 0.016, 0.015, 0.014, 0.013], benchmark: null, isRate: false, isAbsolute: false },
    { metric_type: 'Portfolio Performance', metric: 'Gross Cumulative Write-off (M USD)', baseValues: [0.045, 0.048, 0.051, 0.054, 0.057, 0.060, 0.063], benchmark: null, isRate: false, isAbsolute: false },
    { metric_type: 'Portfolio Performance', metric: 'Incremental Write-off (M USD)', baseValues: [0.003, 0.003, 0.003, 0.003, 0.003, 0.003, 0.003], benchmark: null, isRate: false, isAbsolute: false },
    { metric_type: 'Portfolio Performance', metric: 'Cumulative Recoveries (M USD)', baseValues: [0.012, 0.013, 0.014, 0.015, 0.016, 0.018, 0.020], benchmark: null, isRate: false, isAbsolute: false },
    { metric_type: 'Portfolio Performance', metric: 'Incremental Recoveries (M USD)', baseValues: [0.001, 0.001, 0.001, 0.001, 0.001, 0.002, 0.002], benchmark: null, isRate: false, isAbsolute: false },
    { metric_type: 'Portfolio Performance', metric: 'Cumulative NCL (M USD)', baseValues: [0.033, 0.035, 0.037, 0.039, 0.041, 0.042, 0.043], benchmark: null, isRate: false, isAbsolute: false },
    { metric_type: 'Portfolio Performance', metric: 'Net Credit Loss %', baseValues: [0.038, 0.036, 0.034, 0.032, 0.030, 0.028, 0.026], benchmark: 0.03, isRate: true, isAbsolute: false },
    // ── Process Efficiency ──
    { metric_type: 'Process Efficiency', metric: 'Policy Deviation (%account)', baseValues: [0.028, 0.026, 0.025, 0.024, 0.023, 0.022, 0.020], benchmark: 0.03, isRate: true, isAbsolute: false },
    { metric_type: 'Process Efficiency', metric: 'PDD Pending > 60 days (#)', baseValues: [45, 42, 38, 35, 32, 28, 25], benchmark: null, isRate: false, isAbsolute: true },
    // ── Provision Coverage ──
    { metric_type: 'Provision Coverage', metric: 'Stage 1 POS (M USD)', baseValues: [0.748, 0.765, 0.782, 0.799, 0.808, 0.825, 0.850], benchmark: null, isRate: false, isAbsolute: false },
    { metric_type: 'Provision Coverage', metric: 'Stage 1 Provision Hold (M USD)', baseValues: [0.0075, 0.0077, 0.0078, 0.0080, 0.0081, 0.0083, 0.0085], benchmark: null, isRate: false, isAbsolute: false },
    { metric_type: 'Provision Coverage', metric: 'Stage 2 POS (M USD)', baseValues: [0.088, 0.090, 0.092, 0.094, 0.095, 0.097, 0.100], benchmark: null, isRate: false, isAbsolute: false },
    { metric_type: 'Provision Coverage', metric: 'Stage 2 Provision Hold (M USD)', baseValues: [0.0044, 0.0045, 0.0046, 0.0047, 0.0048, 0.0049, 0.0050], benchmark: null, isRate: false, isAbsolute: false },
    { metric_type: 'Provision Coverage', metric: 'Stage 3 POS (M USD)', baseValues: [0.044, 0.045, 0.046, 0.047, 0.048, 0.049, 0.050], benchmark: null, isRate: false, isAbsolute: false },
    { metric_type: 'Provision Coverage', metric: 'Stage 3 Provision Hold (M USD)', baseValues: [0.0176, 0.0180, 0.0184, 0.0188, 0.0192, 0.0196, 0.0200], benchmark: null, isRate: false, isAbsolute: false },
    // ── Collection Efficiency ──
    { metric_type: 'Collection Efficiency', metric: 'Collection Efficiency', baseValues: [0.92, 0.925, 0.93, 0.935, 0.94, 0.945, 0.95], benchmark: 0.95, isRate: false, isAbsolute: true },
  ];

  const rows: Row[] = [];
  for (const sub of SUBSIDIARIES) {
    const nProducts = sub.products.length;
    for (let pri = 0; pri < nProducts; pri++) {
      const product = sub.products[pri];
      const productWeight = 1 / nProducts; // even split for AUM share
      const prodDelinq = PRODUCT_DELINQ_MULT[product] || 1.0;

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
const PRODUCT_DELINQ_MULT: Record<string, number> = {
  'Home Loan': 0.65, 'LAP': 0.75, 'Personal Loan': 1.40,
  'Auto Loan': 0.85, 'Credit Card': 1.55,
  'Consumer Loan': 1.0, 'Housing Loan': 0.65,
  'Leasing': 0.80, 'Mortgage': 0.60,
};

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

  // Helper to generate rows for a given product_name (null = aggregate total)
  function emitRows(sub: typeof SUBSIDIARIES[number], productName: string | null, prodDelinq: number, productWeight: number) {
    for (let pi = 0; pi < PERIODS_7.length; pi++) {
      for (const bkt of bucketNames) {
        for (let portIdx = 0; portIdx < portfolios.length; portIdx++) {
          const portfolio = portfolios[portIdx];
          const securedScale = portIdx === 1 ? 0.70 : 1.0;
          const extraSeed = productName ? productName.charCodeAt(0) : 0;
          const n = noise(sub.id + extraSeed, pi, bucketNames.indexOf(bkt), portIdx);

          let value: number;
          let valueUsd: number | null = null;

          if (amountBuckets.has(bkt)) {
            const frac = amountFractions[bkt][pi];
            // DPD buckets scale by delinquency; AUM/Current don't
            if (bkt === 'AUM' || bkt === 'Current Bkt') {
              value = +(sub.aumLocal * frac * securedScale * productWeight * n).toFixed(2);
            } else {
              value = +(sub.aumLocal * frac * sub.delinqMult * prodDelinq * securedScale * productWeight * n).toFixed(2);
            }
            valueUsd = toUSD(value, sub.currencyCode, FX_MAP);
          } else if (flowBuckets.has(bkt)) {
            const base = flowBase[bkt][pi];
            const flowDelinqScale = portIdx === 1 ? 0.80 : 1.0;
            value = +(base * sub.delinqMult * prodDelinq * flowDelinqScale * n).toFixed(6);
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
            product_name: productName,
          });
        }
      }
    }
  }

  for (const sub of SUBSIDIARIES) {
    // Aggregate rows (product_name = null)
    emitRows(sub, null, 1.0, 1.0);
    // Per-product rows
    const nProducts = sub.products.length;
    for (const product of sub.products) {
      emitRows(sub, product, PRODUCT_DELINQ_MULT[product] || 1.0, 1 / nProducts);
    }
  }
  return rows;
}

// ---------------------------------------------------------------------------
// 4. roll_rate_series
// ---------------------------------------------------------------------------
// Roll rate model (per Excel reference):
//   Resolution = Norm + Rollback + Stab (composite)
//   Roll Forward = 1 - Resolution
//   B1 (Current): only Resolution + Roll Forward (no norm/stab/rollback)
//   B2 (1-30):    Resolution + Norm + Stab + Roll Forward (no Rollback)
//   B3-B6:        Resolution + Norm + Rollback + Stab + Roll Forward (all 5)
function buildRollRateSeries(): Row[] {
  const buckets = ['B1', 'B2', 'B3', 'B4', 'B5', 'B6'];

  // Base component values per bucket: [norm, rollback, stab]
  // Resolution = norm + rollback + stab; Roll Forward = 1 - resolution
  // B1: resolution ~80%, no components (current bucket)
  // B2: no rollback (going back from B2 = normalize)
  const baseComponents: Record<string, { norm: number; rollback: number; stab: number }> = {
    B1: { norm: 0, rollback: 0, stab: 0 },          // Resolution ~80% set directly
    B2: { norm: 0.16, rollback: 0, stab: 0.12 },     // Resolution ~28%
    B3: { norm: 0.055, rollback: 0.02, stab: 0.10 }, // Resolution ~17.5%
    B4: { norm: 0.045, rollback: 0.02, stab: 0.08 }, // Resolution ~14.5%
    B5: { norm: 0.035, rollback: 0.02, stab: 0.06 }, // Resolution ~11.5%
    B6: { norm: 0.03, rollback: 0.02, stab: 0.05 },  // Resolution ~10%
  };

  // B1 resolution is special — set directly (not sum of components)
  const B1_RESOLUTION_BASE = 0.80;

  const rows: Row[] = [];

  function emitRows(sub: typeof SUBSIDIARIES[number], productName: string | null, prodDelinq: number) {
    const extraSeed = productName ? productName.charCodeAt(0) : 0;
    const riskMult = sub.delinqMult * prodDelinq;

    for (let bi = 0; bi < buckets.length; bi++) {
      const bucket = buckets[bi];
      const comp = baseComponents[bucket];

      for (let pi = 0; pi < PERIODS_12.length; pi++) {
        const trend = pi * 0.002; // slight improvement over time

        if (bi === 0) {
          // B1 (Current): only Resolution + Roll Forward
          const resBase = B1_RESOLUTION_BASE * (2 - riskMult);
          const n = noise(sub.id + extraSeed, bi, 0, pi);
          const resolution = Math.min(1, Math.max(0, +((resBase + trend) * n).toFixed(4)));
          const rollForward = Math.min(1, Math.max(0, +(1 - resolution).toFixed(4)));

          rows.push({ subsidiary_id: sub.id, bucket, metric: 'Resolution', period: PERIODS_12[pi], value: resolution, data_source_id: sub.dsOffset, product_name: productName });
          rows.push({ subsidiary_id: sub.id, bucket, metric: 'Roll Forward', period: PERIODS_12[pi], value: rollForward, data_source_id: sub.dsOffset, product_name: productName });
        } else {
          // B2-B6: generate component rates, derive Resolution and Roll Forward
          const nNorm = noise(sub.id + extraSeed, bi, 1, pi);
          const nRollback = noise(sub.id + extraSeed, bi, 2, pi);
          const nStab = noise(sub.id + extraSeed, bi, 3, pi);

          // Norm inversely proportional to risk (better collectors resolve more)
          const norm = comp.norm > 0
            ? Math.max(0, +((comp.norm * (2 - riskMult) + trend * 0.5) * nNorm).toFixed(4))
            : 0;
          // Rollback: slight inverse to risk
          const rollback = comp.rollback > 0
            ? Math.max(0, +((comp.rollback * (1.5 - riskMult * 0.5)) * nRollback).toFixed(4))
            : 0;
          // Stab: slight inverse to risk
          const stab = Math.max(0, +((comp.stab * (1.5 - riskMult * 0.5) + trend * 0.3) * nStab).toFixed(4));

          const resolution = Math.min(1, +(norm + rollback + stab).toFixed(4));
          const rollForward = Math.min(1, Math.max(0, +(1 - resolution).toFixed(4)));

          rows.push({ subsidiary_id: sub.id, bucket, metric: 'Resolution', period: PERIODS_12[pi], value: resolution, data_source_id: sub.dsOffset, product_name: productName });
          if (norm > 0) rows.push({ subsidiary_id: sub.id, bucket, metric: 'Norm', period: PERIODS_12[pi], value: norm, data_source_id: sub.dsOffset, product_name: productName });
          if (rollback > 0) rows.push({ subsidiary_id: sub.id, bucket, metric: 'Rollback', period: PERIODS_12[pi], value: rollback, data_source_id: sub.dsOffset, product_name: productName });
          rows.push({ subsidiary_id: sub.id, bucket, metric: 'Stab', period: PERIODS_12[pi], value: stab, data_source_id: sub.dsOffset, product_name: productName });
          rows.push({ subsidiary_id: sub.id, bucket, metric: 'Roll Forward', period: PERIODS_12[pi], value: rollForward, data_source_id: sub.dsOffset, product_name: productName });
        }
      }
    }
  }

  for (const sub of SUBSIDIARIES) {
    emitRows(sub, null, 1.0);
    for (const product of sub.products) {
      emitRows(sub, product, PRODUCT_DELINQ_MULT[product] || 1.0);
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

  const categoryMap: Record<string, string> = {
    'Home Loan': 'Secured', 'LAP': 'Secured', 'Personal Loan': 'Unsecured',
    'Auto Loan': 'Secured', 'Credit Card': 'Unsecured', 'Consumer Loan': 'Unsecured',
    'Housing Loan': 'Secured', 'Leasing': 'Secured', 'Mortgage': 'Secured',
  };

  const rows: Row[] = [];

  function emitRows(sub: typeof SUBSIDIARIES[number], productName: string | null, portfolioList: string[], amountScale: number, riskMult: number) {
    const extraSeed = productName ? productName.charCodeAt(0) + productName.charCodeAt(productName.length - 1) : 0;

    for (let pi = 0; pi < PERIODS_12.length; pi++) {
      for (let bi = 0; bi < buckets.length; bi++) {
        for (let portIdx = 0; portIdx < portfolioList.length; portIdx++) {
          const bd = baseDefs[bi];
          const securedScale = portfolioList[portIdx] === 'Secured' ? 0.65
            : portfolioList[portIdx] === 'Unsecured' ? 0.35 : 1.0;
          const n = noise(sub.id + extraSeed, pi, bi, portIdx);

          const amount = +(sub.aumLocal * bd.amountFrac * securedScale * amountScale * n).toFixed(2);
          const amountUsd = toUSD(amount, sub.currencyCode, FX_MAP);

          const riskAdj = portfolioList[portIdx] === 'Secured' ? 0.85
            : portfolioList[portIdx] === 'Unsecured' ? 1.20 : 1.0;
          const rb = +(bd.roll_backward * (2 - sub.delinqMult * riskMult) * riskAdj * noise(sub.id + extraSeed, bi, portIdx, 1)).toFixed(4);
          const rf = +(bd.roll_forward * sub.delinqMult * riskMult * riskAdj * noise(sub.id + extraSeed, bi, portIdx, 2)).toFixed(4);

          rows.push({
            subsidiary_id: sub.id,
            portfolio: portfolioList[portIdx],
            bucket: buckets[bi],
            amount,
            amount_usd: amountUsd,
            normalized: +(bd.normalized * n).toFixed(4),
            roll_backward: Math.min(1, Math.max(0, rb)),
            stabilized: +(bd.stabilized * noise(sub.id + extraSeed, bi, pi, portIdx)).toFixed(4),
            roll_forward: Math.min(1, Math.max(0, rf)),
            period: PERIODS_12[pi],
            product_name: productName,
            data_source_id: sub.dsOffset,
          });
        }
      }
    }
  }

  for (const sub of SUBSIDIARIES) {
    // Aggregate rows (product_name = null) with Total/Secured/Unsecured
    emitRows(sub, null, portfolios, 1.0, 1.0);
    // Per-product rows with product's own category as portfolio
    const nProducts = sub.products.length || 1;
    for (const product of sub.products) {
      const cat = categoryMap[product] || 'Unsecured';
      const prodDelinq = PRODUCT_DELINQ_MULT[product] || 1.0;
      emitRows(sub, product, [cat], 1 / nProducts, prodDelinq);
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

  // Parse vintage string to absolute month index for elapsed-month calculation
  const monthIdx: Record<string, number> = {
    Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5,
    Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11,
  };
  function parseVintageMonth(v: string): number {
    const match = v.match(/([A-Za-z]+)'?(\d{2,4})/);
    if (!match) return 0;
    let y = parseInt(match[2], 10);
    if (y < 100) y += 2000;
    return y * 12 + (monthIdx[match[1]] ?? 0);
  }
  // "Current" date = one month after the latest vintage (Jul'25)
  const currentMonth = parseVintageMonth(vintages[vintages.length - 1]) + 1;

  const metricTypes = ['X+', '30+', '60+', '90+', 'Gross Loss', 'Recoveries', 'NCL'];
  const metricMultipliers: Record<string, number> = {
    'X+': 1.5, '30+': 1.0, '60+': 0.6, '90+': 0.35,
    'Gross Loss': 0.25, 'Recoveries': 0.08, 'NCL': 0.17,
  };

  // Product-type multiplier: secured products have lower delinquency
  const securedProducts = new Set(['Home Loan', 'LAP', 'Auto Loan', 'Housing Loan', 'Leasing', 'Mortgage']);
  function productMult(product: string): number {
    return securedProducts.has(product) ? 0.7 : 1.3;
  }

  // Hump-shaped delinquency curve: rises, peaks ~MOB 10-12, then settles
  function delinqCurve(mob: number): number {
    if (mob <= 0) return 0;
    const rise = 1 - Math.exp(-0.25 * mob);
    const settle = Math.exp(-0.04 * Math.max(0, mob - 12));
    return 0.075 * rise * (0.3 + 0.7 * settle);
  }

  // Older vintages are worse
  function vintageQuality(vi: number): number {
    return 1.15 - (vi / 29) * 0.30;
  }

  const rows: Row[] = [];
  for (const sub of SUBSIDIARIES) {
    // Loan amount per vintage in local currency — split across products
    const baseVintageLoan = sub.aumLocal * 0.003 / sub.products.length;

    for (let pi = 0; pi < sub.products.length; pi++) {
      const product = sub.products[pi];
      const pMult = productMult(product);

      for (let vi = 0; vi < vintages.length; vi++) {
        const loanAmount = +(baseVintageLoan * (0.8 + (vi / 29) * 0.4) * noise(sub.id * 10 + pi, vi)).toFixed(2);
        const loanAmountUsd = toUSD(loanAmount, sub.currencyCode, FX_MAP);
        const quality = vintageQuality(vi);

        // Only generate MOBs that have elapsed (diagonal/triangular pattern)
        const monthsElapsed = currentMonth - parseVintageMonth(vintages[vi]);
        const maxMob = monthsElapsed;

        for (let mob = 1; mob <= maxMob; mob++) {
          const base30 = delinqCurve(mob) * quality * sub.delinqMult * pMult;

          for (let mti = 0; mti < metricTypes.length; mti++) {
            const mt = metricTypes[mti];
            let rate = base30 * metricMultipliers[mt];
            const n = Math.sin(sub.id * 2.1 + pi * 1.7 + vi * 3.1 + mob * 7.7 + mti * 5.3) * 0.002;
            rate = Math.max(0, +(rate + n).toFixed(6));

            rows.push({
              subsidiary_id: sub.id,
              vintage: vintages[vi],
              portfolio_segment: 'Total',
              product_name: product,
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
  }
  return rows;
}

// ---------------------------------------------------------------------------
// 7. non_starters
// ---------------------------------------------------------------------------
function buildNonStarters(): Row[] {
  const categories = ['Total', 'Secured', 'Unsecured'] as const;
  const metricNames = ['Facility in Force (#)', 'ENR'] as const;

  const nsCategoryMap: Record<string, string> = {
    'Home Loan': 'Secured', 'LAP': 'Secured', 'Personal Loan': 'Unsecured',
    'Auto Loan': 'Secured', 'Credit Card': 'Unsecured', 'Consumer Loan': 'Unsecured',
    'Housing Loan': 'Secured', 'Leasing': 'Secured', 'Mortgage': 'Secured',
  };

  // Base data per product: count of non-starter facilities, ENR in abstract millions
  const productBase: Record<string, { baseCount: number; baseENR: number }> = {
    'Home Loan':     { baseCount: 120, baseENR: 45.0 },
    'LAP':           { baseCount: 85,  baseENR: 32.0 },
    'Personal Loan': { baseCount: 250, baseENR: 18.0 },
    'Auto Loan':     { baseCount: 180, baseENR: 28.0 },
    'Credit Card':   { baseCount: 310, baseENR: 8.5 },
    'Consumer Loan': { baseCount: 420, baseENR: 35.0 },
    'Housing Loan':  { baseCount: 95,  baseENR: 52.0 },
    'Leasing':       { baseCount: 65,  baseENR: 22.0 },
    'Mortgage':      { baseCount: 40,  baseENR: 60.0 },
  };

  const rows: Row[] = [];

  for (const sub of SUBSIDIARIES) {
    const amountScale = sub.aumLocal / 300000000;

    for (const cat of categories) {
      const catProducts = cat === 'Total'
        ? sub.products
        : sub.products.filter(p => nsCategoryMap[p] === cat);
      if (catProducts.length === 0) continue;

      // Accumulators for "Total" product row
      const totalAcc: Record<string, { count: number; enr: number; enrUsd: number }> = {};

      for (const product of catProducts) {
        const bd = productBase[product];
        if (!bd) continue;
        const prodIdx = sub.products.indexOf(product);

        for (let pi = 0; pi < PERIODS_12.length; pi++) {
          const n = noise(sub.id, prodIdx, pi, categories.indexOf(cat));
          // Slight downward trend (improving collections)
          const trend = 1 - (pi / PERIODS_12.length) * 0.12;

          const countVal = Math.round(bd.baseCount * sub.delinqMult * n * trend);
          const enrVal = +(bd.baseENR * amountScale * sub.delinqMult * n * trend).toFixed(2);
          const enrUsd = toUSD(enrVal, sub.currencyCode, FX_MAP);
          const period = PERIODS_12[pi];

          if (!totalAcc[period]) totalAcc[period] = { count: 0, enr: 0, enrUsd: 0 };
          totalAcc[period].count += countVal;
          totalAcc[period].enr += enrVal;
          totalAcc[period].enrUsd += enrUsd ?? 0;

          rows.push({
            subsidiary_id: sub.id, category: cat, product,
            metric: 'Facility in Force (#)', period, value: countVal,
            value_usd: null, data_source_id: sub.dsOffset,
          });
          rows.push({
            subsidiary_id: sub.id, category: cat, product,
            metric: 'ENR', period, value: enrVal,
            value_usd: enrUsd, data_source_id: sub.dsOffset,
          });
        }
      }

      // Emit "Total" product rows per period
      for (const period of PERIODS_12) {
        const acc = totalAcc[period];
        if (!acc) continue;
        rows.push({
          subsidiary_id: sub.id, category: cat, product: 'Total',
          metric: 'Facility in Force (#)', period, value: acc.count,
          value_usd: null, data_source_id: sub.dsOffset,
        });
        rows.push({
          subsidiary_id: sub.id, category: cat, product: 'Total',
          metric: 'ENR', period, value: +acc.enr.toFixed(2),
          value_usd: +acc.enrUsd.toFixed(2), data_source_id: sub.dsOffset,
        });
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

// ---------------------------------------------------------------------------
// 15. trade_asset_quality (IFRS 9 staging per subsidiary)
// ---------------------------------------------------------------------------
function buildTradeAssetQuality(): Row[] {
  const rows: Row[] = [];
  for (const sub of SUBSIDIARIES) {
    const aumUsd = toUSD(sub.aumLocal, sub.currencyCode, FX_MAP);
    // Trade portfolio is roughly 16% of total AUM
    const tradeUsd = aumUsd * 0.16;
    const n = noise(sub.id, 99, 1);

    const stage1Pct = 0.88 + (n - 1) * 0.03;  // ~85-91%
    const stage2Pct = 0.08 + (n - 1) * 0.02;  // ~6-10%
    const stage3Pct = 1 - stage1Pct - stage2Pct;

    const stage1Bal = +(tradeUsd * stage1Pct).toFixed(2);
    const stage2Bal = +(tradeUsd * stage2Pct).toFixed(2);
    const stage3Bal = +(tradeUsd * stage3Pct).toFixed(2);

    const stage1Count = Math.round(40 * n);
    const stage2Count = Math.round(6 * n);
    const stage3Count = Math.round(2 * n);

    const s2s3Pct = +((stage2Bal + stage3Bal) / tradeUsd).toFixed(4);
    const provCov = +(0.6 + Math.random() * 0.3).toFixed(4);
    const rag = s2s3Pct > 0.1 ? 'Red' : s2s3Pct > 0.07 ? 'Amber' : 'Green';

    rows.push({
      subsidiary_id: sub.id,
      stage1_count: stage1Count,
      stage1_balance: stage1Bal,
      stage1_balance_usd: stage1Bal,
      stage2_count: stage2Count,
      stage2_balance: stage2Bal,
      stage2_balance_usd: stage2Bal,
      stage3_count: stage3Count,
      stage3_balance: stage3Bal,
      stage3_balance_usd: stage3Bal,
      stage2_plus3_pct: s2s3Pct,
      provision_coverage: provCov,
      rag_status: rag,
      report_date: '2025-08-15',
      data_source_id: sub.dsOffset,
    });
  }
  return rows;
}

// ---------------------------------------------------------------------------
// 16. trade_entity_performance (per subsidiary)
// ---------------------------------------------------------------------------
function buildTradeEntityPerformance(): Row[] {
  const rows: Row[] = [];
  for (const sub of SUBSIDIARIES) {
    const aumUsd = toUSD(sub.aumLocal, sub.currencyCode, FX_MAP);
    const tradeUsd = aumUsd * 0.16;
    const n = noise(sub.id, 88, 2);

    const approvedLimit = +(tradeUsd * 1.4 * n).toFixed(2);
    const outstanding = +(tradeUsd * n).toFixed(2);
    const headroom = +(approvedLimit - outstanding).toFixed(2);
    const utilization = +(outstanding / approvedLimit).toFixed(4);

    const stage1Bal = +(outstanding * 0.88).toFixed(2);
    const stage2Bal = +(outstanding * 0.08).toFixed(2);
    const stage3Bal = +(outstanding * 0.04).toFixed(2);
    const provisions = +(stage3Bal * 0.6 + stage2Bal * 0.1).toFixed(2);
    const provCov = +(provisions / (stage2Bal + stage3Bal)).toFixed(4);
    const rag = utilization > 0.85 ? 'Red' : utilization > 0.7 ? 'Amber' : 'Green';

    rows.push({
      subsidiary_id: sub.id,
      approved_limit: approvedLimit,
      approved_limit_usd: approvedLimit,
      outstanding,
      outstanding_usd: outstanding,
      headroom,
      utilization,
      stage1_balance: stage1Bal,
      stage1_balance_usd: stage1Bal,
      stage2_balance: stage2Bal,
      stage2_balance_usd: stage2Bal,
      stage3_balance: stage3Bal,
      stage3_balance_usd: stage3Bal,
      provisions,
      provisions_usd: provisions,
      provision_coverage: provCov,
      rag_status: rag,
      report_date: '2025-08-15',
      data_source_id: sub.dsOffset,
    });
  }
  return rows;
}

// ---------------------------------------------------------------------------
// 17. trade_product_mix (product types per subsidiary)
// ---------------------------------------------------------------------------
const TRADE_PRODUCTS = [
  { type: 'Import LC', limitMM: 12, outMM: 8, tenor: 180, share: 0.22 },
  { type: 'Export LC', limitMM: 10, outMM: 6.5, tenor: 120, share: 0.18 },
  { type: 'Bank Guarantee (Perf)', limitMM: 8, outMM: 5, tenor: 365, share: 0.14 },
  { type: 'Bank Guarantee (Fin)', limitMM: 6, outMM: 4.2, tenor: 270, share: 0.12 },
  { type: 'SBLC', limitMM: 5, outMM: 3.5, tenor: 365, share: 0.10 },
  { type: 'Trade Loan (Pre-Export)', limitMM: 7, outMM: 5.5, tenor: 90, share: 0.11 },
  { type: 'Trade Loan (Post-Import)', limitMM: 4, outMM: 3, tenor: 60, share: 0.08 },
  { type: 'Forfaiting', limitMM: 2, outMM: 1.2, tenor: 150, share: 0.03 },
  { type: 'Documentary Collection', limitMM: 1.5, outMM: 0.8, tenor: 45, share: 0.02 },
];

function buildTradeProductMix(): Row[] {
  const rows: Row[] = [];
  for (const sub of SUBSIDIARIES) {
    const aumUsd = toUSD(sub.aumLocal, sub.currencyCode, FX_MAP);
    const tradeUsd = aumUsd * 0.16;
    const scale = tradeUsd / 50_000_000; // normalize around 50M

    for (const prod of TRADE_PRODUCTS) {
      const n = noise(sub.id, prod.type.length, 3);
      const limit = +(prod.limitMM * 1_000_000 * scale * n).toFixed(2);
      const outstanding = +(prod.outMM * 1_000_000 * scale * n).toFixed(2);
      const facilities = Math.max(1, Math.round(prod.outMM * 2 * n));
      const util = outstanding > 0 && limit > 0 ? +(outstanding / limit).toFixed(4) : 0;
      const s2s3 = +(0.03 + Math.random() * 0.08).toFixed(4);
      const avgRating = +(2 + Math.random() * 3).toFixed(1);
      const wlCount = Math.random() < 0.15 ? Math.round(1 + Math.random() * 2) : 0;

      rows.push({
        subsidiary_id: sub.id,
        product_type: prod.type,
        facilities,
        facility_limit: limit,
        facility_limit_usd: limit,
        outstanding,
        outstanding_usd: outstanding,
        portfolio_share: prod.share,
        avg_tenor: prod.tenor,
        utilization: util,
        stage2_plus3_pct: s2s3,
        avg_rating: avgRating,
        watchlist_count: wlCount,
        report_date: '2025-08-15',
        data_source_id: sub.dsOffset,
      });
    }
  }
  return rows;
}

// ---------------------------------------------------------------------------
// 18. trade_rating_distribution (rating bands per subsidiary)
// ---------------------------------------------------------------------------
const RATING_BANDS = [
  { band: 'AAA', pct: 0.05, provision: 0.002 },
  { band: 'AA+', pct: 0.08, provision: 0.004 },
  { band: 'AA', pct: 0.12, provision: 0.006 },
  { band: 'A+', pct: 0.15, provision: 0.01 },
  { band: 'A', pct: 0.20, provision: 0.015 },
  { band: 'BBB+', pct: 0.15, provision: 0.03 },
  { band: 'BBB', pct: 0.10, provision: 0.05 },
  { band: 'BB+', pct: 0.07, provision: 0.08 },
  { band: 'BB', pct: 0.04, provision: 0.12 },
  { band: 'B+', pct: 0.02, provision: 0.20 },
  { band: 'B & Below', pct: 0.02, provision: 0.40 },
];

function buildTradeRatingDistribution(): Row[] {
  const rows: Row[] = [];
  for (const sub of SUBSIDIARIES) {
    const aumUsd = toUSD(sub.aumLocal, sub.currencyCode, FX_MAP);
    const tradeUsd = aumUsd * 0.16;
    const totalFacilities = Math.round(60 * noise(sub.id, 42, 2));

    for (const rb of RATING_BANDS) {
      const n = noise(sub.id, rb.band.length, 5);
      const count = Math.max(1, Math.round(totalFacilities * rb.pct * n));
      const balance = +(tradeUsd * rb.pct * n).toFixed(2);

      rows.push({
        subsidiary_id: sub.id,
        rating_band: rb.band,
        count,
        balance,
        balance_usd: balance,
        portfolio_share: +(rb.pct * n).toFixed(4),
        avg_provision: +(rb.provision * n).toFixed(4),
        report_date: '2025-08-15',
        data_source_id: sub.dsOffset,
      });
    }
  }
  return rows;
}

// ---------------------------------------------------------------------------
// 19. trade_concentrations (obligor + sector per subsidiary)
// ---------------------------------------------------------------------------
const TRADE_OBLIGORS = [
  { name: 'Al-Futtaim Group', rating: 'A+', value: 8.5 },
  { name: 'Maersk Line', rating: 'AA', value: 7.2 },
  { name: 'Trafigura', rating: 'A', value: 6.8 },
  { name: 'Emirates Steel', rating: 'BBB+', value: 5.5 },
  { name: 'DP World', rating: 'AA+', value: 5.2 },
  { name: 'Louis Dreyfus', rating: 'A', value: 4.8 },
  { name: 'Cargill Inc.', rating: 'AA', value: 4.5 },
  { name: 'ADNOC Distribution', rating: 'A+', value: 4.0 },
  { name: 'Olam International', rating: 'A', value: 3.5 },
  { name: 'Glencore PLC', rating: 'A+', value: 3.2 },
];

const TRADE_SECTORS = [
  { name: 'Commodities Trading', value: 15 },
  { name: 'Shipping & Logistics', value: 12 },
  { name: 'Oil & Gas', value: 10 },
  { name: 'Steel & Metals', value: 8 },
  { name: 'Agriculture', value: 7 },
  { name: 'Automotive', value: 6 },
  { name: 'Construction', value: 5 },
  { name: 'FMCG', value: 4 },
  { name: 'Chemicals', value: 3 },
  { name: 'Electronics', value: 2.5 },
];

function buildTradeConcentrations(): Row[] {
  const rows: Row[] = [];
  for (const sub of SUBSIDIARIES) {
    const aumUsd = toUSD(sub.aumLocal, sub.currencyCode, FX_MAP);
    const tradeUsd = aumUsd * 0.16;
    const scale = tradeUsd / 60_000_000;

    // Obligor concentrations
    for (const ob of TRADE_OBLIGORS) {
      const n = noise(sub.id, ob.name.length, 7);
      const val = +(ob.value * 1_000_000 * scale * n).toFixed(2);
      const fac = Math.max(1, Math.round(3 * n));
      rows.push({
        subsidiary_id: sub.id,
        name: ob.name,
        category: 'obligor',
        value: val,
        value_usd: val,
        portfolio_share: +(val / tradeUsd).toFixed(4),
        facilities: fac,
        rating: ob.rating,
        report_date: '2025-08-15',
        data_source_id: sub.dsOffset,
      });
    }

    // Sector concentrations
    for (const sec of TRADE_SECTORS) {
      const n = noise(sub.id, sec.name.length, 11);
      const val = +(sec.value * 1_000_000 * scale * n).toFixed(2);
      const fac = Math.max(1, Math.round(5 * n));
      rows.push({
        subsidiary_id: sub.id,
        name: sec.name,
        category: 'sector',
        value: val,
        value_usd: val,
        portfolio_share: +(val / tradeUsd).toFixed(4),
        facilities: fac,
        rating: null,
        report_date: '2025-08-15',
        data_source_id: sub.dsOffset,
      });
    }
  }
  return rows;
}

// ---------------------------------------------------------------------------
// 20. trade_collection_efficiency (per subsidiary)
// ---------------------------------------------------------------------------
function buildTradeCollectionEfficiency(): Row[] {
  const rows: Row[] = [];
  for (const sub of SUBSIDIARIES) {
    const n = noise(sub.id, 77, 4);
    const aumUsd = toUSD(sub.aumLocal, sub.currencyCode, FX_MAP);
    const tradeUsd = aumUsd * 0.16;
    const provOut = +(tradeUsd * 0.04 * n).toFixed(2);

    rows.push({
      subsidiary_id: sub.id,
      collection_efficiency_ratio: +(0.82 + n * 0.12).toFixed(4),
      overdue_ratio: +(0.04 + (1 - n) * 0.06).toFixed(4),
      avg_dpd: Math.round(18 + (1 - n) * 25),
      recovery_rate: +(0.55 + n * 0.3).toFixed(4),
      rollover_rate: +(0.08 + (1 - n) * 0.1).toFixed(4),
      provision_outstanding: provOut,
      provision_outstanding_usd: provOut,
      rag_status: n > 0.85 ? 'Green' : n > 0.65 ? 'Amber' : 'Red',
      report_date: '2025-08-15',
      data_source_id: sub.dsOffset,
    });
  }
  return rows;
}

// ---------------------------------------------------------------------------
// 21. trade_watchlist (flagged facilities per subsidiary)
// ---------------------------------------------------------------------------
const WATCHLIST_OBLIGORS = [
  { name: 'Evergrande Holdings', product: 'Import LC', ews: 4.2 },
  { name: 'Wirecard AG', product: 'Bank Guarantee', ews: 3.8 },
  { name: 'Luckin Coffee', product: 'Trade Loan', ews: 3.5 },
  { name: 'NMC Health', product: 'SBLC', ews: 3.2 },
  { name: 'Abraaj Group', product: 'Export LC', ews: 4.0 },
];

function buildTradeWatchlist(): Row[] {
  const rows: Row[] = [];
  let refCounter = 1000;
  for (const sub of SUBSIDIARIES) {
    const aumUsd = toUSD(sub.aumLocal, sub.currencyCode, FX_MAP);
    const tradeUsd = aumUsd * 0.16;
    const scale = tradeUsd / 60_000_000;

    for (const wl of WATCHLIST_OBLIGORS) {
      refCounter++;
      const n = noise(sub.id, wl.name.length, 13);
      const outstanding = +(wl.ews * 500_000 * scale * n).toFixed(2);
      const dpd = Math.round(30 + wl.ews * 15 * n);
      const stage = wl.ews >= 4 ? 'Stage 3' : wl.ews >= 3 ? 'Stage 2' : 'Stage 1';

      rows.push({
        subsidiary_id: sub.id,
        facility_ref: `TF-${sub.shortCode}-${refCounter}`,
        obligor_name: wl.name,
        product_type: wl.product,
        outstanding,
        outstanding_usd: outstanding,
        dpd,
        ifrs_stage: stage,
        rating: Math.round(wl.ews),
        ews_score: Math.round(wl.ews * n),
        triggers: dpd > 60 ? 'DPD >60, Rating downgrade' : 'EWS score elevated',
        action: dpd > 60 ? 'Escalated to recovery' : 'Enhanced monitoring',
        report_date: '2025-08-15',
        data_source_id: sub.dsOffset,
      });
    }
  }
  return rows;
}

// ---------------------------------------------------------------------------
// 22. corporate_delinquency (customers per subsidiary)
// ---------------------------------------------------------------------------
const CORP_CUSTOMERS = [
  { name: 'Orascom Construction', sector: 'Auto & Auto Components', facility: 'Bank Guarantee', rating: 'A' },
  { name: 'Reliance Industries', sector: 'Textiles', facility: 'Term Loan', rating: 'A' },
  { name: 'Ecopetrol', sector: 'Real Estate', facility: 'Letter of Credit', rating: 'AAA' },
  { name: 'NIS a.d.', sector: 'Metals & Mining', facility: 'Overdraft', rating: 'A' },
  { name: 'Engro Corporation', sector: 'NBFC', facility: 'Cash Credit', rating: 'BBB+' },
  { name: 'CIB Egypt', sector: 'Real Estate', facility: 'Working Capital', rating: 'BBB' },
  { name: 'Lucky Cement', sector: 'Real Estate', facility: 'Project Finance', rating: 'AAA' },
  { name: 'Grupo Aval', sector: 'Auto & Auto Components', facility: 'WCDL', rating: 'AA+' },
  { name: 'Telekom Srbija', sector: 'FMCG', facility: 'Term Loan', rating: 'AA+' },
  { name: 'HDFC Ltd', sector: 'Metals & Mining', facility: 'Cash Credit', rating: 'AA' },
  { name: 'Metalac a.d.', sector: 'Auto & Auto Components', facility: 'WCDL', rating: 'BBB+' },
  { name: 'Hub Power', sector: 'FMCG', facility: 'Cash Credit', rating: 'AA' },
  { name: 'Bajaj Finance', sector: 'NBFC', facility: 'WCDL', rating: 'BBB' },
  { name: 'Emaar Properties', sector: 'Real Estate', facility: 'Term Loan', rating: 'AA+' },
  { name: 'Tata Motors', sector: 'Auto & Auto Components', facility: 'Cash Credit', rating: 'A' },
];

function buildCorporateDelinquency(): Row[] {
  const rows: Row[] = [];
  for (const sub of SUBSIDIARIES) {
    const aumUsd = toUSD(sub.aumLocal, sub.currencyCode, FX_MAP);
    const corpUsd = aumUsd * 0.25; // Corporate ~25% of AUM
    const perCust = corpUsd / CORP_CUSTOMERS.length;

    CORP_CUSTOMERS.forEach((cust, ci) => {
      const n = noise(sub.id, ci, 77);
      const sanctioned = +(perCust * 1.3 * n).toFixed(2);
      const disbursed = +(perCust * 1.1 * n).toFixed(2);
      const pos = +(perCust * n).toFixed(2);
      const dpd = ci < 10 ? 0 : [30, 60, 45, 90, 120][ci - 10] ?? 0;
      const secCover = +(0.8 + n * 0.4).toFixed(2);

      rows.push({
        subsidiary_id: sub.id,
        group_id: `G${sub.id}${(ci + 1).toString().padStart(3, '0')}`,
        cust_id: `C${sub.id}${(ci + 1).toString().padStart(3, '0')}`,
        customer_name: cust.name,
        sector: cust.sector,
        industry: cust.sector,
        sanctioned_limit: sanctioned,
        sanctioned_limit_usd: sanctioned,
        disbursed_amount: disbursed,
        disbursed_amount_usd: disbursed,
        current_pos: pos,
        current_pos_usd: pos,
        facility_type: cust.facility,
        security_type: ci % 3 === 0 ? 'Collateral' : ci % 3 === 1 ? 'Guarantee' : 'Unsecured',
        security_cover: secCover,
        rating_at_disbursement: cust.rating,
        current_rating: cust.rating,
        renewal_done: dpd === 0,
        dpd_at_month_end: dpd,
        current_dpd: dpd,
        reason_for_delinquency: dpd > 0 ? 'Cash flow mismatch' : '',
        last_remedial_action: dpd > 0 ? 'Follow-up initiated' : '',
        update_on_remedial: dpd > 0 ? 'In progress' : '',
        current_status: dpd > 90 ? 'NPA' : dpd > 0 ? 'SMA' : 'Standard',
        next_step: dpd > 0 ? 'Restructuring review' : '',
        report_date: '2025-08-15',
        data_source_id: sub.dsOffset,
      });
    });
  }
  return rows;
}

// ---------------------------------------------------------------------------
// 18. corporate_portfolio_metrics (period-based KPIs per subsidiary)
// ---------------------------------------------------------------------------
function buildCorporatePortfolioMetrics(): Row[] {
  const rows: Row[] = [];
  const periods = ['Q1 2025', 'Q2 2025', 'Jul 2025', 'Aug 2025'];
  const particulars = [
    'Total Sanctioned Limit',
    'Total Disbursement',
    'Current POS',
    'Fund Based Exposure',
    'Non-Fund Based Exposure',
    'Avg. Yield',
  ];

  for (const sub of SUBSIDIARIES) {
    const aumUsd = toUSD(sub.aumLocal, sub.currencyCode, FX_MAP);
    const corpUsd = aumUsd * 0.25;

    periods.forEach((period, pi) => {
      const growth = 1 + pi * 0.03;
      particulars.forEach((particular) => {
        const n = noise(sub.id, pi, particular.length);
        let total = 0;
        let fundBased = 0;
        let nonFundBased = 0;

        switch (particular) {
          case 'Total Sanctioned Limit': total = corpUsd * 1.4 * growth * n; break;
          case 'Total Disbursement': total = corpUsd * 1.1 * growth * n; break;
          case 'Current POS': total = corpUsd * growth * n; break;
          case 'Fund Based Exposure': total = corpUsd * 0.65 * growth * n; break;
          case 'Non-Fund Based Exposure': total = corpUsd * 0.35 * growth * n; break;
          case 'Avg. Yield': total = +(7.5 + (n - 1) * 2).toFixed(2); break;
        }
        fundBased = particular === 'Avg. Yield' ? 0 : total * 0.65;
        nonFundBased = particular === 'Avg. Yield' ? 0 : total * 0.35;

        rows.push({
          subsidiary_id: sub.id,
          particular,
          period,
          total: +total.toFixed(2),
          total_usd: +total.toFixed(2),
          fund_based: +fundBased.toFixed(2),
          fund_based_usd: +fundBased.toFixed(2),
          non_fund_based: +nonFundBased.toFixed(2),
          non_fund_based_usd: +nonFundBased.toFixed(2),
          report_date: '2025-08-15',
          data_source_id: sub.dsOffset,
        });
      });
    });
  }
  return rows;
}

// ---------------------------------------------------------------------------
// 19. corporate_watchlist (flagged borrowers per subsidiary)
// ---------------------------------------------------------------------------
function buildCorporateWatchlist(): Row[] {
  const rows: Row[] = [];
  const watchlistCustomers = CORP_CUSTOMERS.slice(10); // last 5 customers
  for (const sub of SUBSIDIARIES) {
    const aumUsd = toUSD(sub.aumLocal, sub.currencyCode, FX_MAP);
    const perCust = aumUsd * 0.25 / CORP_CUSTOMERS.length;

    watchlistCustomers.forEach((cust, ci) => {
      const n = noise(sub.id, ci + 10, 33);
      rows.push({
        subsidiary_id: sub.id,
        borrower: cust.name,
        sector: cust.sector,
        exposure: +(perCust * n).toFixed(2),
        exposure_usd: +(perCust * n).toFixed(2),
        ews_trigger_type: ['Financial Stress', 'Rating Downgrade', 'Sector Risk', 'Cash Flow', 'Covenant Breach'][ci % 5],
        internal_rating: cust.rating,
        status: ci % 2 === 0 ? 'Active' : 'Under Review',
        remedial_action: ci % 3 === 0 ? 'Enhanced monitoring' : 'Restructuring review',
        report_date: '2025-08-15',
        data_source_id: sub.dsOffset,
      });
    });
  }
  return rows;
}

// ---------------------------------------------------------------------------
// 20. corporate_covenants (per subsidiary)
// ---------------------------------------------------------------------------
function buildCorporateCovenants(): Row[] {
  const rows: Row[] = [];
  for (const sub of SUBSIDIARIES) {
    const aumUsd = toUSD(sub.aumLocal, sub.currencyCode, FX_MAP);
    const corpUsd = aumUsd * 0.25;
    const perCust = corpUsd / CORP_CUSTOMERS.length;

    CORP_CUSTOMERS.slice(0, 10).forEach((cust, ci) => {
      const n = noise(sub.id, ci, 55);
      const sanctioned = +(perCust * 1.3 * n).toFixed(2);
      const disbursed = +(perCust * 1.1 * n).toFixed(2);
      const pos = +(perCust * n).toFixed(2);
      const npaFlag = ci >= 8;
      const watchlistFlag = ci >= 7;

      rows.push({
        subsidiary_id: sub.id,
        group_id: `G${sub.id}${(ci + 1).toString().padStart(3, '0')}`,
        cust_id: `C${sub.id}${(ci + 1).toString().padStart(3, '0')}`,
        customer_name: cust.name,
        sanctioned_limit: sanctioned,
        sanctioned_limit_usd: sanctioned,
        disbursed_amount: disbursed,
        disbursed_amount_usd: disbursed,
        current_pos: pos,
        current_pos_usd: pos,
        facility_type: cust.facility,
        security_type: ci % 3 === 0 ? 'Collateral' : ci % 3 === 1 ? 'Guarantee' : 'Unsecured',
        security_cover: +(0.8 + n * 0.4).toFixed(2),
        risk_rating: cust.rating,
        covenant_category: ci % 3 === 0 ? 'Financial' : ci % 3 === 1 ? 'Non-Financial' : 'Reporting',
        covenant_type: ci % 3 === 0 ? 'DSCR' : ci % 3 === 1 ? 'Change of Control' : 'Quarterly Reporting',
        covenant_description: ci % 3 === 0 ? 'DSCR > 1.2x' : ci % 3 === 1 ? 'No change of control' : 'Quarterly financial reporting',
        covenant_frequency: ci % 2 === 0 ? 'Quarterly' : 'Annual',
        npa_flag: npaFlag,
        restructured_flag: false,
        watchlist_flag: watchlistFlag,
        writeoff_flag: false,
        report_date: '2025-08-15',
        data_source_id: sub.dsOffset,
      });
    });
  }
  return rows;
}

// ---------------------------------------------------------------------------
// 20b. corporate_industry_concentration (sector breakdown per subsidiary)
// ---------------------------------------------------------------------------
const CORP_SECTORS = [
  'NBFC', 'Infrastructure', 'FMCG', 'Real Estate', 'Pharmaceuticals',
  'IT/Technology', 'Metals & Mining', 'Textiles', 'Auto & Auto Components',
];

function buildCorporateIndustryConcentration(): Row[] {
  const rows: Row[] = [];
  const BASE_SHARES = [0.18, 0.15, 0.13, 0.12, 0.10, 0.09, 0.08, 0.08, 0.07];
  // Must match corporate_portfolio_metrics periods
  const CORP_PERIODS = ['Q1 2025', 'Q2 2025', 'Jul 2025', 'Aug 2025'];

  for (const sub of SUBSIDIARIES) {
    const totalPOS = sub.aumLocal * 0.6; // corporate ~60% of AUM
    for (let pi = 0; pi < CORP_PERIODS.length; pi++) {
      const period = CORP_PERIODS[pi];
      for (let sIdx = 0; sIdx < CORP_SECTORS.length; sIdx++) {
        const sector = CORP_SECTORS[sIdx];
        const n = noise(sub.id, pi, sIdx + 500);
        const share = +(BASE_SHARES[sIdx] * n).toFixed(4);
        const pos = +(totalPOS * share).toFixed(2);
        const posUsd = toUSD(pos, sub.currencyCode, FX_MAP);
        const disbursement = +(pos * noiseRange(0.8, 1.2, sub.id, pi, sIdx)).toFixed(2);
        const disbursementUsd = toUSD(disbursement, sub.currencyCode, FX_MAP);
        const facilityCount = Math.round(noiseRange(3, 25, sub.id, sIdx, pi));
        const irr = +(noiseRange(0.08, 0.18, sub.id, sIdx, pi + 600)).toFixed(4);

        rows.push({
          subsidiary_id: sub.id,
          sector,
          period,
          disbursement,
          disbursement_usd: disbursementUsd,
          pos,
          pos_usd: posUsd,
          portfolio_share: share,
          irr,
          facility_count: facilityCount,
          report_date: '2025-08-15',
        });
      }
    }
  }
  return rows;
}

// =============================================================================
// Risk Outlook Table Builders
// =============================================================================

// ---------------------------------------------------------------------------
// 21. ecl_forecast
// ---------------------------------------------------------------------------
function buildEclForecast(): Row[] {
  const rows: Row[] = [];
  const stages = ['Stage 1', 'Stage 2', 'Stage 3'];
  const scenarios = ['Base', 'Adverse', 'Severe'];
  const quarters = ['Q1 2025', 'Q2 2025', 'Q3 2025', 'Q4 2025'];

  const baseEcl: Record<string, number> = { 'Stage 1': 5_000_000, 'Stage 2': 15_000_000, 'Stage 3': 30_000_000 };
  const scenarioMult: Record<string, number> = { 'Base': 1.0, 'Adverse': 1.5, 'Severe': 2.2 };
  const coverageBase: Record<string, number> = { 'Stage 1': 0.005, 'Stage 2': 0.05, 'Stage 3': 0.45 };

  for (const sub of SUBSIDIARIES) {
    for (let si = 0; si < stages.length; si++) {
      const stage = stages[si];
      for (let sci = 0; sci < scenarios.length; sci++) {
        const scenario = scenarios[sci];
        for (let qi = 0; qi < quarters.length; qi++) {
          const quarter = quarters[qi];
          const n = noise(sub.id, si, sci, qi);
          const eclLocal = +(baseEcl[stage] * scenarioMult[scenario] * n).toFixed(2);
          const eclUsd = toUSD(eclLocal, sub.currencyCode, FX_MAP);
          const coverage = +(coverageBase[stage] * n).toFixed(6);

          rows.push({
            subsidiary_id: sub.id,
            stage,
            scenario,
            quarter,
            ecl_amount: eclLocal,
            ecl_amount_usd: eclUsd,
            coverage_ratio: coverage,
          });
        }
      }
    }
  }
  return rows;
}

// ---------------------------------------------------------------------------
// 22. ecl_waterfall
// ---------------------------------------------------------------------------
function buildEclWaterfall(): Row[] {
  const rows: Row[] = [];
  const drivers = [
    { name: 'Opening ECL', baseAmt: 50_000_000, sign: 1 },
    { name: 'New Originations', baseAmt: 5_000_000, sign: 1 },
    { name: 'Derecognitions', baseAmt: 3_000_000, sign: -1 },
    { name: 'Stage Transfers', baseAmt: 2_000_000, sign: 1 },
    { name: 'PD/LGD Changes', baseAmt: 1_000_000, sign: -1 },
    { name: 'Macro Overlay', baseAmt: 3_000_000, sign: 1 },
    { name: 'Write-offs', baseAmt: 4_000_000, sign: -1 },
  ];

  for (const sub of SUBSIDIARIES) {
    let runningSum = 0;
    const driverRows: Row[] = [];
    for (let di = 0; di < drivers.length; di++) {
      const d = drivers[di];
      const n = noise(sub.id, di, 22);
      const amount = +(d.baseAmt * d.sign * n).toFixed(2);
      runningSum += amount;
      driverRows.push({
        subsidiary_id: sub.id,
        scenario: 'Base',
        driver: d.name,
        amount,
        amount_usd: toUSD(Math.abs(amount), sub.currencyCode, FX_MAP) * (amount < 0 ? -1 : 1),
        sort_order: di + 1,
      });
    }
    // Closing ECL = sum of all above
    const closingUsd = toUSD(Math.abs(runningSum), sub.currencyCode, FX_MAP) * (runningSum < 0 ? -1 : 1);
    driverRows.push({
      subsidiary_id: sub.id,
      scenario: 'Base',
      driver: 'Closing ECL',
      amount: +runningSum.toFixed(2),
      amount_usd: +closingUsd.toFixed(2),
      sort_order: 8,
    });
    rows.push(...driverRows);
  }
  return rows;
}

// ---------------------------------------------------------------------------
// 23. stress_scenario_losses
// ---------------------------------------------------------------------------
function buildStressScenarioLosses(): Row[] {
  const rows: Row[] = [];
  const segments = ['Home Loans', 'Personal Loans', 'Credit Cards', 'Auto Loans', 'SME Lending'];
  const scenarios = ['Base', 'Mild', 'Severe', 'Stagflation'];
  const baseLossRates: Record<string, number> = {
    'Home Loans': 0.005, 'Personal Loans': 0.02, 'Credit Cards': 0.03,
    'Auto Loans': 0.015, 'SME Lending': 0.025,
  };
  const scenarioMult: Record<string, number> = { 'Base': 1.0, 'Mild': 1.8, 'Severe': 3.0, 'Stagflation': 2.5 };

  for (const sub of SUBSIDIARIES) {
    for (let si = 0; si < segments.length; si++) {
      const segment = segments[si];
      for (let sci = 0; sci < scenarios.length; sci++) {
        const scenario = scenarios[sci];
        const n = noise(sub.id, si, sci, 23);
        const exposure = 200_000_000 * n;
        const lossRate = +(baseLossRates[segment] * scenarioMult[scenario]).toFixed(6);
        const lossAmount = +(lossRate * exposure).toFixed(2);
        const lossAmountUsd = toUSD(lossAmount, sub.currencyCode, FX_MAP);

        rows.push({
          subsidiary_id: sub.id,
          segment,
          scenario,
          loss_rate: lossRate,
          loss_amount: lossAmount,
          loss_amount_usd: lossAmountUsd,
        });
      }
    }
  }
  return rows;
}

// ---------------------------------------------------------------------------
// 24. cet1_trajectory
// ---------------------------------------------------------------------------
function buildCET1Trajectory(): Row[] {
  const rows: Row[] = [];
  const scenarios = ['Base', 'Mild', 'Severe', 'Stagflation'];
  const quarters = ['Q1 2025', 'Q2 2025', 'Q3 2025', 'Q4 2025'];
  const dropPerQ: Record<string, number> = { 'Base': 0.0, 'Mild': 0.005, 'Severe': 0.015, 'Stagflation': 0.01 };

  for (const sub of SUBSIDIARIES) {
    const startCET1 = 0.125 * noise(sub.id, 24);
    for (let sci = 0; sci < scenarios.length; sci++) {
      const scenario = scenarios[sci];
      for (let qi = 0; qi < quarters.length; qi++) {
        const quarter = quarters[qi];
        const n = noise(sub.id, sci, qi, 24);
        const baseFluctuation = noiseRange(-0.002, 0.002, sub.id, sci, qi, 241);
        let cet1Ratio: number;
        if (scenario === 'Base') {
          cet1Ratio = startCET1 + baseFluctuation;
        } else {
          cet1Ratio = startCET1 - dropPerQ[scenario] * (qi + 1) + baseFluctuation;
        }
        cet1Ratio = +cet1Ratio.toFixed(6);
        const rwaAmount = +(5_000_000_000 * n).toFixed(2);
        const capitalAmount = +(cet1Ratio * rwaAmount).toFixed(2);

        rows.push({
          subsidiary_id: sub.id,
          scenario,
          quarter,
          cet1_ratio: cet1Ratio,
          rwa_amount: rwaAmount,
          capital_amount: capitalAmount,
        });
      }
    }
  }
  return rows;
}

// ---------------------------------------------------------------------------
// 25. ecl_sensitivity
// ---------------------------------------------------------------------------
function buildEclSensitivity(): Row[] {
  const rows: Row[] = [];
  const factors: { name: string; up: number; down: number }[] = [
    { name: 'Unemployment', up: 12, down: -8 },
    { name: 'GDP Growth', up: -6, down: 9 },
    { name: 'House Prices', up: -15, down: 18 },
    { name: 'Interest Rates', up: 8, down: -5 },
    { name: 'Oil Prices', up: 4, down: -3 },
  ];
  const baseEcl = 50_000_000;

  for (const sub of SUBSIDIARIES) {
    for (let fi = 0; fi < factors.length; fi++) {
      const f = factors[fi];
      for (const direction of ['up', 'down'] as const) {
        const impactPct = direction === 'up' ? f.up : f.down;
        const impactAmount = +(impactPct * baseEcl / 100).toFixed(2);

        rows.push({
          subsidiary_id: sub.id,
          factor: f.name,
          direction,
          ecl_impact_pct: impactPct,
          ecl_impact_amount: impactAmount,
        });
      }
    }
  }
  return rows;
}

// ---------------------------------------------------------------------------
// 26. pd_migration_matrix
// ---------------------------------------------------------------------------
function buildPDMigrationMatrix(): Row[] {
  const rows: Row[] = [];
  const grades = ['AAA', 'AA', 'A', 'BBB', 'BB', 'B', 'CCC', 'D'];

  // Transition matrix: from_grade -> to_grade probabilities
  const matrix: Record<string, Record<string, number>> = {
    'AAA': { 'AAA': 0.92, 'AA': 0.06, 'A': 0.015, 'BBB': 0.003, 'BB': 0.001, 'B': 0.0005, 'CCC': 0.0003, 'D': 0.0002 },
    'AA':  { 'AAA': 0.03, 'AA': 0.88, 'A': 0.07, 'BBB': 0.012, 'BB': 0.005, 'B': 0.002, 'CCC': 0.0007, 'D': 0.0003 },
    'A':   { 'AAA': 0.005, 'AA': 0.03, 'A': 0.89, 'BBB': 0.055, 'BB': 0.012, 'B': 0.005, 'CCC': 0.002, 'D': 0.001 },
    'BBB': { 'AAA': 0.001, 'AA': 0.005, 'A': 0.04, 'BBB': 0.87, 'BB': 0.06, 'B': 0.015, 'CCC': 0.006, 'D': 0.003 },
    'BB':  { 'AAA': 0.0005, 'AA': 0.002, 'A': 0.01, 'BBB': 0.05, 'BB': 0.84, 'B': 0.07, 'CCC': 0.02, 'D': 0.0075 },
    'B':   { 'AAA': 0.0002, 'AA': 0.001, 'A': 0.003, 'BBB': 0.01, 'BB': 0.05, 'B': 0.82, 'CCC': 0.08, 'D': 0.0358 },
    'CCC': { 'AAA': 0.0001, 'AA': 0.0003, 'A': 0.001, 'BBB': 0.003, 'BB': 0.01, 'B': 0.05, 'CCC': 0.73, 'D': 0.2056 },
    'D':   { 'AAA': 0, 'AA': 0, 'A': 0, 'BBB': 0, 'BB': 0, 'B': 0, 'CCC': 0, 'D': 1.0 },
  };

  for (const sub of SUBSIDIARIES) {
    for (const fromGrade of grades) {
      for (const toGrade of grades) {
        const prob = matrix[fromGrade][toGrade];
        const n = noiseRange(0.95, 1.05, sub.id, grades.indexOf(fromGrade), grades.indexOf(toGrade), 26);
        const longRunAvg = +(prob * n).toFixed(6);

        rows.push({
          subsidiary_id: sub.id,
          from_grade: fromGrade,
          to_grade: toGrade,
          probability: prob,
          long_run_avg: longRunAvg,
        });
      }
    }
  }
  return rows;
}

// ---------------------------------------------------------------------------
// 27. pd_term_structure
// ---------------------------------------------------------------------------
function buildPDTermStructure(): Row[] {
  const rows: Row[] = [];
  const grades = ['AAA', 'AA', 'A', 'BBB', 'BB', 'B', 'CCC'];
  const basePD1Y: Record<string, number> = {
    'AAA': 0.0003, 'AA': 0.0008, 'A': 0.0015, 'BBB': 0.005, 'BB': 0.02, 'B': 0.05, 'CCC': 0.15,
  };

  for (const sub of SUBSIDIARIES) {
    for (let gi = 0; gi < grades.length; gi++) {
      const grade = grades[gi];
      const pd1y = basePD1Y[grade] * noise(sub.id, gi, 27);
      for (let horizon = 1; horizon <= 5; horizon++) {
        // Cumulative PD: 1 - (1 - PD_1Y)^N
        const cumulativePd = +(1 - Math.pow(1 - pd1y, horizon)).toFixed(6);

        rows.push({
          subsidiary_id: sub.id,
          rating_grade: grade,
          horizon_years: horizon,
          cumulative_pd: cumulativePd,
        });
      }
    }
  }
  return rows;
}

// ---------------------------------------------------------------------------
// 28. rating_distribution
// ---------------------------------------------------------------------------
function buildRatingDistribution(): Row[] {
  const rows: Row[] = [];
  const grades = ['AAA', 'AA', 'A', 'BBB', 'BB', 'B', 'CCC', 'D'];
  const currentShares: Record<string, number> = {
    'AAA': 0.05, 'AA': 0.10, 'A': 0.20, 'BBB': 0.30,
    'BB': 0.20, 'B': 0.10, 'CCC': 0.04, 'D': 0.01,
  };
  const projectedShares: Record<string, number> = {
    'AAA': 0.045, 'AA': 0.095, 'A': 0.19, 'BBB': 0.30,
    'BB': 0.21, 'B': 0.105, 'CCC': 0.042, 'D': 0.013,
  };

  for (const sub of SUBSIDIARIES) {
    for (let gi = 0; gi < grades.length; gi++) {
      const grade = grades[gi];
      const n = noise(sub.id, gi, 28);
      const currentShare = +(currentShares[grade] * n).toFixed(6);
      const projectedShare = +(projectedShares[grade] * n).toFixed(6);

      rows.push({
        subsidiary_id: sub.id,
        rating_grade: grade,
        current_share: currentShare,
        projected_share: projectedShare,
        projection_quarter: 'Q4 2025',
      });
    }
  }
  return rows;
}

// ---------------------------------------------------------------------------
// 29. vintage_forecast
// ---------------------------------------------------------------------------
function buildVintageForecast(): Row[] {
  const rows: Row[] = [];
  const vintages = ['2022-Q1', '2022-Q3', '2023-Q1', '2023-Q3', '2024-Q1'];
  const ultimates: Record<string, number> = {
    '2022-Q1': 0.04, '2022-Q3': 0.035, '2023-Q1': 0.03, '2023-Q3': 0.028, '2024-Q1': 0.025,
  };
  // Actual data cutoff (MOB up to which data is actual)
  const actualCutoff: Record<string, number> = {
    '2022-Q1': 36, '2022-Q3': 36, '2023-Q1': 36, '2023-Q3': 18, '2024-Q1': 12,
  };

  for (const sub of SUBSIDIARIES) {
    for (let vi = 0; vi < vintages.length; vi++) {
      const vintage = vintages[vi];
      const ultimate = ultimates[vintage] * noise(sub.id, vi, 29);
      const cutoff = actualCutoff[vintage];

      for (let mob = 1; mob <= 36; mob++) {
        // S-curve: delinq_rate = ultimate / (1 + exp(-0.15 * (mob - 12)))
        const rate = +(ultimate / (1 + Math.exp(-0.15 * (mob - 12)))).toFixed(6);
        const isProjected = mob > cutoff;

        rows.push({
          subsidiary_id: sub.id,
          vintage,
          mob,
          actual_delinq_rate: isProjected ? null : rate,
          projected_delinq_rate: isProjected ? rate : null,
          is_projected: isProjected,
        });
      }
    }
  }
  return rows;
}

// ---------------------------------------------------------------------------
// 30. roll_rate_forecast
// ---------------------------------------------------------------------------
function buildRollRateForecast(): Row[] {
  const rows: Row[] = [];
  const buckets = ['Current', '1-30', '31-60', '61-90', '91-120', '120+'];

  // Roll forward rates (from -> next bucket)
  const rollForward: Record<string, number> = {
    'Current': 0.03, '1-30': 0.15, '31-60': 0.25, '61-90': 0.30, '91-120': 0.35,
  };
  // Cure rates (from -> previous bucket)
  const cureRates: Record<string, number> = {
    '1-30': 0.60, '31-60': 0.30, '61-90': 0.15, '91-120': 0.08, '120+': 0.03,
  };

  for (const sub of SUBSIDIARIES) {
    for (let month = 1; month <= 3; month++) {
      const deterioration = Math.pow(1.03, month - 1);
      for (let fi = 0; fi < buckets.length; fi++) {
        const fromBucket = buckets[fi];
        for (let ti = 0; ti < buckets.length; ti++) {
          const toBucket = buckets[ti];
          let rate: number | null = null;

          if (fi === ti) {
            // Stay rate: 1 - rollForward - cureRate
            const rf = rollForward[fromBucket] || 0;
            const cr = cureRates[fromBucket] || 0;
            rate = +(Math.max(0, 1 - rf * deterioration - cr / deterioration)).toFixed(6);
          } else if (ti === fi + 1 && rollForward[fromBucket] !== undefined) {
            // Roll forward
            rate = +(rollForward[fromBucket] * deterioration).toFixed(6);
          } else if (ti === fi - 1 && cureRates[fromBucket] !== undefined) {
            // Cure (backward)
            rate = +(cureRates[fromBucket] / deterioration).toFixed(6);
          }

          if (rate !== null) {
            const n = noise(sub.id, fi, ti, month, 30);
            rows.push({
              subsidiary_id: sub.id,
              from_bucket: fromBucket,
              to_bucket: toBucket,
              forecast_month: month,
              transition_rate: +(rate * n).toFixed(6),
            });
          }
        }
      }
    }
  }
  return rows;
}

// ---------------------------------------------------------------------------
// 31. leading_indicators
// ---------------------------------------------------------------------------
function buildLeadingIndicators(): Row[] {
  const rows: Row[] = [];

  interface IndicatorDef {
    name: string;
    baseValue: number;
    baseZ: number;
    trend: string;
    baseRag: string;
    category: string;
  }

  const indicators: IndicatorDef[] = [
    { name: 'Unemployment Rate', baseValue: 6.2, baseZ: 1.5, trend: 'up', baseRag: 'Amber', category: 'macro' },
    { name: 'GDP Growth', baseValue: 2.1, baseZ: -0.8, trend: 'down', baseRag: 'Green', category: 'macro' },
    { name: 'PMI', baseValue: 48.5, baseZ: -1.2, trend: 'down', baseRag: 'Amber', category: 'macro' },
    { name: 'Inflation Rate', baseValue: 5.8, baseZ: 2.1, trend: 'up', baseRag: 'Red', category: 'macro' },
    { name: 'Payment Index', baseValue: 1.15, baseZ: 1.3, trend: 'up', baseRag: 'Amber', category: 'behavioral' },
    { name: 'Migration Velocity', baseValue: 0.08, baseZ: 2.2, trend: 'up', baseRag: 'Red', category: 'behavioral' },
    { name: '30DPD Entry Rate', baseValue: 0.035, baseZ: 0.6, trend: 'stable', baseRag: 'Green', category: 'behavioral' },
    { name: 'Write-off Rate', baseValue: 0.012, baseZ: 1.8, trend: 'up', baseRag: 'Amber', category: 'behavioral' },
  ];

  for (const sub of SUBSIDIARIES) {
    for (let ii = 0; ii < indicators.length; ii++) {
      const ind = indicators[ii];
      const n = noise(sub.id, ii, 31);
      const currentValue = +(ind.baseValue * n).toFixed(4);
      const zScore = +(ind.baseZ * n).toFixed(4);
      const absZ = Math.abs(zScore);
      const ragStatus = absZ >= 2 ? 'Red' : absZ >= 1 ? 'Amber' : 'Green';

      rows.push({
        subsidiary_id: sub.id,
        indicator_name: ind.name,
        current_value: currentValue,
        z_score: zScore,
        trend: ind.trend,
        rag_status: ragStatus,
        category: ind.category,
      });
    }
  }
  return rows;
}

// ---------------------------------------------------------------------------
// 32. macro_credit_linkage
// ---------------------------------------------------------------------------
function buildMacroCreditLinkage(): Row[] {
  const rows: Row[] = [];
  const periods = [
    "Jan'25", "Feb'25", "Mar'25", "Apr'25", "May'25", "Jun'25",
    "Jul'25", "Aug'25", "Sep'25", "Oct'25", "Nov'25", "Dec'25",
  ];

  interface LinkageDef {
    macroVar: string;
    creditMetric: string;
    leadMonths: number;
    macroStart: number;
    macroEnd: number;
    creditStart: number;
    creditEnd: number;
  }

  const linkages: LinkageDef[] = [
    { macroVar: 'Unemployment', creditMetric: '90+ DPD Rate', leadMonths: 4,
      macroStart: 5.5, macroEnd: 7.0, creditStart: 0.015, creditEnd: 0.03 },
    { macroVar: 'GDP Growth', creditMetric: 'Write-off Rate', leadMonths: 6,
      macroStart: 3.0, macroEnd: 1.5, creditStart: 0.008, creditEnd: 0.015 },
    { macroVar: 'PMI', creditMetric: 'Default Rate', leadMonths: 3,
      macroStart: 52, macroEnd: 46, creditStart: 0.005, creditEnd: 0.012 },
  ];

  for (const sub of SUBSIDIARIES) {
    for (let li = 0; li < linkages.length; li++) {
      const link = linkages[li];
      for (let pi = 0; pi < periods.length; pi++) {
        const t = pi / (periods.length - 1); // 0..1 over 12 months
        const n = noise(sub.id, li, pi, 32);
        const macroValue = +(link.macroStart + (link.macroEnd - link.macroStart) * t * n).toFixed(4);
        const creditValue = +(link.creditStart + (link.creditEnd - link.creditStart) * t * n).toFixed(6);

        rows.push({
          subsidiary_id: sub.id,
          macro_variable: link.macroVar,
          credit_metric: link.creditMetric,
          period: periods[pi],
          macro_value: macroValue,
          credit_value: creditValue,
          lead_months: link.leadMonths,
        });
      }
    }
  }
  return rows;
}

// ---------------------------------------------------------------------------
// 33. subsidiary_stress_scores
// ---------------------------------------------------------------------------
function buildSubsidiaryStressScores(): Row[] {
  const rows: Row[] = [];

  interface DimProfile {
    dimension: string;
    scores: Record<number, { score: number; rag: string }>;
    driverSets: Record<number, { label: string; detail: string }[]>;
  }

  const dims: DimProfile[] = [
    {
      dimension: 'macro_outlook',
      scores: {
        1: { score: 72, rag: 'Green' },
        2: { score: 45, rag: 'Amber' },
        3: { score: 68, rag: 'Green' },
        4: { score: 55, rag: 'Amber' },
        5: { score: 38, rag: 'Red' },
      },
      driverSets: {
        1: [
          { label: 'GDP growth above trend', detail: 'Forecast GDP growth of 6.8% exceeds 5-year average of 6.2%' },
          { label: 'Stable policy rates', detail: 'RBI maintaining accommodative stance with repo at 6.5%' },
          { label: 'Resilient consumption', detail: 'Urban and rural consumption indices tracking 4-6% YoY growth' },
        ],
        2: [
          { label: 'Fiscal deficit pressure', detail: 'Government deficit widening to 7.9% of GDP vs 7.0% target' },
          { label: 'Currency depreciation risk', detail: 'PKR under sustained pressure with 12% YTD depreciation' },
        ],
        3: [
          { label: 'EU accession momentum', detail: 'Opening of new EU accession chapters boosting FDI inflows by 15%' },
          { label: 'Moderate inflation', detail: 'CPI easing to 4.2% within NBS target band' },
        ],
        4: [
          { label: 'Commodity price volatility', detail: 'Oil price fluctuations impacting fiscal revenues and COP stability' },
          { label: 'Central bank credibility', detail: 'BanRep maintaining inflation targeting with rates at 9.75%' },
        ],
        5: [
          { label: 'Persistent inflation', detail: 'Core CPI at 32% despite CBE tightening; real rates remain negative' },
          { label: 'FX scarcity', detail: 'Parallel market premium of 18% signaling persistent dollar shortage' },
          { label: 'Import compression', detail: 'Non-essential import restrictions dampening economic activity' },
        ],
      },
    },
    {
      dimension: 'portfolio_vulnerability',
      scores: {
        1: { score: 65, rag: 'Green' },
        2: { score: 58, rag: 'Amber' },
        3: { score: 70, rag: 'Green' },
        4: { score: 48, rag: 'Amber' },
        5: { score: 42, rag: 'Amber' },
      },
      driverSets: {
        1: [
          { label: 'Secured book dominance', detail: '78% of AUM in Home Loan & LAP with average LTV of 62%' },
          { label: 'Granular exposure', detail: 'Top-20 borrower concentration at 8% of total book' },
        ],
        2: [
          { label: 'Unsecured growth acceleration', detail: 'Personal loans and credit cards grew 28% YoY vs 15% plan' },
          { label: 'Vintage seasoning gap', detail: '45% of book originated in last 12 months, not yet fully seasoned' },
        ],
        3: [
          { label: 'Conservative underwriting', detail: 'Average approval DTI of 38% well below 50% policy limit' },
          { label: 'Low single-name concentration', detail: 'Top-10 exposures represent only 5% of portfolio' },
        ],
        4: [
          { label: 'Digital channel risk', detail: '65% of originations via app with limited verification depth' },
          { label: 'Thin credit bureau coverage', detail: '30% of approved customers have bureau scores below 650' },
        ],
        5: [
          { label: 'Sector concentration', detail: '40% of consumer book in government-employee salary deduction segment' },
          { label: 'Collateral valuation risk', detail: 'Real estate collateral values declined 15% in USD terms over 6 months' },
          { label: 'Restructured book', detail: '12% of performing portfolio was restructured in the last 18 months' },
        ],
      },
    },
    {
      dimension: 'collections_effectiveness',
      scores: {
        1: { score: 78, rag: 'Green' },
        2: { score: 52, rag: 'Amber' },
        3: { score: 75, rag: 'Green' },
        4: { score: 60, rag: 'Amber' },
        5: { score: 35, rag: 'Red' },
      },
      driverSets: {
        1: [
          { label: 'Strong early bucket resolution', detail: '85% of 1-30 DPD accounts cured within the bucket' },
          { label: 'Predictive dialer coverage', detail: 'Automated calling covers 98% of early delinquency within 48 hours' },
        ],
        2: [
          { label: 'Agency capacity gap', detail: 'Third-party agency FTE coverage at 60% of required capacity' },
          { label: 'Legal recovery delays', detail: 'Average time to decree execution is 18 months vs 12-month benchmark' },
        ],
        3: [
          { label: 'Digital collections adoption', detail: '55% of payments collected via self-service digital channels' },
          { label: 'Low skip rates', detail: 'Borrower contactability rate at 94% across all buckets' },
        ],
        4: [
          { label: 'Cash economy challenges', detail: '35% of borrowers lack automated debit capability' },
          { label: 'Improving agency performance', detail: 'Agency resolution rates improved from 12% to 18% QoQ' },
          { label: 'Regional coverage gaps', detail: 'Rural portfolio segments show 40% lower contact rates' },
        ],
        5: [
          { label: 'Deteriorating cure rates', detail: '30+ DPD cure rate fell from 42% to 28% over last two quarters' },
          { label: 'Legal system bottlenecks', detail: 'Court case backlog extends average recovery timeline to 24+ months' },
          { label: 'Borrower distress', detail: 'Payment bounce rates increased to 22% from 14% six months ago' },
        ],
      },
    },
    {
      dimension: 'provision_adequacy',
      scores: {
        1: { score: 80, rag: 'Green' },
        2: { score: 55, rag: 'Amber' },
        3: { score: 72, rag: 'Green' },
        4: { score: 62, rag: 'Amber' },
        5: { score: 40, rag: 'Amber' },
      },
      driverSets: {
        1: [
          { label: 'Conservative ECL models', detail: 'Management overlay of 5% applied on top of model-driven ECL' },
          { label: 'Adequate stage migration', detail: 'SICR triggers calibrated to catch downgrades 30 days ahead of default' },
        ],
        2: [
          { label: 'Model recalibration needed', detail: 'PD models last recalibrated 14 months ago; gap to observed default of 120bps' },
          { label: 'Stage 2 build-up', detail: 'Stage 2 ratio increased from 6.5% to 9.2% requiring additional overlay' },
        ],
        3: [
          { label: 'Strong coverage ratios', detail: 'Stage 3 coverage at 72% and Stage 2 at 18% exceeding peer benchmarks' },
          { label: 'Regular model validation', detail: 'Semi-annual back-testing shows model accuracy within 95% CI' },
        ],
        4: [
          { label: 'Thin loss history', detail: 'Digital bank with only 3 years of loss data limits PD model accuracy' },
          { label: 'Moderate coverage', detail: 'Overall provision coverage at 65% with management overlay of 8%' },
        ],
        5: [
          { label: 'FX impact on provisions', detail: 'EGP depreciation inflated USD-equivalent provisions but local coverage at 55%' },
          { label: 'Regulatory gap', detail: 'CBE minimum provision requirements exceed IFRS 9 model output by 30%' },
          { label: 'Stress test shortfall', detail: 'Adverse scenario ECL exceeds current provisions by 18%' },
        ],
      },
    },
    {
      dimension: 'capital_absorption',
      scores: {
        1: { score: 85, rag: 'Green' },
        2: { score: 48, rag: 'Amber' },
        3: { score: 74, rag: 'Green' },
        4: { score: 58, rag: 'Amber' },
        5: { score: 44, rag: 'Amber' },
      },
      driverSets: {
        1: [
          { label: 'Strong capital buffers', detail: 'CET1 ratio at 18.5% with 550bps buffer above regulatory minimum' },
          { label: 'Profitable operations', detail: 'ROE of 16% generating organic capital accretion of 200bps annually' },
        ],
        2: [
          { label: 'Thin capital cushion', detail: 'CAR at 14.2% with only 120bps buffer above SBP minimum of 13%' },
          { label: 'RWA growth pressure', detail: 'Risk-weighted assets growing 22% YoY outpacing capital generation' },
        ],
        3: [
          { label: 'Comfortable capital position', detail: 'CAR at 19.8% well above NBS minimum of 12%' },
          { label: 'Stress test resilience', detail: 'Adverse scenario CET1 depletion of 280bps still leaves 480bps buffer' },
        ],
        4: [
          { label: 'Digital model efficiency', detail: 'Low cost-to-income ratio of 42% supports capital retention' },
          { label: 'Growth vs capital trade-off', detail: 'Rapid portfolio expansion consuming 150bps of capital buffer annually' },
          { label: 'Solvency adequate', detail: 'CAR at 15.8% with 280bps buffer above SFC minimum' },
        ],
        5: [
          { label: 'Capital erosion risk', detail: 'CET1 buffer narrowed to 80bps above FRA minimum of 12.5%' },
          { label: 'Dividend restriction', detail: 'Board approved dividend freeze to preserve capital for next 4 quarters' },
          { label: 'Subordinated debt maturity', detail: 'EGP 1.2B Tier 2 instrument maturing in Q3 2025 needs refinancing' },
        ],
      },
    },
  ];

  for (const dim of dims) {
    for (const sub of SUBSIDIARIES) {
      const profile = dim.scores[sub.id];
      const drivers = dim.driverSets[sub.id];
      rows.push({
        subsidiary_id: sub.id,
        dimension: dim.dimension,
        score: profile.score,
        rag_status: profile.rag,
        drivers: JSON.stringify(drivers),
        updated_at: '2025-08-01T00:00:00Z',
        created_at: '2025-08-01T00:00:00Z',
      });
    }
  }
  return rows;
}

// ---------------------------------------------------------------------------
// 34. management_actions
// ---------------------------------------------------------------------------
function buildManagementActions(): Row[] {
  const rows: Row[] = [];

  interface ActionTemplate {
    trigger_source: string;
    trigger_indicator: string;
    rag_status: string;
    action_category: string;
    action_description: string;
    priority: string;
    owner: string;
    deadline: string;
    status: string;
  }

  const actionsBySubsidiary: Record<number, ActionTemplate[]> = {
    // India (Samman Capital) — fewer, mostly Medium/Low
    1: [
      { trigger_source: 'ews', trigger_indicator: 'Behavioral score decline in unsecured segment > 5%', rag_status: 'Amber', action_category: 'underwriting', action_description: 'Tighten DTI threshold from 55% to 50% for unsecured personal loans', priority: 'Medium', owner: 'Head of Underwriting', deadline: 'Q2 2025', status: 'In Progress' },
      { trigger_source: 'portfolio', trigger_indicator: 'LAP concentration in Tier-3 cities exceeds 25% of book', rag_status: 'Amber', action_category: 'portfolio', action_description: 'Cap Tier-3 city LAP origination at 20% of monthly disbursement volume', priority: 'Medium', owner: 'CRO', deadline: 'Q2 2025', status: 'Open' },
      { trigger_source: 'stress_test', trigger_indicator: 'Stress ECL exceeds base ECL by 45% in adverse scenario', rag_status: 'Amber', action_category: 'provisioning', action_description: 'Apply 5% management overlay on Stage 2 personal loan portfolio', priority: 'Low', owner: 'CFO', deadline: 'Q3 2025', status: 'Open' },
      { trigger_source: 'portfolio', trigger_indicator: 'Home loan prepayment rate declining to 8% from 12%', rag_status: 'Amber', action_category: 'pricing', action_description: 'Review and adjust home loan pricing grid to maintain spread targets', priority: 'Low', owner: 'Head of Risk', deadline: 'Q3 2025', status: 'Open' },
      { trigger_source: 'ews', trigger_indicator: 'Early bucket roll rate increased by 80bps in personal loan vintage Q4-2024', rag_status: 'Amber', action_category: 'collections', action_description: 'Deploy early intervention calls at DPD 5 for personal loan accounts showing behavioral score decline', priority: 'Medium', owner: 'Head of Collections', deadline: 'Q2 2025', status: 'In Progress' },
      { trigger_source: 'portfolio', trigger_indicator: 'Unsecured book growth at 22% vs 15% plan', rag_status: 'Amber', action_category: 'capital', action_description: 'Accelerate retained earnings allocation to maintain CET1 buffer above 500bps', priority: 'Low', owner: 'CFO', deadline: 'Q3 2025', status: 'Open' },
    ],
    // Pakistan (FWBL) — moderate, mix of High/Medium
    2: [
      { trigger_source: 'ews', trigger_indicator: '30+ DPD inflow rate > 3.5% in auto loan segment', rag_status: 'Red', action_category: 'underwriting', action_description: 'Suspend auto loan approvals for applicants with bureau score below 650 and employment tenure < 2 years', priority: 'High', owner: 'Head of Underwriting', deadline: 'Q2 2025', status: 'Open' },
      { trigger_source: 'stress_test', trigger_indicator: 'Adverse scenario NPL ratio projects to 8.5% vs 5.2% current', rag_status: 'Red', action_category: 'provisioning', action_description: 'Apply 15% management overlay on Stage 2 consumer unsecured portfolio', priority: 'High', owner: 'CFO', deadline: 'Q2 2025', status: 'Open' },
      { trigger_source: 'portfolio', trigger_indicator: 'Credit card utilization rate > 85% for 18% of active accounts', rag_status: 'Amber', action_category: 'collections', action_description: 'Initiate proactive outreach to high-utilization credit card customers with payment plan options', priority: 'Medium', owner: 'Head of Collections', deadline: 'Q2 2025', status: 'In Progress' },
      { trigger_source: 'ews', trigger_indicator: 'PKR depreciation impact on import-dependent borrowers', rag_status: 'Red', action_category: 'pricing', action_description: 'Increase risk premium by 75bps for high-risk segments exposed to import dependency', priority: 'High', owner: 'Head of Risk', deadline: 'Q2 2025', status: 'Open' },
      { trigger_source: 'portfolio', trigger_indicator: 'CAR buffer narrowing to 120bps above SBP minimum', rag_status: 'Red', action_category: 'capital', action_description: 'Reduce RWA growth by restricting new unsecured lending and prioritize secured originations', priority: 'Critical', owner: 'CRO', deadline: 'Q2 2025', status: 'Open' },
      { trigger_source: 'stress_test', trigger_indicator: 'Home loan LTV > 80% cohort showing elevated default probability', rag_status: 'Amber', action_category: 'portfolio', action_description: 'Cap high-LTV home loan originations at 15% of monthly volume and require additional collateral', priority: 'Medium', owner: 'CRO', deadline: 'Q3 2025', status: 'Open' },
      { trigger_source: 'ews', trigger_indicator: 'Payment bounce rate increased from 8% to 14% in salary segment', rag_status: 'Amber', action_category: 'collections', action_description: 'Deploy SMS and WhatsApp pre-due-date reminders for salary-linked accounts with prior bounces', priority: 'Medium', owner: 'Head of Collections', deadline: 'Q2 2025', status: 'In Progress' },
    ],
    // Serbia (Mirabank) — fewer, mostly Low/Medium
    3: [
      { trigger_source: 'portfolio', trigger_indicator: 'Housing loan concentration in Belgrade exceeds 60% of housing book', rag_status: 'Amber', action_category: 'portfolio', action_description: 'Diversify housing loan origination to Novi Sad and Nis markets with targeted campaigns', priority: 'Low', owner: 'CRO', deadline: 'Q3 2025', status: 'Open' },
      { trigger_source: 'ews', trigger_indicator: 'Consumer loan early delinquency uptick of 40bps in Q1-2025 vintage', rag_status: 'Amber', action_category: 'underwriting', action_description: 'Add employment verification step for consumer loans above RSD 500K', priority: 'Medium', owner: 'Head of Underwriting', deadline: 'Q2 2025', status: 'In Progress' },
      { trigger_source: 'stress_test', trigger_indicator: 'Interest rate shock scenario shows 15% ECL increase', rag_status: 'Amber', action_category: 'provisioning', action_description: 'Build countercyclical buffer of 3% management overlay on variable-rate consumer book', priority: 'Low', owner: 'CFO', deadline: 'Q3 2025', status: 'Open' },
      { trigger_source: 'portfolio', trigger_indicator: 'Fixed-rate housing loan book repricing gap in 2026', rag_status: 'Amber', action_category: 'pricing', action_description: 'Review fixed-rate housing loan pricing to incorporate forward rate expectations', priority: 'Low', owner: 'Head of Risk', deadline: 'Q3 2025', status: 'Open' },
      { trigger_source: 'ews', trigger_indicator: 'Digital channel personal loan default rate 30bps above branch channel', rag_status: 'Amber', action_category: 'collections', action_description: 'Enhance early-stage collections workflow for digitally originated personal loans with automated triggers', priority: 'Medium', owner: 'Head of Collections', deadline: 'Q2 2025', status: 'Open' },
      { trigger_source: 'portfolio', trigger_indicator: 'Capital ratio comfortable but monitoring RWA density trend', rag_status: 'Amber', action_category: 'capital', action_description: 'Monitor RWA density quarterly and prepare contingency capital plan if buffer drops below 400bps', priority: 'Low', owner: 'CFO', deadline: 'Q3 2025', status: 'Open' },
    ],
    // Colombia (LuloBank) — moderate, mix of High/Medium
    4: [
      { trigger_source: 'ews', trigger_indicator: 'App-originated personal loan 60+ DPD rate exceeds 4.2%', rag_status: 'Red', action_category: 'underwriting', action_description: 'Implement income verification via payroll API for all personal loans above COP 15M', priority: 'High', owner: 'Head of Underwriting', deadline: 'Q2 2025', status: 'Open' },
      { trigger_source: 'portfolio', trigger_indicator: 'Credit card NPL rate trending to 6.8% vs 5.0% appetite', rag_status: 'Red', action_category: 'collections', action_description: 'Deploy early intervention calls at DPD 5 for credit card accounts with utilization > 80%', priority: 'High', owner: 'Head of Collections', deadline: 'Q2 2025', status: 'In Progress' },
      { trigger_source: 'stress_test', trigger_indicator: 'Commodity price shock scenario increases portfolio losses by 35%', rag_status: 'Amber', action_category: 'provisioning', action_description: 'Apply sector-specific management overlay of 10% on borrowers in commodity-linked industries', priority: 'Medium', owner: 'CFO', deadline: 'Q2 2025', status: 'Open' },
      { trigger_source: 'ews', trigger_indicator: 'Customer acquisition cost rising 25% while credit quality declining', rag_status: 'Amber', action_category: 'pricing', action_description: 'Increase risk-adjusted pricing by 50bps for new-to-bank personal loan customers', priority: 'Medium', owner: 'Head of Risk', deadline: 'Q2 2025', status: 'Open' },
      { trigger_source: 'portfolio', trigger_indicator: 'Rapid portfolio growth consuming 150bps capital annually', rag_status: 'Amber', action_category: 'capital', action_description: 'Limit portfolio growth to 8% QoQ and explore Tier 2 issuance of COP 200B', priority: 'High', owner: 'CFO', deadline: 'Q3 2025', status: 'Open' },
      { trigger_source: 'portfolio', trigger_indicator: 'Unsecured lending at 92% of total book', rag_status: 'Red', action_category: 'portfolio', action_description: 'Cap unsecured lending growth at 10% QoQ and pilot secured micro-lending product', priority: 'High', owner: 'CRO', deadline: 'Q2 2025', status: 'Open' },
      { trigger_source: 'ews', trigger_indicator: 'Thin-file customer default rate 2.5x thick-file customers', rag_status: 'Amber', action_category: 'underwriting', action_description: 'Reduce maximum credit limit for thin-file customers from COP 10M to COP 5M until alternative data scoring is validated', priority: 'Medium', owner: 'Head of Underwriting', deadline: 'Q3 2025', status: 'Open' },
    ],
    // Egypt (Beltone) — most Critical/Red actions
    5: [
      { trigger_source: 'ews', trigger_indicator: '30+ DPD inflow rate > 5.8% across consumer book', rag_status: 'Red', action_category: 'underwriting', action_description: 'Suspend all new unsecured consumer loan origination until 30+ DPD inflow drops below 4%', priority: 'Critical', owner: 'CRO', deadline: 'Q2 2025', status: 'Open' },
      { trigger_source: 'stress_test', trigger_indicator: 'FX stress scenario shows provision shortfall of EGP 450M', rag_status: 'Red', action_category: 'provisioning', action_description: 'Apply 15% management overlay on Stage 2 consumer unsecured portfolio and 25% on restructured book', priority: 'Critical', owner: 'CFO', deadline: 'Q2 2025', status: 'In Progress' },
      { trigger_source: 'portfolio', trigger_indicator: 'CET1 buffer at 80bps above FRA minimum', rag_status: 'Red', action_category: 'capital', action_description: 'Implement dividend freeze and accelerate retained earnings allocation; explore EGP 800M rights issue', priority: 'Critical', owner: 'CFO', deadline: 'Q2 2025', status: 'Open' },
      { trigger_source: 'ews', trigger_indicator: 'Cure rates in 30-60 DPD bucket fell from 42% to 28%', rag_status: 'Red', action_category: 'collections', action_description: 'Double field collection team capacity in Cairo and Alexandria; deploy daily SMS + call cadence at DPD 3', priority: 'Critical', owner: 'Head of Collections', deadline: 'Q2 2025', status: 'Open' },
      { trigger_source: 'portfolio', trigger_indicator: 'Leasing portfolio residual values declining 20% in USD terms', rag_status: 'Red', action_category: 'pricing', action_description: 'Increase leasing risk premium by 150bps and require 30% minimum down payment on all new leases', priority: 'High', owner: 'Head of Risk', deadline: 'Q2 2025', status: 'Open' },
      { trigger_source: 'stress_test', trigger_indicator: 'Government salary deduction segment shows systemic concentration risk', rag_status: 'Red', action_category: 'portfolio', action_description: 'Reduce government salary deduction segment to 30% of book from current 40% over next 3 quarters', priority: 'High', owner: 'CRO', deadline: 'Q3 2025', status: 'Open' },
      { trigger_source: 'ews', trigger_indicator: 'Payment bounce rate at 22% and rising', rag_status: 'Red', action_category: 'collections', action_description: 'Migrate all direct debit collections to new clearing system and implement real-time bounce retry within 24 hours', priority: 'High', owner: 'Head of Collections', deadline: 'Q2 2025', status: 'In Progress' },
      { trigger_source: 'portfolio', trigger_indicator: 'Mortgage collateral values depreciating 15% in USD terms', rag_status: 'Amber', action_category: 'underwriting', action_description: 'Reduce maximum mortgage LTV from 80% to 65% and mandate quarterly property revaluation for Stage 2 accounts', priority: 'High', owner: 'Head of Underwriting', deadline: 'Q2 2025', status: 'Open' },
    ],
  };

  for (const sub of SUBSIDIARIES) {
    const actions = actionsBySubsidiary[sub.id] || [];
    for (const a of actions) {
      rows.push({
        subsidiary_id: sub.id,
        trigger_source: a.trigger_source,
        trigger_indicator: a.trigger_indicator,
        rag_status: a.rag_status,
        action_category: a.action_category,
        action_description: a.action_description,
        priority: a.priority,
        owner: a.owner,
        deadline: a.deadline,
        status: a.status,
      });
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

  // product_catalog is always re-seeded (cleared above, may not be covered by dimension block)
  const { count: pcCount } = await supabase.from('product_catalog').select('*', { count: 'exact', head: true });
  if (!pcCount) {
    console.log('Seeding product_catalog (was cleared)...');
    await batchUpsert('product_catalog', buildProductCatalog());
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

  console.log('Seeding trade_asset_quality...');
  await batchInsert('trade_asset_quality', buildTradeAssetQuality());

  console.log('Seeding trade_entity_performance...');
  await batchInsert('trade_entity_performance', buildTradeEntityPerformance());

  console.log('Seeding trade_product_mix...');
  await batchInsert('trade_product_mix', buildTradeProductMix());

  console.log('Seeding trade_rating_distribution...');
  await batchInsert('trade_rating_distribution', buildTradeRatingDistribution());

  console.log('Seeding trade_concentrations...');
  await batchInsert('trade_concentrations', buildTradeConcentrations());

  console.log('Seeding trade_collection_efficiency...');
  await batchInsert('trade_collection_efficiency', buildTradeCollectionEfficiency());

  console.log('Seeding trade_watchlist...');
  await batchInsert('trade_watchlist', buildTradeWatchlist());

  console.log('Seeding corporate_delinquency...');
  await batchInsert('corporate_delinquency', buildCorporateDelinquency());

  console.log('Seeding corporate_portfolio_metrics...');
  await batchInsert('corporate_portfolio_metrics', buildCorporatePortfolioMetrics());

  console.log('Seeding corporate_watchlist...');
  await batchInsert('corporate_watchlist', buildCorporateWatchlist());

  console.log('Seeding corporate_covenants...');
  await batchInsert('corporate_covenants', buildCorporateCovenants());

  console.log('Seeding corporate_industry_concentration...');
  await batchInsert('corporate_industry_concentration', buildCorporateIndustryConcentration());

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

  // -----------------------------------------------------------
  // 3. Risk Outlook tables (12 tables)
  // -----------------------------------------------------------
  console.log('\n--- Risk Outlook Tables ---');

  console.log('Seeding ecl_forecast...');
  await batchInsert('ecl_forecast', buildEclForecast());

  console.log('Seeding ecl_waterfall...');
  await batchInsert('ecl_waterfall', buildEclWaterfall());

  console.log('Seeding stress_scenario_losses...');
  await batchInsert('stress_scenario_losses', buildStressScenarioLosses());

  console.log('Seeding cet1_trajectory...');
  await batchInsert('cet1_trajectory', buildCET1Trajectory());

  console.log('Seeding ecl_sensitivity...');
  await batchInsert('ecl_sensitivity', buildEclSensitivity());

  console.log('Seeding pd_migration_matrix...');
  await batchInsert('pd_migration_matrix', buildPDMigrationMatrix());

  console.log('Seeding pd_term_structure...');
  await batchInsert('pd_term_structure', buildPDTermStructure());

  console.log('Seeding rating_distribution...');
  await batchInsert('rating_distribution', buildRatingDistribution());

  console.log('Seeding vintage_forecast...');
  await batchInsert('vintage_forecast', buildVintageForecast());

  console.log('Seeding roll_rate_forecast...');
  await batchInsert('roll_rate_forecast', buildRollRateForecast());

  console.log('Seeding leading_indicators...');
  await batchInsert('leading_indicators', buildLeadingIndicators());

  console.log('Seeding macro_credit_linkage...');
  await batchInsert('macro_credit_linkage', buildMacroCreditLinkage());

  // -----------------------------------------------------------
  // 4. Forward Outlook tables
  // -----------------------------------------------------------
  console.log('\n--- Forward Outlook Tables ---');

  console.log('Seeding subsidiary_stress_scores...');
  await batchInsert('subsidiary_stress_scores', buildSubsidiaryStressScores());

  console.log('Seeding management_actions...');
  await batchInsert('management_actions', buildManagementActions());

  console.log('\n=== Seeding complete! ===');
}

main().catch((err) => {
  console.error('Seed script failed:', err);
  process.exit(1);
});
