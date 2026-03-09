'use client';

import { useState, useMemo } from 'react';
import { Box, Grid, Card, Typography, Stack, ToggleButtonGroup, ToggleButton, Autocomplete, TextField, Chip } from '@mui/material';
import { NetFlowWaterfall } from '@/components/charts/NetFlowWaterfall';
import { RollRateHeatmap } from '@/components/charts/RollRateHeatmap';
import { RollRateSankey } from '@/components/charts/RollRateSankey';
import { ChartGridSkeleton } from '@/components/common/LoadingSkeleton';
import { useNetFlowRates, useRollRates, useConsumerOverall, useProductCatalog, useProductMetrics } from '@/hooks/useConsumerData';
import { useRiskAppetite } from '@/hooks/useRiskAppetite';
import { BreachBadge } from '@/components/common/BreachBadge';
import { formatPercent } from '@/lib/format';
import type { ScopeSelection, ConsumerMetricRow, ConsumerFilters } from '@/lib/types';

interface Props {
  scope?: ScopeSelection;
  filters?: ConsumerFilters;
}

type SecuredFilter = 'all' | 'secured' | 'unsecured';

function getLatest(data: ConsumerMetricRow[], name: string): number | null {
  const row = data.find((d) => d.metric === name);
  if (!row) return null;
  const keys = Object.keys(row.values).sort();
  const v = keys.length > 0 ? row.values[keys[keys.length - 1]] : null;
  return typeof v === 'number' ? v : null;
}

function getPrevious(data: ConsumerMetricRow[], name: string): number | null {
  const row = data.find((d) => d.metric === name);
  if (!row) return null;
  const keys = Object.keys(row.values).sort();
  const v = keys.length >= 2 ? row.values[keys[keys.length - 2]] : null;
  return typeof v === 'number' ? v : null;
}

interface DKpi {
  label: string;
  value: string;
  delta: number | null;
  color: string;
  metricKey?: string;
  rawValue?: number;
}

function DelinquencyKPIStrip({ kpis }: { kpis: DKpi[] }) {
  return (
    <Stack direction="row" spacing={1.5}>
      {kpis.map((k) => {
        const deltaColor =
          k.delta == null
            ? undefined
            : Math.abs(k.delta) < 0.5
              ? '#78909c'
              : k.delta < 0
                ? '#66bb6a'
                : '#ef5350';

        return (
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
            {k.delta != null && (
              <Typography
                variant="caption"
                sx={{ fontSize: '0.6rem', fontWeight: 700, color: deltaColor, mt: 0.3, display: 'block' }}
              >
                {k.delta >= 0 ? '+' : ''}{formatPercent(k.delta, 1)} MoM
              </Typography>
            )}
          </Card>
        );
      })}
    </Stack>
  );
}

export function ConsumerDelinquencySection({ scope, filters }: Props) {
  const [securedFilter, setSecuredFilter] = useState<SecuredFilter>('all');
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const { data: productCatalog } = useProductCatalog(scope);
  const { getColor } = useRiskAppetite();

  // Products available based on the secured/unsecured toggle
  const availableProducts = useMemo(() => {
    if (!productCatalog) return [];
    if (securedFilter === 'all') return productCatalog;
    return productCatalog.filter((p) => p.productCategory.toLowerCase() === securedFilter);
  }, [productCatalog, securedFilter]);

  // Resolved product names to pass to hooks
  const effectiveProducts = useMemo(() => {
    const availableNames = new Set(availableProducts.map((p) => p.productName));
    // Secured/unsecured toggle active but no specific products → pass ALL matching
    if (securedFilter !== 'all' && selectedProducts.length === 0) {
      return availableProducts.map((p) => p.productName);
    }
    // Specific products selected → filter to those still in available set
    if (selectedProducts.length > 0) {
      return selectedProducts.filter((p) => availableNames.has(p));
    }
    return []; // empty = show aggregate (no filter)
  }, [securedFilter, selectedProducts, availableProducts]);

  // Build effective filters for delinquency hooks
  const effectiveFilters: ConsumerFilters = useMemo(() => ({
    period: filters?.period ?? null,
    products: effectiveProducts,
  }), [filters?.period, effectiveProducts]);

  const hasProductFilter = effectiveProducts.length > 0;

  const { data: netFlow, isLoading: l1 } = useNetFlowRates(scope, effectiveFilters);
  const { data: rollRates, isLoading: l2 } = useRollRates(scope, effectiveFilters);
  const { data: overall } = useConsumerOverall(scope, filters);
  // Product-level metrics for KPIs when filter is active
  const { data: productData } = useProductMetrics(scope, hasProductFilter ? effectiveFilters : undefined);

  const kpis = useMemo<DKpi[]>(() => {
    const defs = [
      { name: 'FPD%', label: 'FPD Rate', metricKey: 'fpd_pct' },
      { name: '30+ Amt%', label: '30+ DPD', metricKey: 'dpd_30_plus' },
      { name: '90+ Amt%', label: '90+ DPD', metricKey: 'dpd_90_plus' },
      { name: 'Net Credit Loss', label: 'NCL Rate', metricKey: 'net_credit_loss' },
    ];

    // When product filter is active, derive KPIs from product-level metrics
    if (hasProductFilter && productData && productData.length > 0) {
      // Aggregate all matching product metrics
      const aggMetrics = new Map<string, ConsumerMetricRow>();
      const countMap = new Map<string, Record<string, number>>();
      for (const prod of productData) {
        for (const row of prod.metrics) {
          const key = `${row.metricType}|${row.metric}`;
          if (!aggMetrics.has(key)) {
            aggMetrics.set(key, { metricType: row.metricType, metric: row.metric, values: {}, benchmark: row.benchmark });
            countMap.set(key, {});
          }
          const agg = aggMetrics.get(key)!;
          const counts = countMap.get(key)!;
          for (const [period, val] of Object.entries(row.values)) {
            if (typeof val !== 'number') continue;
            agg.values[period] = ((agg.values[period] as number) ?? 0) + val;
            counts[period] = (counts[period] ?? 0) + 1;
          }
        }
      }
      // Average rate metrics
      const aggRows: ConsumerMetricRow[] = [];
      aggMetrics.forEach((row, key) => {
        const counts = countMap.get(key)!;
        const averaged: Record<string, number> = {};
        for (const [period, val] of Object.entries(row.values)) {
          if (typeof val !== 'number') continue;
          averaged[period] = val / (counts[period] ?? 1);
        }
        aggRows.push({ ...row, values: averaged });
      });

      return defs.map(({ name, label, metricKey }) => {
        const curr = getLatest(aggRows, name);
        const prev = getPrevious(aggRows, name);
        const delta = curr != null && prev != null && prev !== 0 ? ((curr - prev) / Math.abs(prev)) * 100 : null;
        const color = curr == null ? '#78909c' : getColor(metricKey, curr);
        return { label, value: curr != null ? formatPercent(curr) : '—', delta, color, metricKey, rawValue: curr ?? undefined };
      });
    }

    // Default: use overall metrics
    if (!overall || overall.length === 0) return [];
    return defs.map(({ name, label, metricKey }) => {
      const curr = getLatest(overall, name);
      const prev = getPrevious(overall, name);
      const delta = curr != null && prev != null && prev !== 0 ? ((curr - prev) / Math.abs(prev)) * 100 : null;
      const color = curr == null ? '#78909c' : getColor(metricKey, curr);
      return { label, value: curr != null ? formatPercent(curr) : '—', delta, color, metricKey, rawValue: curr ?? undefined };
    });
  }, [overall, productData, hasProductFilter, getColor]);

  if (l1 || l2) return <ChartGridSkeleton />;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
      {/* Filter Strip */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
        <ToggleButtonGroup
          size="small"
          exclusive
          value={securedFilter}
          onChange={(_, v) => { if (v !== null) { setSecuredFilter(v as SecuredFilter); setSelectedProducts([]); } }}
          sx={{ '& .MuiToggleButton-root': { fontSize: '0.68rem', py: 0.4, px: 1.5, textTransform: 'none', fontWeight: 600 } }}
        >
          <ToggleButton value="all">All</ToggleButton>
          <ToggleButton value="secured">Secured</ToggleButton>
          <ToggleButton value="unsecured">Unsecured</ToggleButton>
        </ToggleButtonGroup>

        <Autocomplete
          multiple
          size="small"
          options={availableProducts.map((p) => p.productName)}
          value={selectedProducts}
          onChange={(_, val) => setSelectedProducts(val)}
          renderInput={(params) => (
            <TextField
              {...params}
              placeholder={selectedProducts.length === 0 ? 'All Products' : ''}
              sx={{ '& .MuiInputBase-root': { fontSize: '0.72rem', py: 0, minHeight: 32 } }}
            />
          )}
          renderTags={(value, getTagProps) =>
            value.map((option, index) => (
              <Chip {...getTagProps({ index })} key={option} label={option} size="small" sx={{ fontSize: '0.62rem', height: 20 }} />
            ))
          }
          sx={{ minWidth: 220, maxWidth: 400 }}
        />
      </Box>

      {kpis.length > 0 && <DelinquencyKPIStrip kpis={kpis} />}

      <Grid container spacing={2}>
        <Grid item xs={12} md={6}>
          <NetFlowWaterfall data={netFlow ?? []} />
        </Grid>
        <Grid item xs={12} md={6}>
          <RollRateSankey data={rollRates ?? []} />
        </Grid>
      </Grid>

      <RollRateHeatmap data={rollRates ?? []} />
    </Box>
  );
}
