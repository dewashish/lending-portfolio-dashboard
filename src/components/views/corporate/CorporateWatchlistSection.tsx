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
import { useCorporateWatchlist } from '@/hooks/useCorporateData';
import type { ScopeSelection } from '@/lib/types';

interface Props {
  scope?: ScopeSelection;
}

export function CorporateWatchlistSection({ scope }: Props) {
  const { data: watchlist, isLoading } = useCorporateWatchlist(scope);

  if (isLoading) return <LoadingSkeleton />;

  const rows = watchlist ?? [];

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
      <Card sx={{ p: 2 }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 700, fontSize: '0.8rem', mb: 2 }}>
          Corporate Watchlist
        </Typography>
        {rows.length === 0 ? (
          <Typography variant="caption" color="text.secondary">No watchlist data available</Typography>
        ) : (
          <TableContainer sx={{ maxHeight: 480 }}>
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem' }}>Borrower</TableCell>
                  <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem' }}>Sector</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700, fontSize: '0.75rem' }}>Exposure</TableCell>
                  <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem' }}>EWS Trigger</TableCell>
                  <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem' }}>Rating</TableCell>
                  <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem' }}>Status</TableCell>
                  <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem' }}>Remedial Action</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.map((row, idx) => (
                  <TableRow key={idx} hover>
                    <TableCell sx={{ fontSize: '0.75rem' }}>{row.borrower}</TableCell>
                    <TableCell sx={{ fontSize: '0.75rem' }}>{row.sector}</TableCell>
                    <TableCell align="right" sx={{ fontSize: '0.75rem', fontFamily: 'IBM Plex Mono, monospace' }}>
                      {row.exposure}
                    </TableCell>
                    <TableCell sx={{ fontSize: '0.75rem' }}>{row.ewsTriggerType}</TableCell>
                    <TableCell sx={{ fontSize: '0.75rem' }}>{row.internalRating}</TableCell>
                    <TableCell sx={{ fontSize: '0.75rem' }}>
                      <Chip
                        label={row.status}
                        size="small"
                        sx={{
                          fontSize: '0.65rem',
                          height: 20,
                          bgcolor:
                            row.status === 'Active'
                              ? 'rgba(76,175,80,0.15)'
                              : row.status === 'Under Review'
                                ? 'rgba(255,152,0,0.15)'
                                : 'rgba(244,67,54,0.15)',
                          color:
                            row.status === 'Active'
                              ? '#4caf50'
                              : row.status === 'Under Review'
                                ? '#ff9800'
                                : '#f44336',
                        }}
                      />
                    </TableCell>
                    <TableCell sx={{ fontSize: '0.75rem' }}>{row.remedialAction}</TableCell>
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
