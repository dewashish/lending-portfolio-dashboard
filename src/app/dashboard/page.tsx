'use client';

import { useState, useCallback } from 'react';
import { Box } from '@mui/material';
import { DashboardAppBar } from '@/components/shell/DashboardAppBar';
import { TabBar } from '@/components/shell/TabBar';
import { FilterBar } from '@/components/shell/FilterBar';
import { usePortfolioData, useDataLoader } from '@/hooks/usePortfolioData';
import { useFilters } from '@/hooks/useFilters';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { KPIRowSkeleton, ChartSkeleton } from '@/components/common/LoadingSkeleton';
import { EmptyState } from '@/components/common/EmptyState';

import { GroupOverviewView } from '@/components/views/GroupOverviewView';
import { TradeFinanceView } from '@/components/views/TradeFinanceView';
import { ConsumerFinanceView } from '@/components/views/ConsumerFinanceView';
import { CorporateFinanceView } from '@/components/views/CorporateFinanceView';
import { EarlyWarningView } from '@/components/views/EarlyWarningView';
import { ConcentrationsView } from '@/components/views/ConcentrationsView';
import { AIQueryPanel } from '@/components/ai/AIQueryPanel';

export default function DashboardPage() {
  const { portfolio, isLoading, refresh } = usePortfolioData();
  const { reload } = useDataLoader();
  const { filters, setFilters, resetFilters, hasActiveFilters } = useFilters();
  const [activeTab, setActiveTab] = useState(0);
  const [aiOpen, setAiOpen] = useState(false);

  const handleReload = useCallback(async () => {
    await reload(true);
    refresh();
  }, [reload, refresh]);

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

  if (isLoading) {
    return (
      <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
        <DashboardAppBar datasetInfo={null} onToggleAI={() => {}} onReload={() => {}} onExportPDF={() => {}} aiOpen={false} />
        <TabBar activeTab={0} onTabChange={() => {}} />
        <Box sx={{ p: 3, display: 'flex', flexDirection: 'column', gap: 2 }}>
          <KPIRowSkeleton />
          <ChartSkeleton height={400} />
        </Box>
      </Box>
    );
  }

  const renderView = () => {
    if (!portfolio || !portfolio.datasetInfo?.files?.length) {
      return <EmptyState message="No data loaded. Place Excel files in the data/ folder and click Reload." />;
    }

    switch (activeTab) {
      case 0: return <GroupOverviewView portfolio={portfolio} filters={filters} />;
      case 1: return <TradeFinanceView portfolio={portfolio} filters={filters} />;
      case 2: return <ConsumerFinanceView portfolio={portfolio} filters={filters} />;
      case 3: return <CorporateFinanceView portfolio={portfolio} filters={filters} />;
      case 4: return <EarlyWarningView portfolio={portfolio} filters={filters} />;
      case 5: return <ConcentrationsView portfolio={portfolio} filters={filters} />;
      default: return null;
    }
  };

  return (
    <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <DashboardAppBar
        datasetInfo={portfolio?.datasetInfo ?? null}
        onToggleAI={() => setAiOpen(!aiOpen)}
        onReload={handleReload}
        onExportPDF={handleExportPDF}
        aiOpen={aiOpen}
        activeTab={activeTab}
      />
      <TabBar activeTab={activeTab} onTabChange={setActiveTab} />
      <FilterBar
        filters={filters}
        onChange={setFilters}
        onReset={resetFilters}
        hasActiveFilters={hasActiveFilters}
        portfolio={portfolio}
      />
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
        portfolio={portfolio}
      />
    </Box>
  );
}
