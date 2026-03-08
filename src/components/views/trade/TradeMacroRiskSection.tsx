'use client';

import { Box, Card, Typography, Table, TableHead, TableBody, TableRow, TableCell, TableContainer, Chip } from '@mui/material';
import { CompositeRiskHeatmap } from '@/components/charts/CompositeRiskHeatmap';
import { useFXRisk, useCountryRisk, useEWSEntitySummary } from '@/hooks/useRiskData';
import { formatPercent, formatCurrencyMM, formatRating } from '@/lib/format';
import { RAG_COLORS } from '@/lib/constants';
import { LoadingSkeleton } from '@/components/common/LoadingSkeleton';
import type { ScopeSelection } from '@/lib/types';

interface Props {
  scope?: ScopeSelection;
}

export function TradeMacroRiskSection({ scope }: Props) {
  const { data: fxData, isLoading: loadingFX } = useFXRisk(scope);
  const { data: countryData, isLoading: loadingCountry } = useCountryRisk(scope);
  const { data: ewsData, isLoading: loadingEWS } = useEWSEntitySummary(scope);

  if (loadingFX || loadingCountry || loadingEWS) return <LoadingSkeleton />;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {/* FX Risk Table */}
      <Card sx={{ p: 2 }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 700, fontSize: '0.8rem', mb: 2 }}>
          FX Risk
        </Typography>
        <TableContainer sx={{ maxHeight: 340 }}>
          <Table size="small" stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem' }}>Entity</TableCell>
                <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem' }}>Primary Currency</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700, fontSize: '0.75rem' }}>Vol 30D</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700, fontSize: '0.75rem' }}>YTD Depreciation</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700, fontSize: '0.75rem' }}>VaR Limit</TableCell>
                <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem' }}>RAG</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {(fxData ?? []).map((row, idx) => (
                <TableRow key={idx} hover>
                  <TableCell sx={{ fontSize: '0.75rem' }}>{row.entity}</TableCell>
                  <TableCell sx={{ fontSize: '0.75rem' }}>{row.primaryCurrency}</TableCell>
                  <TableCell align="right" sx={{ fontSize: '0.75rem', fontFamily: 'IBM Plex Mono, monospace' }}>
                    {formatPercent(row.volatility30Day)}
                  </TableCell>
                  <TableCell align="right" sx={{ fontSize: '0.75rem', fontFamily: 'IBM Plex Mono, monospace' }}>
                    {formatPercent(row.ytdDepreciation)}
                  </TableCell>
                  <TableCell align="right" sx={{ fontSize: '0.75rem', fontFamily: 'IBM Plex Mono, monospace' }}>
                    {formatCurrencyMM(row.portfolioExposure)}
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
      </Card>

      {/* Country Risk Table */}
      <Card sx={{ p: 2 }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 700, fontSize: '0.8rem', mb: 2 }}>
          Country Risk
        </Typography>
        <TableContainer sx={{ maxHeight: 340 }}>
          <Table size="small" stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem' }}>Entity</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700, fontSize: '0.75rem' }}>Composite Score</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700, fontSize: '0.75rem' }}>Political</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700, fontSize: '0.75rem' }}>Economic</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700, fontSize: '0.75rem' }}>Regulatory</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700, fontSize: '0.75rem' }}>Exposure</TableCell>
                <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem' }}>RAG</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {(countryData ?? []).map((row, idx) => (
                <TableRow key={idx} hover>
                  <TableCell sx={{ fontSize: '0.75rem' }}>{row.entity}</TableCell>
                  <TableCell align="right" sx={{ fontSize: '0.75rem', fontFamily: 'IBM Plex Mono, monospace' }}>
                    {formatRating(row.compositeScore)}
                  </TableCell>
                  <TableCell align="right" sx={{ fontSize: '0.75rem', fontFamily: 'IBM Plex Mono, monospace' }}>
                    {formatRating(row.politicalStabilityScore)}
                  </TableCell>
                  <TableCell align="right" sx={{ fontSize: '0.75rem', fontFamily: 'IBM Plex Mono, monospace' }}>
                    {formatRating(row.countryRiskScore)}
                  </TableCell>
                  <TableCell align="right" sx={{ fontSize: '0.75rem', fontFamily: 'IBM Plex Mono, monospace' }}>
                    {formatRating(row.regulatoryScore)}
                  </TableCell>
                  <TableCell align="right" sx={{ fontSize: '0.75rem', fontFamily: 'IBM Plex Mono, monospace' }}>
                    {formatCurrencyMM(row.exposure)}
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
      </Card>

      {/* Composite Risk Heatmap */}
      <CompositeRiskHeatmap
        fxData={fxData ?? []}
        countryData={countryData ?? []}
        ewsData={ewsData ?? []}
      />
    </Box>
  );
}
