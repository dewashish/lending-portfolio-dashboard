'use client';

import { Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Chip, Grid, Card } from '@mui/material';
import { PRDSection } from '@/components/docs/PRDSection';
import { DiagramBox } from '@/components/docs/DiagramBox';

const TECH_STACK = [
  { category: 'Framework', tech: 'Next.js 14', purpose: 'App Router, server-side rendering, file-based routing, API routes' },
  { category: 'UI Library', tech: 'Material-UI v5 (MUI)', purpose: 'Component library, theming, responsive grid, accessibility' },
  { category: 'Visualization', tech: 'D3.js v7', purpose: '40+ custom charts: treemaps, funnels, heatmaps, radar, waterfall, donuts' },
  { category: 'Tables', tech: 'TanStack Table v8', purpose: 'Data tables with sorting, filtering, pagination, row virtualization' },
  { category: 'Data Fetching', tech: 'SWR 2.2', purpose: 'Stale-while-revalidate caching, automatic revalidation, scope-aware cache keys' },
  { category: 'Backend', tech: 'Supabase', purpose: 'PostgreSQL database, Auth, Row-Level Security, real-time subscriptions' },
  { category: 'AI', tech: 'GPT-4.1 (KIE.ai)', purpose: 'Natural language portfolio queries via /api/gemini endpoint, executive summary generation' },
  { category: 'Validation', tech: 'Zod v4', purpose: 'Runtime schema validation for data ingestion API payloads (20+ endpoints)' },
  { category: 'PDF Export', tech: 'jsPDF + jspdf-autotable', purpose: 'Client-side PDF generation with formatted tables and KPIs' },
  { category: 'Excel Export', tech: 'ExcelJS', purpose: 'Client-side Excel generation with styled cells and multiple worksheets' },
  { category: 'Onboarding', tech: 'React Joyride', purpose: '12-step interactive guided tour with theme-aware styling' },
  { category: 'Date Utils', tech: 'date-fns', purpose: 'Date formatting and manipulation' },
  { category: 'Styling', tech: 'Emotion (CSS-in-JS)', purpose: 'Theme-aware component styling, SSR-compatible' },
  { category: 'Language', tech: 'TypeScript 5.x', purpose: 'Type safety, interface definitions, generics for data models' },
];

export function TechnicalStack() {
  return (
    <PRDSection id="technical-stack" title="Technical Stack" sectionNumber={13}>
      <Typography variant="body2" sx={{ mb: 2, lineHeight: 1.8 }}>
        The platform is built on a modern React/TypeScript stack optimized for real-time data
        visualization and institutional-grade reporting. Key architectural decisions prioritize
        type safety, client-side rendering performance, and minimal server dependencies.
      </Typography>

      <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2, mb: 3 }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Category</TableCell>
              <TableCell>Technology</TableCell>
              <TableCell>Purpose</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {TECH_STACK.map((t) => (
              <TableRow key={t.tech} hover>
                <TableCell sx={{ fontWeight: 600, whiteSpace: 'nowrap' }}>{t.category}</TableCell>
                <TableCell>
                  <Chip label={t.tech} size="small" variant="outlined" sx={{ fontWeight: 600, fontSize: '0.72rem' }} />
                </TableCell>
                <TableCell sx={{ fontSize: '0.78rem', color: 'text.secondary' }}>{t.purpose}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Typography variant="h6" sx={{ fontSize: '1rem', mb: 1.5 }}>Deployment & Infrastructure</Typography>

      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ p: 2, textAlign: 'center' }}>
            <Typography sx={{ fontWeight: 700, fontSize: '0.85rem', color: 'primary.main' }}>Hosting</Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: '0.78rem', mt: 0.5 }}>Vercel Edge Network</Typography>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ p: 2, textAlign: 'center' }}>
            <Typography sx={{ fontWeight: 700, fontSize: '0.85rem', color: 'primary.main' }}>CI/CD</Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: '0.78rem', mt: 0.5 }}>GitHub push auto-deploy</Typography>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ p: 2, textAlign: 'center' }}>
            <Typography sx={{ fontWeight: 700, fontSize: '0.85rem', color: 'primary.main' }}>Database</Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: '0.78rem', mt: 0.5 }}>Supabase PostgreSQL</Typography>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ p: 2, textAlign: 'center' }}>
            <Typography sx={{ fontWeight: 700, fontSize: '0.85rem', color: 'primary.main' }}>Auth</Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: '0.78rem', mt: 0.5 }}>Supabase OAuth 2.0</Typography>
          </Card>
        </Grid>
      </Grid>

      <DiagramBox title="Architectural Pattern">
{`  ┌────────────────────────────────────────────────────────┐
  │              Next.js 14 App Router                      │
  │                                                        │
  │  ┌──────────────────┐   ┌────────────────────────────┐ │
  │  │  Server Layer     │   │  Client Components          │ │
  │  │  Server Layer     │   │  Client Components          │ │
  │  │  - /api/gemini    │   │  - 'use client' directive   │ │
  │  │  - /api/ingest/*  │   │  - All views & charts       │ │
  │  │  - /api/exec-sum  │   │  - SWR data hooks          │ │
  │  │  - /auth/*        │   │  - Theme/Currency context   │ │
  │  │  - SSR metadata   │   │  - D3.js chart rendering    │ │
  │  └──────────────────┘   └────────────────────────────┘ │
  │                                                        │
  │  Ingestion Layer (src/lib/ingestion/):                 │
  │  ┌──────┐ ┌──────┐ ┌────┐ ┌──────┐ ┌────┐ ┌──────┐   │
  │  │ Auth │ │ Zod  │ │ FX │ │Upsert│ │ DQ │ │Logger│   │
  │  └──────┘ └──────┘ └────┘ └──────┘ └────┘ └──────┘   │
  │                                                        │
  │  Context Providers:                                    │
  │  ┌──────┐ ┌────────┐ ┌──────┐ ┌──────┐ ┌──────┐      │
  │  │Theme │ │Currency│ │ User │ │Admin │ │ SWR  │      │
  │  └──────┘ └────────┘ └──────┘ └──────┘ └──────┘      │
  └────────────────────────────────────────────────────────┘`}
      </DiagramBox>
    </PRDSection>
  );
}
