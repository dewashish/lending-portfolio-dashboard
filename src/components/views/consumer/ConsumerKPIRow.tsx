'use client';

import { useMemo } from 'react';
import { KPIRow, type KPIItem } from '@/components/cards/KPIRow';
import { formatCurrencyMM, formatPercent } from '@/lib/format';
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

export function ConsumerKPIRow({ data }: Props) {
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
        value: formatCurrencyMM(aum),
        trend: { value: momChange(aum, aumPrev) },
        subtitle: 'MoM',
        sparkline: aumValues,
      },
      {
        label: 'New Bookings',
        value: formatCurrencyMM(bookings),
        trend: { value: momChange(bookings, bookingsPrev) },
        subtitle: 'MoM',
        sparkline: bookingsValues,
      },
      {
        label: 'FPD%',
        value: formatPercent(fpd),
        color: fpd > 0.035 ? '#f44336' : fpd > 0.03 ? '#ff9800' : '#4caf50',
        trend: { value: momChange(fpd, fpdPrev) },
        invertTrend: true,
        sparkline: fpdValues,
        benchmark: getBenchmark(data, 'FPD%'),
      },
      {
        label: '30+ DPD',
        value: formatPercent(dpd30),
        color: dpd30 > 0.06 ? '#f44336' : dpd30 > 0.05 ? '#ff9800' : '#4caf50',
        trend: { value: momChange(dpd30, dpd30Prev) },
        invertTrend: true,
        sparkline: dpd30Values,
        benchmark: getBenchmark(data, '30+ Amt%'),
      },
      {
        label: '90+ DPD',
        value: formatPercent(dpd90),
        color: dpd90 > 0.02 ? '#f44336' : dpd90 > 0.015 ? '#ff9800' : '#4caf50',
        trend: { value: momChange(dpd90, dpd90Prev) },
        invertTrend: true,
        sparkline: dpd90Values,
        benchmark: getBenchmark(data, '90+ Amt%'),
      },
      {
        label: 'Net Credit Loss',
        value: formatPercent(nclRate),
        subtitle: formatCurrencyMM(nclAmt),
        trend: { value: momChange(nclRate, nclRatePrev) },
        invertTrend: true,
        sparkline: nclRateValues,
        benchmark: getBenchmark(data, 'Net Credit Loss'),
      },
    ];
  }, [data]);

  return <KPIRow items={items} />;
}
