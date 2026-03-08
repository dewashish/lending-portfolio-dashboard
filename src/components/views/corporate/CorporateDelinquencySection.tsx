'use client';

import { useMemo } from 'react';
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
  Stack,
} from '@mui/material';
import { LoadingSkeleton } from '@/components/common/LoadingSkeleton';
import { BreachBadge } from '@/components/common/BreachBadge';
import { useCorporateDelinquency } from '@/hooks/useCorporateData';
import { formatPercent } from '@/lib/format';
import { useCurrencyFormat } from '@/lib/currency-context';
import type { ScopeSelection } from '@/lib/types';

interface Props {
  scope?: ScopeSelection;
}

export function CorporateDelinquencySection({ scope }: Props) {
  const { formatCurrency } = useCurrencyFormat();
  const { data: delinquency, isLoading } = useCorporateDelinquency(scope);

  const rows = useMemo(() => delinquency ?? [], [delinquency]);

  // Compute delinquency rate
  const delinquencyRate = useMemo(() => {
    if (rows.length === 0) return 0;
    const delinquentCount = rows.filter((r) => r.currentDPD > 0).length;
    return delinquentCount / rows.length;
  }, [rows]);

  if (isLoading) return <LoadingSkeleton />;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
      {/* Delinquency Rate Header */}
      <Card sx={{ p: 2 }}>
        <Stack direction="row" alignItems="center" spacing={1.5}>
          <Typography variant="subtitle2" sx={{ fontWeight: 700, fontSize: '0.8rem' }}>
            Delinquency Rate:
          </Typography>
          <BreachBadge metricKey="corp_delinquency_rate" value={delinquencyRate}>
            <Typography
              variant="h6"
              sx={{
                fontWeight: 800,
                fontSize: '1rem',
                fontFamily: 'IBM Plex Mono, monospace',
              }}
            >
              {formatPercent(delinquencyRate)}
            </Typography>
          </BreachBadge>
        </Stack>
      </Card>

      {/* Delinquency Table */}
      <Card sx={{ p: 2 }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 700, fontSize: '0.8rem', mb: 2 }}>
          Delinquency Overview
        </Typography>
        {rows.length === 0 ? (
          <Typography variant="caption" color="text.secondary">No delinquency data available</Typography>
        ) : (
          <TableContainer sx={{ maxHeight: 480 }}>
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem' }}>Customer</TableCell>
                  <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem' }}>Sector</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700, fontSize: '0.75rem' }}>Current POS</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700, fontSize: '0.75rem' }}>DPD</TableCell>
                  <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem' }}>Rating</TableCell>
                  <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem' }}>Reason</TableCell>
                  <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem' }}>Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.map((row, idx) => (
                  <TableRow key={idx} hover>
                    <TableCell sx={{ fontSize: '0.75rem' }}>{row.customerName}</TableCell>
                    <TableCell sx={{ fontSize: '0.75rem' }}>{row.sector}</TableCell>
                    <TableCell align="right" sx={{ fontSize: '0.75rem', fontFamily: 'IBM Plex Mono, monospace' }}>
                      {formatCurrency(row.currentPOS)}
                    </TableCell>
                    <TableCell
                      align="right"
                      sx={{
                        fontSize: '0.75rem',
                        fontFamily: 'IBM Plex Mono, monospace',
                        color: row.currentDPD > 90 ? '#f44336' : row.currentDPD > 30 ? '#ff9800' : '#4caf50',
                      }}
                    >
                      {row.currentDPD}
                    </TableCell>
                    <TableCell sx={{ fontSize: '0.75rem' }}>{row.currentRating}</TableCell>
                    <TableCell
                      sx={{
                        fontSize: '0.75rem',
                        maxWidth: 200,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {row.reasonForDelinquency}
                    </TableCell>
                    <TableCell sx={{ fontSize: '0.75rem' }}>{row.currentStatus}</TableCell>
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
