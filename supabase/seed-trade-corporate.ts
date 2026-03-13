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
// Helpers (identical to seed.ts)
// =============================================================================

/** Insert (or upsert) rows in batches to avoid hitting request-size limits */
async function batchInsert(table: string, rows: Row[], batchSize = 500, upsert = false) {
  if (rows.length === 0) return;
  let inserted = 0;
  for (let i = 0; i < rows.length; i += batchSize) {
    const chunk = rows.slice(i, i + batchSize);
    const { error } = upsert
      ? await supabase.from(table).upsert(chunk)
      : await supabase.from(table).insert(chunk);
    if (error) {
      console.error(`  ERROR inserting into ${table} (batch ${Math.floor(i / batchSize) + 1}):`, error.message);
      throw error;
    }
    inserted += chunk.length;
  }
  console.log(`  ✓ ${table}: ${inserted} rows`);
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

const REPORT_DATE = '2025-08-01';

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
  aumLocal: number;
  products: string[];
  dsOffset: number;
}

const SUBSIDIARIES: SubsidiaryProfile[] = [
  {
    id: 1, name: 'Samman Capital', shortCode: 'SAM',
    country: 'India', countryCode: 'IN', regionId: 1,
    currencyCode: 'INR', institutionType: 'NBFC',
    delinqMult: 0.7, aumLocal: 24000000000,
    products: ['Home Loan', 'LAP', 'Personal Loan'],
    dsOffset: 1,
  },
  {
    id: 2, name: 'First Woman Bank Limited', shortCode: 'FWBL',
    country: 'Pakistan', countryCode: 'PK', regionId: 1,
    currencyCode: 'PKR', institutionType: 'Bank',
    delinqMult: 1.1, aumLocal: 45000000000,
    products: ['Auto Loan', 'Personal Loan', 'Credit Card', 'Home Loan'],
    dsOffset: 4,
  },
  {
    id: 3, name: 'Mirabank', shortCode: 'MIR',
    country: 'Serbia', countryCode: 'RS', regionId: 2,
    currencyCode: 'RSD', institutionType: 'Commercial Bank',
    delinqMult: 0.6, aumLocal: 8000000000,
    products: ['Consumer Loan', 'Housing Loan', 'Personal Loan'],
    dsOffset: 7,
  },
  {
    id: 4, name: 'LuloBank', shortCode: 'LUL',
    country: 'Colombia', countryCode: 'CO', regionId: 3,
    currencyCode: 'COP', institutionType: 'Digital Bank',
    delinqMult: 1.3, aumLocal: 1200000000000,
    products: ['Personal Loan', 'Credit Card'],
    dsOffset: 10,
  },
  {
    id: 5, name: 'Beltone', shortCode: 'BEL',
    country: 'Egypt', countryCode: 'EG', regionId: 4,
    currencyCode: 'EGP', institutionType: 'NBFI',
    delinqMult: 1.0, aumLocal: 12000000000,
    products: ['Consumer Loan', 'Leasing', 'Mortgage'],
    dsOffset: 13,
  },
];

// =============================================================================
// Geography-specific trade finance data
// =============================================================================

interface TradeSectorPool {
  sectors: string[];
  commodities: Record<string, string[]>;
  obligors: string[];
  counterpartyBanks: string[];
}

const TRADE_POOLS: Record<number, TradeSectorPool> = {
  // India — Samman Capital
  1: {
    sectors: ['Oil & Gas', 'Textiles', 'Agriculture', 'Chemicals', 'Metals & Mining', 'Pharmaceuticals', 'Auto Components', 'Electronics'],
    commodities: {
      'Oil & Gas': ['Crude Oil', 'LNG', 'Petroleum Products'],
      'Textiles': ['Cotton', 'Yarn', 'Garments'],
      'Agriculture': ['Rice', 'Sugar', 'Spices', 'Tea'],
      'Chemicals': ['Dyes', 'Agrochemicals', 'Specialty Chemicals'],
      'Metals & Mining': ['Iron Ore', 'Steel', 'Copper'],
      'Pharmaceuticals': ['APIs', 'Formulations', 'Generics'],
      'Auto Components': ['Castings', 'Forgings', 'Rubber Parts'],
      'Electronics': ['Semiconductors', 'PCBs', 'Consumer Electronics'],
    },
    obligors: [
      'Tata International', 'Adani Enterprises', 'Reliance Trading', 'Mahindra Global',
      'Godrej Exports', 'Larsen & Toubro', 'Bajaj Auto Intl', 'Cipla Global',
      'Sun Pharma Trade', 'Asian Paints Export', 'Vedanta Resources', 'Infosys BPO',
      'Hindalco Trading', 'Glencore India', 'ITC Agri Business', 'JSW Steel Intl',
      'Havells Export', 'Dr Reddys Labs', 'Bharat Forge', 'Thermax Ltd',
    ],
    counterpartyBanks: ['SBI', 'ICICI Bank', 'HDFC Bank', 'Axis Bank', 'Kotak Mahindra'],
  },
  // Pakistan — First Woman Bank Limited
  2: {
    sectors: ['Textiles', 'Agriculture', 'Leather', 'Surgical Instruments', 'Chemicals', 'Cement', 'Rice Trading', 'Sports Goods'],
    commodities: {
      'Textiles': ['Cotton Yarn', 'Denim', 'Knitwear', 'Home Textiles'],
      'Agriculture': ['Wheat', 'Rice', 'Sugarcane', 'Maize'],
      'Leather': ['Raw Hides', 'Finished Leather', 'Leather Goods'],
      'Surgical Instruments': ['Forceps', 'Scissors', 'Dental Tools'],
      'Chemicals': ['Soda Ash', 'Caustic Soda', 'Fertilizer'],
      'Cement': ['OPC Cement', 'Clinker'],
      'Rice Trading': ['Basmati Rice', 'IRRI Rice'],
      'Sports Goods': ['Footballs', 'Hockey Equipment', 'Boxing Gloves'],
    },
    obligors: [
      'Nishat Mills', 'Gul Ahmed Textile', 'Engro Corporation', 'Lucky Cement',
      'Fauji Fertilizer', 'Interloop Ltd', 'Sapphire Fibres', 'Chenab Limited',
      'Kohinoor Textile', 'Packages Ltd', 'Matco Foods', 'Guard Rice',
      'Service Industries', 'Artistic Milliners', 'Samba Financial', 'Dawood Hercules',
      'AGP Pharma', 'Fatima Fertilizer', 'Maple Leaf Cement', 'Din Leather',
    ],
    counterpartyBanks: ['HBL', 'MCB Bank', 'UBL', 'Allied Bank', 'Bank Alfalah'],
  },
  // Serbia — Mirabank
  3: {
    sectors: ['Agriculture', 'Metals & Mining', 'Automotive', 'Chemicals', 'Food & Beverage', 'Electronics', 'Machinery', 'Timber'],
    commodities: {
      'Agriculture': ['Corn', 'Wheat', 'Sunflower', 'Soybeans'],
      'Metals & Mining': ['Copper', 'Lithium', 'Steel Products'],
      'Automotive': ['Auto Parts', 'Wiring Harnesses', 'Tires'],
      'Chemicals': ['Rubber Products', 'Plastics', 'Paints'],
      'Food & Beverage': ['Fruit Juice', 'Frozen Berries', 'Confectionery'],
      'Electronics': ['Cable Assemblies', 'Switches', 'Sensors'],
      'Machinery': ['Machine Tools', 'Industrial Pumps', 'Compressors'],
      'Timber': ['Sawn Wood', 'Plywood', 'Furniture Parts'],
    },
    obligors: [
      'NIS Gazprom Neft', 'Fiat Chrysler Serbia', 'Hemofarm d.o.o.', 'Tigar Tyres',
      'Victoria Group', 'MK Group', 'Delta Holding', 'Gorenje Serbia',
      'Metalac a.d.', 'Imlek d.d.', 'Sojaprotein', 'Bambi Banat',
      'RTB Bor', 'Elixir Group', 'Galeb d.o.o.', 'Valy Automotive',
      'Leoni Wiring Systems', 'Continental Subotica', 'Grundfos Serbia', 'Henkel Krusevac',
    ],
    counterpartyBanks: ['Banca Intesa', 'Komercijalna Banka', 'UniCredit Serbia', 'OTP Banka', 'Erste Bank Serbia'],
  },
  // Colombia — LuloBank
  4: {
    sectors: ['Oil & Gas', 'Agriculture', 'Mining', 'Chemicals', 'Flowers & Horticulture', 'Textiles', 'Coffee', 'Cocoa'],
    commodities: {
      'Oil & Gas': ['Crude Oil', 'Natural Gas', 'Fuel Oil'],
      'Agriculture': ['Bananas', 'Palm Oil', 'Sugarcane'],
      'Mining': ['Coal', 'Gold', 'Emeralds', 'Nickel'],
      'Chemicals': ['Petrochemicals', 'Fertilizers', 'Plastics'],
      'Flowers & Horticulture': ['Cut Flowers', 'Roses', 'Carnations'],
      'Textiles': ['Denim', 'Knitted Fabric', 'Garments'],
      'Coffee': ['Green Coffee', 'Roasted Coffee', 'Specialty Coffee'],
      'Cocoa': ['Cacao Beans', 'Cocoa Butter', 'Cocoa Powder'],
    },
    obligors: [
      'Ecopetrol S.A.', 'Grupo Argos', 'Bancolombia Trade', 'Grupo Nutresa',
      'Cerrejon Mining', 'Cementos Argos', 'ISA InterChile', 'Avianca Cargo',
      'Colombina S.A.', 'Juan Valdez Export', 'Pacific Rubiales', 'Mineros S.A.',
      'Procafecol S.A.', 'Crystal S.A.S.', 'Terpel S.A.', 'Alpina S.A.',
      'ETB Telecom', 'Celsia Energy', 'Grupo Sura Trade', 'Flores de Funza',
    ],
    counterpartyBanks: ['Bancolombia', 'Banco de Bogota', 'Davivienda', 'BBVA Colombia', 'Banco de Occidente'],
  },
  // Egypt — Beltone
  5: {
    sectors: ['Oil & Gas', 'Textiles', 'Agriculture', 'Chemicals', 'Construction', 'Metals', 'Food Processing', 'Ceramics'],
    commodities: {
      'Oil & Gas': ['Crude Oil', 'LNG', 'Petroleum Products'],
      'Textiles': ['Cotton', 'Yarn', 'Ready-made Garments'],
      'Agriculture': ['Citrus Fruits', 'Potatoes', 'Rice', 'Cotton Lint'],
      'Chemicals': ['Phosphate Fertilizers', 'Urea', 'Ammonia'],
      'Construction': ['Cement', 'Steel Rebar', 'Glass'],
      'Metals': ['Aluminum', 'Steel', 'Iron Billets'],
      'Food Processing': ['Sugar', 'Edible Oil', 'Canned Goods'],
      'Ceramics': ['Floor Tiles', 'Sanitaryware', 'Tableware'],
    },
    obligors: [
      'Orascom Construction', 'El Sewedy Electric', 'Oriental Weavers', 'Elsewedy Cable',
      'Abu Qir Fertilizers', 'Egyptian Steel', 'Juhayna Food', 'Edita Food',
      'Palm Hills Dev', 'SODIC', 'EFG Hermes Trade', 'Amer Group',
      'Lecico Egypt', 'Cleopatra Group', 'Ezz Steel', 'Sidi Kerir Petro',
      'Delta Sugar', 'Misr Fertilizers', 'Al Ahram Beverages', 'Arabian Cement',
    ],
    counterpartyBanks: ['CIB Egypt', 'National Bank of Egypt', 'Banque Misr', 'QNB Alahli', 'HSBC Egypt'],
  },
};

const TRADE_PRODUCTS = ['LC', 'BG', 'Invoice Financing', 'Pre-Shipment Finance', 'Post-Shipment Finance', 'Supply Chain Finance', 'Trust Receipt', 'Packing Credit'];

const CORPORATE_SECTORS: Record<number, string[]> = {
  1: ['Infrastructure', 'Real Estate', 'Manufacturing', 'IT Services', 'Healthcare', 'FMCG', 'Power & Energy', 'Telecom'],
  2: ['Textiles', 'Real Estate', 'Fertilizer', 'Cement', 'Power', 'Banking & Finance', 'Food & Beverage', 'Pharmaceuticals'],
  3: ['Automotive', 'Agriculture', 'Real Estate', 'Retail', 'IT Services', 'Energy', 'Manufacturing', 'Tourism'],
  4: ['Mining', 'Real Estate', 'Agriculture', 'Energy', 'Infrastructure', 'Financial Services', 'Retail', 'Telecom'],
  5: ['Real Estate', 'Construction', 'Tourism', 'Food & Beverage', 'Petrochemicals', 'Telecom', 'Healthcare', 'Financial Services'],
};

const CORPORATE_BORROWERS: Record<number, string[]> = {
  1: [
    'Reliance Industries', 'Tata Steel Ltd', 'Bajaj Finance', 'Godrej Properties', 'Apollo Hospitals',
    'Mahindra & Mahindra', 'Larsen & Toubro', 'Adani Power', 'Infosys Ltd', 'Hindustan Unilever',
    'NTPC Limited', 'Bharti Airtel', 'DLF Limited', 'Cipla Ltd', 'UltraTech Cement',
  ],
  2: [
    'DG Khan Cement', 'Engro Polymer', 'Nishat Chunian', 'Hub Power Co', 'K-Electric',
    'TRG Pakistan', 'Packages Limited', 'Millat Tractors', 'Oil & Gas Dev Corp', 'Bestway Cement',
    'Mughal Iron & Steel', 'Systems Ltd', 'Fauji Cement', 'Bank Alfalah Ltd', 'Sui Northern Gas',
  ],
  3: [
    'NIS a.d.', 'Telenor Serbia', 'Delhaize Serbia', 'Philip Morris Serbia', 'Hemofarm',
    'Imlek', 'Metalac', 'Victoria Group', 'MK Commerce', 'Delta Agrar',
    'Gorenje Beko', 'Leoni Wiring', 'Continental Auto', 'Grundfos Indjija', 'Apatinska Pivara',
  ],
  4: [
    'Ecopetrol', 'Grupo Argos', 'Grupo Nutresa', 'ISA Interconnexion', 'Cementos Argos',
    'Avianca Holdings', 'Cerrejon', 'Pacific Rubiales', 'Grupo Sura', 'Bancolombia SA',
    'ETB Telecom', 'Celsia SA', 'Alpina SA', 'Tecnoglass', 'Mineros SA',
  ],
  5: [
    'Orascom Construction', 'El Sewedy Electric', 'SODIC', 'Palm Hills', 'Oriental Weavers',
    'Juhayna Food', 'Edita Food', 'Elsewedy Cable', 'EFG Hermes', 'Abu Qir Fertilizers',
    'Ezz Steel', 'Vodafone Egypt', 'Cleopatra Hospital', 'Arabian Cement', 'Telecom Egypt',
  ],
};

const RATING_BANDS = ['1-2', '3', '4', '5', '6', '7', '8', '9-10'];

const EWS_TRIGGERS = [
  'Revenue decline >15%', 'Debt/EBITDA >4x', 'Interest coverage <1.5x',
  'Covenant breach - DSCR', 'Credit rating downgrade', 'Significant customer loss',
  'Management change', 'Regulatory action', 'Sector stress - commodity price',
  'FX exposure unhedged', 'Working capital squeeze', 'Audit qualification',
  'Promoter pledge increase', 'Related party transactions', 'Cash flow deterioration',
];

const REMEDIAL_ACTIONS = [
  'Enhanced monitoring', 'Quarterly review', 'Collateral top-up requested',
  'Management meeting scheduled', 'Limit reduction', 'Exit strategy initiated',
  'Restructuring under discussion', 'Additional security obtained', 'Watch & wait',
  'Refer to special assets', 'Covenant waiver requested', 'Cash sweep mechanism activated',
];

const COVENANT_CATEGORIES = ['Financial', 'Non-Financial', 'Reporting', 'Compliance'];
const COVENANT_TYPES: Record<string, string[]> = {
  'Financial': ['DSCR', 'Debt/Equity', 'Current Ratio', 'Interest Coverage', 'Debt/EBITDA', 'Net Worth'],
  'Non-Financial': ['Change of Control', 'Negative Pledge', 'Pari Passu', 'Cross Default'],
  'Reporting': ['Annual Audited Financials', 'Quarterly MIS', 'Stock Statement', 'Insurance Renewal'],
  'Compliance': ['Environmental Clearance', 'Tax Compliance', 'Regulatory License Renewal', 'CERSAI Registration'],
};

const FACILITY_TYPES = ['Term Loan', 'Working Capital', 'Overdraft', 'Letter of Credit', 'Bank Guarantee', 'WCDL'];
const SECURITY_TYPES = ['Hypothecation', 'Mortgage', 'Pledge', 'Corporate Guarantee', 'Personal Guarantee', 'Unsecured'];
const DELINQUENCY_REASONS = [
  'Cash flow mismatch', 'Delayed receivables', 'Project delay', 'Market downturn',
  'Client payment default', 'Currency fluctuation loss', 'Raw material price spike',
  'Regulatory hurdle', 'Labour strike', 'Seasonal business dip',
];

// =============================================================================
// Helper: pick from array deterministically
// =============================================================================
function pick<T>(arr: T[], ...seeds: number[]): T {
  const idx = Math.floor(noiseRange(0, arr.length - 0.001, ...seeds));
  return arr[idx];
}

// =============================================================================
// 1. trade_facilities (~50 per subsidiary)
// =============================================================================
function buildTradeFacilities(): Row[] {
  const rows: Row[] = [];

  for (const sub of SUBSIDIARIES) {
    const pool = TRADE_POOLS[sub.id];
    const numFacilities = 50;

    for (let fi = 0; fi < numFacilities; fi++) {
      const sector = pick(pool.sectors, sub.id, fi, 1);
      const commodityList = pool.commodities[sector] || ['General'];
      const commodity = pick(commodityList, sub.id, fi, 2);
      const obligor = pick(pool.obligors, sub.id, fi, 3);
      const product = pick(TRADE_PRODUCTS, sub.id, fi, 4);
      const counterpartyBank = pick(pool.counterpartyBanks, sub.id, fi, 5);

      // Facility limit in local currency — trade facilities are typically 1-5% of AUM
      const baseLimitLocal = sub.aumLocal * noiseRange(0.002, 0.012, sub.id, fi, 6);
      const facilityLimit = +baseLimitLocal.toFixed(2);
      const facilityLimitUsd = toUSD(facilityLimit, sub.currencyCode, FX_MAP);

      // Outstanding: 30-90% utilization
      const utilPct = noiseRange(0.30, 0.90, sub.id, fi, 7);
      const outstanding = +(facilityLimit * utilPct).toFixed(2);
      const outstandingUsd = toUSD(outstanding, sub.currencyCode, FX_MAP);

      // Previous month outstanding: slight variation
      const prevOutstanding = +(outstanding * noiseRange(0.85, 1.15, sub.id, fi, 8)).toFixed(2);
      const prevOutstandingUsd = toUSD(prevOutstanding, sub.currencyCode, FX_MAP);

      // Tenor
      const tenorDays = Math.round(noiseRange(30, 365, sub.id, fi, 9));

      // Dates
      const startOffset = Math.round(noiseRange(30, 300, sub.id, fi, 10));
      const startDate = new Date(2025, 7, 1);
      startDate.setDate(startDate.getDate() - startOffset);
      const maturityDate = new Date(startDate);
      maturityDate.setDate(maturityDate.getDate() + tenorDays);

      // Ratings: 1-10, lower is better
      const internalRating = Math.round(noiseRange(1, 10, sub.id, fi, 11));
      const externalRatingMap: Record<number, string> = {
        1: 'AAA', 2: 'AA+', 3: 'AA', 4: 'A+', 5: 'A',
        6: 'BBB+', 7: 'BBB', 8: 'BB+', 9: 'BB', 10: 'B',
      };
      const externalRating = externalRatingMap[internalRating] || 'BBB';

      // DPD — most are 0, a few delinquent
      let dpd = 0;
      const dpdChance = noiseRange(0, 1, sub.id, fi, 12);
      if (dpdChance > (1 - 0.12 * sub.delinqMult)) {
        dpd = Math.round(noiseRange(1, 180, sub.id, fi, 13));
      }

      // IFRS9 stage based on DPD
      let ifrs9Stage = 'Stage 1';
      if (dpd > 90) ifrs9Stage = 'Stage 3';
      else if (dpd > 30) ifrs9Stage = 'Stage 2';

      // Provision rate by stage
      let provisionRate = 0;
      if (ifrs9Stage === 'Stage 1') provisionRate = +noiseRange(0.005, 0.02, sub.id, fi, 14).toFixed(4);
      else if (ifrs9Stage === 'Stage 2') provisionRate = +noiseRange(0.05, 0.15, sub.id, fi, 14).toFixed(4);
      else provisionRate = +noiseRange(0.25, 0.60, sub.id, fi, 14).toFixed(4);

      const provisionAmount = +(outstanding * provisionRate).toFixed(2);
      const provisionAmountUsd = toUSD(provisionAmount, sub.currencyCode, FX_MAP);

      // Collateral
      const collateralCoverage = +noiseRange(0.8, 1.5, sub.id, fi, 15).toFixed(2);
      const collateralValue = +(outstanding * collateralCoverage).toFixed(2);
      const collateralValueUsd = toUSD(collateralValue, sub.currencyCode, FX_MAP);

      // Risk weight
      const riskWeight = +noiseRange(0.20, 1.50, sub.id, fi, 16).toFixed(2);

      // Watchlist flag
      const watchlistFlag = dpd > 30 || internalRating >= 7;

      // EWS score: 0-5
      let ewsScore = 0;
      if (dpd > 0) ewsScore = Math.min(5, Math.round(dpd / 30) + 1);
      else if (internalRating >= 7) ewsScore = Math.round(noiseRange(1, 3, sub.id, fi, 17));

      const ewsTriggers = ewsScore > 0 ? pick(EWS_TRIGGERS, sub.id, fi, 18) : null;

      const facilityRef = `TF-${sub.shortCode}-${(fi + 1).toString().padStart(4, '0')}`;

      rows.push({
        subsidiary_id: sub.id,
        facility_reference: facilityRef,
        obligor_name: obligor,
        sector,
        commodity,
        product_type: product,
        currency: sub.currencyCode,
        facility_limit: facilityLimit,
        facility_limit_usd: facilityLimitUsd,
        outstanding,
        outstanding_usd: outstandingUsd,
        prev_month_outstanding: prevOutstanding,
        prev_month_outstanding_usd: prevOutstandingUsd,
        tenor_days: tenorDays,
        start_date: startDate.toISOString().slice(0, 10),
        maturity_date: maturityDate.toISOString().slice(0, 10),
        internal_rating: internalRating,
        external_rating: externalRating,
        days_past_due: dpd,
        ifrs9_stage: ifrs9Stage,
        provision_rate: provisionRate,
        provision_amount: provisionAmount,
        provision_amount_usd: provisionAmountUsd,
        collateral_value: collateralValue,
        collateral_value_usd: collateralValueUsd,
        collateral_coverage: collateralCoverage,
        risk_weight: riskWeight,
        counterparty_bank: counterpartyBank,
        watchlist_flag: watchlistFlag,
        ews_score: ewsScore,
        ews_triggers: ewsTriggers,
        report_date: REPORT_DATE,
        data_source_id: sub.dsOffset,
      });
    }
  }
  return rows;
}

// =============================================================================
// 2. trade_entity_performance (1 per subsidiary)
// =============================================================================
function buildTradeEntityPerformance(): Row[] {
  const rows: Row[] = [];

  for (const sub of SUBSIDIARIES) {
    // Aggregate-level data — trade book is roughly 10-20% of total AUM
    const tradeBook = sub.aumLocal * noiseRange(0.10, 0.20, sub.id, 100);
    const approvedLimit = +(tradeBook * noiseRange(1.3, 1.6, sub.id, 101)).toFixed(2);
    const outstanding = +tradeBook.toFixed(2);
    const headroom = +(approvedLimit - outstanding).toFixed(2);
    const utilization = +(outstanding / approvedLimit).toFixed(4);

    // Stage split: ~88% S1, ~8% S2, ~4% S3
    const s1Pct = noiseRange(0.84, 0.92, sub.id, 102) * (2 - sub.delinqMult);
    const s3Pct = noiseRange(0.02, 0.06, sub.id, 103) * sub.delinqMult;
    const s2Pct = 1 - s1Pct - s3Pct;

    const stage1Balance = +(outstanding * s1Pct).toFixed(2);
    const stage2Balance = +(outstanding * s2Pct).toFixed(2);
    const stage3Balance = +(outstanding * s3Pct).toFixed(2);

    // Provisions
    const provisions = +(stage1Balance * 0.01 + stage2Balance * 0.08 + stage3Balance * 0.35).toFixed(2);
    const provisionCoverage = +((provisions / (stage2Balance + stage3Balance)) || 0).toFixed(4);

    // RAG status
    const nplRatio = (stage2Balance + stage3Balance) / outstanding;
    let ragStatus = 'Green';
    if (nplRatio > 0.10) ragStatus = 'Red';
    else if (nplRatio > 0.05) ragStatus = 'Amber';

    rows.push({
      subsidiary_id: sub.id,
      approved_limit: approvedLimit,
      approved_limit_usd: toUSD(approvedLimit, sub.currencyCode, FX_MAP),
      outstanding,
      outstanding_usd: toUSD(outstanding, sub.currencyCode, FX_MAP),
      headroom,
      utilization,
      stage1_balance: stage1Balance,
      stage1_balance_usd: toUSD(stage1Balance, sub.currencyCode, FX_MAP),
      stage2_balance: stage2Balance,
      stage2_balance_usd: toUSD(stage2Balance, sub.currencyCode, FX_MAP),
      stage3_balance: stage3Balance,
      stage3_balance_usd: toUSD(stage3Balance, sub.currencyCode, FX_MAP),
      provisions,
      provisions_usd: toUSD(provisions, sub.currencyCode, FX_MAP),
      provision_coverage: provisionCoverage,
      rag_status: ragStatus,
      report_date: REPORT_DATE,
      data_source_id: sub.dsOffset,
    });
  }
  return rows;
}

// =============================================================================
// 3. trade_product_mix (~6-8 per subsidiary)
// =============================================================================
function buildTradeProductMix(): Row[] {
  const rows: Row[] = [];

  // Each subsidiary uses a subset of trade products
  const subProducts: Record<number, string[]> = {
    1: ['LC', 'BG', 'Invoice Financing', 'Pre-Shipment Finance', 'Post-Shipment Finance', 'Supply Chain Finance', 'Packing Credit'],
    2: ['LC', 'BG', 'Invoice Financing', 'Pre-Shipment Finance', 'Post-Shipment Finance', 'Trust Receipt'],
    3: ['LC', 'BG', 'Invoice Financing', 'Supply Chain Finance', 'Pre-Shipment Finance', 'Post-Shipment Finance'],
    4: ['LC', 'BG', 'Invoice Financing', 'Pre-Shipment Finance', 'Post-Shipment Finance', 'Supply Chain Finance', 'Trust Receipt', 'Packing Credit'],
    5: ['LC', 'BG', 'Invoice Financing', 'Pre-Shipment Finance', 'Post-Shipment Finance', 'Supply Chain Finance', 'Trust Receipt'],
  };

  for (const sub of SUBSIDIARIES) {
    const products = subProducts[sub.id];
    const tradeBook = sub.aumLocal * noiseRange(0.10, 0.20, sub.id, 200);

    for (let pi = 0; pi < products.length; pi++) {
      const product = products[pi];
      const n = noise(sub.id, pi, 201);

      // Portfolio share: LC and BG dominate
      let shareBase = 0.10;
      if (product === 'LC') shareBase = 0.30;
      else if (product === 'BG') shareBase = 0.20;
      else if (product === 'Invoice Financing') shareBase = 0.15;
      const share = +(shareBase * n).toFixed(4);

      const outstanding = +(tradeBook * share).toFixed(2);
      const facilities = Math.round(noiseRange(5, 25, sub.id, pi, 202));
      const facilityLimit = +(outstanding / noiseRange(0.55, 0.85, sub.id, pi, 203)).toFixed(2);
      const avgTenor = +noiseRange(60, 270, sub.id, pi, 204).toFixed(0);
      const utilization = +(outstanding / facilityLimit).toFixed(4);
      const stage2Plus3Pct = +noiseRange(0.02, 0.10, sub.id, pi, 205).toFixed(4) * sub.delinqMult;
      const avgRating = +noiseRange(3, 6, sub.id, pi, 206).toFixed(1);
      const watchlistCount = Math.round(noiseRange(0, 3, sub.id, pi, 207) * sub.delinqMult);

      rows.push({
        subsidiary_id: sub.id,
        product_type: product,
        facilities,
        facility_limit: facilityLimit,
        facility_limit_usd: toUSD(facilityLimit, sub.currencyCode, FX_MAP),
        outstanding,
        outstanding_usd: toUSD(outstanding, sub.currencyCode, FX_MAP),
        portfolio_share: share,
        avg_tenor: +avgTenor,
        utilization,
        stage2_plus3_pct: +stage2Plus3Pct.toFixed(4),
        avg_rating: avgRating,
        watchlist_count: watchlistCount,
        report_date: REPORT_DATE,
        data_source_id: sub.dsOffset,
      });
    }
  }
  return rows;
}

// =============================================================================
// 4. trade_asset_quality (1 per subsidiary)
// =============================================================================
function buildTradeAssetQuality(): Row[] {
  const rows: Row[] = [];

  for (const sub of SUBSIDIARIES) {
    const totalFacilities = 50;
    const tradeBook = sub.aumLocal * noiseRange(0.10, 0.20, sub.id, 300);

    // Stage distribution
    const s1Pct = noiseRange(0.82, 0.92, sub.id, 301) * (2 - sub.delinqMult);
    const s3Pct = noiseRange(0.02, 0.06, sub.id, 302) * sub.delinqMult;
    const s2Pct = Math.max(0.01, 1 - s1Pct - s3Pct);

    const s1Count = Math.round(totalFacilities * s1Pct);
    const s3Count = Math.max(1, Math.round(totalFacilities * s3Pct));
    const s2Count = totalFacilities - s1Count - s3Count;

    const s1Balance = +(tradeBook * s1Pct).toFixed(2);
    const s2Balance = +(tradeBook * s2Pct).toFixed(2);
    const s3Balance = +(tradeBook * s3Pct).toFixed(2);

    const stage2Plus3Pct = +((s2Balance + s3Balance) / tradeBook).toFixed(4);
    const provisionCoverage = +noiseRange(0.30, 0.65, sub.id, 303).toFixed(4);

    let ragStatus = 'Green';
    if (stage2Plus3Pct > 0.10) ragStatus = 'Red';
    else if (stage2Plus3Pct > 0.05) ragStatus = 'Amber';

    rows.push({
      subsidiary_id: sub.id,
      stage1_count: s1Count,
      stage1_balance: s1Balance,
      stage1_balance_usd: toUSD(s1Balance, sub.currencyCode, FX_MAP),
      stage2_count: s2Count,
      stage2_balance: s2Balance,
      stage2_balance_usd: toUSD(s2Balance, sub.currencyCode, FX_MAP),
      stage3_count: s3Count,
      stage3_balance: s3Balance,
      stage3_balance_usd: toUSD(s3Balance, sub.currencyCode, FX_MAP),
      stage2_plus3_pct: stage2Plus3Pct,
      provision_coverage: provisionCoverage,
      rag_status: ragStatus,
      report_date: REPORT_DATE,
      data_source_id: sub.dsOffset,
    });
  }
  return rows;
}

// =============================================================================
// 5. trade_rating_distribution (~8 per subsidiary)
// =============================================================================
function buildTradeRatingDistribution(): Row[] {
  const rows: Row[] = [];

  // Base distribution across 8 rating bands (better-rated subsidiaries skew left)
  const baseShares = [0.08, 0.12, 0.18, 0.22, 0.16, 0.12, 0.07, 0.05];

  for (const sub of SUBSIDIARIES) {
    const tradeBook = sub.aumLocal * noiseRange(0.10, 0.20, sub.id, 400);
    const totalFacilities = 50;

    for (let bi = 0; bi < RATING_BANDS.length; bi++) {
      const n = noise(sub.id, bi, 401);

      // Shift distribution based on delinqMult: lower mult -> more in good bands
      let share: number;
      if (bi < 4) {
        share = baseShares[bi] * (2 - sub.delinqMult) * n;
      } else {
        share = baseShares[bi] * sub.delinqMult * n;
      }
      share = +share.toFixed(4);

      const balance = +(tradeBook * share).toFixed(2);
      const count = Math.max(1, Math.round(totalFacilities * share));

      // Avg provision rate increases with rating band
      const avgProvision = +noiseRange(0.005 + bi * 0.015, 0.01 + bi * 0.025, sub.id, bi, 402).toFixed(4);

      rows.push({
        subsidiary_id: sub.id,
        rating_band: RATING_BANDS[bi],
        count,
        balance,
        balance_usd: toUSD(balance, sub.currencyCode, FX_MAP),
        portfolio_share: share,
        avg_provision: avgProvision,
        report_date: REPORT_DATE,
        data_source_id: sub.dsOffset,
      });
    }
  }
  return rows;
}

// =============================================================================
// 6. trade_concentrations (~15-20 per subsidiary)
// =============================================================================
function buildTradeConcentrations(): Row[] {
  const rows: Row[] = [];

  for (const sub of SUBSIDIARIES) {
    const pool = TRADE_POOLS[sub.id];
    const tradeBook = sub.aumLocal * noiseRange(0.10, 0.20, sub.id, 500);

    // Obligor concentrations: top 10
    for (let oi = 0; oi < 10; oi++) {
      const obligor = pool.obligors[oi % pool.obligors.length];
      const n = noise(sub.id, oi, 501);
      const share = +noiseRange(0.03, 0.12, sub.id, oi, 502).toFixed(4);
      const value = +(tradeBook * share).toFixed(2);
      const facilities = Math.round(noiseRange(1, 5, sub.id, oi, 503));
      const ratingNum = Math.round(noiseRange(2, 7, sub.id, oi, 504));
      const ratingMap: Record<number, string> = { 1: 'AAA', 2: 'AA+', 3: 'AA', 4: 'A+', 5: 'A', 6: 'BBB+', 7: 'BBB', 8: 'BB+', 9: 'BB', 10: 'B' };

      rows.push({
        subsidiary_id: sub.id,
        name: obligor,
        category: 'obligor',
        value,
        value_usd: toUSD(value, sub.currencyCode, FX_MAP),
        portfolio_share: share,
        facilities,
        rating: ratingMap[ratingNum] || 'BBB',
        report_date: REPORT_DATE,
        data_source_id: sub.dsOffset,
      });
    }

    // Sector concentrations: all sectors
    for (let si = 0; si < pool.sectors.length; si++) {
      const sector = pool.sectors[si];
      const share = +noiseRange(0.06, 0.20, sub.id, si, 510).toFixed(4);
      const value = +(tradeBook * share).toFixed(2);
      const facilities = Math.round(noiseRange(3, 12, sub.id, si, 511));

      rows.push({
        subsidiary_id: sub.id,
        name: sector,
        category: 'sector',
        value,
        value_usd: toUSD(value, sub.currencyCode, FX_MAP),
        portfolio_share: share,
        facilities,
        rating: null,
        report_date: REPORT_DATE,
        data_source_id: sub.dsOffset,
      });
    }
  }
  return rows;
}

// =============================================================================
// 7. trade_collection_efficiency (1 per subsidiary)
// =============================================================================
function buildTradeCollectionEfficiency(): Row[] {
  const rows: Row[] = [];

  for (const sub of SUBSIDIARIES) {
    const tradeBook = sub.aumLocal * noiseRange(0.10, 0.20, sub.id, 600);
    const collEfficiency = +noiseRange(0.88, 0.97, sub.id, 601).toFixed(4) * (2 - sub.delinqMult);
    const overdueRatio = +noiseRange(0.03, 0.10, sub.id, 602).toFixed(4) * sub.delinqMult;
    const avgDpd = +noiseRange(5, 25, sub.id, 603).toFixed(1) * sub.delinqMult;
    const recoveryRate = +noiseRange(0.60, 0.85, sub.id, 604).toFixed(4);
    const rolloverRate = +noiseRange(0.10, 0.25, sub.id, 605).toFixed(4) * sub.delinqMult;

    const provisionOutstanding = +(tradeBook * noiseRange(0.015, 0.04, sub.id, 606) * sub.delinqMult).toFixed(2);

    let ragStatus = 'Green';
    if (collEfficiency < 0.85) ragStatus = 'Red';
    else if (collEfficiency < 0.92) ragStatus = 'Amber';

    rows.push({
      subsidiary_id: sub.id,
      collection_efficiency_ratio: +Math.min(1, collEfficiency).toFixed(4),
      overdue_ratio: +overdueRatio.toFixed(4),
      avg_dpd: +avgDpd.toFixed(1),
      recovery_rate: recoveryRate,
      rollover_rate: +rolloverRate.toFixed(4),
      provision_outstanding: provisionOutstanding,
      provision_outstanding_usd: toUSD(provisionOutstanding, sub.currencyCode, FX_MAP),
      rag_status: ragStatus,
      report_date: REPORT_DATE,
      data_source_id: sub.dsOffset,
    });
  }
  return rows;
}

// =============================================================================
// 8. trade_watchlist (~5-8 per subsidiary)
// =============================================================================
function buildTradeWatchlist(): Row[] {
  const rows: Row[] = [];

  for (const sub of SUBSIDIARIES) {
    const pool = TRADE_POOLS[sub.id];
    const numWatchlist = Math.round(noiseRange(5, 8, sub.id, 700));
    const tradeBook = sub.aumLocal * noiseRange(0.10, 0.20, sub.id, 701);

    for (let wi = 0; wi < numWatchlist; wi++) {
      const obligor = pool.obligors[(wi * 3 + sub.id) % pool.obligors.length];
      const product = pick(TRADE_PRODUCTS, sub.id, wi, 702);
      const outstanding = +(tradeBook * noiseRange(0.01, 0.05, sub.id, wi, 703)).toFixed(2);
      const dpd = Math.round(noiseRange(1, 120, sub.id, wi, 704));
      const rating = Math.round(noiseRange(5, 9, sub.id, wi, 705));
      const ewsScore = Math.round(noiseRange(2, 5, sub.id, wi, 706));

      let ifrsStage = 'Stage 1';
      if (dpd > 90) ifrsStage = 'Stage 3';
      else if (dpd > 30) ifrsStage = 'Stage 2';

      const trigger = pick(EWS_TRIGGERS, sub.id, wi, 707);
      const action = pick(REMEDIAL_ACTIONS, sub.id, wi, 708);
      const facilityRef = `TF-${sub.shortCode}-${((wi + 1) * 7).toString().padStart(4, '0')}`;

      rows.push({
        subsidiary_id: sub.id,
        facility_ref: facilityRef,
        obligor_name: obligor,
        product_type: product,
        outstanding,
        outstanding_usd: toUSD(outstanding, sub.currencyCode, FX_MAP),
        dpd,
        ifrs_stage: ifrsStage,
        rating,
        ews_score: ewsScore,
        triggers: trigger,
        action,
        report_date: REPORT_DATE,
        data_source_id: sub.dsOffset,
      });
    }
  }
  return rows;
}

// =============================================================================
// 9. ews_entity_summary (1 per subsidiary)
// =============================================================================
function buildEwsEntitySummary(): Row[] {
  const rows: Row[] = [];

  for (const sub of SUBSIDIARIES) {
    const totalFacilities = 50;
    const tradeBook = sub.aumLocal * noiseRange(0.10, 0.20, sub.id, 800);

    // Score distribution: most are 0, fewer in higher scores
    const score0 = Math.round(totalFacilities * noiseRange(0.40, 0.55, sub.id, 801) * (2 - sub.delinqMult));
    const score1 = Math.round(totalFacilities * noiseRange(0.15, 0.25, sub.id, 802));
    const score2 = Math.round(totalFacilities * noiseRange(0.08, 0.15, sub.id, 803));
    const score3 = Math.round(totalFacilities * noiseRange(0.04, 0.08, sub.id, 804) * sub.delinqMult);
    const score4Plus = Math.max(0, totalFacilities - score0 - score1 - score2 - score3);

    const avgEwsScore = +((score0 * 0 + score1 * 1 + score2 * 2 + score3 * 3 + score4Plus * 4.5) / totalFacilities).toFixed(2);

    // Flagged exposure = facilities with score >= 2
    const flaggedPct = noiseRange(0.08, 0.20, sub.id, 805) * sub.delinqMult;
    const flaggedExposure = +(tradeBook * flaggedPct).toFixed(2);

    let ragStatus = 'Green';
    if (avgEwsScore > 2.0) ragStatus = 'Red';
    else if (avgEwsScore > 1.2) ragStatus = 'Amber';

    rows.push({
      subsidiary_id: sub.id,
      score0,
      score1,
      score2,
      score3,
      score4_plus: score4Plus,
      total_facilities: totalFacilities,
      avg_ews_score: avgEwsScore,
      flagged_exposure: flaggedExposure,
      flagged_exposure_usd: toUSD(flaggedExposure, sub.currencyCode, FX_MAP),
      rag_status: ragStatus,
      report_date: REPORT_DATE,
      data_source_id: sub.dsOffset,
    });
  }
  return rows;
}

// =============================================================================
// 10. ews_facility_alerts (~5-8 per subsidiary)
// =============================================================================
function buildEwsFacilityAlerts(): Row[] {
  const rows: Row[] = [];

  for (const sub of SUBSIDIARIES) {
    const pool = TRADE_POOLS[sub.id];
    const numAlerts = Math.round(noiseRange(5, 8, sub.id, 900));
    const tradeBook = sub.aumLocal * noiseRange(0.10, 0.20, sub.id, 901);

    for (let ai = 0; ai < numAlerts; ai++) {
      const obligor = pool.obligors[(ai * 4 + sub.id + 2) % pool.obligors.length];
      const ewsScore = Math.round(noiseRange(2, 5, sub.id, ai, 902));
      const outstanding = +(tradeBook * noiseRange(0.005, 0.04, sub.id, ai, 903)).toFixed(2);
      const trigger = pick(EWS_TRIGGERS, sub.id, ai, 904);
      const action = pick(REMEDIAL_ACTIONS, sub.id, ai, 905);
      const facilityRef = `TF-${sub.shortCode}-${((ai + 1) * 6 + 1).toString().padStart(4, '0')}`;

      let ifrsStage = 'Stage 1';
      if (ewsScore >= 4) ifrsStage = 'Stage 2';
      if (ewsScore >= 5) ifrsStage = 'Stage 3';

      rows.push({
        subsidiary_id: sub.id,
        facility_ref: facilityRef,
        obligor,
        ews_score: ewsScore,
        outstanding,
        outstanding_usd: toUSD(outstanding, sub.currencyCode, FX_MAP),
        triggers: trigger,
        ifrs_stage: ifrsStage,
        action,
        report_date: REPORT_DATE,
        data_source_id: sub.dsOffset,
      });
    }
  }
  return rows;
}

// =============================================================================
// 11. fx_risk (1 per subsidiary)
// =============================================================================
function buildFxRisk(): Row[] {
  const rows: Row[] = [];

  // FX-specific data per currency
  const fxProfiles: Record<string, { vol30: number; vol90: number; ytdDeprec: number; capitalControls: boolean; transferRisk: string }> = {
    INR: { vol30: 0.032, vol90: 0.045, ytdDeprec: -0.028, capitalControls: true, transferRisk: 'Low' },
    PKR: { vol30: 0.065, vol90: 0.082, ytdDeprec: -0.12, capitalControls: true, transferRisk: 'High' },
    RSD: { vol30: 0.018, vol90: 0.025, ytdDeprec: -0.015, capitalControls: false, transferRisk: 'Low' },
    COP: { vol30: 0.048, vol90: 0.068, ytdDeprec: -0.065, capitalControls: false, transferRisk: 'Medium' },
    EGP: { vol30: 0.055, vol90: 0.075, ytdDeprec: -0.085, capitalControls: true, transferRisk: 'High' },
  };

  for (const sub of SUBSIDIARIES) {
    const profile = fxProfiles[sub.currencyCode];
    const fxRate = 1 / FX_MAP[sub.currencyCode]; // local per USD
    const n = noise(sub.id, 1000);

    const portfolioExposure = +(sub.aumLocal * noiseRange(0.15, 0.30, sub.id, 1001)).toFixed(2);
    const fxImpact = +(portfolioExposure * Math.abs(profile.ytdDeprec) * n).toFixed(2);

    let ragStatus = 'Green';
    if (Math.abs(profile.ytdDeprec) > 0.08) ragStatus = 'Red';
    else if (Math.abs(profile.ytdDeprec) > 0.04) ragStatus = 'Amber';

    rows.push({
      subsidiary_id: sub.id,
      primary_currency: sub.currencyCode,
      fx_rate: +fxRate.toFixed(4),
      volatility_30d: +(profile.vol30 * n).toFixed(4),
      volatility_90d: +(profile.vol90 * n).toFixed(4),
      ytd_depreciation: +(profile.ytdDeprec * n).toFixed(4),
      portfolio_exposure: portfolioExposure,
      portfolio_exposure_usd: toUSD(portfolioExposure, sub.currencyCode, FX_MAP),
      fx_impact: fxImpact,
      fx_impact_usd: toUSD(fxImpact, sub.currencyCode, FX_MAP),
      capital_controls: profile.capitalControls,
      transfer_risk: profile.transferRisk,
      rag_status: ragStatus,
      report_date: REPORT_DATE,
      data_source_id: sub.dsOffset,
    });
  }
  return rows;
}

// =============================================================================
// 12. country_risk (1 per subsidiary)
// =============================================================================
function buildCountryRisk(): Row[] {
  const rows: Row[] = [];

  const countryProfiles: Record<number, { sovRating: number; countryRisk: number; regulatory: number; political: number; recommendation: string }> = {
    1: { sovRating: 4, countryRisk: 35, regulatory: 62, political: 55, recommendation: 'Stable outlook. Maintain current limits.' },
    2: { sovRating: 7, countryRisk: 58, regulatory: 42, political: 38, recommendation: 'Elevated risk. Reduce exposure gradually.' },
    3: { sovRating: 5, countryRisk: 32, regulatory: 68, political: 60, recommendation: 'EU candidate. Moderate growth. Maintain limits.' },
    4: { sovRating: 5, countryRisk: 42, regulatory: 55, political: 48, recommendation: 'Commodity-dependent. Monitor FX and political risk.' },
    5: { sovRating: 6, countryRisk: 52, regulatory: 48, political: 42, recommendation: 'Currency reforms ongoing. Monitor capital controls.' },
  };

  for (const sub of SUBSIDIARIES) {
    const profile = countryProfiles[sub.id];
    const n = noise(sub.id, 1100);

    const compositeScore = +((profile.countryRisk * 0.3 + profile.regulatory * 0.3 + profile.political * 0.4) * n).toFixed(2);
    const exposure = +(sub.aumLocal * noiseRange(0.70, 0.95, sub.id, 1101)).toFixed(2);
    const rwaShare = +noiseRange(0.15, 0.35, sub.id, 1102).toFixed(4);
    const capitalImpact = +(exposure * rwaShare * noiseRange(0.08, 0.12, sub.id, 1103)).toFixed(2);

    let ragStatus = 'Green';
    if (compositeScore > 55) ragStatus = 'Red';
    else if (compositeScore > 40) ragStatus = 'Amber';

    rows.push({
      subsidiary_id: sub.id,
      sovereign_rating: profile.sovRating,
      country_risk_score: +(profile.countryRisk * n).toFixed(2),
      regulatory_score: +(profile.regulatory * n).toFixed(2),
      political_stability_score: +(profile.political * n).toFixed(2),
      composite_score: compositeScore,
      exposure,
      exposure_usd: toUSD(exposure, sub.currencyCode, FX_MAP),
      rwa_share: rwaShare,
      capital_impact: capitalImpact,
      capital_impact_usd: toUSD(capitalImpact, sub.currencyCode, FX_MAP),
      recommendation: profile.recommendation,
      rag_status: ragStatus,
      report_date: REPORT_DATE,
      data_source_id: sub.dsOffset,
    });
  }
  return rows;
}

// =============================================================================
// Trigger category mapping for watchlist
const TRIGGER_CATEGORY_MAP: Record<string, string> = {
  'Revenue decline >15%': 'Financial',
  'Debt/EBITDA >4x': 'Financial',
  'Interest coverage <1.5x': 'Financial',
  'Covenant breach - DSCR': 'Financial',
  'Cash flow deterioration': 'Financial',
  'Working capital squeeze': 'Financial',
  'Credit rating downgrade': 'Financial',
  'Management change': 'Operational',
  'Audit qualification': 'Operational',
  'Related party transactions': 'Operational',
  'Promoter pledge increase': 'Operational',
  'Regulatory action': 'External',
  'Sector stress - commodity price': 'External',
  'FX exposure unhedged': 'External',
  'Significant customer loss': 'Behavioral',
};

// Rating ladder for prior rating calculation
const CORP_RATING_LADDER = ['AAA', 'AA+', 'AA', 'AA-', 'A+', 'A', 'BBB+', 'BBB', 'BB+', 'BB', 'B', 'C/D'];

// 13. corporate_watchlist (~15-25 per subsidiary)
// =============================================================================
function buildCorporateWatchlist(): Row[] {
  const rows: Row[] = [];

  for (const sub of SUBSIDIARIES) {
    const borrowers = CORPORATE_BORROWERS[sub.id];
    const sectors = CORPORATE_SECTORS[sub.id];
    const numWatchlist = Math.round(noiseRange(15, 25, sub.id, 1200));

    for (let wi = 0; wi < numWatchlist; wi++) {
      const borrower = borrowers[(wi * 2 + sub.id) % borrowers.length];
      const sector = sectors[(wi + sub.id) % sectors.length];
      const exposure = +(sub.aumLocal * noiseRange(0.005, 0.025, sub.id, wi, 1201)).toFixed(2);
      const trigger = pick(EWS_TRIGGERS, sub.id, wi, 1202);
      const triggerCategory = TRIGGER_CATEGORY_MAP[trigger] || 'Financial';

      const ratingNum = Math.round(noiseRange(4, 11, sub.id, wi, 1203));
      const ratingMap: Record<number, string> = {
        4: 'A+', 5: 'A', 6: 'BBB+', 7: 'BBB', 8: 'BB+', 9: 'BB', 10: 'B', 11: 'C/D',
      };
      const internalRating = ratingMap[ratingNum] || 'BBB';

      // Prior rating: 1-2 notches better than current
      const curIdx = CORP_RATING_LADDER.indexOf(internalRating);
      const notchesUp = Math.round(noiseRange(1, 2, sub.id, wi, 1206));
      const priorIdx = Math.max(0, curIdx - notchesUp);
      const priorRating = CORP_RATING_LADDER[priorIdx];

      // Date added: 30-365 days before report date
      const daysOnWatchlist = Math.round(noiseRange(30, 365, sub.id, wi, 1207));
      const reportDate = new Date(REPORT_DATE);
      const dateAdded = new Date(reportDate.getTime() - daysOnWatchlist * 86400000);
      const dateAddedStr = dateAdded.toISOString().slice(0, 10);

      const statusOptions = ['Active Watch', 'Escalated', 'Monitoring', 'Review Pending'];
      const status = pick(statusOptions, sub.id, wi, 1204);
      const action = pick(REMEDIAL_ACTIONS, sub.id, wi, 1205);

      rows.push({
        subsidiary_id: sub.id,
        borrower,
        sector,
        exposure,
        exposure_usd: toUSD(exposure, sub.currencyCode, FX_MAP),
        ews_trigger_type: trigger,
        trigger_category: triggerCategory,
        internal_rating: internalRating,
        prior_rating: priorRating,
        status,
        remedial_action: action,
        date_added: dateAddedStr,
        days_on_watchlist: daysOnWatchlist,
        report_date: REPORT_DATE,
        data_source_id: sub.dsOffset,
      });
    }
  }
  return rows;
}

// =============================================================================
// 14. corporate_covenants (~10-15 per subsidiary)
// =============================================================================
function buildCorporateCovenants(): Row[] {
  const rows: Row[] = [];

  for (const sub of SUBSIDIARIES) {
    const borrowers = CORPORATE_BORROWERS[sub.id];
    const numCovenants = Math.round(noiseRange(10, 15, sub.id, 1300));

    for (let ci = 0; ci < numCovenants; ci++) {
      const borrower = borrowers[ci % borrowers.length];
      const groupId = `GRP-${sub.shortCode}-${(ci + 1).toString().padStart(3, '0')}`;
      const custId = `CUS-${sub.shortCode}-${(ci + 1).toString().padStart(4, '0')}`;

      // Monetary values
      const sanctionedLimit = +(sub.aumLocal * noiseRange(0.008, 0.03, sub.id, ci, 1301)).toFixed(2);
      const disbursedAmount = +(sanctionedLimit * noiseRange(0.70, 0.95, sub.id, ci, 1302)).toFixed(2);
      const currentPos = +(disbursedAmount * noiseRange(0.80, 1.0, sub.id, ci, 1303)).toFixed(2);

      const facilityType = pick(FACILITY_TYPES, sub.id, ci, 1304);
      const securityType = pick(SECURITY_TYPES, sub.id, ci, 1305);
      const securityCover = +noiseRange(0.8, 2.0, sub.id, ci, 1306).toFixed(2);

      const riskRatingNum = Math.round(noiseRange(2, 8, sub.id, ci, 1307));
      const riskRatingMap: Record<number, string> = { 2: 'AA+', 3: 'AA', 4: 'A+', 5: 'A', 6: 'BBB+', 7: 'BBB', 8: 'BB+' };
      const riskRating = riskRatingMap[riskRatingNum] || 'BBB';

      // Covenant details
      const covenantCategory = pick(COVENANT_CATEGORIES, sub.id, ci, 1308);
      const typesForCategory = COVENANT_TYPES[covenantCategory];
      const covenantType = pick(typesForCategory, sub.id, ci, 1309);

      const covenantDescriptions: Record<string, string> = {
        'DSCR': 'Minimum DSCR of 1.25x to be maintained at all times',
        'Debt/Equity': 'Maximum Debt/Equity ratio of 3:1',
        'Current Ratio': 'Minimum current ratio of 1.2x',
        'Interest Coverage': 'Minimum interest coverage ratio of 2.0x',
        'Debt/EBITDA': 'Maximum Debt/EBITDA not to exceed 4.0x',
        'Net Worth': 'Minimum tangible net worth of local currency equivalent',
        'Change of Control': 'Prior written consent required for change in management control',
        'Negative Pledge': 'No encumbrance on assets without prior approval',
        'Pari Passu': 'Obligations rank pari passu with other unsecured obligations',
        'Cross Default': 'Default under any other agreement constitutes default hereunder',
        'Annual Audited Financials': 'Submit within 180 days of financial year end',
        'Quarterly MIS': 'Submit within 45 days of quarter end',
        'Stock Statement': 'Monthly stock statement to be submitted by 7th of following month',
        'Insurance Renewal': 'Insurance to be renewed annually and evidence submitted',
        'Environmental Clearance': 'Maintain all environmental clearances and permits',
        'Tax Compliance': 'Maintain compliance with all applicable tax regulations',
        'Regulatory License Renewal': 'Renew all regulatory licenses before expiry',
        'CERSAI Registration': 'Maintain CERSAI registration for all secured assets',
      };

      const covenantFrequencies = ['Monthly', 'Quarterly', 'Semi-Annual', 'Annual', 'Event-Based'];
      const covenantFrequency = pick(covenantFrequencies, sub.id, ci, 1310);

      // Disbursement date: 6-24 months ago
      const disbOffset = Math.round(noiseRange(180, 730, sub.id, ci, 1311));
      const disbDate = new Date(2025, 7, 1);
      disbDate.setDate(disbDate.getDate() - disbOffset);

      // Submission date: within last 90 days
      const subOffset = Math.round(noiseRange(5, 90, sub.id, ci, 1312));
      const submissionDate = new Date(2025, 7, 1);
      submissionDate.setDate(submissionDate.getDate() - subOffset);

      const extensionOptions = ['N/A', 'Approved', 'Pending', 'Not Required'];
      const approvalForExtension = pick(extensionOptions, sub.id, ci, 1313);

      // Flags — mostly false, a few flagged
      const npaFlag = noiseRange(0, 1, sub.id, ci, 1314) > 0.92 * (2 - sub.delinqMult);
      const restructuredFlag = noiseRange(0, 1, sub.id, ci, 1315) > 0.90;
      const watchlistFlag = noiseRange(0, 1, sub.id, ci, 1316) > 0.85 * (2 - sub.delinqMult);
      const writeoffFlag = noiseRange(0, 1, sub.id, ci, 1317) > 0.97;

      // New fields for v0.3.55
      const isBreached = npaFlag || restructuredFlag;
      const daysSinceBreach = isBreached ? Math.round(noiseRange(5, 120, sub.id, ci, 1320)) : 0;

      // Creation date: a few days before disbursal
      const creationDate = new Date(disbDate);
      creationDate.setDate(creationDate.getDate() - Math.round(noiseRange(5, 30, sub.id, ci, 1321)));

      // Extended closure date: set for approved extensions (30-90 days after submission)
      let extendedClosureDate: string | null = null;
      if (approvalForExtension === 'Approved') {
        const extDate = new Date(submissionDate);
        extDate.setDate(extDate.getDate() + Math.round(noiseRange(30, 90, sub.id, ci, 1323)));
        extendedClosureDate = extDate.toISOString().slice(0, 10);
      }

      // RM profile pool
      const rmProfiles = [
        { name: 'Ahmed Hassan', email: 'ahmed.hassan@samman.com', phone: '+91 98765 43210', dept: 'Corporate Banking' },
        { name: 'Priya Sharma', email: 'priya.sharma@samman.com', phone: '+91 98765 43211', dept: 'Risk Management' },
        { name: 'Milan Jovic', email: 'milan.jovic@mirabank.rs', phone: '+381 63 123 4567', dept: 'Corporate Banking' },
        { name: 'Carlos Gutierrez', email: 'carlos.gutierrez@lulobank.co', phone: '+57 310 876 5432', dept: 'Credit Risk' },
        { name: 'Fatima El-Sayed', email: 'fatima.elsayed@beltone.eg', phone: '+20 100 876 5432', dept: 'Corporate Finance' },
        { name: 'Raj Patel', email: 'raj.patel@samman.com', phone: '+91 98765 43212', dept: 'Relationship Management' },
        { name: 'Maria Rodriguez', email: 'maria.rodriguez@lulobank.co', phone: '+57 320 654 3210', dept: 'Corporate Banking' },
        { name: 'Chen Wei', email: 'chen.wei@fwbl.pk', phone: '+92 321 987 6543', dept: 'Credit Administration' },
      ];
      const rmIdx = Math.round(noiseRange(0, rmProfiles.length - 1, sub.id, ci, 1322));
      const rm = rmProfiles[rmIdx];
      const rmName = rm.name;

      rows.push({
        subsidiary_id: sub.id,
        group_id: groupId,
        cust_id: custId,
        customer_name: borrower,
        date_of_disbursal: disbDate.toISOString().slice(0, 10),
        sanctioned_limit: sanctionedLimit,
        sanctioned_limit_usd: toUSD(sanctionedLimit, sub.currencyCode, FX_MAP),
        disbursed_amount: disbursedAmount,
        disbursed_amount_usd: toUSD(disbursedAmount, sub.currencyCode, FX_MAP),
        current_pos: currentPos,
        current_pos_usd: toUSD(currentPos, sub.currencyCode, FX_MAP),
        facility_type: facilityType,
        security_type: securityType,
        security_cover: securityCover,
        risk_rating: riskRating,
        covenant_category: covenantCategory,
        covenant_type: covenantType,
        covenant_description: covenantDescriptions[covenantType] || `${covenantType} covenant compliance required`,
        covenant_frequency: covenantFrequency,
        submission_date: submissionDate.toISOString().slice(0, 10),
        approval_for_extension: approvalForExtension,
        npa_flag: npaFlag,
        restructured_flag: restructuredFlag,
        watchlist_flag: watchlistFlag,
        writeoff_flag: writeoffFlag,
        creation_date: creationDate.toISOString().slice(0, 10),
        extended_closure_date: extendedClosureDate,
        rm_name: rmName,
        rm_email: rm.email,
        rm_phone: rm.phone,
        rm_department: rm.dept,
        breached: isBreached,
        days_since_breach: daysSinceBreach,
        report_date: REPORT_DATE,
        data_source_id: sub.dsOffset,
      });
    }
  }
  return rows;
}

// =============================================================================
// 15. corporate_delinquency (~5-10 per subsidiary)
// =============================================================================
function buildCorporateDelinquency(): Row[] {
  const rows: Row[] = [];

  for (const sub of SUBSIDIARIES) {
    const borrowers = CORPORATE_BORROWERS[sub.id];
    const sectors = CORPORATE_SECTORS[sub.id];
    const numDelinquent = Math.round(noiseRange(25, 40, sub.id, 1400));

    for (let di = 0; di < numDelinquent; di++) {
      const borrower = borrowers[(di * 2 + sub.id + 3) % borrowers.length];
      const sector = sectors[(di + sub.id + 1) % sectors.length];
      const industry = sector; // same as sector for simplicity

      const groupId = `GRP-${sub.shortCode}-D${(di + 1).toString().padStart(3, '0')}`;
      const custId = `CUS-${sub.shortCode}-D${(di + 1).toString().padStart(4, '0')}`;

      const sanctionedLimit = +(sub.aumLocal * noiseRange(0.005, 0.02, sub.id, di, 1401)).toFixed(2);
      const disbursedAmount = +(sanctionedLimit * noiseRange(0.75, 0.98, sub.id, di, 1402)).toFixed(2);
      const currentPos = +(disbursedAmount * noiseRange(0.85, 1.0, sub.id, di, 1403)).toFixed(2);

      const facilityType = pick(FACILITY_TYPES, sub.id, di, 1404);
      const securityType = pick(SECURITY_TYPES, sub.id, di, 1405);
      const securityCover = +noiseRange(0.5, 1.5, sub.id, di, 1406).toFixed(2);

      const ratingAtDisbNum = Math.round(noiseRange(3, 6, sub.id, di, 1407));
      const currentRatingNum = Math.round(noiseRange(5, 9, sub.id, di, 1408));
      const ratingMap: Record<number, string> = { 2: 'AA+', 3: 'AA', 4: 'A+', 5: 'A', 6: 'BBB+', 7: 'BBB', 8: 'BB+', 9: 'BB' };

      const renewalDone = noiseRange(0, 1, sub.id, di, 1409) > 0.4;
      const dpdAtMonthEnd = Math.round(noiseRange(1, 150, sub.id, di, 1410) * sub.delinqMult);
      const currentDpd = Math.round(noiseRange(1, 120, sub.id, di, 1411) * sub.delinqMult);

      const reason = pick(DELINQUENCY_REASONS, sub.id, di, 1412);
      const lastRemedial = pick(REMEDIAL_ACTIONS, sub.id, di, 1413);

      const updateOptions = [
        'Borrower has committed to clearing overdue by month-end',
        'Partial payment received. Follow-up in progress.',
        'Legal notice served. Awaiting response.',
        'Restructuring proposal under evaluation',
        'Recovery proceedings initiated',
        'Settlement offer being negotiated',
        'Insurance claim filed for collateral damage',
      ];
      const updateOnRemedial = pick(updateOptions, sub.id, di, 1414);

      const statusOptions = ['Overdue', 'Under Collection', 'Restructured', 'Legal Action', 'NPA'];
      const currentStatus = pick(statusOptions, sub.id, di, 1415);

      const nextStepOptions = [
        'Escalate to senior management', 'File SARFAESI notice', 'Initiate arbitration',
        'Schedule borrower meeting', 'Engage recovery agent', 'Monitor for 30 more days',
        'Refer to legal counsel', 'Prepare for write-off assessment',
      ];
      const nextStep = pick(nextStepOptions, sub.id, di, 1416);

      rows.push({
        subsidiary_id: sub.id,
        group_id: groupId,
        cust_id: custId,
        customer_name: borrower,
        sector,
        industry,
        sanctioned_limit: sanctionedLimit,
        sanctioned_limit_usd: toUSD(sanctionedLimit, sub.currencyCode, FX_MAP),
        disbursed_amount: disbursedAmount,
        disbursed_amount_usd: toUSD(disbursedAmount, sub.currencyCode, FX_MAP),
        current_pos: currentPos,
        current_pos_usd: toUSD(currentPos, sub.currencyCode, FX_MAP),
        facility_type: facilityType,
        security_type: securityType,
        security_cover: securityCover,
        rating_at_disbursement: ratingMap[ratingAtDisbNum] || 'A+',
        current_rating: ratingMap[currentRatingNum] || 'BB+',
        renewal_done: renewalDone,
        dpd_at_month_end: dpdAtMonthEnd,
        current_dpd: currentDpd,
        reason_for_delinquency: reason,
        last_remedial_action: lastRemedial,
        update_on_remedial: updateOnRemedial,
        current_status: currentStatus,
        next_step: nextStep,
        report_date: REPORT_DATE,
        data_source_id: sub.dsOffset,
      });
    }
  }
  return rows;
}

// =============================================================================
// 15b. corporate_par_trend (~24 per subsidiary: 6 periods x 4 buckets)
// =============================================================================
function buildCorporatePARTrend(): Row[] {
  const rows: Row[] = [];
  const periods = ["Jan'26", "Feb'26", "Mar'26", "Apr'26", "May'26", "Jun'26"];
  const buckets = ['X+', '30+', '60+', '90+'];
  const baseRates: Record<string, number> = { 'X+': 0.08, '30+': 0.05, '60+': 0.03, '90+': 0.015 };

  for (const sub of SUBSIDIARIES) {
    const corpPosBase = sub.aumLocal * 0.25;

    for (let pi = 0; pi < periods.length; pi++) {
      const period = periods[pi];
      const totalPos = +(corpPosBase * noiseRange(0.9, 1.1, sub.id, pi, 2000)).toFixed(2);

      for (let bi = 0; bi < buckets.length; bi++) {
        const bucket = buckets[bi];
        const base = baseRates[bucket] * sub.delinqMult;
        // Time variation: slight trend with noise
        const trendFactor = 1 + (pi - 3) * noiseRange(-0.015, 0.025, sub.id, pi, bi, 2001);
        const parRate = +(base * trendFactor * noiseRange(0.7, 1.3, sub.id, pi, bi, 2002)).toFixed(4);
        const delinquentPos = +(totalPos * parRate).toFixed(2);

        rows.push({
          subsidiary_id: sub.id,
          period,
          dpd_bucket: bucket,
          par_rate: parRate,
          total_pos: totalPos,
          total_pos_usd: toUSD(totalPos, sub.currencyCode, FX_MAP),
          delinquent_pos: delinquentPos,
          delinquent_pos_usd: toUSD(delinquentPos, sub.currencyCode, FX_MAP),
          report_date: REPORT_DATE,
          data_source_id: sub.dsOffset,
        });
      }
    }
  }
  return rows;
}

// =============================================================================
// 16. corporate_portfolio_metrics (~12 per subsidiary: 4 particulars x 3 periods)
// =============================================================================
function buildCorporatePortfolioMetrics(): Row[] {
  const rows: Row[] = [];

  const particulars = ['Sanctioned Limit', 'Disbursement Limit', 'Outstanding', 'Stage 2+3', 'Provisions', 'Disbursement (for the month)', 'Repayments (for the month)', 'Net Change', 'Growth Rate (in % vs earlier year)'];
  const periods = ["Jun'25", "Jul'25", "Aug'25"];

  for (const sub of SUBSIDIARIES) {
    const corpBook = sub.aumLocal * noiseRange(0.25, 0.45, sub.id, 1500);

    for (let pi = 0; pi < periods.length; pi++) {
      const period = periods[pi];
      const n = noise(sub.id, pi, 1501);

      for (let pai = 0; pai < particulars.length; pai++) {
        const particular = particulars[pai];
        let total: number;
        let fundBased: number;
        let nonFundBased: number;

        switch (particular) {
          case 'Sanctioned Limit': {
            total = +(corpBook * noiseRange(1.2, 1.5, sub.id, pi, 1502) * n).toFixed(2);
            fundBased = +(total * noiseRange(0.65, 0.75, sub.id, pi, 1503)).toFixed(2);
            nonFundBased = +(total - fundBased).toFixed(2);
            break;
          }
          case 'Disbursement Limit': {
            const sanctionedTotal = +(corpBook * noiseRange(1.2, 1.5, sub.id, pi, 1502) * n).toFixed(2);
            total = +(sanctionedTotal * noiseRange(0.80, 0.90, sub.id, pi, 1530)).toFixed(2);
            fundBased = +(total * noiseRange(0.67, 0.73, sub.id, pi, 1531)).toFixed(2);
            nonFundBased = +(total - fundBased).toFixed(2);
            break;
          }
          case 'Outstanding': {
            total = +(corpBook * noiseRange(0.80, 0.95, sub.id, pi, 1504) * n).toFixed(2);
            fundBased = +(total * noiseRange(0.70, 0.80, sub.id, pi, 1505)).toFixed(2);
            nonFundBased = +(total - fundBased).toFixed(2);
            break;
          }
          case 'Stage 2+3': {
            const s23Pct = noiseRange(0.04, 0.10, sub.id, pi, 1506) * sub.delinqMult;
            total = +(corpBook * s23Pct * n).toFixed(2);
            fundBased = +(total * noiseRange(0.75, 0.85, sub.id, pi, 1507)).toFixed(2);
            nonFundBased = +(total - fundBased).toFixed(2);
            break;
          }
          case 'Provisions': {
            const provPct = noiseRange(0.01, 0.03, sub.id, pi, 1508) * sub.delinqMult;
            total = +(corpBook * provPct * n).toFixed(2);
            fundBased = +(total * noiseRange(0.80, 0.90, sub.id, pi, 1509)).toFixed(2);
            nonFundBased = +(total - fundBased).toFixed(2);
            break;
          }
          case 'Disbursement (for the month)': {
            total = +(corpBook * noiseRange(0.05, 0.12, sub.id, pi, 1520) * n).toFixed(2);
            fundBased = +(total * noiseRange(0.65, 0.75, sub.id, pi, 1521)).toFixed(2);
            nonFundBased = +(total - fundBased).toFixed(2);
            break;
          }
          case 'Repayments (for the month)': {
            total = +(corpBook * noiseRange(0.04, 0.10, sub.id, pi, 1522) * n).toFixed(2);
            fundBased = +(total * noiseRange(0.65, 0.78, sub.id, pi, 1523)).toFixed(2);
            nonFundBased = +(total - fundBased).toFixed(2);
            break;
          }
          case 'Net Change': {
            const disb = corpBook * noiseRange(0.05, 0.12, sub.id, pi, 1520) * n;
            const repay = corpBook * noiseRange(0.04, 0.10, sub.id, pi, 1522) * n;
            total = +(disb - repay).toFixed(2);
            fundBased = +(total * noiseRange(0.60, 0.80, sub.id, pi, 1524)).toFixed(2);
            nonFundBased = +(total - fundBased).toFixed(2);
            break;
          }
          case 'Growth Rate (in % vs earlier year)': {
            total = +(noiseRange(0.02, 0.08, sub.id, pi, 1525)).toFixed(4);
            fundBased = +(noiseRange(0.02, 0.10, sub.id, pi, 1526)).toFixed(4);
            nonFundBased = +(noiseRange(0.01, 0.06, sub.id, pi, 1527)).toFixed(4);
            break;
          }
          default: {
            total = 0;
            fundBased = 0;
            nonFundBased = 0;
          }
        }

        rows.push({
          subsidiary_id: sub.id,
          particular,
          period,
          total,
          total_usd: toUSD(total, sub.currencyCode, FX_MAP),
          fund_based: fundBased,
          fund_based_usd: toUSD(fundBased, sub.currencyCode, FX_MAP),
          non_fund_based: nonFundBased,
          non_fund_based_usd: toUSD(nonFundBased, sub.currencyCode, FX_MAP),
          report_date: REPORT_DATE,
          data_source_id: sub.dsOffset,
        });
      }
    }
  }
  return rows;
}

// =============================================================================
// Clear only the 18 new tables (FK-safe order)
// =============================================================================
async function clearNewTables() {
  const tables = [
    'corporate_pipeline',
    'corporate_par_trend',
    'corporate_pd_distribution',
    'corporate_portfolio_metrics',
    'corporate_delinquency',
    'corporate_covenants',
    'corporate_watchlist',
    'country_risk',
    'fx_risk',
    'ews_facility_alerts',
    'ews_entity_summary',
    'trade_watchlist',
    'trade_collection_efficiency',
    'trade_concentrations',
    'trade_rating_distribution',
    'trade_asset_quality',
    'trade_product_mix',
    'trade_entity_performance',
    'trade_facilities',
  ];
  for (const t of tables) {
    const { error } = await supabase.from(t).delete().gte('id', 0);
    if (error && !error.message.includes('does not exist')) {
      console.error(`  WARN: could not clear ${t}: ${error.message}`);
    }
  }
  console.log('Cleared 18 new tables.\n');
}

// =============================================================================
// Main
// =============================================================================
async function main() {
  console.log('=== Trade Finance, Corporate Finance, EWS & Risk — Seed Script ===\n');

  // 0. Clear only the 18 new tables
  console.log('Clearing new tables...');
  await clearNewTables();

  // 1. Trade Finance tables
  console.log('--- Trade Finance Tables ---');

  console.log('Seeding trade_facilities...');
  await batchInsert('trade_facilities', buildTradeFacilities());

  console.log('Seeding trade_entity_performance...');
  await batchInsert('trade_entity_performance', buildTradeEntityPerformance(), 500, true);

  console.log('Seeding trade_product_mix...');
  await batchInsert('trade_product_mix', buildTradeProductMix());

  console.log('Seeding trade_asset_quality...');
  await batchInsert('trade_asset_quality', buildTradeAssetQuality());

  console.log('Seeding trade_rating_distribution...');
  await batchInsert('trade_rating_distribution', buildTradeRatingDistribution());

  console.log('Seeding trade_concentrations...');
  await batchInsert('trade_concentrations', buildTradeConcentrations());

  console.log('Seeding trade_collection_efficiency...');
  await batchInsert('trade_collection_efficiency', buildTradeCollectionEfficiency());

  console.log('Seeding trade_watchlist...');
  await batchInsert('trade_watchlist', buildTradeWatchlist());

  // 2. EWS tables
  console.log('\n--- EWS Tables ---');

  console.log('Seeding ews_entity_summary...');
  await batchInsert('ews_entity_summary', buildEwsEntitySummary());

  console.log('Seeding ews_facility_alerts...');
  await batchInsert('ews_facility_alerts', buildEwsFacilityAlerts());

  // 3. Risk tables
  console.log('\n--- Risk Tables ---');

  console.log('Seeding fx_risk...');
  await batchInsert('fx_risk', buildFxRisk());

  console.log('Seeding country_risk...');
  await batchInsert('country_risk', buildCountryRisk());

  // 4. Corporate Finance tables
  console.log('\n--- Corporate Finance Tables ---');

  console.log('Seeding corporate_watchlist...');
  await batchInsert('corporate_watchlist', buildCorporateWatchlist());

  console.log('Seeding corporate_covenants...');
  await batchInsert('corporate_covenants', buildCorporateCovenants());

  console.log('Seeding corporate_delinquency...');
  await batchInsert('corporate_delinquency', buildCorporateDelinquency());

  console.log('Seeding corporate_par_trend...');
  await batchInsert('corporate_par_trend', buildCorporatePARTrend());

  console.log('Seeding corporate_portfolio_metrics...');
  await batchInsert('corporate_portfolio_metrics', buildCorporatePortfolioMetrics());

  console.log('\n=== Seeding complete! ===');
}

main().catch((err) => {
  console.error('Seed script failed:', err);
  process.exit(1);
});
