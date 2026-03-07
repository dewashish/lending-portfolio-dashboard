'use client';

import { Box } from '@mui/material';
import { KPIRow } from '@/components/cards/KPIRow';
import type { KPIItem } from '@/components/cards/KPIRow';
import { EWSRadar } from '@/components/charts/EWSRadar';
import { EWSAlertTable } from '@/components/tables/EWSAlertTable';
import { formatNumber, formatCurrency } from '@/lib/format';
import type { PortfolioData, FilterState } from '@/lib/types';

interface Props {
  portfolio: PortfolioData;
  filters: FilterState;
}

export function EarlyWarningView({ portfolio }: Props) {
  const ewsSummary = portfolio.ewsEntitySummary;
  const alerts = portfolio.ewsFacilityAlerts;

  const totalFlagged = ewsSummary.reduce(
    (sum, e) => sum + e.score2 + e.score3 + e.score4Plus,
    0,
  );
  const avgScore =
    ewsSummary.length > 0
      ? ewsSummary.reduce((sum, e) => sum + e.avgEWSScore, 0) / ewsSummary.length
      : 0;
  const criticalCount = ewsSummary.reduce((sum, e) => sum + e.score4Plus, 0);
  const flaggedExposure = ewsSummary.reduce((sum, e) => sum + e.flaggedExposure, 0);

  const kpis: KPIItem[] = [
    {
      label: 'Total Flagged',
      value: formatNumber(totalFlagged),
      color: totalFlagged > 0 ? '#ff9800' : '#4caf50',
    },
    {
      label: 'Avg EWS Score',
      value: formatNumber(avgScore, 1),
    },
    {
      label: 'Critical Count',
      value: formatNumber(criticalCount),
      color: criticalCount > 0 ? '#f44336' : '#4caf50',
    },
    {
      label: 'Flagged Exposure',
      value: formatCurrency(flaggedExposure),
      color: flaggedExposure > 0 ? '#ff9800' : undefined,
    },
  ];

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <KPIRow items={kpis} />
      <EWSRadar data={ewsSummary} />
      <EWSAlertTable data={alerts} />
    </Box>
  );
}
