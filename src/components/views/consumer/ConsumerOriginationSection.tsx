'use client';

import { Box, Grid } from '@mui/material';
import { LOSComparisonTable } from '@/components/tables/LOSComparisonTable';
import { LOSFunnelChart } from '@/components/charts/LOSFunnelChart';
import { MTDComparisonBar } from '@/components/charts/MTDComparisonBar';
import { DailyDisbursementTrend } from '@/components/charts/DailyDisbursementTrend';
import { LoadingSkeleton } from '@/components/common/LoadingSkeleton';
import { useLOSMetrics, useLOSFunnel, useLOSDaily } from '@/hooks/useConsumerData';

export function ConsumerOriginationSection() {
  const { data: metrics, isLoading: l1 } = useLOSMetrics();
  const { data: funnel, isLoading: l2 } = useLOSFunnel();
  const { data: daily, isLoading: l3 } = useLOSDaily();

  if (l1 || l2 || l3) return <LoadingSkeleton />;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {/* Charts row */}
      <Grid container spacing={2}>
        <Grid item xs={12} md={5}>
          <LOSFunnelChart data={funnel ?? []} />
        </Grid>
        <Grid item xs={12} md={4}>
          <MTDComparisonBar data={metrics ?? []} />
        </Grid>
        <Grid item xs={12} md={3}>
          <DailyDisbursementTrend data={daily ?? []} />
        </Grid>
      </Grid>

      {/* Full-width MTD/LMTD/FTD table */}
      <LOSComparisonTable data={metrics ?? []} />
    </Box>
  );
}
