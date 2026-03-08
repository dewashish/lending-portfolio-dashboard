'use client';

import { useMemo } from 'react';
import { Box, Grid, Card, Typography, Stack } from '@mui/material';
import { NetFlowWaterfall } from '@/components/charts/NetFlowWaterfall';
import { RollRateHeatmap } from '@/components/charts/RollRateHeatmap';
import { RollRateSankey } from '@/components/charts/RollRateSankey';
import { ChartGridSkeleton } from '@/components/common/LoadingSkeleton';
import { useNetFlowRates, useRollRates, useConsumerOverall } from '@/hooks/useConsumerData';
import { useRiskAppetite } from '@/hooks/useRiskAppetite';
import { BreachBadge } from '@/components/common/BreachBadge';
import { formatPercent } from '@/lib/format';
import type { ScopeSelection, ConsumerMetricRow, ConsumerFilters } from '@/lib/types';

interface Props {
  scope?: ScopeSelection;
  filters?: ConsumerFilters;
}

function getLatest(data: ConsumerMetricRow[], name: string): number | null {
  const row = data.find((d) => d.metric === name);
  if (!row) return null;
  const keys = Object.keys(row.values).sort();
  const v = keys.length > 0 ? row.values[keys[keys.length - 1]] : null;
  return typeof v === 'number' ? v : null;
}

function getPrevious(data: ConsumerMetricRow[], name: string): number | null {
  const row = data.find((d) => d.metric === name);
  if (!row) return null;
  const keys = Object.keys(row.values).sort();
  const v = keys.length >= 2 ? row.values[keys[keys.length - 2]] : null;
  return typeof v === 'number' ? v : null;
}

interface DKpi {
  label: string;
  value: string;
  delta: number | null;
  color: string;
  metricKey?: string;
  rawValue?: number;
}

function DelinquencyKPIStrip({ kpis }: { kpis: DKpi[] }) {
  return (
    <Stack direction="row" spacing={1.5}>
      {kpis.map((k) => {
        const deltaColor =
          k.delta == null
            ? undefined
            : Math.abs(k.delta) < 0.5
              ? '#78909c'
              : k.delta < 0
                ? '#66bb6a'
                : '#ef5350';

        return (
          <Card key={k.label} sx={{ flex: 1, p: 1.5 }}>
            <Typography
              variant="caption"
              sx={{ fontSize: '0.58rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'text.secondary', display: 'block', mb: 0.3 }}
            >
              {k.label}
            </Typography>
            {k.metricKey != null && k.rawValue != null ? (
              <BreachBadge metricKey={k.metricKey} value={k.rawValue}>
                <Typography
                  variant="h6"
                  className="mono"
                  sx={{ fontWeight: 800, fontSize: '1.1rem', lineHeight: 1, color: k.color }}
                >
                  {k.value}
                </Typography>
              </BreachBadge>
            ) : (
              <Typography
                variant="h6"
                className="mono"
                sx={{ fontWeight: 800, fontSize: '1.1rem', lineHeight: 1, color: k.color }}
              >
                {k.value}
              </Typography>
            )}
            {k.delta != null && (
              <Typography
                variant="caption"
                sx={{ fontSize: '0.6rem', fontWeight: 700, color: deltaColor, mt: 0.3, display: 'block' }}
              >
                {k.delta >= 0 ? '+' : ''}{formatPercent(k.delta, 1)} MoM
              </Typography>
            )}
          </Card>
        );
      })}
    </Stack>
  );
}

export function ConsumerDelinquencySection({ scope, filters }: Props) {
  const { data: netFlow, isLoading: l1 } = useNetFlowRates(scope, filters);
  const { data: rollRates, isLoading: l2 } = useRollRates(scope, filters);
  const { data: overall } = useConsumerOverall(scope, filters);
  const { getColor } = useRiskAppetite();

  const kpis = useMemo<DKpi[]>(() => {
    if (!overall || overall.length === 0) return [];
    const defs = [
      { name: 'FPD%', label: 'FPD Rate', metricKey: 'fpd_pct' },
      { name: '30+ Amt%', label: '30+ DPD', metricKey: 'dpd_30_plus' },
      { name: '90+ Amt%', label: '90+ DPD', metricKey: 'dpd_90_plus' },
      { name: 'Net Credit Loss', label: 'NCL Rate', metricKey: 'net_credit_loss' },
    ];
    return defs.map(({ name, label, metricKey }) => {
      const curr = getLatest(overall, name);
      const prev = getPrevious(overall, name);
      const delta = curr != null && prev != null && prev !== 0 ? ((curr - prev) / Math.abs(prev)) * 100 : null;
      const color = curr == null ? '#78909c' : getColor(metricKey, curr);
      return { label, value: curr != null ? formatPercent(curr) : '—', delta, color, metricKey, rawValue: curr ?? undefined };
    });
  }, [overall, getColor]);

  if (l1 || l2) return <ChartGridSkeleton />;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
      {kpis.length > 0 && <DelinquencyKPIStrip kpis={kpis} />}

      <Grid container spacing={2}>
        <Grid item xs={12} md={6}>
          <NetFlowWaterfall data={netFlow ?? []} />
        </Grid>
        <Grid item xs={12} md={6}>
          <RollRateSankey data={rollRates ?? []} />
        </Grid>
      </Grid>

      <RollRateHeatmap data={rollRates ?? []} />
    </Box>
  );
}
