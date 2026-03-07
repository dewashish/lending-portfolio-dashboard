'use client';

import { Stack } from '@mui/material';
import { KPICard } from './KPICard';

export interface KPIItem {
  label: string;
  value: string;
  subtitle?: string;
  trend?: { value: number; label?: string };
  color?: string;
  icon?: React.ReactNode;
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
