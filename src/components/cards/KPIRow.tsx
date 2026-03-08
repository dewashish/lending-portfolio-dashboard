'use client';

import { Stack } from '@mui/material';
import { KPICard } from './KPICard';
import type { ThresholdContext } from '@/lib/types';

export interface KPIItem {
  label: string;
  value: string;
  subtitle?: string;
  trend?: { value: number; label?: string };
  color?: string;
  icon?: React.ReactNode;
  sparkline?: number[];
  /** If true, downward trend is good (e.g. delinquency, FPD) */
  invertTrend?: boolean;
  benchmark?: number;
  benchmarkLabel?: string;
  metricKey?: string;
  rawValue?: number;
  thresholdContext?: ThresholdContext;
}

interface Props {
  items: KPIItem[];
}

export function KPIRow({ items }: Props) {
  return (
    <Stack direction="row" spacing={2} sx={{ overflowX: 'auto', pb: 0.5 }}>
      {items.map((item) => (
        <KPICard key={item.label} {...item} />
      ))}
    </Stack>
  );
}
