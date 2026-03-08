'use client';

import { useState } from 'react';
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
  Tabs,
  Tab,
} from '@mui/material';
import { KPIRow } from '@/components/cards/KPIRow';
import type { KPIItem } from '@/components/cards/KPIRow';
import { EWSRadar } from '@/components/charts/EWSRadar';
import { EWSAlertTable } from '@/components/tables/EWSAlertTable';
import { ConcentrationTreemap } from '@/components/charts/ConcentrationTreemap';
import { formatPercent, formatNumber } from '@/lib/format';
import { useCurrencyFormat } from '@/lib/currency-context';
import { RAG_COLORS } from '@/lib/constants';
import { ChartSkeleton } from '@/components/common/LoadingSkeleton';
import {
  useEWSEntitySummary,
  useEWSFacilityAlerts,
  useFXRisk,
  useCountryRisk,
} from '@/hooks/useRiskData';
import { useTradeConcentrations } from '@/hooks/useTradeData';
import type { ScopeSelection } from '@/lib/types';

const SUB_TABS = ['EWS Radar', 'Concentrations', 'FX Risk', 'Country Risk'] as const;

interface Props {
  scope?: ScopeSelection;
}

export function RiskConcentrationsView({ scope }: Props) {
  const { formatCurrency } = useCurrencyFormat();
  const [subTab, setSubTab] = useState(0);

  const { data: ewsSummary, isLoading: ewsLoading } = useEWSEntitySummary(scope);
  const { data: ewsAlerts } = useEWSFacilityAlerts(scope);
  const { data: fxRisk } = useFXRisk(scope);
  const { data: countryRisk } = useCountryRisk(scope);
  const { data: concentrations } = useTradeConcentrations(undefined, scope);

  const totalFlagged = (ewsSummary ?? []).reduce((s, e) => s + e.score2 + e.score3 + e.score4Plus, 0);
  const avgScore = (ewsSummary ?? []).length > 0
    ? (ewsSummary ?? []).reduce((s, e) => s + e.avgEWSScore, 0) / (ewsSummary ?? []).length
    : 0;
  const criticalCount = (ewsSummary ?? []).reduce((s, e) => s + e.score4Plus, 0);
  const flaggedExposure = (ewsSummary ?? []).reduce((s, e) => s + e.flaggedExposure, 0);

  const kpis: KPIItem[] = [
    { label: 'Total Flagged', value: formatNumber(totalFlagged), color: totalFlagged > 0 ? '#ff9800' : '#4caf50' },
    { label: 'Avg EWS Score', value: formatNumber(avgScore, 1) },
    { label: 'Critical Count', value: formatNumber(criticalCount), color: criticalCount > 0 ? '#f44336' : '#4caf50' },
    { label: 'Flagged Exposure', value: formatCurrency(flaggedExposure), color: flaggedExposure > 0 ? '#ff9800' : undefined },
  ];

  const renderSection = () => {
    if (ewsLoading) return <ChartSkeleton key="loading" height={400} />;

    switch (subTab) {
      case 0:
        return (
          <Box key="sub-0" sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <EWSRadar data={ewsSummary ?? []} />
            <EWSAlertTable data={ewsAlerts ?? []} />
          </Box>
        );
      case 1:
        return (
          <Grid key="sub-1" container spacing={3}>
            <Grid item xs={12} md={6}>
              <ConcentrationTreemap data={concentrations ?? []} groupBy="obligor" />
            </Grid>
            <Grid item xs={12} md={6}>
              <ConcentrationTreemap data={concentrations ?? []} groupBy="sector" />
            </Grid>
          </Grid>
        );
      case 2:
        return (
          <Card key="sub-2" sx={{ p: 2 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, fontSize: '0.8rem', mb: 2 }}>FX Risk</Typography>
            {(fxRisk ?? []).length === 0 ? (
              <Typography variant="caption" color="text.secondary">No FX risk data available</Typography>
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
                    {(fxRisk ?? []).map((row, idx) => (
                      <TableRow key={idx} hover>
                        <TableCell sx={{ fontSize: '0.75rem' }}>{row.entity}</TableCell>
                        <TableCell sx={{ fontSize: '0.75rem' }}>{row.primaryCurrency}</TableCell>
                        <TableCell align="right" sx={{ fontSize: '0.75rem', fontFamily: 'IBM Plex Mono, monospace' }}>{formatNumber(row.fxRate, 4)}</TableCell>
                        <TableCell align="right" sx={{ fontSize: '0.75rem', fontFamily: 'IBM Plex Mono, monospace' }}>{formatPercent(row.volatility30Day)}</TableCell>
                        <TableCell align="right" sx={{ fontSize: '0.75rem', fontFamily: 'IBM Plex Mono, monospace' }}>{formatPercent(row.volatility90Day)}</TableCell>
                        <TableCell align="right" sx={{ fontSize: '0.75rem', fontFamily: 'IBM Plex Mono, monospace', color: row.ytdDepreciation > 0 ? '#f44336' : '#4caf50' }}>
                          {formatPercent(row.ytdDepreciation)}
                        </TableCell>
                        <TableCell align="right" sx={{ fontSize: '0.75rem', fontFamily: 'IBM Plex Mono, monospace' }}>{formatCurrency(row.portfolioExposure)}</TableCell>
                        <TableCell align="right" sx={{ fontSize: '0.75rem', fontFamily: 'IBM Plex Mono, monospace', color: row.fxImpact < 0 ? '#f44336' : '#4caf50' }}>
                          {formatCurrency(row.fxImpact)}
                        </TableCell>
                        <TableCell sx={{ fontSize: '0.75rem' }}>{row.transferRisk}</TableCell>
                        <TableCell>
                          <Chip label={row.rag} size="small" sx={{ fontSize: '0.65rem', height: 20, bgcolor: `${RAG_COLORS[row.rag]}22`, color: RAG_COLORS[row.rag] }} />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Card>
        );
      case 3:
        return (
          <Card key="sub-3" sx={{ p: 2 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, fontSize: '0.8rem', mb: 2 }}>Country Risk</Typography>
            {(countryRisk ?? []).length === 0 ? (
              <Typography variant="caption" color="text.secondary">No country risk data available</Typography>
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
                    {(countryRisk ?? []).map((row, idx) => (
                      <TableRow key={idx} hover>
                        <TableCell sx={{ fontSize: '0.75rem' }}>{row.entity}</TableCell>
                        <TableCell align="right" sx={{ fontSize: '0.75rem', fontFamily: 'IBM Plex Mono, monospace' }}>{formatNumber(row.sovereignRating, 1)}</TableCell>
                        <TableCell align="right" sx={{ fontSize: '0.75rem', fontFamily: 'IBM Plex Mono, monospace' }}>{formatNumber(row.countryRiskScore, 1)}</TableCell>
                        <TableCell align="right" sx={{ fontSize: '0.75rem', fontFamily: 'IBM Plex Mono, monospace' }}>{formatNumber(row.regulatoryScore, 1)}</TableCell>
                        <TableCell align="right" sx={{ fontSize: '0.75rem', fontFamily: 'IBM Plex Mono, monospace' }}>{formatNumber(row.politicalStabilityScore, 1)}</TableCell>
                        <TableCell align="right" sx={{ fontSize: '0.75rem', fontFamily: 'IBM Plex Mono, monospace' }}>{formatNumber(row.compositeScore, 1)}</TableCell>
                        <TableCell align="right" sx={{ fontSize: '0.75rem', fontFamily: 'IBM Plex Mono, monospace' }}>{formatCurrency(row.exposure)}</TableCell>
                        <TableCell align="right" sx={{ fontSize: '0.75rem', fontFamily: 'IBM Plex Mono, monospace' }}>{formatPercent(row.rwaShare)}</TableCell>
                        <TableCell sx={{ fontSize: '0.75rem', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.recommendation}</TableCell>
                        <TableCell>
                          <Chip label={row.rag} size="small" sx={{ fontSize: '0.65rem', height: 20, bgcolor: `${RAG_COLORS[row.rag]}22`, color: RAG_COLORS[row.rag] }} />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Card>
        );
      default:
        return null;
    }
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <KPIRow items={kpis} />

      <Tabs
        value={subTab}
        onChange={(_, v) => setSubTab(v)}
        variant="scrollable"
        scrollButtons="auto"
        sx={{
          minHeight: 36,
          '& .MuiTab-root': { minHeight: 36, fontSize: '0.72rem', fontWeight: 600, textTransform: 'none', px: 1.5, py: 0.5 },
          '& .MuiTabs-indicator': { height: 2, borderRadius: 1 },
          borderBottom: 1,
          borderColor: 'divider',
        }}
      >
        {SUB_TABS.map((label) => (
          <Tab key={label} label={label} />
        ))}
      </Tabs>

      <Box sx={{ pt: 1 }}>{renderSection()}</Box>
    </Box>
  );
}
