'use client';

import {
  Box,
  Card,
  Typography,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  TableContainer,
  Grid,
} from '@mui/material';
import { LoadingSkeleton } from '@/components/common/LoadingSkeleton';
import { ConcentrationTreemap } from '@/components/charts/ConcentrationTreemap';
import { IndustryConcentrationChart } from '@/components/charts/IndustryConcentrationChart';
import { useCorporateIndustryConcentration } from '@/hooks/useCorporateData';
import { formatPercent, formatNumber } from '@/lib/format';
import { useCurrencyFormat } from '@/lib/currency-context';
import type { ScopeSelection, ConcentrationNode } from '@/lib/types';

interface Props {
  scope?: ScopeSelection;
}

export function CorporateIndustrySection({ scope }: Props) {
  const { formatCurrency } = useCurrencyFormat();
  const { data: industryData, isLoading } = useCorporateIndustryConcentration(scope);

  if (isLoading) return <LoadingSkeleton />;

  const rows = industryData ?? [];

  // Build treemap data from latest period per sector
  const latestPeriod = rows.length > 0
    ? rows.reduce((latest, r) => r.period > latest ? r.period : latest, rows[0].period)
    : '';

  const treemapData: ConcentrationNode[] = rows
    .filter((r) => r.period === latestPeriod)
    .map((r) => ({
      name: r.sector,
      entity: '',
      category: 'sector',
      value: r.pos,
      portfolioShare: r.portfolioShare,
      facilities: r.facilityCount,
      rating: '',
    }));

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
      {/* Charts row */}
      <Grid container spacing={2}>
        <Grid item xs={12} md={6}>
          <ConcentrationTreemap data={treemapData} groupBy="sector" />
        </Grid>
        <Grid item xs={12} md={6}>
          <IndustryConcentrationChart data={rows} />
        </Grid>
      </Grid>

      {/* Industry Concentration Table */}
      <Card sx={{ p: 2 }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 700, fontSize: '0.8rem', mb: 2 }}>
          Industry Concentration Detail
        </Typography>
        {rows.length === 0 ? (
          <Typography variant="caption" color="text.secondary">No industry data available</Typography>
        ) : (
          <TableContainer sx={{ maxHeight: 480 }}>
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem' }}>Sector</TableCell>
                  <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem' }}>Period</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700, fontSize: '0.75rem' }}>Disbursement</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700, fontSize: '0.75rem' }}>POS</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700, fontSize: '0.75rem' }}>Portfolio Share %</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700, fontSize: '0.75rem' }}>IRR</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700, fontSize: '0.75rem' }}>Facility Count</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.map((row, idx) => (
                  <TableRow key={idx} hover>
                    <TableCell sx={{ fontSize: '0.75rem' }}>{row.sector}</TableCell>
                    <TableCell sx={{ fontSize: '0.75rem' }}>{row.period}</TableCell>
                    <TableCell align="right" sx={{ fontSize: '0.75rem', fontFamily: 'IBM Plex Mono, monospace' }}>
                      {formatCurrency(row.disbursement)}
                    </TableCell>
                    <TableCell align="right" sx={{ fontSize: '0.75rem', fontFamily: 'IBM Plex Mono, monospace' }}>
                      {formatCurrency(row.pos)}
                    </TableCell>
                    <TableCell align="right" sx={{ fontSize: '0.75rem', fontFamily: 'IBM Plex Mono, monospace' }}>
                      {formatPercent(row.portfolioShare)}
                    </TableCell>
                    <TableCell align="right" sx={{ fontSize: '0.75rem', fontFamily: 'IBM Plex Mono, monospace' }}>
                      {row.irr != null ? formatPercent(row.irr) : '—'}
                    </TableCell>
                    <TableCell align="right" sx={{ fontSize: '0.75rem', fontFamily: 'IBM Plex Mono, monospace' }}>
                      {formatNumber(row.facilityCount)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Card>
    </Box>
  );
}
