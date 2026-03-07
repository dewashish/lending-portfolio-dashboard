'use client';

import { Box, Grid } from '@mui/material';
import { NetFlowWaterfall } from '@/components/charts/NetFlowWaterfall';
import { RollRateHeatmap } from '@/components/charts/RollRateHeatmap';
import { RollRateSankey } from '@/components/charts/RollRateSankey';
import { LoadingSkeleton } from '@/components/common/LoadingSkeleton';
import { useNetFlowRates, useRollRates } from '@/hooks/useConsumerData';

export function ConsumerDelinquencySection() {
  const { data: netFlow, isLoading: l1 } = useNetFlowRates();
  const { data: rollRates, isLoading: l2 } = useRollRates();

  if (l1 || l2) return <LoadingSkeleton />;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {/* Top row: waterfall + sankey */}
      <Grid container spacing={2}>
        <Grid item xs={12} md={6}>
          <NetFlowWaterfall data={netFlow ?? []} />
        </Grid>
        <Grid item xs={12} md={6}>
          <RollRateSankey data={rollRates ?? []} />
        </Grid>
      </Grid>

      {/* Full-width heatmap */}
      <RollRateHeatmap data={rollRates ?? []} />
    </Box>
  );
}
