'use client';

import { useState } from 'react';
import {
  Box, Grid, Typography, FormControl, InputLabel, Select, MenuItem, Card,
} from '@mui/material';
import { ForwardOutlookKPIRow } from '@/components/views/risk-outlook/ForwardOutlookKPIRow';
import { ECLStackedArea } from '@/components/charts/ECLStackedArea';
import { ProvisionCoverageLine } from '@/components/charts/ProvisionCoverageLine';
import { VintageProjectionChart } from '@/components/charts/VintageProjectionChart';
import { ScenarioImpactTable } from '@/components/views/risk-outlook/ScenarioImpactTable';
import { FilteredMethodologySection } from '@/components/views/risk-outlook/FilteredMethodologySection';
import { useEclForecast, useVintageForecast } from '@/hooks/useRiskOutlookData';
import { LoadingSkeleton } from '@/components/common/LoadingSkeleton';
import type { ScopeSelection } from '@/lib/types';

const SCENARIOS = ['Base', 'Adverse', 'Severe'] as const;

interface Props {
  scope?: ScopeSelection;
  initialSubTab?: number; // kept for backward compat, ignored
}

export function ForwardOutlookView({ scope }: Props) {
  const [scenario, setScenario] = useState<string>('Base');

  // ECL data for selected scenario (used by ECLStackedArea)
  const { data: eclData, isLoading: eclLoading } = useEclForecast(scope, scenario);
  // ECL data for ALL scenarios (used by ProvisionCoverageLine)
  const { data: eclAllData, isLoading: eclAllLoading } = useEclForecast(scope);
  // Vintage data (used by VintageProjectionChart)
  const { data: vintageData, isLoading: vintageLoading } = useVintageForecast(scope);

  const isLoading = eclLoading || eclAllLoading || vintageLoading;

  if (isLoading) return <LoadingSkeleton />;

  return (
    <Box id="tour-risk-outlook" sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {/* ── KPI Row ──────────────────────────────────────────────── */}
      <ForwardOutlookKPIRow scope={scope} />

      {/* ── Scenario Selector ────────────────────────────────────── */}
      <FormControl size="small" sx={{ minWidth: 160, alignSelf: 'flex-start' }}>
        <InputLabel>Scenario</InputLabel>
        <Select
          value={scenario}
          label="Scenario"
          onChange={(e) => setScenario(e.target.value)}
          sx={{ fontSize: '0.82rem' }}
        >
          {SCENARIOS.map((s) => (
            <MenuItem key={s} value={s}>{s}</MenuItem>
          ))}
        </Select>
      </FormControl>

      {/* ── Section 1: ECL & Provision Forecast ──────────────────── */}
      <Box>
        <Typography variant="subtitle1" sx={{ fontWeight: 700, fontSize: '0.9rem', mb: 1.5 }}>
          ECL & Provision Forecast
        </Typography>
        <Grid container spacing={2.5}>
          <Grid item xs={12} md={7}>
            <Card sx={{ p: 2, minHeight: 420 }}>
              <ECLStackedArea data={eclData ?? []} scenario={scenario} />
            </Card>
          </Grid>
          <Grid item xs={12} md={5}>
            <Card sx={{ p: 2, minHeight: 420 }}>
              <ProvisionCoverageLine data={eclAllData ?? []} scenario={scenario} />
            </Card>
          </Grid>
        </Grid>
      </Box>

      {/* ── Section 2: Forward Risk Indicators ───────────────────── */}
      <Box>
        <Typography variant="subtitle1" sx={{ fontWeight: 700, fontSize: '0.9rem', mb: 1.5 }}>
          Forward Risk Indicators
        </Typography>
        <Grid container spacing={2.5}>
          <Grid item xs={12} md={7}>
            <Card sx={{ p: 2, minHeight: 420 }}>
              <VintageProjectionChart data={vintageData ?? []} />
            </Card>
          </Grid>
          <Grid item xs={12} md={5}>
            <ScenarioImpactTable scope={scope} />
          </Grid>
        </Grid>
      </Box>

      {/* ── Section 3: Methodology & Assumptions ─────────────────── */}
      <FilteredMethodologySection />
    </Box>
  );
}
