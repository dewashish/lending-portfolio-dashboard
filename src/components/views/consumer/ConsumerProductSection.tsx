'use client';

import { Box } from '@mui/material';
import { ConsumerProductTable } from '@/components/tables/ConsumerProductTable';
import { LoadingSkeleton } from '@/components/common/LoadingSkeleton';
import { useProductMetrics } from '@/hooks/useConsumerData';
import type { ScopeSelection, ConsumerFilters } from '@/lib/types';

interface Props {
  scope?: ScopeSelection;
  filters?: ConsumerFilters;
}

export function ConsumerProductSection({ scope, filters }: Props) {
  const { data: products, isLoading } = useProductMetrics(scope, filters);

  if (isLoading) return <LoadingSkeleton />;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <ConsumerProductTable data={products ?? []} />
    </Box>
  );
}
