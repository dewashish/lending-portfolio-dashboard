'use client';

import { Box, Paper, Typography, Chip, Skeleton, Table, TableBody, TableCell, TableContainer, TableHead, TableRow } from '@mui/material';
import { KPIRow } from '@/components/cards/KPIRow';
import type { KPIItem } from '@/components/cards/KPIRow';
import { formatCurrency, formatCurrencyMM, formatPercent, formatNumber } from '@/lib/format';
import { RAG_COLORS } from '@/lib/constants';
import { BreachBadge } from '@/components/common/BreachBadge';
import type { ScopeSelection, RAGStatus } from '@/lib/types';
import { useSubsidiaryScorecard } from '@/hooks/useConsumerData';
import { useConsolidatedScorecard } from '@/hooks/useOverviewData';
import { useRiskAppetite } from '@/hooks/useRiskAppetite';

interface Props {
  scope?: ScopeSelection;
}

export function GroupOverviewView({ scope }: Props) {
  const { getColor } = useRiskAppetite();
  const { data: scorecard, isLoading: scorecardLoading } = useConsolidatedScorecard(scope);
  const { data: consumerScorecard, isLoading: consumerLoading } = useSubsidiaryScorecard(scope);

  const totalConsumerAum = (scorecard ?? []).reduce((s, r) => s + (r.consumerAumUsd ?? 0), 0);
  const totalTradeOutstanding = (scorecard ?? []).reduce((s, r) => s + (r.tradeOutstandingUsd ?? 0), 0);
  const totalWatchlist = (scorecard ?? []).reduce((s, r) => s + r.corporateWatchlistCount, 0);
  const avgEws = (scorecard ?? []).length > 0
    ? (scorecard ?? []).reduce((s, r) => s + (r.avgEwsScore ?? 0), 0) / (scorecard ?? []).length
    : 0;

  const kpis: KPIItem[] = [
    { label: 'Group AUM', value: formatCurrencyMM(totalConsumerAum + totalTradeOutstanding) },
    { label: 'Consumer AUM', value: formatCurrencyMM(totalConsumerAum) },
    { label: 'Trade Outstanding', value: formatCurrencyMM(totalTradeOutstanding) },
    { label: 'Corp Watchlist', value: formatNumber(totalWatchlist), color: totalWatchlist > 0 ? '#ff9800' : '#4caf50' },
    { label: 'Avg EWS Score', value: formatNumber(avgEws, 1), color: getColor('avg_ews_score', avgEws), metricKey: 'avg_ews_score', rawValue: avgEws },
    { label: 'Subsidiaries', value: formatNumber((scorecard ?? []).length) },
  ];

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <KPIRow items={kpis} />

      {/* Consolidated Scorecard */}
      <Paper sx={{ p: 2 }}>
        <Typography variant="subtitle2" sx={{ mb: 1.5, fontWeight: 700 }}>
          Consolidated Scorecard
        </Typography>
        {scorecardLoading ? (
          <Skeleton variant="rectangular" height={200} />
        ) : (scorecard ?? []).length > 0 ? (
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700, fontSize: '0.7rem' }}>Subsidiary</TableCell>
                  <TableCell sx={{ fontWeight: 700, fontSize: '0.7rem' }}>Country</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700, fontSize: '0.7rem' }}>Consumer AUM</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700, fontSize: '0.7rem' }}>Trade O/S</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700, fontSize: '0.7rem' }}>30+ DPD</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700, fontSize: '0.7rem' }}>Trade NPL</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700, fontSize: '0.7rem' }}>Corp WL</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700, fontSize: '0.7rem' }}>EWS</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700, fontSize: '0.7rem' }}>FX YTD</TableCell>
                  <TableCell sx={{ fontWeight: 700, fontSize: '0.7rem' }}>EWS RAG</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {(scorecard ?? []).map((row) => (
                  <TableRow key={row.subsidiaryId} hover>
                    <TableCell sx={{ fontSize: '0.75rem', fontWeight: 600 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Chip label={row.shortCode} size="small" sx={{ fontSize: '0.6rem', height: 20 }} />
                        {row.subsidiary}
                      </Box>
                    </TableCell>
                    <TableCell sx={{ fontSize: '0.75rem' }}>{row.country}</TableCell>
                    <TableCell align="right" sx={{ fontSize: '0.75rem', fontFamily: 'IBM Plex Mono, monospace' }}>
                      {row.consumerAumUsd != null ? formatCurrency(row.consumerAumUsd) : '—'}
                    </TableCell>
                    <TableCell align="right" sx={{ fontSize: '0.75rem', fontFamily: 'IBM Plex Mono, monospace' }}>
                      {row.tradeOutstandingUsd != null ? formatCurrency(row.tradeOutstandingUsd) : '—'}
                    </TableCell>
                    <TableCell align="right" sx={{
                      fontSize: '0.75rem', fontFamily: 'IBM Plex Mono, monospace',
                      color: getColor('dpd_30_plus', row.consumerDelinquency30Plus ?? 0),
                    }}>
                      {row.consumerDelinquency30Plus != null ? (
                        <BreachBadge metricKey="dpd_30_plus" value={row.consumerDelinquency30Plus}>
                          {formatPercent(row.consumerDelinquency30Plus, 2)}
                        </BreachBadge>
                      ) : '—'}
                    </TableCell>
                    <TableCell align="right" sx={{
                      fontSize: '0.75rem', fontFamily: 'IBM Plex Mono, monospace',
                      color: getColor('npl_ratio', row.tradeNplRatio ?? 0),
                    }}>
                      {row.tradeNplRatio != null ? (
                        <BreachBadge metricKey="npl_ratio" value={row.tradeNplRatio}>
                          {formatPercent(row.tradeNplRatio)}
                        </BreachBadge>
                      ) : '—'}
                    </TableCell>
                    <TableCell align="right" sx={{
                      fontSize: '0.75rem', fontFamily: 'IBM Plex Mono, monospace',
                      color: row.corporateWatchlistCount > 0 ? '#ff9800' : '#4caf50',
                    }}>
                      {row.corporateWatchlistCount}
                    </TableCell>
                    <TableCell align="right" sx={{
                      fontSize: '0.75rem', fontFamily: 'IBM Plex Mono, monospace',
                      color: getColor('avg_ews_score', row.avgEwsScore ?? 0),
                    }}>
                      {row.avgEwsScore != null ? (
                        <BreachBadge metricKey="avg_ews_score" value={row.avgEwsScore}>
                          {formatNumber(row.avgEwsScore, 1)}
                        </BreachBadge>
                      ) : '—'}
                    </TableCell>
                    <TableCell align="right" sx={{
                      fontSize: '0.75rem', fontFamily: 'IBM Plex Mono, monospace',
                      color: (row.fxYtdDepreciation ?? 0) > 0 ? '#f44336' : '#4caf50',
                    }}>
                      {row.fxYtdDepreciation != null ? formatPercent(row.fxYtdDepreciation) : '—'}
                    </TableCell>
                    <TableCell>
                      {row.ewsRagStatus ? (
                        <Chip label={row.ewsRagStatus} size="small" sx={{
                          fontSize: '0.65rem', height: 20,
                          bgcolor: `${RAG_COLORS[row.ewsRagStatus as RAGStatus] ?? '#666'}22`,
                          color: RAG_COLORS[row.ewsRagStatus as RAGStatus] ?? '#666',
                        }} />
                      ) : '—'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        ) : (
          <Typography variant="body2" color="text.secondary" sx={{ py: 3, textAlign: 'center' }}>
            No consolidated data available. Run the schema and seed script first.
          </Typography>
        )}
      </Paper>

      {/* Consumer Subsidiary Scorecard */}
      <Paper sx={{ p: 2 }}>
        <Typography variant="subtitle2" sx={{ mb: 1.5, fontWeight: 700 }}>
          Consumer Finance Scorecard
        </Typography>
        {consumerLoading ? (
          <Skeleton variant="rectangular" height={200} />
        ) : (consumerScorecard ?? []).length > 0 ? (
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700, fontSize: '0.7rem' }}>Subsidiary</TableCell>
                  <TableCell sx={{ fontWeight: 700, fontSize: '0.7rem' }}>Country</TableCell>
                  <TableCell sx={{ fontWeight: 700, fontSize: '0.7rem' }}>Type</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700, fontSize: '0.7rem' }}>AUM (USD)</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700, fontSize: '0.7rem' }}>AUM (Local)</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700, fontSize: '0.7rem' }}>30+ DPD</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700, fontSize: '0.7rem' }}>90+ DPD</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700, fontSize: '0.7rem' }}>NCL</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700, fontSize: '0.7rem' }}>FPD%</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {(consumerScorecard ?? []).map((row) => (
                  <TableRow key={row.subsidiaryId} hover>
                    <TableCell sx={{ fontSize: '0.75rem', fontWeight: 600 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Chip label={row.shortCode} size="small" sx={{ fontSize: '0.6rem', height: 20 }} />
                        {row.subsidiary}
                      </Box>
                    </TableCell>
                    <TableCell sx={{ fontSize: '0.75rem' }}>{row.country}</TableCell>
                    <TableCell sx={{ fontSize: '0.75rem' }}>{row.institutionType}</TableCell>
                    <TableCell align="right" sx={{ fontSize: '0.75rem', fontWeight: 600 }}>
                      {formatCurrency(row.aumUsd)}
                    </TableCell>
                    <TableCell align="right" sx={{ fontSize: '0.75rem' }}>
                      {row.aumLocal != null ? `${row.currencyCode} ${formatNumber(row.aumLocal)}` : '—'}
                    </TableCell>
                    <TableCell align="right" sx={{ fontSize: '0.75rem', color: getColor('dpd_30_plus', row.delinquency30Plus ?? 0) }}>
                      {row.delinquency30Plus != null ? (
                        <BreachBadge metricKey="dpd_30_plus" value={row.delinquency30Plus}>
                          {formatPercent(row.delinquency30Plus, 2)}
                        </BreachBadge>
                      ) : '—'}
                    </TableCell>
                    <TableCell align="right" sx={{ fontSize: '0.75rem', color: getColor('dpd_90_plus', row.delinquency90Plus ?? 0) }}>
                      {row.delinquency90Plus != null ? (
                        <BreachBadge metricKey="dpd_90_plus" value={row.delinquency90Plus}>
                          {formatPercent(row.delinquency90Plus, 2)}
                        </BreachBadge>
                      ) : '—'}
                    </TableCell>
                    <TableCell align="right" sx={{ fontSize: '0.75rem' }}>
                      {row.netCreditLoss != null ? formatPercent(row.netCreditLoss, 2) : '—'}
                    </TableCell>
                    <TableCell align="right" sx={{ fontSize: '0.75rem', color: getColor('fpd_pct', row.fpdPct ?? 0) }}>
                      {row.fpdPct != null ? (
                        <BreachBadge metricKey="fpd_pct" value={row.fpdPct}>
                          {formatPercent(row.fpdPct, 1)}
                        </BreachBadge>
                      ) : '—'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        ) : (
          <Typography variant="body2" color="text.secondary" sx={{ py: 3, textAlign: 'center' }}>
            No consumer subsidiary data available.
          </Typography>
        )}
      </Paper>
    </Box>
  );
}
