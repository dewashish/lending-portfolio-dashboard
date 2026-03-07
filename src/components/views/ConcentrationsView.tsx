'use client';

import {
  Box,
  Card,
  Typography,
  Grid,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  TableContainer,
  Chip,
} from '@mui/material';
import { ConcentrationTreemap } from '@/components/charts/ConcentrationTreemap';
import { formatCurrency, formatPercent, formatNumber } from '@/lib/format';
import { RAG_COLORS } from '@/lib/constants';
import type { PortfolioData, FilterState } from '@/lib/types';

interface Props {
  portfolio: PortfolioData;
  filters: FilterState;
}

export function ConcentrationsView({ portfolio }: Props) {
  const fxRisk = portfolio.fxRisk;
  const countryRisk = portfolio.countryRisk;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <ConcentrationTreemap data={portfolio.concentrationNodes} groupBy="obligor" />
        </Grid>
        <Grid item xs={12} md={6}>
          <ConcentrationTreemap data={portfolio.concentrationNodes} groupBy="sector" />
        </Grid>
      </Grid>

      {/* FX Risk Table */}
      <Card sx={{ p: 2 }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 700, fontSize: '0.8rem', mb: 2 }}>
          FX Risk
        </Typography>
        {fxRisk.length === 0 ? (
          <Typography variant="caption" color="text.secondary">
            No FX risk data available
          </Typography>
        ) : (
          <TableContainer sx={{ maxHeight: 400 }}>
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem' }}>Entity</TableCell>
                  <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem' }}>Currency</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700, fontSize: '0.75rem' }}>FX Rate</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700, fontSize: '0.75rem' }}>Vol 30D</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700, fontSize: '0.75rem' }}>Vol 90D</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700, fontSize: '0.75rem' }}>YTD Deprec.</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700, fontSize: '0.75rem' }}>Exposure</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700, fontSize: '0.75rem' }}>FX Impact</TableCell>
                  <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem' }}>Transfer Risk</TableCell>
                  <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem' }}>RAG</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {fxRisk.map((row, idx) => (
                  <TableRow key={idx} hover>
                    <TableCell sx={{ fontSize: '0.75rem' }}>{row.entity}</TableCell>
                    <TableCell sx={{ fontSize: '0.75rem' }}>{row.primaryCurrency}</TableCell>
                    <TableCell align="right" sx={{ fontSize: '0.75rem', fontFamily: 'IBM Plex Mono, monospace' }}>
                      {formatNumber(row.fxRate, 4)}
                    </TableCell>
                    <TableCell align="right" sx={{ fontSize: '0.75rem', fontFamily: 'IBM Plex Mono, monospace' }}>
                      {formatPercent(row.volatility30Day)}
                    </TableCell>
                    <TableCell align="right" sx={{ fontSize: '0.75rem', fontFamily: 'IBM Plex Mono, monospace' }}>
                      {formatPercent(row.volatility90Day)}
                    </TableCell>
                    <TableCell
                      align="right"
                      sx={{
                        fontSize: '0.75rem',
                        fontFamily: 'IBM Plex Mono, monospace',
                        color: row.ytdDepreciation > 0 ? '#f44336' : '#4caf50',
                      }}
                    >
                      {formatPercent(row.ytdDepreciation)}
                    </TableCell>
                    <TableCell align="right" sx={{ fontSize: '0.75rem', fontFamily: 'IBM Plex Mono, monospace' }}>
                      {formatCurrency(row.portfolioExposure)}
                    </TableCell>
                    <TableCell
                      align="right"
                      sx={{
                        fontSize: '0.75rem',
                        fontFamily: 'IBM Plex Mono, monospace',
                        color: row.fxImpact < 0 ? '#f44336' : '#4caf50',
                      }}
                    >
                      {formatCurrency(row.fxImpact)}
                    </TableCell>
                    <TableCell sx={{ fontSize: '0.75rem' }}>{row.transferRisk}</TableCell>
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
        )}
      </Card>

      {/* Country Risk Table */}
      <Card sx={{ p: 2 }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 700, fontSize: '0.8rem', mb: 2 }}>
          Country Risk
        </Typography>
        {countryRisk.length === 0 ? (
          <Typography variant="caption" color="text.secondary">
            No country risk data available
          </Typography>
        ) : (
          <TableContainer sx={{ maxHeight: 400 }}>
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem' }}>Entity</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700, fontSize: '0.75rem' }}>Sovereign Rating</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700, fontSize: '0.75rem' }}>Country Risk</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700, fontSize: '0.75rem' }}>Regulatory</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700, fontSize: '0.75rem' }}>Political Stability</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700, fontSize: '0.75rem' }}>Composite</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700, fontSize: '0.75rem' }}>Exposure</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700, fontSize: '0.75rem' }}>RWA Share</TableCell>
                  <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem' }}>Recommendation</TableCell>
                  <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem' }}>RAG</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {countryRisk.map((row, idx) => (
                  <TableRow key={idx} hover>
                    <TableCell sx={{ fontSize: '0.75rem' }}>{row.entity}</TableCell>
                    <TableCell align="right" sx={{ fontSize: '0.75rem', fontFamily: 'IBM Plex Mono, monospace' }}>
                      {formatNumber(row.sovereignRating, 1)}
                    </TableCell>
                    <TableCell align="right" sx={{ fontSize: '0.75rem', fontFamily: 'IBM Plex Mono, monospace' }}>
                      {formatNumber(row.countryRiskScore, 1)}
                    </TableCell>
                    <TableCell align="right" sx={{ fontSize: '0.75rem', fontFamily: 'IBM Plex Mono, monospace' }}>
                      {formatNumber(row.regulatoryScore, 1)}
                    </TableCell>
                    <TableCell align="right" sx={{ fontSize: '0.75rem', fontFamily: 'IBM Plex Mono, monospace' }}>
                      {formatNumber(row.politicalStabilityScore, 1)}
                    </TableCell>
                    <TableCell align="right" sx={{ fontSize: '0.75rem', fontFamily: 'IBM Plex Mono, monospace' }}>
                      {formatNumber(row.compositeScore, 1)}
                    </TableCell>
                    <TableCell align="right" sx={{ fontSize: '0.75rem', fontFamily: 'IBM Plex Mono, monospace' }}>
                      {formatCurrency(row.exposure)}
                    </TableCell>
                    <TableCell align="right" sx={{ fontSize: '0.75rem', fontFamily: 'IBM Plex Mono, monospace' }}>
                      {formatPercent(row.rwaShare)}
                    </TableCell>
                    <TableCell sx={{ fontSize: '0.75rem', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {row.recommendation}
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
        )}
      </Card>
    </Box>
  );
}
