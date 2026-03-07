'use client';

import { Box } from '@mui/material';
import { ConsumerOverallTable } from '@/components/tables/ConsumerOverallTable';
import { DPDBucketDistribution } from '@/components/charts/DPDBucketDistribution';
import { LoadingSkeleton } from '@/components/common/LoadingSkeleton';
import { useConsumerOverall, useNetFlowRates } from '@/hooks/useConsumerData';

export function ConsumerOverviewSection() {
  const { data: overall, isLoading: loadingOverall } = useConsumerOverall();
  const { data: netFlow, isLoading: loadingNetFlow } = useNetFlowRates();

  if (loadingOverall || loadingNetFlow) return <LoadingSkeleton />;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <ConsumerOverallTable data={overall ?? []} />
      <DPDBucketDistribution data={netFlow ?? []} />
    </Box>
  );
}
