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
  Chip,
} from '@mui/material';
import { LoadingSkeleton } from '@/components/common/LoadingSkeleton';
import { RatingDistributionBar } from '@/components/charts/RatingDistributionBar';
import {
  useCorporateRatingAnalysis,
  useCorporateRatingMigration,
} from '@/hooks/useCorporateData';
import { formatCurrency, formatPercent, formatNumber } from '@/lib/format';
import type { ScopeSelection, RatingDistribution } from '@/lib/types';

interface Props {
  scope?: ScopeSelection;
}

function directionChip(direction: string) {
  let color = '#78909c';
  let bg = 'rgba(120,144,156,0.15)';
  const lower = direction.toLowerCase();
  if (lower === 'upgrade') {
    color = '#4caf50';
    bg = 'rgba(76,175,80,0.15)';
  } else if (lower === 'downgrade') {
    color = '#f44336';
    bg = 'rgba(244,67,54,0.15)';
  }
  return (
    <Chip
      label={direction}
      size="small"
      sx={{ fontSize: '0.65rem', height: 20, bgcolor: bg, color }}
    />
  );
}

export function CorporateRatingSection({ scope }: Props) {
  const { data: ratingData, isLoading: loadingRating } = useCorporateRatingAnalysis(scope);
  const { data: migrationData, isLoading: loadingMigration } = useCorporateRatingMigration(scope);

  if (loadingRating || loadingMigration) return <LoadingSkeleton />;

  const ratingRows = ratingData ?? [];
  const migrationRows = migrationData ?? [];

  // Convert rating analysis data to RatingDistribution shape for the chart
  // Use the latest period for the bar chart
  const latestPeriod = ratingRows.length > 0
    ? ratingRows.reduce((latest, r) => r.period > latest ? r.period : latest, ratingRows[0].period)
    : '';

  const barData: RatingDistribution[] = ratingRows
    .filter((r) => r.period === latestPeriod)
    .map((r) => ({
      ratingBand: r.ratingBand,
      count: r.facilityCount,
      balance: r.pos,
      portfolioShare: r.portfolioShare,
      avgProvision: 0,
    }));

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
      {/* Rating Distribution Chart */}
      <RatingDistributionBar data={barData} />

      {/* Rating Analysis Table */}
      <Card sx={{ p: 2 }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 700, fontSize: '0.8rem', mb: 2 }}>
          Rating Analysis Detail
        </Typography>
        {ratingRows.length === 0 ? (
          <Typography variant="caption" color="text.secondary">No rating data available</Typography>
        ) : (
          <TableContainer sx={{ maxHeight: 400 }}>
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem' }}>Period</TableCell>
                  <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem' }}>Rating Band</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700, fontSize: '0.75rem' }}>Disbursement</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700, fontSize: '0.75rem' }}>POS</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700, fontSize: '0.75rem' }}>Facility Count</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700, fontSize: '0.75rem' }}>Portfolio Share %</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {ratingRows.map((row, idx) => (
                  <TableRow key={idx} hover>
                    <TableCell sx={{ fontSize: '0.75rem' }}>{row.period}</TableCell>
                    <TableCell sx={{ fontSize: '0.75rem' }}>{row.ratingBand}</TableCell>
                    <TableCell align="right" sx={{ fontSize: '0.75rem', fontFamily: 'IBM Plex Mono, monospace' }}>
                      {formatCurrency(row.disbursement)}
                    </TableCell>
                    <TableCell align="right" sx={{ fontSize: '0.75rem', fontFamily: 'IBM Plex Mono, monospace' }}>
                      {formatCurrency(row.pos)}
                    </TableCell>
                    <TableCell align="right" sx={{ fontSize: '0.75rem', fontFamily: 'IBM Plex Mono, monospace' }}>
                      {formatNumber(row.facilityCount)}
                    </TableCell>
                    <TableCell align="right" sx={{ fontSize: '0.75rem', fontFamily: 'IBM Plex Mono, monospace' }}>
                      {formatPercent(row.portfolioShare)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Card>

      {/* Rating Migration Table */}
      <Card sx={{ p: 2 }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 700, fontSize: '0.8rem', mb: 2 }}>
          Rating Migration
        </Typography>
        {migrationRows.length === 0 ? (
          <Typography variant="caption" color="text.secondary">No migration data available</Typography>
        ) : (
          <TableContainer sx={{ maxHeight: 480 }}>
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem' }}>Customer</TableCell>
                  <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem' }}>Sector</TableCell>
                  <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem' }}>Prior Rating</TableCell>
                  <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem' }}>Current Rating</TableCell>
                  <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem' }}>Direction</TableCell>
                  <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem' }}>Trigger Reason</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700, fontSize: '0.75rem' }}>Exposure</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {migrationRows.map((row, idx) => (
                  <TableRow key={idx} hover>
                    <TableCell sx={{ fontSize: '0.75rem' }}>{row.customerName}</TableCell>
                    <TableCell sx={{ fontSize: '0.75rem' }}>{row.sector}</TableCell>
                    <TableCell sx={{ fontSize: '0.75rem' }}>{row.priorRating}</TableCell>
                    <TableCell sx={{ fontSize: '0.75rem' }}>{row.currentRating}</TableCell>
                    <TableCell sx={{ fontSize: '0.75rem' }}>{directionChip(row.migrationDirection)}</TableCell>
                    <TableCell sx={{ fontSize: '0.75rem', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {row.triggerReason}
                    </TableCell>
                    <TableCell align="right" sx={{ fontSize: '0.75rem', fontFamily: 'IBM Plex Mono, monospace' }}>
                      {formatCurrency(row.exposure)}
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
