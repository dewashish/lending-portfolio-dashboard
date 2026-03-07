'use client';

import { useState } from 'react';
import { Box, Tabs, Tab } from '@mui/material';
import { ConsumerKPIRow } from '@/components/views/consumer/ConsumerKPIRow';
import { ConsumerOverviewSection } from '@/components/views/consumer/ConsumerOverviewSection';
import { ConsumerOriginationSection } from '@/components/views/consumer/ConsumerOriginationSection';
import { ConsumerProductSection } from '@/components/views/consumer/ConsumerProductSection';
import { ConsumerDelinquencySection } from '@/components/views/consumer/ConsumerDelinquencySection';
import { ConsumerCollectionsSection } from '@/components/views/consumer/ConsumerCollectionsSection';
import { ConsumerVintageSection } from '@/components/views/consumer/ConsumerVintageSection';
import { ConsumerNonStarterSection } from '@/components/views/consumer/ConsumerNonStarterSection';
import { ConsumerRiskAnalyticsSection } from '@/components/views/consumer/ConsumerRiskAnalyticsSection';
import { ConsumerTDDSection } from '@/components/views/consumer/ConsumerTDDSection';
import { useConsumerOverall } from '@/hooks/useConsumerData';
import type { PortfolioData, FilterState } from '@/lib/types'; // eslint-disable-line @typescript-eslint/no-unused-vars

const SUB_TABS = [
  'Overview',
  'Origination',
  'Products',
  'Delinquency',
  'Collections',
  'Vintage Analysis',
  'Non-Starters',
  'Risk Analytics',
  'Due Diligence',
] as const;

interface Props {
  portfolio: PortfolioData;
  filters: FilterState;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function ConsumerFinanceView(props: Props) {
  const [subTab, setSubTab] = useState(0);
  const { data: overallData } = useConsumerOverall();

  const renderSection = () => {
    switch (subTab) {
      case 0: return <ConsumerOverviewSection />;
      case 1: return <ConsumerOriginationSection />;
      case 2: return <ConsumerProductSection />;
      case 3: return <ConsumerDelinquencySection />;
      case 4: return <ConsumerCollectionsSection />;
      case 5: return <ConsumerVintageSection />;
      case 6: return <ConsumerNonStarterSection />;
      case 7: return <ConsumerRiskAnalyticsSection />;
      case 8: return <ConsumerTDDSection />;
      default: return null;
    }
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {overallData && <ConsumerKPIRow data={overallData} />}

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
