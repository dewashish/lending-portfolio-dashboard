'use client';

import { Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Chip, Box, Grid, Card } from '@mui/material';
import { PRDSection } from '@/components/docs/PRDSection';
import { DiagramBox } from '@/components/docs/DiagramBox';

const RAG_STATUSES = [
  { status: 'Green', color: '#4caf50', meaning: 'Within Appetite', desc: 'Metric value is within the defined risk appetite threshold. No action required.' },
  { status: 'Amber', color: '#ff9800', meaning: 'Appetite Breach', desc: 'Metric value has breached the appetite threshold but remains within tolerance. Monitoring and early intervention recommended.' },
  { status: 'Red', color: '#f44336', meaning: 'Tolerance Breach', desc: 'Metric value has breached the tolerance threshold. Immediate escalation and remedial action required.' },
];

const METRICS = [
  { key: 'fpd_pct', label: 'FPD%', direction: 'Lower', appetite: '3.0%', tolerance: '3.5%', line: 'Consumer', category: 'Delinquency' },
  { key: 'dpd_30_plus', label: '30+ DPD%', direction: 'Lower', appetite: '5.0%', tolerance: '6.0%', line: 'Consumer', category: 'Delinquency' },
  { key: 'dpd_90_plus', label: '90+ DPD%', direction: 'Lower', appetite: '1.5%', tolerance: '2.0%', line: 'Consumer', category: 'Delinquency' },
  { key: 'net_credit_loss', label: 'Net Credit Loss', direction: 'Lower', appetite: '1.0%', tolerance: '1.5%', line: 'Consumer', category: 'Delinquency' },
  { key: 'non_starter_rate', label: 'Non-Starter Rate', direction: 'Lower', appetite: '2.0%', tolerance: '4.0%', line: 'Consumer', category: 'Origination' },
  { key: 'roll_forward_rate', label: 'Roll Forward Rate', direction: 'Lower', appetite: '10.0%', tolerance: '20.0%', line: 'Consumer', category: 'Collections' },
  { key: 'resolution_rate', label: 'Resolution Rate', direction: 'Higher', appetite: '20.0%', tolerance: '10.0%', line: 'Consumer', category: 'Collections' },
  { key: 'approval_rate', label: 'Approval Rate', direction: 'Higher', appetite: '50.0%', tolerance: '35.0%', line: 'Consumer', category: 'Origination' },
  { key: 'los_achievement', label: 'LOS Achievement', direction: 'Higher', appetite: '45.0%', tolerance: '35.0%', line: 'Consumer', category: 'Origination' },
  { key: 'npl_ratio', label: 'NPL Ratio', direction: 'Lower', appetite: '3.0%', tolerance: '5.0%', line: 'Trade', category: 'Asset Quality' },
  { key: 'stage_2_3_pct', label: 'Stage 2+3%', direction: 'Lower', appetite: '7.0%', tolerance: '10.0%', line: 'Trade', category: 'Asset Quality' },
  { key: 'avg_ews_score', label: 'Avg EWS Score', direction: 'Lower', appetite: '1.0', tolerance: '2.0', line: 'Trade', category: 'Early Warning' },
  { key: 'collection_efficiency', label: 'Collection Efficiency', direction: 'Higher', appetite: '90.0%', tolerance: '75.0%', line: 'Trade', category: 'Collections' },
  { key: 'trade_utilization', label: 'Utilization Rate', direction: 'Lower', appetite: '80.0%', tolerance: '90.0%', line: 'Trade', category: 'Utilization' },
  { key: 'trade_collateral_coverage', label: 'Collateral Coverage', direction: 'Higher', appetite: '80.0%', tolerance: '65.0%', line: 'Trade', category: 'Collateral' },
  { key: 'watchlist_exposure_pct', label: 'Watchlist Exposure %', direction: 'Lower', appetite: '5.0%', tolerance: '10.0%', line: 'Trade', category: 'Watchlist' },
  { key: 'trade_overdue_ratio', label: 'Overdue Ratio', direction: 'Lower', appetite: '5.0%', tolerance: '10.0%', line: 'Trade', category: 'Asset Quality' },
  { key: 'downgrade_rate', label: 'Downgrade Rate (S1-S2)', direction: 'Lower', appetite: '5.0%', tolerance: '8.0%', line: 'Trade', category: 'Stage Migration' },
  { key: 'cure_rate', label: 'Cure Rate (S2-S1)', direction: 'Higher', appetite: '30.0%', tolerance: '20.0%', line: 'Trade', category: 'Stage Migration' },
  { key: 'provision_coverage', label: 'Provision Coverage', direction: 'Higher', appetite: '80.0%', tolerance: '60.0%', line: 'Corporate', category: 'Provisioning' },
  { key: 'corp_delinquency_rate', label: 'Delinquency Rate', direction: 'Lower', appetite: '3.0%', tolerance: '5.0%', line: 'Corporate', category: 'Asset Quality' },
  { key: 'corp_npa_rate', label: 'NPA Rate', direction: 'Lower', appetite: '2.0%', tolerance: '4.0%', line: 'Corporate', category: 'Asset Quality' },
  { key: 'corp_security_cover', label: 'Security Cover', direction: 'Higher', appetite: '100.0%', tolerance: '80.0%', line: 'Corporate', category: 'Collateral' },
  { key: 'corp_covenant_breach_rate', label: 'Covenant Breach Rate', direction: 'Lower', appetite: '5.0%', tolerance: '10.0%', line: 'Corporate', category: 'Covenants' },
  { key: 'corp_pcr', label: 'Provision Coverage Ratio', direction: 'Higher', appetite: '80.0%', tolerance: '60.0%', line: 'Corporate', category: 'Provisioning' },
];

const LINE_COLORS: Record<string, string> = {
  Consumer: '#2196f3',
  Trade: '#9c27b0',
  Corporate: '#ff9800',
};

export function RiskAppetiteFramework() {
  return (
    <PRDSection id="risk-appetite" title="Risk Appetite Framework" sectionNumber={8}>
      <Typography variant="body2" sx={{ mb: 2, lineHeight: 1.8 }}>
        The platform implements a hierarchical Risk Appetite Framework (RAF) that enables granular
        threshold configuration at five scope levels. Each risk metric has a defined &ldquo;appetite&rdquo;
        (acceptable) and &ldquo;tolerance&rdquo; (maximum acceptable) threshold, with automatic RAG
        (Red-Amber-Green) status computation and real-time breach alerting.
      </Typography>

      <DiagramBox title="5-Level Threshold Hierarchy (Inheritance Model)">
{`  RESOLUTION ORDER (most specific wins):

  ┌─────────────────────────────────────────────────────────┐
  │  Level 5: PRODUCT                                       │
  │  e.g., "Personal Loan" at Samman Capital                │
  │      ↑ overrides                                        │
  │  Level 4: BUSINESS LINE                                 │
  │  e.g., "Consumer Finance" at Samman Capital             │
  │      ↑ overrides                                        │
  │  Level 3: SUBSIDIARY                                    │
  │  e.g., "Samman Capital" (UAE)                           │
  │      ↑ overrides                                        │
  │  Level 2: REGION                                        │
  │  e.g., "MENA" region                                    │
  │      ↑ overrides                                        │
  │  Level 1: GLOBAL                                        │
  │  Default thresholds applied to all entities              │
  └─────────────────────────────────────────────────────────┘

  If no override exists at a given level, the threshold
  is inherited from the next higher (less specific) level.`}
      </DiagramBox>

      <Typography variant="h6" sx={{ mt: 3, mb: 2, fontSize: '1rem' }}>RAG Status Governance</Typography>

      <Grid container spacing={2} sx={{ mb: 3 }}>
        {RAG_STATUSES.map((r) => (
          <Grid item xs={12} sm={4} key={r.status}>
            <Card sx={{ p: 2, borderTop: 3, borderColor: r.color }}>
              <Chip label={r.status} size="small" sx={{ bgcolor: r.color, color: '#fff', fontWeight: 700, mb: 1 }} />
              <Typography sx={{ fontWeight: 600, fontSize: '0.85rem', mb: 0.5 }}>{r.meaning}</Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: '0.78rem', lineHeight: 1.6 }}>
                {r.desc}
              </Typography>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Typography variant="h6" sx={{ mt: 3, mb: 2, fontSize: '1rem' }}>
        Complete Metric Registry (25 Metrics)
      </Typography>

      <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Metric Key</TableCell>
              <TableCell>Label</TableCell>
              <TableCell>Direction</TableCell>
              <TableCell>Default Appetite</TableCell>
              <TableCell>Default Tolerance</TableCell>
              <TableCell>Business Line</TableCell>
              <TableCell>Category</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {METRICS.map((m) => (
              <TableRow key={m.key} hover>
                <TableCell sx={{ fontFamily: '"IBM Plex Mono", monospace', fontSize: '0.72rem' }}>{m.key}</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>{m.label}</TableCell>
                <TableCell>
                  <Chip
                    label={m.direction === 'Lower' ? 'Lower is better' : 'Higher is better'}
                    size="small"
                    sx={{ fontSize: '0.6rem', fontWeight: 600, bgcolor: m.direction === 'Lower' ? 'success.main' : 'info.main', color: '#fff' }}
                  />
                </TableCell>
                <TableCell sx={{ fontFamily: '"IBM Plex Mono", monospace', fontSize: '0.75rem' }}>{m.appetite}</TableCell>
                <TableCell sx={{ fontFamily: '"IBM Plex Mono", monospace', fontSize: '0.75rem' }}>{m.tolerance}</TableCell>
                <TableCell>
                  <Chip label={m.line} size="small" sx={{ fontSize: '0.6rem', fontWeight: 600, bgcolor: LINE_COLORS[m.line], color: '#fff' }} />
                </TableCell>
                <TableCell sx={{ fontSize: '0.78rem', color: 'text.secondary' }}>{m.category}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Box sx={{ mt: 3, p: 2, borderLeft: 3, borderColor: 'warning.main', bgcolor: 'action.hover', borderRadius: 1 }}>
        <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>Breach Alert Flow</Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary', lineHeight: 1.7, fontSize: '0.82rem' }}>
          When any metric breaches its threshold, an alert is generated and displayed in three locations:
          (1) the scrolling <strong>Breach Ticker Bar</strong> at the top of the dashboard,
          (2) the <strong>Breach Alerts Popover</strong> accessible via the bell icon, and
          (3) the <strong>GroupBreachPanel</strong> on the Overview tab with Red/Amber counters and pulse animation.
          Alerts include the metric name, current value, threshold, scope, and a drill-down link to the source tab.
        </Typography>
      </Box>
    </PRDSection>
  );
}
