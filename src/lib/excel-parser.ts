import * as XLSX from 'xlsx';
import type {
  TradeFacility, EntityPerformance, ProductMixRow, AssetQualityByEntity,
  RatingDistribution, ConcentrationNode, CollectionEfficiency, WatchlistSummary,
  WatchlistAccount, EWSEntitySummary, EWSFacilityAlert, FXRiskRow, CountryRiskRow,
  PortfolioSummary, ConsumerMetricRow, ConsumerProductData, NetFlowRow,
  RollRateTimeSeries, VintagePoint,
  CorporateWatchlistRow, IFRSStage, RAGStatus, PortfolioData,
} from './types';

// ── Helpers ────────────────────────────────────────────────────────
function num(v: unknown): number {
  if (v == null) return 0;
  const n = typeof v === 'number' ? v : parseFloat(String(v).replace(/[,$%]/g, ''));
  return isNaN(n) ? 0 : n;
}

function str(v: unknown): string {
  if (v == null) return '';
  return String(v).trim();
}

function bool(v: unknown): boolean {
  if (v == null) return false;
  const s = String(v).toLowerCase().trim();
  return s === 'yes' || s === 'true' || s === '1';
}

function parseRAG(v: unknown): RAGStatus {
  const s = str(v).toLowerCase();
  if (s.includes('red') || s.includes('🔴')) return 'Red';
  if (s.includes('amber') || s.includes('warning') || s.includes('🟡') || s.includes('elevated')) return 'Amber';
  return 'Green';
}

function parseStage(v: unknown): IFRSStage {
  const s = str(v);
  if (s.includes('3')) return 'Stage 3';
  if (s.includes('2')) return 'Stage 2';
  return 'Stage 1';
}

function dateStr(v: unknown): string {
  if (!v) return '';
  if (v instanceof Date) return v.toISOString().split('T')[0];
  const s = String(v);
  const d = new Date(s);
  return isNaN(d.getTime()) ? s : d.toISOString().split('T')[0];
}

function getRows(wb: XLSX.WorkBook, sheetName: string): Record<string, unknown>[] {
  const ws = wb.Sheets[sheetName];
  if (!ws) return [];
  return XLSX.utils.sheet_to_json(ws, { defval: null, raw: true });
}

function getRawGrid(wb: XLSX.WorkBook, sheetName: string): unknown[][] {
  const ws = wb.Sheets[sheetName];
  if (!ws) return [];
  return XLSX.utils.sheet_to_json(ws, { header: 1, defval: null, raw: true });
}

function colKey(row: Record<string, unknown>, ...candidates: string[]): unknown {
  for (const c of candidates) {
    const lc = c.toLowerCase();
    for (const key of Object.keys(row)) {
      if (key.toLowerCase().includes(lc)) return row[key];
    }
  }
  return null;
}

// ── Trade Finance Parser ──────────────────────────────────────────
function parseTradeFinanceRawData(wb: XLSX.WorkBook): TradeFacility[] {
  const rows = getRows(wb, 'Raw Data');
  return rows.map(r => ({
    facilityReference: str(colKey(r, 'Facility Reference')),
    entity: str(colKey(r, 'Entity')),
    obligorName: str(colKey(r, 'Obligor Name')),
    region: str(colKey(r, 'Region')),
    country: str(colKey(r, 'Country')),
    sector: str(colKey(r, 'Sector')),
    commodity: str(colKey(r, 'Commodity')),
    productType: str(colKey(r, 'Product Type')),
    currency: str(colKey(r, 'Currency')),
    facilityLimit: num(colKey(r, 'Facility Limit')),
    outstanding: num(colKey(r, 'Outstanding (USD')),
    prevMonthOutstanding: num(colKey(r, 'Prev Month')),
    tenorDays: num(colKey(r, 'Tenor')),
    startDate: dateStr(colKey(r, 'Start Date')),
    maturityDate: dateStr(colKey(r, 'Maturity Date')),
    internalRating: num(colKey(r, 'Internal Rating')),
    externalRating: str(colKey(r, 'External Rating')),
    daysPastDue: num(colKey(r, 'Days Past Due')),
    ifrs9Stage: parseStage(colKey(r, 'IFRS 9 Stage')),
    provisionRate: num(colKey(r, 'Provision Rate')),
    provisionAmount: num(colKey(r, 'Provision Amount')),
    collateralValue: num(colKey(r, 'Collateral Value')),
    collateralCoverage: num(colKey(r, 'Collateral Coverage')),
    riskWeight: num(colKey(r, 'Risk Weight')),
    counterpartyBank: str(colKey(r, 'Counterparty Bank')) || null,
    watchlistFlag: bool(colKey(r, 'Watchlist Flag')),
    ewsScore: num(colKey(r, 'EWS Score')),
    ewsTriggers: str(colKey(r, 'EWS Triggers')) || null,
  })).filter(f => f.facilityReference);
}

function parseEntityPerformance(wb: XLSX.WorkBook): EntityPerformance[] {
  const grid = getRawGrid(wb, 'Entity Performance');
  const results: EntityPerformance[] = [];
  let headerIdx = -1;
  for (let i = 0; i < grid.length; i++) {
    if (str(grid[i]?.[0]).includes('Entity') && str(grid[i]?.[1]).includes('Geography')) {
      headerIdx = i;
      break;
    }
  }
  if (headerIdx < 0) return results;
  for (let i = headerIdx + 1; i < grid.length; i++) {
    const row = grid[i];
    if (!row || !row[0] || str(row[0]).includes('GROUP TOTAL')) {
      if (str(row?.[0]).includes('GROUP TOTAL')) {
        results.push({
          entity: 'GROUP TOTAL',
          geography: '',
          approvedLimit: num(row[2]),
          outstanding: num(row[3]),
          headroom: num(row[4]),
          utilization: num(row[5]),
          stage1: num(row[6]),
          stage2: num(row[7]),
          stage3: num(row[8]),
          provisions: num(row[9]),
          provisionCoverage: num(row[10]),
          ragStatus: parseRAG(row[11]),
        });
      }
      continue;
    }
    results.push({
      entity: str(row[0]),
      geography: str(row[1]),
      approvedLimit: num(row[2]),
      outstanding: num(row[3]),
      headroom: num(row[4]),
      utilization: num(row[5]),
      stage1: num(row[6]),
      stage2: num(row[7]),
      stage3: num(row[8]),
      provisions: num(row[9]),
      provisionCoverage: num(row[10]),
      ragStatus: parseRAG(row[11]),
    });
  }
  return results;
}

function parseProductMix(wb: XLSX.WorkBook): ProductMixRow[] {
  const grid = getRawGrid(wb, 'Product Mix');
  const results: ProductMixRow[] = [];
  let headerIdx = -1;
  for (let i = 0; i < grid.length; i++) {
    if (str(grid[i]?.[0]).includes('Product Type')) {
      headerIdx = i;
      break;
    }
  }
  if (headerIdx < 0) return results;
  for (let i = headerIdx + 1; i < grid.length; i++) {
    const row = grid[i];
    if (!row || !row[0] || str(row[0]) === 'TOTAL') continue;
    results.push({
      productType: str(row[0]),
      facilities: num(row[1]),
      limit: num(row[2]),
      outstanding: num(row[3]),
      portfolioShare: num(row[4]),
      avgTenor: num(row[5]),
      utilization: num(row[6]),
      stage2Plus3: num(row[7]),
      avgRating: num(row[8]),
      watchlistCount: num(row[9]),
    });
  }
  return results;
}

function parseAssetQuality(wb: XLSX.WorkBook): { byEntity: AssetQualityByEntity[]; ratingDist: RatingDistribution[] } {
  const grid = getRawGrid(wb, 'Asset Quality');
  const byEntity: AssetQualityByEntity[] = [];
  const ratingDist: RatingDistribution[] = [];

  let section = 0;
  for (let i = 0; i < grid.length; i++) {
    const label = str(grid[i]?.[0]);
    if (label.includes('1. IFRS 9 STAGING')) { section = 1; continue; }
    if (label.includes('2.')) { section = 2; continue; }
    if (label.includes('Entity') && section === 1) continue;

    if (section === 1 && grid[i]?.[0] && !label.includes('TOTAL') && !label.includes('IFRS')) {
      const row = grid[i];
      byEntity.push({
        entity: str(row[0]),
        stage1Count: num(row[1]),
        stage1Balance: num(row[2]),
        stage2Count: num(row[3]),
        stage2Balance: num(row[4]),
        stage3Count: num(row[5]),
        stage3Balance: num(row[6]),
        stage2Plus3Pct: num(row[7]),
        provisionCoverage: num(row[8]),
        rag: parseRAG(row[9]),
      });
    }

    if (section === 2 && grid[i]?.[0] && !label.includes('Rating') && !label.includes('TOTAL')) {
      const row = grid[i];
      ratingDist.push({
        ratingBand: str(row[0]),
        count: num(row[1]),
        balance: num(row[2]),
        portfolioShare: num(row[3]),
        avgProvision: num(row[4]),
      });
    }
  }

  return { byEntity, ratingDist };
}

function parseConcentrations(wb: XLSX.WorkBook): ConcentrationNode[] {
  const grid = getRawGrid(wb, 'Concentrations');
  const nodes: ConcentrationNode[] = [];
  let section = '';

  for (let i = 0; i < grid.length; i++) {
    const label = str(grid[i]?.[0]);
    if (label.includes('TOP 20 OBLIGOR')) { section = 'obligor'; continue; }
    if (label.includes('SECTOR')) { section = 'sector'; continue; }
    if (label.includes('Rank') || label.includes('Sector') || label.includes('TOTAL') || !grid[i]?.[0]) continue;

    const row = grid[i];
    if (section === 'obligor' && row[1]) {
      nodes.push({
        name: str(row[1]),
        entity: str(row[2]),
        category: 'obligor',
        value: num(row[4]),
        portfolioShare: num(row[5]),
        facilities: num(row[3]),
        rating: num(row[6]),
      });
    }
    if (section === 'sector' && row[0]) {
      nodes.push({
        name: str(row[0]),
        entity: '',
        category: 'sector',
        value: num(row[2]),
        portfolioShare: num(row[3]),
        facilities: num(row[1]),
        rating: str(row[5]),
      });
    }
  }
  return nodes;
}

function parseCollectionEfficiency(wb: XLSX.WorkBook): CollectionEfficiency[] {
  const grid = getRawGrid(wb, 'Collections & Efficiency');
  const results: CollectionEfficiency[] = [];
  let headerIdx = -1;
  for (let i = 0; i < grid.length; i++) {
    if (str(grid[i]?.[0]) === 'Entity') {
      headerIdx = i;
      break;
    }
  }
  if (headerIdx < 0) return results;
  for (let i = headerIdx + 1; i < grid.length; i++) {
    const row = grid[i];
    if (!row?.[0] || str(row[0]).includes('GROUP TOTAL')) continue;
    results.push({
      entity: str(row[0]),
      collectionEfficiencyRatio: num(row[1]),
      overdueRatio: num(row[2]),
      avgDPD: num(row[3]),
      recoveryRate: row[4] != null ? num(row[4]) : null,
      rolloverRate: num(row[5]),
      provisionOutstanding: num(row[6]),
      rag: parseRAG(row[7]),
    });
  }
  return results;
}

function parseWatchlist(wb: XLSX.WorkBook): { summary: WatchlistSummary[]; accounts: WatchlistAccount[] } {
  const grid = getRawGrid(wb, 'Watchlist');
  const summary: WatchlistSummary[] = [];
  const accounts: WatchlistAccount[] = [];
  let section = 0;

  for (let i = 0; i < grid.length; i++) {
    const label = str(grid[i]?.[0]);
    if (label.includes('1. WATCHLIST SUMMARY')) { section = 1; continue; }
    if (label.includes('2.')) { section = 2; continue; }
    if (label.includes('Entity') && section === 1) continue;
    if (label.includes('Facility') && section === 2) continue;

    if (section === 1 && grid[i]?.[0] && !label.includes('GROUP') && !label.includes('TOTAL')) {
      const row = grid[i];
      summary.push({
        entity: str(row[0]),
        watchlistCount: num(row[1]),
        watchlistExposure: num(row[2]),
        entityPortfolioShare: num(row[3]),
        ewsScore2PlusCount: num(row[4]),
        ewsScore2PlusExposure: num(row[5]),
        stage2Plus3Count: num(row[6]),
        rag: parseRAG(row[7]),
      });
    }

    if (section === 2 && grid[i]?.[0] && label.startsWith('TF-')) {
      const row = grid[i];
      accounts.push({
        facilityRef: str(row[0]),
        entity: str(row[1]),
        obligorName: str(row[2]),
        productType: str(row[3]),
        outstanding: num(row[4]),
        dpd: num(row[5]),
        stage: parseStage(row[6]),
        rating: num(row[7]),
        ewsScore: num(row[8]),
        triggers: str(row[9]),
        action: str(row[10]),
      });
    }
  }
  return { summary, accounts };
}

function parseEWSDashboard(wb: XLSX.WorkBook): { summary: EWSEntitySummary[]; alerts: EWSFacilityAlert[] } {
  const grid = getRawGrid(wb, 'EWS Dashboard');
  const summary: EWSEntitySummary[] = [];
  const alerts: EWSFacilityAlert[] = [];
  let section = 0;

  for (let i = 0; i < grid.length; i++) {
    const label = str(grid[i]?.[0]);
    if (label.includes('1. EWS SCORE SUMMARY')) { section = 1; continue; }
    if (label.includes('2.')) { section = 2; continue; }
    if (label.includes('Entity') && section === 1) continue;
    if (label.includes('Facility') && section === 2) continue;

    if (section === 1 && grid[i]?.[0] && !label.includes('GROUP') && !label.includes('TOTAL')) {
      const row = grid[i];
      summary.push({
        entity: str(row[0]),
        score0: num(row[1]),
        score1: num(row[2]),
        score2: num(row[3]),
        score3: num(row[4]),
        score4Plus: num(row[5]),
        totalFacilities: num(row[6]),
        avgEWSScore: num(row[7]),
        flaggedExposure: num(row[8]),
        rag: parseRAG(row[9]),
      });
    }

    if (section === 2 && grid[i]?.[0] && str(grid[i]?.[0]).startsWith('TF-')) {
      const row = grid[i];
      alerts.push({
        facilityRef: str(row[0]),
        entity: str(row[1]),
        obligor: str(row[2]),
        ewsScore: num(row[3]),
        outstanding: num(row[4]),
        triggers: str(row[5]),
        stage: parseStage(row[6]),
        action: str(row[7]),
      });
    }
  }
  return { summary, alerts };
}

function parseFXRisk(wb: XLSX.WorkBook): FXRiskRow[] {
  const grid = getRawGrid(wb, 'Macro & External Risk');
  const results: FXRiskRow[] = [];
  let headerIdx = -1;
  for (let i = 0; i < grid.length; i++) {
    if (str(grid[i]?.[0]) === 'Entity' && str(grid[i]?.[1]).includes('Currency')) {
      headerIdx = i;
      break;
    }
  }
  if (headerIdx < 0) return results;
  for (let i = headerIdx + 1; i < grid.length; i++) {
    const row = grid[i];
    if (!row?.[0] || str(row[0]).includes('COMPOSITE') || str(row[0]).includes('—')) break;
    results.push({
      entity: str(row[0]),
      primaryCurrency: str(row[1]),
      fxRate: num(row[2]),
      volatility30Day: num(row[3]),
      volatility90Day: num(row[4]),
      ytdDepreciation: num(row[5]),
      portfolioExposure: num(row[6]),
      fxImpact: num(row[7]),
      capitalControls: bool(row[8]),
      transferRisk: str(row[9]),
      rag: parseRAG(row[10]),
    });
  }
  return results;
}

function parseCountryRisk(wb: XLSX.WorkBook): CountryRiskRow[] {
  const grid = getRawGrid(wb, 'Macro & External Risk');
  const results: CountryRiskRow[] = [];
  let headerIdx = -1;
  for (let i = 0; i < grid.length; i++) {
    if (str(grid[i]?.[0]).includes('Entity') && str(grid[i]?.[1]).includes('Sovereign')) {
      headerIdx = i;
      break;
    }
  }
  if (headerIdx < 0) return results;
  for (let i = headerIdx + 1; i < grid.length; i++) {
    const row = grid[i];
    if (!row?.[0] || str(row[0]).includes('COMPOSITE') || str(row[0]).includes('—')) break;
    results.push({
      entity: str(row[0]),
      sovereignRating: num(row[1]),
      countryRiskScore: num(row[2]),
      regulatoryScore: num(row[3]),
      politicalStabilityScore: num(row[4]),
      compositeScore: num(row[5]),
      exposure: num(row[6]),
      rwaShare: num(row[7]),
      capitalImpact: num(row[8]),
      recommendation: str(row[9]),
      rag: parseRAG(row[10]),
    });
  }
  return results;
}

function parseTradeExecutiveSummary(wb: XLSX.WorkBook, facilities: TradeFacility[]): PortfolioSummary {
  const totalAUM = facilities.reduce((s, f) => s + f.outstanding, 0);
  const prevAUM = facilities.reduce((s, f) => s + f.prevMonthOutstanding, 0);
  const stage3 = facilities.filter(f => f.ifrs9Stage === 'Stage 3');
  const stage2 = facilities.filter(f => f.ifrs9Stage === 'Stage 2');
  const totalProvisions = facilities.reduce((s, f) => s + f.provisionAmount, 0);
  const watchlist = facilities.filter(f => f.watchlistFlag);

  return {
    totalAUM,
    totalFacilities: facilities.length,
    newBookings: 0,
    momChange: totalAUM - prevAUM,
    momChangePercent: prevAUM > 0 ? (totalAUM - prevAUM) / prevAUM : 0,
    nplRatio: totalAUM > 0 ? stage3.reduce((s, f) => s + f.outstanding, 0) / totalAUM : 0,
    stage2Plus3Pct: totalAUM > 0
      ? (stage2.reduce((s, f) => s + f.outstanding, 0) + stage3.reduce((s, f) => s + f.outstanding, 0)) / totalAUM
      : 0,
    provisionCoverage: totalAUM > 0 ? totalProvisions / totalAUM : 0,
    delinquency30Plus: totalAUM > 0 ? facilities.filter(f => f.daysPastDue >= 30).reduce((s, f) => s + f.outstanding, 0) / totalAUM : 0,
    delinquency90Plus: totalAUM > 0 ? facilities.filter(f => f.daysPastDue >= 90).reduce((s, f) => s + f.outstanding, 0) / totalAUM : 0,
    writeOffRate: 0,
    collectionEfficiency: 0,
    avgEWSScore: facilities.length > 0 ? facilities.reduce((s, f) => s + f.ewsScore, 0) / facilities.length : 0,
    watchlistCount: watchlist.length,
    watchlistExposure: watchlist.reduce((s, f) => s + f.outstanding, 0),
  };
}

// ── Consumer Finance Parser ───────────────────────────────────────
function parseConsumerOverall(wb: XLSX.WorkBook): ConsumerMetricRow[] {
  const grid = getRawGrid(wb, 'Over All Level');
  const results: ConsumerMetricRow[] = [];
  if (!grid.length) return results;

  // Row 0 is headers: Metric Type, Metric, Apr'25, May'25, etc.
  const headerRow = grid[0];
  const months: string[] = [];
  for (let c = 2; c <= 6; c++) {
    if (headerRow?.[c]) months.push(str(headerRow[c]));
  }

  let currentMetricType = '';
  for (let i = 1; i < grid.length; i++) {
    const row = grid[i];
    if (!row) continue;
    if (row[0] && str(row[0]) !== 'NaN') currentMetricType = str(row[0]);
    const metric = str(row[1]);
    if (!metric) continue;

    const values: Record<string, number | string | null> = {};
    months.forEach((m, idx) => {
      const v = row[idx + 2];
      values[m] = v != null ? num(v) : null;
    });

    results.push({
      metricType: currentMetricType,
      metric,
      values,
      benchmark: row[7] != null ? num(row[7]) : null,
    });
  }
  return results;
}

function parseConsumerProducts(wb: XLSX.WorkBook): ConsumerProductData[] {
  const grid = getRawGrid(wb, 'Product wise');
  const results: ConsumerProductData[] = [];
  if (!grid.length) return results;

  let currentProduct = '';
  let currentMetricType = '';
  let currentProductData: ConsumerMetricRow[] = [];

  for (let i = 0; i < grid.length; i++) {
    const row = grid[i];
    if (!row) continue;

    if (row[0] && str(row[0]) !== 'NaN' && str(row[0]).trim()) {
      if (currentProduct && currentProductData.length) {
        results.push({ productName: currentProduct, metrics: currentProductData });
      }
      currentProduct = str(row[0]);
      currentProductData = [];
      currentMetricType = '';
    }

    if (row[1] && str(row[1]).trim()) currentMetricType = str(row[1]);
    const metric = str(row[2]);
    if (!metric) continue;

    const values: Record<string, number | string | null> = {};
    const monthHeaders = ["Apr'25", "May'25", "Jun'25", "Jul'25", "Aug'25"];
    monthHeaders.forEach((m, idx) => {
      values[m] = row[idx + 3] != null ? num(row[idx + 3]) : null;
    });

    currentProductData.push({
      metricType: currentMetricType,
      metric,
      values,
      benchmark: row[8] != null ? num(row[8]) : null,
    });
  }

  if (currentProduct && currentProductData.length) {
    results.push({ productName: currentProduct, metrics: currentProductData });
  }
  return results;
}

function parseNetFlowRates(wb: XLSX.WorkBook): NetFlowRow[] {
  const grid = getRawGrid(wb, 'Net Flow Rate');
  const results: NetFlowRow[] = [];
  if (!grid.length) return results;

  const months: string[] = [];
  const headerRow = grid[0];
  if (headerRow) {
    for (let c = 1; c < headerRow.length; c++) {
      if (headerRow[c]) months.push(dateStr(headerRow[c]) || str(headerRow[c]));
    }
  }

  for (let i = 1; i < grid.length; i++) {
    const row = grid[i];
    const bucket = str(row?.[0]);
    if (!bucket) continue;

    const values: Record<string, number> = {};
    months.forEach((m, idx) => {
      if (row[idx + 1] != null) values[m] = num(row[idx + 1]);
    });

    results.push({ bucket, values });
  }
  return results;
}

function parseStaticPool(wb: XLSX.WorkBook): VintagePoint[] {
  const grid = getRawGrid(wb, 'Static Pool');
  const points: VintagePoint[] = [];
  if (!grid.length) return points;

  // The static pool has sections: X+, 30+, 60+, 90+, Gross Loss, Recoveries, NCL
  // Each section: [portfolio, Month, LA, MOB_1, MOB_2, ...]
  const headerRow = grid[0];
  const metricTypes: string[] = [];
  const metricStartCols: number[] = [];

  if (headerRow) {
    for (let c = 0; c < headerRow.length; c++) {
      const val = str(headerRow[c]);
      if (['X+', '30+', '60+', '90+', 'Gross Loss', 'Recoveries', 'NCL'].includes(val)) {
        metricTypes.push(val);
        metricStartCols.push(c);
      }
    }
  }

  // Parse each section
  for (let s = 0; s < metricTypes.length; s++) {
    const startCol = metricStartCols[s];
    const mobRow = grid[0]; // MOB numbers are in first data row under each section header

    for (let i = 1; i < grid.length; i++) {
      const row = grid[i];
      if (!row) continue;
      const vintage = str(row[startCol + 1]); // Month column
      const la = num(row[startCol + 2]); // LA column
      if (!vintage || vintage.includes('Total')) continue;

      // MOB columns start at startCol + 3
      for (let m = startCol + 3; m < (metricStartCols[s + 1] || headerRow.length); m++) {
        const mobNum = num(mobRow?.[m]);
        const rate = row[m] != null ? num(row[m]) : NaN;
        if (!isNaN(rate) && mobNum > 0) {
          points.push({
            vintage,
            loanAmount: la,
            mob: mobNum,
            delinquencyRate: rate,
            metricType: metricTypes[s],
          });
        }
      }
    }
  }
  return points;
}

function parseRollRateTimeSeries(wb: XLSX.WorkBook): RollRateTimeSeries[] {
  const grid = getRawGrid(wb, 'Roll Rate');
  const results: RollRateTimeSeries[] = [];
  if (!grid.length) return results;

  const dates: string[] = [];
  const headerRow = grid[0];
  if (headerRow) {
    for (let c = 1; c < headerRow.length; c++) {
      if (headerRow[c]) dates.push(dateStr(headerRow[c]) || str(headerRow[c]));
    }
  }

  for (let i = 1; i < grid.length; i++) {
    const row = grid[i];
    const metric = str(row?.[0]);
    if (!metric) continue;

    const values: Record<string, number> = {};
    dates.forEach((d, idx) => {
      if (row[idx + 1] != null) values[d] = num(row[idx + 1]);
    });

    results.push({ metric, values });
  }
  return results;
}

// ── Corporate Finance Parser ──────────────────────────────────────
function parseCorporateWatchlist(wb: XLSX.WorkBook): CorporateWatchlistRow[] {
  const rows = getRows(wb, 'Watchlist Tracking');
  return rows.map(r => ({
    borrower: str(colKey(r, 'Borrower')),
    sector: str(colKey(r, 'Sector')),
    exposure: str(colKey(r, 'Exposure')),
    ewsTriggerType: str(colKey(r, 'EWS Trigger')),
    internalRating: str(colKey(r, 'Internal Rating')),
    status: str(colKey(r, 'Status')),
    remedialAction: str(colKey(r, 'Remedial Action')),
  })).filter(r => r.borrower);
}

// ── Main Parser ───────────────────────────────────────────────────
export function parseTradeFinancePQR(buffer: Buffer): Partial<PortfolioData> {
  const wb = XLSX.read(buffer, { type: 'buffer', cellDates: true });
  const tradeFacilities = parseTradeFinanceRawData(wb);
  const entityPerformance = parseEntityPerformance(wb);
  const productMix = parseProductMix(wb);
  const { byEntity: assetQuality, ratingDist: ratingDistribution } = parseAssetQuality(wb);
  const concentrationNodes = parseConcentrations(wb);
  const collectionEfficiency = parseCollectionEfficiency(wb);
  const { summary: watchlistSummary, accounts: watchlistAccounts } = parseWatchlist(wb);
  const { summary: ewsEntitySummary, alerts: ewsFacilityAlerts } = parseEWSDashboard(wb);
  const fxRisk = parseFXRisk(wb);
  const countryRisk = parseCountryRisk(wb);
  const tradeExecutiveSummary = parseTradeExecutiveSummary(wb, tradeFacilities);

  return {
    tradeFacilities,
    entityPerformance,
    productMix,
    assetQuality,
    ratingDistribution,
    concentrationNodes,
    collectionEfficiency,
    watchlistSummary,
    watchlistAccounts,
    ewsEntitySummary,
    ewsFacilityAlerts,
    fxRisk,
    countryRisk,
    tradeExecutiveSummary,
  };
}

export function parseConsumerFinancePQR(buffer: Buffer): Partial<PortfolioData> {
  const wb = XLSX.read(buffer, { type: 'buffer', cellDates: true });
  return {
    consumerOverall: parseConsumerOverall(wb),
    consumerProducts: parseConsumerProducts(wb),
    netFlowRates: parseNetFlowRates(wb),
    rollRateTimeSeries: parseRollRateTimeSeries(wb),
    vintagePoints: parseStaticPool(wb),
  };
}

export function parseCorporateFinancePQR(buffer: Buffer): Partial<PortfolioData> {
  const wb = XLSX.read(buffer, { type: 'buffer', cellDates: true });
  return {
    corporateWatchlist: parseCorporateWatchlist(wb),
  };
}

export function identifyFileType(buffer: Buffer): 'trade' | 'consumer' | 'corporate' | 'unknown' {
  const wb = XLSX.read(buffer, { type: 'buffer' });
  const sheets = wb.SheetNames.map(s => s.toLowerCase());
  if (sheets.some(s => s.includes('raw data') || s.includes('entity performance'))) return 'trade';
  if (sheets.some(s => s.includes('static pool') || s.includes('net flow rate'))) return 'consumer';
  if (sheets.some(s => s.includes('covenant') || s.includes('risk rating analysis'))) return 'corporate';
  return 'unknown';
}
