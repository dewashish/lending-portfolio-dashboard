'use client';

import { useState, useMemo } from 'react';
import { Box, Card, Typography, Stack, ToggleButtonGroup, ToggleButton, Select, MenuItem } from '@mui/material';
import { CollectionMetricsTable } from '@/components/tables/CollectionMetricsTable';
import { LoadingSkeleton } from '@/components/common/LoadingSkeleton';
import { useCollectionMetrics } from '@/hooks/useConsumerData';
import { useRiskAppetite } from '@/hooks/useRiskAppetite';
import { BreachBadge } from '@/components/common/BreachBadge';
import { formatPercent, sortPeriodsChronologically } from '@/lib/format';
import type { ScopeSelection, CollectionMetricRow, ConsumerFilters } from '@/lib/types';

interface Props {
  scope?: ScopeSelection;
  filters?: ConsumerFilters;
}

type PortfolioFilter = 'Total' | 'Secured' | 'Unsecured';

interface CollectionKPI {
  label: string;
  value: string;
  color: string;
  metricKey?: string;
  rawValue?: number;
}

function CollectionKPIStrip({ kpis }: { kpis: CollectionKPI[] }) {
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

function computeCollectionKPIs(
  data: CollectionMetricRow[],
  getColor: (metricKey: string, value: number) => string,
): CollectionKPI[] {
  if (data.length === 0) return [];

  const rollBackValues = data.filter((r) => r.rollBackward != null).map((r) => r.rollBackward!);
  const avgRollBack = rollBackValues.length > 0 ? rollBackValues.reduce((a, b) => a + b, 0) / rollBackValues.length : null;

  const rollFwdValues = data.filter((r) => r.rollForward != null).map((r) => r.rollForward!);
  const avgRollFwd = rollFwdValues.length > 0 ? rollFwdValues.reduce((a, b) => a + b, 0) / rollFwdValues.length : null;

  const stabValues = data.filter((r) => r.stabilized != null).map((r) => r.stabilized!);
  const avgStab = stabValues.length > 0 ? stabValues.reduce((a, b) => a + b, 0) / stabValues.length : null;

  const kpis: CollectionKPI[] = [];

  if (avgRollBack != null) {
    kpis.push({
      label: 'Avg Resolution Rate',
      value: formatPercent(avgRollBack),
      color: getColor('resolution_rate', avgRollBack),
      metricKey: 'resolution_rate',
      rawValue: avgRollBack,
    });
  }
  if (avgRollFwd != null) {
    kpis.push({
      label: 'Avg Roll Forward',
      value: formatPercent(avgRollFwd),
      color: getColor('roll_forward_rate', avgRollFwd),
      metricKey: 'roll_forward_rate',
      rawValue: avgRollFwd,
    });
  }
  if (avgStab != null) {
    kpis.push({
      label: 'Avg Stabilized',
      value: formatPercent(avgStab),
      color: '#78909c',
    });
  }

  return kpis;
}

export function ConsumerCollectionsSection({ scope }: Props) {
  const [portfolioFilter, setPortfolioFilter] = useState<PortfolioFilter>('Total');
  const [selectedPeriod, setSelectedPeriod] = useState<string | null>(null);
  const { getColor } = useRiskAppetite();

  // Fetch ALL data (no period filter) to extract available periods client-side
  const collectionFilters: ConsumerFilters = useMemo(() => ({
    period: null,
    products: [],
  }), []);

  const { data: allMetrics, isLoading } = useCollectionMetrics(scope, collectionFilters);

  // Extract available periods from collection data
  const availablePeriods = useMemo(() => {
    if (!allMetrics || allMetrics.length === 0) return [];
    const periodSet = new Set<string>();
    allMetrics.forEach((r) => periodSet.add(r.period));
    return sortPeriodsChronologically(Array.from(periodSet));
  }, [allMetrics]);

  // Determine effective period (latest if none selected)
  const effectivePeriod = useMemo(() => {
    if (selectedPeriod && availablePeriods.includes(selectedPeriod)) return selectedPeriod;
    return availablePeriods.length > 0 ? availablePeriods[availablePeriods.length - 1] : null;
  }, [selectedPeriod, availablePeriods]);

  // Filter data by portfolio and period
  const filteredMetrics = useMemo(() => {
    if (!allMetrics) return [];
    return allMetrics.filter((r) => {
      if (r.portfolio !== portfolioFilter) return false;
      if (effectivePeriod && r.period !== effectivePeriod) return false;
      return true;
    });
  }, [allMetrics, portfolioFilter, effectivePeriod]);

  const kpis = useMemo(() => computeCollectionKPIs(filteredMetrics, getColor), [filteredMetrics, getColor]);

  if (isLoading) return <LoadingSkeleton />;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
      {/* Filter Strip */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
        <ToggleButtonGroup
          size="small"
          exclusive
          value={portfolioFilter}
          onChange={(_, v) => { if (v !== null) setPortfolioFilter(v as PortfolioFilter); }}
          sx={{ '& .MuiToggleButton-root': { fontSize: '0.68rem', py: 0.4, px: 1.5, textTransform: 'none', fontWeight: 600 } }}
        >
          <ToggleButton value="Total">All</ToggleButton>
          <ToggleButton value="Secured">Secured</ToggleButton>
          <ToggleButton value="Unsecured">Unsecured</ToggleButton>
        </ToggleButtonGroup>

        <Select
          size="small"
          displayEmpty
          value={selectedPeriod ?? ''}
          onChange={(e) => setSelectedPeriod(e.target.value === '' ? null : e.target.value as string)}
          sx={{ minWidth: 130, fontSize: '0.72rem', '& .MuiSelect-select': { py: 0.4 } }}
        >
          <MenuItem value="" sx={{ fontSize: '0.72rem' }}>Latest Period</MenuItem>
          {availablePeriods.map((p) => (
            <MenuItem key={p} value={p} sx={{ fontSize: '0.72rem' }}>{p}</MenuItem>
          ))}
        </Select>
      </Box>

      {kpis.length > 0 && <CollectionKPIStrip kpis={kpis} />}

      <CollectionMetricsTable data={filteredMetrics} />
    </Box>
  );
}
