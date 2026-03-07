import { createClient } from '@supabase/supabase-js';

// Load env vars — when running with tsx, read from .env.local
import { config } from 'dotenv';
config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Insert rows in batches to avoid hitting request-size limits */
async function batchInsert(table: string, rows: Record<string, unknown>[], batchSize = 500) {
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
  console.log(`  Seeded ${table}: ${inserted} rows`);
}

/** Clear all 14 tables in the correct order (no FK constraints, but clean slate) */
async function clearAll() {
  const tables = [
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
  ];
  for (const t of tables) {
    const { error } = await supabase.from(t).delete().gte('id', 0);
    if (error) {
      console.error(`  WARN: could not clear ${t}: ${error.message}`);
    }
  }
  console.log('Cleared all tables.\n');
}

// ---------------------------------------------------------------------------
// 1. consumer_overall_metrics
// ---------------------------------------------------------------------------

function buildOverallMetrics() {
  const periods = ["Apr'25", "May'25", "Jun'25", "Jul'25", "Aug'25"];

  interface MetricDef {
    metric_type: string;
    metric: string;
    values: (number | null)[];
    benchmark: number | null;
  }

  const defs: MetricDef[] = [
    // Book Size and Growth
    { metric_type: 'Book Size and Growth', metric: 'Total AUM', values: [285, 292, 298.5, 305, 312], benchmark: null },
    { metric_type: 'Book Size and Growth', metric: 'On-Book AUM', values: [228, 233.6, 238.8, 244, 249.6], benchmark: null },
    { metric_type: 'Book Size and Growth', metric: 'Off-Book AUM', values: [57, 58.4, 59.7, 61, 62.4], benchmark: null },
    { metric_type: 'Book Size and Growth', metric: 'New Bookings', values: [18.5, 20.1, 19.3, 21.2, 22.8], benchmark: null },
    { metric_type: 'Book Size and Growth', metric: 'Life-to-Date Disbursement', values: [1850, 1870.1, 1889.4, 1910.6, 1933.4], benchmark: null },
    { metric_type: 'Book Size and Growth', metric: 'Wt Avg ROI', values: [0.158, 0.156, 0.162, 0.159, 0.161], benchmark: 0.15 },
    { metric_type: 'Book Size and Growth', metric: 'Wt Avg Tenor', values: [42, 42, 43, 42, 43], benchmark: 42 },
    { metric_type: 'Book Size and Growth', metric: 'Average Ticket Size', values: [0.092, 0.095, 0.094, 0.098, 0.097], benchmark: null },

    // Entry Rates
    { metric_type: 'Entry Rates', metric: 'Current BKT Bounce Rate', values: [0.082, 0.078, 0.075, 0.071, 0.069], benchmark: 0.08 },
    { metric_type: 'Entry Rates', metric: 'FPD%', values: [0.038, 0.035, 0.032, 0.031, 0.029], benchmark: 0.035 },
    { metric_type: 'Entry Rates', metric: 'FPD to GCL Trend', values: [0.12, 0.115, 0.11, 0.108, 0.105], benchmark: 0.12 },

    // Portfolio Performance
    { metric_type: 'Portfolio Performance', metric: 'Foreclosure', values: [0.018, 0.017, 0.016, 0.015, 0.014], benchmark: 0.02 },
    { metric_type: 'Portfolio Performance', metric: '30+@3MOB', values: [0.045, 0.042, 0.039, 0.038, 0.036], benchmark: 0.04 },
    { metric_type: 'Portfolio Performance', metric: '90+@4MOB', values: [0.018, 0.017, 0.016, 0.015, 0.014], benchmark: 0.02 },
    { metric_type: 'Portfolio Performance', metric: 'Non-Starter to Gross Loss', values: [0.008, 0.0075, 0.007, 0.0068, 0.0065], benchmark: 0.008 },
    { metric_type: 'Portfolio Performance', metric: 'X+ Amt%', values: [0.085, 0.082, 0.079, 0.076, 0.073], benchmark: 0.08 },
    { metric_type: 'Portfolio Performance', metric: '30+ Amt%', values: [0.062, 0.058, 0.055, 0.052, 0.049], benchmark: 0.06 },
    { metric_type: 'Portfolio Performance', metric: '60+ Amt%', values: [0.038, 0.035, 0.033, 0.031, 0.029], benchmark: 0.035 },
    { metric_type: 'Portfolio Performance', metric: '90+ Amt%', values: [0.022, 0.021, 0.019, 0.018, 0.017], benchmark: 0.02 },
    { metric_type: 'Portfolio Performance', metric: 'Write-offs', values: [1.2, 1.1, 0.95, 0.88, 0.82], benchmark: null },
    { metric_type: 'Portfolio Performance', metric: 'Recoveries', values: [0.45, 0.48, 0.52, 0.55, 0.58], benchmark: null },
    { metric_type: 'Portfolio Performance', metric: 'NCL', values: [0.75, 0.62, 0.43, 0.33, 0.24], benchmark: null },
    { metric_type: 'Portfolio Performance', metric: 'Net Credit Loss', values: [0.0026, 0.0021, 0.0014, 0.0011, 0.0008], benchmark: 0.003 },
  ];

  const rows: Record<string, unknown>[] = [];
  for (const d of defs) {
    for (let i = 0; i < periods.length; i++) {
      rows.push({
        metric_type: d.metric_type,
        metric: d.metric,
        period: periods[i],
        value: d.values[i],
        benchmark: d.benchmark,
      });
    }
  }
  return rows;
}

// ---------------------------------------------------------------------------
// 2. consumer_product_metrics
// ---------------------------------------------------------------------------

function buildProductMetrics() {
  const periods = ["Apr'25", "May'25", "Jun'25", "Jul'25", "Aug'25"];
  const products: { name: string; weight: number; delinqMult: number }[] = [
    { name: 'Consumer Loan', weight: 0.55, delinqMult: 1.0 },
    { name: 'Vehicle Loan', weight: 0.20, delinqMult: 0.85 },
    { name: 'Home Loan', weight: 0.15, delinqMult: 0.65 },
    { name: 'Personal Loan', weight: 0.10, delinqMult: 1.45 },
  ];

  // Overall base values per period (same as table 1)
  const overallBase: Record<string, number[]> = {
    'Total AUM': [285, 292, 298.5, 305, 312],
    'On-Book AUM': [228, 233.6, 238.8, 244, 249.6],
    'Off-Book AUM': [57, 58.4, 59.7, 61, 62.4],
    'New Bookings': [18.5, 20.1, 19.3, 21.2, 22.8],
    'Life-to-Date Disbursement': [1850, 1870.1, 1889.4, 1910.6, 1933.4],
    'Wt Avg ROI': [0.158, 0.156, 0.162, 0.159, 0.161],
    'Wt Avg Tenor': [42, 42, 43, 42, 43],
    'Average Ticket Size': [0.092, 0.095, 0.094, 0.098, 0.097],
    'Current BKT Bounce Rate': [0.082, 0.078, 0.075, 0.071, 0.069],
    'FPD%': [0.038, 0.035, 0.032, 0.031, 0.029],
    'FPD to GCL Trend': [0.12, 0.115, 0.11, 0.108, 0.105],
    'Foreclosure': [0.018, 0.017, 0.016, 0.015, 0.014],
    '30+@3MOB': [0.045, 0.042, 0.039, 0.038, 0.036],
    '90+@4MOB': [0.018, 0.017, 0.016, 0.015, 0.014],
    'Non-Starter to Gross Loss': [0.008, 0.0075, 0.007, 0.0068, 0.0065],
    'X+ Amt%': [0.085, 0.082, 0.079, 0.076, 0.073],
    '30+ Amt%': [0.062, 0.058, 0.055, 0.052, 0.049],
    '60+ Amt%': [0.038, 0.035, 0.033, 0.031, 0.029],
    '90+ Amt%': [0.022, 0.021, 0.019, 0.018, 0.017],
    'Write-offs': [1.2, 1.1, 0.95, 0.88, 0.82],
    'Recoveries': [0.45, 0.48, 0.52, 0.55, 0.58],
    'NCL': [0.75, 0.62, 0.43, 0.33, 0.24],
    'Net Credit Loss': [0.0026, 0.0021, 0.0014, 0.0011, 0.0008],
  };

  const metricTypeMap: Record<string, string> = {
    'Total AUM': 'Book Size and Growth',
    'On-Book AUM': 'Book Size and Growth',
    'Off-Book AUM': 'Book Size and Growth',
    'New Bookings': 'Book Size and Growth',
    'Life-to-Date Disbursement': 'Book Size and Growth',
    'Wt Avg ROI': 'Book Size and Growth',
    'Wt Avg Tenor': 'Book Size and Growth',
    'Average Ticket Size': 'Book Size and Growth',
    'Current BKT Bounce Rate': 'Entry Rates',
    'FPD%': 'Entry Rates',
    'FPD to GCL Trend': 'Entry Rates',
    'Foreclosure': 'Portfolio Performance',
    '30+@3MOB': 'Portfolio Performance',
    '90+@4MOB': 'Portfolio Performance',
    'Non-Starter to Gross Loss': 'Portfolio Performance',
    'X+ Amt%': 'Portfolio Performance',
    '30+ Amt%': 'Portfolio Performance',
    '60+ Amt%': 'Portfolio Performance',
    '90+ Amt%': 'Portfolio Performance',
    'Write-offs': 'Portfolio Performance',
    'Recoveries': 'Portfolio Performance',
    'NCL': 'Portfolio Performance',
    'Net Credit Loss': 'Portfolio Performance',
  };

  const benchmarkMap: Record<string, number | null> = {
    'Total AUM': null, 'On-Book AUM': null, 'Off-Book AUM': null,
    'New Bookings': null, 'Life-to-Date Disbursement': null,
    'Wt Avg ROI': 0.15, 'Wt Avg Tenor': 42, 'Average Ticket Size': null,
    'Current BKT Bounce Rate': 0.08, 'FPD%': 0.035, 'FPD to GCL Trend': 0.12,
    'Foreclosure': 0.02, '30+@3MOB': 0.04, '90+@4MOB': 0.02,
    'Non-Starter to Gross Loss': 0.008, 'X+ Amt%': 0.08, '30+ Amt%': 0.06,
    '60+ Amt%': 0.035, '90+ Amt%': 0.02, 'Write-offs': null,
    'Recoveries': null, 'NCL': null, 'Net Credit Loss': 0.003,
  };

  // Metrics that are absolute dollar amounts — multiply by weight
  const amountMetrics = new Set([
    'Total AUM', 'On-Book AUM', 'Off-Book AUM', 'New Bookings',
    'Life-to-Date Disbursement', 'Write-offs', 'Recoveries', 'NCL',
  ]);

  // Metrics that are rates — multiply by delinqMult
  const rateMetrics = new Set([
    'Current BKT Bounce Rate', 'FPD%', 'FPD to GCL Trend',
    'Foreclosure', '30+@3MOB', '90+@4MOB', 'Non-Starter to Gross Loss',
    'X+ Amt%', '30+ Amt%', '60+ Amt%', '90+ Amt%', 'Net Credit Loss',
  ]);

  // Noise seed for deterministic variation
  function noise(prod: number, metric: number, period: number): number {
    const x = Math.sin(prod * 13.7 + metric * 7.3 + period * 3.1) * 0.5 + 0.5;
    return 0.92 + x * 0.16; // range [0.92, 1.08]
  }

  const metricNames = Object.keys(overallBase);
  const rows: Record<string, unknown>[] = [];

  for (let pi = 0; pi < products.length; pi++) {
    const p = products[pi];
    for (let mi = 0; mi < metricNames.length; mi++) {
      const m = metricNames[mi];
      for (let ti = 0; ti < periods.length; ti++) {
        let v = overallBase[m][ti];
        if (amountMetrics.has(m)) {
          v = +(v * p.weight * noise(pi, mi, ti)).toFixed(4);
        } else if (rateMetrics.has(m)) {
          v = +(v * p.delinqMult * noise(pi, mi, ti)).toFixed(6);
        } else {
          // Wt Avg ROI, Wt Avg Tenor, Average Ticket Size — keep similar with slight noise
          v = +(v * noise(pi, mi, ti)).toFixed(4);
        }
        rows.push({
          product_name: p.name,
          metric_type: metricTypeMap[m],
          metric: m,
          period: periods[ti],
          value: v,
          benchmark: benchmarkMap[m],
        });
      }
    }
  }
  return rows;
}

// ---------------------------------------------------------------------------
// 3. net_flow_rates
// ---------------------------------------------------------------------------

function buildNetFlowRates() {
  const periods = ["Feb'25", "Mar'25", "Apr'25", "May'25", "Jun'25", "Jul'25", "Aug'25"];

  const bucketNames = [
    'AUM (M USD)', 'Current Bkt (M USD)',
    '1-30 DPD', '31-60 DPD', '61-90 DPD', '91-120 DPD',
    '121-150 DPD', '151-180 DPD', '180-210 DPD', '210+ DPD',
    'FWOF (M USD)',
    'B1 Flow', 'B2 Flow', 'B3 Flow', 'B4 Flow', 'B5 Flow', 'B6 Flow',
    'POF%',
  ];

  // Total Active Portfolio base values per period
  const totalBase: Record<string, number[]> = {
    'AUM (M USD)':         [285, 288, 292, 296, 300, 305, 312],
    'Current Bkt (M USD)': [245, 248, 252, 255, 259, 263, 270],
    '1-30 DPD':            [20.5, 20.0, 19.5, 19.2, 18.8, 18.5, 18.2],
    '31-60 DPD':           [10.8, 10.5, 10.2, 9.9, 9.6, 9.3, 9.0],
    '61-90 DPD':           [6.8, 6.6, 6.4, 6.2, 6.0, 5.8, 5.6],
    '91-120 DPD':          [4.4, 4.3, 4.1, 4.0, 3.8, 3.6, 3.5],
    '121-150 DPD':         [2.9, 2.8, 2.7, 2.6, 2.5, 2.4, 2.3],
    '151-180 DPD':         [2.4, 2.3, 2.2, 2.1, 2.0, 1.9, 1.8],
    '180-210 DPD':         [1.4, 1.35, 1.3, 1.25, 1.2, 1.15, 1.1],
    '210+ DPD':            [1.15, 1.1, 1.05, 1.0, 0.95, 0.9, 0.85],
    'FWOF (M USD)':        [0.48, 0.45, 0.42, 0.40, 0.38, 0.35, 0.33],
    'B1 Flow':             [0.34, 0.33, 0.32, 0.31, 0.30, 0.29, 0.28],
    'B2 Flow':             [0.42, 0.41, 0.40, 0.39, 0.38, 0.37, 0.36],
    'B3 Flow':             [0.45, 0.44, 0.43, 0.42, 0.41, 0.40, 0.39],
    'B4 Flow':             [0.49, 0.48, 0.47, 0.46, 0.45, 0.44, 0.43],
    'B5 Flow':             [0.54, 0.53, 0.52, 0.51, 0.50, 0.49, 0.48],
    'B6 Flow':             [0.59, 0.58, 0.57, 0.56, 0.55, 0.54, 0.53],
    'POF%':                [0.024, 0.023, 0.022, 0.021, 0.020, 0.019, 0.018],
  };

  // Amount buckets for secured portfolio (~70% of amounts)
  const amountBuckets = new Set([
    'AUM (M USD)', 'Current Bkt (M USD)',
    '1-30 DPD', '31-60 DPD', '61-90 DPD', '91-120 DPD',
    '121-150 DPD', '151-180 DPD', '180-210 DPD', '210+ DPD',
    'FWOF (M USD)',
  ]);

  // Flow rates for secured are ~80% lower (i.e. multiplied by 0.80)
  const flowBuckets = new Set([
    'B1 Flow', 'B2 Flow', 'B3 Flow', 'B4 Flow', 'B5 Flow', 'B6 Flow', 'POF%',
  ]);

  const rows: Record<string, unknown>[] = [];
  for (let pi = 0; pi < periods.length; pi++) {
    for (const bkt of bucketNames) {
      const totalVal = totalBase[bkt][pi];
      rows.push({ portfolio: 'Total Active Portfolio', bucket: bkt, period: periods[pi], value: totalVal });

      let secVal: number;
      if (amountBuckets.has(bkt)) {
        secVal = +(totalVal * 0.70).toFixed(4);
      } else if (flowBuckets.has(bkt)) {
        secVal = +(totalVal * 0.80).toFixed(4);
      } else {
        secVal = +(totalVal * 0.70).toFixed(4);
      }
      rows.push({ portfolio: 'Total Active Portfolio Secured', bucket: bkt, period: periods[pi], value: secVal });
    }
  }
  return rows;
}

// ---------------------------------------------------------------------------
// 4. roll_rate_series
// ---------------------------------------------------------------------------

function buildRollRateSeries() {
  const periods = ["Feb'25", "Mar'25", "Apr'25", "May'25", "Jun'25", "Jul'25", "Aug'25"];
  const buckets = ['B1', 'B2', 'B3', 'B4', 'B5', 'B6'];
  const metrics = ['Resolution', 'Norm', 'Rollback', 'Stabilized', 'Roll Forward'];

  // Base values per bucket [resolution, norm, rollback, stabilized, rollForward]
  // These are mid-range; we'll add per-period variation
  const baseValues: Record<string, number[]> = {
    B1: [0.71, 0.05, 0.00, 0.03, 0.21],
    B2: [0.18, 0.065, 0.12, 0.04, 0.595],
    B3: [0.10, 0.05, 0.10, 0.03, 0.72],
    B4: [0.065, 0.04, 0.08, 0.025, 0.79],
    B5: [0.045, 0.03, 0.055, 0.02, 0.85],
    B6: [0.03, 0.02, 0.035, 0.015, 0.90],
  };

  function periodNoise(bktIdx: number, metIdx: number, perIdx: number): number {
    // Slight improvement trend (later periods slightly better resolution)
    const trend = perIdx * 0.003 * (metIdx === 0 ? 1 : metIdx === 4 ? -1 : 0);
    const sine = Math.sin(bktIdx * 5.3 + metIdx * 11.7 + perIdx * 2.9) * 0.008;
    return trend + sine;
  }

  const rows: Record<string, unknown>[] = [];
  for (let bi = 0; bi < buckets.length; bi++) {
    for (let mi = 0; mi < metrics.length; mi++) {
      for (let pi = 0; pi < periods.length; pi++) {
        let v = baseValues[buckets[bi]][mi] + periodNoise(bi, mi, pi);
        v = Math.max(0, +v.toFixed(4));
        rows.push({
          bucket: buckets[bi],
          metric: metrics[mi],
          period: periods[pi],
          value: v,
        });
      }
    }
  }
  return rows;
}

// ---------------------------------------------------------------------------
// 5. collection_metrics
// ---------------------------------------------------------------------------

function buildCollectionMetrics() {
  const period = "Aug'25";
  const buckets = ['Current', '1-30', '31-60', '61-90', '91-120', '120+'];

  interface BktData {
    amount: number;
    transitions: number;
    normalized: number;
    roll_backward: number;
    stabilized: number;
    roll_forward: number;
  }

  const totalData: BktData[] = [
    { amount: 262, transitions: 0, normalized: 0, roll_backward: 0, stabilized: 0.92, roll_forward: 0.08 },
    { amount: 19.5, transitions: 5.2, normalized: 0.27, roll_backward: 0.68, stabilized: 0.04, roll_forward: 0.28 },
    { amount: 9.8, transitions: 3.8, normalized: 0.39, roll_backward: 0.18, stabilized: 0.05, roll_forward: 0.62 },
    { amount: 6.2, transitions: 3.1, normalized: 0.50, roll_backward: 0.10, stabilized: 0.04, roll_forward: 0.72 },
    { amount: 4.1, transitions: 2.5, normalized: 0.61, roll_backward: 0.07, stabilized: 0.03, roll_forward: 0.80 },
    { amount: 10.4, transitions: 7.8, normalized: 0.75, roll_backward: 0.03, stabilized: 0.02, roll_forward: 0.90 },
  ];

  const rows: Record<string, unknown>[] = [];

  // Total
  for (let i = 0; i < buckets.length; i++) {
    rows.push({ portfolio: 'Total', bucket: buckets[i], period, ...totalData[i] });
  }

  // Secured (~65% of amounts, better roll_backward)
  for (let i = 0; i < buckets.length; i++) {
    const d = totalData[i];
    rows.push({
      portfolio: 'Secured',
      bucket: buckets[i],
      period,
      amount: +(d.amount * 0.65).toFixed(2),
      transitions: +(d.transitions * 0.65).toFixed(2),
      normalized: +(d.normalized * 0.90).toFixed(4),
      roll_backward: +(d.roll_backward * 1.15).toFixed(4),
      stabilized: d.stabilized,
      roll_forward: +(d.roll_forward * 0.88).toFixed(4),
    });
  }

  // Unsecured = Total - Secured
  for (let i = 0; i < buckets.length; i++) {
    const totalRow = rows[i] as BktData & { portfolio: string; bucket: string; period: string };
    const secRow = rows[buckets.length + i] as BktData & { portfolio: string; bucket: string; period: string };
    rows.push({
      portfolio: 'Unsecured',
      bucket: buckets[i],
      period,
      amount: +(totalRow.amount - secRow.amount).toFixed(2),
      transitions: +(totalRow.transitions - secRow.transitions).toFixed(2),
      normalized: totalRow.transitions > 0
        ? +((totalRow.transitions * totalRow.normalized - secRow.transitions * secRow.normalized) /
            Math.max(0.01, totalRow.transitions - secRow.transitions)).toFixed(4)
        : 0,
      roll_backward: +(totalRow.roll_backward * 0.78).toFixed(4),
      stabilized: totalRow.stabilized,
      roll_forward: +(totalRow.roll_forward * 1.18).toFixed(4),
    });
  }
  return rows;
}

// ---------------------------------------------------------------------------
// 6. vintage_points
// ---------------------------------------------------------------------------

function buildVintagePoints() {
  // 30 vintages: Jan'23 .. Dec'24 (24) + Jan'25 .. Jun'25 (6)
  const vintages: string[] = [];
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  for (let y = 23; y <= 24; y++) {
    for (let m = 0; m < 12; m++) {
      vintages.push(`${monthNames[m]}'${y}`);
    }
  }
  for (let m = 0; m < 6; m++) {
    vintages.push(`${monthNames[m]}'25`);
  }

  const metricTypes = ['X+', '30+', '60+', '90+', 'Gross Loss', 'Recoveries', 'NCL'];

  // Delinquency curve generator
  function delinqCurve30Plus(mob: number): number {
    // S-curve: starts 0, rises to ~0.065 plateau by MOB 12
    if (mob <= 0) return 0;
    const plateau = 0.065;
    const rate = 0.35;
    return plateau * (1 - Math.exp(-rate * mob));
  }

  // Multipliers relative to 30+
  const metricMultipliers: Record<string, number> = {
    'X+': 1.5,
    '30+': 1.0,
    '60+': 0.6,
    '90+': 0.35,
    'Gross Loss': 0.25,
    'Recoveries': 0.08,
    'NCL': 0.17, // Gross Loss - Recoveries = 0.25 - 0.08
  };

  // Vintage quality adjustment: older vintages worse, newer better
  function vintageQuality(vintageIdx: number): number {
    // vintageIdx 0 = Jan'23 (oldest, worst), 29 = Jun'25 (newest, best)
    // Range: 1.15 (worst) to 0.85 (best)
    return 1.15 - (vintageIdx / 29) * 0.30;
  }

  // Loan amount per vintage (M USD)
  function loanAmount(vintageIdx: number): number {
    // Grows over time: ~15M early to ~25M later
    return +(15 + (vintageIdx / 29) * 10 + Math.sin(vintageIdx * 1.7) * 2).toFixed(2);
  }

  const rows: Record<string, unknown>[] = [];
  for (let vi = 0; vi < vintages.length; vi++) {
    const la = loanAmount(vi);
    const quality = vintageQuality(vi);

    for (let mob = 1; mob <= 13; mob++) {
      const base30 = delinqCurve30Plus(mob) * quality;

      for (const mt of metricTypes) {
        let rate = base30 * metricMultipliers[mt];
        // Add small per-vintage-mob noise
        const n = Math.sin(vi * 3.1 + mob * 7.7 + metricTypes.indexOf(mt) * 5.3) * 0.002;
        rate = Math.max(0, +(rate + n).toFixed(6));

        rows.push({
          vintage: vintages[vi],
          portfolio_segment: 'Total',
          loan_amount: la,
          mob,
          delinquency_rate: rate,
          metric_type: mt,
        });
      }
    }
  }
  return rows;
}

// ---------------------------------------------------------------------------
// 7. non_starters
// ---------------------------------------------------------------------------

function buildNonStarters() {
  const periods = ["Apr'25", "May'25", "Jun'25", "Jul'25", "Aug'25"];
  const category = 'Non-Starter 90+';

  interface ProductNS {
    product: string;
    count: number[];
    amount: number[];
    pctOrig: number[];
    avgDPD: number[];
  }

  const data: ProductNS[] = [
    {
      product: 'Consumer Loan',
      count: [58, 55, 52, 48, 45],
      amount: [5.6, 5.2, 4.9, 4.5, 4.2],
      pctOrig: [0.034, 0.032, 0.030, 0.028, 0.026],
      avgDPD: [54, 52, 49, 46, 43],
    },
    {
      product: 'Vehicle Loan',
      count: [21, 20, 18, 17, 15],
      amount: [3.1, 2.9, 2.7, 2.4, 2.2],
      pctOrig: [0.027, 0.026, 0.024, 0.022, 0.021],
      avgDPD: [47, 45, 43, 41, 39],
    },
    {
      product: 'Home Loan',
      count: [7, 7, 6, 6, 5],
      amount: [2.4, 2.3, 2.1, 2.0, 1.9],
      pctOrig: [0.017, 0.016, 0.015, 0.014, 0.013],
      avgDPD: [41, 40, 38, 37, 36],
    },
    {
      product: 'Personal Loan',
      count: [17, 16, 15, 14, 13],
      amount: [1.15, 1.1, 1.0, 0.92, 0.85],
      pctOrig: [0.048, 0.045, 0.042, 0.039, 0.036],
      avgDPD: [63, 60, 57, 54, 50],
    },
  ];

  const metricNames = ['Count', 'Amount', '% of Origination', 'Avg DPD at 3MOB'];

  const rows: Record<string, unknown>[] = [];
  for (const p of data) {
    for (let pi = 0; pi < periods.length; pi++) {
      const vals = [p.count[pi], p.amount[pi], p.pctOrig[pi], p.avgDPD[pi]];
      for (let mi = 0; mi < metricNames.length; mi++) {
        rows.push({
          category,
          product: p.product,
          metric: metricNames[mi],
          period: periods[pi],
          value: vals[mi],
        });
      }
    }
  }
  return rows;
}

// ---------------------------------------------------------------------------
// 8. tdd_pre_disbursal
// ---------------------------------------------------------------------------

function buildTddPreDisbursal() {
  const periods = ["Apr'25", "May'25", "Jun'25", "Jul'25", "Aug'25"];
  const bands = ['<550', '550-600', '600-650', '650-700', '700-750', '750-800', '800+', 'Total'];

  // Base distribution — slight shift toward higher scores over time
  const baseDistributions: number[][] = [
    // Apr, May, Jun, Jul, Aug
    [0.038, 0.035, 0.032, 0.028, 0.025],  // <550
    [0.075, 0.072, 0.068, 0.062, 0.058],  // 550-600
    [0.148, 0.145, 0.140, 0.135, 0.128],  // 600-650
    [0.255, 0.258, 0.262, 0.265, 0.268],  // 650-700
    [0.272, 0.278, 0.282, 0.288, 0.295],  // 700-750
    [0.158, 0.160, 0.163, 0.168, 0.172],  // 750-800
    [0.054, 0.052, 0.053, 0.054, 0.054],  // 800+
    [1.0, 1.0, 1.0, 1.0, 1.0],            // Total
  ];

  const rows: Record<string, unknown>[] = [];
  for (let bi = 0; bi < bands.length; bi++) {
    for (let pi = 0; pi < periods.length; pi++) {
      rows.push({
        metric: bands[bi],
        period: periods[pi],
        value: baseDistributions[bi][pi],
      });
    }
  }
  return rows;
}

// ---------------------------------------------------------------------------
// 9. tdd_post_disbursal
// ---------------------------------------------------------------------------

function buildTddPostDisbursal() {
  const periods = ["Apr'25", "May'25", "Jun'25", "Jul'25", "Aug'25"];
  const bands = ['<550', '550-600', '600-650', '650-700', '700-750', '750-800', '800+', 'Total'];
  const variants = ['Fresh', 'Renewal', 'Topup'];

  // Fresh — similar to pre-disbursal
  const freshDist: number[][] = [
    [0.040, 0.037, 0.034, 0.030, 0.027],
    [0.078, 0.075, 0.070, 0.065, 0.060],
    [0.150, 0.147, 0.142, 0.138, 0.132],
    [0.252, 0.255, 0.260, 0.263, 0.266],
    [0.268, 0.274, 0.280, 0.285, 0.292],
    [0.158, 0.160, 0.162, 0.166, 0.170],
    [0.054, 0.052, 0.052, 0.053, 0.053],
    [1.0, 1.0, 1.0, 1.0, 1.0],
  ];

  // Renewal — skews higher scores (existing borrowers with history)
  const renewalDist: number[][] = [
    [0.018, 0.016, 0.015, 0.013, 0.012],
    [0.042, 0.040, 0.038, 0.035, 0.032],
    [0.098, 0.095, 0.090, 0.085, 0.080],
    [0.235, 0.238, 0.242, 0.245, 0.248],
    [0.318, 0.322, 0.328, 0.335, 0.342],
    [0.218, 0.220, 0.222, 0.225, 0.228],
    [0.071, 0.069, 0.065, 0.062, 0.058],
    [1.0, 1.0, 1.0, 1.0, 1.0],
  ];

  // Topup — slightly better than fresh
  const topupDist: number[][] = [
    [0.032, 0.030, 0.028, 0.025, 0.022],
    [0.065, 0.062, 0.058, 0.054, 0.050],
    [0.135, 0.132, 0.128, 0.124, 0.118],
    [0.258, 0.262, 0.265, 0.268, 0.272],
    [0.285, 0.290, 0.295, 0.300, 0.308],
    [0.170, 0.172, 0.174, 0.177, 0.180],
    [0.055, 0.052, 0.052, 0.052, 0.050],
    [1.0, 1.0, 1.0, 1.0, 1.0],
  ];

  const allDists: Record<string, number[][]> = {
    Fresh: freshDist,
    Renewal: renewalDist,
    Topup: topupDist,
  };

  const rows: Record<string, unknown>[] = [];
  for (const variant of variants) {
    const dist = allDists[variant];
    for (let bi = 0; bi < bands.length; bi++) {
      for (let pi = 0; pi < periods.length; pi++) {
        rows.push({
          variant,
          bureau_bucket: bands[bi],
          period: periods[pi],
          value: dist[bi][pi],
        });
      }
    }
  }
  return rows;
}

// ---------------------------------------------------------------------------
// 10. approved_base
// ---------------------------------------------------------------------------

function buildApprovedBase() {
  // la_band x loan_band with count and amount
  const data: { la_band: string; loan_band: string; count: number; amount: number }[] = [
    // <50K
    { la_band: '<50K', loan_band: 'Consumer Loan', count: 1200, amount: 48 },
    { la_band: '<50K', loan_band: 'Vehicle Loan', count: 150, amount: 6 },
    { la_band: '<50K', loan_band: 'Home Loan', count: 0, amount: 0 },
    { la_band: '<50K', loan_band: 'Personal Loan', count: 800, amount: 32 },

    // 50K-100K
    { la_band: '50K-100K', loan_band: 'Consumer Loan', count: 900, amount: 67.5 },
    { la_band: '50K-100K', loan_band: 'Vehicle Loan', count: 400, amount: 30 },
    { la_band: '50K-100K', loan_band: 'Home Loan', count: 50, amount: 3.75 },
    { la_band: '50K-100K', loan_band: 'Personal Loan', count: 320, amount: 24 },

    // 100K-250K
    { la_band: '100K-250K', loan_band: 'Consumer Loan', count: 600, amount: 90 },
    { la_band: '100K-250K', loan_band: 'Vehicle Loan', count: 350, amount: 52.5 },
    { la_band: '100K-250K', loan_band: 'Home Loan', count: 200, amount: 30 },
    { la_band: '100K-250K', loan_band: 'Personal Loan', count: 120, amount: 18 },

    // 250K-500K
    { la_band: '250K-500K', loan_band: 'Consumer Loan', count: 150, amount: 52.5 },
    { la_band: '250K-500K', loan_band: 'Vehicle Loan', count: 80, amount: 28 },
    { la_band: '250K-500K', loan_band: 'Home Loan', count: 180, amount: 63 },
    { la_band: '250K-500K', loan_band: 'Personal Loan', count: 25, amount: 8.75 },

    // 500K-1M
    { la_band: '500K-1M', loan_band: 'Consumer Loan', count: 40, amount: 28 },
    { la_band: '500K-1M', loan_band: 'Vehicle Loan', count: 15, amount: 10.5 },
    { la_band: '500K-1M', loan_band: 'Home Loan', count: 120, amount: 84 },
    { la_band: '500K-1M', loan_band: 'Personal Loan', count: 5, amount: 3.5 },

    // 1M+
    { la_band: '1M+', loan_band: 'Consumer Loan', count: 10, amount: 15 },
    { la_band: '1M+', loan_band: 'Vehicle Loan', count: 5, amount: 7.5 },
    { la_band: '1M+', loan_band: 'Home Loan', count: 30, amount: 45 },
    { la_band: '1M+', loan_band: 'Personal Loan', count: 2, amount: 3 },
  ];

  return data;
}

// ---------------------------------------------------------------------------
// 11. rejected_base
// ---------------------------------------------------------------------------

function buildRejectedBase() {
  // Rejection rate ~25-35% of approved per product/band
  const data: { loan_type: string; amount_band: string; count: number; amount: number }[] = [
    // Consumer Loan
    { loan_type: 'Consumer Loan', amount_band: '<50K', count: 380, amount: 15.2 },
    { loan_type: 'Consumer Loan', amount_band: '50K-100K', count: 270, amount: 20.3 },
    { loan_type: 'Consumer Loan', amount_band: '100K-250K', count: 185, amount: 27.8 },
    { loan_type: 'Consumer Loan', amount_band: '250K-500K', count: 48, amount: 16.8 },
    { loan_type: 'Consumer Loan', amount_band: '500K+', count: 15, amount: 12.8 },

    // Vehicle Loan
    { loan_type: 'Vehicle Loan', amount_band: '<50K', count: 42, amount: 1.7 },
    { loan_type: 'Vehicle Loan', amount_band: '50K-100K', count: 110, amount: 8.3 },
    { loan_type: 'Vehicle Loan', amount_band: '100K-250K', count: 95, amount: 14.3 },
    { loan_type: 'Vehicle Loan', amount_band: '250K-500K', count: 24, amount: 8.4 },
    { loan_type: 'Vehicle Loan', amount_band: '500K+', count: 6, amount: 5.4 },

    // Home Loan
    { loan_type: 'Home Loan', amount_band: '<50K', count: 0, amount: 0 },
    { loan_type: 'Home Loan', amount_band: '50K-100K', count: 15, amount: 1.1 },
    { loan_type: 'Home Loan', amount_band: '100K-250K', count: 55, amount: 8.3 },
    { loan_type: 'Home Loan', amount_band: '250K-500K', count: 52, amount: 18.2 },
    { loan_type: 'Home Loan', amount_band: '500K+', count: 45, amount: 38.5 },

    // Personal Loan
    { loan_type: 'Personal Loan', amount_band: '<50K', count: 280, amount: 11.2 },
    { loan_type: 'Personal Loan', amount_band: '50K-100K', count: 112, amount: 8.4 },
    { loan_type: 'Personal Loan', amount_band: '100K-250K', count: 38, amount: 5.7 },
    { loan_type: 'Personal Loan', amount_band: '250K-500K', count: 8, amount: 2.8 },
    { loan_type: 'Personal Loan', amount_band: '500K+', count: 2, amount: 1.9 },
  ];

  return data;
}

// ---------------------------------------------------------------------------
// 12. los_metrics
// ---------------------------------------------------------------------------

function buildLosMetrics() {
  const reportDate = '2025-08-15';

  interface LosMetricDef {
    metric: string;
    ftd: number;
    mtd: number;
    lmtd: number;
    lm_full: number;
    target: number | null;
    achievement: number | null;
  }

  const allProductsDefs: LosMetricDef[] = [
    { metric: 'Applications Received', ftd: 52, mtd: 780, lmtd: 745, lm_full: 1520, target: 1600, achievement: 0.4875 },
    { metric: 'Login Count', ftd: 85, mtd: 1275, lmtd: 1210, lm_full: 2480, target: null, achievement: null },
    { metric: 'Sanctions Count', ftd: 38, mtd: 570, lmtd: 535, lm_full: 1100, target: 1150, achievement: 0.4957 },
    { metric: 'Sanctions Amount', ftd: 3.6, mtd: 54.2, lmtd: 50.8, lm_full: 104.5, target: 110, achievement: 0.4927 },
    { metric: 'Disbursements Count', ftd: 32, mtd: 480, lmtd: 458, lm_full: 940, target: 1000, achievement: 0.48 },
    { metric: 'Disbursements Amount', ftd: 3.1, mtd: 46.5, lmtd: 43.8, lm_full: 90.2, target: 95, achievement: 0.4895 },
    { metric: 'Rejections', ftd: 14, mtd: 210, lmtd: 210, lm_full: 420, target: null, achievement: null },
    { metric: 'Avg Ticket Size', ftd: 0.097, mtd: 0.097, lmtd: 0.096, lm_full: 0.096, target: null, achievement: null },
    { metric: 'TAT (days)', ftd: 4.2, mtd: 4.5, lmtd: 4.8, lm_full: 4.6, target: 4.0, achievement: null },
  ];

  const productWeights: { name: string; weight: number }[] = [
    { name: 'Consumer Loan', weight: 0.55 },
    { name: 'Vehicle Loan', weight: 0.20 },
    { name: 'Home Loan', weight: 0.15 },
    { name: 'Personal Loan', weight: 0.10 },
  ];

  // Metrics that should NOT be scaled (they are averages/rates, not volumes)
  const nonVolumeMetrics = new Set(['Avg Ticket Size', 'TAT (days)']);

  const rows: Record<string, unknown>[] = [];

  // All Products
  for (const d of allProductsDefs) {
    const mom_change = d.lmtd !== 0 ? +((d.mtd - d.lmtd) / d.lmtd).toFixed(4) : null;
    rows.push({
      metric: d.metric,
      product: 'All Products',
      ftd: d.ftd,
      mtd: d.mtd,
      lmtd: d.lmtd,
      lm_full: d.lm_full,
      mom_change,
      target: d.target,
      achievement: d.achievement,
      report_date: reportDate,
    });
  }

  // Per product
  for (const pw of productWeights) {
    for (const d of allProductsDefs) {
      let ftd: number, mtd: number, lmtd: number, lm_full: number;
      let target: number | null, achievement: number | null;

      if (nonVolumeMetrics.has(d.metric)) {
        // Slight variation around the same value
        const noiseMult = 0.95 + Math.sin(productWeights.indexOf(pw) * 7 + allProductsDefs.indexOf(d) * 3) * 0.05 + 0.05;
        ftd = +(d.ftd * noiseMult).toFixed(3);
        mtd = +(d.mtd * noiseMult).toFixed(3);
        lmtd = +(d.lmtd * noiseMult).toFixed(3);
        lm_full = +(d.lm_full * noiseMult).toFixed(3);
        target = d.target !== null ? +(d.target * noiseMult).toFixed(3) : null;
        achievement = d.achievement;
      } else {
        const w = pw.weight;
        const n = 0.95 + Math.sin(productWeights.indexOf(pw) * 11 + allProductsDefs.indexOf(d) * 5) * 0.05 + 0.05;
        ftd = +(d.ftd * w * n).toFixed(2);
        mtd = +(d.mtd * w * n).toFixed(2);
        lmtd = +(d.lmtd * w * n).toFixed(2);
        lm_full = +(d.lm_full * w * n).toFixed(2);
        target = d.target !== null ? +(d.target * w * n).toFixed(2) : null;
        achievement = d.achievement;
      }

      const mom_change = lmtd !== 0 ? +((mtd - lmtd) / lmtd).toFixed(4) : null;

      rows.push({
        metric: d.metric,
        product: pw.name,
        ftd,
        mtd,
        lmtd,
        lm_full,
        mom_change,
        target,
        achievement,
        report_date: reportDate,
      });
    }
  }

  return rows;
}

// ---------------------------------------------------------------------------
// 13. los_funnel
// ---------------------------------------------------------------------------

function buildLosFunnel() {
  const reportDate = '2025-08-15';

  interface FunnelDef {
    stage: string;
    ftd: number;
    mtd: number;
    lmtd: number;
    conversion_rate: number;
  }

  const allProducts: FunnelDef[] = [
    { stage: 'Leads', ftd: 120, mtd: 1800, lmtd: 1720, conversion_rate: 1.0 },
    { stage: 'Applications', ftd: 52, mtd: 780, lmtd: 745, conversion_rate: 0.433 },
    { stage: 'Sanctioned', ftd: 38, mtd: 570, lmtd: 535, conversion_rate: 0.731 },
    { stage: 'Disbursed', ftd: 32, mtd: 480, lmtd: 458, conversion_rate: 0.842 },
  ];

  const productWeights: { name: string; weight: number }[] = [
    { name: 'Consumer Loan', weight: 0.55 },
    { name: 'Vehicle Loan', weight: 0.20 },
    { name: 'Home Loan', weight: 0.15 },
    { name: 'Personal Loan', weight: 0.10 },
  ];

  const rows: Record<string, unknown>[] = [];

  // All Products
  for (const s of allProducts) {
    rows.push({
      stage: s.stage,
      product: 'All Products',
      ftd: s.ftd,
      mtd: s.mtd,
      lmtd: s.lmtd,
      conversion_rate: s.conversion_rate,
      report_date: reportDate,
    });
  }

  // Per product
  for (const pw of productWeights) {
    for (const s of allProducts) {
      const n = 0.96 + Math.sin(productWeights.indexOf(pw) * 9 + allProducts.indexOf(s) * 4) * 0.04 + 0.04;
      const w = pw.weight;
      rows.push({
        stage: s.stage,
        product: pw.name,
        ftd: +(s.ftd * w * n).toFixed(0),
        mtd: +(s.mtd * w * n).toFixed(0),
        lmtd: +(s.lmtd * w * n).toFixed(0),
        conversion_rate: +(s.conversion_rate * (0.97 + Math.sin(productWeights.indexOf(pw) * 3) * 0.03 + 0.03)).toFixed(3),
        report_date: reportDate,
      });
    }
  }

  return rows;
}

// ---------------------------------------------------------------------------
// 14. los_daily
// ---------------------------------------------------------------------------

function buildLosDaily() {
  // Dates: 2025-08-01 through 2025-08-15
  const rows: Record<string, unknown>[] = [];

  for (let day = 1; day <= 15; day++) {
    const dateStr = `2025-08-${day.toString().padStart(2, '0')}`;
    const d = new Date(2025, 7, day); // month is 0-indexed
    const dow = d.getDay(); // 0=Sun, 6=Sat
    const isWeekend = dow === 0 || dow === 6;

    let count: number;
    let amount: number;
    let avgTicket: number;

    if (isWeekend) {
      // Lower weekend volumes
      count = +(5 + Math.round(Math.sin(day * 2.3) * 3.5 + 3.5)).valueOf();
      amount = +(0.5 + Math.sin(day * 1.7) * 0.3 + 0.3).toFixed(2);
      avgTicket = count > 0 ? +(amount / count).toFixed(4) : 0;
    } else {
      // Weekday volumes
      count = +(28 + Math.round(Math.sin(day * 1.1) * 5 + 5)).valueOf();
      amount = +(2.7 + Math.sin(day * 0.9) * 0.45 + 0.45).toFixed(2);
      avgTicket = count > 0 ? +(amount / count).toFixed(4) : 0;
    }

    rows.push({
      date: dateStr,
      product: 'All Products',
      count,
      amount,
      avg_ticket_size: avgTicket,
    });
  }

  return rows;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log('=== Lending Portfolio Dashboard — Seed Script ===\n');

  // 0. Clear all existing data
  console.log('Clearing all tables...');
  await clearAll();

  // 1. consumer_overall_metrics
  console.log('Seeding consumer_overall_metrics...');
  await batchInsert('consumer_overall_metrics', buildOverallMetrics());

  // 2. consumer_product_metrics
  console.log('Seeding consumer_product_metrics...');
  await batchInsert('consumer_product_metrics', buildProductMetrics());

  // 3. net_flow_rates
  console.log('Seeding net_flow_rates...');
  await batchInsert('net_flow_rates', buildNetFlowRates());

  // 4. roll_rate_series
  console.log('Seeding roll_rate_series...');
  await batchInsert('roll_rate_series', buildRollRateSeries());

  // 5. collection_metrics
  console.log('Seeding collection_metrics...');
  await batchInsert('collection_metrics', buildCollectionMetrics());

  // 6. vintage_points
  console.log('Seeding vintage_points...');
  await batchInsert('vintage_points', buildVintagePoints());

  // 7. non_starters
  console.log('Seeding non_starters...');
  await batchInsert('non_starters', buildNonStarters());

  // 8. tdd_pre_disbursal
  console.log('Seeding tdd_pre_disbursal...');
  await batchInsert('tdd_pre_disbursal', buildTddPreDisbursal());

  // 9. tdd_post_disbursal
  console.log('Seeding tdd_post_disbursal...');
  await batchInsert('tdd_post_disbursal', buildTddPostDisbursal());

  // 10. approved_base
  console.log('Seeding approved_base...');
  await batchInsert('approved_base', buildApprovedBase());

  // 11. rejected_base
  console.log('Seeding rejected_base...');
  await batchInsert('rejected_base', buildRejectedBase());

  // 12. los_metrics
  console.log('Seeding los_metrics...');
  await batchInsert('los_metrics', buildLosMetrics());

  // 13. los_funnel
  console.log('Seeding los_funnel...');
  await batchInsert('los_funnel', buildLosFunnel());

  // 14. los_daily
  console.log('Seeding los_daily...');
  await batchInsert('los_daily', buildLosDaily());

  console.log('\n=== Seeding complete! ===');
}

main().catch((err) => {
  console.error('Seed script failed:', err);
  process.exit(1);
});
