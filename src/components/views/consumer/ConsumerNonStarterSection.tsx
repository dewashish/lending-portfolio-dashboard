'use client';

import { useMemo } from 'react';
import { Box, Card, Typography, Stack } from '@mui/material';
import { NonStarterTable } from '@/components/tables/NonStarterTable';
import { LoadingSkeleton } from '@/components/common/LoadingSkeleton';
import { useNonStarters } from '@/hooks/useConsumerData';
import { formatPercent, formatNumber } from '@/lib/format';
import type { ScopeSelection, NonStarterRow } from '@/lib/types';

interface Props {
  scope?: ScopeSelection;
}

interface NSKpi {
  label: string;
  value: string;
  color: string;
}

function NSKPIStrip({ kpis }: { kpis: NSKpi[] }) {
  return (
    <Stack direction="row" spacing={1.5}>
      {kpis.map((k) => (
        <Card key={k.label} sx={{ flex: 1, p: 1.5 }}>
          <Typography
            variant="caption"
            sx={{ fontSize: '0.58rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'text.secondary', display: 'block', mb: 0.3 }}
          >
            {k.label}
          </Typography>
          <Typography
            variant="h6"
            className="mono"
            sx={{ fontWeight: 800, fontSize: '1.1rem', lineHeight: 1, color: k.color }}
          >
            {k.value}
          </Typography>
        </Card>
      ))}
    </Stack>
  );
}

function computeNSKPIs(data: NonStarterRow[]): NSKpi[] {
  if (data.length === 0) return [];

  const kpis: NSKpi[] = [];

  // Find the "Non-Starter %" row and get latest value
  const nsPctRow = data.find((r) => r.metric.toLowerCase().includes('%'));
  if (nsPctRow) {
    const keys = Object.keys(nsPctRow.monthlyValues).sort();
    const latest = keys.length > 0 ? nsPctRow.monthlyValues[keys[keys.length - 1]] : null;
    if (latest != null) {
      kpis.push({
        label: 'Non-Starter Rate',
        value: formatPercent(latest),
        color: latest <= 0.02 ? '#66bb6a' : latest <= 0.04 ? '#ffa726' : '#ef5350',
      });
    }
  }

  // Find the count row
  const nsCountRow = data.find((r) => /count|#/i.test(r.metric));
  if (nsCountRow) {
    const keys = Object.keys(nsCountRow.monthlyValues).sort();
    const latest = keys.length > 0 ? nsCountRow.monthlyValues[keys[keys.length - 1]] : null;
    if (latest != null) {
      kpis.push({
        label: 'Non-Starter Count',
        value: formatNumber(latest, 0),
        color: '#78909c',
      });
    }
  }

  return kpis;
}

export function ConsumerNonStarterSection({ scope }: Props) {
  const { data: nonStarters, isLoading } = useNonStarters(scope);

  const kpis = useMemo(() => computeNSKPIs(nonStarters ?? []), [nonStarters]);

  if (isLoading) return <LoadingSkeleton />;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
      {kpis.length > 0 && <NSKPIStrip kpis={kpis} />}
      <NonStarterTable data={nonStarters ?? []} />
    </Box>
  );
}
