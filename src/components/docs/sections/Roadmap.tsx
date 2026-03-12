'use client';

import { Typography, Box, Card, Chip, Grid, List, ListItem, ListItemIcon, ListItemText } from '@mui/material';
import { PRDSection } from '@/components/docs/PRDSection';

const PHASES = [
  {
    phase: 'v0.1 — Foundation',
    status: 'Completed',
    color: '#4caf50',
    items: [
      'Core dashboard shell with MUI v5 theming (dark/light)',
      'Consumer Finance tab with 9 sub-tabs',
      'DPD bucket distribution, roll rate heatmaps, vintage curves',
      'LOS origination funnel and daily disbursement trends',
      'Supabase backend with seed data generation',
      'SWR data fetching layer with 50+ hooks',
    ],
  },
  {
    phase: 'v0.2 — Multi-Geography & Trade',
    status: 'Completed',
    color: '#4caf50',
    items: [
      'Multi-geography scope model (Group/Region/Subsidiary)',
      '5 subsidiaries across 2 regions with currency support',
      'Trade Finance tab with 6 sub-tabs',
      'Concentration treemaps (obligor + sector)',
      'EWS radar chart and facility-level alerts',
      'Stage migration and DPD roll rate analysis',
    ],
  },
  {
    phase: 'v0.3 — Group CRO & Risk Governance',
    status: 'Completed',
    color: '#4caf50',
    items: [
      'Group CRO Overview with consolidated scorecard',
      'Portfolio composition (BusinessLine donut, Subsidiary AUM bar, IFRS staging)',
      '7-dimension subsidiary risk heatmap with drill-down',
      'Corporate Finance tab with 9 sub-tabs',
      'Hierarchical Risk Appetite Framework (5 levels, 25 metrics)',
      'Real-time breach alerting (ticker, popover, panel)',
      'PDF Executive Summary + Excel PQR exports',
      'AI query assistant (Gemini integration)',
      'Interactive onboarding tour (12 steps)',
      'Role-based access control with PIN-protected admin',
      'Multi-currency toggle (USD/AED)',
      'Origination funnel with period comparison filter',
      'Risk Outlook tab (ECL, stress testing, PD migration, vintage, macro EWS, methodology)',
    ],
  },
  {
    phase: 'v0.4 — Forward Outlook & Corporate Finance Redesign',
    status: 'Completed',
    color: '#4caf50',
    items: [
      'Forward Outlook tab: simplified single-page forward-looking risk view',
      'ECL forecast, provision coverage trend, delinquency forecast, scenario impact table',
      'Corporate Finance: Industry redesign with bar chart, period filters, drill-down',
      'Corporate Finance: Collateral & LTV with maturity, tooltips, Sanctioned/Disbursed/POS',
      'Corporate Finance: Covenants redesign with D3 donuts, 14-column detail table, filters',
      'Documentation overhaul: renamed, updated feature inventory, roadmap alignment',
      'Limit utilization: Sanction Limit & Disbursement Limit with POS/SL% and POS/DL% analysis',
      'Collateral & Maturity: 3-basis distribution tabs (POS/Sanctioned/Disbursed) with Group-scope aggregation',
      'Disbursement Flow: utilization rows with fund-based/non-fund-based breakdown',
    ],
  },
  {
    phase: 'v0.5 — Data Pipeline & Automation (Planned)',
    status: 'Planned',
    color: '#2196f3',
    items: [
      'Automated data pipeline connectors (LOS/LMS/Collections)',
      'Scheduled data refresh with last-updated timestamps',
      'Email/Slack breach notifications',
      'Historical trend analysis with configurable lookback periods',
      'Custom date range selectors across all tabs',
    ],
  },
  {
    phase: 'v0.6 — Advanced Analytics (Planned)',
    status: 'Planned',
    color: '#9c27b0',
    items: [
      'Predictive delinquency modeling (ML-based)',
      'Portfolio optimization recommendations',
      'Audit trail for risk appetite changes',
      'Regulatory reporting templates (IFRS 9, Basel III)',
    ],
  },
  {
    phase: 'v1.0 — Enterprise Scale (Vision)',
    status: 'Vision',
    color: '#607d8b',
    items: [
      'Multi-tenant architecture for holding company clients',
      'Mobile application (React Native)',
      'White-label customization capability',
      'Real-time WebSocket data streaming',
      'API marketplace for third-party integrations',
    ],
  },
];

export function Roadmap() {
  return (
    <PRDSection id="roadmap" title="Roadmap" sectionNumber={15}>
      <Typography variant="body2" sx={{ mb: 2.5, lineHeight: 1.8 }}>
        The platform follows semantic versioning (X.Y.Z) with incremental releases. The roadmap
        below outlines completed milestones and planned future capabilities organized by release theme.
      </Typography>

      <Grid container spacing={2}>
        {PHASES.map((p) => (
          <Grid item xs={12} md={6} key={p.phase}>
            <Card sx={{ p: 2.5, height: '100%', borderTop: 3, borderColor: p.color }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                <Typography sx={{ fontWeight: 700, fontSize: '0.9rem', flex: 1 }}>{p.phase}</Typography>
                <Chip
                  label={p.status}
                  size="small"
                  sx={{
                    bgcolor: p.color,
                    color: '#fff',
                    fontWeight: 700,
                    fontSize: '0.65rem',
                  }}
                />
              </Box>
              <List dense disablePadding>
                {p.items.map((item) => (
                  <ListItem key={item} sx={{ px: 0, py: 0.25 }}>
                    <ListItemIcon sx={{ minWidth: 20 }}>
                      <Typography sx={{ fontSize: '0.7rem', color: p.color }}>
                        {p.status === 'Completed' ? '\u2713' : '\u25CB'}
                      </Typography>
                    </ListItemIcon>
                    <ListItemText
                      primary={
                        <Typography variant="body2" sx={{ fontSize: '0.78rem', lineHeight: 1.5 }}>
                          {item}
                        </Typography>
                      }
                    />
                  </ListItem>
                ))}
              </List>
            </Card>
          </Grid>
        ))}
      </Grid>
    </PRDSection>
  );
}
