'use client';

import { Typography, Box, Card, Grid, Chip, Stack } from '@mui/material';
import { PRDSection } from '@/components/docs/PRDSection';
import { DiagramBox } from '@/components/docs/DiagramBox';

const TABS = [
  { name: 'Group CRO Overview', subTabs: 6, color: '#00897b', desc: 'Consolidated scorecard, portfolio composition, risk heatmap, breach alerts, trend grids' },
  { name: 'Consumer Finance', subTabs: 9, color: '#2196f3', desc: 'Origination funnel, DPD analysis, vintage curves, roll rates, collections, TDD' },
  { name: 'Trade Finance', subTabs: 6, color: '#9c27b0', desc: 'Facility analytics, product mix, concentrations, watchlist, EWS, macro risk' },
  { name: 'Corporate Finance', subTabs: 9, color: '#ff9800', desc: 'Portfolio metrics, industry concentration, collateral, covenants, rating analysis' },
  { name: 'Risk & Concentrations', subTabs: 4, color: '#f44336', desc: 'EWS radar, obligor/sector treemaps, FX risk, country risk' },
  { name: 'Forward Outlook', subTabs: 3, color: '#009688', desc: 'ECL forecast, provision coverage trend, delinquency forecast, scenario impact analysis, methodology' },
];

export function ProductOverview() {
  return (
    <PRDSection id="product-overview" title="Product Overview" sectionNumber={5}>
      <Typography variant="body2" sx={{ mb: 2, lineHeight: 1.8 }}>
        Avaloura Portfolio Monitor is a web-based risk management platform that aggregates portfolio
        data from multiple source systems into a unified analytics layer. The architecture follows a
        modern client-server pattern with real-time data synchronization.
      </Typography>

      <DiagramBox title="System Architecture">
{`  ┌─────────────────────────────────────────────────────────────────┐
  │                        CLIENT TIER                              │
  │  ┌───────────┐  ┌──────────────┐  ┌───────────┐  ┌──────────┐ │
  │  │  MUI v5   │  │   D3.js v7   │  │ TanStack  │  │ React    │ │
  │  │ Components │  │   Charts     │  │ Table v8  │  │ Joyride  │ │
  │  └─────┬─────┘  └──────┬───────┘  └─────┬─────┘  └────┬─────┘ │
  │        └────────┬───────┴────────────────┘             │       │
  │           ┌─────┴──────┐                               │       │
  │           │  Next.js   │  App Router + Client Comps    │       │
  │           │    14      │  ◄────────────────────────────┘       │
  │           └─────┬──────┘                                       │
  ├─────────────────┼─────────────────────────────────────────────┤
  │                 │           DATA LAYER                         │
  │           ┌─────┴──────┐                                       │
  │           │    SWR     │  Stale-While-Revalidate caching       │
  │           │  50+ hooks │  with scope-aware cache keys          │
  │           └─────┬──────┘                                       │
  ├─────────────────┼─────────────────────────────────────────────┤
  │                 │           BACKEND                             │
  │           ┌─────┴──────┐  ┌──────────────┐  ┌──────────────┐  │
  │           │  Supabase  │  │  Gemini AI   │  │   ExcelJS    │  │
  │           │ PostgreSQL │  │  Assistant   │  │   + jsPDF    │  │
  │           └─────┬──────┘  └──────────────┘  └──────────────┘  │
  │                 │                                              │
  │     ┌───────────┴───────────────┐                              │
  │     │  75+ Tables  │  8 Views   │  Row-Level Security          │
  │     └───────────────────────────┘                              │
  └─────────────────────────────────────────────────────────────────┘`}
      </DiagramBox>

      <Typography variant="h6" sx={{ mt: 3, mb: 2, fontSize: '1rem' }}>
        Navigation & Feature Map
      </Typography>

      <Grid container spacing={2}>
        {TABS.map((t) => (
          <Grid item xs={12} sm={6} md={4} key={t.name}>
            <Card sx={{ p: 2, height: '100%', borderTop: 3, borderColor: t.color }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                <Typography sx={{ fontWeight: 700, fontSize: '0.85rem' }}>{t.name}</Typography>
                <Chip label={`${t.subTabs} views`} size="small" sx={{ bgcolor: t.color, color: '#fff', fontSize: '0.65rem', fontWeight: 600 }} />
              </Stack>
              <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: '0.78rem', lineHeight: 1.6 }}>
                {t.desc}
              </Typography>
            </Card>
          </Grid>
        ))}
      </Grid>

      <DiagramBox title="Multi-Geography Scope Model">
{`  ┌──────────────────────────────────────────────────────────────┐
  │                          GROUP                               │
  │     All subsidiaries aggregated — Group CRO perspective      │
  │                                                              │
  │    ┌─────────────────────┐    ┌─────────────────────┐        │
  │    │      REGION         │    │      REGION         │        │
  │    │   e.g., MENA        │    │   e.g., LatAm       │        │
  │    │                     │    │                     │        │
  │    │  ┌────┐ ┌────┐     │    │  ┌────┐ ┌────┐     │        │
  │    │  │ AE │ │ EG │     │    │  │ CO │ │ US │     │        │
  │    │  └────┘ └────┘     │    │  └────┘ └────┘     │        │
  │    └─────────────────────┘    └─────────────────────┘        │
  │                                        ┌────┐               │
  │                                        │ NG │               │
  │                                        └────┘               │
  │                                     (Americas)              │
  └──────────────────────────────────────────────────────────────┘

  Scope Selection: [ Group ◉ ] [ Region ○ ] [ Subsidiary ○ ]

  Each level filters ALL tabs, charts, tables, and exports.`}
      </DiagramBox>

      <Box sx={{ mt: 3 }}>
        <Typography variant="h6" sx={{ fontSize: '1rem', mb: 1 }}>Cross-Cutting Capabilities</Typography>
        <Grid container spacing={1.5}>
          {[
            'Hierarchical Risk Appetite (5 levels)',
            'Real-Time Breach Alerts (ticker + popover)',
            'Multi-Currency Toggle (USD / AED)',
            'Dark / Light Theme',
            'PDF Executive Summary Export',
            'Excel PQR Report Export',
            'AI-Powered Query Assistant',
            'Interactive Onboarding Tour (12 steps)',
            'Role-Based Access Control (4 roles)',
            'PIN-Protected Admin Settings',
          ].map((cap) => (
            <Grid item xs={12} sm={6} md={4} key={cap}>
              <Chip
                label={cap}
                variant="outlined"
                size="small"
                sx={{ width: '100%', justifyContent: 'flex-start', fontSize: '0.72rem', fontWeight: 500 }}
              />
            </Grid>
          ))}
        </Grid>
      </Box>
    </PRDSection>
  );
}
