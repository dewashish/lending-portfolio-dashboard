'use client';

import { useState } from 'react';
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
  Tabs,
  Tab,
} from '@mui/material';
import { LoadingSkeleton } from '@/components/common/LoadingSkeleton';
import { MaturityProfileChart } from '@/components/charts/MaturityProfileChart';
import { useCorporateMaturityProfile } from '@/hooks/useCorporateData';
import { formatPercent, formatNumber } from '@/lib/format';
import { useCurrencyFormat } from '@/lib/currency-context';
import type { ScopeSelection } from '@/lib/types';

type DistBasis = 'balance' | 'sanctionedAmount' | 'disbursedAmount';

interface Props {
  scope?: ScopeSelection;
}

export function CorporateMaturitySection({ scope }: Props) {
  const { formatCurrency } = useCurrencyFormat();
  const { data: maturityData, isLoading } = useCorporateMaturityProfile(scope);
  const [distBasis, setDistBasis] = useState<DistBasis>('balance');

  if (isLoading) return <LoadingSkeleton />;

  const rows = maturityData ?? [];
  const totalForBasis = rows.reduce((s, r) => s + r[distBasis], 0);

  const activeHeaderSx = { fontWeight: 800, bgcolor: 'rgba(25,118,210,0.08)' } as const;
  const activeCellSx = { fontWeight: 700, bgcolor: 'rgba(25,118,210,0.04)' } as const;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
      {/* Distribution Basis Tabs */}
      <Tabs
        value={distBasis}
        onChange={(_, v) => setDistBasis(v)}
        sx={{ mb: 2, minHeight: 32, '& .MuiTab-root': { minHeight: 32, py: 0.5, textTransform: 'none', fontSize: '0.75rem', fontWeight: 600 } }}
      >
        <Tab label="By POS" value="balance" />
        <Tab label="By Sanctioned" value="sanctionedAmount" />
        <Tab label="By Disbursed" value="disbursedAmount" />
      </Tabs>

      {/* Maturity Profile Chart */}
      <MaturityProfileChart data={rows} valueField={distBasis} />

      {/* Maturity Summary Table */}
      <Card sx={{ p: 2 }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 700, fontSize: '0.8rem', mb: 2 }}>
          Maturity Profile Detail
        </Typography>
        {rows.length === 0 ? (
          <Typography variant="caption" color="text.secondary">No maturity data available</Typography>
        ) : (
          <TableContainer sx={{ maxHeight: 480 }}>
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem' }}>Maturity Band</TableCell>
                  <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem' }}>Facility Basis</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700, fontSize: '0.75rem' }}>Facility Count</TableCell>
                  <TableCell
                    align="right"
                    sx={{
                      fontSize: '0.75rem',
                      fontWeight: distBasis === 'balance' ? 800 : 700,
                      ...(distBasis === 'balance' && activeHeaderSx),
                    }}
                  >
                    Balance
                  </TableCell>
                  <TableCell
                    align="right"
                    sx={{
                      fontSize: '0.75rem',
                      fontWeight: distBasis === 'sanctionedAmount' ? 800 : 700,
                      ...(distBasis === 'sanctionedAmount' && activeHeaderSx),
                    }}
                  >
                    Sanctioned
                  </TableCell>
                  <TableCell
                    align="right"
                    sx={{
                      fontSize: '0.75rem',
                      fontWeight: distBasis === 'disbursedAmount' ? 800 : 700,
                      ...(distBasis === 'disbursedAmount' && activeHeaderSx),
                    }}
                  >
                    Disbursed
                  </TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700, fontSize: '0.75rem' }}>Portfolio Share %</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.map((row, idx) => (
                  <TableRow key={idx} hover>
                    <TableCell sx={{ fontSize: '0.75rem' }}>{row.maturityBand}</TableCell>
                    <TableCell sx={{ fontSize: '0.75rem' }}>{row.facilityBasis}</TableCell>
                    <TableCell align="right" sx={{ fontSize: '0.75rem', fontFamily: 'IBM Plex Mono, monospace' }}>
                      {formatNumber(row.facilityCount)}
                    </TableCell>
                    <TableCell
                      align="right"
                      sx={{
                        fontSize: '0.75rem',
                        fontFamily: 'IBM Plex Mono, monospace',
                        ...(distBasis === 'balance' && activeCellSx),
                      }}
                    >
                      {formatCurrency(row.balance)}
                    </TableCell>
                    <TableCell
                      align="right"
                      sx={{
                        fontSize: '0.75rem',
                        fontFamily: 'IBM Plex Mono, monospace',
                        ...(distBasis === 'sanctionedAmount' && activeCellSx),
                      }}
                    >
                      {formatCurrency(row.sanctionedAmount)}
                    </TableCell>
                    <TableCell
                      align="right"
                      sx={{
                        fontSize: '0.75rem',
                        fontFamily: 'IBM Plex Mono, monospace',
                        ...(distBasis === 'disbursedAmount' && activeCellSx),
                      }}
                    >
                      {formatCurrency(row.disbursedAmount)}
                    </TableCell>
                    <TableCell align="right" sx={{ fontSize: '0.75rem', fontFamily: 'IBM Plex Mono, monospace' }}>
                      {formatPercent(totalForBasis > 0 ? row[distBasis] / totalForBasis : 0)}
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
