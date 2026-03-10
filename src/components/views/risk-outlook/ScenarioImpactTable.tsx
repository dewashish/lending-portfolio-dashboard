'use client';

import { useMemo } from 'react';
import {
  Card,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Box,
} from '@mui/material';
import { useEclForecast, useStressScenarioLosses, useCET1Trajectory } from '@/hooks/useRiskOutlookData';
import { useCurrencyFormat } from '@/lib/currency-context';
import { formatPercent } from '@/lib/format';
import { LoadingSkeleton } from '@/components/common/LoadingSkeleton';
import type { ScopeSelection } from '@/lib/types';

interface Props {
  scope?: ScopeSelection;
}

interface ScenarioRow {
  scenario: string;
  ecl: number;
  pcr: number;
  lossRate: number;
  cet1: number;
}

const HDR = {
  fontWeight: 700,
  fontSize: '0.65rem',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.04em',
};

const CELL = {
  fontSize: '0.72rem',
  fontFamily: 'IBM Plex Mono, monospace',
};

const CELL_TEXT = {
  fontSize: '0.72rem',
  fontWeight: 600,
};

// Map display scenario names to stress data scenario names
const SCENARIO_MAP: Record<string, string> = {
  Base: 'Base',
  Adverse: 'Mild Recession',
  Severe: 'Severe Recession',
};

const DISPLAY_SCENARIOS = ['Base', 'Adverse', 'Severe'];

function cet1Color(value: number): string {
  if (value >= 0.08) return '#4caf50';
  if (value >= 0.045) return '#ff9800';
  return '#f44336';
}

function lossRateColor(value: number): string {
  if (value < 0.02) return '#4caf50';
  if (value < 0.05) return '#ff9800';
  return '#f44336';
}

export function ScenarioImpactTable({ scope }: Props) {
  const { data: eclData, isLoading: eclLoading } = useEclForecast(scope);
  const { data: stressData, isLoading: stressLoading } = useStressScenarioLosses(scope);
  const { data: cet1Data, isLoading: cet1Loading } = useCET1Trajectory(scope);
  const { formatCurrency } = useCurrencyFormat();

  const isLoading = eclLoading || stressLoading || cet1Loading;

  const rows = useMemo<ScenarioRow[]>(() => {
    const eclRows = eclData ?? [];
    const stressRows = stressData ?? [];
    const cet1Rows = cet1Data ?? [];

    if (!eclRows.length && !stressRows.length && !cet1Rows.length) return [];

    // Find the latest quarter in ECL data
    const eclQuarters = eclRows.map((r) => r.quarter).sort();
    const latestQuarter = eclQuarters.length > 0 ? eclQuarters[eclQuarters.length - 1] : '';

    return DISPLAY_SCENARIOS.map((displayName) => {
      const stressScenario = SCENARIO_MAP[displayName];

      // ECL: filter to scenario + latest quarter, sum eclAmountUsd across stages
      const eclForScenario = eclRows.filter(
        (r) => r.scenario === displayName && r.quarter === latestQuarter,
      );
      const ecl = eclForScenario.reduce((sum, r) => sum + r.eclAmountUsd, 0);

      // PCR: weighted-avg coverageRatio (weight by eclAmount) for scenario + latest quarter
      let pcr = 0;
      const pcrRows = eclForScenario.filter((r) => r.coverageRatio != null);
      const totalEcl = pcrRows.reduce((sum, r) => sum + r.eclAmount, 0);
      if (totalEcl > 0) {
        const weightedCov = pcrRows.reduce((sum, r) => sum + (r.coverageRatio ?? 0) * r.eclAmount, 0);
        pcr = weightedCov / totalEcl;
      }

      // Loss Rate: average lossRate across segments from stress data
      const lossRows = stressRows.filter((r) => r.scenario === stressScenario);
      const lossRate = lossRows.length > 0
        ? lossRows.reduce((sum, r) => sum + r.lossRate, 0) / lossRows.length
        : 0;

      // CET1: min cet1Ratio for the scenario
      const cet1ForScenario = cet1Rows.filter((r) => r.scenario === displayName);
      const cet1 = cet1ForScenario.length > 0
        ? Math.min(...cet1ForScenario.map((r) => r.cet1Ratio))
        : 0;

      return { scenario: displayName, ecl, pcr, lossRate, cet1 };
    });
  }, [eclData, stressData, cet1Data]);

  if (isLoading) {
    return <LoadingSkeleton />;
  }

  return (
    <Card sx={{ p: 2.5, height: '100%' }}>
      <Box sx={{ mb: 1.5 }}>
        <Typography sx={{ fontWeight: 700, fontSize: '0.85rem' }}>
          Scenario Impact Summary
        </Typography>
        <Typography variant="caption" color="text.secondary">
          Base vs Adverse vs Severe
        </Typography>
      </Box>

      <TableContainer>
        <Table size="small" stickyHeader>
          <TableHead>
            <TableRow>
              <TableCell sx={HDR}>Scenario</TableCell>
              <TableCell sx={HDR} align="right">ECL</TableCell>
              <TableCell sx={HDR} align="right">PCR</TableCell>
              <TableCell sx={HDR} align="right">Loss Rate</TableCell>
              <TableCell sx={HDR} align="right">CET1</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.scenario} hover>
                <TableCell sx={CELL_TEXT}>{row.scenario}</TableCell>
                <TableCell sx={CELL} align="right">
                  {formatCurrency(row.ecl)}
                </TableCell>
                <TableCell sx={CELL} align="right">
                  {formatPercent(row.pcr)}
                </TableCell>
                <TableCell
                  sx={{ ...CELL, color: lossRateColor(row.lossRate) }}
                  align="right"
                >
                  {formatPercent(row.lossRate)}
                </TableCell>
                <TableCell
                  sx={{ ...CELL, color: cet1Color(row.cet1 / 100) }}
                  align="right"
                >
                  {formatPercent(row.cet1, 1)}
                </TableCell>
              </TableRow>
            ))}
            {rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} align="center">
                  <Typography variant="caption" color="text.secondary">
                    No data
                  </Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Card>
  );
}
