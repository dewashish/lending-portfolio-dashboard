'use client';

import { useMemo } from 'react';
import { KPIRow, type KPIItem } from '@/components/cards/KPIRow';
import { formatPercent } from '@/lib/format';
import { useCurrencyFormat } from '@/lib/currency-context';
import type { RiskOutlookKPIs } from '@/lib/types';

interface Props {
  data: RiskOutlookKPIs;
}

export function RiskOutlookKPIRow({ data }: Props) {
  const { formatCurrency } = useCurrencyFormat();

  const items = useMemo<KPIItem[]>(
    () => [
      {
        label: 'Total ECL (Base)',
        value: formatCurrency(data.totalEcl),
        subtitle: 'Scenario-weighted',
      },
      {
        label: 'Provision Coverage',
        value: formatPercent(data.provisionCoverage),
        color: data.provisionCoverage < 0.6 ? '#f44336' : data.provisionCoverage < 0.8 ? '#ff9800' : '#4caf50',
      },
      {
        label: 'CET1 Under Stress',
        value: formatPercent(data.cet1UnderStress),
        subtitle: 'Severe scenario min',
        color: data.cet1UnderStress < 0.045 ? '#f44336' : data.cet1UnderStress < 0.08 ? '#ff9800' : '#4caf50',
      },
      {
        label: 'Avg PD (1Y)',
        value: formatPercent(data.avgPd1Y, 3),
        subtitle: 'All grades',
      },
      {
        label: 'EWS Alerts',
        value: `${data.ewsAlerts}`,
        subtitle: 'Red indicators',
        color: data.ewsAlerts > 2 ? '#f44336' : data.ewsAlerts > 0 ? '#ff9800' : '#4caf50',
      },
    ],
    [data, formatCurrency],
  );

  return <KPIRow items={items} />;
}
