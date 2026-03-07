'use client';

import { useMemo } from 'react';
import { Box, Grid, Card, Typography, Stack } from '@mui/material';
import { CollectionMetricsTable } from '@/components/tables/CollectionMetricsTable';
import { CollectionTrend } from '@/components/charts/CollectionTrend';
import { LoadingSkeleton } from '@/components/common/LoadingSkeleton';
import { useCollectionMetrics } from '@/hooks/useConsumerData';
import { formatPercent } from '@/lib/format';
import type { ScopeSelection, CollectionMetricRow } from '@/lib/types';

interface Props {
  scope?: ScopeSelection;
}

interface CollectionKPI {
  label: string;
  value: string;
  color: string;
}

function CollectionKPIStrip({ kpis }: { kpis: CollectionKPI[] }) {
  return (
    <Stack direction="row" spacing={1.5}>
      {kpis.map((k) => (
        <Card key={k.label} sx={{ flex: 1, p: 1.5 }}>
          <Typography
            variant="caption"
            sx={{ fontSize: '0.58rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'text.secondary', display: 'block', mb: 0.3 }}
          >
            {k.label}
          </Typography>
          <Typography
            variant="h6"
            className="mono"
            sx={{ fontWeight: 800, fontSize: '1.1rem', lineHeight: 1, color: k.color }}
          >
            {k.value}
          </Typography>
        </Card>
      ))}
    </Stack>
  );
}

function computeCollectionKPIs(data: CollectionMetricRow[]): CollectionKPI[] {
  if (data.length === 0) return [];

  // Average roll backward (resolution rate) across all buckets
  const rollBackValues = data.filter((r) => r.rollBackward != null).map((r) => r.rollBackward!);
  const avgRollBack = rollBackValues.length > 0 ? rollBackValues.reduce((a, b) => a + b, 0) / rollBackValues.length : null;

  // Average roll forward (deterioration rate) across all buckets
  const rollFwdValues = data.filter((r) => r.rollForward != null).map((r) => r.rollForward!);
  const avgRollFwd = rollFwdValues.length > 0 ? rollFwdValues.reduce((a, b) => a + b, 0) / rollFwdValues.length : null;

  // Average stabilized rate
  const stabValues = data.filter((r) => r.stabilized != null).map((r) => r.stabilized!);
  const avgStab = stabValues.length > 0 ? stabValues.reduce((a, b) => a + b, 0) / stabValues.length : null;

  const kpis: CollectionKPI[] = [];

  if (avgRollBack != null) {
    kpis.push({
      label: 'Avg Resolution Rate',
      value: formatPercent(avgRollBack),
      color: avgRollBack > 0.2 ? '#66bb6a' : avgRollBack > 0.1 ? '#ffa726' : '#ef5350',
    });
  }
  if (avgRollFwd != null) {
    kpis.push({
      label: 'Avg Roll Forward',
      value: formatPercent(avgRollFwd),
      color: avgRollFwd <= 0.1 ? '#66bb6a' : avgRollFwd <= 0.2 ? '#ffa726' : '#ef5350',
    });
  }
  if (avgStab != null) {
    kpis.push({
      label: 'Avg Stabilized',
      value: formatPercent(avgStab),
      color: '#78909c',
    });
  }

  return kpis;
}

export function ConsumerCollectionsSection({ scope }: Props) {
  const { data: metrics, isLoading } = useCollectionMetrics(scope);

  const kpis = useMemo(() => computeCollectionKPIs(metrics ?? []), [metrics]);

  if (isLoading) return <LoadingSkeleton />;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
      {kpis.length > 0 && <CollectionKPIStrip kpis={kpis} />}

      <Grid container spacing={2}>
        <Grid item xs={12} md={7}>
          <CollectionMetricsTable data={metrics ?? []} />
        </Grid>
        <Grid item xs={12} md={5}>
          <CollectionTrend data={metrics ?? []} />
        </Grid>
      </Grid>
    </Box>
  );
}
