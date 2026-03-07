'use client';

import { useState } from 'react';
import { Box, Card, Typography, ToggleButton, ToggleButtonGroup, Stack } from '@mui/material';
import { VintageCurves } from '@/components/charts/VintageCurves';
import { VintageHeatmap } from '@/components/charts/VintageHeatmap';
import { LoadingSkeleton } from '@/components/common/LoadingSkeleton';
import { useVintagePoints } from '@/hooks/useConsumerData';
import type { ScopeSelection } from '@/lib/types';

const METRIC_TYPES = ['30+', '60+', '90+', 'X+', 'Gross Loss', 'Recoveries', 'NCL'] as const;

const METRIC_DESCRIPTIONS: Record<string, string> = {
  '30+': 'Percentage of disbursed amount 30+ days past due by vintage cohort',
  '60+': 'Percentage of disbursed amount 60+ days past due by vintage cohort',
  '90+': 'Percentage of disbursed amount 90+ days past due by vintage cohort',
  'X+': 'Percentage of disbursed amount in NPA/write-off by vintage cohort',
  'Gross Loss': 'Cumulative gross loss rate by vintage cohort over months on book',
  'Recoveries': 'Cumulative recovery rate by vintage cohort over months on book',
  'NCL': 'Net credit loss (Gross Loss - Recoveries) by vintage cohort',
};

interface Props {
  scope?: ScopeSelection;
}

export function ConsumerVintageSection({ scope }: Props) {
  const [metricType, setMetricType] = useState<string>('30+');
  const { data: vintageData, isLoading } = useVintagePoints(undefined, scope);

  if (isLoading) return <LoadingSkeleton />;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
      <Card sx={{ p: 1.5 }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={2}>
          <ToggleButtonGroup
            value={metricType}
            exclusive
            onChange={(_, v) => v && setMetricType(v)}
            size="small"
          >
            {METRIC_TYPES.map((t) => (
              <ToggleButton key={t} value={t} sx={{ fontSize: '0.7rem', px: 1.5, py: 0.5, textTransform: 'none' }}>
                {t}
              </ToggleButton>
            ))}
          </ToggleButtonGroup>

          <Typography variant="caption" sx={{ fontSize: '0.65rem', color: 'text.secondary', fontStyle: 'italic' }}>
            {METRIC_DESCRIPTIONS[metricType] ?? ''}
          </Typography>
        </Stack>
      </Card>

      <VintageCurves data={vintageData ?? []} metricType={metricType} />
      <VintageHeatmap data={vintageData ?? []} metricType={metricType} />
    </Box>
  );
}
