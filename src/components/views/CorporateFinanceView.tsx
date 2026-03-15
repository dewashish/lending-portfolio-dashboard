'use client';

import { useState, useMemo } from 'react';
import { Box, Tabs, Tab } from '@mui/material';
import { KPIRow } from '@/components/cards/KPIRow';
import type { KPIItem } from '@/components/cards/KPIRow';
import { CorporateOverviewSection } from '@/components/views/corporate/CorporateOverviewSection';
import { CorporateIndustrySection } from '@/components/views/corporate/CorporateIndustrySection';
import { CorporateCollateralSection } from '@/components/views/corporate/CorporateCollateralSection';
import { CorporateMaturitySection } from '@/components/views/corporate/CorporateMaturitySection';
import { CorporateProvisioningSection } from '@/components/views/corporate/CorporateProvisioningSection';
import { CorporateRatingSection } from '@/components/views/corporate/CorporateRatingSection';
import { CorporateWatchlistSection } from '@/components/views/corporate/CorporateWatchlistSection';
import { CorporateCovenantSection } from '@/components/views/corporate/CorporateCovenantSection';
import { CorporateDelinquencySection } from '@/components/views/corporate/CorporateDelinquencySection';
import { ChartSkeleton } from '@/components/common/LoadingSkeleton';
import { useCorporateExecutiveSummary } from '@/hooks/useCorporateData';
import { useRiskAppetite } from '@/hooks/useRiskAppetite';
import { buildThresholdContext } from '@/lib/risk-appetite/build-context';
import { formatPercent } from '@/lib/format';
import { useCurrencyFormat } from '@/lib/currency-context';
import type { ScopeSelection } from '@/lib/types';

const SUB_TABS = [
  'Overview',
  'Industry',
  'Collateral & LTV',
  'Maturity',
  'Provisioning',
  'Rating Analysis',
  'Watchlist',
  'Covenants',
  'Delinquency',
] as const;

interface Props {
  scope?: ScopeSelection;
  initialSubTab?: number;
}

export function CorporateFinanceView({ scope, initialSubTab }: Props) {
  const { formatCurrencyMM } = useCurrencyFormat();
  const [subTab, setSubTab] = useState(initialSubTab ?? 0);
  const { data: summary, isLoading } = useCorporateExecutiveSummary(scope);
  const { getColor } = useRiskAppetite();
  const ctx = useMemo(() => buildThresholdContext(scope, { businessLine: 'corporate_finance' }), [scope]);

  // KPI items
  const kpis = useMemo<KPIItem[]>(() => {
    if (!summary) return [];
    return [
      {
        label: 'Total POS',
        value: formatCurrencyMM(summary.totalPOS),
      },
      {
        label: 'Disbursement',
        value: formatCurrencyMM(summary.totalDisbursement),
      },
      {
        label: 'Delinquency Rate',
        value: formatPercent(summary.delinquencyRate),
        color: getColor('corp_delinquency_rate', summary.delinquencyRate, ctx),
        metricKey: 'corp_delinquency_rate',
        rawValue: summary.delinquencyRate,
        thresholdContext: ctx,
        info: 'Count-based: # of accounts with DPD > 0 / total accounts. See Delinquency tab for exposure-weighted PAR X+.',
      },
      {
        label: 'NPA Rate',
        value: formatPercent(summary.npaRate),
        color: getColor('corp_npa_rate', summary.npaRate, ctx),
        metricKey: 'corp_npa_rate',
        rawValue: summary.npaRate,
        thresholdContext: ctx,
        info: 'Count-based: # of accounts with DPD > 90 / total accounts. See Delinquency tab for exposure-weighted PAR 90+.',
      },
      {
        label: 'Security Cover',
        value: formatPercent(summary.avgSecurityCover),
        color: getColor('corp_security_cover', summary.avgSecurityCover, ctx),
        metricKey: 'corp_security_cover',
        rawValue: summary.avgSecurityCover,
        thresholdContext: ctx,
      },
      {
        label: 'PCR',
        value: formatPercent(summary.provisionCoverageRatio),
        color: getColor('corp_pcr', summary.provisionCoverageRatio, ctx),
        metricKey: 'corp_pcr',
        rawValue: summary.provisionCoverageRatio,
        thresholdContext: ctx,
      },
    ];
  }, [summary, getColor, formatCurrencyMM, ctx]);

  const renderSection = () => {
    switch (subTab) {
      case 0:
        return <CorporateOverviewSection scope={scope} />;
      case 1:
        return <CorporateIndustrySection scope={scope} />;
      case 2:
        return <CorporateCollateralSection scope={scope} />;
      case 3:
        return <CorporateMaturitySection scope={scope} />;
      case 4:
        return <CorporateProvisioningSection scope={scope} />;
      case 5:
        return <CorporateRatingSection scope={scope} />;
      case 6:
        return <CorporateWatchlistSection scope={scope} />;
      case 7:
        return <CorporateCovenantSection scope={scope} />;
      case 8:
        return <CorporateDelinquencySection scope={scope} />;
      default:
        return null;
    }
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {/* KPI Strip */}
      {isLoading ? (
        <ChartSkeleton height={60} />
      ) : (
        kpis.length > 0 && <KPIRow items={kpis} />
      )}

      {/* Sub-tabs */}
      <Tabs
        value={subTab}
        onChange={(_, v) => setSubTab(v)}
        variant="scrollable"
        scrollButtons="auto"
        sx={{
          minHeight: 36,
          '& .MuiTab-root': {
            minHeight: 36,
            fontSize: '0.72rem',
            fontWeight: 600,
            textTransform: 'none',
            px: 1.5,
            py: 0.5,
          },
          '& .MuiTabs-indicator': { height: 2, borderRadius: 1 },
          borderBottom: 1,
          borderColor: 'divider',
        }}
      >
        {SUB_TABS.map((label) => (
          <Tab key={label} label={label} />
        ))}
      </Tabs>

      {/* Section content */}
      <Box sx={{ pt: 1 }}>{renderSection()}</Box>
    </Box>
  );
}
