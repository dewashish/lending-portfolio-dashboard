'use client';

import { useMemo } from 'react';
import { useRiskOutlookKPIs, useStressScenarioLosses, useVintageForecast } from '@/hooks/useRiskOutlookData';
import { KPIRow, type KPIItem } from '@/components/cards/KPIRow';
import { formatPercent } from '@/lib/format';
import { useCurrencyFormat } from '@/lib/currency-context';
import type { ScopeSelection } from '@/lib/types';

interface Props {
  scope?: ScopeSelection;
}

export function ForwardOutlookKPIRow({ scope }: Props) {
  const { formatCurrency } = useCurrencyFormat();
  const { data: kpis } = useRiskOutlookKPIs(scope);
  const { data: stressLosses } = useStressScenarioLosses(scope);
  const { data: vintageData } = useVintageForecast(scope);

  const forecastedLossRate = useMemo(() => {
    if (!stressLosses || stressLosses.length === 0) return 0;
    const baseRows = stressLosses.filter((r) => r.scenario === 'Base');
    if (baseRows.length === 0) return 0;
    const sum = baseRows.reduce((acc, r) => acc + r.lossRate, 0);
    return sum / baseRows.length;
  }, [stressLosses]);

  const dpdForecast = useMemo(() => {
    if (!vintageData || vintageData.length === 0) return 0;
    const projected = vintageData.filter((r) => r.isProjected === true);
    if (projected.length === 0) return 0;
    return Math.max(...projected.map((r) => r.projectedDelinqRate ?? 0));
  }, [vintageData]);

  if (!kpis) return null;

  const items: KPIItem[] = [
    {
      label: 'Expected Credit Loss',
      value: formatCurrency(kpis.totalEcl ?? 0),
      subtitle: 'Base scenario',
    },
    {
      label: 'Provision Coverage',
      value: formatPercent(kpis.provisionCoverage ?? 0),
      color:
        (kpis.provisionCoverage ?? 0) < 0.6
          ? '#f44336'
          : (kpis.provisionCoverage ?? 0) < 0.8
            ? '#ff9800'
            : '#4caf50',
    },
    {
      label: 'Forecasted Loss Rate',
      value: formatPercent(forecastedLossRate),
      subtitle: 'Base scenario avg',
      color:
        forecastedLossRate >= 0.05
          ? '#f44336'
          : forecastedLossRate >= 0.02
            ? '#ff9800'
            : '#4caf50',
    },
    {
      label: '90+ DPD Forecast',
      value: formatPercent(dpdForecast),
      subtitle: 'Max projected rate',
      color:
        dpdForecast >= 0.06
          ? '#f44336'
          : dpdForecast >= 0.03
            ? '#ff9800'
            : '#4caf50',
    },
  ];

  return <KPIRow items={items} />;
}
