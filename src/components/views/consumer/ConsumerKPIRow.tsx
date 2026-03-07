'use client';

import { useMemo } from 'react';
import { KPIRow, type KPIItem } from '@/components/cards/KPIRow';
import { formatCurrencyMM, formatPercent } from '@/lib/format';
import type { ConsumerMetricRow } from '@/lib/types';

interface Props {
  data: ConsumerMetricRow[];
}

function getLatest(data: ConsumerMetricRow[], metricName: string): number {
  const row = data.find((d) => d.metric === metricName);
  if (!row) return 0;
  const periods = Object.keys(row.values).sort();
  const latest = periods[periods.length - 1];
  const val = row.values[latest];
  return typeof val === 'number' ? val : 0;
}

function getPrevious(data: ConsumerMetricRow[], metricName: string): number {
  const row = data.find((d) => d.metric === metricName);
  if (!row) return 0;
  const periods = Object.keys(row.values).sort();
  if (periods.length < 2) return 0;
  const val = row.values[periods[periods.length - 2]];
  return typeof val === 'number' ? val : 0;
}

function momChange(current: number, previous: number): number {
  if (previous === 0) return 0;
  return ((current - previous) / previous) * 100;
}

export function ConsumerKPIRow({ data }: Props) {
  const items = useMemo<KPIItem[]>(() => {
    const aum = getLatest(data, 'Total AUM');
    const aumPrev = getPrevious(data, 'Total AUM');
    const bookings = getLatest(data, 'New Bookings');
    const fpd = getLatest(data, 'FPD%');
    const dpd30 = getLatest(data, '30+ Amt%');
    const dpd90 = getLatest(data, '90+ Amt%');
    const ncl = getLatest(data, 'Net Credit Loss');
    const nclAmt = getLatest(data, 'NCL');

    return [
      {
        label: 'Total AUM',
        value: formatCurrencyMM(aum),
        trend: { value: momChange(aum, aumPrev) },
        subtitle: 'MoM',
      },
      {
        label: 'New Bookings',
        value: formatCurrencyMM(bookings),
      },
      {
        label: 'FPD%',
        value: formatPercent(fpd),
        color: fpd > 0.035 ? '#f44336' : fpd > 0.03 ? '#ff9800' : undefined,
      },
      {
        label: '30+ DPD',
        value: formatPercent(dpd30),
        color: dpd30 > 0.06 ? '#f44336' : dpd30 > 0.05 ? '#ff9800' : undefined,
      },
      {
        label: '90+ DPD',
        value: formatPercent(dpd90),
        color: dpd90 > 0.02 ? '#f44336' : dpd90 > 0.015 ? '#ff9800' : undefined,
      },
      {
        label: 'Net Credit Loss',
        value: formatPercent(ncl),
        subtitle: formatCurrencyMM(nclAmt),
      },
    ];
  }, [data]);

  return <KPIRow items={items} />;
}
