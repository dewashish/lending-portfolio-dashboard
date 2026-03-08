'use client';

import { useMemo } from 'react';
import { Box, Card, Typography, Stack, Chip } from '@mui/material';
import { ConsumerOverallTable } from '@/components/tables/ConsumerOverallTable';
import { DPDBucketDistribution } from '@/components/charts/DPDBucketDistribution';
import { OverviewSkeleton } from '@/components/common/LoadingSkeleton';
import { useConsumerOverall, useNetFlowRates } from '@/hooks/useConsumerData';
import { useRiskAppetite } from '@/hooks/useRiskAppetite';
import { BreachBadge } from '@/components/common/BreachBadge';
import { formatPercent } from '@/lib/format';
import { useCurrencyFormat } from '@/lib/currency-context';
import type { ScopeSelection, ConsumerMetricRow, ConsumerFilters } from '@/lib/types';

interface Props {
  scope?: ScopeSelection;
  filters?: ConsumerFilters;
}

/** Extract latest numeric value for a named metric */
function getLatestValue(data: ConsumerMetricRow[], metricName: string): number | null {
  const row = data.find((d) => d.metric === metricName);
  if (!row) return null;
  const keys = Object.keys(row.values).sort();
  if (keys.length === 0) return null;
  const v = row.values[keys[keys.length - 1]];
  return typeof v === 'number' ? v : null;
}

/** Get previous period value */
function getPreviousValue(data: ConsumerMetricRow[], metricName: string): number | null {
  const row = data.find((d) => d.metric === metricName);
  if (!row) return null;
  const keys = Object.keys(row.values).sort();
  if (keys.length < 2) return null;
  const v = row.values[keys[keys.length - 2]];
  return typeof v === 'number' ? v : null;
}

interface SummaryMetric {
  label: string;
  value: string;
  delta: number | null;
  rag: 'green' | 'amber' | 'red';
  invertDelta?: boolean;
  metricKey?: string;
  rawValue?: number;
}

function SummaryStrip({ metrics }: { metrics: SummaryMetric[] }) {
  return (
    <Card sx={{ p: 0, overflow: 'hidden' }}>
      <Stack
        direction="row"
        divider={<Box sx={{ width: '1px', bgcolor: 'divider', my: 1 }} />}
        sx={{ px: 1 }}
      >
        {metrics.map((m) => {
          const deltaColor =
            m.delta == null
              ? undefined
              : Math.abs(m.delta) < 0.5
                ? '#78909c'
                : (m.invertDelta ? m.delta < 0 : m.delta > 0)
                  ? '#66bb6a'
                  : '#ef5350';

          return (
            <Box key={m.label} sx={{ flex: 1, py: 1.5, px: 1.5, textAlign: 'center' }}>
              <Typography
                variant="caption"
                sx={{
                  fontSize: '0.6rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  color: 'text.secondary',
                  display: 'block',
                  mb: 0.5,
                }}
              >
                {m.label}
              </Typography>
              <Stack direction="row" alignItems="center" justifyContent="center" spacing={0.75}>
                {m.metricKey != null && m.rawValue != null ? (
                  <BreachBadge metricKey={m.metricKey} value={m.rawValue}>
                    <Typography
                      variant="h6"
                      className="mono"
                      sx={{ fontWeight: 800, fontSize: '1rem', lineHeight: 1 }}
                    >
                      {m.value}
                    </Typography>
                  </BreachBadge>
                ) : (
                  <Typography
                    variant="h6"
                    className="mono"
                    sx={{ fontWeight: 800, fontSize: '1rem', lineHeight: 1 }}
                  >
                    {m.value}
                  </Typography>
                )}
                <Box
                  sx={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    bgcolor: m.rag === 'green' ? '#66bb6a' : m.rag === 'amber' ? '#ffa726' : '#ef5350',
                    boxShadow: `0 0 4px ${m.rag === 'green' ? '#66bb6a80' : m.rag === 'amber' ? '#ffa72680' : '#ef535080'}`,
                    flexShrink: 0,
                  }}
                />
              </Stack>
              {m.delta != null && (
                <Chip
                  size="small"
                  label={`${m.delta >= 0 ? '+' : ''}${formatPercent(m.delta, 1)} MoM`}
                  sx={{
                    mt: 0.5,
                    height: 18,
                    fontSize: '0.6rem',
                    fontWeight: 700,
                    bgcolor: deltaColor ? `${deltaColor}18` : undefined,
                    color: deltaColor,
                    '& .MuiChip-label': { px: 0.75 },
                  }}
                />
              )}
            </Box>
          );
        })}
      </Stack>
    </Card>
  );
}

export function ConsumerOverviewSection({ scope, filters }: Props) {
  const { formatCurrency } = useCurrencyFormat();
  const { data: overall, isLoading: loadingOverall } = useConsumerOverall(scope, filters);
  const { data: netFlow, isLoading: loadingNetFlow } = useNetFlowRates(scope, filters);
  const { getStatus } = useRiskAppetite();

  const summaryMetrics = useMemo<SummaryMetric[]>(() => {
    if (!overall || overall.length === 0) return [];

    const computeMetric = (
      metricName: string,
      label: string,
      format: (v: number) => string,
      inverse: boolean,
      metricKey?: string,
    ): SummaryMetric => {
      const curr = getLatestValue(overall, metricName);
      const prev = getPreviousValue(overall, metricName);
      const delta = curr != null && prev != null && prev !== 0 ? ((curr - prev) / Math.abs(prev)) * 100 : null;

      let rag: 'green' | 'amber' | 'red' = 'green';
      if (curr != null && metricKey) {
        const status = getStatus(metricKey, curr);
        rag = status === 'Green' ? 'green' : status === 'Amber' ? 'amber' : 'red';
      }

      return {
        label,
        value: curr != null ? format(curr) : '—',
        delta,
        rag,
        invertDelta: inverse,
        metricKey,
        rawValue: curr ?? undefined,
      };
    };

    return [
      computeMetric('Total AUM', 'Total AUM', (v) => formatCurrency(v), false),
      computeMetric('FPD%', 'FPD Rate', (v) => formatPercent(v), true, 'fpd_pct'),
      computeMetric('30+ Amt%', '30+ DPD', (v) => formatPercent(v), true, 'dpd_30_plus'),
      computeMetric('90+ Amt%', '90+ DPD', (v) => formatPercent(v), true, 'dpd_90_plus'),
      computeMetric('Net Credit Loss', 'NCL Rate', (v) => formatPercent(v), true, 'net_credit_loss'),
    ];
  }, [overall, getStatus, formatCurrency]);

  if (loadingOverall || loadingNetFlow) return <OverviewSkeleton />;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
      {summaryMetrics.length > 0 && <SummaryStrip metrics={summaryMetrics} />}
      <ConsumerOverallTable data={overall ?? []} />
      <DPDBucketDistribution data={netFlow ?? []} />
    </Box>
  );
}
