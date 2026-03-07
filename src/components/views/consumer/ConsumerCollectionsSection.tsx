'use client';

import { Box, Grid } from '@mui/material';
import { CollectionMetricsTable } from '@/components/tables/CollectionMetricsTable';
import { CollectionTrend } from '@/components/charts/CollectionTrend';
import { LoadingSkeleton } from '@/components/common/LoadingSkeleton';
import { useCollectionMetrics } from '@/hooks/useConsumerData';

export function ConsumerCollectionsSection() {
  const { data: metrics, isLoading } = useCollectionMetrics();

  if (isLoading) return <LoadingSkeleton />;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
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
