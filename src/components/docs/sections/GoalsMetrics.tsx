'use client';

import { Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Chip } from '@mui/material';
import { PRDSection } from '@/components/docs/PRDSection';

const OBJECTIVES = [
  {
    objective: 'Real-Time Risk Visibility',
    keyResults: [
      { kr: 'Reduce PQR preparation time from 5 days to real-time', target: '100% reduction', measurement: 'Days to generate PQR report' },
      { kr: 'Achieve single-pane-of-glass view across all subsidiaries', target: '5/5 entities', measurement: 'Subsidiaries with live data feeds' },
    ],
    priority: 'P0',
  },
  {
    objective: 'Risk Appetite Governance',
    keyResults: [
      { kr: '100% risk appetite coverage across all subsidiaries and business lines', target: '25/25 metrics', measurement: 'Metrics with defined thresholds' },
      { kr: 'Real-time breach alerting with <1 minute detection latency', target: '<60 seconds', measurement: 'Time from data update to alert' },
    ],
    priority: 'P0',
  },
  {
    objective: 'Portfolio Analytics Depth',
    keyResults: [
      { kr: 'Provide vintage analysis for all consumer products', target: '100% products', measurement: 'Products with vintage curves' },
      { kr: 'Enable drill-down from group to facility level in <3 clicks', target: '<3 clicks', measurement: 'Clicks to reach facility detail' },
    ],
    priority: 'P1',
  },
  {
    objective: 'Operational Efficiency',
    keyResults: [
      { kr: 'Eliminate manual data reconciliation between systems', target: '0 manual steps', measurement: 'Manual reconciliation tasks per month' },
      { kr: 'Generate board-ready PDF/Excel reports with one click', target: '1 click', measurement: 'Clicks to export PQR' },
    ],
    priority: 'P1',
  },
  {
    objective: 'Platform Performance',
    keyResults: [
      { kr: 'Sub-3-second initial page load for all tabs', target: '<3 seconds', measurement: 'P95 page load time' },
      { kr: 'Support concurrent access by 50+ users without degradation', target: '50 users', measurement: 'Max concurrent users at <3s load' },
    ],
    priority: 'P2',
  },
];

const PRIORITY_COLORS: Record<string, string> = {
  P0: '#ef4444',
  P1: '#f59e0b',
  P2: '#3b82f6',
};

export function GoalsMetrics() {
  return (
    <PRDSection id="goals-metrics" title="Goals & Success Metrics" sectionNumber={4}>
      <Typography variant="body2" sx={{ mb: 2.5, lineHeight: 1.8 }}>
        The platform is measured against five strategic objectives, each with specific key results
        and measurable targets. Priorities are ranked P0 (critical), P1 (important), P2 (desirable).
      </Typography>

      <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell sx={{ width: 60 }}>Priority</TableCell>
              <TableCell>Objective</TableCell>
              <TableCell>Key Result</TableCell>
              <TableCell>Target</TableCell>
              <TableCell>Measurement</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {OBJECTIVES.flatMap((obj) =>
              obj.keyResults.map((kr, ki) => (
                <TableRow key={`${obj.objective}-${ki}`}>
                  {ki === 0 && (
                    <>
                      <TableCell rowSpan={obj.keyResults.length} sx={{ verticalAlign: 'top' }}>
                        <Chip
                          label={obj.priority}
                          size="small"
                          sx={{ bgcolor: PRIORITY_COLORS[obj.priority], color: '#fff', fontWeight: 700, fontSize: '0.65rem' }}
                        />
                      </TableCell>
                      <TableCell rowSpan={obj.keyResults.length} sx={{ verticalAlign: 'top', fontWeight: 600 }}>
                        {obj.objective}
                      </TableCell>
                    </>
                  )}
                  <TableCell>{kr.kr}</TableCell>
                  <TableCell sx={{ fontFamily: '"IBM Plex Mono", monospace', fontSize: '0.75rem', whiteSpace: 'nowrap' }}>
                    {kr.target}
                  </TableCell>
                  <TableCell sx={{ color: 'text.secondary', fontSize: '0.78rem' }}>{kr.measurement}</TableCell>
                </TableRow>
              )),
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </PRDSection>
  );
}
