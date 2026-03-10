'use client';

import { useState, useCallback } from 'react';
import { Box } from '@mui/material';
import { DashboardAppBar } from '@/components/shell/DashboardAppBar';
import { TabBar } from '@/components/shell/TabBar';
import type { ScopeSelection } from '@/lib/types';
import { DEFAULT_SCOPE } from '@/lib/constants';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { AdminProvider } from '@/lib/admin-context';
import { RiskAppetiteDrawer } from '@/components/admin/RiskAppetiteDrawer';
import { PinDialog } from '@/components/admin/PinDialog';

import { GroupOverviewView } from '@/components/views/GroupOverviewView';
import { ConsumerFinanceView } from '@/components/views/ConsumerFinanceView';
import { TradeFinanceView } from '@/components/views/TradeFinanceView';
import { CorporateFinanceView } from '@/components/views/CorporateFinanceView';
import { RiskConcentrationsView } from '@/components/views/RiskConcentrationsView';
import { RiskOutlookView } from '@/components/views/RiskOutlookView';
import { AIQueryPanel } from '@/components/ai/AIQueryPanel';
import { TourProvider } from '@/lib/tour-context';
import { CurrencyProvider } from '@/lib/currency-context';
import { DashboardTour } from '@/components/common/DashboardTour';
function DashboardContent() {
  const [activeTab, setActiveTab] = useState(0);
  const [aiOpen, setAiOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [pinOpen, setPinOpen] = useState(false);
  const [scope, setScope] = useState<ScopeSelection>(DEFAULT_SCOPE);

  const handleTabChange = useCallback((tab: number) => {
    setActiveTab(tab);
  }, []);

  const renderView = () => {
    switch (activeTab) {
      case 0: return <GroupOverviewView key="tab-0" scope={scope} onTabChange={handleTabChange} onScopeChange={setScope} />;
      case 1: return <ConsumerFinanceView key="tab-1" scope={scope} />;
      case 2: return <TradeFinanceView key="tab-2" scope={scope} />;
      case 3: return <CorporateFinanceView key="tab-3" scope={scope} />;
      case 4: return <RiskConcentrationsView key="tab-4" scope={scope} />;
      case 5: return <RiskOutlookView key="tab-5" scope={scope} />;
      default: return null;
    }
  };

  return (
    <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <DashboardAppBar
        onToggleAI={() => setAiOpen(!aiOpen)}
        onToggleSettings={() => setSettingsOpen(!settingsOpen)}
        aiOpen={aiOpen}
        activeTab={activeTab}
        scope={scope}
        onScopeChange={setScope}
      />
      <TabBar activeTab={activeTab} onTabChange={handleTabChange} />
      <Box
        id="dashboard-view-content"
        sx={{
          flex: 1,
          overflow: 'auto',
          p: 2.5,
          display: 'flex',
          flexDirection: 'column',
          gap: 2.5,
        }}
      >
        <ErrorBoundary>
          {renderView()}
        </ErrorBoundary>
      </Box>

      <AIQueryPanel
        open={aiOpen}
        onClose={() => setAiOpen(false)}
        scope={scope}
      />

      <RiskAppetiteDrawer
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        onRequestPin={() => setPinOpen(true)}
      />

      <PinDialog
        open={pinOpen}
        onClose={() => setPinOpen(false)}
      />

      <DashboardTour />
    </Box>
  );
}

export default function DashboardPage() {
  return (
    <AdminProvider>
      <TourProvider>
        <CurrencyProvider>
          <DashboardContent />
        </CurrencyProvider>
      </TourProvider>
    </AdminProvider>
  );
}
