'use client';

import { useState } from 'react';
import { Box, Tabs, Tab } from '@mui/material';
import { RiskOutlookKPIRow } from '@/components/views/risk-outlook/RiskOutlookKPIRow';
import { ECLProvisionsSection } from '@/components/views/risk-outlook/ECLProvisionsSection';
import { StressTestingSection } from '@/components/views/risk-outlook/StressTestingSection';
import { PDMigrationSection } from '@/components/views/risk-outlook/PDMigrationSection';
import { VintageForecastSection } from '@/components/views/risk-outlook/VintageForecastSection';
import { MacroEWSSection } from '@/components/views/risk-outlook/MacroEWSSection';
import { MethodologySection } from '@/components/views/risk-outlook/MethodologySection';
import { useRiskOutlookKPIs } from '@/hooks/useRiskOutlookData';
import type { ScopeSelection } from '@/lib/types';

const SUB_TABS = [
  'ECL & Provisions',
  'Stress Testing',
  'PD & Migration',
  'Vintage Forecast',
  'Macro & EWS',
  'Methodology',
] as const;

interface Props {
  scope?: ScopeSelection;
}

export function RiskOutlookView({ scope }: Props) {
  const [subTab, setSubTab] = useState(0);
  const { data: kpis } = useRiskOutlookKPIs(scope);

  const renderSection = () => {
    switch (subTab) {
      case 0: return <ECLProvisionsSection key="sub-0" scope={scope} />;
      case 1: return <StressTestingSection key="sub-1" scope={scope} />;
      case 2: return <PDMigrationSection key="sub-2" scope={scope} />;
      case 3: return <VintageForecastSection key="sub-3" scope={scope} />;
      case 4: return <MacroEWSSection key="sub-4" scope={scope} />;
      case 5: return <MethodologySection key="sub-5" />;
      default: return null;
    }
  };

  return (
    <Box id="tour-risk-outlook" sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {kpis && <RiskOutlookKPIRow data={kpis} />}

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
