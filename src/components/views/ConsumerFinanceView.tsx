'use client';

import { useState, useMemo } from 'react';
import { Box, Tabs, Tab, Card, Stack, Typography, Tooltip } from '@mui/material';
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
import { formatPercent } from '@/lib/format';
import type { ScopeSelection, ConsumerMetricRow } from '@/lib/types';

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
  scope?: ScopeSelection;
}

/* ── Portfolio Health Banner ────────────────────────────────────── */

interface HealthItem {
  label: string;
  rag: 'green' | 'amber' | 'red';
  tooltip: string;
}

function getLatest(data: ConsumerMetricRow[], name: string): number | null {
  const row = data.find((d) => d.metric === name);
  if (!row) return null;
  const keys = Object.keys(row.values).sort();
  const v = keys.length > 0 ? row.values[keys[keys.length - 1]] : null;
  return typeof v === 'number' ? v : null;
}

const RAG_COLORS = { green: '#66bb6a', amber: '#ffa726', red: '#ef5350' };
const RAG_LABELS = { green: 'On Track', amber: 'Watch', red: 'Alert' };

function PortfolioHealthBanner({ items }: { items: HealthItem[] }) {
  const redCount = items.filter((i) => i.rag === 'red').length;
  const amberCount = items.filter((i) => i.rag === 'amber').length;

  const overallRag: 'green' | 'amber' | 'red' = redCount >= 2 ? 'red' : (redCount >= 1 || amberCount >= 2) ? 'amber' : 'green';

  return (
    <Card
      sx={{
        p: 1,
        borderLeft: `4px solid ${RAG_COLORS[overallRag]}`,
        bgcolor: `${RAG_COLORS[overallRag]}08`,
      }}
    >
      <Stack direction="row" alignItems="center" spacing={2}>
        <Stack direction="row" alignItems="center" spacing={0.75}>
          <Box
            sx={{
              width: 10,
              height: 10,
              borderRadius: '50%',
              bgcolor: RAG_COLORS[overallRag],
              boxShadow: `0 0 6px ${RAG_COLORS[overallRag]}80`,
            }}
          />
          <Typography variant="caption" sx={{ fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Portfolio Health: {RAG_LABELS[overallRag]}
          </Typography>
        </Stack>

        <Stack direction="row" spacing={0.75} sx={{ ml: 'auto' }}>
          {items.map((item) => (
            <Tooltip key={item.label} title={item.tooltip} arrow placement="top">
              <Box
                sx={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 0.4,
                  bgcolor: `${RAG_COLORS[item.rag]}14`,
                  borderRadius: 1,
                  px: 0.75,
                  py: 0.3,
                  cursor: 'default',
                }}
              >
                <Box
                  sx={{
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    bgcolor: RAG_COLORS[item.rag],
                  }}
                />
                <Typography
                  variant="caption"
                  sx={{ fontSize: '0.6rem', fontWeight: 600, color: RAG_COLORS[item.rag] }}
                >
                  {item.label}
                </Typography>
              </Box>
            </Tooltip>
          ))}
        </Stack>
      </Stack>
    </Card>
  );
}

function computeHealthItems(data: ConsumerMetricRow[]): HealthItem[] {
  const items: HealthItem[] = [];

  const defs: { name: string; label: string; thresholds: [number, number] }[] = [
    { name: 'FPD%', label: 'FPD', thresholds: [0.03, 0.035] },
    { name: '30+ Amt%', label: '30+ DPD', thresholds: [0.05, 0.06] },
    { name: '90+ Amt%', label: '90+ DPD', thresholds: [0.015, 0.02] },
    { name: 'Net Credit Loss', label: 'NCL', thresholds: [0.01, 0.015] },
  ];

  defs.forEach(({ name, label, thresholds }) => {
    const val = getLatest(data, name);
    if (val == null) return;
    const rag: 'green' | 'amber' | 'red' = val <= thresholds[0] ? 'green' : val <= thresholds[1] ? 'amber' : 'red';
    items.push({
      label,
      rag,
      tooltip: `${label}: ${formatPercent(val)} (threshold: ${formatPercent(thresholds[1])})`,
    });
  });

  return items;
}

/* ── Main Component ─────────────────────────────────────────────── */

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function ConsumerFinanceView({ scope }: Props) {
  const [subTab, setSubTab] = useState(0);
  const { data: overallData } = useConsumerOverall(scope);

  const healthItems = useMemo(() => computeHealthItems(overallData ?? []), [overallData]);

  const renderSection = () => {
    switch (subTab) {
      case 0: return <ConsumerOverviewSection key="sub-0" scope={scope} />;
      case 1: return <ConsumerOriginationSection key="sub-1" scope={scope} />;
      case 2: return <ConsumerProductSection key="sub-2" scope={scope} />;
      case 3: return <ConsumerDelinquencySection key="sub-3" scope={scope} />;
      case 4: return <ConsumerCollectionsSection key="sub-4" scope={scope} />;
      case 5: return <ConsumerVintageSection key="sub-5" scope={scope} />;
      case 6: return <ConsumerNonStarterSection key="sub-6" scope={scope} />;
      case 7: return <ConsumerRiskAnalyticsSection key="sub-7" scope={scope} />;
      case 8: return <ConsumerTDDSection key="sub-8" scope={scope} />;
      default: return null;
    }
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {healthItems.length > 0 && <PortfolioHealthBanner items={healthItems} />}

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
