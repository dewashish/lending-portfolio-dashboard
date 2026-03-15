'use client';

import { useMemo } from 'react';
import { Box, Grid, Card, Typography } from '@mui/material';
import { ForwardOutlookKPIRow } from '@/components/views/risk-outlook/ForwardOutlookKPIRow';
import { ECLStackedArea } from '@/components/charts/ECLStackedArea';
import { ProvisionCoverageLine } from '@/components/charts/ProvisionCoverageLine';
import { RatingDistributionBar } from '@/components/views/risk-outlook/RatingDistributionBar';
import { useEclForecast, useRatingDistribution } from '@/hooks/useRiskOutlookData';
import { LoadingSkeleton } from '@/components/common/LoadingSkeleton';
import type { ScopeSelection } from '@/lib/types';

interface Props {
  scope?: ScopeSelection;
}

export function PortfolioHealthSection({ scope }: Props) {
  const { data: eclBase, isLoading: l1 } = useEclForecast(scope, 'Base');
  const { data: eclAll, isLoading: l2 } = useEclForecast(scope);
  const { data: ratingData, isLoading: l3 } = useRatingDistribution(scope);

  // Stage mix summary from latest quarter
  const stageMix = useMemo(() => {
    if (!eclBase || eclBase.length === 0) return null;
    const quarters = Array.from(new Set(eclBase.map((r) => r.quarter))).sort();
    const latest = quarters[quarters.length - 1];
    const latestRows = eclBase.filter((r) => r.quarter === latest);
    const total = latestRows.reduce((s, r) => s + r.eclAmountUsd, 0);
    if (total === 0) return null;
    const s1 = latestRows.filter((r) => r.stage === 'Stage 1').reduce((s, r) => s + r.eclAmountUsd, 0);
    const s2 = latestRows.filter((r) => r.stage === 'Stage 2').reduce((s, r) => s + r.eclAmountUsd, 0);
    const s3 = latestRows.filter((r) => r.stage === 'Stage 3').reduce((s, r) => s + r.eclAmountUsd, 0);
    return {
      stage1: ((s1 / total) * 100).toFixed(1),
      stage2: ((s2 / total) * 100).toFixed(1),
      stage3: ((s3 / total) * 100).toFixed(1),
      stage23Share: (((s2 + s3) / total) * 100).toFixed(1),
    };
  }, [eclBase]);

  if (l1 || l2 || l3) return <LoadingSkeleton />;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
      {/* KPI Row */}
      <ForwardOutlookKPIRow scope={scope} />

      {/* Stage mix summary chips */}
      {stageMix && (
        <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
          {[
            { label: 'Stage 1', value: `${stageMix.stage1}%`, color: '#4caf50' },
            { label: 'Stage 2', value: `${stageMix.stage2}%`, color: '#ff9800' },
            { label: 'Stage 3', value: `${stageMix.stage3}%`, color: '#f44336' },
            { label: 'Stage 2+3 Share', value: `${stageMix.stage23Share}%`, color: '#e91e63' },
          ].map((s) => (
            <Card key={s.label} sx={{ px: 2, py: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
              <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: s.color }} />
              <Typography variant="caption" sx={{ fontSize: '0.68rem', color: 'text.secondary' }}>
                {s.label}
              </Typography>
              <Typography variant="caption" sx={{ fontWeight: 700, fontSize: '0.78rem', fontFamily: 'IBM Plex Mono, monospace' }}>
                {s.value}
              </Typography>
            </Card>
          ))}
        </Box>
      )}

      {/* Charts Grid */}
      <Grid container spacing={2.5}>
        {/* ECL Stacked Area — Base scenario */}
        <Grid item xs={12} md={7}>
          <Card sx={{ p: 2, minHeight: 400 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, fontSize: '0.82rem', mb: 1 }}>
              ECL by Stage — Base Scenario
            </Typography>
            <ECLStackedArea data={eclBase ?? []} scenario="Base" />
          </Card>
        </Grid>

        {/* Rating Distribution Shift */}
        <Grid item xs={12} md={5}>
          <Card sx={{ p: 2, minHeight: 400 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, fontSize: '0.82rem', mb: 1 }}>
              Rating Distribution — Current vs Projected
            </Typography>
            <RatingDistributionBar data={ratingData ?? []} />
          </Card>
        </Grid>

        {/* Provision Coverage Line — all scenarios */}
        <Grid item xs={12}>
          <Card sx={{ p: 2, minHeight: 340 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, fontSize: '0.82rem', mb: 1 }}>
              Provision Coverage Ratio Trend
            </Typography>
            <ProvisionCoverageLine data={eclAll ?? []} scenario="Base" />
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}
