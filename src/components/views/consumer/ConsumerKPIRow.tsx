'use client';

import { useMemo } from 'react';
import { KPIRow, type KPIItem } from '@/components/cards/KPIRow';
import { formatPercent } from '@/lib/format';
import { useCurrencyFormat } from '@/lib/currency-context';
import { useRiskAppetite } from '@/hooks/useRiskAppetite';
import { buildThresholdContext } from '@/lib/risk-appetite/build-context';
import type { ConsumerMetricRow, ScopeSelection } from '@/lib/types';

interface Props {
  data: ConsumerMetricRow[];
  scope?: ScopeSelection;
}

/** Get all period values for a metric, sorted chronologically */
function getAllValues(data: ConsumerMetricRow[], metricName: string): number[] {
  const row = data.find((d) => d.metric === metricName);
  if (!row) return [];
  return Object.keys(row.values)
    .sort()
    .map((k) => {
      const v = row.values[k];
      return typeof v === 'number' ? v : 0;
    });
}

function getLatest(values: number[]): number {
  return values.length > 0 ? values[values.length - 1] : 0;
}

function getPrevious(values: number[]): number {
  return values.length >= 2 ? values[values.length - 2] : 0;
}

function momChange(current: number, previous: number): number {
  if (previous === 0) return 0;
  return ((current - previous) / previous) * 100;
}

function getBenchmark(data: ConsumerMetricRow[], metricName: string): number | undefined {
  const row = data.find((d) => d.metric === metricName);
  if (!row || row.benchmark == null) return undefined;
  return typeof row.benchmark === 'number' ? row.benchmark : undefined;
}

export function ConsumerKPIRow({ data, scope }: Props) {
  const { formatCurrency } = useCurrencyFormat();
  const { getColor } = useRiskAppetite();
  const ctx = useMemo(() => buildThresholdContext(scope, { businessLine: 'consumer_finance' }), [scope]);

  const items = useMemo<KPIItem[]>(() => {
    const aumValues = getAllValues(data, 'Total AUM');
    const bookingsValues = getAllValues(data, 'New Bookings');
    const fpdValues = getAllValues(data, 'FPD%');
    const dpd30Values = getAllValues(data, '30+ Amt%');
    const dpd90Values = getAllValues(data, '90+ Amt%');
    const nclRateValues = getAllValues(data, 'Net Credit Loss');
    const nclAmtValues = getAllValues(data, 'NCL');

    const aum = getLatest(aumValues);
    const aumPrev = getPrevious(aumValues);
    const bookings = getLatest(bookingsValues);
    const bookingsPrev = getPrevious(bookingsValues);
    const fpd = getLatest(fpdValues);
    const fpdPrev = getPrevious(fpdValues);
    const dpd30 = getLatest(dpd30Values);
    const dpd30Prev = getPrevious(dpd30Values);
    const dpd90 = getLatest(dpd90Values);
    const dpd90Prev = getPrevious(dpd90Values);
    const nclRate = getLatest(nclRateValues);
    const nclRatePrev = getPrevious(nclRateValues);
    const nclAmt = getLatest(nclAmtValues);

    return [
      {
        label: 'Total AUM',
        value: formatCurrency(aum),
        trend: { value: momChange(aum, aumPrev) },
        subtitle: 'MoM',
        sparkline: aumValues,
      },
      {
        label: 'New Bookings',
        value: formatCurrency(bookings),
        trend: { value: momChange(bookings, bookingsPrev) },
        subtitle: 'MoM',
        sparkline: bookingsValues,
      },
      {
        label: 'FPD%',
        value: formatPercent(fpd),
        color: getColor('fpd_pct', fpd, ctx),
        trend: { value: momChange(fpd, fpdPrev) },
        invertTrend: true,
        sparkline: fpdValues,
        benchmark: getBenchmark(data, 'FPD%'),
        metricKey: 'fpd_pct',
        rawValue: fpd,
        thresholdContext: ctx,
      },
      {
        label: '30+ DPD',
        value: formatPercent(dpd30),
        color: getColor('dpd_30_plus', dpd30, ctx),
        trend: { value: momChange(dpd30, dpd30Prev) },
        invertTrend: true,
        sparkline: dpd30Values,
        benchmark: getBenchmark(data, '30+ Amt%'),
        metricKey: 'dpd_30_plus',
        rawValue: dpd30,
        thresholdContext: ctx,
      },
      {
        label: '90+ DPD',
        value: formatPercent(dpd90),
        color: getColor('dpd_90_plus', dpd90, ctx),
        trend: { value: momChange(dpd90, dpd90Prev) },
        invertTrend: true,
        sparkline: dpd90Values,
        benchmark: getBenchmark(data, '90+ Amt%'),
        metricKey: 'dpd_90_plus',
        rawValue: dpd90,
        thresholdContext: ctx,
      },
      {
        label: 'Net Credit Loss',
        value: formatPercent(nclRate),
        subtitle: formatCurrency(nclAmt),
        trend: { value: momChange(nclRate, nclRatePrev) },
        invertTrend: true,
        sparkline: nclRateValues,
        benchmark: getBenchmark(data, 'Net Credit Loss'),
      },
    ];
  }, [data, getColor, formatCurrency, ctx]);

  return <KPIRow items={items} />;
}
