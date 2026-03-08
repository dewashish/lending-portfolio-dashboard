'use client';

import { Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Chip, Box, Grid, Card } from '@mui/material';
import { PRDSection } from '@/components/docs/PRDSection';

const EXPORTS = [
  { format: 'PDF', name: 'Executive Summary', scope: 'All scopes', tabs: 'All tabs', library: 'jsPDF + jspdf-autotable', desc: 'Formatted summary with KPIs, key charts, and risk highlights for board presentations.' },
  { format: 'Excel', name: 'Group PQR', scope: 'Group / Region / Subsidiary', tabs: 'Group Overview', library: 'ExcelJS', desc: 'Consolidated scorecard, portfolio composition, breach status across all subsidiaries.' },
  { format: 'Excel', name: 'Consumer PQR', scope: 'Group / Region / Subsidiary', tabs: 'Consumer Finance', library: 'ExcelJS', desc: 'Delinquency analysis, origination metrics, vintage data, collection performance.' },
  { format: 'Excel', name: 'Trade PQR', scope: 'Group / Region / Subsidiary', tabs: 'Trade Finance', library: 'ExcelJS', desc: 'Facility summary, product mix, concentrations, watchlist, EWS alerts.' },
  { format: 'Excel', name: 'Corporate PQR', scope: 'Group / Region / Subsidiary', tabs: 'Corporate Finance', library: 'ExcelJS', desc: 'Portfolio metrics, industry concentration, covenants, delinquency details.' },
  { format: 'Excel', name: 'Risk PQR', scope: 'Group / Region / Subsidiary', tabs: 'Risk & Concentrations', library: 'ExcelJS', desc: 'EWS summary, concentration data, FX risk, country risk analysis.' },
];

export function ExportReporting() {
  return (
    <PRDSection id="export-reporting" title="Export & Reporting" sectionNumber={10}>
      <Typography variant="body2" sx={{ mb: 2, lineHeight: 1.8 }}>
        The platform provides one-click export capabilities for generating board-ready reports in
        PDF and Excel formats. All exports are scope-aware — they reflect the currently selected
        Group, Region, or Subsidiary scope — and tab-aware, generating content specific to the
        active navigation tab.
      </Typography>

      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6}>
          <Card sx={{ p: 2, borderTop: 3, borderColor: '#f44336' }}>
            <Typography sx={{ fontWeight: 700, fontSize: '0.9rem', mb: 0.5 }}>PDF Executive Summary</Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: '0.78rem', lineHeight: 1.6 }}>
              Generates a formatted PDF report with key performance indicators, risk highlights,
              and visual summaries suitable for board-level presentations and regulatory submissions.
            </Typography>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6}>
          <Card sx={{ p: 2, borderTop: 3, borderColor: '#4caf50' }}>
            <Typography sx={{ fontWeight: 700, fontSize: '0.9rem', mb: 0.5 }}>Excel PQR Reports</Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: '0.78rem', lineHeight: 1.6 }}>
              Generates detailed Portfolio Quality Reports (PQR) in Excel format with tabular data,
              formatted cells, and multiple worksheets organized by analytical section.
            </Typography>
          </Card>
        </Grid>
      </Grid>

      <Typography variant="h6" sx={{ fontSize: '1rem', mb: 1.5 }}>Export Inventory</Typography>

      <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Format</TableCell>
              <TableCell>Report Name</TableCell>
              <TableCell>Scope</TableCell>
              <TableCell>Source Tab</TableCell>
              <TableCell>Description</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {EXPORTS.map((e, i) => (
              <TableRow key={i} hover>
                <TableCell>
                  <Chip
                    label={e.format}
                    size="small"
                    sx={{ fontWeight: 700, fontSize: '0.65rem', bgcolor: e.format === 'PDF' ? '#f44336' : '#4caf50', color: '#fff' }}
                  />
                </TableCell>
                <TableCell sx={{ fontWeight: 600 }}>{e.name}</TableCell>
                <TableCell sx={{ fontSize: '0.78rem' }}>{e.scope}</TableCell>
                <TableCell sx={{ fontSize: '0.78rem' }}>{e.tabs}</TableCell>
                <TableCell sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>{e.desc}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Box sx={{ mt: 3, p: 2, borderLeft: 3, borderColor: 'info.main', bgcolor: 'action.hover', borderRadius: 1 }}>
        <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>Technical Implementation</Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary', lineHeight: 1.7, fontSize: '0.82rem' }}>
          Export generation uses dynamic imports to minimize initial bundle size. PDF rendering uses
          <code> jsPDF</code> with <code>jspdf-autotable</code> for table formatting. Excel generation uses
          <code> ExcelJS</code> with styled cells, merged headers, and conditional formatting. Both export types
          are generated client-side with no server round-trip required.
        </Typography>
      </Box>
    </PRDSection>
  );
}
