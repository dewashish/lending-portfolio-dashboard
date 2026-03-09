'use client';

import { useState } from 'react';
import { Box, Tabs, Tab } from '@mui/material';
import { ConsumerKPIRow } from '@/components/views/consumer/ConsumerKPIRow';
import { ConsumerOverviewSection } from '@/components/views/consumer/ConsumerOverviewSection';
import { ConsumerOriginationSection } from '@/components/views/consumer/ConsumerOriginationSection';
import { ConsumerProductSection } from '@/components/views/consumer/ConsumerProductSection';
import { ConsumerDelinquencySection } from '@/components/views/consumer/ConsumerDelinquencySection';
import { ConsumerCollectionsSection } from '@/components/views/consumer/ConsumerCollectionsSection';
import { ConsumerNonStarterSection } from '@/components/views/consumer/ConsumerNonStarterSection';
import { ConsumerRiskAnalyticsSection } from '@/components/views/consumer/ConsumerRiskAnalyticsSection';
import { ConsumerTDDSection } from '@/components/views/consumer/ConsumerTDDSection';
import { useConsumerOverall } from '@/hooks/useConsumerData';
import type { ScopeSelection, ConsumerFilters } from '@/lib/types';

const SUB_TABS = [
  'Overview',
  'Origination',
  'Products',
  'Delinquency',
  'Collections',
  'Non-Starters',
  'Risk Analytics',
  'Due Diligence',
] as const;

interface Props {
  scope?: ScopeSelection;
  filters?: ConsumerFilters;
}

/* ── Main Component ─────────────────────────────────────────────── */

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function ConsumerFinanceView({ scope, filters }: Props) {
  const [subTab, setSubTab] = useState(0);
  const { data: overallData } = useConsumerOverall(scope, filters);

  const renderSection = () => {
    switch (subTab) {
      case 0: return <ConsumerOverviewSection key="sub-0" scope={scope} filters={filters} />;
      case 1: return <ConsumerOriginationSection key="sub-1" scope={scope} filters={filters} />;
      case 2: return <ConsumerProductSection key="sub-2" scope={scope} filters={filters} />;
      case 3: return <ConsumerDelinquencySection key="sub-3" scope={scope} filters={filters} />;
      case 4: return <ConsumerCollectionsSection key="sub-4" scope={scope} filters={filters} />;
      case 5: return <ConsumerNonStarterSection key="sub-5" scope={scope} filters={filters} />;
      case 6: return <ConsumerRiskAnalyticsSection key="sub-6" scope={scope} filters={filters} />;
      case 7: return <ConsumerTDDSection key="sub-7" scope={scope} filters={filters} />;
      default: return null;
    }
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {overallData && <ConsumerKPIRow data={overallData} scope={scope} />}

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
          '& .MuiTabs-indicator': {
            height: 2,
            borderRadius: 1,
          },
          borderBottom: 1,
          borderColor: 'divider',
        }}
      >
        {SUB_TABS.map((label) => (
          <Tab key={label} label={label} />
        ))}
      </Tabs>

      <Box sx={{ pt: 1 }}>
        {renderSection()}
      </Box>
    </Box>
  );
}
