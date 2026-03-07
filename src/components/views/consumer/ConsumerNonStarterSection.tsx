'use client';

import { Box } from '@mui/material';
import { NonStarterTable } from '@/components/tables/NonStarterTable';
import { LoadingSkeleton } from '@/components/common/LoadingSkeleton';
import { useNonStarters } from '@/hooks/useConsumerData';

export function ConsumerNonStarterSection() {
  const { data: nonStarters, isLoading } = useNonStarters();

  if (isLoading) return <LoadingSkeleton />;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <NonStarterTable data={nonStarters ?? []} />
    </Box>
  );
}
