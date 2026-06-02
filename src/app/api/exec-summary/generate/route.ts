import { NextRequest, NextResponse } from 'next/server';

// ── Consumer Queries ────────────────────────────────────────────────
import {
  fetchConsumerOverall,
  fetchProductMetrics,
  fetchProductCatalog,
  fetchNetFlowRates,
  fetchRollRates,
  fetchCollectionMetrics,
  fetchVintagePoints,
  fetchNonStarters,
  fetchTDDPre,
  fetchTDDPost,
  fetchApprovedBase,
  fetchRejectedBase,
  fetchLOSMetrics,
  fetchLOSFunnel,
  fetchLOSDaily,
  fetchSubsidiaryScorecard,
  fetchConsumerUnsecuredFPD,
} from '@/lib/queries/consumer';

// ── Corporate Queries ───────────────────────────────────────────────
import {
  fetchCorporateExecutiveSummary,
  fetchCorporatePortfolioMetrics,
  fetchCorporateTopCustomers,
  fetchCorporateTopDisbursements,
  fetchCorporateTopSanctioned,
  fetchCorporateWatchlist,
  fetchCorporateWatchlistTrend,
  fetchCorporateCovenants,
  fetchCorporateDelinquency,
  fetchCorporateIndustryConcentration,
  fetchCorporateCollateralAnalysis,
  fetchCorporateLTVDistribution,
  fetchCorporateMaturityProfile,
  fetchCorporateProvisioningECL,
  fetchCorporateRatingAnalysis,
  fetchCorporateRatingMigration,
  fetchCorporatePDDistribution,
  fetchCorporatePipeline,
  fetchCorporatePARTrend,
  fetchCorporateStageBalances,
} from '@/lib/queries/corporate';

// ── Trade Queries ───────────────────────────────────────────────────
import {
  fetchTradeExecutiveSummary,
  fetchTradeFacilities,
  fetchTradeEntityPerformance,
  fetchTradeAssetQuality,
  fetchTradeCollectionEfficiency,
  fetchTradeProductMix,
  fetchTradeConcentrations,
  fetchTradeRatingDistribution,
  fetchTradeStageMigration,
  fetchTradeDPDRollRates,
  fetchTradeDPDAgingByEntity,
  fetchTradeWatchlist,
} from '@/lib/queries/trade';

// ── Risk Queries ────────────────────────────────────────────────────
import {
  fetchEWSEntitySummary,
  fetchEWSFacilityAlerts,
  fetchFXRisk,
  fetchCountryRisk,
} from '@/lib/queries/risk';

// ── Risk Outlook Queries ────────────────────────────────────────────
import {
  fetchEclForecast,
  fetchEclWaterfall,
  fetchEclSensitivity,
  fetchStressScenarioLosses,
  fetchCET1Trajectory,
  fetchLeadingIndicators,
  fetchMacroCreditLinkage,
  fetchRiskOutlookKPIs,
} from '@/lib/queries/risk-outlook';

// ── Overview Queries ────────────────────────────────────────────────
import { fetchConsolidatedScorecard } from '@/lib/queries/overview';

// ── Risk Appetite ───────────────────────────────────────────────────
import { fetchAllThresholds } from '@/lib/queries/risk-appetite';

// ── Formatting ──────────────────────────────────────────────────────
import { formatCurrencyMM, formatPercent, formatRating } from '@/lib/format';
import { sortPeriodsChronologically } from '@/lib/format';

// ── Types ───────────────────────────────────────────────────────────
import type { ScopeSelection } from '@/lib/types';

// =====================================================================
// Constants
// =====================================================================

const TAB_NAMES: Record<number, string> = {
  0: 'Group Overview',
  1: 'Consumer Finance',
  2: 'Trade Finance',
  3: 'Corporate Finance',
  4: 'Risk & Concentrations',
};

const MAX_CONTEXT_LENGTH = 30_000;

// =====================================================================
// Scope helpers (mirrors /api/gemini/route.ts)
// =====================================================================

function parseScopeFromBody(body: Record<string, unknown>): ScopeSelection | undefined {
  const { scope } = body;
  if (!scope || typeof scope !== 'object') return undefined;
  const s = scope as Record<string, unknown>;
  const level = s.level as string;
  if (!level || !['group', 'region', 'subsidiary'].includes(level)) return undefined;
  return {
    level: level as ScopeSelection['level'],
    regionId: typeof s.regionId === 'number' ? s.regionId : undefined,
    subsidiaryId: typeof s.subsidiaryId === 'number' ? s.subsidiaryId : undefined,
  };
}

function scopeLabel(scope?: ScopeSelection): string {
  if (!scope || scope.level === 'group') return 'Group (all subsidiaries)';
  if (scope.level === 'region') return `Region (regionId: ${scope.regionId})`;
  return `Subsidiary (subsidiaryId: ${scope.subsidiaryId})`;
}

// =====================================================================
// Shared formatting helpers
// =====================================================================

const AMOUNT_METRICS = new Set([
  'Total AUM', 'On-Book AUM', 'Off-Book AUM', 'New Bookings',
  'Write-offs', 'Recoveries', 'NCL', 'Average Ticket Size',
  'Life-to-Date Disbursement',
]);

function fmtMetricValue(metric: string, value: number | string | null): string {
  if (value == null) return 'N/A';
  const n = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(n)) return String(value);
  return AMOUNT_METRICS.has(metric) ? formatCurrencyMM(n) : formatPercent(n, 2);
}

function truncate(text: string, maxLen: number = MAX_CONTEXT_LENGTH): string {
  if (text.length <= maxLen) return text;
  return text.slice(0, maxLen) + '\n\n[... context truncated to stay within model limits ...]';
}

// =====================================================================
// Context Builders — one per tab
// =====================================================================

// ── Tab 0: Group Overview ───────────────────────────────────────────

async function buildGroupOverviewContext(scope?: ScopeSelection): Promise<string> {
  const [
    scorecard,
    consumerOverall,
    tradeSummary,
    corpSummary,
    ewsSummary,
    fxRisk,
    countryRisk,
    thresholds,
  ] = await Promise.all([
    fetchConsolidatedScorecard(scope).catch(() => []),
    fetchConsumerOverall(scope).catch(() => []),
    fetchTradeExecutiveSummary(scope).catch(() => null),
    fetchCorporateExecutiveSummary(scope).catch(() => null),
    fetchEWSEntitySummary(scope).catch(() => []),
    fetchFXRisk(scope).catch(() => []),
    fetchCountryRisk(scope).catch(() => []),
    fetchAllThresholds().catch(() => []),
  ]);

  const lines: string[] = ['=== Group Overview Portfolio Context ==='];

  // Consolidated Scorecard
  if (scorecard.length > 0) {
    lines.push('\nConsolidated Scorecard by Subsidiary:');
    scorecard.forEach((s) => {
      lines.push(
        `  - ${s.subsidiary} (${s.shortCode}, ${s.country}): ` +
        `Consumer AUM ${s.consumerAumUsd != null ? formatCurrencyMM(s.consumerAumUsd) : 'N/A'}, ` +
        `Trade Outstanding ${s.tradeOutstandingUsd != null ? formatCurrencyMM(s.tradeOutstandingUsd) : 'N/A'}, ` +
        `30+ DPD ${s.consumerDelinquency30Plus != null ? formatPercent(s.consumerDelinquency30Plus, 2) : 'N/A'}, ` +
        `90+ DPD ${s.consumerDelinquency90Plus != null ? formatPercent(s.consumerDelinquency90Plus, 2) : 'N/A'}, ` +
        `Trade NPL ${s.tradeNplRatio != null ? formatPercent(s.tradeNplRatio, 2) : 'N/A'}, ` +
        `Corp Watchlist ${s.corporateWatchlistCount}, ` +
        `EWS Avg ${s.avgEwsScore != null ? formatRating(s.avgEwsScore) : 'N/A'} (${s.ewsRagStatus ?? 'N/A'}), ` +
        `FX YTD Deprec ${s.fxYtdDepreciation != null ? formatPercent(s.fxYtdDepreciation, 1) : 'N/A'} (${s.fxRagStatus ?? 'N/A'}), ` +
        `Country Risk ${s.countryRiskScore != null ? formatRating(s.countryRiskScore) : 'N/A'} (${s.countryRiskRagStatus ?? 'N/A'})`,
      );
    });
    const totalConsumerAUM = scorecard.reduce((s, r) => s + (r.consumerAumUsd ?? 0), 0);
    const totalTradeOutstanding = scorecard.reduce((s, r) => s + (r.tradeOutstandingUsd ?? 0), 0);
    lines.push(`  Group Totals: Consumer AUM ${formatCurrencyMM(totalConsumerAUM)}, Trade Outstanding ${formatCurrencyMM(totalTradeOutstanding)}`);
  }

  // Consumer Overall (all periods for trend)
  if (consumerOverall.length > 0) {
    lines.push('\nConsumer Finance Overall Metrics (time-series):');
    consumerOverall.forEach((m) => {
      const periods = sortPeriodsChronologically(Object.keys(m.values));
      const entries = periods
        .filter((p) => m.values[p] != null && typeof m.values[p] === 'number')
        .map((p) => `${p}: ${fmtMetricValue(m.metric, m.values[p])}`)
        .join(', ');
      if (entries) lines.push(`  - ${m.metric}: ${entries}`);
    });
  }

  // Trade Summary
  if (tradeSummary) {
    lines.push('\nTrade Finance Summary:');
    lines.push(`  - Total AUM: ${tradeSummary.totalAUM != null ? formatCurrencyMM(tradeSummary.totalAUM) : 'N/A'}`);
    lines.push(`  - Total Facilities: ${tradeSummary.totalFacilities ?? 'N/A'}`);
    lines.push(`  - NPL Ratio: ${tradeSummary.nplRatio != null ? formatPercent(tradeSummary.nplRatio, 2) : 'N/A'}`);
    lines.push(`  - Stage 2+3%: ${tradeSummary.stage2Plus3Pct != null ? formatPercent(tradeSummary.stage2Plus3Pct, 2) : 'N/A'}`);
    lines.push(`  - Provision Coverage: ${tradeSummary.provisionCoverage != null ? formatPercent(tradeSummary.provisionCoverage, 2) : 'N/A'}`);
  }

  // Corporate Summary
  if (corpSummary) {
    lines.push('\nCorporate Finance Summary:');
    lines.push(`  - Total POS: ${formatCurrencyMM(corpSummary.totalPOS)}`);
    lines.push(`  - Total Disbursement: ${formatCurrencyMM(corpSummary.totalDisbursement)}`);
    lines.push(`  - Delinquency Rate: ${formatPercent(corpSummary.delinquencyRate, 2)}`);
    lines.push(`  - NPA Rate: ${formatPercent(corpSummary.npaRate, 2)}`);
    lines.push(`  - Avg Security Cover: ${formatPercent(corpSummary.avgSecurityCover, 1)}`);
    lines.push(`  - Covenant Breach Rate: ${formatPercent(corpSummary.covenantBreachRate, 2)}`);
    lines.push(`  - Provision Coverage: ${formatPercent(corpSummary.provisionCoverageRatio, 2)}`);
    lines.push(`  - Watchlist Count: ${corpSummary.watchlistCount}`);
  }

  // EWS
  if (ewsSummary.length > 0) {
    lines.push('\nEWS Entity Summary:');
    ewsSummary.forEach((e) => {
      lines.push(
        `  - ${e.entity}: Avg EWS ${formatRating(e.avgEWSScore)}, Score 4+: ${e.score4Plus}, Flagged Exposure ${formatCurrencyMM(e.flaggedExposure)}, RAG: ${e.rag}`,
      );
    });
  }

  // FX Risk
  if (fxRisk.length > 0) {
    lines.push('\nFX Risk:');
    fxRisk.forEach((f) => {
      lines.push(
        `  - ${f.entity} (${f.primaryCurrency}): Vol30D ${formatPercent(f.volatility30Day, 1)}, YTD Deprec ${formatPercent(f.ytdDepreciation, 1)}, Exposure ${formatCurrencyMM(f.portfolioExposure)}, RAG: ${f.rag}`,
      );
    });
  }

  // Country Risk
  if (countryRisk.length > 0) {
    lines.push('\nCountry Risk:');
    countryRisk.forEach((r) => {
      lines.push(
        `  - ${r.entity}: Composite ${formatRating(r.compositeScore)}, Exposure ${formatCurrencyMM(r.exposure)}, RAG: ${r.rag}`,
      );
    });
  }

  // Risk Appetite Thresholds
  if (thresholds.length > 0) {
    lines.push('\nRisk Appetite Thresholds (global):');
    const globalThresholds = thresholds.filter((t) => t.scope_level === 'global').slice(0, 15);
    globalThresholds.forEach((t) => {
      lines.push(`  - ${t.metric_key}: Appetite ${formatPercent(t.appetite, 2)}, Tolerance ${formatPercent(t.tolerance, 2)}`);
    });
  }

  return truncate(lines.join('\n'));
}

// ── Tab 1: Consumer Finance ─────────────────────────────────────────

async function buildConsumerContext(scope?: ScopeSelection): Promise<string> {
  const [
    overall,
    productMetrics,
    productCatalog,
    netFlowRates,
    rollRates,
    collectionMetrics,
    vintagePoints,
    nonStarters,
    tddPre,
    tddPost,
    approvedBase,
    rejectedBase,
    losMetrics,
    losFunnel,
    losDaily,
    subsidiaryScorecard,
    unsecuredFPD,
  ] = await Promise.all([
    fetchConsumerOverall(scope).catch(() => []),
    fetchProductMetrics(scope).catch(() => []),
    fetchProductCatalog(scope).catch(() => []),
    fetchNetFlowRates(scope).catch(() => []),
    fetchRollRates(scope).catch(() => []),
    fetchCollectionMetrics(scope).catch(() => []),
    fetchVintagePoints(undefined, scope).catch(() => []),
    fetchNonStarters(scope).catch(() => []),
    fetchTDDPre(scope).catch(() => []),
    fetchTDDPost(scope).catch(() => []),
    fetchApprovedBase(scope).catch(() => []),
    fetchRejectedBase(scope).catch(() => []),
    fetchLOSMetrics(scope).catch(() => []),
    fetchLOSFunnel(undefined, scope).catch(() => []),
    fetchLOSDaily(scope).catch(() => []),
    fetchSubsidiaryScorecard(scope).catch(() => []),
    fetchConsumerUnsecuredFPD(scope).catch(() => []),
  ]);

  const lines: string[] = ['=== Consumer Finance Portfolio Context ==='];

  // Overall Metrics (full time-series for trend detection)
  if (overall.length > 0) {
    lines.push('\nOverall Metrics (by period):');
    overall.forEach((m) => {
      const periods = sortPeriodsChronologically(Object.keys(m.values));
      const entries = periods
        .filter((p) => m.values[p] != null && typeof m.values[p] === 'number')
        .map((p) => `${p}: ${fmtMetricValue(m.metric, m.values[p])}`)
        .join(', ');
      if (entries) lines.push(`  - ${m.metric}: ${entries}`);
    });
  }

  // Product Catalog
  if (productCatalog.length > 0) {
    lines.push(`\nProduct Catalog: ${productCatalog.map((p) => `${p.productName} (${p.productCategory})`).join(', ')}`);
  }

  // Product-Level Metrics (latest period per product)
  if (productMetrics.length > 0) {
    lines.push('\nProduct Breakdown:');
    productMetrics.forEach((prod) => {
      const metricsLine: string[] = [];
      prod.metrics.forEach((m) => {
        const periods = sortPeriodsChronologically(Object.keys(m.values));
        const latestEntries = periods.filter((p) => m.values[p] != null && typeof m.values[p] === 'number');
        if (latestEntries.length > 0) {
          const latestPeriod = latestEntries[latestEntries.length - 1];
          metricsLine.push(`${m.metric}: ${fmtMetricValue(m.metric, m.values[latestPeriod])}`);
        }
      });
      if (metricsLine.length > 0) {
        lines.push(`  - ${prod.productName}: ${metricsLine.join(', ')}`);
      }
    });
  }

  // Net Flow Rates (all periods)
  if (netFlowRates.length > 0) {
    lines.push('\nNet Flow Rates:');
    netFlowRates.slice(0, 12).forEach((nf) => {
      const periods = sortPeriodsChronologically(Object.keys(nf.values));
      const entries = periods.map((p) => `${p}: ${formatPercent(nf.values[p], 2)}`).join(', ');
      lines.push(`  - ${nf.bucket}: ${entries}`);
    });
  }

  // Roll Rates (all periods)
  if (rollRates.length > 0) {
    lines.push('\nRoll Rate Series:');
    rollRates.slice(0, 12).forEach((rr) => {
      const periods = sortPeriodsChronologically(Object.keys(rr.values));
      const entries = periods.map((p) => `${p}: ${formatPercent(rr.values[p], 2)}`).join(', ');
      lines.push(`  - ${rr.metric}: ${entries}`);
    });
  }

  // Collection Metrics (latest period)
  if (collectionMetrics.length > 0) {
    const periods = Array.from(new Set(collectionMetrics.map((c) => c.period))).sort();
    const latestPeriod = periods[periods.length - 1] ?? '';
    const latestColl = collectionMetrics.filter((c) => c.period === latestPeriod);
    if (latestColl.length > 0) {
      lines.push(`\nCollection Metrics (${latestPeriod}):`);
      latestColl.slice(0, 10).forEach((c) => {
        lines.push(
          `  - ${c.portfolio} ${c.bucket}: Amount ${formatCurrencyMM(c.amount)}, ` +
          `Roll Fwd ${formatPercent(c.rollForward, 2)}, Stabilized ${formatPercent(c.stabilized, 2)}, ` +
          `Roll Back ${formatPercent(c.rollBackward, 2)}`,
        );
      });
    }
  }

  // Vintage Analysis (summary: latest MOB per vintage)
  if (vintagePoints.length > 0) {
    lines.push('\nVintage Analysis (latest MOB per vintage):');
    const vintageMap = new Map<string, { mob: number; rate: number; amount: number }>();
    vintagePoints.forEach((v) => {
      const existing = vintageMap.get(v.vintage);
      if (!existing || v.mob > existing.mob) {
        vintageMap.set(v.vintage, { mob: v.mob, rate: v.delinquencyRate, amount: v.loanAmount });
      }
    });
    vintageMap.forEach((val, vintage) => {
      lines.push(`  - ${vintage}: MOB ${val.mob}, Delinq Rate ${formatPercent(val.rate, 2)}, Amount ${formatCurrencyMM(val.amount)}`);
    });
  }

  // Non-Starters
  if (nonStarters.length > 0) {
    lines.push('\nNon-Starter Analysis:');
    nonStarters.slice(0, 10).forEach((ns) => {
      const periods = sortPeriodsChronologically(Object.keys(ns.monthlyValues));
      const latest = periods[periods.length - 1];
      const val = latest ? ns.monthlyValues[latest] : null;
      lines.push(`  - ${ns.category} / ${ns.product} / ${ns.metric}: Latest (${latest ?? 'N/A'}): ${val != null ? formatCurrencyMM(val) : 'N/A'}`);
    });
  }

  // TDD Pre-Disbursal
  if (tddPre.length > 0) {
    lines.push('\nTDD Pre-Disbursal Metrics:');
    tddPre.slice(0, 10).forEach((t) => {
      const periods = sortPeriodsChronologically(Object.keys(t.values));
      const entries = periods.map((p) => `${p}: ${t.values[p]}`).join(', ');
      lines.push(`  - ${t.metric}: ${entries}`);
    });
  }

  // TDD Post-Disbursal
  if (tddPost.length > 0) {
    lines.push('\nTDD Post-Disbursal Metrics:');
    tddPost.slice(0, 10).forEach((t) => {
      const periods = sortPeriodsChronologically(Object.keys(t.values));
      const entries = periods.map((p) => `${p}: ${formatPercent(t.values[p], 2)}`).join(', ');
      lines.push(`  - ${t.variant} / ${t.bureauBucket}: ${entries}`);
    });
  }

  // Approved Base
  if (approvedBase.length > 0) {
    lines.push('\nApproved Base Distribution:');
    approvedBase.slice(0, 10).forEach((a) => {
      lines.push(`  - LA Band ${a.laBand}: Total ${a.total}, Bands: ${JSON.stringify(a.loanBands)}`);
    });
  }

  // Rejected Base
  if (rejectedBase.length > 0) {
    lines.push('\nRejected Base Distribution:');
    rejectedBase.slice(0, 10).forEach((r) => {
      lines.push(`  - ${r.loanType}: Total ${r.total}, Bands: ${JSON.stringify(r.amountBands)}`);
    });
  }

  // LOS Metrics
  if (losMetrics.length > 0) {
    lines.push('\nLOS Performance Metrics:');
    losMetrics.slice(0, 15).forEach((l) => {
      lines.push(
        `  - ${l.metric} (${l.product}): MTD ${formatCurrencyMM(l.mtd)}, LMTD ${formatCurrencyMM(l.lmtd)}, ` +
        `MoM ${formatPercent(l.momChange, 1)}, Achievement ${l.achievement != null ? formatPercent(l.achievement, 1) : 'N/A'}`,
      );
    });
  }

  // LOS Funnel
  if (losFunnel.length > 0) {
    lines.push('\nLOS Funnel:');
    losFunnel.slice(0, 15).forEach((f) => {
      lines.push(`  - ${f.stage} (${f.product}): MTD ${f.mtd}, Conversion ${formatPercent(f.conversionRate, 1)}`);
    });
  }

  // LOS Daily (last 10 days)
  if (losDaily.length > 0) {
    lines.push('\nLOS Daily Disbursements (recent):');
    losDaily.slice(-10).forEach((d) => {
      lines.push(`  - ${d.date} (${d.product}): Count ${d.count}, Amount ${formatCurrencyMM(d.amount)}, Avg Ticket ${formatCurrencyMM(d.avgTicketSize)}`);
    });
  }

  // Subsidiary Scorecard
  if (subsidiaryScorecard.length > 0) {
    lines.push('\nSubsidiary Consumer Scorecard:');
    subsidiaryScorecard.forEach((s) => {
      lines.push(
        `  - ${s.subsidiary} (${s.shortCode}, ${s.country}): AUM ${s.aumUsd != null ? formatCurrencyMM(s.aumUsd) : 'N/A'}, ` +
        `30+ DPD ${s.delinquency30Plus != null ? formatPercent(s.delinquency30Plus, 2) : 'N/A'}, ` +
        `90+ DPD ${s.delinquency90Plus != null ? formatPercent(s.delinquency90Plus, 2) : 'N/A'}, ` +
        `NCL ${s.netCreditLoss != null ? formatPercent(s.netCreditLoss, 2) : 'N/A'}, ` +
        `FPD% ${s.fpdPct != null ? formatPercent(s.fpdPct, 2) : 'N/A'}`,
      );
    });
  }

  // Unsecured FPD
  if (unsecuredFPD.length > 0) {
    lines.push('\nUnsecured FPD% Trend:');
    unsecuredFPD.forEach((m) => {
      const periods = sortPeriodsChronologically(Object.keys(m.values));
      const entries = periods
        .filter((p) => m.values[p] != null)
        .map((p) => `${p}: ${formatPercent(m.values[p] as number, 2)}`)
        .join(', ');
      if (entries) lines.push(`  - ${m.metric}: ${entries}`);
    });
  }

  return truncate(lines.join('\n'));
}

// ── Tab 2: Trade Finance ────────────────────────────────────────────

async function buildTradeContext(scope?: ScopeSelection): Promise<string> {
  const [
    summary,
    facilities,
    entityPerf,
    assetQuality,
    collectionEff,
    productMix,
    concentrations,
    ratingDist,
    stageMigration,
    dpdRollRates,
    dpdAging,
    watchlist,
  ] = await Promise.all([
    fetchTradeExecutiveSummary(scope).catch(() => null),
    fetchTradeFacilities(scope).catch(() => []),
    fetchTradeEntityPerformance(scope).catch(() => []),
    fetchTradeAssetQuality(scope).catch(() => []),
    fetchTradeCollectionEfficiency(scope).catch(() => []),
    fetchTradeProductMix(scope).catch(() => []),
    fetchTradeConcentrations(undefined, scope).catch(() => []),
    fetchTradeRatingDistribution(scope).catch(() => []),
    fetchTradeStageMigration(scope).catch(() => []),
    fetchTradeDPDRollRates(scope).catch(() => []),
    fetchTradeDPDAgingByEntity(scope).catch(() => []),
    fetchTradeWatchlist(scope).catch(() => []),
  ]);

  const lines: string[] = ['=== Trade Finance Portfolio Context ==='];

  // Executive Summary
  if (summary) {
    lines.push('\nPortfolio Summary:');
    lines.push(`  - Total AUM: ${formatCurrencyMM(summary.totalAUM)}`);
    lines.push(`  - Total Facilities: ${summary.totalFacilities}`);
    lines.push(`  - NPL Ratio: ${formatPercent(summary.nplRatio, 2)}`);
    lines.push(`  - Stage 2+3%: ${formatPercent(summary.stage2Plus3Pct, 2)}`);
    lines.push(`  - Provision Coverage: ${formatPercent(summary.provisionCoverage, 2)}`);
    lines.push(`  - Credit Cost: ${formatPercent(summary.creditCost, 2)}`);
    lines.push(`  - 30+ DPD: ${formatPercent(summary.delinquency30Plus, 2)}`);
    lines.push(`  - 90+ DPD: ${formatPercent(summary.delinquency90Plus, 2)}`);
  }

  // Entity Performance
  if (entityPerf.length > 0) {
    lines.push('\nEntity Performance:');
    entityPerf.forEach((e) => {
      lines.push(
        `  - ${e.entity} (${e.geography}): Outstanding ${formatCurrencyMM(e.outstanding)}, ` +
        `Limit ${formatCurrencyMM(e.approvedLimit)}, Utilization ${formatPercent(e.utilization, 1)}, ` +
        `Provisions ${formatCurrencyMM(e.provisions)}, Prov Coverage ${formatPercent(e.provisionCoverage, 1)}, ` +
        `RAG: ${e.ragStatus}`,
      );
    });
  }

  // Asset Quality
  if (assetQuality.length > 0) {
    lines.push('\nAsset Quality by Entity:');
    assetQuality.forEach((a) => {
      lines.push(
        `  - ${a.entity}: S1 ${formatCurrencyMM(a.stage1Balance)} (${a.stage1Count}), ` +
        `S2 ${formatCurrencyMM(a.stage2Balance)} (${a.stage2Count}), ` +
        `S3 ${formatCurrencyMM(a.stage3Balance)} (${a.stage3Count}), ` +
        `S2+3% ${formatPercent(a.stage2Plus3Pct, 2)}, Prov Coverage ${formatPercent(a.provisionCoverage, 1)}, RAG: ${a.rag}`,
      );
    });
  }

  // Product Mix
  if (productMix.length > 0) {
    lines.push('\nProduct Mix:');
    productMix.forEach((p) => {
      lines.push(
        `  - ${p.productType}: ${p.facilities} facilities, Outstanding ${formatCurrencyMM(p.outstanding)}, ` +
        `Share ${formatPercent(p.portfolioShare, 1)}, Utilization ${formatPercent(p.utilization, 1)}, ` +
        `S2+3% ${formatPercent(p.stage2Plus3, 2)}, Avg Rating ${formatRating(p.avgRating)}`,
      );
    });
  }

  // Collection Efficiency
  if (collectionEff.length > 0) {
    lines.push('\nCollection Efficiency:');
    collectionEff.forEach((c) => {
      lines.push(
        `  - ${c.entity}: Efficiency ${formatPercent(c.collectionEfficiencyRatio, 1)}, ` +
        `Overdue ${formatPercent(c.overdueRatio, 1)}, Avg DPD ${c.avgDPD.toFixed(0)}, ` +
        `Rollover ${formatPercent(c.rolloverRate, 1)}, RAG: ${c.rag}`,
      );
    });
  }

  // Rating Distribution
  if (ratingDist.length > 0) {
    lines.push('\nRating Distribution:');
    ratingDist.forEach((r) => {
      lines.push(
        `  - Band ${r.ratingBand}: ${r.count} facilities, ${formatCurrencyMM(r.balance)}, ` +
        `Share ${formatPercent(r.portfolioShare, 1)}, Avg Provision ${formatPercent(r.avgProvision, 2)}`,
      );
    });
  }

  // Stage Migration (latest period)
  if (stageMigration.length > 0) {
    lines.push('\nStage Migration:');
    const periods = Array.from(new Set(stageMigration.map((s) => s.period))).sort();
    const latestPeriod = periods[periods.length - 1] ?? '';
    const latestMigration = stageMigration.filter((s) => s.period === latestPeriod);
    latestMigration.forEach((s) => {
      lines.push(
        `  - ${s.priorStage} -> ${s.currentStage}: ${s.facilityCount} facilities, ${formatCurrencyMM(s.balance)}`,
      );
    });
  }

  // DPD Roll Rates (latest period)
  if (dpdRollRates.length > 0) {
    lines.push('\nDPD Roll Rates:');
    const periods = Array.from(new Set(dpdRollRates.map((d) => d.period))).sort();
    const latestPeriod = periods[periods.length - 1] ?? '';
    const latestRolls = dpdRollRates.filter((d) => d.period === latestPeriod);
    latestRolls.slice(0, 15).forEach((d) => {
      lines.push(
        `  - ${d.fromBucket} -> ${d.toBucket}: ${d.facilityCount} facilities, ${formatCurrencyMM(d.balance)}, ${formatPercent(d.transitionPct, 1)}`,
      );
    });
  }

  // DPD Aging by Entity
  if (dpdAging.length > 0) {
    lines.push('\nDPD Aging by Entity:');
    dpdAging.slice(0, 15).forEach((d) => {
      lines.push(
        `  - ${d.subsidiaryName} / ${d.dpdBucket}: ${d.facilityCount} facilities, ${formatCurrencyMM(d.balance)}`,
      );
    });
  }

  // Concentrations (top 10)
  if (concentrations.length > 0) {
    lines.push('\nTop Concentrations (by value):');
    concentrations
      .sort((a, b) => b.value - a.value)
      .slice(0, 10)
      .forEach((c) => {
        lines.push(
          `  - ${c.name} (${c.category}): ${formatCurrencyMM(c.value)}, Share ${formatPercent(c.portfolioShare, 1)}`,
        );
      });
  }

  // Top Facilities (top 15)
  if (facilities.length > 0) {
    lines.push(`\nTop Facilities (by outstanding, showing top 15 of ${facilities.length}):`);
    facilities
      .sort((a, b) => b.outstanding - a.outstanding)
      .slice(0, 15)
      .forEach((f) => {
        lines.push(
          `  - ${f.obligorName} (${f.sector}): Outstanding ${formatCurrencyMM(f.outstanding)}, ` +
          `Limit ${formatCurrencyMM(f.facilityLimit)}, DPD ${f.daysPastDue}, ` +
          `Stage ${f.ifrs9Stage}, Rating ${f.internalRating}, EWS ${f.ewsScore}` +
          (f.watchlistFlag ? ' [WATCHLIST]' : ''),
        );
      });
  }

  // Watchlist
  if (watchlist.length > 0) {
    lines.push(`\nTrade Watchlist (${watchlist.length} flagged):`);
    watchlist.slice(0, 10).forEach((w) => {
      lines.push(
        `  - ${w.obligorName}: ${formatCurrencyMM(w.outstanding)}, DPD ${w.dpd}, EWS ${w.ewsScore}, Stage ${w.stage}`,
      );
    });
  }

  return truncate(lines.join('\n'));
}

// ── Tab 3: Corporate Finance ────────────────────────────────────────

async function buildCorporateContext(scope?: ScopeSelection): Promise<string> {
  const [
    execSummary,
    portfolioMetrics,
    topCustomers,
    topDisbursements,
    topSanctioned,
    watchlist,
    watchlistTrend,
    covenants,
    delinquency,
    industryConc,
    collateral,
    ltvDist,
    maturityProfile,
    provisioning,
    ratingAnalysis,
    ratingMigration,
    pdDist,
    pipeline,
    parTrend,
    stageBalances,
  ] = await Promise.all([
    fetchCorporateExecutiveSummary(scope).catch(() => null),
    fetchCorporatePortfolioMetrics(scope).catch(() => []),
    fetchCorporateTopCustomers(scope).catch(() => []),
    fetchCorporateTopDisbursements(scope).catch(() => []),
    fetchCorporateTopSanctioned(scope).catch(() => []),
    fetchCorporateWatchlist(scope).catch(() => []),
    fetchCorporateWatchlistTrend(scope).catch(() => []),
    fetchCorporateCovenants(scope).catch(() => []),
    fetchCorporateDelinquency(scope).catch(() => []),
    fetchCorporateIndustryConcentration(scope).catch(() => []),
    fetchCorporateCollateralAnalysis(scope).catch(() => []),
    fetchCorporateLTVDistribution(scope).catch(() => []),
    fetchCorporateMaturityProfile(scope).catch(() => []),
    fetchCorporateProvisioningECL(scope).catch(() => []),
    fetchCorporateRatingAnalysis(scope).catch(() => []),
    fetchCorporateRatingMigration(scope).catch(() => []),
    fetchCorporatePDDistribution(scope).catch(() => []),
    fetchCorporatePipeline(scope).catch(() => []),
    fetchCorporatePARTrend(scope).catch(() => []),
    fetchCorporateStageBalances(scope).catch(() => ({ stage1: 0, stage2: 0, stage3: 0 })),
  ]);

  const lines: string[] = ['=== Corporate Finance Portfolio Context ==='];

  // Executive Summary
  if (execSummary) {
    lines.push('\nPortfolio Summary:');
    lines.push(`  - Total POS: ${formatCurrencyMM(execSummary.totalPOS)}`);
    lines.push(`  - Total Disbursement: ${formatCurrencyMM(execSummary.totalDisbursement)}`);
    lines.push(`  - Total Sanctioned: ${formatCurrencyMM(execSummary.totalSanctioned)}`);
    lines.push(`  - Delinquency Rate: ${formatPercent(execSummary.delinquencyRate, 2)}`);
    lines.push(`  - NPA Rate: ${formatPercent(execSummary.npaRate, 2)}`);
    lines.push(`  - Avg Security Cover: ${formatPercent(execSummary.avgSecurityCover, 1)}`);
    lines.push(`  - Covenant Breach Rate: ${formatPercent(execSummary.covenantBreachRate, 2)}`);
    lines.push(`  - Provision Coverage: ${formatPercent(execSummary.provisionCoverageRatio, 2)}`);
    lines.push(`  - Credit Cost: ${formatPercent(execSummary.creditCost, 2)}`);
    lines.push(`  - Watchlist Count: ${execSummary.watchlistCount}`);
    lines.push(`  - Delinquent Count: ${execSummary.delinquentCount}`);
    lines.push(`  - Stage PCR: S1 ${formatPercent(execSummary.stagePCR.stage1, 2)}, S2 ${formatPercent(execSummary.stagePCR.stage2, 2)}, S3 ${formatPercent(execSummary.stagePCR.stage3, 2)}`);
    lines.push(`  - Stage Credit Cost: S1 ${formatPercent(execSummary.stageCC.stage1, 2)}, S2 ${formatPercent(execSummary.stageCC.stage2, 2)}, S3 ${formatPercent(execSummary.stageCC.stage3, 2)}`);
  }

  // Stage Balances
  lines.push(`\nIFRS Stage Balances (latest): S1 ${formatCurrencyMM(stageBalances.stage1)}, S2 ${formatCurrencyMM(stageBalances.stage2)}, S3 ${formatCurrencyMM(stageBalances.stage3)}`);

  // Portfolio Metrics (time-series)
  if (portfolioMetrics.length > 0) {
    lines.push('\nPortfolio Metrics (time-series):');
    portfolioMetrics.slice(0, 15).forEach((pm) => {
      const monthKeys = sortPeriodsChronologically(Object.keys(pm.months));
      const entries = monthKeys.map((p) => {
        const v = pm.months[p];
        return `${p}: Total ${typeof v.total === 'number' ? formatCurrencyMM(v.total) : v.total}`;
      }).join(', ');
      lines.push(`  - ${pm.particular}: ${entries}`);
    });
  }

  // Top Customers by POS (top 15)
  if (topCustomers.length > 0) {
    lines.push(`\nTop Customers by POS (top 15 of ${topCustomers.length}):`);
    topCustomers.slice(0, 15).forEach((c) => {
      lines.push(
        `  - ${c.customerName} (${c.sector}): POS ${formatCurrencyMM(c.currentPOS)}, ` +
        `Sanctioned ${formatCurrencyMM(c.sanctionedLimit)}, Rating ${c.riskRating}, ` +
        `DPD ${c.dpd}, Stage ${c.ifrsStage}, Security Cover ${formatPercent(c.securityCover, 1)}`,
      );
    });
  }

  // Top Customers by Disbursement (top 10)
  if (topDisbursements.length > 0) {
    lines.push(`\nTop Customers by Disbursement (top 10 of ${topDisbursements.length}):`);
    topDisbursements.slice(0, 10).forEach((c) => {
      lines.push(
        `  - ${c.customerName} (${c.sector}): Disbursed ${formatCurrencyMM(c.disbursedAmount)}, ` +
        `POS ${formatCurrencyMM(c.currentPOS)}, Rating ${c.riskRating}, DPD ${c.dpd}`,
      );
    });
  }

  // Top Customers by Sanctioned Limit (top 10)
  if (topSanctioned.length > 0) {
    lines.push(`\nTop Customers by Sanctioned Limit (top 10 of ${topSanctioned.length}):`);
    topSanctioned.slice(0, 10).forEach((c) => {
      lines.push(
        `  - ${c.customerName} (${c.sector}): Sanctioned ${formatCurrencyMM(c.sanctionedLimit)}, ` +
        `POS ${formatCurrencyMM(c.currentPOS)}, Rating ${c.riskRating}, DPD ${c.dpd}`,
      );
    });
  }

  // Industry Concentration
  if (industryConc.length > 0) {
    lines.push('\nIndustry Concentration:');
    industryConc.slice(0, 10).forEach((ic) => {
      lines.push(
        `  - ${ic.sector}: POS ${formatCurrencyMM(ic.pos)}, Share ${formatPercent(ic.portfolioShare, 1)}, ` +
        `Facilities ${ic.facilityCount}`,
      );
    });
  }

  // Collateral Analysis
  if (collateral.length > 0) {
    lines.push('\nCollateral Analysis:');
    collateral.forEach((c) => {
      lines.push(
        `  - ${c.collateralType}: Coverage ${formatPercent(c.coverageRatio, 1)}, ` +
        `Value ${formatCurrencyMM(c.collateralValue)}, Exposure ${formatCurrencyMM(c.exposureCovered)}, ` +
        `POS ${formatCurrencyMM(c.principalOS)} (${formatPercent(c.principalShare, 1)} share)`,
      );
    });
  }

  // LTV Distribution
  if (ltvDist.length > 0) {
    lines.push('\nLTV Distribution:');
    ltvDist.forEach((l) => {
      lines.push(
        `  - ${l.ltvBand}: ${l.facilityCount} facilities, Balance ${formatCurrencyMM(l.balance)}, ` +
        `Share ${formatPercent(l.portfolioShare, 1)}`,
      );
    });
  }

  // Maturity Profile
  if (maturityProfile.length > 0) {
    lines.push('\nMaturity Profile:');
    maturityProfile.forEach((m) => {
      lines.push(
        `  - ${m.maturityBand} (${m.facilityBasis}): ${m.facilityCount} facilities, ` +
        `Balance ${formatCurrencyMM(m.balance)}, Share ${formatPercent(m.portfolioShare, 1)}`,
      );
    });
  }

  // Provisioning & ECL (all periods for trend)
  if (provisioning.length > 0) {
    lines.push('\nProvisioning & ECL:');
    const provPeriods = sortPeriodsChronologically(Array.from(new Set(provisioning.map((p) => p.period))));
    provPeriods.forEach((period) => {
      const rows = provisioning.filter((p) => p.period === period);
      rows.forEach((r) => {
        lines.push(
          `  - ${period} / ${r.ifrsStage} (${r.periodType}): Gross ${formatCurrencyMM(r.grossExposure)}, ` +
          `Provision ${formatCurrencyMM(r.provisionAmount)}, PCR ${formatPercent(r.pcrPct, 2)}, ` +
          `Credit Cost ${formatPercent(r.creditCost, 2)}`,
        );
      });
    });
  }

  // Rating Analysis
  if (ratingAnalysis.length > 0) {
    lines.push('\nRating Analysis:');
    ratingAnalysis.slice(0, 15).forEach((r) => {
      lines.push(
        `  - ${r.period} / ${r.ratingBand}: POS ${formatCurrencyMM(r.pos)}, Share ${formatPercent(r.portfolioShare, 1)}, ` +
        `Facilities ${r.facilityCount}`,
      );
    });
  }

  // PD Distribution
  if (pdDist.length > 0) {
    lines.push('\nPD Distribution:');
    pdDist.forEach((pd) => {
      lines.push(
        `  - ${pd.pdBand}: POS ${formatCurrencyMM(pd.principalOS)}, Share ${formatPercent(pd.principalShare, 1)}`,
      );
    });
  }

  // Rating Migration
  if (ratingMigration.length > 0) {
    lines.push(`\nRating Migrations (${ratingMigration.length} events):`);
    ratingMigration.slice(0, 10).forEach((rm) => {
      lines.push(
        `  - ${rm.customerName} (${rm.sector}): ${rm.priorRating} -> ${rm.currentRating} (${rm.migrationDirection}), ` +
        `Exposure ${formatCurrencyMM(rm.exposure)}, Trigger: ${rm.triggerReason}`,
      );
    });
  }

  // PAR Trend
  if (parTrend.length > 0) {
    lines.push('\nPAR Trend:');
    const parPeriods = sortPeriodsChronologically(Array.from(new Set(parTrend.map((p) => p.period))));
    parPeriods.forEach((period) => {
      const rows = parTrend.filter((p) => p.period === period);
      const bucketStr = rows.map((r) => `${r.dpdBucket}: ${formatPercent(r.parRate, 2)}`).join(', ');
      lines.push(`  - ${period}: ${bucketStr}`);
    });
  }

  // Pipeline
  if (pipeline.length > 0) {
    lines.push('\nPipeline:');
    pipeline.forEach((p) => {
      lines.push(
        `  - ${p.stage}: Gross ${formatCurrencyMM(p.grossAmount)}, Product Bid ${formatCurrencyMM(p.productBid)}, PCR ${formatPercent(p.pcrPct, 1)}`,
      );
    });
  }

  // Watchlist
  if (watchlist.length > 0) {
    lines.push(`\nCorporate Watchlist (${watchlist.length} entries):`);
    watchlist.slice(0, 10).forEach((w) => {
      lines.push(
        `  - ${w.borrower} (${w.sector}): Exposure ${w.exposure}, Rating ${w.internalRating} (prior: ${w.priorRating}), ` +
        `Status: ${w.status}, Days on list: ${w.daysOnWatchlist}, Trigger: ${w.ewsTriggerType}`,
      );
    });
  }

  // Watchlist Trend
  if (watchlistTrend.length > 0) {
    lines.push('\nWatchlist Trend:');
    watchlistTrend.forEach((wt) => {
      lines.push(
        `  - ${wt.period}: Total ${wt.totalCount}, Active ${wt.activeCount}, Escalated ${wt.escalatedCount}, ` +
        `Exposure ${formatCurrencyMM(wt.totalExposure)}, New +${wt.newAdditions}, Removed -${wt.removals}`,
      );
    });
  }

  // Covenant Breaches (summary)
  if (covenants.length > 0) {
    const breached = covenants.filter((c) => c.breached);
    lines.push(`\nCovenant Tracking: ${covenants.length} total, ${breached.length} breached`);
    breached.slice(0, 10).forEach((c) => {
      lines.push(
        `  - ${c.customerName}: ${c.covenantType} (${c.covenantCategory}), POS ${formatCurrencyMM(c.currentPOS)}, ` +
        `Breached ${c.daysSinceBreach} days ago, Rating ${c.riskRating}` +
        (c.npaFlag ? ' [NPA]' : '') + (c.watchlistFlag ? ' [WATCHLIST]' : ''),
      );
    });
  }

  // Delinquency (top 10 by DPD)
  if (delinquency.length > 0) {
    lines.push(`\nDelinquent Accounts (${delinquency.length} total, top 10 by DPD):`);
    delinquency.slice(0, 10).forEach((d) => {
      lines.push(
        `  - ${d.customerName} (${d.sector}): POS ${formatCurrencyMM(d.currentPOS)}, DPD ${d.currentDPD}, ` +
        `Rating ${d.currentRating} (was ${d.ratingAtDisbursement}), Security Cover ${formatPercent(d.securityCover, 1)}, ` +
        `Reason: ${d.reasonForDelinquency}`,
      );
    });
  }

  return truncate(lines.join('\n'));
}

// ── Tab 4: Risk & Concentrations ────────────────────────────────────

async function buildRiskContext(scope?: ScopeSelection): Promise<string> {
  const [
    ewsSummary,
    ewsAlerts,
    fxRisk,
    countryRisk,
    eclForecast,
    eclWaterfall,
    eclSensitivity,
    stressLosses,
    cet1Trajectory,
    leadingIndicators,
    macroCreditLinkage,
    riskKPIs,
    thresholds,
  ] = await Promise.all([
    fetchEWSEntitySummary(scope).catch(() => []),
    fetchEWSFacilityAlerts(scope).catch(() => []),
    fetchFXRisk(scope).catch(() => []),
    fetchCountryRisk(scope).catch(() => []),
    fetchEclForecast(scope).catch(() => []),
    fetchEclWaterfall(scope).catch(() => []),
    fetchEclSensitivity(scope).catch(() => []),
    fetchStressScenarioLosses(scope).catch(() => []),
    fetchCET1Trajectory(scope).catch(() => []),
    fetchLeadingIndicators(scope).catch(() => []),
    fetchMacroCreditLinkage(scope).catch(() => []),
    fetchRiskOutlookKPIs(scope).catch(() => ({ totalEcl: 0, provisionCoverage: 0, cet1UnderStress: 0, avgPd1Y: 0, ewsAlerts: 0 })),
    fetchAllThresholds().catch(() => []),
  ]);

  const lines: string[] = ['=== Risk & Concentrations Portfolio Context ==='];

  // Risk Outlook KPIs
  lines.push('\nRisk Outlook KPIs:');
  lines.push(`  - Total ECL: ${formatCurrencyMM(riskKPIs.totalEcl)}`);
  lines.push(`  - Provision Coverage: ${formatPercent(riskKPIs.provisionCoverage, 2)}`);
  lines.push(`  - CET1 Under Stress (Severe): ${formatPercent(riskKPIs.cet1UnderStress, 2)}`);
  lines.push(`  - Avg 1Y PD: ${formatPercent(riskKPIs.avgPd1Y, 2)}`);
  lines.push(`  - EWS Red Alerts: ${riskKPIs.ewsAlerts}`);

  // EWS Entity Summary
  if (ewsSummary.length > 0) {
    lines.push('\nEWS Entity Summary:');
    ewsSummary.forEach((e) => {
      lines.push(
        `  - ${e.entity}: Avg EWS ${formatRating(e.avgEWSScore)}, Total Facilities ${e.totalFacilities}, ` +
        `Score 0: ${e.score0}, Score 1: ${e.score1}, Score 2: ${e.score2}, Score 3: ${e.score3}, Score 4+: ${e.score4Plus}, ` +
        `Flagged Exposure ${formatCurrencyMM(e.flaggedExposure)}, RAG: ${e.rag}`,
      );
    });
  }

  // EWS Facility Alerts (top 15)
  if (ewsAlerts.length > 0) {
    lines.push(`\nEWS Facility Alerts (top 15 of ${ewsAlerts.length}):`);
    ewsAlerts.slice(0, 15).forEach((a) => {
      lines.push(
        `  - ${a.obligor} (${a.entity}): EWS ${a.ewsScore}, Outstanding ${formatCurrencyMM(a.outstanding)}, ` +
        `Stage ${a.stage}, Triggers: ${a.triggers}, Action: ${a.action}`,
      );
    });
  }

  // FX Risk
  if (fxRisk.length > 0) {
    lines.push('\nFX Risk:');
    fxRisk.forEach((f) => {
      lines.push(
        `  - ${f.entity} (${f.primaryCurrency}): Rate ${f.fxRate.toFixed(4)}, ` +
        `Vol 30D ${formatPercent(f.volatility30Day, 1)}, Vol 90D ${formatPercent(f.volatility90Day, 1)}, ` +
        `YTD Deprec ${formatPercent(f.ytdDepreciation, 1)}, Exposure ${formatCurrencyMM(f.portfolioExposure)}, ` +
        `FX Impact ${formatCurrencyMM(f.fxImpact)}, Capital Controls: ${f.capitalControls ? 'Yes' : 'No'}, ` +
        `Transfer Risk: ${f.transferRisk}, RAG: ${f.rag}`,
      );
    });
  }

  // Country Risk
  if (countryRisk.length > 0) {
    lines.push('\nCountry Risk:');
    countryRisk.forEach((r) => {
      lines.push(
        `  - ${r.entity}: Sovereign ${formatRating(r.sovereignRating)}, Country Risk ${formatRating(r.countryRiskScore)}, ` +
        `Regulatory ${formatRating(r.regulatoryScore)}, Political Stability ${formatRating(r.politicalStabilityScore)}, ` +
        `Composite ${formatRating(r.compositeScore)}, Exposure ${formatCurrencyMM(r.exposure)}, ` +
        `RWA Share ${formatPercent(r.rwaShare, 1)}, Capital Impact ${formatCurrencyMM(r.capitalImpact)}, ` +
        `RAG: ${r.rag}, Recommendation: ${r.recommendation}`,
      );
    });
  }

  // ECL Forecast
  if (eclForecast.length > 0) {
    lines.push('\nECL Forecast:');
    const scenarios = Array.from(new Set(eclForecast.map((e) => e.scenario)));
    scenarios.forEach((scenario) => {
      const rows = eclForecast.filter((e) => e.scenario === scenario);
      const quarters = Array.from(new Set(rows.map((r) => r.quarter))).sort();
      quarters.forEach((q) => {
        const qRows = rows.filter((r) => r.quarter === q);
        const totalEcl = qRows.reduce((s, r) => s + r.eclAmountUsd, 0);
        lines.push(`  - ${scenario} / ${q}: Total ECL ${formatCurrencyMM(totalEcl)}`);
      });
    });
  }

  // ECL Waterfall
  if (eclWaterfall.length > 0) {
    lines.push('\nECL Waterfall (drivers):');
    const scenarios = Array.from(new Set(eclWaterfall.map((e) => e.scenario)));
    scenarios.forEach((scenario) => {
      const rows = eclWaterfall.filter((e) => e.scenario === scenario).sort((a, b) => a.sortOrder - b.sortOrder);
      lines.push(`  [${scenario}]:`);
      rows.forEach((r) => {
        lines.push(`    - ${r.driver}: ${formatCurrencyMM(r.amountUsd)}`);
      });
    });
  }

  // ECL Sensitivity
  if (eclSensitivity.length > 0) {
    lines.push('\nECL Sensitivity Analysis:');
    eclSensitivity.forEach((s) => {
      lines.push(
        `  - ${s.factor} (${s.direction}): Impact ${formatPercent(s.eclImpactPct, 2)}, Amount ${formatCurrencyMM(s.eclImpactAmount)}`,
      );
    });
  }

  // Stress Scenario Losses
  if (stressLosses.length > 0) {
    lines.push('\nStress Scenario Losses:');
    const scenarios = Array.from(new Set(stressLosses.map((s) => s.scenario)));
    scenarios.forEach((scenario) => {
      const rows = stressLosses.filter((s) => s.scenario === scenario);
      const totalLoss = rows.reduce((s, r) => s + r.lossAmountUsd, 0);
      lines.push(`  [${scenario}]: Total Loss ${formatCurrencyMM(totalLoss)}`);
      rows.slice(0, 5).forEach((r) => {
        lines.push(`    - ${r.segment}: Loss Rate ${formatPercent(r.lossRate, 2)}, Amount ${formatCurrencyMM(r.lossAmountUsd)}`);
      });
    });
  }

  // CET1 Trajectory
  if (cet1Trajectory.length > 0) {
    lines.push('\nCET1 Trajectory:');
    const scenarios = Array.from(new Set(cet1Trajectory.map((c) => c.scenario)));
    scenarios.forEach((scenario) => {
      const rows = cet1Trajectory.filter((c) => c.scenario === scenario).sort((a, b) => a.quarter.localeCompare(b.quarter));
      const trajectory = rows.map((r) => `${r.quarter}: ${formatPercent(r.cet1Ratio, 2)}`).join(', ');
      lines.push(`  - ${scenario}: ${trajectory}`);
    });
  }

  // Leading Indicators
  if (leadingIndicators.length > 0) {
    lines.push('\nLeading Indicators:');
    leadingIndicators.forEach((li) => {
      lines.push(
        `  - ${li.indicatorName} (${li.category}): Value ${li.currentValue.toFixed(2)}, Z-Score ${li.zScore.toFixed(2)}, ` +
        `Trend ${li.trend}, RAG: ${li.ragStatus}`,
      );
    });
  }

  // Macro-Credit Linkage (latest period per variable)
  if (macroCreditLinkage.length > 0) {
    lines.push('\nMacro-Credit Linkage:');
    const varMap = new Map<string, typeof macroCreditLinkage[0]>();
    macroCreditLinkage.forEach((m) => {
      const key = `${m.macroVariable}|${m.creditMetric}`;
      const existing = varMap.get(key);
      if (!existing || m.period > existing.period) {
        varMap.set(key, m);
      }
    });
    varMap.forEach((m) => {
      lines.push(
        `  - ${m.macroVariable} -> ${m.creditMetric} (${m.period}): Macro ${m.macroValue.toFixed(2)}, Credit ${m.creditValue.toFixed(2)}, Lead ${m.leadMonths}mo`,
      );
    });
  }

  // Risk Appetite Thresholds
  if (thresholds.length > 0) {
    lines.push('\nRisk Appetite Thresholds:');
    thresholds.slice(0, 20).forEach((t) => {
      lines.push(`  - ${t.metric_key} (${t.scope_level}): Appetite ${formatPercent(t.appetite, 2)}, Tolerance ${formatPercent(t.tolerance, 2)}`);
    });
  }

  return truncate(lines.join('\n'));
}

// =====================================================================
// Main API Route
// =====================================================================

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { activeTab } = body;

    if (typeof activeTab !== 'number' || activeTab < 0 || activeTab > 4) {
      return NextResponse.json(
        { error: 'Invalid activeTab. Must be 0-4.' },
        { status: 400 },
      );
    }

    const apiKey = process.env.KIE_API_KEY;
    if (!apiKey) {
      return NextResponse.json({
        error: 'The AI API key is not configured. Please set the KIE_API_KEY environment variable to enable executive summary generation.',
      });
    }

    const scope = parseScopeFromBody(body);
    const tabName = TAB_NAMES[activeTab] ?? 'Unknown';
    const scopeLbl = scopeLabel(scope);

    // Build context for the active tab
    let context: string;
    switch (activeTab) {
      case 0:
        context = await buildGroupOverviewContext(scope);
        break;
      case 1:
        context = await buildConsumerContext(scope);
        break;
      case 2:
        context = await buildTradeContext(scope);
        break;
      case 3:
        context = await buildCorporateContext(scope);
        break;
      case 4:
        context = await buildRiskContext(scope);
        break;
      default:
        context = '';
    }

    // System prompt requesting structured JSON
    const systemPrompt = `You are a senior credit risk analyst and CRO advisor for Baobab Group, a multi-geography financial holding group with 5 subsidiaries across South Asia, Middle East, Eastern Europe, and Latin America. The group operates in Consumer Finance, Trade Finance, and Corporate Finance.

You are generating an executive summary for the "${tabName}" dashboard view, scoped to: ${scopeLbl}.

Use the following portfolio data context to produce a comprehensive, data-driven executive summary. Reference specific numbers, trends, and entities from the data.

${context}

IMPORTANT: You MUST respond with valid JSON only. No markdown, no code fences, no explanation outside the JSON. The JSON must have exactly these keys:

{
  "outlook": "<string: 2-3 paragraphs. Start with macro/micro economic context relevant to the operating countries (South Asia, Middle East, Eastern Europe, Latin America). Discuss industry performance trends. Then position this portfolio within that context — what does the data say about the group's standing, relative strengths, and vulnerabilities?>",
  "kpis": [
    { "name": "<string>", "value": "<string: formatted value>", "trend": "<up|down|flat>", "comment": "<string: 1-line insight>" }
  ],
  "trends": [
    { "title": "<string>", "description": "<string: 2-3 sentences>", "sentiment": "<positive|negative|neutral>" }
  ],
  "watchItems": [
    { "title": "<string>", "description": "<string: 2-3 sentences explaining what needs attention and why>" }
  ],
  "recommendations": [
    { "title": "<string>", "rationale": "<string: 2-3 sentences with specific data-backed reasoning>" }
  ]
}

Guidelines:
- kpis: Include 8-12 KPIs most relevant to the "${tabName}" view. Use the data values directly.
- trends: 3-5 notable trends. Look for period-over-period changes, deterioration or improvement patterns, concentration shifts.
- watchItems: 2-4 items that require management attention. Be specific about thresholds, entities, or metrics that are concerning.
- recommendations: 3-5 actionable recommendations. Each must reference specific data points from the context to justify the recommendation.
- All monetary values should be formatted with currency symbols and appropriate scaling (M for millions, B for billions).
- Percentage values should include the % symbol.
- Be analytical, not generic. Avoid vague statements. Every claim must be traceable to the provided data.`;

    const res = await fetch('https://api.kie.ai/gemini-3-flash/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gemini-3-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Generate the executive summary for the "${tabName}" view now. Respond with JSON only.` },
        ],
      }),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => 'Unknown error');
      throw new Error(`KIE API error (${res.status}): ${errText}`);
    }

    const data = await res.json();
    const rawContent: string = data.choices?.[0]?.message?.content ?? '';

    // Attempt to parse the AI response as JSON
    let parsed: Record<string, unknown>;
    try {
      // Strip potential markdown code fences
      const cleaned = rawContent
        .replace(/^```json\s*/i, '')
        .replace(/^```\s*/i, '')
        .replace(/\s*```$/i, '')
        .trim();
      parsed = JSON.parse(cleaned);
    } catch {
      // Fallback: return raw text as outlook with empty arrays
      parsed = {
        outlook: rawContent,
        kpis: [],
        trends: [],
        watchItems: [],
        recommendations: [],
      };
    }

    return NextResponse.json({
      outlook: parsed.outlook ?? '',
      kpis: parsed.kpis ?? [],
      trends: parsed.trends ?? [],
      watchItems: parsed.watchItems ?? [],
      recommendations: parsed.recommendations ?? [],
      tabName,
      scopeLabel: scopeLbl,
    });
  } catch (err: unknown) {
    console.error('Exec summary generation error:', err);
    const message = err instanceof Error ? err.message : 'An unexpected error occurred';
    return NextResponse.json(
      { error: `Error generating executive summary: ${message}` },
      { status: 500 },
    );
  }
}
