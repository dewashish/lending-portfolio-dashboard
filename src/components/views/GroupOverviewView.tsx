'use client';

import { Grid, Box } from '@mui/material';
import { KPIRow } from '@/components/cards/KPIRow';
import type { KPIItem } from '@/components/cards/KPIRow';
import { EntityBreakdownBar } from '@/components/charts/EntityBreakdownBar';
import { StagingDonut } from '@/components/charts/StagingDonut';
import { EntityPerformanceTable } from '@/components/tables/EntityPerformanceTable';
import { formatCurrencyMM, formatPercent, formatNumber } from '@/lib/format';
import type { PortfolioData, FilterState } from '@/lib/types';

interface Props {
  portfolio: PortfolioData;
  filters: FilterState;
}

export function GroupOverviewView({ portfolio }: Props) {
  const summary = portfolio.tradeExecutiveSummary;

  const kpis: KPIItem[] = [
    {
      label: 'Total AUM',
      value: formatCurrencyMM(summary?.totalAUM),
    },
    {
      label: 'Total Facilities',
      value: formatNumber(summary?.totalFacilities),
    },
    {
      label: 'NPL Ratio',
      value: formatPercent(summary?.nplRatio),
      color: (summary?.nplRatio ?? 0) > 0.05 ? '#f44336' : '#4caf50',
    },
    {
      label: 'Stage 2+3%',
      value: formatPercent(summary?.stage2Plus3Pct),
      color: (summary?.stage2Plus3Pct ?? 0) > 0.1 ? '#ff9800' : '#4caf50',
    },
    {
      label: 'Provision Coverage',
      value: formatPercent(summary?.provisionCoverage),
    },
    {
      label: 'Watchlist Count',
      value: formatNumber(summary?.watchlistCount),
      color: (summary?.watchlistCount ?? 0) > 0 ? '#ff9800' : undefined,
    },
  ];

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <KPIRow items={kpis} />

      <Grid container spacing={3}>
        <Grid item xs={12} md={7}>
          <EntityBreakdownBar data={portfolio.entityPerformance} />
        </Grid>
        <Grid item xs={12} md={5}>
          <StagingDonut data={portfolio.assetQuality} />
        </Grid>
      </Grid>

      <EntityPerformanceTable data={portfolio.entityPerformance} />
    </Box>
  );
}
