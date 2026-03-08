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
  Chip,
  Stack,
} from '@mui/material';
import { LoadingSkeleton } from '@/components/common/LoadingSkeleton';
import { BreachBadge } from '@/components/common/BreachBadge';
import { useCorporateCovenants } from '@/hooks/useCorporateData';
import { formatPercent } from '@/lib/format';
import { useCurrencyFormat } from '@/lib/currency-context';
import type { ScopeSelection } from '@/lib/types';

interface Props {
  scope?: ScopeSelection;
}

export function CorporateCovenantSection({ scope }: Props) {
  const { formatCurrency } = useCurrencyFormat();
  const { data: covenants, isLoading } = useCorporateCovenants(scope);

  const rows = useMemo(() => covenants ?? [], [covenants]);

  // Compute covenant breach rate
  const breachRate = useMemo(() => {
    if (rows.length === 0) return 0;
    const breachedCount = rows.filter(
      (r) => r.npaFlag || r.watchlistFlag || r.restructuredFlag,
    ).length;
    return breachedCount / rows.length;
  }, [rows]);

  if (isLoading) return <LoadingSkeleton />;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
      {/* Breach Rate Header */}
      <Card sx={{ p: 2 }}>
        <Stack direction="row" alignItems="center" spacing={1.5}>
          <Typography variant="subtitle2" sx={{ fontWeight: 700, fontSize: '0.8rem' }}>
            Covenant Breach Rate:
          </Typography>
          <BreachBadge metricKey="corp_covenant_breach_rate" value={breachRate}>
            <Typography
              variant="h6"
              sx={{
                fontWeight: 800,
                fontSize: '1rem',
                fontFamily: 'IBM Plex Mono, monospace',
              }}
            >
              {formatPercent(breachRate)}
            </Typography>
          </BreachBadge>
        </Stack>
      </Card>

      {/* Covenant Tracking Table */}
      <Card sx={{ p: 2 }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 700, fontSize: '0.8rem', mb: 2 }}>
          Covenant Tracking
        </Typography>
        {rows.length === 0 ? (
          <Typography variant="caption" color="text.secondary">No covenant data available</Typography>
        ) : (
          <TableContainer sx={{ maxHeight: 480 }}>
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem' }}>Customer</TableCell>
                  <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem' }}>Facility Type</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700, fontSize: '0.75rem' }}>Sanctioned</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700, fontSize: '0.75rem' }}>Current POS</TableCell>
                  <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem' }}>Rating</TableCell>
                  <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem' }}>Covenant</TableCell>
                  <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem' }}>Frequency</TableCell>
                  <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem' }}>Flags</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.map((row, idx) => (
                  <TableRow key={idx} hover>
                    <TableCell sx={{ fontSize: '0.75rem' }}>{row.customerName}</TableCell>
                    <TableCell sx={{ fontSize: '0.75rem' }}>{row.facilityType}</TableCell>
                    <TableCell align="right" sx={{ fontSize: '0.75rem', fontFamily: 'IBM Plex Mono, monospace' }}>
                      {formatCurrency(row.sanctionedLimit)}
                    </TableCell>
                    <TableCell align="right" sx={{ fontSize: '0.75rem', fontFamily: 'IBM Plex Mono, monospace' }}>
                      {formatCurrency(row.currentPOS)}
                    </TableCell>
                    <TableCell sx={{ fontSize: '0.75rem' }}>{row.riskRating}</TableCell>
                    <TableCell
                      sx={{
                        fontSize: '0.75rem',
                        maxWidth: 200,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {row.covenantDescription}
                    </TableCell>
                    <TableCell sx={{ fontSize: '0.75rem' }}>{row.covenantFrequency}</TableCell>
                    <TableCell sx={{ fontSize: '0.75rem' }}>
                      <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                        {row.npaFlag && (
                          <Chip
                            label="NPA"
                            size="small"
                            sx={{ fontSize: '0.6rem', height: 18, bgcolor: 'rgba(244,67,54,0.15)', color: '#f44336' }}
                          />
                        )}
                        {row.watchlistFlag && (
                          <Chip
                            label="WL"
                            size="small"
                            sx={{ fontSize: '0.6rem', height: 18, bgcolor: 'rgba(255,152,0,0.15)', color: '#ff9800' }}
                          />
                        )}
                        {row.restructuredFlag && (
                          <Chip
                            label="Restruct"
                            size="small"
                            sx={{ fontSize: '0.6rem', height: 18, bgcolor: 'rgba(156,39,176,0.15)', color: '#ce93d8' }}
                          />
                        )}
                      </Box>
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
