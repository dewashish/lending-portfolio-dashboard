'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Box, Typography, Button, IconButton, Drawer, Paper, Table, TableBody,
  TableCell, TableContainer, TableHead, TableRow, Chip, Divider, Alert,
  Accordion, AccordionSummary, AccordionDetails, Stack,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import MenuIcon from '@mui/icons-material/Menu';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import { useRouter } from 'next/navigation';

// ── Section definitions ─────────────────────────────────────────
const SECTIONS = [
  { id: 'overview', label: 'Overview' },
  { id: 'architecture', label: 'Architecture' },
  { id: 'onboarding', label: 'Onboarding Checklist' },
  { id: 'auth', label: 'Authentication' },
  { id: 'consumer-metrics', label: 'Consumer Finance Data' },
  { id: 'consumer-extended', label: 'Extended Consumer Data' },
  { id: 'trade-finance', label: 'Trade Finance Data' },
  { id: 'corporate-finance', label: 'Corporate Finance Data' },
  { id: 'risk-outlook', label: 'Risk & Outlook Data' },
  { id: 'api-reference', label: 'API Reference' },
  { id: 'currency-fx', label: 'Currency & FX' },
  { id: 'data-quality', label: 'Data Quality Checks' },
  { id: 'sync-schedule', label: 'Sync Schedule' },
  { id: 'error-handling', label: 'Error Handling' },
  { id: 'faq', label: 'FAQ' },
] as const;

const TOC_WIDTH = 240;

// ── Reusable components ─────────────────────────────────────────
function SectionTitle({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <Typography id={id} variant="h5" fontWeight={700} sx={{ mt: 6, mb: 2, scrollMarginTop: '24px' }}>
      {children}
    </Typography>
  );
}

function SubSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Box sx={{ mb: 3 }}>
      <Typography variant="h6" fontWeight={600} sx={{ mb: 1 }}>{title}</Typography>
      {children}
    </Box>
  );
}

function CodeBlock({ children, title }: { children: string; title?: string }) {
  return (
    <Box sx={{ mb: 2 }}>
      {title && <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: 'block' }}>{title}</Typography>}
      <Paper
        sx={{
          p: 2, fontFamily: 'monospace', fontSize: '0.8rem', lineHeight: 1.6,
          bgcolor: '#1a1a2e', color: '#e0e0e0', borderRadius: 1.5, overflow: 'auto',
          whiteSpace: 'pre', maxHeight: 400,
        }}
      >
        {children}
      </Paper>
    </Box>
  );
}

function FieldTable({ fields }: { fields: { name: string; type: string; required: boolean; description: string }[] }) {
  return (
    <TableContainer component={Paper} variant="outlined" sx={{ mb: 2, maxHeight: 500 }}>
      <Table size="small" stickyHeader>
        <TableHead>
          <TableRow>
            <TableCell sx={{ fontWeight: 700, bgcolor: 'background.paper' }}>Column</TableCell>
            <TableCell sx={{ fontWeight: 700, bgcolor: 'background.paper' }}>Type</TableCell>
            <TableCell sx={{ fontWeight: 700, bgcolor: 'background.paper' }}>Required</TableCell>
            <TableCell sx={{ fontWeight: 700, bgcolor: 'background.paper' }}>Description</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {fields.map((f) => (
            <TableRow key={f.name}>
              <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.78rem' }}>{f.name}</TableCell>
              <TableCell sx={{ fontSize: '0.78rem' }}>{f.type}</TableCell>
              <TableCell>
                {f.required ? (
                  <Chip label="Yes" size="small" color="primary" variant="outlined" sx={{ fontSize: '0.7rem' }} />
                ) : (
                  <Chip label="No" size="small" variant="outlined" sx={{ fontSize: '0.7rem' }} />
                )}
              </TableCell>
              <TableCell sx={{ fontSize: '0.78rem' }}>{f.description}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}

// ── Table of Contents ───────────────────────────────────────────
function IntegrationTOC({ activeId, onNavigate }: { activeId: string; onNavigate: (id: string) => void }) {
  return (
    <Box sx={{ py: 3, px: 2 }}>
      <Typography variant="subtitle2" fontWeight={700} sx={{ px: 1, mb: 2, color: 'text.secondary', letterSpacing: 0.5 }}>
        INTEGRATION GUIDE
      </Typography>
      {SECTIONS.map((s) => (
        <Box
          key={s.id}
          onClick={() => onNavigate(s.id)}
          sx={{
            px: 1.5, py: 0.7, borderRadius: 1, cursor: 'pointer', fontSize: '0.82rem',
            fontWeight: activeId === s.id ? 600 : 400,
            color: activeId === s.id ? 'primary.main' : 'text.secondary',
            bgcolor: activeId === s.id ? 'action.selected' : 'transparent',
            borderLeft: activeId === s.id ? '3px solid' : '3px solid transparent',
            borderColor: activeId === s.id ? 'primary.main' : 'transparent',
            '&:hover': { bgcolor: 'action.hover' },
            transition: 'all 0.15s',
          }}
        >
          {s.label}
        </Box>
      ))}
    </Box>
  );
}

// ── Main Page ───────────────────────────────────────────────────
export default function IntegrationGuidePage() {
  const router = useRouter();
  const contentRef = useRef<HTMLDivElement>(null);
  const [activeSection, setActiveSection] = useState<string>(SECTIONS[0].id);
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    const contentEl = contentRef.current;
    if (!contentEl) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible.length > 0) setActiveSection(visible[0].target.id);
      },
      { root: contentEl, rootMargin: '-10% 0px -70% 0px', threshold: 0 },
    );
    SECTIONS.forEach((s) => { const el = document.getElementById(s.id); if (el) observer.observe(el); });
    return () => observer.disconnect();
  }, []);

  const scrollToSection = useCallback((id: string) => {
    const el = document.getElementById(id);
    if (el) { el.scrollIntoView({ behavior: 'smooth', block: 'start' }); setActiveSection(id); setDrawerOpen(false); }
  }, []);

  const tocContent = <IntegrationTOC activeId={activeSection} onNavigate={scrollToSection} />;

  return (
    <Box sx={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      {/* Desktop sidebar */}
      <Box sx={{ width: TOC_WIDTH, flexShrink: 0, borderRight: 1, borderColor: 'divider', overflowY: 'auto', display: { xs: 'none', md: 'block' } }}>
        {tocContent}
      </Box>
      {/* Mobile drawer */}
      <Drawer anchor="left" open={drawerOpen} onClose={() => setDrawerOpen(false)} sx={{ display: { md: 'none' } }}>
        <Box sx={{ width: TOC_WIDTH }}>{tocContent}</Box>
      </Drawer>

      {/* Content */}
      <Box ref={contentRef} sx={{ flex: 1, overflowY: 'auto', px: { xs: 2, md: 5 }, py: 3 }}>
        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
          <IconButton onClick={() => setDrawerOpen(true)} sx={{ display: { md: 'none' } }}><MenuIcon /></IconButton>
          <Button startIcon={<ArrowBackIcon />} onClick={() => router.push('/dashboard')} size="small" sx={{ textTransform: 'none' }}>Dashboard</Button>
        </Box>

        <Box sx={{ maxWidth: 860 }}>
          {/* ────────────────── OVERVIEW ────────────────── */}
          <SectionTitle id="overview">Subsidiary Integration Guide</SectionTitle>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            This guide provides step-by-step instructions for subsidiaries to connect their source systems (LOS, LMS, Collections) to the group-level lending portfolio dashboard. All data flows through authenticated REST API endpoints with automatic validation, FX conversion, and quality checks.
          </Typography>
          <Alert severity="info" sx={{ mb: 3 }}>
            Before starting, ensure Group HQ has completed your subsidiary registration (Step 0). You will receive an API key and your subsidiary ID from the group data team.
          </Alert>

          {/* ────────────────── ARCHITECTURE ────────────────── */}
          <SectionTitle id="architecture">Integration Architecture</SectionTitle>
          <Typography variant="body2" sx={{ mb: 2 }}>
            The platform supports three integration patterns. Choose the one that best fits your technical capabilities:
          </Typography>
          <TableContainer component={Paper} variant="outlined" sx={{ mb: 3 }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700 }}>Pattern</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Best For</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>How It Works</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                <TableRow>
                  <TableCell><Chip label="A: API Push" size="small" color="primary" /> <Chip label="Recommended" size="small" color="success" sx={{ ml: 0.5 }} /></TableCell>
                  <TableCell sx={{ fontSize: '0.8rem' }}>Subsidiaries with engineering teams or automated MIS</TableCell>
                  <TableCell sx={{ fontSize: '0.8rem' }}>Your ETL/MIS system sends JSON payloads to our REST API endpoints</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell><Chip label="B: File Upload" size="small" color="secondary" /></TableCell>
                  <TableCell sx={{ fontSize: '0.8rem' }}>Teams that produce Excel MIS reports</TableCell>
                  <TableCell sx={{ fontSize: '0.8rem' }}>Upload Excel/CSV files via the dashboard upload UI</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell><Chip label="C: Direct DB" size="small" variant="outlined" /></TableCell>
                  <TableCell sx={{ fontSize: '0.8rem' }}>Advanced data engineering teams</TableCell>
                  <TableCell sx={{ fontSize: '0.8rem' }}>Direct Supabase PostgREST API with scoped service key</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </TableContainer>
          <CodeBlock title="Data Flow">{`Subsidiary Source System (LOS/LMS/Collections)
    |
    v
POST /api/ingest/<table>  (JSON payload)
    |
    v
Authentication (API key validation + subsidiary scope check)
    |
    v
Validation (Zod schema: field types, enums, ranges, period format)
    |
    v
FX Conversion (auto-compute _usd columns from local currency)
    |
    v
Batch Upsert (idempotent ON CONFLICT, 500 rows/batch)
    |
    v
Logging (data_ingestion_log + sync_watermarks)
    |
    v
Data Quality Checks (freshness, anomalies, completeness)
    |
    v
Dashboard renders data at subsidiary/region/group scope`}</CodeBlock>

          {/* ────────────────── ONBOARDING ────────────────── */}
          <SectionTitle id="onboarding">Onboarding Checklist</SectionTitle>

          <SubSection title="Phase 0: Registration (Group HQ)">
            <Typography variant="body2" sx={{ mb: 1 }}>Before the subsidiary does anything, Group HQ must complete these steps:</Typography>
            <TableContainer component={Paper} variant="outlined" sx={{ mb: 2 }}>
              <Table size="small">
                <TableBody>
                  {[
                    ['0.1', 'Register subsidiary', 'Insert row in subsidiaries table with name, short_code, country, region_id, currency_code, institution_type'],
                    ['0.2', 'Register currency', 'Add currency to currencies table if new; add initial FX rate to fx_rates'],
                    ['0.3', 'Create data sources', 'Add entries in data_sources for each source system (LOS, LMS, Collections)'],
                    ['0.4', 'Register products', 'Add products to product_catalog with product_name and product_category'],
                    ['0.5', 'Issue API key', 'Generate API key scoped to this subsidiary_id; provide to subsidiary securely'],
                    ['0.6', 'Set risk thresholds', 'Configure risk_appetite_settings for the subsidiary'],
                  ].map(([step, title, desc]) => (
                    <TableRow key={step}>
                      <TableCell sx={{ fontWeight: 600, width: 40 }}>{step}</TableCell>
                      <TableCell sx={{ fontWeight: 600, width: 160, fontSize: '0.8rem' }}>{title}</TableCell>
                      <TableCell sx={{ fontSize: '0.8rem' }}>{desc}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </SubSection>

          <SubSection title="Phase 1: Consumer Finance (Minimum Viable)">
            <Typography variant="body2" sx={{ mb: 1 }}>This gets your subsidiary visible on the dashboard.</Typography>
            <TableContainer component={Paper} variant="outlined" sx={{ mb: 2 }}>
              <Table size="small">
                <TableBody>
                  {[
                    ['1.1', 'Map PQR/MIS fields', 'Map your metric names to the group standard (see Consumer Finance Data section)'],
                    ['1.2', 'Push overall metrics', 'POST to /api/ingest/consumer/overall with monthly KPIs'],
                    ['1.3', 'Push product metrics', 'POST to /api/ingest/consumer/products with per-product breakdowns'],
                    ['1.4', 'Verify on dashboard', 'Open dashboard, switch to your subsidiary scope, check Consumer Finance > Overview'],
                  ].map(([step, title, desc]) => (
                    <TableRow key={step}>
                      <TableCell sx={{ fontWeight: 600, width: 40 }}>{step}</TableCell>
                      <TableCell sx={{ fontWeight: 600, width: 180, fontSize: '0.8rem' }}>{title}</TableCell>
                      <TableCell sx={{ fontSize: '0.8rem' }}>{desc}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </SubSection>

          <SubSection title="Phase 2-5: Extended Data (Incremental)">
            <Typography variant="body2" sx={{ mb: 1 }}>
              Add more data tables incrementally. None are required for the basic dashboard. Skip trade/corporate phases if your subsidiary does not have those portfolios.
            </Typography>
            <Stack spacing={1} sx={{ mb: 2 }}>
              {[
                'Phase 2: Extended consumer data (net flow, roll rates, collections, vintage, LOS, non-starters, TDD)',
                'Phase 3: Trade Finance (facility-level data or pre-aggregated summaries)',
                'Phase 4: Corporate Finance (portfolio metrics, covenants, delinquency, watchlist)',
                'Phase 5: Risk & Outlook (EWS, ECL forecasts, stress scenarios)',
              ].map((p) => (
                <Box key={p} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <CheckCircleOutlineIcon sx={{ fontSize: 16, color: 'success.main' }} />
                  <Typography variant="body2">{p}</Typography>
                </Box>
              ))}
            </Stack>
          </SubSection>

          {/* ────────────────── AUTHENTICATION ────────────────── */}
          <SectionTitle id="auth">Authentication</SectionTitle>
          <Typography variant="body2" sx={{ mb: 2 }}>
            All ingestion endpoints require an API key. Include it in every request using one of these headers:
          </Typography>
          <CodeBlock title="Option 1: Authorization header">{`Authorization: Bearer sk_your_api_key_here`}</CodeBlock>
          <CodeBlock title="Option 2: X-API-Key header">{`X-API-Key: sk_your_api_key_here`}</CodeBlock>
          <Typography variant="body2" sx={{ mb: 2 }}>
            To verify your API key is valid:
          </Typography>
          <CodeBlock title="Verify API key">{`POST /api/ingest/auth
Content-Type: application/json

{
  "api_key": "sk_your_api_key_here"
}

# Response:
{
  "subsidiary_id": 6,
  "scopes": ["ingest"],
  "message": "API key is valid."
}`}</CodeBlock>
          <Alert severity="warning" sx={{ mb: 3 }}>
            Your API key is scoped to your subsidiary. You can only push data for your own subsidiary_id. Attempting to write data for a different subsidiary will return a 403 error.
          </Alert>

          {/* ────────────────── CONSUMER METRICS ────────────────── */}
          <SectionTitle id="consumer-metrics">Consumer Finance Data</SectionTitle>
          <Typography variant="body2" sx={{ mb: 2 }}>
            The core consumer finance data goes into two tables: <strong>consumer_overall_metrics</strong> (portfolio-level KPIs) and <strong>consumer_product_metrics</strong> (per-product breakdowns). Both use the same schema.
          </Typography>

          <SubSection title="consumer_overall_metrics">
            <FieldTable fields={[
              { name: 'subsidiary_id', type: 'INTEGER', required: true, description: 'Your subsidiary ID (provided by Group HQ)' },
              { name: 'metric_type', type: 'TEXT', required: true, description: 'Category: Portfolio Performance, Delinquency, Origination, Collections' },
              { name: 'metric', type: 'TEXT', required: true, description: 'KPI name (see required values below)' },
              { name: 'period', type: 'TEXT', required: true, description: "Month in Mon'YY format, e.g., Apr'25" },
              { name: 'value', type: 'NUMERIC', required: true, description: 'Metric value in LOCAL CURRENCY (for monetary) or as-is (for percentages)' },
              { name: 'value_usd', type: 'NUMERIC', required: false, description: 'Auto-computed by the API. Do NOT submit.' },
              { name: 'benchmark', type: 'NUMERIC', required: false, description: 'Optional target/benchmark value' },
            ]} />

            <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1 }}>Required metric_type and metric values:</Typography>
            <TableContainer component={Paper} variant="outlined" sx={{ mb: 2 }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700 }}>metric_type</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>metric values</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  <TableRow>
                    <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.78rem' }}>Portfolio Performance</TableCell>
                    <TableCell sx={{ fontSize: '0.78rem' }}>Total AUM, Active Accounts, Avg Ticket Size, Weighted Avg Rate</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.78rem' }}>Delinquency</TableCell>
                    <TableCell sx={{ fontSize: '0.78rem' }}>FPD%, 30+ Amt%, 60+ Amt%, 90+ Amt%, Net Credit Loss</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.78rem' }}>Origination</TableCell>
                    <TableCell sx={{ fontSize: '0.78rem' }}>Applications, Approvals, Disbursements, Disbursement Amount, Approval Rate, Avg Processing Days</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.78rem' }}>Collections</TableCell>
                    <TableCell sx={{ fontSize: '0.78rem' }}>Collection Efficiency, Recovery Rate, Resolution Rate, Avg Resolution Days</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </TableContainer>

            <CodeBlock title="Example API call">{`POST /api/ingest/consumer/overall
Authorization: Bearer sk_your_key
Content-Type: application/json

{
  "subsidiary_id": 6,
  "rows": [
    {
      "metric_type": "Portfolio Performance",
      "metric": "Total AUM",
      "period": "Apr'25",
      "value": 24000000000,
      "benchmark": 22000000000
    },
    {
      "metric_type": "Delinquency",
      "metric": "30+ Amt%",
      "period": "Apr'25",
      "value": 3.2,
      "benchmark": 3.0
    }
  ]
}`}</CodeBlock>

            <CodeBlock title="Success response">{`{
  "status": "ok",
  "batchId": "550e8400-e29b-41d4-a716-446655440000",
  "rowsUpserted": 2,
  "usdConversionRate": 0.012,
  "warnings": []
}`}</CodeBlock>

            <CodeBlock title="Validation error response">{`{
  "status": "error",
  "errors": [
    {
      "field": "rows.0.period",
      "message": "Invalid period format. Expected Mon'YY (e.g., Apr'25)"
    }
  ]
}`}</CodeBlock>
          </SubSection>

          <SubSection title="consumer_product_metrics">
            <Typography variant="body2" sx={{ mb: 1 }}>
              Same schema as consumer_overall_metrics, plus a <code>product_name</code> field. The product_name must match a product registered in product_catalog for your subsidiary.
            </Typography>
            <CodeBlock title="Endpoint">{`POST /api/ingest/consumer/products`}</CodeBlock>
          </SubSection>

          <SubSection title="Field Mapping Example">
            <Typography variant="body2" sx={{ mb: 1 }}>
              If your MIS uses different terminology, map to the group standard:
            </Typography>
            <TableContainer component={Paper} variant="outlined" sx={{ mb: 2 }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700 }}>Your MIS Field</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Maps To</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {[
                    ['"Portfolio Outstanding"', 'metric=Total AUM, metric_type=Portfolio Performance'],
                    ['"No. of Live Loans"', 'metric=Active Accounts, metric_type=Portfolio Performance'],
                    ['"PAR 30"', 'metric=30+ Amt%, metric_type=Delinquency'],
                    ['"PAR 90"', 'metric=90+ Amt%, metric_type=Delinquency'],
                    ['"First Payment Default Rate"', 'metric=FPD%, metric_type=Delinquency'],
                  ].map(([from, to]) => (
                    <TableRow key={from}>
                      <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.78rem' }}>{from}</TableCell>
                      <TableCell sx={{ fontSize: '0.78rem' }}>{to}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </SubSection>

          {/* ────────────────── EXTENDED CONSUMER ────────────────── */}
          <SectionTitle id="consumer-extended">Extended Consumer Data</SectionTitle>
          <Typography variant="body2" sx={{ mb: 2 }}>
            These tables enrich specific sub-tabs in the Consumer Finance view. All are optional.
          </Typography>

          {[
            {
              title: 'Net Flow Rates', endpoint: '/api/ingest/consumer/net-flow', table: 'net_flow_rates',
              fields: [
                { name: 'portfolio', type: 'TEXT', required: true, description: 'Portfolio segment (e.g., Overall, Secured, Unsecured)' },
                { name: 'bucket', type: 'TEXT', required: true, description: 'DPD bucket: Current, 1-30, 31-60, 61-90, 91-120, 120+, Write-off' },
                { name: 'period', type: 'TEXT', required: true, description: "Mon'YY format" },
                { name: 'value', type: 'NUMERIC', required: true, description: 'Net flow rate as percentage' },
              ],
            },
            {
              title: 'Roll Rate Series', endpoint: '/api/ingest/consumer/roll-rates', table: 'roll_rate_series',
              fields: [
                { name: 'bucket', type: 'TEXT', required: true, description: 'DPD bucket (same 7 values)' },
                { name: 'metric', type: 'TEXT', required: true, description: 'Roll Forward, Roll Backward, Stabilized' },
                { name: 'period', type: 'TEXT', required: true, description: "Mon'YY format" },
                { name: 'value', type: 'NUMERIC', required: true, description: 'Percentage value' },
              ],
            },
            {
              title: 'Vintage Analysis', endpoint: '/api/ingest/consumer/vintage', table: 'vintage_points',
              fields: [
                { name: 'vintage', type: 'TEXT', required: true, description: "Disbursement cohort month (e.g., Jan'22)" },
                { name: 'portfolio_segment', type: 'TEXT', required: true, description: 'Segment (e.g., Overall, Secured)' },
                { name: 'product_name', type: 'TEXT', required: true, description: 'Product name or All' },
                { name: 'loan_amount', type: 'NUMERIC', required: true, description: 'Total disbursement in cohort (local currency)' },
                { name: 'mob', type: 'INTEGER', required: true, description: 'Months-on-book (0, 1, 2, ...)' },
                { name: 'delinquency_rate', type: 'NUMERIC', required: true, description: 'Delinquency rate at this MOB' },
                { name: 'metric_type', type: 'TEXT', required: true, description: '30+ DPD, 60+ DPD, 90+ DPD' },
              ],
            },
            {
              title: 'Collection Metrics', endpoint: '/api/ingest/consumer/collections', table: 'collection_metrics',
              fields: [
                { name: 'portfolio', type: 'TEXT', required: true, description: 'Portfolio segment' },
                { name: 'bucket', type: 'TEXT', required: true, description: 'DPD bucket' },
                { name: 'amount', type: 'NUMERIC', required: true, description: 'Outstanding amount (local currency)' },
                { name: 'roll_backward', type: 'NUMERIC', required: false, description: 'Roll backward %' },
                { name: 'stabilized', type: 'NUMERIC', required: false, description: 'Stabilized %' },
                { name: 'roll_forward', type: 'NUMERIC', required: false, description: 'Roll forward %' },
                { name: 'period', type: 'TEXT', required: true, description: "Mon'YY format" },
              ],
            },
          ].map((table) => (
            <Accordion key={table.table} variant="outlined" sx={{ mb: 1 }}>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Box>
                  <Typography variant="subtitle2" fontWeight={600}>{table.title}</Typography>
                  <Typography variant="caption" color="text.secondary">{table.endpoint}</Typography>
                </Box>
              </AccordionSummary>
              <AccordionDetails>
                <FieldTable fields={table.fields} />
              </AccordionDetails>
            </Accordion>
          ))}

          <Accordion variant="outlined" sx={{ mb: 1 }}>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Box>
                <Typography variant="subtitle2" fontWeight={600}>LOS Metrics (Origination)</Typography>
                <Typography variant="caption" color="text.secondary">/api/ingest/consumer/los</Typography>
              </Box>
            </AccordionSummary>
            <AccordionDetails>
              <Typography variant="body2" sx={{ mb: 1 }}>
                This endpoint handles three sub-types. Set <code>type</code> to <code>&quot;metrics&quot;</code>, <code>&quot;funnel&quot;</code>, or <code>&quot;daily&quot;</code>.
              </Typography>
              <CodeBlock>{`POST /api/ingest/consumer/los
{
  "subsidiary_id": 6,
  "type": "metrics",  // or "funnel" or "daily"
  "rows": [...]
}`}</CodeBlock>
            </AccordionDetails>
          </Accordion>

          <Accordion variant="outlined" sx={{ mb: 1 }}>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Box>
                <Typography variant="subtitle2" fontWeight={600}>Non-Starters, TDD, Approved/Rejected Base</Typography>
                <Typography variant="caption" color="text.secondary">/api/ingest/consumer/non-starters, /tdd, /base</Typography>
              </Box>
            </AccordionSummary>
            <AccordionDetails>
              <Typography variant="body2">
                Each endpoint follows the same pattern. The TDD endpoint uses <code>type: &quot;pre&quot;</code> or <code>type: &quot;post&quot;</code>.
                The base endpoint uses <code>type: &quot;approved&quot;</code> or <code>type: &quot;rejected&quot;</code>.
              </Typography>
            </AccordionDetails>
          </Accordion>

          {/* ────────────────── TRADE FINANCE ────────────────── */}
          <SectionTitle id="trade-finance">Trade Finance Data</SectionTitle>
          <Alert severity="info" sx={{ mb: 2 }}>Skip this section if your subsidiary does not have a trade finance portfolio.</Alert>
          <Typography variant="body2" sx={{ mb: 2 }}>
            Push facility-level data to <code>/api/ingest/trade/facilities</code>. The dashboard computes all analytics from the raw facility data.
          </Typography>
          <FieldTable fields={[
            { name: 'facility_reference', type: 'TEXT', required: true, description: 'Unique facility ID within your subsidiary' },
            { name: 'obligor_name', type: 'TEXT', required: true, description: 'Borrower name' },
            { name: 'product_type', type: 'TEXT', required: true, description: 'Import LC, Export LC, Bank Guarantee - Performance, Bank Guarantee - Financial, Trade Loan - Pre-Export, Trade Loan - Post-Import, SBLC, Forfaiting, Documentary Collection - D/P, Documentary Collection - D/A' },
            { name: 'currency', type: 'TEXT', required: true, description: '3-letter currency code (e.g., USD, INR)' },
            { name: 'facility_limit', type: 'NUMERIC', required: true, description: 'Approved limit (local currency)' },
            { name: 'outstanding', type: 'NUMERIC', required: true, description: 'Current outstanding (local currency)' },
            { name: 'report_date', type: 'DATE', required: true, description: 'As-of date (YYYY-MM-DD)' },
            { name: 'sector', type: 'TEXT', required: false, description: 'Industry sector' },
            { name: 'days_past_due', type: 'INTEGER', required: false, description: 'DPD (0 if current)' },
            { name: 'ifrs9_stage', type: 'TEXT', required: false, description: 'Stage 1, Stage 2, or Stage 3' },
            { name: 'internal_rating', type: 'TEXT', required: false, description: 'Internal credit rating' },
            { name: 'provision_amount', type: 'NUMERIC', required: false, description: 'Provision amount (local currency)' },
            { name: 'ews_score', type: 'NUMERIC', required: false, description: 'Early warning score (0-10)' },
            { name: 'watchlist_flag', type: 'BOOLEAN', required: false, description: 'Whether facility is on watchlist' },
          ]} />

          {/* ────────────────── CORPORATE FINANCE ────────────────── */}
          <SectionTitle id="corporate-finance">Corporate Finance Data</SectionTitle>
          <Alert severity="info" sx={{ mb: 2 }}>Skip this section if your subsidiary does not have a corporate lending portfolio.</Alert>
          <Typography variant="body2" sx={{ mb: 2 }}>
            Corporate data is distributed across multiple endpoints. Start with portfolio metrics, then add the others incrementally.
          </Typography>
          <TableContainer component={Paper} variant="outlined" sx={{ mb: 2 }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700 }}>Endpoint</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Data</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Priority</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {[
                  ['/api/ingest/corporate/metrics', 'Time-series KPIs (POS, disbursement by period)', 'High'],
                  ['/api/ingest/corporate/covenants', 'Covenant tracking with breach flags', 'Medium'],
                  ['/api/ingest/corporate/delinquency', 'Delinquent accounts with remedial actions', 'High'],
                  ['/api/ingest/corporate/watchlist', 'Monitored borrowers with EWS triggers', 'Medium'],
                ].map(([ep, data, priority]) => (
                  <TableRow key={ep}>
                    <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>{ep}</TableCell>
                    <TableCell sx={{ fontSize: '0.8rem' }}>{data}</TableCell>
                    <TableCell><Chip label={priority} size="small" color={priority === 'High' ? 'error' : 'warning'} variant="outlined" /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          {/* ────────────────── RISK & OUTLOOK ────────────────── */}
          <SectionTitle id="risk-outlook">Risk & Outlook Data</SectionTitle>
          <Typography variant="body2" sx={{ mb: 2 }}>
            Push EWS and risk outlook data to enhance forward-looking analytics. These are optional but recommended.
          </Typography>
          <CodeBlock title="EWS Entity Summary">{`POST /api/ingest/risk/ews
{
  "subsidiary_id": 6,
  "type": "entity",
  "data": {
    "score0": 45, "score1": 30, "score2": 15,
    "score3": 8, "score4_plus": 2,
    "total_facilities": 100,
    "avg_ews_score": 1.2,
    "flagged_exposure": 5000000,
    "rag_status": "Amber"
  }
}`}</CodeBlock>
          <CodeBlock title="EWS Facility Alerts">{`POST /api/ingest/risk/ews
{
  "subsidiary_id": 6,
  "type": "alerts",
  "rows": [
    {
      "facility_ref": "TF-001",
      "obligor": "ABC Corp",
      "ews_score": 3,
      "outstanding": 2000000,
      "triggers": "Revenue decline >20%, covenant breach",
      "ifrs_stage": "Stage 2",
      "action": "Enhanced monitoring"
    }
  ]
}`}</CodeBlock>

          {/* ────────────────── API REFERENCE ────────────────── */}
          <SectionTitle id="api-reference">API Reference</SectionTitle>
          <TableContainer component={Paper} variant="outlined" sx={{ mb: 2 }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700 }}>Endpoint</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Method</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Description</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {[
                  ['/api/ingest/auth', 'POST', 'Verify API key validity'],
                  ['/api/ingest/consumer/overall', 'POST', 'Upsert consumer overall metrics'],
                  ['/api/ingest/consumer/products', 'POST', 'Upsert consumer product metrics'],
                  ['/api/ingest/consumer/net-flow', 'POST', 'Upsert net flow rates'],
                  ['/api/ingest/consumer/roll-rates', 'POST', 'Upsert roll rate series'],
                  ['/api/ingest/consumer/collections', 'POST', 'Upsert collection metrics'],
                  ['/api/ingest/consumer/vintage', 'POST', 'Upsert vintage analysis points'],
                  ['/api/ingest/consumer/los', 'POST', 'Upsert LOS metrics/funnel/daily'],
                  ['/api/ingest/consumer/non-starters', 'POST', 'Upsert non-starter analysis'],
                  ['/api/ingest/consumer/tdd', 'POST', 'Upsert TDD pre/post disbursal'],
                  ['/api/ingest/consumer/base', 'POST', 'Upsert approved/rejected base'],
                  ['/api/ingest/trade/facilities', 'POST', 'Upsert trade facilities'],
                  ['/api/ingest/corporate/metrics', 'POST', 'Upsert corporate portfolio metrics'],
                  ['/api/ingest/corporate/covenants', 'POST', 'Upsert corporate covenants'],
                  ['/api/ingest/corporate/delinquency', 'POST', 'Upsert corporate delinquency'],
                  ['/api/ingest/corporate/watchlist', 'POST', 'Upsert corporate watchlist'],
                  ['/api/ingest/risk/ews', 'POST', 'Upsert EWS entity summary or alerts'],
                  ['/api/ingest/fx-rates', 'POST', 'Upsert FX rates'],
                  ['/api/ingest/validate', 'POST', 'Dry-run validation (no data persisted)'],
                  ['/api/ingest/status', 'GET', 'Check sync status per subsidiary'],
                ].map(([ep, method, desc]) => (
                  <TableRow key={ep}>
                    <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>{ep}</TableCell>
                    <TableCell><Chip label={method} size="small" color={method === 'GET' ? 'info' : 'primary'} variant="outlined" /></TableCell>
                    <TableCell sx={{ fontSize: '0.8rem' }}>{desc}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          <SubSection title="Dry-Run Validation">
            <Typography variant="body2" sx={{ mb: 1 }}>
              Test your payload without persisting data:
            </Typography>
            <CodeBlock>{`POST /api/ingest/validate
{
  "subsidiary_id": 6,
  "table": "consumer_overall_metrics",
  "rows": [
    { "metric_type": "Delinquency", "metric": "30+ Amt%", "period": "Apr'25", "value": 3.2 }
  ]
}

# Success: { "status": "ok", "message": "Validation passed. No data was persisted." }
# Error:   { "status": "error", "errors": [...] }`}</CodeBlock>
          </SubSection>

          <SubSection title="Check Sync Status">
            <CodeBlock>{`GET /api/ingest/status
Authorization: Bearer sk_your_key

# Response:
{
  "subsidiaryId": 6,
  "name": "Your Bank",
  "tables": {
    "consumer_overall_metrics": {
      "lastSync": "2025-04-05T10:30:00Z",
      "lastPeriod": "Mar'25",
      "rows": 120,
      "status": "ok"
    },
    "net_flow_rates": {
      "lastSync": null,
      "status": "never_synced"
    }
  },
  "warnings": ["net_flow_rates has never been synced"]
}`}</CodeBlock>
          </SubSection>

          {/* ────────────────── CURRENCY & FX ────────────────── */}
          <SectionTitle id="currency-fx">Currency & FX Handling</SectionTitle>
          <Box sx={{ mb: 2 }}>
            {[
              { rule: 'Submit local currency only', desc: 'All monetary values must be in your subsidiary\'s registered currency. Never submit USD-converted values.' },
              { rule: 'USD conversion is automatic', desc: 'The API looks up the FX rate from the fx_rates table and populates all _usd columns automatically.' },
              { rule: 'FX rates are centrally managed', desc: 'Group treasury maintains the fx_rates table. Contact the data team if rates need updating.' },
              { rule: 'Stale rate warnings', desc: 'If the most recent FX rate is >30 days old, the API response includes a warning but does not block ingestion.' },
            ].map((r, i) => (
              <Paper key={i} variant="outlined" sx={{ p: 2, mb: 1 }}>
                <Typography variant="subtitle2" fontWeight={600}>Rule {i + 1}: {r.rule}</Typography>
                <Typography variant="body2" color="text.secondary">{r.desc}</Typography>
              </Paper>
            ))}
          </Box>

          {/* ────────────────── DATA QUALITY ────────────────── */}
          <SectionTitle id="data-quality">Data Quality Checks</SectionTitle>
          <SubSection title="Pre-Ingestion (block on failure)">
            <TableContainer component={Paper} variant="outlined" sx={{ mb: 2 }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700 }}>Check</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>What It Validates</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Error Example</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {[
                    ['Schema', 'All required fields present, correct types', 'Missing required field: period'],
                    ['Period Format', "Matches Mon'YY regex", "Invalid period format '2025-04'. Expected Mon'YY"],
                    ['DPD Buckets', '7 standard values only', "Invalid DPD bucket '31-90'. Must be one of: Current, 1-30, ..."],
                    ['IFRS Stages', 'Stage 1, Stage 2, or Stage 3 only', "Invalid IFRS stage 'Stage 4'"],
                    ['Value Ranges', 'Non-negative amounts, valid percentages', 'Negative amount for Total AUM'],
                    ['Subsidiary Scope', 'API key matches subsidiary_id', 'API key not authorized for subsidiary 7'],
                    ['FX Rate Available', 'Rate exists for currency + period', 'No FX rate for PKR as of 2025-04-30'],
                  ].map(([check, what, error]) => (
                    <TableRow key={check}>
                      <TableCell sx={{ fontWeight: 600, fontSize: '0.8rem' }}>{check}</TableCell>
                      <TableCell sx={{ fontSize: '0.8rem' }}>{what}</TableCell>
                      <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.72rem', color: 'error.main' }}>{error}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </SubSection>
          <SubSection title="Post-Ingestion (alerts, non-blocking)">
            <TableContainer component={Paper} variant="outlined" sx={{ mb: 2 }}>
              <Table size="small">
                <TableBody>
                  {[
                    ['Freshness', 'Flags subsidiaries with no sync for >45 days'],
                    ['MoM Anomaly', 'Alerts if AUM or key metrics change >50% month-over-month'],
                    ['Completeness', 'Checks all expected metric_types are present for the latest period'],
                  ].map(([check, desc]) => (
                    <TableRow key={check}>
                      <TableCell sx={{ fontWeight: 600, fontSize: '0.8rem', width: 140 }}>{check}</TableCell>
                      <TableCell sx={{ fontSize: '0.8rem' }}>{desc}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </SubSection>

          {/* ────────────────── SYNC SCHEDULE ────────────────── */}
          <SectionTitle id="sync-schedule">Recommended Sync Schedule</SectionTitle>
          <TableContainer component={Paper} variant="outlined" sx={{ mb: 3 }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700 }}>Data Type</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Frequency</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Deadline</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {[
                  ['Consumer overall & product metrics', 'Monthly', 'By 5th business day'],
                  ['Net flow, roll rates, collections', 'Monthly', 'By 5th business day'],
                  ['Vintage analysis', 'Monthly', 'New MOB point each month'],
                  ['LOS daily', 'Daily', 'By end of next business day'],
                  ['LOS metrics & funnel', 'Daily or weekly', 'Within 2 business days'],
                  ['Trade facilities', 'Monthly', 'By 10th business day'],
                  ['Corporate metrics', 'Monthly', 'By 10th business day'],
                  ['EWS data', 'Monthly', 'By 10th business day'],
                  ['FX rates', 'Daily or weekly', 'As needed'],
                ].map(([type, freq, deadline]) => (
                  <TableRow key={type}>
                    <TableCell sx={{ fontSize: '0.8rem' }}>{type}</TableCell>
                    <TableCell><Chip label={freq} size="small" variant="outlined" /></TableCell>
                    <TableCell sx={{ fontSize: '0.8rem' }}>{deadline}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          {/* ────────────────── ERROR HANDLING ────────────────── */}
          <SectionTitle id="error-handling">Error Handling</SectionTitle>
          <SubSection title="HTTP Status Codes">
            <TableContainer component={Paper} variant="outlined" sx={{ mb: 2 }}>
              <Table size="small">
                <TableBody>
                  {[
                    ['200', 'Success', 'Data ingested or validated successfully'],
                    ['400', 'Bad Request', 'Validation failed (check errors array for details)'],
                    ['401', 'Unauthorized', 'Missing or invalid API key'],
                    ['403', 'Forbidden', 'API key expired, deactivated, or wrong subsidiary scope'],
                    ['500', 'Server Error', 'Database error during upsert (contact data team)'],
                  ].map(([code, label, desc]) => (
                    <TableRow key={code}>
                      <TableCell sx={{ fontWeight: 600, fontFamily: 'monospace' }}>{code}</TableCell>
                      <TableCell sx={{ fontWeight: 600, fontSize: '0.8rem' }}>{label}</TableCell>
                      <TableCell sx={{ fontSize: '0.8rem' }}>{desc}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </SubSection>

          <SubSection title="Idempotent Upserts">
            <Typography variant="body2">
              All endpoints use <strong>upsert</strong> (INSERT ... ON CONFLICT DO UPDATE). This means:
            </Typography>
            <Stack spacing={1} sx={{ mt: 1, mb: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <CheckCircleOutlineIcon sx={{ fontSize: 16, color: 'success.main' }} />
                <Typography variant="body2">Re-submitting the same data is safe and updates existing rows</Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <CheckCircleOutlineIcon sx={{ fontSize: 16, color: 'success.main' }} />
                <Typography variant="body2">No need to delete before re-pushing corrected data</Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <CheckCircleOutlineIcon sx={{ fontSize: 16, color: 'success.main' }} />
                <Typography variant="body2">Duplicate rows are impossible due to UNIQUE constraints</Typography>
              </Box>
            </Stack>
          </SubSection>

          <SubSection title="Rate Limits">
            <Stack spacing={1}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <WarningAmberIcon sx={{ fontSize: 16, color: 'warning.main' }} />
                <Typography variant="body2">100 requests per minute per API key</Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <WarningAmberIcon sx={{ fontSize: 16, color: 'warning.main' }} />
                <Typography variant="body2">10,000 rows per request maximum</Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <WarningAmberIcon sx={{ fontSize: 16, color: 'warning.main' }} />
                <Typography variant="body2">1 MB maximum payload size</Typography>
              </Box>
            </Stack>
          </SubSection>

          {/* ────────────────── FAQ ────────────────── */}
          <SectionTitle id="faq">Frequently Asked Questions</SectionTitle>
          {[
            {
              q: 'What if my subsidiary only has consumer finance?',
              a: 'Skip the trade and corporate phases entirely. The dashboard handles missing portfolios gracefully — those sections will show empty/zero.',
            },
            {
              q: 'What if my product names differ from the group standard?',
              a: 'Each subsidiary defines its own products in product_catalog. Use your internal product names. The dashboard dynamically fetches products per scope.',
            },
            {
              q: 'What if my DPD buckets are different (e.g., 31-90 instead of 31-60)?',
              a: 'You must re-map to the 7 standard buckets (Current, 1-30, 31-60, 61-90, 91-120, 120+, Write-off) during your ETL process before submitting.',
            },
            {
              q: 'How do I correct previously submitted data?',
              a: 'Re-submit the corrected rows for the affected period. The upsert logic automatically replaces old values based on the UNIQUE constraint.',
            },
            {
              q: 'Do I need to compute USD amounts?',
              a: 'No. Submit all values in your local currency. The API auto-computes _usd columns using FX rates maintained by group treasury.',
            },
            {
              q: 'How do I test without affecting real data?',
              a: 'Use the /api/ingest/validate endpoint for dry-run validation. It checks your payload against all rules without persisting anything.',
            },
            {
              q: 'What happens if the FX rate is missing?',
              a: 'The API rejects the ingestion with a clear error. Contact the group data team to add the missing FX rate.',
            },
            {
              q: 'How do I check my sync status?',
              a: 'Call GET /api/ingest/status with your API key. It shows last sync time, latest period, and row counts for each table.',
            },
          ].map((item, i) => (
            <Accordion key={i} variant="outlined" sx={{ mb: 0.5 }}>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography variant="subtitle2" fontWeight={600}>{item.q}</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Typography variant="body2">{item.a}</Typography>
              </AccordionDetails>
            </Accordion>
          ))}

          <Divider sx={{ my: 4 }} />
          <Typography variant="body2" color="text.secondary" sx={{ mb: 4, textAlign: 'center' }}>
            For questions or support, contact the Group Data Team.
          </Typography>
        </Box>
      </Box>
    </Box>
  );
}
