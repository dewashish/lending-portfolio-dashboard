'use client';

import { Box } from '@mui/material';
import { KPICard } from './KPICard';
import type { ThresholdContext } from '@/lib/types';
import type { AvaContext } from '@/lib/ava/types';

export interface KPIItem {
  label: string;
  value: string;
  subtitle?: string;
  trend?: { value: number; label?: string };
  color?: string;
  icon?: React.ReactNode;
  sparkline?: number[];
  sparklineLabels?: string[];
  /** If true, downward trend is good (e.g. delinquency, FPD) */
  invertTrend?: boolean;
  benchmark?: number;
  benchmarkLabel?: string;
  metricKey?: string;
  rawValue?: number;
  thresholdContext?: ThresholdContext;
  info?: string;
  /** When set, the card shows an AVA spark on hover. */
  ava?: AvaContext;
}

interface Props {
  items: KPIItem[];
}

export function KPIRow({ items }: Props) {
  return (
    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
      {items.map((item) => (
        <KPICard key={item.label} {...item} />
      ))}
    </Box>
  );
}
