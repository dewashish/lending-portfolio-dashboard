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
} from '@mui/material';
import { LoadingSkeleton } from '@/components/common/LoadingSkeleton';
import { BreachBadge } from '@/components/common/BreachBadge';
import { ProvisioningTrendChart } from '@/components/charts/ProvisioningTrendChart';
import { useCorporateProvisioningECL } from '@/hooks/useCorporateData';
import { formatCurrency, formatPercent } from '@/lib/format';
import type { ScopeSelection } from '@/lib/types';

interface Props {
  scope?: ScopeSelection;
}

export function CorporateProvisioningSection({ scope }: Props) {
  const { data: provisionData, isLoading } = useCorporateProvisioningECL(scope);

  if (isLoading) return <LoadingSkeleton />;

  const rows = provisionData ?? [];

  // Group rows by period for display
  const periods = Array.from(new Set(rows.map((r) => r.period))).sort();

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
      {/* PCR Trend Chart */}
      <ProvisioningTrendChart data={rows} />

      {/* Provisioning Table */}
      <Card sx={{ p: 2 }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 700, fontSize: '0.8rem', mb: 2 }}>
          IFRS Provisioning Detail
        </Typography>
        {rows.length === 0 ? (
          <Typography variant="caption" color="text.secondary">No provisioning data available</Typography>
        ) : (
          <TableContainer sx={{ maxHeight: 480 }}>
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem' }}>Period</TableCell>
                  <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem' }}>IFRS Stage</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700, fontSize: '0.75rem' }}>Gross Exposure</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700, fontSize: '0.75rem' }}>Provision Amount</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700, fontSize: '0.75rem' }}>PCR %</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {periods.map((period) => {
                  const periodRows = rows.filter((r) => r.period === period);
                  return periodRows.map((row, idx) => (
                    <TableRow key={`${period}-${idx}`} hover>
                      {idx === 0 ? (
                        <TableCell
                          rowSpan={periodRows.length}
                          sx={{ fontSize: '0.75rem', fontWeight: 600, verticalAlign: 'top' }}
                        >
                          {period}
                        </TableCell>
                      ) : null}
                      <TableCell sx={{ fontSize: '0.75rem' }}>{row.ifrsStage}</TableCell>
                      <TableCell align="right" sx={{ fontSize: '0.75rem', fontFamily: 'IBM Plex Mono, monospace' }}>
                        {formatCurrency(row.grossExposure)}
                      </TableCell>
                      <TableCell align="right" sx={{ fontSize: '0.75rem', fontFamily: 'IBM Plex Mono, monospace' }}>
                        {formatCurrency(row.provisionAmount)}
                      </TableCell>
                      <TableCell align="right" sx={{ fontSize: '0.75rem', fontFamily: 'IBM Plex Mono, monospace' }}>
                        <BreachBadge metricKey="corp_pcr" value={row.pcrPct}>
                          {formatPercent(row.pcrPct)}
                        </BreachBadge>
                      </TableCell>
                    </TableRow>
                  ));
                })}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Card>
    </Box>
  );
}
