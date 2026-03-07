'use client';

import { useState } from 'react';
import { Box, ToggleButton, ToggleButtonGroup } from '@mui/material';
import { VintageCurves } from '@/components/charts/VintageCurves';
import { VintageHeatmap } from '@/components/charts/VintageHeatmap';
import { LoadingSkeleton } from '@/components/common/LoadingSkeleton';
import { useVintagePoints } from '@/hooks/useConsumerData';

const METRIC_TYPES = ['30+', '60+', '90+', 'X+', 'Gross Loss', 'Recoveries', 'NCL'] as const;

export function ConsumerVintageSection() {
  const [metricType, setMetricType] = useState<string>('30+');
  const { data: vintageData, isLoading } = useVintagePoints();

  if (isLoading) return <LoadingSkeleton />;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <ToggleButtonGroup
        value={metricType}
        exclusive
        onChange={(_, v) => v && setMetricType(v)}
        size="small"
        sx={{ alignSelf: 'flex-start' }}
      >
        {METRIC_TYPES.map((t) => (
          <ToggleButton key={t} value={t} sx={{ fontSize: '0.7rem', px: 1.5, py: 0.5 }}>
            {t}
          </ToggleButton>
        ))}
      </ToggleButtonGroup>

      <VintageCurves data={vintageData ?? []} metricType={metricType} />
      <VintageHeatmap data={vintageData ?? []} metricType={metricType} />
    </Box>
  );
}
