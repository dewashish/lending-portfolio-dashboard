'use client';

import { useState, useMemo } from 'react';
import { Box, Card, Typography, Stack, ToggleButtonGroup, ToggleButton, Select, MenuItem, Divider, Tooltip, IconButton } from '@mui/material';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import { NetFlowWaterfall } from '@/components/charts/NetFlowWaterfall';
import { VintageHeatmap } from '@/components/charts/VintageHeatmap';
import { ChartGridSkeleton } from '@/components/common/LoadingSkeleton';
import { useNetFlowRates, useConsumerOverall, useProductCatalog, useProductMetrics, useConsumerPeriods, useVintagePoints } from '@/hooks/useConsumerData';
import { useRiskAppetite } from '@/hooks/useRiskAppetite';
import { BreachBadge } from '@/components/common/BreachBadge';
import { formatPercent, sortPeriodsChronologically } from '@/lib/format';
import type { ScopeSelection, ConsumerMetricRow, ConsumerFilters, VintagePoint } from '@/lib/types';

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

const VINTAGE_METRICS = ['X+', '30+', '60+', '90+'] as const;

export function ConsumerDelinquencySection({ scope, filters }: Props) {
  const [securedFilter, setSecuredFilter] = useState<SecuredFilter>('all');
  const [selectedProduct, setSelectedProduct] = useState<string>('all');
  const [selectedPeriod, setSelectedPeriod] = useState<string | null>(null);
  const [vintageMetric, setVintageMetric] = useState<string>('30+');
  const { data: productCatalog } = useProductCatalog(scope);
  const { data: rawPeriods } = useConsumerPeriods(scope);
  const { getColor } = useRiskAppetite();

  // Products available based on the secured/unsecured toggle
  const availableProducts = useMemo(() => {
    if (!productCatalog) return [];
    if (securedFilter === 'all') return productCatalog;
    return productCatalog.filter((p) => p.productCategory.toLowerCase() === securedFilter);
  }, [productCatalog, securedFilter]);

  // Resolved product names to pass to hooks
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

  // Net Flow: filter to specific selected period
  const netFlowFilters: ConsumerFilters = useMemo(() => ({
    period: selectedPeriod,
    products: effectiveProducts,
  }), [selectedPeriod, effectiveProducts]);

  const hasProductFilter = effectiveProducts.length > 0;

  const { data: netFlow, isLoading: l1 } = useNetFlowRates(scope, netFlowFilters);
  const { data: overall } = useConsumerOverall(scope, filters);
  const { data: productData } = useProductMetrics(scope, hasProductFilter ? netFlowFilters : undefined);

  // Vintage / Static Pool data
  const vintageProducts = useMemo(() => effectiveProducts.length > 0 ? effectiveProducts : undefined, [effectiveProducts]);
  const { data: vintageData, isLoading: l2 } = useVintagePoints(scope, vintageMetric, vintageProducts);

  // Aggregate vintage data across products (weighted average by loan amount)
  const aggregatedVintage = useMemo(() => {
    if (!vintageData || vintageData.length === 0) return [];
    const groups = new Map<string, { weightedSum: number; totalWeight: number }>();
    for (const pt of vintageData) {
      const key = `${pt.vintage}|${pt.mob}|${pt.metricType}`;
      const g = groups.get(key);
      if (g) {
        g.weightedSum += pt.delinquencyRate * pt.loanAmount;
        g.totalWeight += pt.loanAmount;
      } else {
        groups.set(key, { weightedSum: pt.delinquencyRate * pt.loanAmount, totalWeight: pt.loanAmount });
      }
    }
    const result: VintagePoint[] = [];
    groups.forEach((val, key) => {
      const [vintage, mob, metricType] = key.split('|');
      result.push({
        vintage,
        mob: parseInt(mob),
        metricType,
        delinquencyRate: val.totalWeight > 0 ? val.weightedSum / val.totalWeight : 0,
        loanAmount: val.totalWeight,
      });
    });
    return result;
  }, [vintageData]);

  // Available periods from consumer overall metrics
  const availablePeriods = useMemo(() => {
    if (!rawPeriods || rawPeriods.length === 0) return [];
    return sortPeriodsChronologically(rawPeriods);
  }, [rawPeriods]);

  const handleSecuredChange = (_: unknown, v: SecuredFilter | null) => {
    if (v !== null) {
      setSecuredFilter(v);
      setSelectedProduct('all');
    }
  };

  const kpis = useMemo<DKpi[]>(() => {
    const defs = [
      { name: 'FPD%', label: 'FPD Rate', metricKey: 'fpd_pct' },
      { name: '30+ Amt%', label: '30+ DPD', metricKey: 'dpd_30_plus' },
      { name: '90+ Amt%', label: '90+ DPD', metricKey: 'dpd_90_plus' },
      { name: 'Net Credit Loss', label: 'NCL Rate', metricKey: 'net_credit_loss' },
    ];

    if (hasProductFilter && productData && productData.length > 0) {
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

    if (!overall || overall.length === 0) return [];
    return defs.map(({ name, label, metricKey }) => {
      const curr = getLatest(overall, name);
      const prev = getPrevious(overall, name);
      const delta = curr != null && prev != null && prev !== 0 ? ((curr - prev) / Math.abs(prev)) * 100 : null;
      const color = curr == null ? '#78909c' : getColor(metricKey, curr);
      return { label, value: curr != null ? formatPercent(curr) : '—', delta, color, metricKey, rawValue: curr ?? undefined };
    });
  }, [overall, productData, hasProductFilter, getColor]);

  if (l1) return <ChartGridSkeleton />;

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
      </Box>

      {kpis.length > 0 && <DelinquencyKPIStrip kpis={kpis} />}

      {/* Static Pool Analysis — always shows current data, unaffected by period filter */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 700, fontSize: '0.8rem' }}>
            Static Pool Analysis
          </Typography>
          <Tooltip
            arrow
            placement="right"
            title={
              <Box sx={{ p: 0.5, maxWidth: 280 }}>
                <Typography variant="caption" sx={{ fontWeight: 700, fontSize: '0.7rem', display: 'block', mb: 0.5 }}>
                  What is Static Pool Analysis?
                </Typography>
                <Typography variant="caption" sx={{ fontSize: '0.65rem', display: 'block', lineHeight: 1.6 }}>
                  Static pool tracks how each vintage cohort (month of disbursement) performs over time.
                  Rows represent vintage months, columns represent Months on Book (MOB).
                </Typography>
                <Typography variant="caption" sx={{ fontSize: '0.65rem', display: 'block', lineHeight: 1.6, mt: 0.5 }}>
                  The triangular shape occurs because newer vintages have fewer months of history.
                  MOBs beyond 18 are grouped into an &quot;18+&quot; bucket.
                </Typography>
                <Typography variant="caption" sx={{ fontSize: '0.65rem', display: 'block', lineHeight: 1.6, mt: 0.5 }}>
                  Hover over any cell to see the absolute delinquent amount.
                  Use the metric toggles (X+, 30+, 60+, 90+) to view different delinquency thresholds.
                </Typography>
              </Box>
            }
          >
            <IconButton size="small" sx={{ ml: 0.5, p: 0.3 }}>
              <InfoOutlinedIcon sx={{ fontSize: '1rem', color: 'text.secondary' }} />
            </IconButton>
          </Tooltip>
        </Box>
        <ToggleButtonGroup
          size="small"
          exclusive
          value={vintageMetric}
          onChange={(_, v) => { if (v) setVintageMetric(v); }}
          sx={{ '& .MuiToggleButton-root': { fontSize: '0.62rem', py: 0.3, px: 1, textTransform: 'none' } }}
        >
          {VINTAGE_METRICS.map((m) => (
            <ToggleButton key={m} value={m}>{m}</ToggleButton>
          ))}
        </ToggleButtonGroup>
      </Box>
      {l2 ? <ChartGridSkeleton /> : (
        <VintageHeatmap data={aggregatedVintage} metricType={vintageMetric} fillHeight={false} />
      )}

      <Divider sx={{ my: 0.5 }} />

      <NetFlowWaterfall data={netFlow ?? []} selectedPeriod={selectedPeriod ?? undefined} fillHeight={false} periodSelector={
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
      } />
    </Box>
  );
}
