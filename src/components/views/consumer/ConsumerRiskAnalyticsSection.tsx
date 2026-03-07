'use client';

import { Box } from '@mui/material';
import { BusinessSupportTable } from '@/components/tables/BusinessSupportTable';
import { LoadingSkeleton } from '@/components/common/LoadingSkeleton';
import { useApprovedBase, useRejectedBase } from '@/hooks/useConsumerData';

export function ConsumerRiskAnalyticsSection() {
  const { data: approved, isLoading: l1 } = useApprovedBase();
  const { data: rejected, isLoading: l2 } = useRejectedBase();

  if (l1 || l2) return <LoadingSkeleton />;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <BusinessSupportTable
        approvedData={approved ?? []}
        rejectedData={rejected ?? []}
      />
    </Box>
  );
}
