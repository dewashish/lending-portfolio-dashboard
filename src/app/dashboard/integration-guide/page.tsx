'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Box, Typography, Button, IconButton, Drawer, Paper, Table, TableBody,
  TableCell, TableContainer, TableHead, TableRow, Chip, Divider, Alert,
  Accordion, AccordionSummary, AccordionDetails, Stack, List, ListItem, ListItemIcon, ListItemText,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import MenuIcon from '@mui/icons-material/Menu';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import { useRouter } from 'next/navigation';

/* ═══════════════════════════════════════════════════════════════════
   Section definitions
   ═══════════════════════════════════════════════════════════════════ */
const SECTIONS = [
  { id: 'overview', label: '1. Overview' },
  { id: 'architecture', label: '2. Architecture' },
  { id: 'onboarding', label: '3. Onboarding Checklist' },
  { id: 'auth', label: '4. Authentication' },
  { id: 'api-consumer-overall', label: '5. Consumer Overall Metrics' },
  { id: 'api-consumer-products', label: '6. Consumer Product Metrics' },
  { id: 'api-consumer-netflow', label: '7. Net Flow Rates' },
  { id: 'api-consumer-rollrates', label: '8. Roll Rate Series' },
  { id: 'api-consumer-collections', label: '9. Collection Metrics' },
  { id: 'api-consumer-vintage', label: '10. Vintage Analysis' },
  { id: 'api-consumer-los', label: '11. LOS Metrics' },
  { id: 'api-consumer-nonstarters', label: '12. Non-Starters' },
  { id: 'api-consumer-tdd', label: '13. TDD Pre/Post Disbursal' },
  { id: 'api-consumer-base', label: '14. Approved/Rejected Base' },
  { id: 'api-trade', label: '15. Trade Facilities' },
  { id: 'api-corporate-metrics', label: '16. Corporate Metrics' },
  { id: 'api-corporate-covenants', label: '17. Corporate Covenants' },
  { id: 'api-corporate-delinquency', label: '18. Corporate Delinquency' },
  { id: 'api-corporate-watchlist', label: '19. Corporate Watchlist' },
  { id: 'api-ews', label: '20. EWS (Risk)' },
  { id: 'api-fxrates', label: '21. FX Rates' },
  { id: 'api-validate', label: '22. Dry-Run Validation' },
  { id: 'api-status', label: '23. Sync Status' },
  { id: 'currency-fx', label: '24. Currency & FX Rules' },
  { id: 'data-quality', label: '25. Data Quality Checks' },
  { id: 'sync-schedule', label: '26. Sync Schedule' },
  { id: 'error-handling', label: '27. Error Handling' },
  { id: 'handling-variance', label: '28. Handling Variance' },
  { id: 'faq', label: '29. FAQ' },
] as const;

const TOC_WIDTH = 250;

/* ═══════════════════════════════════════════════════════════════════
   Reusable components
   ═══════════════════════════════════════════════════════════════════ */
function SectionTitle({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <Typography id={id} variant="h5" fontWeight={700} sx={{ mt: 6, mb: 2, scrollMarginTop: '24px', borderBottom: '2px solid', borderColor: 'divider', pb: 1 }}>
      {children}
    </Typography>
  );
}

function SubSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Box sx={{ mb: 3 }}>
      <Typography variant="h6" fontWeight={600} sx={{ mb: 1.5 }}>{title}</Typography>
      {children}
    </Box>
  );
}

function Code({ children }: { children: string }) {
  return (
    <Paper
      sx={{
        p: 2, fontFamily: '"JetBrains Mono", "Fira Code", monospace', fontSize: '0.78rem', lineHeight: 1.7,
        bgcolor: '#0d1117', color: '#e6edf3', borderRadius: 1.5, overflow: 'auto',
        whiteSpace: 'pre', maxHeight: 600, mb: 2, border: '1px solid #30363d',
      }}
    >
      {children}
    </Paper>
  );
}

function Endpoint({ method, path, description }: { method: string; path: string; description: string }) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2, flexWrap: 'wrap' }}>
      <Chip label={method} size="small" color={method === 'GET' ? 'info' : 'primary'} sx={{ fontWeight: 700, fontFamily: 'monospace' }} />
      <Typography variant="body1" sx={{ fontFamily: 'monospace', fontWeight: 600 }}>{path}</Typography>
      <Typography variant="body2" color="text.secondary">-- {description}</Typography>
    </Box>
  );
}

function FieldTable({ fields }: { fields: { name: string; type: string; req: string; desc: string }[] }) {
  return (
    <TableContainer component={Paper} variant="outlined" sx={{ mb: 2 }}>
      <Table size="small">
        <TableHead>
          <TableRow sx={{ bgcolor: 'action.hover' }}>
            <TableCell sx={{ fontWeight: 700 }}>Field</TableCell>
            <TableCell sx={{ fontWeight: 700 }}>Type</TableCell>
            <TableCell sx={{ fontWeight: 700 }}>Required</TableCell>
            <TableCell sx={{ fontWeight: 700 }}>Description</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {fields.map((f) => (
            <TableRow key={f.name}>
              <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.78rem', fontWeight: 600 }}>{f.name}</TableCell>
              <TableCell sx={{ fontSize: '0.78rem' }}>{f.type}</TableCell>
              <TableCell>
                {f.req === 'Yes' ? <Chip label="Required" size="small" color="error" variant="outlined" sx={{ fontSize: '0.68rem' }} />
                  : f.req === 'Auto' ? <Chip label="Auto" size="small" color="success" variant="outlined" sx={{ fontSize: '0.68rem' }} />
                  : <Chip label="Optional" size="small" variant="outlined" sx={{ fontSize: '0.68rem' }} />}
              </TableCell>
              <TableCell sx={{ fontSize: '0.78rem' }}>{f.desc}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}

function UpsertInfo({ table, conflict, amounts, period }: { table: string; conflict: string; amounts: string; period: string }) {
  return (
    <TableContainer component={Paper} variant="outlined" sx={{ mb: 2 }}>
      <Table size="small">
        <TableBody>
          <TableRow><TableCell sx={{ fontWeight: 600, width: 180 }}>Target Table</TableCell><TableCell sx={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>{table}</TableCell></TableRow>
          <TableRow><TableCell sx={{ fontWeight: 600 }}>Unique Key (upsert)</TableCell><TableCell sx={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>{conflict}</TableCell></TableRow>
          <TableRow><TableCell sx={{ fontWeight: 600 }}>USD Auto-Converted</TableCell><TableCell sx={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>{amounts || 'None'}</TableCell></TableRow>
          <TableRow><TableCell sx={{ fontWeight: 600 }}>Period Field</TableCell><TableCell sx={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>{period || 'None'}</TableCell></TableRow>
        </TableBody>
      </Table>
    </TableContainer>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   Table of Contents
   ═══════════════════════════════════════════════════════════════════ */
function TOC({ activeId, onNavigate }: { activeId: string; onNavigate: (id: string) => void }) {
  return (
    <Box sx={{ py: 2, px: 1 }}>
      <Typography variant="caption" fontWeight={700} sx={{ px: 1.5, mb: 1.5, display: 'block', color: 'text.secondary', letterSpacing: 1 }}>
        INTEGRATION GUIDE
      </Typography>
      {SECTIONS.map((s) => (
        <Box
          key={s.id}
          onClick={() => onNavigate(s.id)}
          sx={{
            px: 1.5, py: 0.5, borderRadius: 1, cursor: 'pointer', fontSize: '0.76rem',
            fontWeight: activeId === s.id ? 600 : 400,
            color: activeId === s.id ? 'primary.main' : 'text.secondary',
            bgcolor: activeId === s.id ? 'action.selected' : 'transparent',
            borderLeft: activeId === s.id ? '3px solid' : '3px solid transparent',
            borderColor: activeId === s.id ? 'primary.main' : 'transparent',
            '&:hover': { bgcolor: 'action.hover' },
            transition: 'all 0.15s',
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          }}
        >
          {s.label}
        </Box>
      ))}
    </Box>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   MAIN PAGE
   ═══════════════════════════════════════════════════════════════════ */
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
      { root: contentEl, rootMargin: '-5% 0px -75% 0px', threshold: 0 },
    );
    SECTIONS.forEach((s) => { const el = document.getElementById(s.id); if (el) observer.observe(el); });
    return () => observer.disconnect();
  }, []);

  const scrollTo = useCallback((id: string) => {
    const el = document.getElementById(id);
    if (el) { el.scrollIntoView({ behavior: 'smooth', block: 'start' }); setActiveSection(id); setDrawerOpen(false); }
  }, []);

  const toc = <TOC activeId={activeSection} onNavigate={scrollTo} />;

  return (
    <Box sx={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      <Box sx={{ width: TOC_WIDTH, flexShrink: 0, borderRight: 1, borderColor: 'divider', overflowY: 'auto', display: { xs: 'none', md: 'block' } }}>{toc}</Box>
      <Drawer anchor="left" open={drawerOpen} onClose={() => setDrawerOpen(false)} sx={{ display: { md: 'none' } }}>
        <Box sx={{ width: TOC_WIDTH }}>{toc}</Box>
      </Drawer>

      <Box ref={contentRef} sx={{ flex: 1, overflowY: 'auto', px: { xs: 2, md: 5 }, py: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
          <IconButton onClick={() => setDrawerOpen(true)} sx={{ display: { md: 'none' } }}><MenuIcon /></IconButton>
          <Button startIcon={<ArrowBackIcon />} onClick={() => router.push('/dashboard')} size="small" sx={{ textTransform: 'none' }}>Dashboard</Button>
        </Box>

        <Box sx={{ maxWidth: 900 }}>

{/* ════════════════════════════════════════════════════════════════
   1. OVERVIEW
   ════════════════════════════════════════════════════════════════ */}
<SectionTitle id="overview">1. Overview</SectionTitle>
<Typography variant="body2" sx={{ mb: 2 }}>
  This guide provides complete technical documentation for subsidiaries to integrate their source systems (LOS, LMS, Collections) with the group-level lending portfolio dashboard. The integration uses authenticated REST API endpoints with automatic Zod schema validation, FX conversion to USD, idempotent upserts, and post-ingestion data quality checks.
</Typography>
<Alert severity="info" sx={{ mb: 2 }}>
  <strong>Before starting:</strong> Group HQ must complete your subsidiary registration (Phase 0 in Section 3). You will receive an API key and your subsidiary_id from the group data team.
</Alert>
<Alert severity="warning" sx={{ mb: 3 }}>
  <strong>All monetary values must be in your local currency.</strong> The API automatically converts to USD using centrally-managed FX rates. Never submit pre-converted USD values.
</Alert>

<SubSection title="Key Concepts">
  <List dense>
    <ListItem><ListItemIcon><InfoOutlinedIcon fontSize="small" /></ListItemIcon><ListItemText primary="subsidiary_id" secondary="Your unique numeric identifier in the system. All data you push must include this." /></ListItem>
    <ListItem><ListItemIcon><InfoOutlinedIcon fontSize="small" /></ListItemIcon><ListItemText primary="Period Format" secondary="All period fields use Mon'YY format (e.g., Apr'25, Dec'24, Jan'23). The first letter is uppercase, followed by two lowercase, then apostrophe and two-digit year." /></ListItem>
    <ListItem><ListItemIcon><InfoOutlinedIcon fontSize="small" /></ListItemIcon><ListItemText primary="DPD Buckets" secondary="Standard 7 values: Current, 1-30, 31-60, 61-90, 91-120, 120+, Write-off. These must be used exactly as written." /></ListItem>
    <ListItem><ListItemIcon><InfoOutlinedIcon fontSize="small" /></ListItemIcon><ListItemText primary="IFRS Stages" secondary="Standard 3 values: Stage 1, Stage 2, Stage 3. Case-sensitive, includes the space." /></ListItem>
    <ListItem><ListItemIcon><InfoOutlinedIcon fontSize="small" /></ListItemIcon><ListItemText primary="Idempotent Upserts" secondary="Re-submitting the same data is always safe. Rows are matched by UNIQUE key and updated in place. No duplicates are possible." /></ListItem>
    <ListItem><ListItemIcon><InfoOutlinedIcon fontSize="small" /></ListItemIcon><ListItemText primary="_usd columns" secondary="Every monetary column has a _usd companion (e.g., value → value_usd). These are auto-computed by the API. Never submit them." /></ListItem>
  </List>
</SubSection>

{/* ════════════════════════════════════════════════════════════════
   2. ARCHITECTURE
   ════════════════════════════════════════════════════════════════ */}
<SectionTitle id="architecture">2. Integration Architecture</SectionTitle>
<SubSection title="Integration Patterns">
  <TableContainer component={Paper} variant="outlined" sx={{ mb: 2 }}>
    <Table size="small">
      <TableHead><TableRow sx={{ bgcolor: 'action.hover' }}>
        <TableCell sx={{ fontWeight: 700 }}>Pattern</TableCell>
        <TableCell sx={{ fontWeight: 700 }}>Best For</TableCell>
        <TableCell sx={{ fontWeight: 700 }}>Mechanism</TableCell>
      </TableRow></TableHead>
      <TableBody>
        <TableRow>
          <TableCell><Chip label="A: API Push" size="small" color="primary" /> <Chip label="Recommended" size="small" color="success" sx={{ ml: 0.5 }} /></TableCell>
          <TableCell sx={{ fontSize: '0.8rem' }}>Subsidiaries with engineering teams or automated MIS exports</TableCell>
          <TableCell sx={{ fontSize: '0.8rem' }}>POST JSON payloads to REST API endpoints</TableCell>
        </TableRow>
        <TableRow>
          <TableCell><Chip label="B: File Upload" size="small" color="secondary" /></TableCell>
          <TableCell sx={{ fontSize: '0.8rem' }}>Teams that produce Excel/CSV MIS reports</TableCell>
          <TableCell sx={{ fontSize: '0.8rem' }}>Upload files via dashboard upload UI</TableCell>
        </TableRow>
        <TableRow>
          <TableCell><Chip label="C: Direct DB" size="small" variant="outlined" /></TableCell>
          <TableCell sx={{ fontSize: '0.8rem' }}>Advanced data engineering teams</TableCell>
          <TableCell sx={{ fontSize: '0.8rem' }}>Direct Supabase PostgREST API with scoped service key</TableCell>
        </TableRow>
      </TableBody>
    </Table>
  </TableContainer>
</SubSection>

<SubSection title="Data Flow (Pattern A)">
  <Code>{`Your Source System (LOS / LMS / Collections)
    |
    | Extract data, format as JSON
    v
POST /api/ingest/<endpoint>
    |
    v
[1] Authentication
    - Validate API key (SHA-256 hash lookup in api_keys table)
    - Check key is active and not expired
    - Extract subsidiary_id and currency_code from key
    |
    v
[2] Validation (Zod Schema)
    - Required fields present
    - Correct types (string, number, integer, boolean)
    - Enum values (DPD buckets, IFRS stages, product types)
    - Format checks (period = Mon'YY regex)
    - Range checks (non-negative amounts, DPD >= 0)
    |  FAIL → 400 with detailed field-level errors
    v
[3] Subsidiary Scope Check
    - Submitted subsidiary_id must match API key's subsidiary_id
    |  FAIL → 403 Forbidden
    v
[4] FX Conversion
    - Look up FX rate: fx_rates WHERE from_currency = your_currency
      AND to_currency = 'USD' AND effective_date <= period_end_date
    - Compute: field_usd = field * rate (rounded to 2 decimals)
    - Warning if rate > 30 days old
    |  FAIL → Error if no FX rate found
    v
[5] Batch Upsert
    - Add subsidiary_id to each row
    - INSERT ... ON CONFLICT (unique_key) DO UPDATE
    - 500 rows per batch (auto-chunked)
    |
    v
[6] Logging
    - Record in data_ingestion_log: batch_id, table, row_count, status
    - Update sync_watermarks: last_synced_at, last_period, row_count
    |
    v
[7] Data Quality Checks (async, non-blocking)
    - POST-01: Freshness (>45 days since last sync?)
    - POST-02: MoM anomaly (>50% change in Total AUM?)
    - Results stored in data_quality_results table
    |
    v
[8] Response
    { status: "ok", batchId, rowsUpserted, usdConversionRate, warnings }`}</Code>
</SubSection>

<SubSection title="Rate Limits">
  <Stack spacing={0.5}>
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      <WarningAmberIcon sx={{ fontSize: 16, color: 'warning.main' }} /><Typography variant="body2">100 requests per minute per API key</Typography>
    </Box>
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      <WarningAmberIcon sx={{ fontSize: 16, color: 'warning.main' }} /><Typography variant="body2">10,000 rows per request maximum</Typography>
    </Box>
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      <WarningAmberIcon sx={{ fontSize: 16, color: 'warning.main' }} /><Typography variant="body2">1 MB maximum payload size</Typography>
    </Box>
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      <WarningAmberIcon sx={{ fontSize: 16, color: 'warning.main' }} /><Typography variant="body2">500 rows per database batch (auto-chunked internally)</Typography>
    </Box>
  </Stack>
</SubSection>

{/* ════════════════════════════════════════════════════════════════
   3. ONBOARDING CHECKLIST
   ════════════════════════════════════════════════════════════════ */}
<SectionTitle id="onboarding">3. Onboarding Checklist</SectionTitle>
<SubSection title="Phase 0: Registration (Group HQ performs these steps)">
  <TableContainer component={Paper} variant="outlined" sx={{ mb: 2 }}>
    <Table size="small">
      <TableBody>
        {[
          ['0.1', 'Register subsidiary', 'INSERT into subsidiaries table: name, short_code (3-4 char uppercase, unique), country, country_code (2 char ISO), region_id (FK to regions), currency_code (3 char ISO), institution_type (Bank/NBFC/Digital Bank/NBFI), is_active=true'],
          ['0.2', 'Register currency', 'INSERT into currencies table if new currency: code, name, symbol. Then INSERT into fx_rates: from_currency=your_code, to_currency=USD, rate (USD per 1 local unit, e.g. INR: 0.012), effective_date'],
          ['0.3', 'Create data sources', 'INSERT into data_sources: one row per source system (source_type = LOS, LMS, or Collections), source_name = your internal system name'],
          ['0.4', 'Register products', 'INSERT into product_catalog: product_name (must match what you submit in metrics), product_category (consumer_finance / trade_finance / corporate_finance). UNIQUE(subsidiary_id, product_name)'],
          ['0.5', 'Issue API key', 'Generate key, store SHA-256 hash in api_keys table with subsidiary_id, scopes=[ingest], expires_at. Provide raw key to subsidiary securely.'],
          ['0.6', 'Set risk thresholds', 'INSERT into risk_appetite_settings: metric_key, scope_level=subsidiary, subsidiary_id, appetite (green zone target), tolerance (red zone threshold)'],
        ].map(([step, title, desc]) => (
          <TableRow key={step}>
            <TableCell sx={{ fontWeight: 700, width: 40, verticalAlign: 'top' }}>{step}</TableCell>
            <TableCell sx={{ fontWeight: 600, width: 160, fontSize: '0.8rem', verticalAlign: 'top' }}>{title}</TableCell>
            <TableCell sx={{ fontSize: '0.8rem' }}>{desc}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  </TableContainer>
</SubSection>

<SubSection title="Phase 1: Consumer Finance (Gets you on the dashboard)">
  <TableContainer component={Paper} variant="outlined" sx={{ mb: 2 }}>
    <Table size="small">
      <TableBody>
        {[
          ['1.1', 'Map your PQR/MIS fields to group standard metric names (see Section 5)'],
          ['1.2', 'POST to /api/ingest/consumer/overall with monthly KPIs for at least 3 periods'],
          ['1.3', 'POST to /api/ingest/consumer/products with per-product breakdowns'],
          ['1.4', 'Open dashboard → switch to your subsidiary scope → verify Consumer Finance > Overview shows your data'],
          ['1.5', 'Switch to Group scope → verify your subsidiary appears in group aggregations'],
        ].map(([step, desc]) => (
          <TableRow key={step}>
            <TableCell sx={{ fontWeight: 700, width: 40 }}>{step}</TableCell>
            <TableCell sx={{ fontSize: '0.8rem' }}>{desc}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  </TableContainer>
</SubSection>

<SubSection title="Phase 2+: Incremental (All optional)">
  <Stack spacing={0.5} sx={{ mb: 2 }}>
    {[
      'Phase 2: Extended consumer (net flow, roll rates, collections, vintage, LOS, non-starters, TDD, base) — Sections 7-14',
      'Phase 3: Trade Finance (facility-level data) — Section 15. Skip if no trade portfolio.',
      'Phase 4: Corporate Finance (metrics, covenants, delinquency, watchlist) — Sections 16-19. Skip if no corporate portfolio.',
      'Phase 5: Risk & Outlook (EWS entity summary + facility alerts) — Section 20',
    ].map((p) => (
      <Box key={p} sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
        <CheckCircleOutlineIcon sx={{ fontSize: 16, color: 'success.main', mt: 0.3 }} />
        <Typography variant="body2">{p}</Typography>
      </Box>
    ))}
  </Stack>
</SubSection>

{/* ════════════════════════════════════════════════════════════════
   4. AUTHENTICATION
   ════════════════════════════════════════════════════════════════ */}
<SectionTitle id="auth">4. Authentication</SectionTitle>
<Typography variant="body2" sx={{ mb: 2 }}>Every ingestion endpoint requires an API key. Include it in every request via one of these headers:</Typography>
<Code>{`# Option 1: Authorization header (recommended)
Authorization: Bearer sk_your_api_key_here

# Option 2: X-API-Key header
X-API-Key: sk_your_api_key_here`}</Code>

<SubSection title="Verify Your Key">
  <Endpoint method="POST" path="/api/ingest/auth" description="Validate API key and check scope" />
  <Code>{`# Request
POST /api/ingest/auth
Content-Type: application/json

{
  "api_key": "sk_your_api_key_here"
}

# Success Response (200)
{
  "subsidiary_id": 6,
  "scopes": ["ingest"],
  "message": "API key is valid. Use it in the Authorization: Bearer <key> or X-API-Key header for ingestion endpoints."
}

# Error Responses
# 400: { "error": "api_key is required" }
# 401: { "error": "Invalid API key" }
# 403: { "error": "API key is deactivated" }
# 403: { "error": "API key has expired" }`}</Code>
</SubSection>

<SubSection title="How Authentication Works Internally">
  <List dense>
    <ListItem><ListItemText primary="1. Your raw key is hashed with SHA-256" /></ListItem>
    <ListItem><ListItemText primary="2. Hash is looked up in the api_keys table" /></ListItem>
    <ListItem><ListItemText primary="3. Key must be is_active=true and expires_at > now()" /></ListItem>
    <ListItem><ListItemText primary="4. Your subsidiary must be is_active=true in the subsidiaries table" /></ListItem>
    <ListItem><ListItemText primary="5. The key's subsidiary_id is extracted and used for scope enforcement" /></ListItem>
    <ListItem><ListItemText primary="6. last_used_at is updated on every API call" /></ListItem>
  </List>
</SubSection>

<Alert severity="error" sx={{ mb: 3 }}>
  <strong>Scope enforcement:</strong> Your API key is locked to your subsidiary_id. If you submit data with a different subsidiary_id, the API returns <code>403: API key not authorized for subsidiary X. Key is scoped to subsidiary Y.</code>
</Alert>

{/* ════════════════════════════════════════════════════════════════
   5-14. CONSUMER ENDPOINTS
   ════════════════════════════════════════════════════════════════ */}

{/* --- 5. Consumer Overall Metrics --- */}
<SectionTitle id="api-consumer-overall">5. Consumer Overall Metrics</SectionTitle>
<Endpoint method="POST" path="/api/ingest/consumer/overall" description="Portfolio-level KPIs by period" />
<UpsertInfo table="consumer_overall_metrics" conflict="subsidiary_id, metric_type, metric, period" amounts="value → value_usd" period="period" />
<FieldTable fields={[
  { name: 'subsidiary_id', type: 'INTEGER', req: 'Yes', desc: 'Your subsidiary ID' },
  { name: 'metric_type', type: 'TEXT', req: 'Yes', desc: 'Category: Portfolio Performance, Delinquency, Origination, or Collections' },
  { name: 'metric', type: 'TEXT', req: 'Yes', desc: 'KPI name (see required values below)' },
  { name: 'period', type: 'TEXT', req: 'Yes', desc: "Mon'YY format (e.g., Apr'25)" },
  { name: 'value', type: 'NUMERIC', req: 'Yes', desc: 'Value in LOCAL CURRENCY (monetary) or as-is (percentages/counts). Can be null.' },
  { name: 'value_usd', type: 'NUMERIC', req: 'Auto', desc: 'Auto-computed. DO NOT SUBMIT.' },
  { name: 'benchmark', type: 'NUMERIC', req: 'No', desc: 'Optional target/benchmark value' },
  { name: 'data_source_id', type: 'INTEGER', req: 'No', desc: 'FK to data_sources table (which system produced this)' },
]} />

<Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>Required metric_type and metric values:</Typography>
<Code>{`metric_type: "Portfolio Performance"
  metrics:
    - "Total AUM"           (total assets under management, local currency)
    - "Active Accounts"     (count of live loans)
    - "Avg Ticket Size"     (average loan size, local currency)
    - "Weighted Avg Rate"   (portfolio weighted average interest rate, %)

metric_type: "Delinquency"
  metrics:
    - "FPD%"                (first payment default rate, %)
    - "30+ Amt%"            (% of portfolio >30 days past due by amount)
    - "60+ Amt%"            (% of portfolio >60 DPD by amount)
    - "90+ Amt%"            (% of portfolio >90 DPD by amount)
    - "Net Credit Loss"     (net credit loss amount, local currency)

metric_type: "Origination"
  metrics:
    - "Applications"        (count)
    - "Approvals"           (count)
    - "Disbursements"       (count)
    - "Disbursement Amount" (total disbursed, local currency)
    - "Approval Rate"       (%)
    - "Avg Processing Days" (days)

metric_type: "Collections"
  metrics:
    - "Collection Efficiency"  (%)
    - "Recovery Rate"          (%)
    - "Resolution Rate"        (%)
    - "Avg Resolution Days"    (days)`}</Code>

<Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1, mt: 2 }}>Field Mapping Example (if your MIS uses different names):</Typography>
<TableContainer component={Paper} variant="outlined" sx={{ mb: 2 }}>
  <Table size="small">
    <TableHead><TableRow sx={{ bgcolor: 'action.hover' }}>
      <TableCell sx={{ fontWeight: 700 }}>Your MIS Field</TableCell>
      <TableCell sx={{ fontWeight: 700 }}>Maps To</TableCell>
    </TableRow></TableHead>
    <TableBody>
      {[
        ['"Portfolio Outstanding"', 'metric_type="Portfolio Performance", metric="Total AUM"'],
        ['"No. of Live Loans"', 'metric_type="Portfolio Performance", metric="Active Accounts"'],
        ['"PAR 30" or "PAR30"', 'metric_type="Delinquency", metric="30+ Amt%"'],
        ['"PAR 90" or "PAR90"', 'metric_type="Delinquency", metric="90+ Amt%"'],
        ['"First Payment Default Rate"', 'metric_type="Delinquency", metric="FPD%"'],
        ['"Gross Write-off Rate"', 'metric_type="Delinquency", metric="Net Credit Loss"'],
        ['"CE Ratio"', 'metric_type="Collections", metric="Collection Efficiency"'],
      ].map(([from, to]) => (
        <TableRow key={from}>
          <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.78rem' }}>{from}</TableCell>
          <TableCell sx={{ fontSize: '0.78rem' }}>{to}</TableCell>
        </TableRow>
      ))}
    </TableBody>
  </Table>
</TableContainer>

<Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>Complete Example:</Typography>
<Code>{`POST /api/ingest/consumer/overall
Authorization: Bearer sk_abc123def456
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
      "metric_type": "Portfolio Performance",
      "metric": "Active Accounts",
      "period": "Apr'25",
      "value": 185000
    },
    {
      "metric_type": "Delinquency",
      "metric": "30+ Amt%",
      "period": "Apr'25",
      "value": 3.2,
      "benchmark": 3.0
    },
    {
      "metric_type": "Delinquency",
      "metric": "90+ Amt%",
      "period": "Apr'25",
      "value": 1.1,
      "benchmark": 1.5
    },
    {
      "metric_type": "Delinquency",
      "metric": "FPD%",
      "period": "Apr'25",
      "value": 2.8
    },
    {
      "metric_type": "Origination",
      "metric": "Disbursement Amount",
      "period": "Apr'25",
      "value": 1500000000
    },
    {
      "metric_type": "Collections",
      "metric": "Collection Efficiency",
      "period": "Apr'25",
      "value": 92.5
    }
  ]
}

# Success Response (200)
{
  "status": "ok",
  "batchId": "550e8400-e29b-41d4-a716-446655440000",
  "rowsUpserted": 7,
  "usdConversionRate": 0.012,
  "warnings": []
}

# Validation Error Response (400)
{
  "status": "error",
  "errors": [
    { "field": "rows.0.period", "message": "Invalid period format. Expected Mon'YY (e.g., Apr'25)" },
    { "field": "rows.2.metric", "message": "String must contain at least 1 character(s)" }
  ]
}`}</Code>

{/* --- 6. Consumer Product Metrics --- */}
<SectionTitle id="api-consumer-products">6. Consumer Product Metrics</SectionTitle>
<Endpoint method="POST" path="/api/ingest/consumer/products" description="Per-product KPI breakdowns" />
<UpsertInfo table="consumer_product_metrics" conflict="subsidiary_id, product_name, metric_type, metric, period" amounts="value → value_usd" period="period" />
<Typography variant="body2" sx={{ mb: 1 }}>Same schema as consumer_overall_metrics, plus a required <code>product_name</code> field. The product_name must match a product registered in <code>product_catalog</code> for your subsidiary.</Typography>
<FieldTable fields={[
  { name: 'subsidiary_id', type: 'INTEGER', req: 'Yes', desc: 'Your subsidiary ID' },
  { name: 'product_name', type: 'TEXT', req: 'Yes', desc: 'Must match product_catalog entry (e.g., "Home Loan", "Personal Loan")' },
  { name: 'metric_type', type: 'TEXT', req: 'Yes', desc: 'Same categories as overall metrics' },
  { name: 'metric', type: 'TEXT', req: 'Yes', desc: 'Same KPI names as overall metrics' },
  { name: 'period', type: 'TEXT', req: 'Yes', desc: "Mon'YY format" },
  { name: 'value', type: 'NUMERIC', req: 'Yes', desc: 'Value in local currency. Can be null.' },
  { name: 'benchmark', type: 'NUMERIC', req: 'No', desc: 'Optional target' },
  { name: 'data_source_id', type: 'INTEGER', req: 'No', desc: 'FK to data_sources' },
]} />
<Code>{`POST /api/ingest/consumer/products
Authorization: Bearer sk_abc123def456
Content-Type: application/json

{
  "subsidiary_id": 6,
  "rows": [
    {
      "product_name": "Home Loan",
      "metric_type": "Portfolio Performance",
      "metric": "Total AUM",
      "period": "Apr'25",
      "value": 15000000000
    },
    {
      "product_name": "Personal Loan",
      "metric_type": "Delinquency",
      "metric": "30+ Amt%",
      "period": "Apr'25",
      "value": 4.5
    }
  ]
}`}</Code>

{/* --- 7. Net Flow Rates --- */}
<SectionTitle id="api-consumer-netflow">7. Net Flow Rates</SectionTitle>
<Endpoint method="POST" path="/api/ingest/consumer/net-flow" description="Portfolio flow analysis by DPD bucket" />
<UpsertInfo table="net_flow_rates" conflict="subsidiary_id, portfolio, bucket, period" amounts="value → value_usd" period="period" />
<FieldTable fields={[
  { name: 'subsidiary_id', type: 'INTEGER', req: 'Yes', desc: 'Your subsidiary ID' },
  { name: 'portfolio', type: 'TEXT', req: 'Yes', desc: 'Portfolio segment (e.g., "Overall", "Secured", "Unsecured", or product name)' },
  { name: 'bucket', type: 'ENUM', req: 'Yes', desc: 'Current | 1-30 | 31-60 | 61-90 | 91-120 | 120+ | Write-off' },
  { name: 'period', type: 'TEXT', req: 'Yes', desc: "Mon'YY format" },
  { name: 'value', type: 'NUMERIC', req: 'Yes', desc: 'Net flow rate (percentage or amount). Can be null.' },
]} />
<Code>{`{
  "subsidiary_id": 6,
  "rows": [
    { "portfolio": "Overall", "bucket": "Current", "period": "Apr'25", "value": 85.2 },
    { "portfolio": "Overall", "bucket": "1-30", "period": "Apr'25", "value": 6.3 },
    { "portfolio": "Overall", "bucket": "31-60", "period": "Apr'25", "value": 3.1 }
  ]
}`}</Code>

{/* --- 8. Roll Rate Series --- */}
<SectionTitle id="api-consumer-rollrates">8. Roll Rate Series</SectionTitle>
<Endpoint method="POST" path="/api/ingest/consumer/roll-rates" description="DPD roll rate trends over time" />
<UpsertInfo table="roll_rate_series" conflict="subsidiary_id, bucket, metric, period" amounts="None" period="period" />
<FieldTable fields={[
  { name: 'subsidiary_id', type: 'INTEGER', req: 'Yes', desc: 'Your subsidiary ID' },
  { name: 'bucket', type: 'ENUM', req: 'Yes', desc: 'Current | 1-30 | 31-60 | 61-90 | 91-120 | 120+ | Write-off' },
  { name: 'metric', type: 'TEXT', req: 'Yes', desc: '"Roll Forward", "Roll Backward", "Stabilized", "Resolution", "Norm", "Stab"' },
  { name: 'period', type: 'TEXT', req: 'Yes', desc: "Mon'YY format" },
  { name: 'value', type: 'NUMERIC', req: 'Yes', desc: 'Percentage value. Can be null.' },
]} />
<Code>{`{
  "subsidiary_id": 6,
  "rows": [
    { "bucket": "1-30", "metric": "Roll Forward", "period": "Apr'25", "value": 15.2 },
    { "bucket": "1-30", "metric": "Roll Backward", "period": "Apr'25", "value": 45.8 },
    { "bucket": "1-30", "metric": "Stabilized", "period": "Apr'25", "value": 39.0 }
  ]
}`}</Code>

{/* --- 9. Collection Metrics --- */}
<SectionTitle id="api-consumer-collections">9. Collection Metrics</SectionTitle>
<Endpoint method="POST" path="/api/ingest/consumer/collections" description="Collection efficiency by portfolio and bucket" />
<UpsertInfo table="collection_metrics" conflict="subsidiary_id, portfolio, bucket, period" amounts="amount → amount_usd" period="period" />
<FieldTable fields={[
  { name: 'subsidiary_id', type: 'INTEGER', req: 'Yes', desc: 'Your subsidiary ID' },
  { name: 'portfolio', type: 'TEXT', req: 'Yes', desc: 'Portfolio segment' },
  { name: 'bucket', type: 'ENUM', req: 'Yes', desc: 'Current | 1-30 | 31-60 | 61-90 | 91-120 | 120+ | Write-off' },
  { name: 'amount', type: 'NUMERIC', req: 'Yes', desc: 'Outstanding amount in local currency (>= 0)' },
  { name: 'transitions', type: 'NUMERIC', req: 'No', desc: 'Transition count' },
  { name: 'normalized', type: 'NUMERIC', req: 'No', desc: 'Normalized value' },
  { name: 'roll_backward', type: 'NUMERIC', req: 'No', desc: 'Roll backward percentage' },
  { name: 'stabilized', type: 'NUMERIC', req: 'No', desc: 'Stabilized percentage' },
  { name: 'roll_forward', type: 'NUMERIC', req: 'No', desc: 'Roll forward percentage' },
  { name: 'period', type: 'TEXT', req: 'Yes', desc: "Mon'YY format" },
]} />

{/* --- 10. Vintage Analysis --- */}
<SectionTitle id="api-consumer-vintage">10. Vintage Analysis</SectionTitle>
<Endpoint method="POST" path="/api/ingest/consumer/vintage" description="Static pool delinquency analysis by vintage cohort" />
<UpsertInfo table="vintage_points" conflict="subsidiary_id, vintage, mob, metric_type, portfolio_segment, product_name" amounts="loan_amount → loan_amount_usd" period="None" />
<FieldTable fields={[
  { name: 'subsidiary_id', type: 'INTEGER', req: 'Yes', desc: 'Your subsidiary ID' },
  { name: 'vintage', type: 'TEXT', req: 'Yes', desc: "Disbursement cohort month (e.g., Jan'22)" },
  { name: 'portfolio_segment', type: 'TEXT', req: 'Yes', desc: 'Segment name (e.g., "Overall", "Secured")' },
  { name: 'product_name', type: 'TEXT', req: 'Yes', desc: 'Product name or "All"' },
  { name: 'loan_amount', type: 'NUMERIC', req: 'Yes', desc: 'Total disbursement in cohort (local currency, >= 0)' },
  { name: 'mob', type: 'INTEGER', req: 'Yes', desc: 'Months-on-book (0, 1, 2, ... up to current age)' },
  { name: 'delinquency_rate', type: 'NUMERIC', req: 'Yes', desc: 'Delinquency rate at this MOB (percentage)' },
  { name: 'metric_type', type: 'TEXT', req: 'Yes', desc: '"30+ DPD", "60+ DPD", "90+ DPD"' },
]} />
<Code>{`{
  "subsidiary_id": 6,
  "rows": [
    { "vintage": "Jan'23", "portfolio_segment": "Overall", "product_name": "All", "loan_amount": 500000000, "mob": 0, "delinquency_rate": 0.0, "metric_type": "30+ DPD" },
    { "vintage": "Jan'23", "portfolio_segment": "Overall", "product_name": "All", "loan_amount": 500000000, "mob": 1, "delinquency_rate": 0.5, "metric_type": "30+ DPD" },
    { "vintage": "Jan'23", "portfolio_segment": "Overall", "product_name": "All", "loan_amount": 500000000, "mob": 6, "delinquency_rate": 1.8, "metric_type": "30+ DPD" }
  ]
}`}</Code>

{/* --- 11. LOS Metrics --- */}
<SectionTitle id="api-consumer-los">11. LOS Metrics (Origination)</SectionTitle>
<Endpoint method="POST" path="/api/ingest/consumer/los" description="Loan origination metrics, funnel, and daily data" />
<Alert severity="info" sx={{ mb: 2 }}>This endpoint handles 3 sub-types via the <code>type</code> field: <code>&quot;metrics&quot;</code>, <code>&quot;funnel&quot;</code>, or <code>&quot;daily&quot;</code>.</Alert>

<Accordion variant="outlined" sx={{ mb: 1 }}>
  <AccordionSummary expandIcon={<ExpandMoreIcon />}><Typography fontWeight={600}>type: &quot;metrics&quot; -- LOS Comparison Metrics</Typography></AccordionSummary>
  <AccordionDetails>
    <UpsertInfo table="los_metrics" conflict="subsidiary_id, metric, product, report_date" amounts="ftd, mtd, lmtd, lm_full → _usd" period="report_date" />
    <FieldTable fields={[
      { name: 'metric', type: 'TEXT', req: 'Yes', desc: 'KPI name (e.g., "Applications", "Disbursements", "Approval Rate")' },
      { name: 'product', type: 'TEXT', req: 'Yes', desc: 'Product name or "All"' },
      { name: 'ftd', type: 'NUMERIC', req: 'No', desc: 'Financial-to-date value' },
      { name: 'mtd', type: 'NUMERIC', req: 'No', desc: 'Month-to-date value' },
      { name: 'lmtd', type: 'NUMERIC', req: 'No', desc: 'Last-month-to-date value' },
      { name: 'lm_full', type: 'NUMERIC', req: 'No', desc: 'Last month full value' },
      { name: 'mom_change', type: 'NUMERIC', req: 'No', desc: 'Month-over-month change (%)' },
      { name: 'target', type: 'NUMERIC', req: 'No', desc: 'Target value' },
      { name: 'achievement', type: 'NUMERIC', req: 'No', desc: 'Achievement percentage' },
      { name: 'report_date', type: 'TEXT', req: 'Yes', desc: 'Reporting date (YYYY-MM-DD)' },
    ]} />
  </AccordionDetails>
</Accordion>

<Accordion variant="outlined" sx={{ mb: 1 }}>
  <AccordionSummary expandIcon={<ExpandMoreIcon />}><Typography fontWeight={600}>type: &quot;funnel&quot; -- Origination Funnel</Typography></AccordionSummary>
  <AccordionDetails>
    <UpsertInfo table="los_funnel" conflict="subsidiary_id, stage, product, report_date" amounts="ftd, mtd, lmtd → _usd" period="report_date" />
    <FieldTable fields={[
      { name: 'stage', type: 'TEXT', req: 'Yes', desc: '"Lead", "Application", "Underwriting", "Sanction", "Disbursement"' },
      { name: 'product', type: 'TEXT', req: 'Yes', desc: 'Product name or "All"' },
      { name: 'ftd', type: 'NUMERIC', req: 'No', desc: 'Count/amount FTD' },
      { name: 'mtd', type: 'NUMERIC', req: 'No', desc: 'Count/amount MTD' },
      { name: 'lmtd', type: 'NUMERIC', req: 'No', desc: 'Count/amount LMTD' },
      { name: 'conversion_rate', type: 'NUMERIC', req: 'No', desc: 'Stage conversion rate (%)' },
      { name: 'report_date', type: 'TEXT', req: 'Yes', desc: 'YYYY-MM-DD' },
    ]} />
  </AccordionDetails>
</Accordion>

<Accordion variant="outlined" sx={{ mb: 1 }}>
  <AccordionSummary expandIcon={<ExpandMoreIcon />}><Typography fontWeight={600}>type: &quot;daily&quot; -- Daily Disbursements</Typography></AccordionSummary>
  <AccordionDetails>
    <UpsertInfo table="los_daily" conflict="subsidiary_id, date, product" amounts="amount, avg_ticket_size → _usd" period="date" />
    <FieldTable fields={[
      { name: 'date', type: 'TEXT', req: 'Yes', desc: 'Calendar date (YYYY-MM-DD)' },
      { name: 'product', type: 'TEXT', req: 'Yes', desc: 'Product name or "All"' },
      { name: 'count', type: 'INTEGER', req: 'Yes', desc: 'Number of loans (>= 0)' },
      { name: 'amount', type: 'NUMERIC', req: 'Yes', desc: 'Total amount in local currency (>= 0)' },
      { name: 'avg_ticket_size', type: 'NUMERIC', req: 'No', desc: 'Average loan size in local currency' },
    ]} />
  </AccordionDetails>
</Accordion>

<Code>{`# Example: LOS Metrics
POST /api/ingest/consumer/los
Authorization: Bearer sk_abc123def456
Content-Type: application/json

{
  "subsidiary_id": 6,
  "type": "metrics",
  "rows": [
    {
      "metric": "Disbursements",
      "product": "All",
      "ftd": 45000000,
      "mtd": 120000000,
      "lmtd": 110000000,
      "lm_full": 280000000,
      "mom_change": 9.1,
      "target": 300000000,
      "achievement": 42.9,
      "report_date": "2025-04-15"
    }
  ]
}`}</Code>

{/* --- 12. Non-Starters --- */}
<SectionTitle id="api-consumer-nonstarters">12. Non-Starters</SectionTitle>
<Endpoint method="POST" path="/api/ingest/consumer/non-starters" description="First/second/third payment default analysis" />
<UpsertInfo table="non_starters" conflict="subsidiary_id, category, product, metric, period" amounts="value → value_usd" period="period" />
<FieldTable fields={[
  { name: 'subsidiary_id', type: 'INTEGER', req: 'Yes', desc: 'Your subsidiary ID' },
  { name: 'category', type: 'TEXT', req: 'Yes', desc: '"FPD" (first payment default), "SPD" (second), "TPD" (third)' },
  { name: 'product', type: 'TEXT', req: 'Yes', desc: 'Product name or "All"' },
  { name: 'metric', type: 'TEXT', req: 'Yes', desc: 'KPI name (e.g., "Facility in Force (#)", "Facility in Force ($)")' },
  { name: 'period', type: 'TEXT', req: 'Yes', desc: "Mon'YY format" },
  { name: 'value', type: 'NUMERIC', req: 'Yes', desc: 'Value (can be null)' },
]} />

{/* --- 13. TDD --- */}
<SectionTitle id="api-consumer-tdd">13. TDD Pre/Post Disbursal</SectionTitle>
<Endpoint method="POST" path="/api/ingest/consumer/tdd" description="Target demographic data for due diligence" />
<Alert severity="info" sx={{ mb: 2 }}>Set <code>type</code> to <code>&quot;pre&quot;</code> or <code>&quot;post&quot;</code>.</Alert>

<Accordion variant="outlined" sx={{ mb: 1 }}>
  <AccordionSummary expandIcon={<ExpandMoreIcon />}><Typography fontWeight={600}>type: &quot;pre&quot; -- Pre-Disbursal TDD</Typography></AccordionSummary>
  <AccordionDetails>
    <UpsertInfo table="tdd_pre_disbursal" conflict="subsidiary_id, metric, period" amounts="None" period="period" />
    <FieldTable fields={[
      { name: 'metric', type: 'TEXT', req: 'Yes', desc: 'TDD metric name' },
      { name: 'period', type: 'TEXT', req: 'Yes', desc: "Mon'YY format" },
      { name: 'value', type: 'NUMERIC', req: 'Yes', desc: 'Value (can be null)' },
    ]} />
  </AccordionDetails>
</Accordion>

<Accordion variant="outlined" sx={{ mb: 1 }}>
  <AccordionSummary expandIcon={<ExpandMoreIcon />}><Typography fontWeight={600}>type: &quot;post&quot; -- Post-Disbursal TDD</Typography></AccordionSummary>
  <AccordionDetails>
    <UpsertInfo table="tdd_post_disbursal" conflict="subsidiary_id, variant, bureau_bucket, period" amounts="None" period="period" />
    <FieldTable fields={[
      { name: 'variant', type: 'ENUM', req: 'Yes', desc: '"Fresh" | "Renewal" | "Topup"' },
      { name: 'bureau_bucket', type: 'TEXT', req: 'Yes', desc: 'Bureau score bucket' },
      { name: 'period', type: 'TEXT', req: 'Yes', desc: "Mon'YY format" },
      { name: 'value', type: 'NUMERIC', req: 'Yes', desc: 'Value (can be null)' },
    ]} />
  </AccordionDetails>
</Accordion>

{/* --- 14. Approved/Rejected Base --- */}
<SectionTitle id="api-consumer-base">14. Approved/Rejected Base</SectionTitle>
<Endpoint method="POST" path="/api/ingest/consumer/base" description="Approval/rejection analysis by credit and loan bands" />
<Alert severity="info" sx={{ mb: 2 }}>Set <code>type</code> to <code>&quot;approved&quot;</code> or <code>&quot;rejected&quot;</code>.</Alert>

<Accordion variant="outlined" sx={{ mb: 1 }}>
  <AccordionSummary expandIcon={<ExpandMoreIcon />}><Typography fontWeight={600}>type: &quot;approved&quot;</Typography></AccordionSummary>
  <AccordionDetails>
    <UpsertInfo table="approved_base" conflict="subsidiary_id, la_band, loan_band" amounts="amount → amount_usd" period="None" />
    <FieldTable fields={[
      { name: 'la_band', type: 'TEXT', req: 'Yes', desc: 'Credit score / LA band (e.g., "700-750", "750-800")' },
      { name: 'loan_band', type: 'TEXT', req: 'Yes', desc: 'Loan amount band (e.g., "0-50K", "50K-100K")' },
      { name: 'count', type: 'INTEGER', req: 'Yes', desc: 'Number of loans (>= 0)' },
      { name: 'amount', type: 'NUMERIC', req: 'Yes', desc: 'Total amount in local currency (>= 0)' },
    ]} />
  </AccordionDetails>
</Accordion>

<Accordion variant="outlined" sx={{ mb: 1 }}>
  <AccordionSummary expandIcon={<ExpandMoreIcon />}><Typography fontWeight={600}>type: &quot;rejected&quot;</Typography></AccordionSummary>
  <AccordionDetails>
    <UpsertInfo table="rejected_base" conflict="subsidiary_id, loan_type, amount_band" amounts="amount → amount_usd" period="None" />
    <FieldTable fields={[
      { name: 'loan_type', type: 'TEXT', req: 'Yes', desc: 'Loan type category' },
      { name: 'amount_band', type: 'TEXT', req: 'Yes', desc: 'Amount band' },
      { name: 'count', type: 'INTEGER', req: 'Yes', desc: 'Number of rejections (>= 0)' },
      { name: 'amount', type: 'NUMERIC', req: 'Yes', desc: 'Total amount in local currency (>= 0)' },
    ]} />
  </AccordionDetails>
</Accordion>

{/* ════════════════════════════════════════════════════════════════
   15. TRADE FACILITIES
   ════════════════════════════════════════════════════════════════ */}
<SectionTitle id="api-trade">15. Trade Facilities</SectionTitle>
<Alert severity="info" sx={{ mb: 2 }}>Skip this section entirely if your subsidiary does not have a trade finance portfolio. The dashboard handles missing portfolios gracefully.</Alert>
<Endpoint method="POST" path="/api/ingest/trade/facilities" description="Facility-level trade finance data" />
<UpsertInfo table="trade_facilities" conflict="subsidiary_id, facility_reference" amounts="facility_limit, outstanding, prev_month_outstanding, provision_amount, collateral_value → _usd" period="report_date" />
<FieldTable fields={[
  { name: 'subsidiary_id', type: 'INTEGER', req: 'Yes', desc: 'Your subsidiary ID' },
  { name: 'facility_reference', type: 'TEXT', req: 'Yes', desc: 'Unique facility ID within your subsidiary' },
  { name: 'obligor_name', type: 'TEXT', req: 'Yes', desc: 'Borrower/obligor name' },
  { name: 'product_type', type: 'ENUM', req: 'Yes', desc: 'See allowed values below' },
  { name: 'currency', type: 'TEXT', req: 'Yes', desc: '3-letter currency code (e.g., USD, INR, PKR)' },
  { name: 'facility_limit', type: 'NUMERIC', req: 'Yes', desc: 'Approved facility limit (local currency, >= 0)' },
  { name: 'outstanding', type: 'NUMERIC', req: 'Yes', desc: 'Current outstanding balance (local currency, >= 0)' },
  { name: 'report_date', type: 'TEXT', req: 'Yes', desc: 'As-of date (YYYY-MM-DD)' },
  { name: 'sector', type: 'TEXT', req: 'No', desc: 'Industry sector' },
  { name: 'commodity', type: 'TEXT', req: 'No', desc: 'Traded commodity' },
  { name: 'prev_month_outstanding', type: 'NUMERIC', req: 'No', desc: 'Previous month outstanding' },
  { name: 'tenor_days', type: 'INTEGER', req: 'No', desc: 'Facility tenor in days' },
  { name: 'start_date', type: 'TEXT', req: 'No', desc: 'Start date (YYYY-MM-DD)' },
  { name: 'maturity_date', type: 'TEXT', req: 'No', desc: 'Maturity date (YYYY-MM-DD)' },
  { name: 'internal_rating', type: 'TEXT', req: 'No', desc: 'Internal credit rating' },
  { name: 'external_rating', type: 'TEXT', req: 'No', desc: 'External credit rating' },
  { name: 'days_past_due', type: 'INTEGER', req: 'No', desc: 'Days past due (>= 0, default 0)' },
  { name: 'ifrs9_stage', type: 'ENUM', req: 'No', desc: '"Stage 1" | "Stage 2" | "Stage 3"' },
  { name: 'provision_rate', type: 'NUMERIC', req: 'No', desc: 'Provision coverage rate' },
  { name: 'provision_amount', type: 'NUMERIC', req: 'No', desc: 'Provision amount (local currency)' },
  { name: 'collateral_value', type: 'NUMERIC', req: 'No', desc: 'Collateral value (local currency)' },
  { name: 'collateral_coverage', type: 'NUMERIC', req: 'No', desc: 'Collateral coverage ratio' },
  { name: 'risk_weight', type: 'NUMERIC', req: 'No', desc: 'Risk weight' },
  { name: 'counterparty_bank', type: 'TEXT', req: 'No', desc: 'Counterparty bank name (can be null)' },
  { name: 'watchlist_flag', type: 'BOOLEAN', req: 'No', desc: 'true if on watchlist' },
  { name: 'ews_score', type: 'NUMERIC', req: 'No', desc: 'Early warning score (0-10)' },
  { name: 'ews_triggers', type: 'TEXT[]', req: 'No', desc: 'Array of trigger descriptions' },
]} />
<Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>Allowed product_type values (exactly one of):</Typography>
<Code>{`"Import LC"
"Export LC"
"Bank Guarantee - Performance"
"Bank Guarantee - Financial"
"Trade Loan - Pre-Export"
"Trade Loan - Post-Import"
"SBLC"
"Forfaiting"
"Documentary Collection - D/P"
"Documentary Collection - D/A"`}</Code>

{/* ════════════════════════════════════════════════════════════════
   16-19. CORPORATE ENDPOINTS
   ════════════════════════════════════════════════════════════════ */}
<SectionTitle id="api-corporate-metrics">16. Corporate Portfolio Metrics</SectionTitle>
<Alert severity="info" sx={{ mb: 2 }}>Skip Sections 16-19 if your subsidiary does not have a corporate lending portfolio.</Alert>
<Endpoint method="POST" path="/api/ingest/corporate/metrics" description="Time-series corporate KPIs by period" />
<UpsertInfo table="corporate_portfolio_metrics" conflict="subsidiary_id, particular, period" amounts="total, fund_based, non_fund_based → _usd" period="period" />
<FieldTable fields={[
  { name: 'subsidiary_id', type: 'INTEGER', req: 'Yes', desc: 'Your subsidiary ID' },
  { name: 'particular', type: 'TEXT', req: 'Yes', desc: 'Metric name (e.g., "Total Sanctioned Limit", "Total Disbursement", "Total POS")' },
  { name: 'period', type: 'TEXT', req: 'Yes', desc: "Mon'YY format" },
  { name: 'total', type: 'NUMERIC', req: 'Yes', desc: 'Total value in local currency (can be null)' },
  { name: 'fund_based', type: 'NUMERIC', req: 'No', desc: 'Fund-based component' },
  { name: 'non_fund_based', type: 'NUMERIC', req: 'No', desc: 'Non-fund-based component' },
]} />

<SectionTitle id="api-corporate-covenants">17. Corporate Covenants</SectionTitle>
<Endpoint method="POST" path="/api/ingest/corporate/covenants" description="Covenant tracking with breach monitoring" />
<UpsertInfo table="corporate_covenants" conflict="subsidiary_id, group_id, cust_id, covenant_category, covenant_type" amounts="sanctioned_limit, disbursed_amount, current_pos → _usd" period="None" />
<FieldTable fields={[
  { name: 'subsidiary_id', type: 'INTEGER', req: 'Yes', desc: 'Your subsidiary ID' },
  { name: 'group_id', type: 'TEXT', req: 'Yes', desc: 'Borrower group identifier' },
  { name: 'cust_id', type: 'TEXT', req: 'Yes', desc: 'Customer identifier' },
  { name: 'customer_name', type: 'TEXT', req: 'Yes', desc: 'Customer/borrower name' },
  { name: 'sanctioned_limit', type: 'NUMERIC', req: 'Yes', desc: 'Sanctioned limit (local currency, >= 0)' },
  { name: 'disbursed_amount', type: 'NUMERIC', req: 'Yes', desc: 'Disbursed amount (local currency, >= 0)' },
  { name: 'current_pos', type: 'NUMERIC', req: 'Yes', desc: 'Current principal outstanding (local currency, >= 0)' },
  { name: 'covenant_category', type: 'TEXT', req: 'Yes', desc: 'Category (e.g., "Financial", "Non-Financial", "Reporting")' },
  { name: 'covenant_type', type: 'TEXT', req: 'Yes', desc: 'Specific covenant type' },
  { name: 'date_of_disbursal', type: 'TEXT', req: 'No', desc: 'Disbursal date' },
  { name: 'facility_type', type: 'TEXT', req: 'No', desc: 'Facility type' },
  { name: 'security_type', type: 'TEXT', req: 'No', desc: 'Security/collateral type' },
  { name: 'security_cover', type: 'NUMERIC', req: 'No', desc: 'Security cover ratio' },
  { name: 'risk_rating', type: 'TEXT', req: 'No', desc: 'Internal risk rating' },
  { name: 'covenant_description', type: 'TEXT', req: 'No', desc: 'Description of covenant' },
  { name: 'covenant_frequency', type: 'TEXT', req: 'No', desc: 'Review frequency' },
  { name: 'submission_date', type: 'TEXT', req: 'No', desc: 'Last submission date' },
  { name: 'creation_date', type: 'TEXT', req: 'No', desc: 'Covenant creation date' },
  { name: 'breached', type: 'BOOLEAN', req: 'No', desc: 'true if covenant is breached' },
  { name: 'days_since_breach', type: 'INTEGER', req: 'No', desc: 'Days since breach began' },
  { name: 'npa_flag', type: 'BOOLEAN', req: 'No', desc: 'NPA flag' },
  { name: 'restructured_flag', type: 'BOOLEAN', req: 'No', desc: 'Restructured flag' },
  { name: 'watchlist_flag', type: 'BOOLEAN', req: 'No', desc: 'Watchlist flag' },
  { name: 'writeoff_flag', type: 'BOOLEAN', req: 'No', desc: 'Write-off flag' },
  { name: 'rm_name', type: 'TEXT', req: 'No', desc: 'Relationship manager name' },
  { name: 'rm_email', type: 'TEXT', req: 'No', desc: 'RM email' },
  { name: 'rm_phone', type: 'TEXT', req: 'No', desc: 'RM phone' },
  { name: 'rm_department', type: 'TEXT', req: 'No', desc: 'RM department' },
]} />

<SectionTitle id="api-corporate-delinquency">18. Corporate Delinquency</SectionTitle>
<Endpoint method="POST" path="/api/ingest/corporate/delinquency" description="Delinquent corporate accounts with remedial actions" />
<UpsertInfo table="corporate_delinquency" conflict="subsidiary_id, group_id, cust_id" amounts="sanctioned_limit, disbursed_amount, current_pos → _usd" period="None" />
<FieldTable fields={[
  { name: 'subsidiary_id', type: 'INTEGER', req: 'Yes', desc: 'Your subsidiary ID' },
  { name: 'group_id', type: 'TEXT', req: 'Yes', desc: 'Borrower group identifier' },
  { name: 'cust_id', type: 'TEXT', req: 'Yes', desc: 'Customer identifier' },
  { name: 'customer_name', type: 'TEXT', req: 'Yes', desc: 'Customer name' },
  { name: 'sanctioned_limit', type: 'NUMERIC', req: 'Yes', desc: 'Sanctioned limit (>= 0)' },
  { name: 'disbursed_amount', type: 'NUMERIC', req: 'Yes', desc: 'Disbursed amount (>= 0)' },
  { name: 'current_pos', type: 'NUMERIC', req: 'Yes', desc: 'Current POS (>= 0)' },
  { name: 'sector', type: 'TEXT', req: 'No', desc: 'Industry sector' },
  { name: 'industry', type: 'TEXT', req: 'No', desc: 'Industry sub-sector' },
  { name: 'facility_type', type: 'TEXT', req: 'No', desc: 'Facility type' },
  { name: 'security_type', type: 'TEXT', req: 'No', desc: 'Security type' },
  { name: 'security_cover', type: 'NUMERIC', req: 'No', desc: 'Security cover ratio' },
  { name: 'rating_at_disbursement', type: 'TEXT', req: 'No', desc: 'Rating at disbursement' },
  { name: 'current_rating', type: 'TEXT', req: 'No', desc: 'Current rating' },
  { name: 'renewal_done', type: 'BOOLEAN', req: 'No', desc: 'Whether renewal is done' },
  { name: 'dpd_at_month_end', type: 'INTEGER', req: 'No', desc: 'DPD at month end (>= 0)' },
  { name: 'current_dpd', type: 'INTEGER', req: 'No', desc: 'Current DPD (>= 0)' },
  { name: 'reason_for_delinquency', type: 'TEXT', req: 'No', desc: 'Reason for delinquency' },
  { name: 'last_remedial_action', type: 'TEXT', req: 'No', desc: 'Last remedial action taken' },
  { name: 'update_on_remedial', type: 'TEXT', req: 'No', desc: 'Status update on remedial' },
  { name: 'current_status', type: 'TEXT', req: 'No', desc: 'Current account status' },
  { name: 'next_step', type: 'TEXT', req: 'No', desc: 'Next planned action' },
]} />

<SectionTitle id="api-corporate-watchlist">19. Corporate Watchlist</SectionTitle>
<Endpoint method="POST" path="/api/ingest/corporate/watchlist" description="Monitored corporate borrowers" />
<UpsertInfo table="corporate_watchlist" conflict="subsidiary_id, borrower" amounts="exposure → exposure_usd" period="None" />
<FieldTable fields={[
  { name: 'subsidiary_id', type: 'INTEGER', req: 'Yes', desc: 'Your subsidiary ID' },
  { name: 'borrower', type: 'TEXT', req: 'Yes', desc: 'Borrower name (unique per subsidiary)' },
  { name: 'sector', type: 'TEXT', req: 'No', desc: 'Industry sector' },
  { name: 'exposure', type: 'NUMERIC', req: 'Yes', desc: 'Total exposure in local currency (>= 0)' },
  { name: 'ews_trigger_type', type: 'TEXT', req: 'No', desc: 'EWS trigger category' },
  { name: 'trigger_category', type: 'TEXT', req: 'No', desc: "'Financial' | 'Operational' | 'External' | 'Behavioral' — classifies the watchlist trigger" },
  { name: 'internal_rating', type: 'TEXT', req: 'No', desc: 'Internal rating' },
  { name: 'prior_rating', type: 'TEXT', req: 'No', desc: 'Previous internal rating before deterioration' },
  { name: 'status', type: 'TEXT', req: 'No', desc: 'Watchlist status' },
  { name: 'remedial_action', type: 'TEXT', req: 'No', desc: 'Remedial action' },
  { name: 'date_added', type: 'TEXT', req: 'No', desc: 'Date borrower was added to watchlist (YYYY-MM-DD)' },
  { name: 'days_on_watchlist', type: 'INTEGER', req: 'No', desc: 'Computed days since addition to watchlist' },
]} />

{/* ════════════════════════════════════════════════════════════════
   20. EWS
   ════════════════════════════════════════════════════════════════ */}
<SectionTitle id="api-ews">20. Early Warning System (EWS)</SectionTitle>
<Alert severity="info" sx={{ mb: 2 }}>
  <strong>Schema V8 addition:</strong> Two new tables were added to support the Forward Outlook / Risk Outlook features: <code>subsidiary_stress_scores</code> (subsidiary-level stress test results and scenario scores) and <code>management_actions</code> (tracked management responses and remediation plans). Integration endpoints for these tables are forthcoming.
</Alert>
<Endpoint method="POST" path="/api/ingest/risk/ews" description="EWS entity summary or facility-level alerts" />
<Alert severity="info" sx={{ mb: 2 }}>Set <code>type</code> to <code>&quot;entity&quot;</code> (single summary row) or <code>&quot;alerts&quot;</code> (multiple facility rows).</Alert>

<Accordion variant="outlined" sx={{ mb: 1 }}>
  <AccordionSummary expandIcon={<ExpandMoreIcon />}><Typography fontWeight={600}>type: &quot;entity&quot; -- Subsidiary-Level EWS Summary</Typography></AccordionSummary>
  <AccordionDetails>
    <UpsertInfo table="ews_entity_summary" conflict="subsidiary_id" amounts="flagged_exposure → flagged_exposure_usd" period="None" />
    <Typography variant="body2" sx={{ mb: 1 }}>Note: uses <code>data</code> (single object) instead of <code>rows</code> (array).</Typography>
    <FieldTable fields={[
      { name: 'score0', type: 'INTEGER', req: 'Yes', desc: 'Count of facilities with EWS score 0 (>= 0)' },
      { name: 'score1', type: 'INTEGER', req: 'Yes', desc: 'Count with score 1 (>= 0)' },
      { name: 'score2', type: 'INTEGER', req: 'Yes', desc: 'Count with score 2 (>= 0)' },
      { name: 'score3', type: 'INTEGER', req: 'Yes', desc: 'Count with score 3 (>= 0)' },
      { name: 'score4_plus', type: 'INTEGER', req: 'Yes', desc: 'Count with score 4+ (>= 0)' },
      { name: 'total_facilities', type: 'INTEGER', req: 'Yes', desc: 'Total facility count (>= 0)' },
      { name: 'avg_ews_score', type: 'NUMERIC', req: 'Yes', desc: 'Portfolio average EWS score' },
      { name: 'flagged_exposure', type: 'NUMERIC', req: 'Yes', desc: 'Total flagged exposure in local currency (>= 0)' },
      { name: 'rag_status', type: 'ENUM', req: 'Yes', desc: '"Green" | "Amber" | "Red"' },
    ]} />
    <Code>{`{
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
}`}</Code>
  </AccordionDetails>
</Accordion>

<Accordion variant="outlined" sx={{ mb: 1 }}>
  <AccordionSummary expandIcon={<ExpandMoreIcon />}><Typography fontWeight={600}>type: &quot;alerts&quot; -- Facility-Level Alerts</Typography></AccordionSummary>
  <AccordionDetails>
    <UpsertInfo table="ews_facility_alerts" conflict="subsidiary_id, facility_ref" amounts="outstanding → outstanding_usd" period="None" />
    <FieldTable fields={[
      { name: 'facility_ref', type: 'TEXT', req: 'Yes', desc: 'Facility reference (unique per subsidiary)' },
      { name: 'obligor', type: 'TEXT', req: 'Yes', desc: 'Borrower name' },
      { name: 'ews_score', type: 'NUMERIC', req: 'Yes', desc: 'EWS score (>= 0)' },
      { name: 'outstanding', type: 'NUMERIC', req: 'Yes', desc: 'Outstanding in local currency (>= 0)' },
      { name: 'triggers', type: 'TEXT', req: 'No', desc: 'Comma-separated trigger descriptions' },
      { name: 'ifrs_stage', type: 'ENUM', req: 'No', desc: '"Stage 1" | "Stage 2" | "Stage 3"' },
      { name: 'action', type: 'TEXT', req: 'No', desc: 'Recommended action' },
    ]} />
  </AccordionDetails>
</Accordion>

{/* ════════════════════════════════════════════════════════════════
   21. FX RATES
   ════════════════════════════════════════════════════════════════ */}
<SectionTitle id="api-fxrates">21. FX Rates</SectionTitle>
<Endpoint method="POST" path="/api/ingest/fx-rates" description="Exchange rate submissions (typically managed by Group Treasury)" />
<UpsertInfo table="fx_rates" conflict="from_currency, to_currency, effective_date" amounts="None" period="None" />
<FieldTable fields={[
  { name: 'from_currency', type: 'TEXT', req: 'Yes', desc: '3-letter source currency code (e.g., INR, PKR)' },
  { name: 'to_currency', type: 'TEXT', req: 'Yes', desc: '3-letter target currency code (default: USD)' },
  { name: 'rate', type: 'NUMERIC', req: 'Yes', desc: 'Exchange rate (must be > 0). Rate = USD per 1 local unit (e.g., INR: 0.012 means 1 INR = $0.012)' },
  { name: 'effective_date', type: 'TEXT', req: 'Yes', desc: 'Date the rate is effective (YYYY-MM-DD)' },
]} />
<Alert severity="warning" sx={{ mb: 2 }}>FX rates are typically managed by Group Treasury, not individual subsidiaries. Contact the data team before submitting FX rates.</Alert>
<Code>{`{
  "rows": [
    { "from_currency": "INR", "to_currency": "USD", "rate": 0.01195, "effective_date": "2025-04-30" },
    { "from_currency": "PKR", "to_currency": "USD", "rate": 0.00357, "effective_date": "2025-04-30" }
  ]
}`}</Code>

{/* ════════════════════════════════════════════════════════════════
   22. VALIDATE (DRY-RUN)
   ════════════════════════════════════════════════════════════════ */}
<SectionTitle id="api-validate">22. Dry-Run Validation</SectionTitle>
<Endpoint method="POST" path="/api/ingest/validate" description="Test your payload without persisting any data" />
<Typography variant="body2" sx={{ mb: 2 }}>Use this endpoint to test your payloads before submitting real data. It runs all validation checks (schema, types, enums, ranges) but does NOT insert any data.</Typography>
<FieldTable fields={[
  { name: 'subsidiary_id', type: 'INTEGER', req: 'Yes', desc: 'Your subsidiary ID' },
  { name: 'table', type: 'TEXT', req: 'Yes', desc: 'Target table name (see list below)' },
  { name: 'rows', type: 'ARRAY', req: 'Yes', desc: 'Array of row objects to validate (min 1)' },
]} />
<Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>Available table names for validation:</Typography>
<Code>{`consumer_overall_metrics    consumer_product_metrics
net_flow_rates              roll_rate_series
collection_metrics          vintage_points
non_starters                los_metrics
los_funnel                  los_daily
trade_facilities            corporate_portfolio_metrics
corporate_covenants         corporate_delinquency
corporate_watchlist         ews_entity_summary
ews_facility_alerts         fx_rates
tdd_pre_disbursal           tdd_post_disbursal
approved_base               rejected_base`}</Code>
<Code>{`# Example
POST /api/ingest/validate
Authorization: Bearer sk_abc123def456

{
  "subsidiary_id": 6,
  "table": "consumer_overall_metrics",
  "rows": [
    { "metric_type": "Delinquency", "metric": "30+ Amt%", "period": "Apr'25", "value": 3.2 }
  ]
}

# Success (200)
{ "status": "ok", "message": "Validation passed. No data was persisted (dry-run).", "rowCount": 1 }

# Failure (400)
{ "status": "error", "errors": [{ "field": "rows.0.period", "message": "Invalid period format..." }] }`}</Code>

{/* ════════════════════════════════════════════════════════════════
   23. STATUS
   ════════════════════════════════════════════════════════════════ */}
<SectionTitle id="api-status">23. Sync Status</SectionTitle>
<Endpoint method="GET" path="/api/ingest/status" description="Check your subsidiary's data sync health" />
<Typography variant="body2" sx={{ mb: 2 }}>Returns the last sync timestamp, last period, row count, and health status for each table. Use this to monitor your integration health.</Typography>
<Code>{`GET /api/ingest/status
Authorization: Bearer sk_abc123def456

# Response (200)
{
  "subsidiaryId": 6,
  "name": "Your Bank Name",
  "tables": {
    "consumer_overall_metrics": {
      "lastSync": "2025-04-05T10:30:00.000Z",
      "lastPeriod": "Mar'25",
      "rows": 120,
      "status": "ok"
    },
    "consumer_product_metrics": {
      "lastSync": "2025-04-05T10:31:00.000Z",
      "lastPeriod": "Mar'25",
      "rows": 360,
      "status": "ok"
    },
    "net_flow_rates": {
      "lastSync": null,
      "lastPeriod": null,
      "rows": 0,
      "status": "never_synced"
    },
    "vintage_points": {
      "lastSync": "2025-02-01T08:00:00.000Z",
      "lastPeriod": "Jan'25",
      "rows": 500,
      "status": "stale"      // > 45 days since last sync
    }
  },
  "warnings": [
    "net_flow_rates has never been synced",
    "vintage_points last synced 63 days ago"
  ]
}`}</Code>

{/* ════════════════════════════════════════════════════════════════
   24. CURRENCY & FX RULES
   ════════════════════════════════════════════════════════════════ */}
<SectionTitle id="currency-fx">24. Currency & FX Handling Rules</SectionTitle>
{[
  { rule: 'Rule 1: Submit local currency only', desc: 'All monetary values must be in your subsidiary\'s registered currency_code (e.g., INR, PKR, COP). Never pre-convert to USD.', icon: '1' },
  { rule: 'Rule 2: USD conversion is automatic', desc: 'The API looks up the most recent FX rate from fx_rates WHERE from_currency = your_currency AND to_currency = USD AND effective_date <= period_end_date. It computes: field_usd = field * rate, rounded to 2 decimal places.', icon: '2' },
  { rule: 'Rule 3: FX rates are centrally managed', desc: 'Group Treasury maintains the fx_rates table. Do not submit FX rates unless instructed. Contact the data team if rates seem outdated.', icon: '3' },
  { rule: 'Rule 4: Missing rate = rejected ingestion', desc: 'If no FX rate exists for your currency as of the data period, the API returns an error. The data team must add the rate before you can ingest.', icon: '4' },
  { rule: 'Rule 5: Stale rate = warning, not rejection', desc: 'If the most recent rate is >30 days old, the API includes a warning in the response but still processes the data.', icon: '5' },
].map((r, i) => (
  <Paper key={i} variant="outlined" sx={{ p: 2, mb: 1.5 }}>
    <Typography variant="subtitle2" fontWeight={700}>{r.rule}</Typography>
    <Typography variant="body2" color="text.secondary">{r.desc}</Typography>
  </Paper>
))}

{/* ════════════════════════════════════════════════════════════════
   25. DATA QUALITY CHECKS
   ════════════════════════════════════════════════════════════════ */}
<SectionTitle id="data-quality">25. Data Quality Checks</SectionTitle>
<SubSection title="Pre-Ingestion Checks (block on failure, return 400)">
  <TableContainer component={Paper} variant="outlined" sx={{ mb: 2 }}>
    <Table size="small">
      <TableHead><TableRow sx={{ bgcolor: 'action.hover' }}>
        <TableCell sx={{ fontWeight: 700, width: 140 }}>Check</TableCell>
        <TableCell sx={{ fontWeight: 700 }}>What It Validates</TableCell>
        <TableCell sx={{ fontWeight: 700 }}>Error Example</TableCell>
      </TableRow></TableHead>
      <TableBody>
        {[
          ['Schema', 'All required fields present, correct types', '"Missing required field: period"'],
          ['Period Format', "Matches /^[A-Z][a-z]{2}'\\d{2}$/ regex", '"Invalid period format. Expected Mon\'YY (e.g., Apr\'25)"'],
          ['DPD Bucket Enum', '7 exact values only', '"Invalid DPD bucket. Must be one of: Current, 1-30, 31-60, 61-90, 91-120, 120+, Write-off"'],
          ['IFRS Stage Enum', '3 exact values only', '"Invalid IFRS stage. Must be Stage 1, Stage 2, or Stage 3"'],
          ['Non-Negative', 'Amount fields >= 0', '"Number must be greater than or equal to 0"'],
          ['Positive Integer', 'Count fields are whole numbers >= 0', '"Expected integer, received float"'],
          ['Subsidiary Scope', 'API key\'s subsidiary matches payload', '"API key not authorized for subsidiary 7. Key is scoped to subsidiary 6."'],
          ['FX Rate Exists', 'Rate available for currency + period', '"No FX rate available for PKR as of 2025-04-30"'],
          ['Min Array Length', 'rows array has >= 1 element', '"At least one row is required"'],
          ['String Min Length', 'Required text fields are non-empty', '"String must contain at least 1 character(s)"'],
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

<SubSection title="Post-Ingestion Checks (async, non-blocking, stored in data_quality_results)">
  <TableContainer component={Paper} variant="outlined" sx={{ mb: 2 }}>
    <Table size="small">
      <TableHead><TableRow sx={{ bgcolor: 'action.hover' }}>
        <TableCell sx={{ fontWeight: 700 }}>Check ID</TableCell>
        <TableCell sx={{ fontWeight: 700 }}>Name</TableCell>
        <TableCell sx={{ fontWeight: 700 }}>Logic</TableCell>
        <TableCell sx={{ fontWeight: 700 }}>Threshold</TableCell>
      </TableRow></TableHead>
      <TableBody>
        <TableRow>
          <TableCell sx={{ fontFamily: 'monospace' }}>POST-01</TableCell>
          <TableCell>Data Freshness</TableCell>
          <TableCell sx={{ fontSize: '0.8rem' }}>Days since last sync from sync_watermarks table</TableCell>
          <TableCell>Fail if &gt; 45 days</TableCell>
        </TableRow>
        <TableRow>
          <TableCell sx={{ fontFamily: 'monospace' }}>POST-02</TableCell>
          <TableCell>MoM Anomaly</TableCell>
          <TableCell sx={{ fontSize: '0.8rem' }}>Compares current vs previous period Total AUM. Only runs for consumer_overall_metrics.</TableCell>
          <TableCell>Fail if &gt; 50% change</TableCell>
        </TableRow>
      </TableBody>
    </Table>
  </TableContainer>
</SubSection>

{/* ════════════════════════════════════════════════════════════════
   26. SYNC SCHEDULE
   ════════════════════════════════════════════════════════════════ */}
<SectionTitle id="sync-schedule">26. Recommended Sync Schedule</SectionTitle>
<TableContainer component={Paper} variant="outlined" sx={{ mb: 3 }}>
  <Table size="small">
    <TableHead><TableRow sx={{ bgcolor: 'action.hover' }}>
      <TableCell sx={{ fontWeight: 700 }}>Data Type</TableCell>
      <TableCell sx={{ fontWeight: 700 }}>Endpoint</TableCell>
      <TableCell sx={{ fontWeight: 700 }}>Frequency</TableCell>
      <TableCell sx={{ fontWeight: 700 }}>Deadline</TableCell>
    </TableRow></TableHead>
    <TableBody>
      {[
        ['Consumer overall metrics', '/api/ingest/consumer/overall', 'Monthly', 'By 5th business day'],
        ['Consumer product metrics', '/api/ingest/consumer/products', 'Monthly', 'By 5th business day'],
        ['Net flow rates', '/api/ingest/consumer/net-flow', 'Monthly', 'By 5th business day'],
        ['Roll rate series', '/api/ingest/consumer/roll-rates', 'Monthly', 'By 5th business day'],
        ['Collection metrics', '/api/ingest/consumer/collections', 'Monthly', 'By 5th business day'],
        ['Vintage analysis', '/api/ingest/consumer/vintage', 'Monthly', 'New MOB point each month'],
        ['LOS daily', '/api/ingest/consumer/los (daily)', 'Daily', 'By end of next business day'],
        ['LOS metrics & funnel', '/api/ingest/consumer/los (metrics/funnel)', 'Daily or weekly', 'Within 2 business days'],
        ['Non-starters', '/api/ingest/consumer/non-starters', 'Monthly', 'By 5th business day'],
        ['Trade facilities', '/api/ingest/trade/facilities', 'Monthly', 'By 10th business day'],
        ['Corporate metrics', '/api/ingest/corporate/metrics', 'Monthly', 'By 10th business day'],
        ['Corporate covenants', '/api/ingest/corporate/covenants', 'Monthly', 'By 10th business day'],
        ['Corporate delinquency', '/api/ingest/corporate/delinquency', 'Monthly', 'By 10th business day'],
        ['Corporate watchlist', '/api/ingest/corporate/watchlist', 'Monthly', 'By 10th business day'],
        ['EWS data', '/api/ingest/risk/ews', 'Monthly', 'By 10th business day'],
        ['FX rates', '/api/ingest/fx-rates', 'Daily or weekly', 'As needed (Group Treasury)'],
      ].map(([type, ep, freq, deadline]) => (
        <TableRow key={type}>
          <TableCell sx={{ fontSize: '0.8rem' }}>{type}</TableCell>
          <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.72rem' }}>{ep}</TableCell>
          <TableCell><Chip label={freq} size="small" variant="outlined" color={freq === 'Daily' ? 'primary' : 'default'} /></TableCell>
          <TableCell sx={{ fontSize: '0.8rem' }}>{deadline}</TableCell>
        </TableRow>
      ))}
    </TableBody>
  </Table>
</TableContainer>

{/* ════════════════════════════════════════════════════════════════
   27. ERROR HANDLING
   ════════════════════════════════════════════════════════════════ */}
<SectionTitle id="error-handling">27. Error Handling</SectionTitle>
<SubSection title="HTTP Status Codes">
  <TableContainer component={Paper} variant="outlined" sx={{ mb: 2 }}>
    <Table size="small">
      <TableHead><TableRow sx={{ bgcolor: 'action.hover' }}>
        <TableCell sx={{ fontWeight: 700 }}>Code</TableCell>
        <TableCell sx={{ fontWeight: 700 }}>Meaning</TableCell>
        <TableCell sx={{ fontWeight: 700 }}>What To Do</TableCell>
      </TableRow></TableHead>
      <TableBody>
        {[
          ['200', 'Success', 'Data ingested. Check response for batchId and warnings.'],
          ['400', 'Validation Error', 'Check the errors array for field-level details. Fix your payload and retry.'],
          ['401', 'Unauthorized', 'Missing or invalid API key. Check your Authorization header.'],
          ['403', 'Forbidden', 'Key expired, deactivated, or wrong subsidiary scope. Contact Group HQ.'],
          ['500', 'Server Error', 'Database error during upsert. Contact the data team with your batchId.'],
        ].map(([code, meaning, action]) => (
          <TableRow key={code}>
            <TableCell sx={{ fontWeight: 700, fontFamily: 'monospace' }}>{code}</TableCell>
            <TableCell sx={{ fontWeight: 600, fontSize: '0.8rem' }}>{meaning}</TableCell>
            <TableCell sx={{ fontSize: '0.8rem' }}>{action}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  </TableContainer>
</SubSection>

<SubSection title="Response Format">
  <Code>{`# Success Response (all endpoints)
{
  "status": "ok",
  "batchId": "550e8400-e29b-41d4-a716-446655440000",  // UUID, use for tracking
  "rowsUpserted": 120,                                 // total rows written
  "usdConversionRate": 0.012,                           // FX rate used (if applicable)
  "warnings": [                                         // non-blocking warnings
    "FX rate for INR is 35 days old (effective 2025-03-01). Consider updating fx_rates."
  ]
}

# Error Response (all endpoints)
{
  "status": "error",
  "errors": [
    {
      "field": "rows.2.period",                         // path to the problematic field
      "message": "Invalid period format. Expected Mon'YY (e.g., Apr'25)"
    },
    {
      "message": "API key not authorized for subsidiary 7."  // auth errors have no field
    }
  ]
}`}</Code>
</SubSection>

<SubSection title="Idempotent Upserts">
  <Typography variant="body2" sx={{ mb: 1 }}>All endpoints use INSERT ... ON CONFLICT DO UPDATE. This means:</Typography>
  <Stack spacing={0.5}>
    {[
      'Re-submitting the same data is always safe -- existing rows are updated, no duplicates created',
      'To correct a mistake, just re-submit the corrected rows for the affected period',
      'No need to delete data before re-pushing -- the UNIQUE constraint handles it automatically',
      'Each table has a defined UNIQUE key (shown in the "Unique Key (upsert)" row in each section)',
    ].map((t) => (
      <Box key={t} sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
        <CheckCircleOutlineIcon sx={{ fontSize: 16, color: 'success.main', mt: 0.3 }} />
        <Typography variant="body2">{t}</Typography>
      </Box>
    ))}
  </Stack>
</SubSection>

{/* ════════════════════════════════════════════════════════════════
   28. HANDLING VARIANCE
   ════════════════════════════════════════════════════════════════ */}
<SectionTitle id="handling-variance">28. Handling Variance Across Subsidiaries</SectionTitle>
{[
  { q: 'My subsidiary only has consumer finance (no trade or corporate)', a: 'Skip Sections 15-19 entirely. The dashboard handles missing portfolios gracefully -- those sections show as empty/zero. Group-level aggregations still work correctly.' },
  { q: 'My product names are different from other subsidiaries', a: 'Each subsidiary defines its own products in product_catalog. Use your internal names (e.g., "Housing Loan" instead of "Home Loan"). The dashboard dynamically fetches products per scope. However, if the group wants to compare products across subsidiaries, agree on common names.' },
  { q: 'My DPD buckets are non-standard (e.g., 31-90 instead of 31-60)', a: 'You must re-map to the 7 standard buckets during ETL: Current, 1-30, 31-60, 61-90, 91-120, 120+, Write-off. Split combined buckets proportionally or assign to the lower bucket.' },
  { q: 'My fiscal year starts in April, not January', a: 'All periods use calendar months (Mon\'YY). Submit data in calendar months regardless of your fiscal year. The dashboard currently does not have FY-aware views.' },
  { q: 'I have different reporting frequencies than recommended', a: 'The sync schedule is recommended, not enforced. However, data freshness checks will flag your subsidiary if consumer data is >45 days stale.' },
].map((item, i) => (
  <Paper key={i} variant="outlined" sx={{ p: 2, mb: 1.5 }}>
    <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 0.5 }}>{item.q}</Typography>
    <Typography variant="body2" color="text.secondary">{item.a}</Typography>
  </Paper>
))}

{/* ════════════════════════════════════════════════════════════════
   29. FAQ
   ════════════════════════════════════════════════════════════════ */}
<SectionTitle id="faq">29. Frequently Asked Questions</SectionTitle>
{[
  { q: 'How do I test my payload without affecting real data?', a: 'Use POST /api/ingest/validate with your payload. It runs all validation checks but does not persist any data. See Section 22.' },
  { q: 'How do I check my sync status?', a: 'Call GET /api/ingest/status with your API key. It shows last sync time, latest period, row counts, and warnings for each table. See Section 23.' },
  { q: 'Do I need to compute USD amounts?', a: 'No. Submit all values in your local currency. The API auto-computes _usd columns using FX rates maintained by Group Treasury. See Section 24.' },
  { q: 'What happens if the FX rate is missing for my currency?', a: 'The API rejects the ingestion with: "No FX rate available for {currency} as of {date}. Add a rate to fx_rates first." Contact the Group Data Team.' },
  { q: 'How do I correct previously submitted data?', a: 'Simply re-submit the corrected rows for the affected period(s). The upsert logic automatically replaces old values. No deletion needed.' },
  { q: 'What is a batchId and when do I need it?', a: 'Every successful ingestion returns a UUID batchId. Use it when contacting the data team about issues -- it links to the full ingestion log including timestamps, row counts, and any errors.' },
  { q: 'Can I submit data for multiple periods in one request?', a: 'Yes. Include rows for as many periods as you want in a single request (up to 10,000 rows). The API extracts the period range automatically for logging.' },
  { q: 'What if my API key expires?', a: 'The API returns 403: "API key has expired." Contact Group HQ to issue a new key.' },
  { q: 'Is there a sandbox/test environment?', a: 'Yes. The staging environment uses a separate Supabase database. Your API key works in both environments. Use /api/ingest/validate for dry-run testing.' },
  { q: 'How often should I push data?', a: 'See Section 26 for the recommended sync schedule. Most data is monthly; LOS daily is daily.' },
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
            For questions, issues, or API key requests, contact the Group Data Team.
          </Typography>
        </Box>
      </Box>
    </Box>
  );
}
