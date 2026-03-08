'use client';

import { Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Chip, Box } from '@mui/material';
import { PRDSection } from '@/components/docs/PRDSection';

const NFRS = [
  {
    category: 'Performance',
    color: '#2196f3',
    requirements: [
      { req: 'Initial page load', target: '< 3 seconds', notes: 'Measured at P95 on broadband connection' },
      { req: 'Tab switch latency', target: '< 1 second', notes: 'Client-side navigation with SWR cache' },
      { req: 'Scope change re-render', target: '< 500ms', notes: 'SWR cache key change + component re-render' },
      { req: 'Chart render time', target: '< 200ms', notes: 'D3.js SVG rendering for individual charts' },
      { req: 'Export generation', target: '< 5 seconds', notes: 'Client-side PDF/Excel generation' },
    ],
  },
  {
    category: 'Security',
    color: '#f44336',
    requirements: [
      { req: 'Authentication', target: 'OAuth 2.0', notes: 'Supabase Auth with JWT session tokens' },
      { req: 'Row-Level Security', target: 'Enabled', notes: 'PostgreSQL RLS policies on all data tables' },
      { req: 'Admin protection', target: 'PIN-based 2FA', notes: 'Secondary authentication for Risk Appetite editing' },
      { req: 'Data encryption', target: 'TLS 1.3', notes: 'All API calls encrypted in transit' },
      { req: 'Session management', target: 'Auto-expire', notes: 'JWT tokens with configurable expiry' },
    ],
  },
  {
    category: 'Accessibility',
    color: '#4caf50',
    requirements: [
      { req: 'Keyboard navigation', target: 'Full support', notes: 'MUI components include built-in keyboard handlers' },
      { req: 'Screen reader support', target: 'ARIA labels', notes: 'MUI components emit semantic HTML with ARIA attributes' },
      { req: 'Color contrast', target: 'WCAG AA', notes: 'Dark/Light themes tested for minimum 4.5:1 contrast ratio' },
      { req: 'Focus indicators', target: 'Visible', notes: 'MUI focus rings on all interactive elements' },
    ],
  },
  {
    category: 'Responsiveness',
    color: '#9c27b0',
    requirements: [
      { req: 'Desktop (md+)', target: 'Full layout', notes: 'All features, charts, and tables at full resolution' },
      { req: 'Tablet (sm)', target: 'Adapted layout', notes: 'Responsive grid, collapsible navigation' },
      { req: 'Mobile (xs)', target: 'Mobile-aware', notes: 'Horizontal scrollable tables, stacked cards' },
    ],
  },
  {
    category: 'Theming',
    color: '#ff9800',
    requirements: [
      { req: 'Dark mode', target: 'Full support', notes: 'Complete dark theme with MUI palette + D3 chart tokens' },
      { req: 'Light mode', target: 'Full support', notes: 'Complete light theme with professional styling' },
      { req: 'Theme switch', target: 'Instant', notes: 'One-click toggle in AppBar, persisted in context' },
      { req: 'Chart theming', target: 'Synchronized', notes: 'D3 charts use theme-aware color tokens (D3_TOKENS)' },
    ],
  },
  {
    category: 'Reliability',
    color: '#607d8b',
    requirements: [
      { req: 'Error boundaries', target: 'Per-section', notes: 'React error boundaries prevent full-page crashes' },
      { req: 'Data fallbacks', target: 'Graceful', notes: 'Empty states, loading skeletons, and "No data" messages' },
      { req: 'API error handling', target: 'Catch + fallback', notes: 'All query functions use .catch() with default values' },
    ],
  },
];

export function NonFunctionalRequirements() {
  return (
    <PRDSection id="nonfunctional" title="Non-Functional Requirements" sectionNumber={14}>
      <Typography variant="body2" sx={{ mb: 2.5, lineHeight: 1.8 }}>
        The following non-functional requirements define the quality attributes of the platform
        across performance, security, accessibility, responsiveness, theming, and reliability dimensions.
      </Typography>

      {NFRS.map((nfr) => (
        <Box key={nfr.category} sx={{ mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
            <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: nfr.color }} />
            <Typography sx={{ fontWeight: 700, fontSize: '0.95rem' }}>{nfr.category}</Typography>
          </Box>
          <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Requirement</TableCell>
                  <TableCell>Target</TableCell>
                  <TableCell>Notes</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {nfr.requirements.map((r) => (
                  <TableRow key={r.req} hover>
                    <TableCell sx={{ fontWeight: 600 }}>{r.req}</TableCell>
                    <TableCell>
                      <Chip label={r.target} size="small" sx={{ fontWeight: 600, fontSize: '0.68rem', bgcolor: nfr.color, color: '#fff' }} />
                    </TableCell>
                    <TableCell sx={{ fontSize: '0.78rem', color: 'text.secondary' }}>{r.notes}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      ))}
    </PRDSection>
  );
}
