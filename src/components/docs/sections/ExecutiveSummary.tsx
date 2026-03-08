'use client';

import { Box, Typography, Card, Grid } from '@mui/material';
import { PRDSection } from '@/components/docs/PRDSection';
import { APP_VERSION } from '@/lib/version';

const STATS = [
  { label: 'Business Tabs', value: '5' },
  { label: 'Risk Metrics', value: '34' },
  { label: 'Database Tables', value: '75+' },
  { label: 'Subsidiaries', value: '5' },
  { label: 'Chart Types', value: '40+' },
];

export function ExecutiveSummary() {
  return (
    <PRDSection id="executive-summary" title="Executive Summary" sectionNumber={1}>
      <Typography variant="body2" sx={{ mb: 2, lineHeight: 1.8 }}>
        <strong>Avaloura Portfolio Monitor</strong> (v{APP_VERSION}) is an enterprise-grade lending portfolio risk
        management platform designed for multi-geography financial institutions. It provides a unified,
        real-time view of credit risk across consumer finance, trade finance, and corporate finance
        portfolios — enabling Group Chief Risk Officers and their teams to monitor, analyze, and act on
        portfolio health from a single pane of glass.
      </Typography>

      <Typography variant="body2" sx={{ mb: 2, lineHeight: 1.8 }}>
        The platform consolidates data from Loan Origination Systems (LOS), Loan Management Systems (LMS),
        collections engines, and external risk feeds into a comprehensive dashboard with 40+ interactive
        D3.js visualizations, hierarchical risk appetite governance, Early Warning System (EWS) monitoring,
        and automated Portfolio Quality Report (PQR) generation. It serves financial holding companies
        operating across multiple regions with diverse subsidiary structures and regulatory environments.
      </Typography>

      <Typography variant="body2" sx={{ mb: 3, lineHeight: 1.8 }}>
        Built with institutional-grade security, role-based access control, and multi-currency support,
        the platform transforms fragmented spreadsheet-based risk reporting into a cohesive, interactive,
        and auditable risk management experience.
      </Typography>

      <Grid container spacing={2}>
        {STATS.map((s) => (
          <Grid item xs={6} sm={4} md key={s.label}>
            <Card
              sx={{
                p: 2,
                textAlign: 'center',
                background: (theme) =>
                  theme.palette.mode === 'dark'
                    ? 'linear-gradient(135deg, rgba(0,137,123,0.12) 0%, rgba(0,77,64,0.12) 100%)'
                    : 'linear-gradient(135deg, rgba(0,137,123,0.06) 0%, rgba(0,77,64,0.06) 100%)',
              }}
            >
              <Typography sx={{ fontFamily: '"IBM Plex Mono", monospace', fontWeight: 700, fontSize: '1.5rem', color: 'primary.main' }}>
                {s.value}
              </Typography>
              <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, fontSize: '0.68rem' }}>
                {s.label}
              </Typography>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Box sx={{ mt: 3, p: 2, borderLeft: 3, borderColor: 'primary.main', bgcolor: 'action.hover', borderRadius: 1 }}>
        <Typography variant="body2" sx={{ fontStyle: 'italic', color: 'text.secondary', lineHeight: 1.7 }}>
          &ldquo;One platform to monitor the entire lending book — from origination funnels to vintage
          curves, from EWS alerts to board-ready PQR reports — across every subsidiary, every business
          line, every product.&rdquo;
        </Typography>
      </Box>
    </PRDSection>
  );
}
