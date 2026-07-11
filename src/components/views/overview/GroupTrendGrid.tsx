'use client';

import { Box, Paper, Typography } from '@mui/material';
import { AvaSparkButton } from '@/components/ava/AvaSparkButton';
import { KPICard } from '@/components/cards/KPICard';
import { formatPercent } from '@/lib/format';
import { sortPeriods } from '@/lib/period-utils';
import { buildThresholdContext } from '@/lib/risk-appetite/build-context';
import type { ConsumerMetricRow, PortfolioSummary, CorporatePortfolioSummary, ScopeSelection } from '@/lib/types';

interface Props {
  consumerOverall: ConsumerMetricRow[];
  tradeSummary: PortfolioSummary | null;
  corporateSummary: CorporatePortfolioSummary | null;
  unsecuredFPD?: ConsumerMetricRow[];
  scope?: ScopeSelection;
}

function extractSparkline(data: ConsumerMetricRow[], metricName: string): number[] {
  const row = data.find(d => d.metric === metricName);
  if (!row) return [];
  const keys = sortPeriods(Object.keys(row.values));
  return keys.slice(-6).map(k => {
    const v = row.values[k];
    return typeof v === 'number' ? v : 0;
  });
}

function extractLatest(data: ConsumerMetricRow[], metricName: string): number | null {
  const row = data.find(d => d.metric === metricName);
  if (!row) return null;
  const keys = sortPeriods(Object.keys(row.values));
  const v = keys.length > 0 ? row.values[keys[keys.length - 1]] : null;
  return typeof v === 'number' ? v : null;
}

function computeMoMTrend(data: ConsumerMetricRow[], metricName: string): number | undefined {
  const row = data.find(d => d.metric === metricName);
  if (!row) return undefined;
  const keys = sortPeriods(Object.keys(row.values));
  if (keys.length < 2) return undefined;
  const curr = row.values[keys[keys.length - 1]];
  const prev = row.values[keys[keys.length - 2]];
  if (typeof curr !== 'number' || typeof prev !== 'number' || prev === 0) return undefined;
  return ((curr - prev) / Math.abs(prev)) * 100;
}

function extractSparklineLabels(data: ConsumerMetricRow[], metricName: string): string[] {
  const row = data.find(d => d.metric === metricName);
  if (!row) return [];
  return sortPeriods(Object.keys(row.values)).slice(-6);
}

function buildSubtitle(data: ConsumerMetricRow[], metricName: string): string | undefined {
  const row = data.find(d => d.metric === metricName);
  if (!row) return undefined;
  const keys = sortPeriods(Object.keys(row.values));
  const last3 = keys.slice(-3);
  if (last3.length === 0) return undefined;
  return last3.map(k => {
    const v = row.values[k];
    const shortMonth = k.replace(/'.*/, '');
    return `${shortMonth}: ${typeof v === 'number' ? (v * 100).toFixed(1) + '%' : '—'}`;
  }).join('  ');
}

export function GroupTrendGrid({ consumerOverall, tradeSummary, corporateSummary, unsecuredFPD = [], scope }: Props) {
  const ctx = buildThresholdContext(scope);
  const dpd30 = extractLatest(consumerOverall, '30+ Amt%');
  const dpd60 = extractLatest(consumerOverall, '60+ Amt%');
  const dpd90 = extractLatest(consumerOverall, '90+ Amt%');
  const unsecuredFpd = extractLatest(unsecuredFPD, 'FPD% (Unsecured)');
  const ncl = extractLatest(consumerOverall, 'Net Credit Loss');

  const cards = [
    {
      label: '30+ DPD',
      value: dpd30 != null ? formatPercent(dpd30) : '—',
      subtitle: buildSubtitle(consumerOverall, '30+ Amt%'),
      sparkline: extractSparkline(consumerOverall, '30+ Amt%'),
      sparklineLabels: extractSparklineLabels(consumerOverall, '30+ Amt%'),
      trend: computeMoMTrend(consumerOverall, '30+ Amt%'),
      invertTrend: true,
      metricKey: 'dpd_30_plus',
      rawValue: dpd30,
      color: undefined as string | undefined,
    },
    {
      label: '60+ DPD',
      value: dpd60 != null ? formatPercent(dpd60) : '—',
      subtitle: buildSubtitle(consumerOverall, '60+ Amt%'),
      sparkline: extractSparkline(consumerOverall, '60+ Amt%'),
      sparklineLabels: extractSparklineLabels(consumerOverall, '60+ Amt%'),
      trend: computeMoMTrend(consumerOverall, '60+ Amt%'),
      invertTrend: true,
      metricKey: 'dpd_60_plus',
      rawValue: dpd60,
      color: undefined as string | undefined,
    },
    {
      label: '90+ DPD',
      value: dpd90 != null ? formatPercent(dpd90) : '—',
      subtitle: buildSubtitle(consumerOverall, '90+ Amt%'),
      sparkline: extractSparkline(consumerOverall, '90+ Amt%'),
      sparklineLabels: extractSparklineLabels(consumerOverall, '90+ Amt%'),
      trend: computeMoMTrend(consumerOverall, '90+ Amt%'),
      invertTrend: true,
      metricKey: 'dpd_90_plus',
      rawValue: dpd90,
      color: undefined as string | undefined,
    },
    {
      label: 'FPD% (Unsecured)',
      value: unsecuredFpd != null ? formatPercent(unsecuredFpd) : '—',
      subtitle: buildSubtitle(unsecuredFPD, 'FPD% (Unsecured)'),
      sparkline: extractSparkline(unsecuredFPD, 'FPD% (Unsecured)'),
      sparklineLabels: extractSparklineLabels(unsecuredFPD, 'FPD% (Unsecured)'),
      trend: computeMoMTrend(unsecuredFPD, 'FPD% (Unsecured)'),
      invertTrend: true,
      metricKey: 'fpd_pct',
      rawValue: unsecuredFpd,
      color: undefined as string | undefined,
    },
    {
      label: 'Net Credit Loss',
      value: ncl != null ? formatPercent(ncl) : '—',
      subtitle: buildSubtitle(consumerOverall, 'Net Credit Loss'),
      sparkline: extractSparkline(consumerOverall, 'Net Credit Loss'),
      sparklineLabels: extractSparklineLabels(consumerOverall, 'Net Credit Loss'),
      trend: computeMoMTrend(consumerOverall, 'Net Credit Loss'),
      invertTrend: true,
      metricKey: 'net_credit_loss',
      rawValue: ncl,
      color: undefined as string | undefined,
    },
    {
      label: 'Trade NPL',
      value: tradeSummary ? formatPercent(tradeSummary.nplRatio) : '—',
      subtitle: undefined as string | undefined,
      sparkline: undefined as number[] | undefined,
      sparklineLabels: undefined as string[] | undefined,
      trend: undefined as number | undefined,
      invertTrend: true,
      metricKey: 'npl_ratio',
      rawValue: tradeSummary?.nplRatio ?? null,
      color: undefined as string | undefined,
    },
    {
      label: 'Corp NPA',
      value: corporateSummary ? formatPercent(corporateSummary.npaRate) : '—',
      subtitle: undefined as string | undefined,
      sparkline: undefined as number[] | undefined,
      sparklineLabels: undefined as string[] | undefined,
      trend: undefined as number | undefined,
      invertTrend: true,
      metricKey: 'corp_npa_rate',
      rawValue: corporateSummary?.npaRate ?? null,
      color: undefined as string | undefined,
    },
  ];

  return (
    <Paper sx={{ p: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1, mb: 1.5 }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
          Key Risk Trends
        </Typography>
        <AvaSparkButton context={{ insightId: 'overview.trends', breadcrumb: ['Group Overview', 'Key Risk Trends'] }} />
      </Box>
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(4, 1fr)', lg: 'repeat(7, 1fr)' }, gap: 1.5 }}>
        {cards.map(c => (
          <KPICard
            key={c.label}
            ava={{
              insightId: /fpd/i.test(c.label) ? 'consumer.kpi.fpd' : /ncl|credit loss/i.test(c.label) ? 'consumer.kpi.ncl' : /npl|npa/i.test(c.label) ? 'overview.kpis' : 'overview.kpi.dpd30',
              breadcrumb: ['Group Overview', 'Key Risk Trends', c.label],
              selection: [`${c.label} ${c.value}`],
            }}
            label={c.label}
            value={c.value}
            subtitle={c.subtitle}
            sparkline={c.sparkline}
            sparklineLabels={c.sparklineLabels}
            trend={c.trend != null ? { value: c.trend } : undefined}
            invertTrend={c.invertTrend}
            metricKey={c.metricKey}
            rawValue={c.rawValue ?? undefined}
            thresholdContext={ctx}
          />
        ))}
      </Box>
    </Paper>
  );
}
