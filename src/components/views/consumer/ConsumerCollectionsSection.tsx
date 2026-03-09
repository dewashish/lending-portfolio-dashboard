'use client';

import { useState, useMemo } from 'react';
import { Box, Grid, Card, Typography, Stack, ToggleButtonGroup, ToggleButton, Select, MenuItem } from '@mui/material';
import { RollRateHeatmap } from '@/components/charts/RollRateHeatmap';
import { RollRateSankey } from '@/components/charts/RollRateSankey';
import { CollectionMetricsTable } from '@/components/tables/CollectionMetricsTable';
import { ChartGridSkeleton } from '@/components/common/LoadingSkeleton';
import { useCollectionMetrics, useRollRates, useProductCatalog } from '@/hooks/useConsumerData';
import { useRiskAppetite } from '@/hooks/useRiskAppetite';
import { BreachBadge } from '@/components/common/BreachBadge';
import { formatPercent, sortPeriodsChronologically } from '@/lib/format';
import type { ScopeSelection, CollectionMetricRow, ConsumerFilters } from '@/lib/types';

interface Props {
  scope?: ScopeSelection;
  filters?: ConsumerFilters;
}

type SecuredFilter = 'all' | 'secured' | 'unsecured';

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

/** Map secured filter to collection_metrics portfolio values */
const PORTFOLIO_MAP: Record<SecuredFilter, string> = {
  all: 'Total',
  secured: 'Secured',
  unsecured: 'Unsecured',
};

export function ConsumerCollectionsSection({ scope }: Props) {
  const [securedFilter, setSecuredFilter] = useState<SecuredFilter>('all');
  const [selectedProduct, setSelectedProduct] = useState<string>('all');
  const [selectedPeriod, setSelectedPeriod] = useState<string | null>(null);
  const { data: productCatalog } = useProductCatalog(scope);
  const { getColor } = useRiskAppetite();

  // Products available based on the secured/unsecured toggle
  const availableProducts = useMemo(() => {
    if (!productCatalog) return [];
    if (securedFilter === 'all') return productCatalog;
    return productCatalog.filter((p) => p.productCategory.toLowerCase() === securedFilter);
  }, [productCatalog, securedFilter]);

  // Resolved product names for roll rate queries
  const effectiveProducts = useMemo(() => {
    if (selectedProduct !== 'all') {
      const exists = availableProducts.some((p) => p.productName === selectedProduct);
      return exists ? [selectedProduct] : [];
    }
    if (securedFilter !== 'all') {
      return availableProducts.map((p) => p.productName);
    }
    return [];
  }, [securedFilter, selectedProduct, availableProducts]);

  // Roll Rates: fetch ALL periods (client-side filtering in heatmap)
  const rollRateFilters: ConsumerFilters = useMemo(() => ({
    period: null,
    products: effectiveProducts,
  }), [effectiveProducts]);

  // Collection metrics: fetch ALL (client-side filtering)
  const collectionFilters: ConsumerFilters = useMemo(() => ({
    period: null,
    products: [],
  }), []);

  const { data: rollRates, isLoading: l1 } = useRollRates(scope, rollRateFilters);
  const { data: allCollectionMetrics, isLoading: l2 } = useCollectionMetrics(scope, collectionFilters);

  // Extract available periods from roll rate data (chronologically sorted)
  const availablePeriods = useMemo(() => {
    if (!rollRates || rollRates.length === 0) return [];
    const periodSet = new Set<string>();
    rollRates.forEach((r) => Object.keys(r.values).forEach((k) => periodSet.add(k)));
    return sortPeriodsChronologically(Array.from(periodSet));
  }, [rollRates]);

  // Filter collection metrics by portfolio and period
  const filteredCollectionMetrics = useMemo(() => {
    if (!allCollectionMetrics) return [];
    const portfolioValue = PORTFOLIO_MAP[securedFilter];
    // Use latest period from collection data if none selected
    const collectionPeriods = sortPeriodsChronologically(
      Array.from(new Set(allCollectionMetrics.map((r) => r.period))),
    );
    const effectivePeriod = selectedPeriod && collectionPeriods.includes(selectedPeriod)
      ? selectedPeriod
      : collectionPeriods[collectionPeriods.length - 1] ?? null;

    return allCollectionMetrics.filter((r) => {
      if (r.portfolio !== portfolioValue) return false;
      if (effectivePeriod && r.period !== effectivePeriod) return false;
      return true;
    });
  }, [allCollectionMetrics, securedFilter, selectedPeriod]);

  const handleSecuredChange = (_: unknown, v: SecuredFilter | null) => {
    if (v !== null) {
      setSecuredFilter(v);
      setSelectedProduct('all');
    }
  };

  const kpis = useMemo(() => computeCollectionKPIs(filteredCollectionMetrics, getColor), [filteredCollectionMetrics, getColor]);

  if (l1 || l2) return <ChartGridSkeleton />;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
      {/* Filter Strip */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
        <ToggleButtonGroup
          size="small"
          exclusive
          value={securedFilter}
          onChange={handleSecuredChange}
          sx={{ '& .MuiToggleButton-root': { fontSize: '0.68rem', py: 0.4, px: 1.5, textTransform: 'none', fontWeight: 600 } }}
        >
          <ToggleButton value="all">All</ToggleButton>
          <ToggleButton value="secured">Secured</ToggleButton>
          <ToggleButton value="unsecured">Unsecured</ToggleButton>
        </ToggleButtonGroup>

        {availableProducts.length > 0 && (
          <ToggleButtonGroup
            size="small"
            exclusive
            value={selectedProduct}
            onChange={(_, val) => { if (val !== null) setSelectedProduct(val); }}
            sx={{ '& .MuiToggleButton-root': { fontSize: '0.65rem', py: 0.3, px: 1, textTransform: 'none' } }}
          >
            <ToggleButton value="all">All Products</ToggleButton>
            {availableProducts.map((p) => (
              <ToggleButton key={p.productName} value={p.productName}>{p.productName}</ToggleButton>
            ))}
          </ToggleButtonGroup>
        )}

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

      <CollectionMetricsTable data={filteredCollectionMetrics} />

      <Grid container spacing={2}>
        <Grid item xs={12} md={6}>
          <RollRateSankey data={rollRates ?? []} period={selectedPeriod ?? undefined} />
        </Grid>
        <Grid item xs={12} md={6}>
          {/* Placeholder for balance — Sankey fills one side */}
        </Grid>
      </Grid>

      <RollRateHeatmap data={rollRates ?? []} maxPeriod={selectedPeriod} />
    </Box>
  );
}
