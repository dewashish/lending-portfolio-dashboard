'use client';

import { Box, Grid } from '@mui/material';
import { TDDTable } from '@/components/tables/TDDTable';
import { LoadingSkeleton } from '@/components/common/LoadingSkeleton';
import { useTDDPre, useTDDPost } from '@/hooks/useConsumerData';
import type { ScopeSelection, ConsumerFilters } from '@/lib/types';

interface Props {
  scope?: ScopeSelection;
  filters?: ConsumerFilters;
}

export function ConsumerTDDSection({ scope, filters }: Props) {
  const { data: pre, isLoading: l1 } = useTDDPre(scope, filters);
  const { data: post, isLoading: l2 } = useTDDPost(scope, filters);

  if (l1 || l2) return <LoadingSkeleton />;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
      <Grid container spacing={2}>
        <Grid item xs={12} md={6}>
          <TDDTable data={pre ?? []} variant="pre" title="Pre-Disbursal TDD Analysis" />
        </Grid>
        <Grid item xs={12} md={6}>
          <TDDTable data={post ?? []} variant="post" title="Post-Disbursal TDD Analysis" />
        </Grid>
      </Grid>
    </Box>
  );
}
