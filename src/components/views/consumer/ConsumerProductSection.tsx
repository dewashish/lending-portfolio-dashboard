'use client';

import { Box } from '@mui/material';
import { ConsumerProductTable } from '@/components/tables/ConsumerProductTable';
import { LoadingSkeleton } from '@/components/common/LoadingSkeleton';
import { useProductMetrics } from '@/hooks/useConsumerData';

export function ConsumerProductSection() {
  const { data: products, isLoading } = useProductMetrics();

  if (isLoading) return <LoadingSkeleton />;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <ConsumerProductTable data={products ?? []} />
    </Box>
  );
}
