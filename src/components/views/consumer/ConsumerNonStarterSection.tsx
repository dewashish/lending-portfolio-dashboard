'use client';

import { useMemo } from 'react';
import { Box, Card, Typography, Stack } from '@mui/material';
import { NonStarterTable } from '@/components/tables/NonStarterTable';
import { LoadingSkeleton } from '@/components/common/LoadingSkeleton';
import { useNonStarters } from '@/hooks/useConsumerData';
import { useRiskAppetite } from '@/hooks/useRiskAppetite';
import { BreachBadge } from '@/components/common/BreachBadge';
import { formatPercent, formatNumber } from '@/lib/format';
import type { ScopeSelection, NonStarterRow, ConsumerFilters } from '@/lib/types';

interface Props {
  scope?: ScopeSelection;
  filters?: ConsumerFilters;
}

interface NSKpi {
  label: string;
  value: string;
  color: string;
  metricKey?: string;
  rawValue?: number;
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
          {k.metricKey != null && k.rawValue != null ? (
            <BreachBadge metricKey={k.metricKey} value={k.rawValue}>
              <Typography
                variant="h6"
                className="mono"
                sx={{ fontWeight: 800, fontSize: '1.1rem', lineHeight: 1, color: k.color }}
              >
                {k.value}
              </Typography>
            </BreachBadge>
          ) : (
            <Typography
              variant="h6"
              className="mono"
              sx={{ fontWeight: 800, fontSize: '1.1rem', lineHeight: 1, color: k.color }}
            >
              {k.value}
            </Typography>
          )}
        </Card>
      ))}
    </Stack>
  );
}

function computeNSKPIs(
  data: NonStarterRow[],
  getColor: (metricKey: string, value: number) => string,
): NSKpi[] {
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
        color: getColor('non_starter_rate', latest),
        metricKey: 'non_starter_rate',
        rawValue: latest,
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

export function ConsumerNonStarterSection({ scope, filters }: Props) {
  const { data: nonStarters, isLoading } = useNonStarters(scope, filters);
  const { getColor } = useRiskAppetite();

  const kpis = useMemo(() => computeNSKPIs(nonStarters ?? [], getColor), [nonStarters, getColor]);

  if (isLoading) return <LoadingSkeleton />;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
      {kpis.length > 0 && <NSKPIStrip kpis={kpis} />}
      <NonStarterTable data={nonStarters ?? []} />
    </Box>
  );
}
