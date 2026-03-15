'use client';

import { useState, useMemo } from 'react';
import { Box, Card, Typography, Stack, ToggleButtonGroup, ToggleButton, Tooltip, IconButton } from '@mui/material';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import { NonStarterTable } from '@/components/tables/NonStarterTable';
import { LoadingSkeleton } from '@/components/common/LoadingSkeleton';
import { useNonStarters } from '@/hooks/useConsumerData';
import { useRiskAppetite } from '@/hooks/useRiskAppetite';
import { buildThresholdContext } from '@/lib/risk-appetite/build-context';
import { BreachBadge } from '@/components/common/BreachBadge';
import { formatNumber, sortPeriodsChronologically } from '@/lib/format';
import { useCurrencyFormat } from '@/lib/currency-context';
import { augmentNonStarterRows } from '@/lib/non-starter-utils';
import type { ScopeSelection, NonStarterRow, ConsumerFilters, ThresholdContext } from '@/lib/types';

interface Props {
  scope?: ScopeSelection;
  filters?: ConsumerFilters;
}

type CategoryFilter = 'Total' | 'Secured' | 'Unsecured';

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
  getColor: (metricKey: string, value: number, ctx?: ThresholdContext) => string,
  formatCurrencyMM: (v: number) => string,
  ctx?: ThresholdContext,
): NSKpi[] {
  if (data.length === 0) return [];

  const totalRows = data.filter((r) => r.product === 'Total');
  const kpis: NSKpi[] = [];

  const countRow = totalRows.find((r) => r.metric === 'Facility in Force (#)');
  if (countRow) {
    const keys = sortPeriodsChronologically(Object.keys(countRow.monthlyValues));
    const latest = keys.length > 0 ? countRow.monthlyValues[keys[keys.length - 1]] : null;
    if (latest != null) {
      kpis.push({
        label: 'Non-Starter Count',
        value: formatNumber(latest, 0),
        color: getColor('non_starter_rate', latest / 10000, ctx),
        metricKey: 'non_starter_rate',
        rawValue: latest / 10000,
      });

      if (keys.length >= 2) {
        const prev = countRow.monthlyValues[keys[keys.length - 2]];
        const diff = latest - prev;
        kpis.push({
          label: 'MoM Change',
          value: `${diff > 0 ? '+' : ''}${formatNumber(diff, 0)}`,
          color: diff > 0 ? '#ef5350' : diff < 0 ? '#66bb6a' : '#78909c',
        });
      }
    }
  }

  const enrRow = totalRows.find((r) => r.metric === 'ENR');
  if (enrRow) {
    const keys = sortPeriodsChronologically(Object.keys(enrRow.monthlyValues));
    const latest = keys.length > 0 ? enrRow.monthlyValues[keys[keys.length - 1]] : null;
    if (latest != null) {
      kpis.push({
        label: 'Total ENR',
        value: formatCurrencyMM(latest),
        color: '#78909c',
      });
    }
  }

  return kpis;
}

export function ConsumerNonStarterSection({ scope, filters }: Props) {
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('Total');
  const { getColor } = useRiskAppetite();
  const { formatCurrencyMM } = useCurrencyFormat();
  const ctx = useMemo(() => buildThresholdContext(scope, {
    businessLine: 'consumer_finance',
    product: filters?.products?.length === 1 ? filters.products[0] : undefined,
  }), [scope, filters?.products]);

  const { data: nonStarters, isLoading, error } = useNonStarters(scope, filters, categoryFilter);

  const augmented = useMemo(
    () => augmentNonStarterRows(nonStarters ?? []),
    [nonStarters],
  );

  const kpis = useMemo(
    () => computeNSKPIs(nonStarters ?? [], getColor, formatCurrencyMM, ctx),
    [nonStarters, getColor, formatCurrencyMM, ctx],
  );

  if (isLoading) return <LoadingSkeleton />;

  if (error) {
    return (
      <Card sx={{ p: 3, border: '1px solid', borderColor: 'error.main' }}>
        <Typography variant="subtitle2" color="error" gutterBottom>
          Failed to load Non-Starter data
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {error?.message ?? String(error)}
        </Typography>
      </Card>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
      {/* Filter strip + info */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <ToggleButtonGroup
          size="small"
          exclusive
          value={categoryFilter}
          onChange={(_, v) => { if (v !== null) setCategoryFilter(v as CategoryFilter); }}
          sx={{ '& .MuiToggleButton-root': { fontSize: '0.68rem', py: 0.4, px: 1.5, textTransform: 'none', fontWeight: 600 } }}
        >
          <ToggleButton value="Total">Total</ToggleButton>
          <ToggleButton value="Secured">Secured</ToggleButton>
          <ToggleButton value="Unsecured">Unsecured</ToggleButton>
        </ToggleButtonGroup>

        <Tooltip
          arrow
          placement="right"
          title={
            <Box sx={{ p: 0.5, maxWidth: 340 }}>
              <Typography variant="caption" sx={{ fontWeight: 700, fontSize: '0.7rem', display: 'block', mb: 0.5 }}>
                Non-Starter Analysis
              </Typography>
              <Typography variant="caption" sx={{ fontSize: '0.65rem', display: 'block', lineHeight: 1.6 }}>
                <strong>Non-Starters:</strong> All facilities that did not pay any dues since the inception of the facility.
              </Typography>
              <Typography variant="caption" sx={{ fontSize: '0.65rem', display: 'block', lineHeight: 1.6, mt: 0.5 }}>
                <strong>ENR:</strong> Exposure at risk — all balances that did not pay any dues since inception.
              </Typography>
            </Box>
          }
        >
          <IconButton size="small" sx={{ ml: 0.5, p: 0.3 }}>
            <InfoOutlinedIcon sx={{ fontSize: '1rem', color: 'text.secondary' }} />
          </IconButton>
        </Tooltip>
      </Box>

      {kpis.length > 0 && <NSKPIStrip kpis={kpis} />}

      <NonStarterTable
        data={augmented}
        title={`${categoryFilter} Non-Starter Analysis`}
      />
    </Box>
  );
}
