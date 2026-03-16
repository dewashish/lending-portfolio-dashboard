'use client';

import dynamic from 'next/dynamic';
import { useCallback, useMemo } from 'react';
import { useThemeMode } from '@/lib/theme-context';
import { useTour } from '@/lib/tour-context';
import type { CallBackProps, Step, Styles } from 'react-joyride';

const Joyride = dynamic(() => import('react-joyride'), { ssr: false });

const ALL_STEPS: Step[] = [
  {
    target: 'body',
    content: 'Welcome to Avaloura Portfolio Monitor! Let\u2019s take a quick tour of the key features.',
    placement: 'center',
    disableBeacon: true,
    title: 'Welcome',
  },
  {
    target: '#tour-scope-selector',
    content: 'Switch between Group, Region, or Subsidiary views. The entire dashboard adapts to your selection.',
    disableBeacon: true,
    title: 'Scope Selector',
  },
  {
    target: '#tour-breach-ticker',
    content: 'This ticker shows real-time risk appetite breaches. Click to see detailed alerts across all business lines.',
    disableBeacon: true,
    title: 'Breach Alerts',
  },
  {
    target: '#tour-export-area',
    content: 'Export Portfolio Quality Reports (Excel) or generate AI-powered Executive Summaries (PDF) with macro outlook, KPI snapshots, trends, and recommendations. You can download or email the report.',
    disableBeacon: true,
    title: 'Export Reports',
  },
  {
    target: '#tour-sql-query',
    content: 'Open the Supabase SQL editor in a new tab to run ad-hoc queries directly against the database.',
    disableBeacon: true,
    title: 'SQL Query Editor',
  },
  {
    target: '#tour-currency-toggle',
    content: 'Toggle between US Dollar ($) and UAE Dirham (AED) display. All monetary values across the dashboard convert instantly.',
    disableBeacon: true,
    title: 'Currency Toggle',
  },
  {
    target: '#tour-theme-toggle',
    content: 'Switch between dark and light mode.',
    disableBeacon: true,
    title: 'Theme Toggle',
  },
  {
    target: '#tour-settings-button',
    content: 'Configure risk appetite thresholds for each metric, business line, and subsidiary.',
    disableBeacon: true,
    title: 'Risk Appetite Settings',
  },
  {
    target: '#tour-ai-button',
    content: 'Ask the AI analyst questions about your portfolio. It has access to all your data in real-time.',
    disableBeacon: true,
    title: 'AI Query',
  },
  {
    target: '#tour-profile-avatar',
    content: 'Access your profile, documentation, and restart this tour anytime.',
    disableBeacon: true,
    title: 'Profile Menu',
  },
  {
    target: '#tour-tab-bar',
    content: 'Navigate between Group Overview, Consumer Finance, Trade Finance, Corporate Finance, Risk & Concentrations, and Forward Outlook.',
    disableBeacon: true,
    title: 'Navigation Tabs',
  },
  {
    target: '#dashboard-view-content',
    content: 'This is your main workspace. Charts, tables, and KPIs update based on your scope and tab selection. Click on charts and heatmap cells to drill down.',
    disableBeacon: true,
    title: 'Dashboard Content',
  },
  {
    target: '#tour-risk-outlook',
    content: 'The Forward Outlook tab uses a four-layer framework: Portfolio Health (CRO snapshot), Stress Heatmap (subsidiary RAG scoring), Scenario Engine (ECL, stress testing, PD migration, vintage analysis), Early Warning & Actions (EWS signals + management playbook), and Methodology & Assumptions (detailed documentation of all models, inputs, and limitations).',
    disableBeacon: true,
    title: 'Forward Outlook',
  },
  {
    target: 'body',
    content: 'You\u2019re all set! Explore your portfolio data. You can restart this tour anytime from the profile menu.',
    placement: 'center',
    disableBeacon: true,
    title: 'Tour Complete',
  },
];

export function DashboardTour() {
  const { isTourRunning, completeTour } = useTour();
  const { mode } = useThemeMode();

  const isDark = mode === 'dark';

  const steps = useMemo(() => {
    if (!isTourRunning) return ALL_STEPS;
    return ALL_STEPS.filter((step) => {
      if (step.target === '#tour-breach-ticker') {
        const el = document.getElementById('tour-breach-ticker');
        return el && el.offsetHeight > 0 && el.children.length > 0;
      }
      return true;
    });
  }, [isTourRunning]);

  const styles: Partial<Styles> = useMemo(() => ({
    options: {
      arrowColor: isDark ? '#1e293b' : '#ffffff',
      backgroundColor: isDark ? '#1e293b' : '#ffffff',
      overlayColor: 'rgba(0, 0, 0, 0.6)',
      primaryColor: '#00897b',
      textColor: isDark ? '#e2e8f0' : '#1e293b',
      zIndex: 1400,
    },
    tooltip: {
      borderRadius: 12,
      fontSize: '0.875rem',
      fontFamily: '"DM Sans", "Inter", "Helvetica Neue", sans-serif',
      padding: '20px 24px',
      border: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(0,0,0,0.08)',
      boxShadow: isDark ? '0 8px 32px rgba(0,0,0,0.4)' : '0 8px 32px rgba(0,0,0,0.12)',
    },
    tooltipTitle: {
      fontSize: '1rem',
      fontWeight: 700,
      marginBottom: 8,
    },
    tooltipContent: {
      fontSize: '0.85rem',
      lineHeight: 1.6,
      color: isDark ? '#94a3b8' : '#64748b',
    },
    buttonNext: {
      borderRadius: 8,
      fontSize: '0.8rem',
      fontWeight: 600,
      padding: '6px 16px',
      backgroundColor: '#00897b',
    },
    buttonBack: {
      borderRadius: 8,
      fontSize: '0.8rem',
      fontWeight: 600,
      color: isDark ? '#94a3b8' : '#64748b',
      marginRight: 8,
    },
    buttonSkip: {
      fontSize: '0.75rem',
      color: isDark ? '#64748b' : '#94a3b8',
    },
    spotlight: {
      borderRadius: 12,
    },
  }), [isDark]);

  const handleCallback = useCallback((data: CallBackProps) => {
    const { status } = data;
    if (status === 'finished' || status === 'skipped') {
      completeTour();
    }
  }, [completeTour]);

  if (!isTourRunning) return null;

  return (
    <Joyride
      steps={steps}
      run={isTourRunning}
      continuous
      showSkipButton
      showProgress
      scrollToFirstStep
      disableOverlayClose
      callback={handleCallback}
      styles={styles}
      locale={{
        back: 'Back',
        close: 'Close',
        last: 'Done',
        next: 'Next',
        skip: 'Skip Tour',
      }}
      floaterProps={{
        disableAnimation: false,
        styles: {
          floater: { filter: 'none' },
        },
      }}
    />
  );
}
