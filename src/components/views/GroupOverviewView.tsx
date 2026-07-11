'use client';

import { useMemo } from 'react';
import {
  Box, Paper, Typography, Chip, Skeleton, Table, TableBody,
  TableCell, TableContainer, TableHead, TableRow,
} from '@mui/material';
import { KPIRow } from '@/components/cards/KPIRow';
import type { KPIItem } from '@/components/cards/KPIRow';
import { formatPercent, formatNumber } from '@/lib/format';
import { useCurrencyFormat } from '@/lib/currency-context';
import { RAG_COLORS } from '@/lib/constants';
import { BreachBadge } from '@/components/common/BreachBadge';
import type { ScopeSelection, RAGStatus } from '@/lib/types';
import { sortPeriods } from '@/lib/period-utils';
import type { RiskHeatmapCell } from '@/components/charts/SubsidiaryRiskHeatmap';
import { useGroupOverviewSummary } from '@/hooks/useOverviewData';
import { useRiskAppetite } from '@/hooks/useRiskAppetite';
import { buildThresholdContext } from '@/lib/risk-appetite/build-context';
import { AvaSparkButton } from '@/components/ava/AvaSparkButton';

// Section components
import { GroupPortfolioComposition } from '@/components/views/overview/GroupPortfolioComposition';
import { GroupTrendGrid } from '@/components/views/overview/GroupTrendGrid';
import { BusinessLineComparisonTable } from '@/components/views/overview/BusinessLineComparisonTable';
import { SubsidiaryRiskHeatmap } from '@/components/charts/SubsidiaryRiskHeatmap';

interface Props {
  scope?: ScopeSelection;
  onTabChange?: (tabIndex: number, subTabIndex?: number) => void;
  onScopeChange?: (scope: ScopeSelection) => void;
}

// ── Helpers ───────────────────────────────────────────────────────
function getLatestConsumerMetric(
  data: { metric: string; values: Record<string, number | string | null> }[],
  name: string,
): number | null {
  const row = data.find(d => d.metric === name);
  if (!row) return null;
  const keys = sortPeriods(Object.keys(row.values));
  const v = keys.length > 0 ? row.values[keys[keys.length - 1]] : null;
  return typeof v === 'number' ? v : null;
}

function extractSparkline(
  data: { metric: string; values: Record<string, number | string | null> }[],
  name: string,
): number[] {
  const row = data.find(d => d.metric === name);
  if (!row) return [];
  const keys = sortPeriods(Object.keys(row.values));
  return keys.slice(-6).map(k => {
    const v = row.values[k];
    return typeof v === 'number' ? v : 0;
  });
}

const HEATMAP_DIMENSIONS = [
  'Consumer 30+',
  'Trade NPL',
  'Corp WL',
  'EWS',
  'FX Risk',
  'Country',
  'Prov Cov',
] as const;

// ── Component ─────────────────────────────────────────────────────
export function GroupOverviewView({ scope, onTabChange, onScopeChange }: Props) {
  const { formatCurrency, formatCurrencyMM } = useCurrencyFormat();
  const { getColor, getStatus } = useRiskAppetite();
  const { data, isLoading } = useGroupOverviewSummary(scope);
  const ctx = useMemo(() => buildThresholdContext(scope), [scope]);

  const scorecard = useMemo(() => data?.scorecard ?? [], [data?.scorecard]);
  const tradeSummary = data?.tradeSummary ?? null;
  const corporateSummary = data?.corporateSummary ?? null;
  const consumerOverall = useMemo(() => data?.consumerOverall ?? [], [data?.consumerOverall]);
  const unsecuredFPD = useMemo(() => data?.unsecuredFPD ?? [], [data?.unsecuredFPD]);
  const ewsSummary = useMemo(() => data?.ewsSummary ?? [], [data?.ewsSummary]);
  const fxRisk = useMemo(() => data?.fxRisk ?? [], [data?.fxRisk]);
  const countryRisk = useMemo(() => data?.countryRisk ?? [], [data?.countryRisk]);
  const tradeAssetQuality = useMemo(() => data?.tradeAssetQuality ?? [], [data?.tradeAssetQuality]);
  const tradeEntityPerf = useMemo(() => data?.tradeEntityPerf ?? [], [data?.tradeEntityPerf]);
  const corporatePOSBySubsidiary = useMemo(() => data?.corporatePOSBySubsidiary ?? {}, [data?.corporatePOSBySubsidiary]);
  const corporateStageBalances = useMemo(() => data?.corporateStageBalances ?? { stage1: 0, stage2: 0, stage3: 0 }, [data?.corporateStageBalances]);

  // ── Derived KPIs ────────────────────────────────────────────────
  const totalConsumerAum = scorecard.reduce((s, r) => s + (r.consumerAumUsd ?? 0), 0);
  const totalTradeOutstanding = scorecard.reduce((s, r) => s + (r.tradeOutstandingUsd ?? 0), 0);
  const corporatePOS = corporateSummary?.totalPOS ?? 0;
  const groupAum = totalConsumerAum + totalTradeOutstanding + corporatePOS;

  const dpd30 = getLatestConsumerMetric(consumerOverall, '30+ Amt%');
  const dpd30Sparkline = extractSparkline(consumerOverall, '30+ Amt%');

  const tradeNPL = tradeSummary?.nplRatio ?? null;
  const corpNPA = corporateSummary?.npaRate ?? null;
  const blendedNPL = tradeNPL != null && corpNPA != null
    ? (totalTradeOutstanding + corporatePOS) > 0
      ? (tradeNPL * totalTradeOutstanding + corpNPA * corporatePOS) / (totalTradeOutstanding + corporatePOS)
      : (tradeNPL + corpNPA) / 2
    : tradeNPL ?? corpNPA;

  const ewsCriticalCount = ewsSummary.reduce((s, e) => s + (e.score4Plus > 0 ? 1 : 0), 0);

  const tradePCR = tradeSummary?.provisionCoverage ?? null;
  const corpPCR = corporateSummary?.provisionCoverageRatio ?? null;
  const blendedPCR = tradePCR != null && corpPCR != null
    ? (totalTradeOutstanding + corporatePOS) > 0
      ? (tradePCR * totalTradeOutstanding + corpPCR * corporatePOS) / (totalTradeOutstanding + corporatePOS)
      : (tradePCR + corpPCR) / 2
    : tradePCR ?? corpPCR;

  const consumerNCL = getLatestConsumerMetric(consumerOverall, 'Net Credit Loss');
  const tradeCreditCost = tradeSummary?.creditCost ?? null;
  const corpCreditCost = corporateSummary?.creditCost ?? null;
  const blendedCreditCost = (() => {
    const parts: { rate: number; weight: number }[] = [];
    if (consumerNCL != null) parts.push({ rate: consumerNCL, weight: totalConsumerAum });
    if (tradeCreditCost != null) parts.push({ rate: tradeCreditCost, weight: totalTradeOutstanding });
    if (corpCreditCost != null) parts.push({ rate: corpCreditCost, weight: corporatePOS });
    if (parts.length === 0) return null;
    const totalWeight = parts.reduce((s, p) => s + p.weight, 0);
    return totalWeight > 0
      ? parts.reduce((s, p) => s + p.rate * p.weight, 0) / totalWeight
      : parts.reduce((s, p) => s + p.rate, 0) / parts.length;
  })();

  const kpis: KPIItem[] = [
    { label: 'Group AUM', value: formatCurrencyMM(groupAum) },
    { label: 'Consumer AUM', value: formatCurrencyMM(totalConsumerAum) },
    { label: 'Trade Outstanding', value: formatCurrencyMM(totalTradeOutstanding) },
    { label: 'Corporate POS', value: formatCurrencyMM(corporatePOS) },
    {
      label: 'Group 30+ DPD',
      value: dpd30 != null ? formatPercent(dpd30) : '—',
      sparkline: dpd30Sparkline.length >= 2 ? dpd30Sparkline : undefined,
      invertTrend: true,
      metricKey: 'group_dpd_30_plus',
      rawValue: dpd30 ?? undefined,
      color: dpd30 != null ? getColor('group_dpd_30_plus', dpd30, ctx) : undefined,
      thresholdContext: ctx,
      ava: {
        insightId: 'overview.kpi.dpd30',
        breadcrumb: ['Group Overview', 'KPI', 'Group 30+ DPD'],
        selection: dpd30 != null ? [`30+ DPD ${formatPercent(dpd30)}`] : undefined,
      },
    },
    {
      label: 'Group NPL',
      value: blendedNPL != null ? formatPercent(blendedNPL) : '—',
      metricKey: 'group_npl',
      rawValue: blendedNPL ?? undefined,
      color: blendedNPL != null ? getColor('group_npl', blendedNPL, ctx) : undefined,
      thresholdContext: ctx,
      ava: {
        insightId: 'overview.kpi.npl',
        breadcrumb: ['Group Overview', 'KPI', 'Group NPL'],
        selection: blendedNPL != null ? [`NPL ${formatPercent(blendedNPL)}`] : undefined,
      },
    },
    {
      label: 'EWS Critical',
      value: formatNumber(ewsCriticalCount),
      metricKey: 'group_ews_critical',
      rawValue: ewsCriticalCount,
      color: getColor('group_ews_critical', ewsCriticalCount, ctx),
      thresholdContext: ctx,
      ava: {
        insightId: 'overview.kpis',
        breadcrumb: ['Group Overview', 'KPI', 'EWS Critical'],
      },
    },
    {
      label: 'Provision Coverage',
      value: blendedPCR != null ? formatPercent(blendedPCR) : '—',
      metricKey: 'group_provision_cov',
      rawValue: blendedPCR ?? undefined,
      color: blendedPCR != null ? getColor('group_provision_cov', blendedPCR, ctx) : undefined,
      thresholdContext: ctx,
      info: 'Exposure-weighted Trade + Corporate (Consumer: N/A)',
      ava: {
        insightId: 'overview.kpis',
        breadcrumb: ['Group Overview', 'KPI', 'Provision Coverage'],
      },
    },
    {
      label: 'Credit Cost',
      value: blendedCreditCost != null ? formatPercent(blendedCreditCost) : '—',
      metricKey: 'group_credit_cost',
      rawValue: blendedCreditCost ?? undefined,
      color: blendedCreditCost != null ? getColor('group_credit_cost', blendedCreditCost, ctx) : undefined,
      thresholdContext: ctx,
      info: 'Exposure-weighted: Consumer NCL + Trade + Corporate',
    },
  ];

  // ── Heatmap cells ───────────────────────────────────────────────
  const { heatmapCells, heatmapSubs } = useMemo(() => {
    const fxMap = new Map<string, { ytd: number; rag: RAGStatus }>();
    fxRisk.forEach(r => fxMap.set(r.entity, { ytd: r.ytdDepreciation, rag: r.rag }));

    const countryMap = new Map<string, { score: number; rag: RAGStatus }>();
    countryRisk.forEach(r => countryMap.set(r.entity, { score: r.compositeScore, rag: r.rag }));

    const provMap = new Map<string, number>();
    tradeEntityPerf.forEach(r => provMap.set(r.entity, r.provisionCoverage));

    const cells: RiskHeatmapCell[] = [];
    const subs: string[] = [];

    scorecard.forEach(s => {
      subs.push(s.subsidiary);
      const subId = s.subsidiaryId;

      // Consumer 30+ DPD
      const cd = s.consumerDelinquency30Plus;
      cells.push({
        subsidiary: s.subsidiary, subsidiaryId: subId,
        dimension: 'Consumer 30+',
        formattedValue: cd != null ? formatPercent(cd, 1) : '—',
        rag: cd != null ? (getStatus('dpd_30_plus', cd, ctx) as RAGStatus) : 'Green',
        tabIndex: 1, subTabIndex: 3, // Consumer → Delinquency
      });

      // Trade NPL
      const tnpl = s.tradeNplRatio;
      cells.push({
        subsidiary: s.subsidiary, subsidiaryId: subId,
        dimension: 'Trade NPL',
        formattedValue: tnpl != null ? formatPercent(tnpl, 1) : '—',
        rag: tnpl != null ? (getStatus('npl_ratio', tnpl, ctx) as RAGStatus) : 'Green',
        tabIndex: 3, // Trade Finance
      });

      // Corp Watchlist
      const cwl = s.corporateWatchlistCount;
      cells.push({
        subsidiary: s.subsidiary, subsidiaryId: subId,
        dimension: 'Corp WL',
        formattedValue: formatNumber(cwl),
        rag: cwl > 0 ? 'Amber' : 'Green',
        tabIndex: 2, subTabIndex: 6, // Corporate → Watchlist
      });

      // EWS Score
      const ews = s.avgEwsScore;
      cells.push({
        subsidiary: s.subsidiary, subsidiaryId: subId,
        dimension: 'EWS',
        formattedValue: ews != null ? formatNumber(ews, 1) : '—',
        rag: ews != null ? (getStatus('avg_ews_score', ews, ctx) as RAGStatus) : 'Green',
        tabIndex: 4, subTabIndex: 0, // Risk & Conc → EWS Radar
      });

      // FX Risk
      const fx = fxMap.get(s.subsidiary);
      cells.push({
        subsidiary: s.subsidiary, subsidiaryId: subId,
        dimension: 'FX Risk',
        formattedValue: fx ? formatPercent(fx.ytd, 1) : '—',
        rag: fx?.rag ?? 'Green',
        tabIndex: 4, subTabIndex: 2, // Risk & Conc → FX Risk
      });

      // Country Risk
      const cr = countryMap.get(s.subsidiary);
      cells.push({
        subsidiary: s.subsidiary, subsidiaryId: subId,
        dimension: 'Country',
        formattedValue: cr ? formatNumber(cr.score, 1) : '—',
        rag: cr?.rag ?? 'Green',
        tabIndex: 4, subTabIndex: 3, // Risk & Conc → Country Risk
      });

      // Provision Coverage
      const prov = provMap.get(s.subsidiary);
      cells.push({
        subsidiary: s.subsidiary, subsidiaryId: subId,
        dimension: 'Prov Cov',
        formattedValue: prov != null ? formatPercent(prov, 0) : '—',
        rag: prov == null ? 'Green' : prov >= 1 ? 'Green' : prov >= 0.8 ? 'Amber' : 'Red',
        tabIndex: 3, // Trade Finance
      });
    });

    return { heatmapCells: cells, heatmapSubs: subs };
  }, [scorecard, fxRisk, countryRisk, tradeEntityPerf, getStatus, ctx]);

  const handleHeatmapClick = (subsidiaryId: number, tabIndex: number, subTabIndex?: number) => {
    onScopeChange?.({ level: 'subsidiary', subsidiaryId });
    onTabChange?.(tabIndex, subTabIndex);
  };

  // ── Loading skeleton ────────────────────────────────────────────
  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        <Skeleton variant="rectangular" height={80} sx={{ borderRadius: 2 }} />
        <Skeleton variant="rectangular" height={48} sx={{ borderRadius: 2 }} />
        <Skeleton variant="rectangular" height={280} sx={{ borderRadius: 2 }} />
        <Skeleton variant="rectangular" height={300} sx={{ borderRadius: 2 }} />
        <Skeleton variant="rectangular" height={200} sx={{ borderRadius: 2 }} />
        <Skeleton variant="rectangular" height={200} sx={{ borderRadius: 2 }} />
        <Skeleton variant="rectangular" height={200} sx={{ borderRadius: 2 }} />
      </Box>
    );
  }

  // ── Scorecard totals row ────────────────────────────────────────
  const groupTotals = (() => {
    const dpdEntries = scorecard.filter(r => r.consumerDelinquency30Plus != null);
    const nplEntries = scorecard.filter(r => r.tradeNplRatio != null);
    const ewsEntries = scorecard.filter(r => r.avgEwsScore != null);
    return {
      consumerAumUsd: totalConsumerAum,
      tradeOutstandingUsd: totalTradeOutstanding,
      consumerDelinquency30Plus: dpdEntries.length > 0
        ? dpdEntries.reduce((s, r) => s + r.consumerDelinquency30Plus!, 0) / dpdEntries.length
        : null,
      tradeNplRatio: nplEntries.length > 0
        ? nplEntries.reduce((s, r) => s + r.tradeNplRatio!, 0) / nplEntries.length
        : null,
      corporateWatchlistCount: scorecard.reduce((s, r) => s + r.corporateWatchlistCount, 0),
      avgEwsScore: ewsEntries.length > 0
        ? ewsEntries.reduce((s, r) => s + r.avgEwsScore!, 0) / ewsEntries.length
        : null,
    };
  })();

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {/* Section 1: Hero KPIs */}
      <KPIRow items={kpis} />

      {/* Section 2: Portfolio Composition */}
      <GroupPortfolioComposition
        scorecard={scorecard}
        consumerAum={totalConsumerAum}
        tradeOutstanding={totalTradeOutstanding}
        corporatePOS={corporatePOS}
        tradeAssetQuality={tradeAssetQuality}
        corporatePOSBySubsidiary={corporatePOSBySubsidiary}
        corporateStageBalances={corporateStageBalances}
        onTabChange={onTabChange}
        onScopeChange={onScopeChange}
      />

      {/* Section 4: Subsidiary Risk Heatmap */}
      {heatmapSubs.length > 0 && (
        <SubsidiaryRiskHeatmap
          cells={heatmapCells}
          subsidiaries={heatmapSubs}
          dimensions={[...HEATMAP_DIMENSIONS]}
          onCellClick={handleHeatmapClick}
        />
      )}

      {/* Section 5: Trend Grid */}
      <GroupTrendGrid
        consumerOverall={consumerOverall}
        tradeSummary={tradeSummary}
        corporateSummary={corporateSummary}
        unsecuredFPD={unsecuredFPD}
        scope={scope}
      />

      {/* Section 6: Business Line Comparison */}
      <BusinessLineComparisonTable
        consumerOverall={consumerOverall}
        tradeSummary={tradeSummary}
        corporateSummary={corporateSummary}
        consumerAum={totalConsumerAum}
        onTabChange={onTabChange}
        unsecuredFPD={unsecuredFPD}
        groupExposure={groupAum}
        consumerNCL={consumerNCL}
        scope={scope}
      />

      {/* Section 7: Enhanced Consolidated Scorecard */}
      <Paper sx={{ p: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1, mb: 1.5 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
            Consolidated Scorecard
          </Typography>
          <AvaSparkButton context={{ insightId: 'overview.scorecard', breadcrumb: ['Group Overview', 'Consolidated Scorecard'] }} />
        </Box>
        {scorecard.length > 0 ? (
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700, fontSize: '0.7rem' }}>Subsidiary</TableCell>
                  <TableCell sx={{ fontWeight: 700, fontSize: '0.7rem' }}>Country</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700, fontSize: '0.7rem' }}>Consumer AUM</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700, fontSize: '0.7rem' }}>Trade O/S</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700, fontSize: '0.7rem' }}>30+ DPD</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700, fontSize: '0.7rem' }}>Trade NPL</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700, fontSize: '0.7rem' }}>Corp WL</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700, fontSize: '0.7rem' }}>EWS</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700, fontSize: '0.7rem' }}>FX YTD</TableCell>
                  <TableCell sx={{ fontWeight: 700, fontSize: '0.7rem' }}>EWS RAG</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {scorecard.map((row) => {
                  const hasRedMetric =
                    getStatus('dpd_30_plus', row.consumerDelinquency30Plus ?? 0, ctx) === 'Red' ||
                    getStatus('npl_ratio', row.tradeNplRatio ?? 0, ctx) === 'Red' ||
                    getStatus('avg_ews_score', row.avgEwsScore ?? 0, ctx) === 'Red';

                  return (
                    <TableRow
                      key={row.subsidiaryId}
                      hover
                      onClick={() => onScopeChange?.({ level: 'subsidiary', subsidiaryId: row.subsidiaryId })}
                      sx={{
                        cursor: 'pointer',
                        bgcolor: hasRedMetric ? 'rgba(244,67,54,0.04)' : undefined,
                        '&:hover': { bgcolor: hasRedMetric ? 'rgba(244,67,54,0.08)' : undefined },
                      }}
                    >
                      <TableCell sx={{ fontSize: '0.75rem', fontWeight: 600 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Chip label={row.shortCode} size="small" sx={{ fontSize: '0.6rem', height: 20 }} />
                          {row.subsidiary}
                        </Box>
                      </TableCell>
                      <TableCell sx={{ fontSize: '0.75rem' }}>{row.country}</TableCell>
                      <TableCell align="right" sx={{ fontSize: '0.75rem', fontFamily: 'IBM Plex Mono, monospace' }}>
                        {row.consumerAumUsd != null ? formatCurrency(row.consumerAumUsd) : '—'}
                      </TableCell>
                      <TableCell align="right" sx={{ fontSize: '0.75rem', fontFamily: 'IBM Plex Mono, monospace' }}>
                        {row.tradeOutstandingUsd != null ? formatCurrency(row.tradeOutstandingUsd) : '—'}
                      </TableCell>
                      <TableCell align="right" sx={{
                        fontSize: '0.75rem', fontFamily: 'IBM Plex Mono, monospace',
                        color: getColor('dpd_30_plus', row.consumerDelinquency30Plus ?? 0, ctx),
                      }}>
                        {row.consumerDelinquency30Plus != null ? (
                          <BreachBadge metricKey="dpd_30_plus" value={row.consumerDelinquency30Plus} context={buildThresholdContext({ level: 'subsidiary', subsidiaryId: row.subsidiaryId })}>
                            {formatPercent(row.consumerDelinquency30Plus, 2)}
                          </BreachBadge>
                        ) : '—'}
                      </TableCell>
                      <TableCell align="right" sx={{
                        fontSize: '0.75rem', fontFamily: 'IBM Plex Mono, monospace',
                        color: getColor('npl_ratio', row.tradeNplRatio ?? 0, ctx),
                      }}>
                        {row.tradeNplRatio != null ? (
                          <BreachBadge metricKey="npl_ratio" value={row.tradeNplRatio} context={buildThresholdContext({ level: 'subsidiary', subsidiaryId: row.subsidiaryId })}>
                            {formatPercent(row.tradeNplRatio)}
                          </BreachBadge>
                        ) : '—'}
                      </TableCell>
                      <TableCell align="right" sx={{
                        fontSize: '0.75rem', fontFamily: 'IBM Plex Mono, monospace',
                        color: row.corporateWatchlistCount > 0 ? '#ff9800' : '#4caf50',
                      }}>
                        {row.corporateWatchlistCount}
                      </TableCell>
                      <TableCell align="right" sx={{
                        fontSize: '0.75rem', fontFamily: 'IBM Plex Mono, monospace',
                        color: getColor('avg_ews_score', row.avgEwsScore ?? 0, ctx),
                      }}>
                        {row.avgEwsScore != null ? (
                          <BreachBadge metricKey="avg_ews_score" value={row.avgEwsScore} context={buildThresholdContext({ level: 'subsidiary', subsidiaryId: row.subsidiaryId })}>
                            {formatNumber(row.avgEwsScore, 1)}
                          </BreachBadge>
                        ) : '—'}
                      </TableCell>
                      <TableCell align="right" sx={{
                        fontSize: '0.75rem', fontFamily: 'IBM Plex Mono, monospace',
                        color: (row.fxYtdDepreciation ?? 0) > 0 ? '#f44336' : '#4caf50',
                      }}>
                        {row.fxYtdDepreciation != null ? formatPercent(row.fxYtdDepreciation) : '—'}
                      </TableCell>
                      <TableCell>
                        {row.ewsRagStatus ? (
                          <Chip label={row.ewsRagStatus} size="small" sx={{
                            fontSize: '0.65rem', height: 20,
                            bgcolor: `${RAG_COLORS[row.ewsRagStatus as RAGStatus] ?? '#666'}22`,
                            color: RAG_COLORS[row.ewsRagStatus as RAGStatus] ?? '#666',
                          }} />
                        ) : '—'}
                      </TableCell>
                    </TableRow>
                  );
                })}

                {/* Group Totals row */}
                <TableRow sx={{ bgcolor: 'action.hover' }}>
                  <TableCell sx={{ fontSize: '0.75rem', fontWeight: 800 }} colSpan={2}>
                    Group Total
                  </TableCell>
                  <TableCell align="right" sx={{ fontSize: '0.75rem', fontWeight: 700, fontFamily: 'IBM Plex Mono, monospace' }}>
                    {formatCurrency(groupTotals.consumerAumUsd)}
                  </TableCell>
                  <TableCell align="right" sx={{ fontSize: '0.75rem', fontWeight: 700, fontFamily: 'IBM Plex Mono, monospace' }}>
                    {formatCurrency(groupTotals.tradeOutstandingUsd)}
                  </TableCell>
                  <TableCell align="right" sx={{ fontSize: '0.75rem', fontWeight: 700, fontFamily: 'IBM Plex Mono, monospace' }}>
                    {groupTotals.consumerDelinquency30Plus != null ? formatPercent(groupTotals.consumerDelinquency30Plus, 2) : '—'}
                  </TableCell>
                  <TableCell align="right" sx={{ fontSize: '0.75rem', fontWeight: 700, fontFamily: 'IBM Plex Mono, monospace' }}>
                    {groupTotals.tradeNplRatio != null ? formatPercent(groupTotals.tradeNplRatio) : '—'}
                  </TableCell>
                  <TableCell align="right" sx={{ fontSize: '0.75rem', fontWeight: 700, fontFamily: 'IBM Plex Mono, monospace' }}>
                    {groupTotals.corporateWatchlistCount}
                  </TableCell>
                  <TableCell align="right" sx={{ fontSize: '0.75rem', fontWeight: 700, fontFamily: 'IBM Plex Mono, monospace' }}>
                    {groupTotals.avgEwsScore != null ? formatNumber(groupTotals.avgEwsScore, 1) : '—'}
                  </TableCell>
                  <TableCell colSpan={2} />
                </TableRow>
              </TableBody>
            </Table>
          </TableContainer>
        ) : (
          <Typography variant="body2" color="text.secondary" sx={{ py: 3, textAlign: 'center' }}>
            No consolidated data available. Run the schema and seed script first.
          </Typography>
        )}
      </Paper>
    </Box>
  );
}
