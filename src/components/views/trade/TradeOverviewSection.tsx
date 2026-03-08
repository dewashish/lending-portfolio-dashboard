'use client';

import { Grid, Box, Card, Typography, Chip, Table, TableHead, TableBody, TableRow, TableCell, TableContainer } from '@mui/material';
import { EntityBreakdownBar } from '@/components/charts/EntityBreakdownBar';
import { StagingDonut } from '@/components/charts/StagingDonut';
import { EntityPerformanceTable } from '@/components/tables/EntityPerformanceTable';
import { BreachBadge } from '@/components/common/BreachBadge';
import { useTradeEntityPerformance, useTradeAssetQuality, useTradeCollectionEfficiency } from '@/hooks/useTradeData';
import { formatPercent, formatNumber } from '@/lib/format';
import { useCurrencyFormat } from '@/lib/currency-context';
import { RAG_COLORS } from '@/lib/constants';
import { LoadingSkeleton } from '@/components/common/LoadingSkeleton';
import type { ScopeSelection } from '@/lib/types';

interface Props {
  scope?: ScopeSelection;
}

export function TradeOverviewSection({ scope }: Props) {
  const { formatCurrency } = useCurrencyFormat();
  const { data: entityPerf, isLoading: loadingPerf } = useTradeEntityPerformance(scope);
  const { data: assetQuality, isLoading: loadingAQ } = useTradeAssetQuality(scope);
  const { data: collEff, isLoading: loadingColl } = useTradeCollectionEfficiency(scope);

  if (loadingPerf || loadingAQ || loadingColl) return <LoadingSkeleton />;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
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
          <Typography variant="subtitle2" sx={{ fontWeight: 700, fontSize: '0.8rem', mb: 2 }}>
            Collection Efficiency
          </Typography>
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
                    <TableCell align="right" sx={{ fontSize: '0.75rem', fontFamily: 'IBM Plex Mono, monospace' }}>
                      {formatPercent(row.collectionEfficiencyRatio)}
                    </TableCell>
                    <TableCell align="right" sx={{ fontSize: '0.75rem', fontFamily: 'IBM Plex Mono, monospace' }}>
                      <BreachBadge metricKey="trade_overdue_ratio" value={row.overdueRatio}>
                        {formatPercent(row.overdueRatio)}
                      </BreachBadge>
                    </TableCell>
                    <TableCell align="right" sx={{ fontSize: '0.75rem', fontFamily: 'IBM Plex Mono, monospace' }}>
                      {formatNumber(row.avgDPD, 0)}
                    </TableCell>
                    <TableCell align="right" sx={{ fontSize: '0.75rem', fontFamily: 'IBM Plex Mono, monospace' }}>
                      {row.recoveryRate != null ? formatPercent(row.recoveryRate) : '\u2014'}
                    </TableCell>
                    <TableCell align="right" sx={{ fontSize: '0.75rem', fontFamily: 'IBM Plex Mono, monospace' }}>
                      {formatCurrency(row.provisionOutstanding)}
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={row.rag}
                        size="small"
                        sx={{
                          fontSize: '0.65rem',
                          height: 20,
                          bgcolor: `${RAG_COLORS[row.rag]}22`,
                          color: RAG_COLORS[row.rag],
                        }}
                      />
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
}
