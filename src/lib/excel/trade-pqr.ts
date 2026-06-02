import ExcelJS from 'exceljs';
import type { ScopeSelection } from '@/lib/types';
import * as trade from '@/lib/queries/trade';
import * as risk from '@/lib/queries/risk';
import { addDataSheet, getTabColor, downloadWorkbook, getFilename, EXCEL } from './utils';

export async function generateTradePQR(scope?: ScopeSelection): Promise<void> {
  const [
    entityPerf,
    facilities,
    productMix,
    assetQuality,
    ratingDist,
    concentrations,
    collectionEff,
    watchlist,
    stageMigration,
    dpdRollRates,
    dpdAging,
    ewsSummary,
    ewsAlerts,
    fxRisk,
    countryRisk,
  ] = await Promise.all([
    trade.fetchTradeEntityPerformance(scope),
    trade.fetchTradeFacilities(scope),
    trade.fetchTradeProductMix(scope),
    trade.fetchTradeAssetQuality(scope),
    trade.fetchTradeRatingDistribution(scope),
    trade.fetchTradeConcentrations(undefined, scope),
    trade.fetchTradeCollectionEfficiency(scope),
    trade.fetchTradeWatchlist(scope),
    trade.fetchTradeStageMigration(scope),
    trade.fetchTradeDPDRollRates(scope),
    trade.fetchTradeDPDAgingByEntity(scope),
    risk.fetchEWSEntitySummary(scope),
    risk.fetchEWSFacilityAlerts(scope),
    risk.fetchFXRisk(scope),
    risk.fetchCountryRisk(scope),
  ]);

  const wb = new ExcelJS.Workbook();
  wb.creator = 'Baobab Portfolio Monitor';
  wb.created = new Date();
  const tabColor = getTabColor(2);

  // ── Sheet 1: Entity Performance ─────────────────────────────────
  addDataSheet(
    wb,
    'Entity Performance',
    [
      { header: 'Entity', key: 'entity', width: 22 },
      { header: 'Geography', key: 'geography', width: 16 },
      { header: 'Approved Limit', key: 'approvedLimit', width: 18, style: { numFmt: EXCEL.currency } },
      { header: 'Outstanding', key: 'outstanding', width: 18, style: { numFmt: EXCEL.currency } },
      { header: 'Headroom', key: 'headroom', width: 14, style: { numFmt: EXCEL.currency } },
      { header: 'Utilization', key: 'utilization', width: 14, style: { numFmt: EXCEL.percent } },
      { header: 'Stage 1', key: 'stage1', width: 16, style: { numFmt: EXCEL.currency } },
      { header: 'Stage 2', key: 'stage2', width: 16, style: { numFmt: EXCEL.currency } },
      { header: 'Stage 3', key: 'stage3', width: 16, style: { numFmt: EXCEL.currency } },
      { header: 'Provisions', key: 'provisions', width: 16, style: { numFmt: EXCEL.currency } },
      { header: 'Provision Coverage', key: 'provisionCoverage', width: 18, style: { numFmt: EXCEL.percent } },
      { header: 'RAG Status', key: 'ragStatus', width: 12 },
    ],
    entityPerf.map((r) => ({
      entity: r.entity,
      geography: r.geography,
      approvedLimit: r.approvedLimit,
      outstanding: r.outstanding,
      headroom: r.headroom,
      utilization: r.utilization,
      stage1: r.stage1,
      stage2: r.stage2,
      stage3: r.stage3,
      provisions: r.provisions,
      provisionCoverage: r.provisionCoverage,
      ragStatus: r.ragStatus,
    })),
    tabColor,
  );

  // ── Sheet 2: Facilities ─────────────────────────────────────────
  addDataSheet(
    wb,
    'Facilities',
    [
      { header: 'Facility Ref', key: 'facilityReference', width: 18 },
      { header: 'Entity', key: 'entity', width: 18 },
      { header: 'Obligor Name', key: 'obligorName', width: 22 },
      { header: 'Region', key: 'region', width: 14 },
      { header: 'Country', key: 'country', width: 14 },
      { header: 'Sector', key: 'sector', width: 16 },
      { header: 'Commodity', key: 'commodity', width: 16 },
      { header: 'Product Type', key: 'productType', width: 16 },
      { header: 'Currency', key: 'currency', width: 8 },
      { header: 'Facility Limit', key: 'facilityLimit', width: 16, style: { numFmt: EXCEL.currency } },
      { header: 'Outstanding', key: 'outstanding', width: 16, style: { numFmt: EXCEL.currency } },
      { header: 'Prev Month Outstanding', key: 'prevMonthOutstanding', width: 18, style: { numFmt: EXCEL.currency } },
      { header: 'Tenor (Days)', key: 'tenorDays', width: 10 },
      { header: 'Start Date', key: 'startDate', width: 14 },
      { header: 'Maturity Date', key: 'maturityDate', width: 14 },
      { header: 'Internal Rating', key: 'internalRating', width: 12 },
      { header: 'External Rating', key: 'externalRating', width: 12 },
      { header: 'Days Past Due', key: 'daysPastDue', width: 10 },
      { header: 'IFRS9 Stage', key: 'ifrs9Stage', width: 10 },
      { header: 'Provision Rate', key: 'provisionRate', width: 12, style: { numFmt: EXCEL.percent } },
      { header: 'Provision Amount', key: 'provisionAmount', width: 14, style: { numFmt: EXCEL.currency } },
      { header: 'Collateral Value', key: 'collateralValue', width: 16, style: { numFmt: EXCEL.currency } },
      { header: 'Collateral Coverage', key: 'collateralCoverage', width: 14, style: { numFmt: EXCEL.percent } },
      { header: 'Risk Weight', key: 'riskWeight', width: 10 },
      { header: 'Counterparty Bank', key: 'counterpartyBank', width: 18 },
      { header: 'Watchlist Flag', key: 'watchlistFlag', width: 10 },
      { header: 'EWS Score', key: 'ewsScore', width: 10 },
      { header: 'EWS Triggers', key: 'ewsTriggers', width: 20 },
    ],
    facilities.map((r) => ({
      facilityReference: r.facilityReference,
      entity: r.entity,
      obligorName: r.obligorName,
      region: r.region,
      country: r.country,
      sector: r.sector,
      commodity: r.commodity,
      productType: r.productType,
      currency: r.currency,
      facilityLimit: r.facilityLimit,
      outstanding: r.outstanding,
      prevMonthOutstanding: r.prevMonthOutstanding,
      tenorDays: r.tenorDays,
      startDate: r.startDate,
      maturityDate: r.maturityDate,
      internalRating: r.internalRating,
      externalRating: r.externalRating,
      daysPastDue: r.daysPastDue,
      ifrs9Stage: r.ifrs9Stage,
      provisionRate: r.provisionRate,
      provisionAmount: r.provisionAmount,
      collateralValue: r.collateralValue,
      collateralCoverage: r.collateralCoverage,
      riskWeight: r.riskWeight,
      counterpartyBank: r.counterpartyBank,
      watchlistFlag: r.watchlistFlag,
      ewsScore: r.ewsScore,
      ewsTriggers: r.ewsTriggers,
    })),
    tabColor,
  );

  // ── Sheet 3: Product Mix ────────────────────────────────────────
  addDataSheet(
    wb,
    'Product Mix',
    [
      { header: 'Product Type', key: 'productType', width: 18 },
      { header: 'Facilities', key: 'facilities', width: 10 },
      { header: 'Limit', key: 'limit', width: 16, style: { numFmt: EXCEL.currency } },
      { header: 'Outstanding', key: 'outstanding', width: 16, style: { numFmt: EXCEL.currency } },
      { header: 'Portfolio Share', key: 'portfolioShare', width: 14, style: { numFmt: EXCEL.percent } },
      { header: 'Avg Tenor', key: 'avgTenor', width: 10 },
      { header: 'Utilization', key: 'utilization', width: 14, style: { numFmt: EXCEL.percent } },
      { header: 'Stage 2+3 %', key: 'stage2Plus3', width: 14, style: { numFmt: EXCEL.percent } },
      { header: 'Avg Rating', key: 'avgRating', width: 10 },
      { header: 'Watchlist Count', key: 'watchlistCount', width: 12 },
    ],
    productMix.map((r) => ({
      productType: r.productType,
      facilities: r.facilities,
      limit: r.limit,
      outstanding: r.outstanding,
      portfolioShare: r.portfolioShare,
      avgTenor: r.avgTenor,
      utilization: r.utilization,
      stage2Plus3: r.stage2Plus3,
      avgRating: r.avgRating,
      watchlistCount: r.watchlistCount,
    })),
    tabColor,
  );

  // ── Sheet 4: Asset Quality ──────────────────────────────────────
  addDataSheet(
    wb,
    'Asset Quality',
    [
      { header: 'Entity', key: 'entity', width: 22 },
      { header: 'Stage 1 Count', key: 'stage1Count', width: 12 },
      { header: 'Stage 1 Balance', key: 'stage1Balance', width: 16, style: { numFmt: EXCEL.currency } },
      { header: 'Stage 2 Count', key: 'stage2Count', width: 12 },
      { header: 'Stage 2 Balance', key: 'stage2Balance', width: 16, style: { numFmt: EXCEL.currency } },
      { header: 'Stage 3 Count', key: 'stage3Count', width: 12 },
      { header: 'Stage 3 Balance', key: 'stage3Balance', width: 16, style: { numFmt: EXCEL.currency } },
      { header: 'Stage 2+3 %', key: 'stage2Plus3Pct', width: 14, style: { numFmt: EXCEL.percent } },
      { header: 'Provision Coverage', key: 'provisionCoverage', width: 16, style: { numFmt: EXCEL.percent } },
      { header: 'RAG', key: 'rag', width: 10 },
    ],
    assetQuality.map((r) => ({
      entity: r.entity,
      stage1Count: r.stage1Count,
      stage1Balance: r.stage1Balance,
      stage2Count: r.stage2Count,
      stage2Balance: r.stage2Balance,
      stage3Count: r.stage3Count,
      stage3Balance: r.stage3Balance,
      stage2Plus3Pct: r.stage2Plus3Pct,
      provisionCoverage: r.provisionCoverage,
      rag: r.rag,
    })),
    tabColor,
  );

  // ── Sheet 5: Rating Distribution ────────────────────────────────
  addDataSheet(
    wb,
    'Rating Distribution',
    [
      { header: 'Rating Band', key: 'ratingBand', width: 14 },
      { header: 'Count', key: 'count', width: 10 },
      { header: 'Balance', key: 'balance', width: 16, style: { numFmt: EXCEL.currency } },
      { header: 'Portfolio Share', key: 'portfolioShare', width: 14, style: { numFmt: EXCEL.percent } },
      { header: 'Avg Provision', key: 'avgProvision', width: 14, style: { numFmt: EXCEL.percent } },
    ],
    ratingDist.map((r) => ({
      ratingBand: r.ratingBand,
      count: r.count,
      balance: r.balance,
      portfolioShare: r.portfolioShare,
      avgProvision: r.avgProvision,
    })),
    tabColor,
  );

  // ── Sheet 6: Concentrations ─────────────────────────────────────
  addDataSheet(
    wb,
    'Concentrations',
    [
      { header: 'Name', key: 'name', width: 22 },
      { header: 'Entity', key: 'entity', width: 18 },
      { header: 'Category', key: 'category', width: 12 },
      { header: 'Value', key: 'value', width: 16, style: { numFmt: EXCEL.currency } },
      { header: 'Portfolio Share', key: 'portfolioShare', width: 14, style: { numFmt: EXCEL.percent } },
      { header: 'Facilities', key: 'facilities', width: 10 },
      { header: 'Rating', key: 'rating', width: 10 },
    ],
    concentrations.map((r) => ({
      name: r.name,
      entity: r.entity,
      category: r.category,
      value: r.value,
      portfolioShare: r.portfolioShare,
      facilities: r.facilities,
      rating: r.rating,
    })),
    tabColor,
  );

  // ── Sheet 7: Collection Efficiency ──────────────────────────────
  addDataSheet(
    wb,
    'Collection Efficiency',
    [
      { header: 'Entity', key: 'entity', width: 22 },
      { header: 'Collection Efficiency Ratio', key: 'collectionEfficiencyRatio', width: 18, style: { numFmt: EXCEL.percent } },
      { header: 'Overdue Ratio', key: 'overdueRatio', width: 14, style: { numFmt: EXCEL.percent } },
      { header: 'Avg DPD', key: 'avgDPD', width: 10 },
      { header: 'Recovery Rate', key: 'recoveryRate', width: 14, style: { numFmt: EXCEL.percent } },
      { header: 'Rollover Rate', key: 'rolloverRate', width: 14, style: { numFmt: EXCEL.percent } },
      { header: 'Provision Outstanding', key: 'provisionOutstanding', width: 18, style: { numFmt: EXCEL.currency } },
      { header: 'RAG', key: 'rag', width: 10 },
    ],
    collectionEff.map((r) => ({
      entity: r.entity,
      collectionEfficiencyRatio: r.collectionEfficiencyRatio,
      overdueRatio: r.overdueRatio,
      avgDPD: r.avgDPD,
      recoveryRate: r.recoveryRate,
      rolloverRate: r.rolloverRate,
      provisionOutstanding: r.provisionOutstanding,
      rag: r.rag,
    })),
    tabColor,
  );

  // ── Sheet 8: Watchlist ──────────────────────────────────────────
  addDataSheet(
    wb,
    'Watchlist',
    [
      { header: 'Facility Ref', key: 'facilityRef', width: 16 },
      { header: 'Entity', key: 'entity', width: 18 },
      { header: 'Obligor Name', key: 'obligorName', width: 22 },
      { header: 'Product Type', key: 'productType', width: 16 },
      { header: 'Outstanding', key: 'outstanding', width: 16, style: { numFmt: EXCEL.currency } },
      { header: 'DPD', key: 'dpd', width: 8 },
      { header: 'Stage', key: 'stage', width: 10 },
      { header: 'Rating', key: 'rating', width: 8 },
      { header: 'EWS Score', key: 'ewsScore', width: 10 },
      { header: 'Triggers', key: 'triggers', width: 24 },
      { header: 'Action', key: 'action', width: 20 },
    ],
    watchlist.map((r) => ({
      facilityRef: r.facilityRef,
      entity: r.entity,
      obligorName: r.obligorName,
      productType: r.productType,
      outstanding: r.outstanding,
      dpd: r.dpd,
      stage: r.stage,
      rating: r.rating,
      ewsScore: r.ewsScore,
      triggers: r.triggers,
      action: r.action,
    })),
    tabColor,
  );

  // ── Sheet 9: Stage Migration ────────────────────────────────────
  addDataSheet(
    wb,
    'Stage Migration',
    [
      { header: 'Period', key: 'period', width: 14 },
      { header: 'Prior Stage', key: 'priorStage', width: 12 },
      { header: 'Current Stage', key: 'currentStage', width: 12 },
      { header: 'Facility Count', key: 'facilityCount', width: 12 },
      { header: 'Balance', key: 'balance', width: 16, style: { numFmt: EXCEL.currency } },
    ],
    stageMigration.map((r) => ({
      period: r.period,
      priorStage: r.priorStage,
      currentStage: r.currentStage,
      facilityCount: r.facilityCount,
      balance: r.balance,
    })),
    tabColor,
  );

  // ── Sheet 10: DPD Roll Rates ────────────────────────────────────
  addDataSheet(
    wb,
    'DPD Roll Rates',
    [
      { header: 'Period', key: 'period', width: 14 },
      { header: 'From Bucket', key: 'fromBucket', width: 12 },
      { header: 'To Bucket', key: 'toBucket', width: 12 },
      { header: 'Facility Count', key: 'facilityCount', width: 12 },
      { header: 'Balance', key: 'balance', width: 16, style: { numFmt: EXCEL.currency } },
      { header: 'Transition %', key: 'transitionPct', width: 14, style: { numFmt: EXCEL.percent } },
    ],
    dpdRollRates.map((r) => ({
      period: r.period,
      fromBucket: r.fromBucket,
      toBucket: r.toBucket,
      facilityCount: r.facilityCount,
      balance: r.balance,
      transitionPct: r.transitionPct,
    })),
    tabColor,
  );

  // ── Sheet 11: DPD Aging ─────────────────────────────────────────
  addDataSheet(
    wb,
    'DPD Aging',
    [
      { header: 'Subsidiary', key: 'subsidiaryName', width: 22 },
      { header: 'DPD Bucket', key: 'dpdBucket', width: 12 },
      { header: 'Facility Count', key: 'facilityCount', width: 12 },
      { header: 'Balance', key: 'balance', width: 16, style: { numFmt: EXCEL.currency } },
    ],
    dpdAging.map((r) => ({
      subsidiaryName: r.subsidiaryName,
      dpdBucket: r.dpdBucket,
      facilityCount: r.facilityCount,
      balance: r.balance,
    })),
    tabColor,
  );

  // ── Sheet 12: EWS Summary ──────────────────────────────────────
  addDataSheet(
    wb,
    'EWS Summary',
    [
      { header: 'Entity', key: 'entity', width: 22 },
      { header: 'Score 0', key: 'score0', width: 10 },
      { header: 'Score 1', key: 'score1', width: 10 },
      { header: 'Score 2', key: 'score2', width: 10 },
      { header: 'Score 3', key: 'score3', width: 10 },
      { header: 'Score 4+', key: 'score4Plus', width: 10 },
      { header: 'Total Facilities', key: 'totalFacilities', width: 12 },
      { header: 'Avg EWS Score', key: 'avgEWSScore', width: 12 },
      { header: 'Flagged Exposure', key: 'flaggedExposure', width: 16, style: { numFmt: EXCEL.currency } },
      { header: 'RAG', key: 'rag', width: 10 },
    ],
    ewsSummary.map((r) => ({
      entity: r.entity,
      score0: r.score0,
      score1: r.score1,
      score2: r.score2,
      score3: r.score3,
      score4Plus: r.score4Plus,
      totalFacilities: r.totalFacilities,
      avgEWSScore: r.avgEWSScore,
      flaggedExposure: r.flaggedExposure,
      rag: r.rag,
    })),
    tabColor,
  );

  // ── Sheet 13: EWS Alerts ───────────────────────────────────────
  addDataSheet(
    wb,
    'EWS Alerts',
    [
      { header: 'Facility Ref', key: 'facilityRef', width: 16 },
      { header: 'Entity', key: 'entity', width: 18 },
      { header: 'Obligor', key: 'obligor', width: 22 },
      { header: 'EWS Score', key: 'ewsScore', width: 10 },
      { header: 'Outstanding', key: 'outstanding', width: 16, style: { numFmt: EXCEL.currency } },
      { header: 'Triggers', key: 'triggers', width: 24 },
      { header: 'Stage', key: 'stage', width: 10 },
      { header: 'Action', key: 'action', width: 20 },
    ],
    ewsAlerts.map((r) => ({
      facilityRef: r.facilityRef,
      entity: r.entity,
      obligor: r.obligor,
      ewsScore: r.ewsScore,
      outstanding: r.outstanding,
      triggers: r.triggers,
      stage: r.stage,
      action: r.action,
    })),
    tabColor,
  );

  // ── Sheet 14: FX Risk ──────────────────────────────────────────
  addDataSheet(
    wb,
    'FX Risk',
    [
      { header: 'Entity', key: 'entity', width: 22 },
      { header: 'Primary Currency', key: 'primaryCurrency', width: 12 },
      { header: 'FX Rate', key: 'fxRate', width: 10 },
      { header: 'Volatility 30D', key: 'volatility30Day', width: 14, style: { numFmt: EXCEL.percent } },
      { header: 'Volatility 90D', key: 'volatility90Day', width: 14, style: { numFmt: EXCEL.percent } },
      { header: 'YTD Depreciation', key: 'ytdDepreciation', width: 14, style: { numFmt: EXCEL.percent } },
      { header: 'Portfolio Exposure', key: 'portfolioExposure', width: 16, style: { numFmt: EXCEL.currency } },
      { header: 'FX Impact', key: 'fxImpact', width: 14, style: { numFmt: EXCEL.currency } },
      { header: 'Capital Controls', key: 'capitalControls', width: 12 },
      { header: 'Transfer Risk', key: 'transferRisk', width: 14 },
      { header: 'RAG', key: 'rag', width: 10 },
    ],
    fxRisk.map((r) => ({
      entity: r.entity,
      primaryCurrency: r.primaryCurrency,
      fxRate: r.fxRate,
      volatility30Day: r.volatility30Day,
      volatility90Day: r.volatility90Day,
      ytdDepreciation: r.ytdDepreciation,
      portfolioExposure: r.portfolioExposure,
      fxImpact: r.fxImpact,
      capitalControls: r.capitalControls,
      transferRisk: r.transferRisk,
      rag: r.rag,
    })),
    tabColor,
  );

  // ── Sheet 15: Country Risk ─────────────────────────────────────
  addDataSheet(
    wb,
    'Country Risk',
    [
      { header: 'Entity', key: 'entity', width: 22 },
      { header: 'Sovereign Rating', key: 'sovereignRating', width: 12 },
      { header: 'Country Risk Score', key: 'countryRiskScore', width: 14 },
      { header: 'Regulatory Score', key: 'regulatoryScore', width: 14 },
      { header: 'Political Stability', key: 'politicalStabilityScore', width: 16 },
      { header: 'Composite Score', key: 'compositeScore', width: 14 },
      { header: 'Exposure', key: 'exposure', width: 16, style: { numFmt: EXCEL.currency } },
      { header: 'RWA Share', key: 'rwaShare', width: 12, style: { numFmt: EXCEL.percent } },
      { header: 'Capital Impact', key: 'capitalImpact', width: 14, style: { numFmt: EXCEL.currency } },
      { header: 'Recommendation', key: 'recommendation', width: 20 },
      { header: 'RAG', key: 'rag', width: 10 },
    ],
    countryRisk.map((r) => ({
      entity: r.entity,
      sovereignRating: r.sovereignRating,
      countryRiskScore: r.countryRiskScore,
      regulatoryScore: r.regulatoryScore,
      politicalStabilityScore: r.politicalStabilityScore,
      compositeScore: r.compositeScore,
      exposure: r.exposure,
      rwaShare: r.rwaShare,
      capitalImpact: r.capitalImpact,
      recommendation: r.recommendation,
      rag: r.rag,
    })),
    tabColor,
  );

  await downloadWorkbook(wb, getFilename(2));
}
