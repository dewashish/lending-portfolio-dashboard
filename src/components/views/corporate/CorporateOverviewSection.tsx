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
import {
  useCorporatePortfolioMetrics,
  useCorporateTopCustomers,
  useCorporateExecutiveSummary,
} from '@/hooks/useCorporateData';
import { formatNumber } from '@/lib/format';
import { useCurrencyFormat } from '@/lib/currency-context';
import type { ScopeSelection } from '@/lib/types';

interface Props {
  scope?: ScopeSelection;
}

function dpdColor(dpd: number): string {
  if (dpd > 90) return '#f44336';
  if (dpd > 30) return '#ff9800';
  return '#4caf50';
}

function stageChip(stage: string) {
  let color = '#4caf50';
  let bg = 'rgba(76,175,80,0.15)';
  if (stage === 'Stage 2') {
    color = '#ff9800';
    bg = 'rgba(255,152,0,0.15)';
  } else if (stage === 'Stage 3') {
    color = '#f44336';
    bg = 'rgba(244,67,54,0.15)';
  }
  return (
    <Chip
      label={stage}
      size="small"
      sx={{ fontSize: '0.65rem', height: 20, bgcolor: bg, color }}
    />
  );
}

export function CorporateOverviewSection({ scope }: Props) {
  const { formatCurrency, formatCurrencyMM } = useCurrencyFormat();
  const { data: portfolio, isLoading: loadingPortfolio } = useCorporatePortfolioMetrics(scope);
  const { data: topCustomers, isLoading: loadingCustomers } = useCorporateTopCustomers(scope);
  const { data: summary, isLoading: loadingSummary } = useCorporateExecutiveSummary(scope);

  if (loadingPortfolio || loadingCustomers || loadingSummary) return <LoadingSkeleton />;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
      {/* Portfolio Summary Table */}
      {(portfolio ?? []).length > 0 && (
        <Card sx={{ p: 2 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 700, fontSize: '0.8rem', mb: 2 }}>
            Portfolio Summary
          </Typography>
          <TableContainer sx={{ maxHeight: 400 }}>
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem' }}>Particular</TableCell>
                  {Object.keys((portfolio ?? [])[0]?.months ?? {}).map((month) => (
                    <TableCell key={month} align="right" sx={{ fontWeight: 700, fontSize: '0.7rem' }}>
                      {month}
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {(portfolio ?? []).map((row, idx) => (
                  <TableRow key={idx} hover>
                    <TableCell sx={{ fontSize: '0.75rem', fontWeight: 600 }}>{row.particular}</TableCell>
                    {Object.values(row.months).map((val, mIdx) => (
                      <TableCell
                        key={mIdx}
                        align="right"
                        sx={{ fontSize: '0.75rem', fontFamily: 'IBM Plex Mono, monospace' }}
                      >
                        {typeof val.total === 'number' ? formatCurrency(val.total) : val.total}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Card>
      )}

      {/* Executive Summary Card */}
      {summary && (
        <Card sx={{ p: 2 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 700, fontSize: '0.8rem', mb: 1 }}>
            Executive Summary
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Total POS: {formatCurrencyMM(summary.totalPOS)} | Disbursement: {formatCurrencyMM(summary.totalDisbursement)} | Watchlist: {formatNumber(summary.watchlistCount)} | Delinquent: {formatNumber(summary.delinquentCount)}
          </Typography>
        </Card>
      )}

      {/* Top 20 Customers Table */}
      {(topCustomers ?? []).length > 0 && (
        <Card sx={{ p: 2 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 700, fontSize: '0.8rem', mb: 2 }}>
            Top 20 Customers
          </Typography>
          <TableContainer sx={{ maxHeight: 480 }}>
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem' }}>Rank</TableCell>
                  <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem' }}>Customer</TableCell>
                  <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem' }}>Sector</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700, fontSize: '0.75rem' }}>Sanctioned Limit</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700, fontSize: '0.75rem' }}>Disbursed Amount</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700, fontSize: '0.75rem' }}>Current POS</TableCell>
                  <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem' }}>Facility Type</TableCell>
                  <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem' }}>Risk Rating</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700, fontSize: '0.75rem' }}>DPD</TableCell>
                  <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem' }}>IFRS Stage</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {(topCustomers ?? []).map((row, idx) => (
                  <TableRow key={idx} hover>
                    <TableCell sx={{ fontSize: '0.75rem', fontFamily: 'IBM Plex Mono, monospace' }}>
                      {row.rankByPOS ?? idx + 1}
                    </TableCell>
                    <TableCell sx={{ fontSize: '0.75rem' }}>{row.customerName}</TableCell>
                    <TableCell sx={{ fontSize: '0.75rem' }}>{row.sector}</TableCell>
                    <TableCell align="right" sx={{ fontSize: '0.75rem', fontFamily: 'IBM Plex Mono, monospace' }}>
                      {formatCurrency(row.sanctionedLimit)}
                    </TableCell>
                    <TableCell align="right" sx={{ fontSize: '0.75rem', fontFamily: 'IBM Plex Mono, monospace' }}>
                      {formatCurrency(row.disbursedAmount)}
                    </TableCell>
                    <TableCell align="right" sx={{ fontSize: '0.75rem', fontFamily: 'IBM Plex Mono, monospace' }}>
                      {formatCurrency(row.currentPOS)}
                    </TableCell>
                    <TableCell sx={{ fontSize: '0.75rem' }}>{row.facilityType}</TableCell>
                    <TableCell sx={{ fontSize: '0.75rem' }}>{row.riskRating}</TableCell>
                    <TableCell
                      align="right"
                      sx={{
                        fontSize: '0.75rem',
                        fontFamily: 'IBM Plex Mono, monospace',
                        color: dpdColor(row.dpd),
                      }}
                    >
                      {row.dpd}
                    </TableCell>
                    <TableCell sx={{ fontSize: '0.75rem' }}>{stageChip(row.ifrsStage)}</TableCell>
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
