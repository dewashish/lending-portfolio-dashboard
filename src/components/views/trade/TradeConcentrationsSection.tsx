'use client';

import { Grid } from '@mui/material';
import { ConcentrationTreemap } from '@/components/charts/ConcentrationTreemap';
import { useTradeConcentrations } from '@/hooks/useTradeData';
import { LoadingSkeleton } from '@/components/common/LoadingSkeleton';
import type { ScopeSelection } from '@/lib/types';

interface Props {
  scope?: ScopeSelection;
}

export function TradeConcentrationsSection({ scope }: Props) {
  const { data: concentrations, isLoading } = useTradeConcentrations(undefined, scope);

  if (isLoading) return <LoadingSkeleton />;

  return (
    <Grid container spacing={3}>
      <Grid item xs={12} md={6}>
        <ConcentrationTreemap data={concentrations ?? []} groupBy="obligor" />
      </Grid>
      <Grid item xs={12} md={6}>
        <ConcentrationTreemap data={concentrations ?? []} groupBy="sector" />
      </Grid>
    </Grid>
  );
}
