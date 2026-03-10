import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

// =============================================================================
// Type aliases & helpers (same pattern as seed-trade-corporate.ts)
// =============================================================================
type Row = Record<string, unknown>;

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

function toUSD(localAmount: number, currencyCode: string): number {
  const FX: Record<string, number> = { INR: 0.0119, PKR: 0.0036, RSD: 0.0093, COP: 0.000245, EGP: 0.0203, USD: 1.0 };
  if (currencyCode === 'USD') return localAmount;
  const rate = FX[currencyCode];
  return rate ? +(localAmount * rate).toFixed(2) : localAmount;
}

function noise(...seeds: number[]): number {
  let x = 0;
  for (let i = 0; i < seeds.length; i++) x += seeds[i] * (i * 7.3 + 3.1);
  return 0.92 + (Math.sin(x) * 0.5 + 0.5) * 0.16;
}

function noiseRange(lo: number, hi: number, ...seeds: number[]): number {
  let x = 0;
  for (let i = 0; i < seeds.length; i++) x += seeds[i] * (i * 11.3 + 5.7);
  return lo + (Math.sin(x) * 0.5 + 0.5) * (hi - lo);
}

function pick<T>(arr: T[], seed: number): T {
  const idx = Math.abs(Math.floor(Math.sin(seed * 9.7) * arr.length * 10)) % arr.length;
  return arr[idx];
}

// =============================================================================
// Constants
// =============================================================================
const REPORT_DATE = '2026-03-01';
const PERIODS = ['Jan 2026', 'Feb 2026', 'Mar 2026'];
const STAGES = ['Stage 1', 'Stage 2', 'Stage 3'];
const DPD_BUCKETS = ['Current', '1-30', '31-60', '61-90', '90+'];

interface Sub {
  id: number;
  name: string;
  currencyCode: string;
  aumBase: number; // base AUM in local currency for corporate portfolio sizing
}

const SUBS: Sub[] = [
  { id: 1, name: 'Samman Capital', currencyCode: 'INR', aumBase: 18000000000 },
  { id: 2, name: 'First Woman Bank Limited', currencyCode: 'PKR', aumBase: 35000000000 },
  { id: 3, name: 'Mirabank', currencyCode: 'RSD', aumBase: 6000000000 },
  { id: 4, name: 'LuloBank', currencyCode: 'COP', aumBase: 900000000000 },
  { id: 5, name: 'Beltone', currencyCode: 'EGP', aumBase: 9000000000 },
];

// =============================================================================
// TRADE FINANCE V3 TABLES (3 tables)
// =============================================================================

// -- 1. trade_stage_migration --
function buildTradeStageMigration(): Row[] {
  const rows: Row[] = [];
  // Stage transition matrix based on Excel PQR:
  // S1→S1:69, S1→S2:6, S1→S3:0, S2→S1:2, S2→S2:2, S2→S3:1, S3→S1:0, S3→S2:0, S3→S3:0
  const BASE_MATRIX = [
    { prior: 'Stage 1', current: 'Stage 1', count: 69, balance: 45000000 },
    { prior: 'Stage 1', current: 'Stage 2', count: 6, balance: 3200000 },
    { prior: 'Stage 1', current: 'Stage 3', count: 0, balance: 0 },
    { prior: 'Stage 2', current: 'Stage 1', count: 2, balance: 800000 },
    { prior: 'Stage 2', current: 'Stage 2', count: 2, balance: 1100000 },
    { prior: 'Stage 2', current: 'Stage 3', count: 1, balance: 450000 },
    { prior: 'Stage 3', current: 'Stage 1', count: 0, balance: 0 },
    { prior: 'Stage 3', current: 'Stage 2', count: 0, balance: 0 },
    { prior: 'Stage 3', current: 'Stage 3', count: 0, balance: 0 },
  ];

  SUBS.forEach((sub) => {
    PERIODS.forEach((period, pIdx) => {
      BASE_MATRIX.forEach((m, mIdx) => {
        if (m.count === 0 && m.balance === 0) {
          // Still insert zero rows for completeness
          rows.push({
            subsidiary_id: sub.id,
            period,
            prior_stage: m.prior,
            current_stage: m.current,
            facility_count: 0,
            balance: 0,
            balance_usd: 0,
            report_date: REPORT_DATE,
          });
        } else {
          const n = noise(sub.id, pIdx, mIdx);
          const cnt = Math.max(0, Math.round(m.count * n * (sub.id === 1 ? 1.2 : sub.id === 2 ? 1.0 : 0.7)));
          const bal = +(m.balance * n * (sub.aumBase / 18000000000)).toFixed(2);
          const balUSD = toUSD(bal, sub.currencyCode);
          rows.push({
            subsidiary_id: sub.id,
            period,
            prior_stage: m.prior,
            current_stage: m.current,
            facility_count: cnt,
            balance: bal,
            balance_usd: balUSD,
            report_date: REPORT_DATE,
          });
        }
      });
    });
  });
  return rows;
}

// -- 2. trade_dpd_roll_rates --
function buildTradeDPDRollRates(): Row[] {
  const rows: Row[] = [];
  // Base transition probabilities from Excel PQR:
  // Current→1-30: 6.7%, 1-30→31-60: 25%, 31-60→61-90: 0%, 61-90→90+: 100%
  const TRANSITIONS = [
    { from: 'Current', to: 'Current', pct: 0.933, count: 65, balance: 42000000 },
    { from: 'Current', to: '1-30', pct: 0.067, count: 5, balance: 3100000 },
    { from: '1-30', to: 'Current', pct: 0.50, count: 2, balance: 800000 },
    { from: '1-30', to: '1-30', pct: 0.25, count: 1, balance: 400000 },
    { from: '1-30', to: '31-60', pct: 0.25, count: 1, balance: 500000 },
    { from: '31-60', to: 'Current', pct: 0.50, count: 1, balance: 300000 },
    { from: '31-60', to: '31-60', pct: 0.50, count: 1, balance: 350000 },
    { from: '31-60', to: '61-90', pct: 0.00, count: 0, balance: 0 },
    { from: '61-90', to: '61-90', pct: 0.00, count: 0, balance: 0 },
    { from: '61-90', to: '90+', pct: 1.00, count: 1, balance: 450000 },
    { from: '90+', to: '90+', pct: 1.00, count: 1, balance: 450000 },
  ];

  SUBS.forEach((sub) => {
    PERIODS.forEach((period, pIdx) => {
      TRANSITIONS.forEach((t, tIdx) => {
        const n = noise(sub.id, pIdx, tIdx + 100);
        const cnt = Math.max(0, Math.round(t.count * n * (sub.id <= 2 ? 1.0 : 0.6)));
        const bal = +(t.balance * n * (sub.aumBase / 18000000000)).toFixed(2);
        const balUSD = toUSD(bal, sub.currencyCode);
        const pct = +(t.pct * noise(sub.id, pIdx, tIdx + 200)).toFixed(4);
        rows.push({
          subsidiary_id: sub.id,
          period,
          from_bucket: t.from,
          to_bucket: t.to,
          facility_count: cnt,
          balance: bal,
          balance_usd: balUSD,
          transition_pct: Math.min(pct, 1.0),
          report_date: REPORT_DATE,
        });
      });
    });
  });
  return rows;
}

// -- 3. trade_dpd_aging_by_entity --
function buildTradeDPDAgingByEntity(): Row[] {
  const rows: Row[] = [];
  // Base DPD aging distribution
  const BASE_AGING = [
    { bucket: 'Current', countPct: 0.85, balPct: 0.88 },
    { bucket: '1-30', countPct: 0.08, balPct: 0.06 },
    { bucket: '31-60', countPct: 0.04, balPct: 0.03 },
    { bucket: '61-90', countPct: 0.02, balPct: 0.02 },
    { bucket: '90+', countPct: 0.01, balPct: 0.01 },
  ];

  const FACILITY_COUNTS = [16, 14, 10, 8, 12]; // per subsidiary

  SUBS.forEach((sub, sIdx) => {
    const totalFacilities = FACILITY_COUNTS[sIdx];
    const totalBalance = sub.aumBase * 0.15; // trade is ~15% of AUM

    BASE_AGING.forEach((a, aIdx) => {
      const n = noise(sub.id, aIdx, 300);
      const cnt = Math.max(a.bucket === 'Current' ? 1 : 0, Math.round(totalFacilities * a.countPct * n));
      const bal = +(totalBalance * a.balPct * n).toFixed(2);
      const balUSD = toUSD(bal, sub.currencyCode);
      rows.push({
        subsidiary_id: sub.id,
        dpd_bucket: a.bucket,
        facility_count: cnt,
        balance: bal,
        balance_usd: balUSD,
        report_date: REPORT_DATE,
      });
    });
  });
  return rows;
}

// =============================================================================
// CORPORATE FINANCE V3 TABLES (8 tables)
// =============================================================================

const CORP_SECTORS = [
  'NBFC', 'Infrastructure', 'FMCG', 'Real Estate', 'Pharmaceuticals',
  'IT/Technology', 'Metals & Mining', 'Textiles', 'Auto & Auto Components',
];

const CORP_FACILITY_TYPES = [
  'Term Loan', 'Working Capital', 'WCDL', 'Cash Credit', 'Bank Guarantee',
  'Letter of Credit', 'Overdraft', 'Project Finance',
];

const RATING_BANDS = [
  'AAA', 'AA+', 'AA', 'AA-', 'A+', 'A', 'BBB+', 'BBB', 'BB+', 'BB', 'B', 'C/D', 'Unrated',
];

const COLLATERAL_TYPES = [
  'Commercial Real Estate', 'Residential Property', 'Fixed Deposits',
  'Inventory', 'Receivables', 'Plant & Machinery', 'Securities/Shares',
  'Personal Guarantee', 'Unsecured',
];

const SECURITY_TYPES = ['Hypothecation', 'Mortgage', 'Pledge', 'Corporate Guarantee', 'Personal Guarantee', 'Unsecured'];
const INDUSTRIES = ['Banking', 'Steel', 'Finance', 'Real Estate', 'Pharma', 'IT', 'Mining', 'Textiles', 'Auto', 'FMCG', 'Power', 'Telecom', 'Infrastructure', 'Cement', 'Oil & Gas'];

const COLLATERAL_PARTICULARS: Record<string, string> = {
  'Commercial Real Estate': 'Equitable Mortgage with title deeds',
  'Residential Property': 'Registered Mortgage (First Charge)',
  'Fixed Deposits': 'Cash or CR/Margin Account',
  'Inventory': 'Hypothecation of stock and book debts',
  'Receivables': 'Hypothecation of stock and book debts',
  'Plant & Machinery': 'Hypothecation with Comprehensive Insurance',
  'Securities/Shares': 'Listed shares on recognized exchange',
  'Personal Guarantee': 'Pledge on Central Depository Company [SOV]',
  'Unsecured': 'Clean facility - no collateral',
};

const LTV_BANDS = ['>90%', '70-90%', '50-70%', '<50%'];
const MATURITY_BANDS = ['<=1yr', '1-3yr', '3-5yr', '>5yr'];
const FACILITY_BASES = ['Fund Based', 'Non-Fund Based'];

const CUSTOMER_NAMES: Record<number, string[]> = {
  1: ['Reliance Industries', 'HDFC Ltd', 'Bajaj Finance', 'Tata Steel', 'Infosys',
      'Larsen & Toubro', 'ICICI Home Finance', 'Godrej Properties', 'Sun Pharma', 'HCL Technologies',
      'Mahindra & Mahindra', 'Adani Enterprises', 'JSW Steel', 'Wipro Ltd', 'Cipla Ltd',
      'DLF Ltd', 'Hindalco Industries', 'Raymond Ltd', 'Ultratech Cement', 'Ashok Leyland'],
  2: ['Engro Corporation', 'Lucky Cement', 'Hub Power', 'K-Electric', 'Pakistan Tobacco',
      'Fauji Fertilizer', 'Packages Ltd', 'National Foods', 'Systems Ltd', 'TRG Pakistan',
      'Nishat Mills', 'OGDC', 'PPL', 'Bank Alfalah', 'Meezan Bank',
      'Attock Refinery', 'PTCL', 'Millat Tractors', 'Dawood Hercules', 'Maple Leaf Cement'],
  3: ['NIS a.d.', 'Telekom Srbija', 'Metalac a.d.', 'Tigar Tyres', 'Hemofarm',
      'Delta Holding', 'MPC Holding', 'Gorenje Belgrade', 'Imlek', 'Bambi',
      'EPS', 'Airport Nikola Tesla', 'Srbijagas', 'Zastava Arms', 'Jugoimport',
      'Komercijalna Banka', 'Apatinska Pivara', 'Messer Tehnogas', 'Philip Morris SRB', 'Fiat SRB'],
  4: ['Ecopetrol', 'Grupo Aval', 'Bancolombia', 'ISA', 'Nutresa',
      'Cementos Argos', 'Grupo Sura', 'Avianca', 'Celsia', 'ETB',
      'Pacific Rubiales', 'Promigas', 'Terpel', 'Almacenes Exito', 'Postobón',
      'Corona', 'Alpina', 'Tecnoglass', 'Ruta N', 'Rappi Holdings'],
  5: ['Orascom Construction', 'CIB Egypt', 'Eastern Tobacco', 'Telecom Egypt', 'EDBE',
      'Elsewedy Electric', 'Palm Hills', 'Talaat Moustafa', 'Juhayna', 'Cleopatra Hospital',
      'Heliopolis Housing', 'AMOC', 'Egyptian Iron & Steel', 'Ceramica Cleopatra', 'El Arafa',
      'Ezz Steel', 'MNHD', 'IDH', 'EFG Hermes', 'GB Auto'],
};

// -- 1. corporate_top_customers --
function buildCorporateTopCustomers(): Row[] {
  const rows: Row[] = [];

  SUBS.forEach((sub) => {
    const customers = CUSTOMER_NAMES[sub.id] ?? CUSTOMER_NAMES[1];
    const baseLimit = sub.aumBase * 0.03; // ~3% of AUM per top customer

    // Build rows without ranks first
    const subRows: Row[] = [];
    customers.forEach((name, idx) => {
      const n = noise(sub.id, idx, 400);
      const sector = pick(CORP_SECTORS, sub.id * 100 + idx);
      const facility = pick(CORP_FACILITY_TYPES, sub.id * 200 + idx);
      const sanctioned = +(baseLimit * n * (1 - idx * 0.035)).toFixed(2);
      const disbursed = +(sanctioned * noiseRange(0.6, 0.95, sub.id, idx, 1)).toFixed(2);
      const pos = +(disbursed * noiseRange(0.7, 1.0, sub.id, idx, 2)).toFixed(2);
      const dpd = idx < 15 ? 0 : Math.round(noiseRange(0, 90, sub.id, idx, 3));
      const stage = dpd > 60 ? 'Stage 3' : dpd > 30 ? 'Stage 2' : 'Stage 1';
      const rating = pick(RATING_BANDS.slice(0, 8), sub.id * 300 + idx); // mostly investment grade
      const pceAmount = +(disbursed * noiseRange(0.10, 0.30, sub.id, idx, 450)).toFixed(2);
      const custIrr = +(noiseRange(0.08, 0.22, sub.id, idx, 460)).toFixed(4);
      const secType = pick(SECURITY_TYPES, sub.id * 350 + idx);
      const secCover = +noiseRange(0.8, 2.5, sub.id, idx, 470).toFixed(2);
      const industryVal = pick(INDUSTRIES, sub.id * 360 + idx);

      subRows.push({
        subsidiary_id: sub.id,
        customer_name: name,
        sector,
        sanctioned_limit: sanctioned,
        sanctioned_limit_usd: toUSD(sanctioned, sub.currencyCode),
        disbursed_amount: disbursed,
        disbursed_amount_usd: toUSD(disbursed, sub.currencyCode),
        current_pos: pos,
        current_pos_usd: toUSD(pos, sub.currencyCode),
        facility_type: facility,
        risk_rating: rating,
        dpd,
        ifrs_stage: stage,
        pce_amount: pceAmount,
        pce_amount_usd: toUSD(pceAmount, sub.currencyCode),
        irr: custIrr,
        security_type: secType,
        security_cover: secCover,
        industry: industryVal,
        rank_by_disbursement: 0,
        rank_by_pos: 0,
        report_date: REPORT_DATE,
      });
    });

    // Sort by disbursed desc and assign disbursement rank
    [...subRows]
      .sort((a, b) => (b.disbursed_amount as number) - (a.disbursed_amount as number))
      .forEach((r, i) => { r.rank_by_disbursement = i + 1; });

    // Sort by POS desc and assign POS rank
    [...subRows]
      .sort((a, b) => (b.current_pos as number) - (a.current_pos as number))
      .forEach((r, i) => { r.rank_by_pos = i + 1; });

    rows.push(...subRows);
  });
  return rows;
}

// -- 2. corporate_industry_concentration --
function buildCorporateIndustryConcentration(): Row[] {
  const rows: Row[] = [];
  const BASE_SHARES = [0.18, 0.15, 0.13, 0.12, 0.10, 0.09, 0.08, 0.08, 0.07];

  SUBS.forEach((sub) => {
    const totalPOS = sub.aumBase * 0.6;
    PERIODS.forEach((period, pIdx) => {
      CORP_SECTORS.forEach((sector, sIdx) => {
        const n = noise(sub.id, pIdx, sIdx + 500);
        const share = +(BASE_SHARES[sIdx] * n).toFixed(4);
        const pos = +(totalPOS * share).toFixed(2);
        const disbursement = +(pos * noiseRange(0.8, 1.2, sub.id, pIdx, sIdx)).toFixed(2);
        const facilityCount = Math.round(noiseRange(3, 25, sub.id, sIdx, pIdx));
        const irr = +(noiseRange(0.08, 0.18, sub.id, sIdx, pIdx + 600)).toFixed(4);

        rows.push({
          subsidiary_id: sub.id,
          sector,
          period,
          disbursement,
          disbursement_usd: toUSD(disbursement, sub.currencyCode),
          pos,
          pos_usd: toUSD(pos, sub.currencyCode),
          portfolio_share: share,
          irr,
          facility_count: facilityCount,
          report_date: REPORT_DATE,
        });
      });
    });
  });
  return rows;
}

// -- 3. corporate_collateral_analysis --
function buildCorporateCollateralAnalysis(): Row[] {
  const rows: Row[] = [];
  const BASE_COVERAGE = [1.20, 1.45, 1.80, 0.85, 0.75, 1.10, 0.90, 0.50, 0.00];
  const BASE_COUNTS = [12, 8, 15, 18, 22, 6, 4, 10, 5];

  SUBS.forEach((sub) => {
    const totalExposure = sub.aumBase * 0.6;
    const perType = totalExposure / COLLATERAL_TYPES.length;

    COLLATERAL_TYPES.forEach((cType, cIdx) => {
      const n = noise(sub.id, cIdx, 700);
      const count = Math.round(BASE_COUNTS[cIdx] * n);
      const exposed = +(perType * noiseRange(0.5, 1.5, sub.id, cIdx, 1)).toFixed(2);
      const coverage = +(BASE_COVERAGE[cIdx] * noise(sub.id, cIdx, 800)).toFixed(4);
      const collValue = +(exposed * coverage).toFixed(2);
      const sanctioned = +(exposed * noiseRange(1.1, 1.4, sub.id, cIdx, 750)).toFixed(2);
      const disbursedAmt = +(exposed * noiseRange(0.7, 0.95, sub.id, cIdx, 760)).toFixed(2);
      const principalOs = +(disbursedAmt * noiseRange(0.8, 1.0, sub.id, cIdx, 770)).toFixed(2);
      const totalPrincipal = sub.aumBase * 0.6;
      const princShare = +(principalOs / totalPrincipal).toFixed(4);

      rows.push({
        subsidiary_id: sub.id,
        collateral_type: cType,
        facility_count: count,
        collateral_value: collValue,
        collateral_value_usd: toUSD(collValue, sub.currencyCode),
        exposure_covered: exposed,
        exposure_covered_usd: toUSD(exposed, sub.currencyCode),
        coverage_ratio: coverage,
        sanctioned_amount: sanctioned,
        sanctioned_amount_usd: toUSD(sanctioned, sub.currencyCode),
        disbursed_amount: disbursedAmt,
        disbursed_amount_usd: toUSD(disbursedAmt, sub.currencyCode),
        principal_os: principalOs,
        principal_os_usd: toUSD(principalOs, sub.currencyCode),
        principal_share: princShare,
        particulars: COLLATERAL_PARTICULARS[cType] ?? 'Primary',
        report_date: REPORT_DATE,
      });
    });
  });
  return rows;
}

// -- 4. corporate_ltv_distribution --
function buildCorporateLTVDistribution(): Row[] {
  const rows: Row[] = [];
  const BASE_SHARES = [0.08, 0.22, 0.35, 0.35]; // >90%, 70-90%, 50-70%, <50%
  const BASE_COUNTS = [3, 10, 18, 19];

  SUBS.forEach((sub) => {
    const totalBalance = sub.aumBase * 0.55;

    LTV_BANDS.forEach((band, bIdx) => {
      const n = noise(sub.id, bIdx, 900);
      const share = +(BASE_SHARES[bIdx] * n).toFixed(4);
      const bal = +(totalBalance * share).toFixed(2);
      const count = Math.round(BASE_COUNTS[bIdx] * n);

      rows.push({
        subsidiary_id: sub.id,
        ltv_band: band,
        facility_count: count,
        balance: bal,
        balance_usd: toUSD(bal, sub.currencyCode),
        portfolio_share: share,
        report_date: REPORT_DATE,
      });
    });
  });
  return rows;
}

// -- 5. corporate_maturity_profile --
function buildCorporateMaturityProfile(): Row[] {
  const rows: Row[] = [];
  // Fund Based shares by maturity
  const FUND_SHARES = [0.20, 0.35, 0.30, 0.15];
  // Non-Fund Based shares
  const NONFUND_SHARES = [0.40, 0.35, 0.20, 0.05];

  SUBS.forEach((sub) => {
    const fundTotal = sub.aumBase * 0.40;
    const nonfundTotal = sub.aumBase * 0.20;

    MATURITY_BANDS.forEach((band, bIdx) => {
      FACILITY_BASES.forEach((basis, fIdx) => {
        const n = noise(sub.id, bIdx, fIdx + 1000);
        const shares = fIdx === 0 ? FUND_SHARES : NONFUND_SHARES;
        const total = fIdx === 0 ? fundTotal : nonfundTotal;
        const share = +(shares[bIdx] * n).toFixed(4);
        const bal = +(total * share).toFixed(2);
        const count = Math.round(noiseRange(2, 15, sub.id, bIdx, fIdx));
        const sanctionedAmt = +(bal * noiseRange(1.1, 1.4, sub.id, bIdx, fIdx + 1050)).toFixed(2);
        const disbursedAmt = +(bal * noiseRange(0.85, 1.05, sub.id, bIdx, fIdx + 1060)).toFixed(2);

        rows.push({
          subsidiary_id: sub.id,
          maturity_band: band,
          facility_basis: basis,
          facility_count: count,
          balance: bal,
          balance_usd: toUSD(bal, sub.currencyCode),
          portfolio_share: share,
          sanctioned_amount: sanctionedAmt,
          sanctioned_amount_usd: toUSD(sanctionedAmt, sub.currencyCode),
          disbursed_amount: disbursedAmt,
          disbursed_amount_usd: toUSD(disbursedAmt, sub.currencyCode),
          report_date: REPORT_DATE,
        });
      });
    });
  });
  return rows;
}

// -- 6. corporate_provisioning_ecl --
function buildCorporateProvisioningECL(): Row[] {
  const rows: Row[] = [];
  // PCR by stage: Stage 1 ~1-2%, Stage 2 ~15-25%, Stage 3 ~60-80%
  const STAGE_PCR = [0.015, 0.20, 0.70];
  const STAGE_GROSS_SHARE = [0.82, 0.12, 0.06]; // % of total in each stage

  SUBS.forEach((sub) => {
    const totalGross = sub.aumBase * 0.60;

    PERIODS.forEach((period, pIdx) => {
      STAGES.forEach((stage, sIdx) => {
        const n = noise(sub.id, pIdx, sIdx + 1100);
        const gross = +(totalGross * STAGE_GROSS_SHARE[sIdx] * n).toFixed(2);
        const pcr = +(STAGE_PCR[sIdx] * noise(sub.id, pIdx, sIdx + 1200)).toFixed(4);
        const provision = +(gross * pcr).toFixed(2);

        rows.push({
          subsidiary_id: sub.id,
          period,
          ifrs_stage: stage,
          gross_exposure: gross,
          gross_exposure_usd: toUSD(gross, sub.currencyCode),
          provision_amount: provision,
          provision_amount_usd: toUSD(provision, sub.currencyCode),
          pcr_pct: pcr,
          report_date: REPORT_DATE,
        });
      });
    });
  });
  return rows;
}

// -- 7. corporate_rating_analysis --
function buildCorporateRatingAnalysis(): Row[] {
  const rows: Row[] = [];
  // Distribution: heavily weighted toward investment grade
  const BASE_SHARES = [0.03, 0.05, 0.08, 0.10, 0.14, 0.18, 0.15, 0.10, 0.06, 0.04, 0.03, 0.02, 0.02];

  SUBS.forEach((sub) => {
    const totalPOS = sub.aumBase * 0.55;
    const totalDisb = sub.aumBase * 0.60;

    PERIODS.forEach((period, pIdx) => {
      RATING_BANDS.forEach((band, rIdx) => {
        const n = noise(sub.id, pIdx, rIdx + 1300);
        const share = +(BASE_SHARES[rIdx] * n).toFixed(4);
        const pos = +(totalPOS * share).toFixed(2);
        const disb = +(totalDisb * share * noiseRange(0.9, 1.1, sub.id, pIdx, rIdx)).toFixed(2);
        const count = Math.max(1, Math.round(noiseRange(2, 20, sub.id, rIdx, pIdx)));

        rows.push({
          subsidiary_id: sub.id,
          period,
          rating_band: band,
          disbursement: disb,
          disbursement_usd: toUSD(disb, sub.currencyCode),
          pos,
          pos_usd: toUSD(pos, sub.currencyCode),
          facility_count: count,
          portfolio_share: share,
          report_date: REPORT_DATE,
        });
      });
    });
  });
  return rows;
}

// -- 8. corporate_rating_migration --
function buildCorporateRatingMigration(): Row[] {
  const rows: Row[] = [];
  const DIRECTIONS = ['Upgrade', 'Downgrade', 'Stable'];
  const TRIGGERS_UP = ['Improved financials', 'Revenue growth', 'Debt reduction', 'Sector upgrade'];
  const TRIGGERS_DOWN = ['Revenue decline', 'Covenant breach', 'Liquidity stress', 'Sector headwinds', 'Regulatory action'];
  const TRIGGERS_STABLE = ['Stable outlook', 'No material change'];

  SUBS.forEach((sub) => {
    const customers = CUSTOMER_NAMES[sub.id] ?? CUSTOMER_NAMES[1];
    // 5-10 migrations per subsidiary
    const migCount = Math.round(noiseRange(5, 10, sub.id, 1400));

    for (let i = 0; i < migCount; i++) {
      const customer = customers[i % customers.length];
      const sector = pick(CORP_SECTORS, sub.id * 500 + i);
      const direction = pick(DIRECTIONS, sub.id * 600 + i);
      const priorIdx = Math.round(noiseRange(2, 9, sub.id, i, 1500));
      const prior = RATING_BANDS[priorIdx];
      let currentIdx: number;
      let trigger: string;

      if (direction === 'Upgrade') {
        currentIdx = Math.max(0, priorIdx - Math.round(noiseRange(1, 3, sub.id, i, 1)));
        trigger = pick(TRIGGERS_UP, sub.id * 700 + i);
      } else if (direction === 'Downgrade') {
        currentIdx = Math.min(RATING_BANDS.length - 2, priorIdx + Math.round(noiseRange(1, 3, sub.id, i, 2)));
        trigger = pick(TRIGGERS_DOWN, sub.id * 800 + i);
      } else {
        currentIdx = priorIdx;
        trigger = pick(TRIGGERS_STABLE, sub.id * 900 + i);
      }

      const current = RATING_BANDS[currentIdx];
      const exposure = +(sub.aumBase * 0.01 * noiseRange(0.3, 2.0, sub.id, i, 1600)).toFixed(2);

      rows.push({
        subsidiary_id: sub.id,
        customer_name: customer,
        sector,
        prior_rating: prior,
        current_rating: current,
        migration_direction: direction,
        trigger_reason: trigger,
        exposure,
        exposure_usd: toUSD(exposure, sub.currencyCode),
        migration_date: '2026-02-15',
        report_date: REPORT_DATE,
      });
    }
  });
  return rows;
}

// -- 9. corporate_pd_distribution --
function buildCorporatePDDistribution(): Row[] {
  const rows: Row[] = [];
  const PD_BANDS = ['0.01-2% Fully Covered', '2-5%', '5-10%', '10-20%', '>20%'];
  const BASE_SHARES = [0.35, 0.25, 0.20, 0.12, 0.08];

  SUBS.forEach((sub) => {
    const totalPOS = sub.aumBase * 0.55;
    const totalSanctioned = sub.aumBase * 0.70;
    const totalDisbursed = sub.aumBase * 0.60;

    PD_BANDS.forEach((band, bIdx) => {
      const n = noise(sub.id, bIdx, 1700);
      const share = +(BASE_SHARES[bIdx] * n).toFixed(4);
      const principalOs = +(totalPOS * share).toFixed(2);
      const sanctioned = +(totalSanctioned * share * noiseRange(0.9, 1.1, sub.id, bIdx, 1701)).toFixed(2);
      const disbursed = +(totalDisbursed * share * noiseRange(0.9, 1.1, sub.id, bIdx, 1702)).toFixed(2);

      rows.push({
        subsidiary_id: sub.id,
        pd_band: band,
        sanctioned_amount: sanctioned,
        sanctioned_amount_usd: toUSD(sanctioned, sub.currencyCode),
        disbursed_amount: disbursed,
        disbursed_amount_usd: toUSD(disbursed, sub.currencyCode),
        principal_os: principalOs,
        principal_os_usd: toUSD(principalOs, sub.currencyCode),
        principal_share: share,
        report_date: REPORT_DATE,
      });
    });
  });
  return rows;
}

// -- 10. corporate_pipeline --
function buildCorporatePipeline(): Row[] {
  const rows: Row[] = [];
  const PIPELINE_STAGES = [
    'Stage 1 - Disbursement Planning',
    'Stage 2 - Credit Approval',
    'Stage 3 - Documentation',
  ];

  SUBS.forEach((sub) => {
    const baseGross = sub.aumBase * 0.08;

    PIPELINE_STAGES.forEach((stage, sIdx) => {
      const n = noise(sub.id, sIdx, 1800);
      const grossShare = [0.55, 0.30, 0.15][sIdx];
      const gross = +(baseGross * grossShare * n).toFixed(2);
      const bid = +(gross * noiseRange(0.6, 0.85, sub.id, sIdx, 1801)).toFixed(2);
      const pcr = +(noiseRange(0.01, 0.08, sub.id, sIdx, 1802) * (sIdx + 1)).toFixed(4);

      rows.push({
        subsidiary_id: sub.id,
        stage,
        gross_amount: gross,
        gross_amount_usd: toUSD(gross, sub.currencyCode),
        product_bid: bid,
        product_bid_usd: toUSD(bid, sub.currencyCode),
        pcr_pct: pcr,
        report_date: REPORT_DATE,
      });
    });
  });
  return rows;
}

// =============================================================================
// MAIN
// =============================================================================

async function main() {
  console.log('=== Seeding V3 Enhancement Tables ===\n');

  // --- Trade Finance V3 ---
  console.log('--- Trade Finance V3 (3 tables) ---');

  console.log('Seeding trade_stage_migration...');
  await batchInsert('trade_stage_migration', buildTradeStageMigration());

  console.log('Seeding trade_dpd_roll_rates...');
  await batchInsert('trade_dpd_roll_rates', buildTradeDPDRollRates());

  console.log('Seeding trade_dpd_aging_by_entity...');
  await batchInsert('trade_dpd_aging_by_entity', buildTradeDPDAgingByEntity());

  // --- Corporate Finance V3 ---
  console.log('\n--- Corporate Finance V3 (8 tables) ---');

  console.log('Seeding corporate_top_customers...');
  await batchInsert('corporate_top_customers', buildCorporateTopCustomers());

  console.log('Seeding corporate_industry_concentration...');
  await batchInsert('corporate_industry_concentration', buildCorporateIndustryConcentration());

  console.log('Seeding corporate_collateral_analysis...');
  await batchInsert('corporate_collateral_analysis', buildCorporateCollateralAnalysis());

  console.log('Seeding corporate_ltv_distribution...');
  await batchInsert('corporate_ltv_distribution', buildCorporateLTVDistribution());

  console.log('Seeding corporate_maturity_profile...');
  await batchInsert('corporate_maturity_profile', buildCorporateMaturityProfile());

  console.log('Seeding corporate_provisioning_ecl...');
  await batchInsert('corporate_provisioning_ecl', buildCorporateProvisioningECL());

  console.log('Seeding corporate_rating_analysis...');
  await batchInsert('corporate_rating_analysis', buildCorporateRatingAnalysis());

  console.log('Seeding corporate_rating_migration...');
  await batchInsert('corporate_rating_migration', buildCorporateRatingMigration());

  console.log('Seeding corporate_pd_distribution...');
  await batchInsert('corporate_pd_distribution', buildCorporatePDDistribution());

  console.log('Seeding corporate_pipeline...');
  await batchInsert('corporate_pipeline', buildCorporatePipeline());

  console.log('\n=== V3 Seeding complete! ===');
}

main().catch((err) => {
  console.error('V3 Seed script failed:', err);
  process.exit(1);
});
