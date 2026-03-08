'use client';

import { useMemo } from 'react';
import { useConsumerOverall } from '@/hooks/useConsumerData';
import { useTradeExecutiveSummary } from '@/hooks/useTradeData';
import { useCorporateExecutiveSummary } from '@/hooks/useCorporateData';
import { useRiskAppetite } from '@/hooks/useRiskAppetite';
import { getMetricDef } from '@/lib/risk-appetite/metric-registry';
import { formatPercent } from '@/lib/format';
import type { ScopeSelection, ConsumerMetricRow } from '@/lib/types';

export interface BreachAlert {
  id: string;
  product: 'Consumer Finance' | 'Trade Finance' | 'Corporate Finance';
  category: string;
  metricKey: string;
  label: string;
  value: number;
  formattedValue: string;
  rag: 'amber' | 'red';
  statusLabel: string;
  appetite: number;
  tolerance: number;
}

function getLatest(data: ConsumerMetricRow[], name: string): number | null {
  const row = data.find((d) => d.metric === name);
  if (!row) return null;
  const keys = Object.keys(row.values).sort();
  const v = keys.length > 0 ? row.values[keys[keys.length - 1]] : null;
  return typeof v === 'number' ? v : null;
}

export function useAllBreachAlerts(scope?: ScopeSelection) {
  const { data: consumerData, isLoading: cl } = useConsumerOverall(scope);
  const { data: tradeSummary, isLoading: tl } = useTradeExecutiveSummary(scope);
  const { data: corpSummary, isLoading: col } = useCorporateExecutiveSummary(scope);
  const { getStatus, getThreshold } = useRiskAppetite();

  const alerts = useMemo(() => {
    const results: BreachAlert[] = [];

    const check = (
      product: BreachAlert['product'],
      metricKey: string,
      value: number | null | undefined,
    ) => {
      if (value == null) return;
      const status = getStatus(metricKey, value);
      if (status === 'Green') return;
      const def = getMetricDef(metricKey);
      const threshold = getThreshold(metricKey);
      results.push({
        id: `${product}:${metricKey}`,
        product,
        category: def?.category ?? 'General',
        metricKey,
        label: def?.label ?? metricKey,
        value,
        formattedValue: formatPercent(value),
        rag: status === 'Amber' ? 'amber' : 'red',
        statusLabel: status === 'Amber' ? 'Appetite Breach' : 'Tolerance Breach',
        appetite: threshold.appetite,
        tolerance: threshold.tolerance,
      });
    };

    // Consumer Finance
    if (consumerData) {
      check('Consumer Finance', 'fpd_pct', getLatest(consumerData, 'FPD%'));
      check('Consumer Finance', 'dpd_30_plus', getLatest(consumerData, '30+ Amt%'));
      check('Consumer Finance', 'dpd_90_plus', getLatest(consumerData, '90+ Amt%'));
      check('Consumer Finance', 'net_credit_loss', getLatest(consumerData, 'Net Credit Loss'));
    }

    // Trade Finance
    if (tradeSummary) {
      check('Trade Finance', 'npl_ratio', tradeSummary.nplRatio);
      check('Trade Finance', 'stage_2_3_pct', tradeSummary.stage2Plus3Pct);
      check('Trade Finance', 'trade_utilization', tradeSummary.collectionEfficiency);
      check('Trade Finance', 'trade_overdue_ratio', tradeSummary.delinquency30Plus);
    }

    // Corporate Finance
    if (corpSummary) {
      check('Corporate Finance', 'corp_delinquency_rate', corpSummary.delinquencyRate);
      check('Corporate Finance', 'corp_npa_rate', corpSummary.npaRate);
      check('Corporate Finance', 'corp_security_cover', corpSummary.avgSecurityCover);
      check('Corporate Finance', 'corp_covenant_breach_rate', corpSummary.covenantBreachRate);
      check('Corporate Finance', 'corp_pcr', corpSummary.provisionCoverageRatio);
    }

    // Sort: red first, then amber; within same rag, by product
    results.sort((a, b) => {
      if (a.rag !== b.rag) return a.rag === 'red' ? -1 : 1;
      return a.product.localeCompare(b.product);
    });

    return results;
  }, [consumerData, tradeSummary, corpSummary, getStatus, getThreshold]);

  return {
    alerts,
    isLoading: cl || tl || col,
    redCount: alerts.filter((a) => a.rag === 'red').length,
    amberCount: alerts.filter((a) => a.rag === 'amber').length,
  };
}
