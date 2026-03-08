'use client';

import { useState } from 'react';
import { Box, Tabs, Tab } from '@mui/material';
import { KPIRow } from '@/components/cards/KPIRow';
import type { KPIItem } from '@/components/cards/KPIRow';
import { TradeOverviewSection } from '@/components/views/trade/TradeOverviewSection';
import { TradeProductMixSection } from '@/components/views/trade/TradeProductMixSection';
import { TradeConcentrationsSection } from '@/components/views/trade/TradeConcentrationsSection';
import { TradeWatchlistSection } from '@/components/views/trade/TradeWatchlistSection';
import { TradeEWSSection } from '@/components/views/trade/TradeEWSSection';
import { TradeMacroRiskSection } from '@/components/views/trade/TradeMacroRiskSection';
import { ChartSkeleton } from '@/components/common/LoadingSkeleton';
import { useTradeExecutiveSummary } from '@/hooks/useTradeData';
import { useRiskAppetite } from '@/hooks/useRiskAppetite';
import { formatCurrencyMM, formatPercent, formatNumber, formatCurrency } from '@/lib/format';
import type { ScopeSelection } from '@/lib/types';

const SUB_TABS = ['Overview', 'Product Mix', 'Concentrations', 'Watchlist', 'EWS & Migration', 'Macro Risk'] as const;

interface Props {
  scope?: ScopeSelection;
}

export function TradeFinanceView({ scope }: Props) {
  const { getColor } = useRiskAppetite();
  const [subTab, setSubTab] = useState(0);

  const { data: summary, isLoading } = useTradeExecutiveSummary(scope);

  const kpis: KPIItem[] = [
    { label: 'Trade Outstanding', value: formatCurrencyMM(summary?.totalAUM) },
    { label: 'Active Facilities', value: formatNumber(summary?.totalFacilities) },
    { label: 'NPL Ratio', value: formatPercent(summary?.nplRatio), color: getColor('npl_ratio', summary?.nplRatio ?? 0), metricKey: 'npl_ratio', rawValue: summary?.nplRatio ?? 0 },
    { label: 'Stage 2+3%', value: formatPercent(summary?.stage2Plus3Pct), color: getColor('stage_2_3_pct', summary?.stage2Plus3Pct ?? 0), metricKey: 'stage_2_3_pct', rawValue: summary?.stage2Plus3Pct ?? 0 },
    { label: 'Provision Coverage', value: formatPercent(summary?.provisionCoverage) },
    { label: 'Watchlist Exposure', value: formatCurrency(summary?.watchlistExposure), color: (summary?.watchlistExposure ?? 0) > 0 ? '#ff9800' : undefined },
  ];

  const renderSection = () => {
    if (isLoading) return <ChartSkeleton key="loading" height={400} />;

    switch (subTab) {
      case 0:
        return <TradeOverviewSection scope={scope} />;
      case 1:
        return <TradeProductMixSection scope={scope} />;
      case 2:
        return <TradeConcentrationsSection scope={scope} />;
      case 3:
        return <TradeWatchlistSection scope={scope} />;
      case 4:
        return <TradeEWSSection scope={scope} />;
      case 5:
        return <TradeMacroRiskSection scope={scope} />;
      default:
        return null;
    }
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <KPIRow items={kpis} />

      <Tabs
        value={subTab}
        onChange={(_, v) => setSubTab(v)}
        variant="scrollable"
        scrollButtons="auto"
        sx={{
          minHeight: 36,
          '& .MuiTab-root': { minHeight: 36, fontSize: '0.72rem', fontWeight: 600, textTransform: 'none', px: 1.5, py: 0.5 },
          '& .MuiTabs-indicator': { height: 2, borderRadius: 1 },
          borderBottom: 1,
          borderColor: 'divider',
        }}
      >
        {SUB_TABS.map((label) => (
          <Tab key={label} label={label} />
        ))}
      </Tabs>

      <Box sx={{ pt: 1 }}>{renderSection()}</Box>
    </Box>
  );
}
