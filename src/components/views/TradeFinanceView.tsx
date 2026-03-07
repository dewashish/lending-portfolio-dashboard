'use client';

import { Grid, Box } from '@mui/material';
import { KPIRow } from '@/components/cards/KPIRow';
import type { KPIItem } from '@/components/cards/KPIRow';
import { ProductMixTable } from '@/components/tables/ProductMixTable';
import { RatingDistributionBar } from '@/components/charts/RatingDistributionBar';
import { ConcentrationTreemap } from '@/components/charts/ConcentrationTreemap';
import { WatchlistTable } from '@/components/tables/WatchlistTable';
import { formatCurrencyMM, formatPercent, formatNumber, formatCurrency } from '@/lib/format';
import type { PortfolioData, FilterState } from '@/lib/types';

interface Props {
  portfolio: PortfolioData;
  filters: FilterState;
}

export function TradeFinanceView({ portfolio }: Props) {
  const summary = portfolio.tradeExecutiveSummary;
  const facilities = portfolio.tradeFacilities;

  const totalOutstanding = facilities.reduce((sum, f) => sum + f.outstanding, 0);
  const avgTenor =
    facilities.length > 0
      ? facilities.reduce((sum, f) => sum + f.tenorDays, 0) / facilities.length
      : 0;
  const avgUtilization =
    facilities.length > 0
      ? facilities.reduce((sum, f) => sum + (f.facilityLimit > 0 ? f.outstanding / f.facilityLimit : 0), 0) /
        facilities.length
      : 0;

  const kpis: KPIItem[] = [
    {
      label: 'Trade Outstanding',
      value: formatCurrencyMM(summary?.totalAUM ?? totalOutstanding),
    },
    {
      label: 'Active Facilities',
      value: formatNumber(summary?.totalFacilities ?? facilities.length),
    },
    {
      label: 'NPL Ratio',
      value: formatPercent(summary?.nplRatio),
      color: (summary?.nplRatio ?? 0) > 0.05 ? '#f44336' : '#4caf50',
    },
    {
      label: 'Avg Tenor (days)',
      value: formatNumber(avgTenor, 0),
    },
    {
      label: 'Avg Utilization',
      value: formatPercent(avgUtilization),
    },
    {
      label: 'Watchlist Exposure',
      value: formatCurrency(summary?.watchlistExposure),
      color: (summary?.watchlistExposure ?? 0) > 0 ? '#ff9800' : undefined,
    },
  ];

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <KPIRow items={kpis} />

      <Grid container spacing={3}>
        <Grid item xs={12} md={7}>
          <ProductMixTable data={portfolio.productMix} />
        </Grid>
        <Grid item xs={12} md={5}>
          <RatingDistributionBar data={portfolio.ratingDistribution} />
        </Grid>
      </Grid>

      <ConcentrationTreemap data={portfolio.concentrationNodes} groupBy="obligor" />

      <WatchlistTable data={portfolio.watchlistAccounts} />
    </Box>
  );
}
