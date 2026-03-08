'use client';

import { Typography, Card, Grid, Chip, Box, List, ListItem, ListItemText } from '@mui/material';
import { PRDSection } from '@/components/docs/PRDSection';

const PERSONAS = [
  {
    role: 'Group CRO',
    color: '#7c3aed',
    tagline: 'Board-Level Risk Oversight',
    responsibilities: [
      'Oversees credit risk across all subsidiaries and business lines',
      'Presents portfolio health to the Board Risk Committee',
      'Sets group-wide risk appetite thresholds',
      'Monitors macro-prudential risks (FX, country, concentration)',
    ],
    primaryTabs: 'Group Overview, Risk & Concentrations',
    scope: 'Group level — all subsidiaries',
    keyNeed: 'A single consolidated view with breach alerts and drill-down capability to any subsidiary or business line.',
  },
  {
    role: 'Subsidiary CRO',
    color: '#0284c7',
    tagline: 'Entity-Level Portfolio Management',
    responsibilities: [
      'Manages credit risk for a specific subsidiary',
      'Reviews delinquency trends and vintage performance',
      'Tracks EWS alerts and watchlist accounts',
      'Coordinates collection strategies with operations',
    ],
    primaryTabs: 'Consumer Finance, Trade Finance, Corporate Finance',
    scope: 'Subsidiary level — single entity',
    keyNeed: 'Detailed subsidiary-specific analytics with product-level breakdowns and period comparisons.',
  },
  {
    role: 'Product Analyst',
    color: '#059669',
    tagline: 'Origination & Product Performance',
    responsibilities: [
      'Monitors loan origination funnel conversion rates',
      'Tracks product-level delinquency and non-starter rates',
      'Analyzes vintage curves and DPD bucket distributions',
      'Prepares monthly product performance reports',
    ],
    primaryTabs: 'Consumer Finance (Origination, Products, Vintage)',
    scope: 'Product level — specific loan products',
    keyNeed: 'Granular product-level metrics with period filters and funnel analytics for origination optimization.',
  },
  {
    role: 'Risk Analyst',
    color: '#d97706',
    tagline: 'EWS Monitoring & Concentration Analysis',
    responsibilities: [
      'Monitors Early Warning System (EWS) scores and triggers',
      'Analyzes obligor, sector, and country concentrations',
      'Tracks FX exposure and country risk indicators',
      'Reviews stage migration and roll rate patterns',
    ],
    primaryTabs: 'Risk & Concentrations, Trade Finance (EWS & Migration)',
    scope: 'Group level — cross-entity risk analysis',
    keyNeed: 'Real-time EWS radar with drill-down to facility-level alerts, concentration treemaps, and macro risk dashboards.',
  },
];

export function TargetUsers() {
  return (
    <PRDSection id="target-users" title="Target Users & Personas" sectionNumber={3}>
      <Typography variant="body2" sx={{ mb: 3, lineHeight: 1.8 }}>
        The platform serves four primary user personas within a financial holding company&apos;s risk
        management function. Each persona has distinct workflows, scope requirements, and data
        consumption patterns.
      </Typography>

      <Grid container spacing={2.5}>
        {PERSONAS.map((p) => (
          <Grid item xs={12} md={6} key={p.role}>
            <Card sx={{ p: 2.5, height: '100%', display: 'flex', flexDirection: 'column' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
                <Box
                  sx={{
                    width: 40,
                    height: 40,
                    borderRadius: '50%',
                    bgcolor: p.color,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#fff',
                    fontWeight: 700,
                    fontSize: '0.8rem',
                  }}
                >
                  {p.role.split(' ').map(w => w[0]).join('')}
                </Box>
                <Box>
                  <Typography sx={{ fontWeight: 700, fontSize: '0.9rem' }}>{p.role}</Typography>
                  <Typography sx={{ fontSize: '0.72rem', color: 'text.secondary' }}>{p.tagline}</Typography>
                </Box>
              </Box>

              <List dense disablePadding sx={{ mb: 1.5 }}>
                {p.responsibilities.map((r, i) => (
                  <ListItem key={i} sx={{ px: 0, py: 0.25 }}>
                    <ListItemText
                      primary={
                        <Typography variant="body2" sx={{ fontSize: '0.78rem', lineHeight: 1.5 }}>
                          &bull; {r}
                        </Typography>
                      }
                    />
                  </ListItem>
                ))}
              </List>

              <Box sx={{ mt: 'auto', pt: 1.5, borderTop: 1, borderColor: 'divider' }}>
                <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mb: 0.75 }}>
                  <Chip label={p.scope} size="small" sx={{ bgcolor: p.color, color: '#fff', fontSize: '0.65rem' }} />
                </Box>
                <Typography sx={{ fontSize: '0.7rem', color: 'text.secondary' }}>
                  <strong>Primary tabs:</strong> {p.primaryTabs}
                </Typography>
                <Typography sx={{ fontSize: '0.7rem', color: 'text.secondary', mt: 0.5 }}>
                  <strong>Key need:</strong> {p.keyNeed}
                </Typography>
              </Box>
            </Card>
          </Grid>
        ))}
      </Grid>
    </PRDSection>
  );
}
