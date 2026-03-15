'use client';

import { useState } from 'react';
import { Box, Tabs, Tab } from '@mui/material';
import { PortfolioHealthSection } from '@/components/views/risk-outlook/PortfolioHealthSection';
import { StressHeatmapSection } from '@/components/views/risk-outlook/StressHeatmapSection';
import { ScenarioEngineSection } from '@/components/views/risk-outlook/ScenarioEngineSection';
import { EarlyWarningActionsSection } from '@/components/views/risk-outlook/EarlyWarningActionsSection';
import type { ScopeSelection } from '@/lib/types';

const SUB_TABS = [
  'Portfolio Health',
  'Stress Heatmap',
  'Scenario Engine',
  'Early Warning & Actions',
] as const;

interface Props {
  scope?: ScopeSelection;
  initialSubTab?: number;
}

export function ForwardOutlookView({ scope, initialSubTab }: Props) {
  const [subTab, setSubTab] = useState(initialSubTab ?? 0);

  const renderSection = () => {
    switch (subTab) {
      case 0: return <PortfolioHealthSection key="sub-0" scope={scope} />;
      case 1: return <StressHeatmapSection key="sub-1" scope={scope} />;
      case 2: return <ScenarioEngineSection key="sub-2" scope={scope} />;
      case 3: return <EarlyWarningActionsSection key="sub-3" scope={scope} />;
      default: return <PortfolioHealthSection key="sub-0" scope={scope} />;
    }
  };

  return (
    <Box id="tour-risk-outlook" sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Tabs
        value={subTab}
        onChange={(_, v) => setSubTab(v)}
        variant="scrollable"
        scrollButtons="auto"
        sx={{
          minHeight: 36,
          '& .MuiTab-root': {
            minHeight: 36,
            py: 0.5,
            fontSize: '0.75rem',
            fontWeight: 600,
            textTransform: 'none',
          },
          '& .MuiTabs-indicator': { height: 2.5, borderRadius: 2 },
        }}
      >
        {SUB_TABS.map((label) => (
          <Tab key={label} label={label} />
        ))}
      </Tabs>

      {renderSection()}
    </Box>
  );
}
