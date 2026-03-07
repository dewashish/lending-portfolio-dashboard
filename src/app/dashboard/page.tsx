'use client';

import { useState, useCallback } from 'react';
import { Box } from '@mui/material';
import { DashboardAppBar } from '@/components/shell/DashboardAppBar';
import { TabBar } from '@/components/shell/TabBar';
import { ScopeBar } from '@/components/shell/ScopeBar';
import type { ScopeSelection } from '@/lib/types';
import { DEFAULT_SCOPE } from '@/lib/constants';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';

import { GroupOverviewView } from '@/components/views/GroupOverviewView';
import { ConsumerFinanceView } from '@/components/views/ConsumerFinanceView';
import { TradeFinanceView } from '@/components/views/TradeFinanceView';
import { CorporateFinanceView } from '@/components/views/CorporateFinanceView';
import { RiskConcentrationsView } from '@/components/views/RiskConcentrationsView';
import { AIQueryPanel } from '@/components/ai/AIQueryPanel';

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState(0);
  const [aiOpen, setAiOpen] = useState(false);
  const [scope, setScope] = useState<ScopeSelection>(DEFAULT_SCOPE);

  const handleExportPDF = useCallback(async () => {
    const el = document.getElementById('dashboard-view-content');
    if (!el) return;
    const html2canvas = (await import('html2canvas')).default;
    const jsPDF = (await import('jspdf')).default;
    const canvas = await html2canvas(el, { scale: 2, backgroundColor: '#0a0f1a', useCORS: true });
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF({ orientation: 'landscape', unit: 'px', format: [canvas.width / 2, canvas.height / 2] });
    pdf.addImage(imgData, 'PNG', 0, 0, canvas.width / 2, canvas.height / 2);
    pdf.save('portfolio-report.pdf');
  }, []);

  const renderView = () => {
    switch (activeTab) {
      case 0: return <GroupOverviewView key="tab-0" scope={scope} />;
      case 1: return <ConsumerFinanceView key="tab-1" scope={scope} />;
      case 2: return <TradeFinanceView key="tab-2" scope={scope} />;
      case 3: return <CorporateFinanceView key="tab-3" scope={scope} />;
      case 4: return <RiskConcentrationsView key="tab-4" scope={scope} />;
      default: return null;
    }
  };

  return (
    <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <DashboardAppBar
        onToggleAI={() => setAiOpen(!aiOpen)}
        onExportPDF={handleExportPDF}
        aiOpen={aiOpen}
        activeTab={activeTab}
        scope={scope}
      />
      <TabBar activeTab={activeTab} onTabChange={setActiveTab} />
      <ScopeBar scope={scope} onChange={setScope} />
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
        portfolio={null}
      />
    </Box>
  );
}
