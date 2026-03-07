'use client';

import { useState } from 'react';
import { Grid, Box, Tabs, Tab, Card, Typography, Chip, Table, TableHead, TableBody, TableRow, TableCell, TableContainer } from '@mui/material';
import { KPIRow } from '@/components/cards/KPIRow';
import type { KPIItem } from '@/components/cards/KPIRow';
import { ProductMixTable } from '@/components/tables/ProductMixTable';
import { RatingDistributionBar } from '@/components/charts/RatingDistributionBar';
import { ConcentrationTreemap } from '@/components/charts/ConcentrationTreemap';
import { WatchlistTable } from '@/components/tables/WatchlistTable';
import { EntityBreakdownBar } from '@/components/charts/EntityBreakdownBar';
import { StagingDonut } from '@/components/charts/StagingDonut';
import { EntityPerformanceTable } from '@/components/tables/EntityPerformanceTable';
import { EWSRadar } from '@/components/charts/EWSRadar';
import { EWSAlertTable } from '@/components/tables/EWSAlertTable';
import { formatCurrencyMM, formatPercent, formatNumber, formatCurrency } from '@/lib/format';
import { RAG_COLORS } from '@/lib/constants';
import { ChartSkeleton } from '@/components/common/LoadingSkeleton';
import {
  useTradeExecutiveSummary,
  useTradeEntityPerformance,
  useTradeProductMix,
  useTradeAssetQuality,
  useTradeRatingDistribution,
  useTradeConcentrations,
  useTradeCollectionEfficiency,
  useTradeWatchlist,
} from '@/hooks/useTradeData';
import { useEWSEntitySummary, useEWSFacilityAlerts } from '@/hooks/useRiskData';
import type { ScopeSelection } from '@/lib/types';

const SUB_TABS = ['Overview', 'Product Mix', 'Concentrations', 'Watchlist', 'EWS'] as const;

interface Props {
  scope?: ScopeSelection;
}

export function TradeFinanceView({ scope }: Props) {
  const [subTab, setSubTab] = useState(0);

  const { data: summary, isLoading } = useTradeExecutiveSummary(scope);
  const { data: entityPerf } = useTradeEntityPerformance(scope);
  const { data: productMix } = useTradeProductMix(scope);
  const { data: assetQuality } = useTradeAssetQuality(scope);
  const { data: ratings } = useTradeRatingDistribution(scope);
  const { data: concentrations } = useTradeConcentrations(undefined, scope);
  const { data: collEff } = useTradeCollectionEfficiency(scope);
  const { data: watchlist } = useTradeWatchlist(scope);
  const { data: ewsSummary } = useEWSEntitySummary(scope);
  const { data: ewsAlerts } = useEWSFacilityAlerts(scope);

  const kpis: KPIItem[] = [
    { label: 'Trade Outstanding', value: formatCurrencyMM(summary?.totalAUM) },
    { label: 'Active Facilities', value: formatNumber(summary?.totalFacilities) },
    { label: 'NPL Ratio', value: formatPercent(summary?.nplRatio), color: (summary?.nplRatio ?? 0) > 0.05 ? '#f44336' : '#4caf50' },
    { label: 'Stage 2+3%', value: formatPercent(summary?.stage2Plus3Pct), color: (summary?.stage2Plus3Pct ?? 0) > 0.1 ? '#ff9800' : '#4caf50' },
    { label: 'Provision Coverage', value: formatPercent(summary?.provisionCoverage) },
    { label: 'Watchlist Exposure', value: formatCurrency(summary?.watchlistExposure), color: (summary?.watchlistExposure ?? 0) > 0 ? '#ff9800' : undefined },
  ];

  const renderSection = () => {
    if (isLoading) return <ChartSkeleton key="loading" height={400} />;

    switch (subTab) {
      case 0:
        return (
          <Box key="sub-0" sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <Grid container spacing={3}>
              <Grid item xs={12} md={7}>
                <EntityBreakdownBar data={entityPerf ?? []} />
              </Grid>
              <Grid item xs={12} md={5}>
                <StagingDonut data={assetQuality ?? []} />
              </Grid>
            </Grid>
            <EntityPerformanceTable data={entityPerf ?? []} />
            {(collEff ?? []).length > 0 && (
              <Card sx={{ p: 2 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, fontSize: '0.8rem', mb: 2 }}>Collection Efficiency</Typography>
                <TableContainer sx={{ maxHeight: 300 }}>
                  <Table size="small" stickyHeader>
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem' }}>Entity</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 700, fontSize: '0.75rem' }}>Efficiency</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 700, fontSize: '0.75rem' }}>Overdue</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 700, fontSize: '0.75rem' }}>Avg DPD</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 700, fontSize: '0.75rem' }}>Recovery</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 700, fontSize: '0.75rem' }}>Provision</TableCell>
                        <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem' }}>RAG</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {(collEff ?? []).map((row, idx) => (
                        <TableRow key={idx} hover>
                          <TableCell sx={{ fontSize: '0.75rem' }}>{row.entity}</TableCell>
                          <TableCell align="right" sx={{ fontSize: '0.75rem', fontFamily: 'IBM Plex Mono, monospace' }}>{formatPercent(row.collectionEfficiencyRatio)}</TableCell>
                          <TableCell align="right" sx={{ fontSize: '0.75rem', fontFamily: 'IBM Plex Mono, monospace' }}>{formatPercent(row.overdueRatio)}</TableCell>
                          <TableCell align="right" sx={{ fontSize: '0.75rem', fontFamily: 'IBM Plex Mono, monospace' }}>{formatNumber(row.avgDPD, 0)}</TableCell>
                          <TableCell align="right" sx={{ fontSize: '0.75rem', fontFamily: 'IBM Plex Mono, monospace' }}>{row.recoveryRate != null ? formatPercent(row.recoveryRate) : '—'}</TableCell>
                          <TableCell align="right" sx={{ fontSize: '0.75rem', fontFamily: 'IBM Plex Mono, monospace' }}>{formatCurrency(row.provisionOutstanding)}</TableCell>
                          <TableCell>
                            <Chip label={row.rag} size="small" sx={{ fontSize: '0.65rem', height: 20, bgcolor: `${RAG_COLORS[row.rag]}22`, color: RAG_COLORS[row.rag] }} />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Card>
            )}
          </Box>
        );
      case 1:
        return (
          <Grid key="sub-1" container spacing={3}>
            <Grid item xs={12} md={7}>
              <ProductMixTable data={productMix ?? []} />
            </Grid>
            <Grid item xs={12} md={5}>
              <RatingDistributionBar data={ratings ?? []} />
            </Grid>
          </Grid>
        );
      case 2:
        return (
          <Grid key="sub-2" container spacing={3}>
            <Grid item xs={12} md={6}>
              <ConcentrationTreemap data={concentrations ?? []} groupBy="obligor" />
            </Grid>
            <Grid item xs={12} md={6}>
              <ConcentrationTreemap data={concentrations ?? []} groupBy="sector" />
            </Grid>
          </Grid>
        );
      case 3:
        return <WatchlistTable key="sub-3" data={watchlist ?? []} />;
      case 4:
        return (
          <Box key="sub-4" sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <EWSRadar data={ewsSummary ?? []} />
            <EWSAlertTable data={ewsAlerts ?? []} />
          </Box>
        );
      default:
        return null;
    }
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <KPIRow items={kpis} />

      <Tabs
        value={subTab}
        onChange={(_, v) => setSubTab(v)}
        variant="scrollable"
        scrollButtons="auto"
        sx={{
          minHeight: 36,
          '& .MuiTab-root': { minHeight: 36, fontSize: '0.72rem', fontWeight: 600, textTransform: 'none', px: 1.5, py: 0.5 },
          '& .MuiTabs-indicator': { height: 2, borderRadius: 1 },
          borderBottom: 1,
          borderColor: 'divider',
        }}
      >
        {SUB_TABS.map((label) => (
          <Tab key={label} label={label} />
        ))}
      </Tabs>

      <Box sx={{ pt: 1 }}>{renderSection()}</Box>
    </Box>
  );
}
