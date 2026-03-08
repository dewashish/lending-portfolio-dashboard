'use client';

import { Box, Grid } from '@mui/material';
import { EWSRadar } from '@/components/charts/EWSRadar';
import { EWSAlertTable } from '@/components/tables/EWSAlertTable';
import { StageMigrationMatrix } from '@/components/charts/StageMigrationMatrix';
import { DPDRollRateHeatmap } from '@/components/charts/DPDRollRateHeatmap';
import { useEWSEntitySummary, useEWSFacilityAlerts } from '@/hooks/useRiskData';
import { useTradeStageMigration, useTradeDPDRollRates } from '@/hooks/useTradeData';
import { LoadingSkeleton } from '@/components/common/LoadingSkeleton';
import type { ScopeSelection } from '@/lib/types';

interface Props {
  scope?: ScopeSelection;
}

export function TradeEWSSection({ scope }: Props) {
  const { data: ewsSummary, isLoading: loadingEWS } = useEWSEntitySummary(scope);
  const { data: ewsAlerts, isLoading: loadingAlerts } = useEWSFacilityAlerts(scope);
  const { data: stageMigration, isLoading: loadingMigration } = useTradeStageMigration(scope);
  const { data: dpdRollRates, isLoading: loadingDPD } = useTradeDPDRollRates(scope);

  if (loadingEWS || loadingAlerts || loadingMigration || loadingDPD) return <LoadingSkeleton />;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <EWSRadar data={ewsSummary ?? []} />
        </Grid>
        <Grid item xs={12} md={6}>
          <StageMigrationMatrix data={stageMigration ?? []} />
        </Grid>
      </Grid>

      <EWSAlertTable data={ewsAlerts ?? []} />

      <DPDRollRateHeatmap data={dpdRollRates ?? []} />
    </Box>
  );
}
