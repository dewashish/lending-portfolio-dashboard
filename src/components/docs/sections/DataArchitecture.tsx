'use client';

import { Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Chip, Box } from '@mui/material';
import { PRDSection } from '@/components/docs/PRDSection';
import { DiagramBox } from '@/components/docs/DiagramBox';

const DOMAINS = [
  { domain: 'Consumer Finance', tables: 15, color: '#2196f3', examples: 'consumer_overall_metrics, consumer_product_metrics, net_flow_rates, roll_rate_series, collection_metrics, vintage_points, non_starters, tdd_pre/post_disbursal, approved/rejected_base' },
  { domain: 'Loan Origination (LOS)', tables: 8, color: '#00bcd4', examples: 'los_customers, los_applications, los_credit_bureau_pulls, los_decisions, los_disbursements, los_metrics, los_funnel, los_daily' },
  { domain: 'Loan Management (LMS)', tables: 7, color: '#009688', examples: 'lms_accounts, lms_balance_snapshots, lms_dpd_history, lms_payment_transactions, lms_collateral, lms_writeoffs, lms_restructures' },
  { domain: 'Trade Finance', tables: 12, color: '#9c27b0', examples: 'trade_facilities, trade_entity_performance, trade_product_mix, trade_asset_quality, trade_rating_distribution, trade_concentrations, trade_collection_efficiency, trade_watchlist, trade_stage_migration, trade_dpd_roll_rate, trade_dpd_aging_by_subsidiary' },
  { domain: 'Corporate Finance', tables: 13, color: '#ff9800', examples: 'corporate_delinquency, corporate_portfolio_metrics, corporate_watchlist, corporate_covenants, corporate_facilities, corporate_top_customers, corporate_industry_concentration, corporate_collateral_analysis, corporate_ltv_distribution, corporate_maturity_profile, corporate_provisioning_ecl, corporate_rating_analysis, corporate_rating_migration' },
  { domain: 'Early Warning System', tables: 2, color: '#f44336', examples: 'ews_entity_summary, ews_facility_alerts' },
  { domain: 'Risk & Macro', tables: 4, color: '#e91e63', examples: 'fx_risk, country_risk, subsidiary_stress_scores, management_actions' },
  { domain: 'Collections', tables: 5, color: '#795548', examples: 'col_agencies, col_assignments, col_actions, col_recovery_payments, col_legal_cases' },
  { domain: 'Reference Data', tables: 7, color: '#607d8b', examples: 'profiles, regions, subsidiaries, currencies, fx_rates, data_sources, product_catalog' },
  { domain: 'Views (Materialized)', tables: 8, color: '#78909c', examples: 'v_group_aum_summary, v_subsidiary_scorecard, v_region_summary, v_fx_latest, v_group_trade_overview, v_group_corporate_overview, v_group_ews_summary, v_group_consolidated_scorecard' },
  { domain: 'Risk Appetite', tables: 1, color: '#4caf50', examples: 'risk_appetite_settings (hierarchical thresholds)' },
];

export function DataArchitecture() {
  return (
    <PRDSection id="data-architecture" title="Data Architecture" sectionNumber={7}>
      <Typography variant="body2" sx={{ mb: 2, lineHeight: 1.8 }}>
        The platform is backed by a PostgreSQL database (Supabase) with 80+ tables organized into
        10 functional domains. Data flows from source systems through a structured schema that
        supports multi-geography filtering, time-series analysis, and hierarchical aggregation.
      </Typography>

      <DiagramBox title="Data Flow Architecture">
{`  ┌─────────────────────────────────────────────────────────────────────┐
  │                       SOURCE SYSTEMS                                │
  │   ┌─────────┐  ┌─────────┐  ┌──────────┐  ┌──────────┐            │
  │   │   LOS   │  │   LMS   │  │Collection│  │ External │            │
  │   │ System  │  │ System  │  │  Engine   │  │ Feeds    │            │
  │   └────┬────┘  └────┬────┘  └─────┬────┘  └─────┬────┘            │
  └────────┼─────────────┼────────────┼──────────────┼─────────────────┘
           │             │            │              │
           ▼             ▼            ▼              ▼
  ┌─────────────────────────────────────────────────────────────────────┐
  │                    SUPABASE (PostgreSQL)                            │
  │                                                                     │
  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐           │
  │  │ Consumer │  │  Trade   │  │Corporate │  │   Risk   │           │
  │  │ 15 tbls  │  │ 12 tbls  │  │ 13 tbls  │  │  6 tbls  │           │
  │  └──────────┘  └──────────┘  └──────────┘  └──────────┘           │
  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐           │
  │  │   LOS    │  │   LMS    │  │  Collect  │  │   Ref    │           │
  │  │  8 tbls  │  │  7 tbls  │  │  5 tbls  │  │  7 tbls  │           │
  │  └──────────┘  └──────────┘  └──────────┘  └──────────┘           │
  │  ┌──────────────────────┐  ┌────────────────────────┐              │
  │  │  8 Materialized Views │  │ 1 Risk Appetite Table  │              │
  │  └──────────────────────┘  └────────────────────────┘              │
  │                                                                     │
  │  Row-Level Security  ·  Foreign Keys (subsidiary_id)  ·  Indexes   │
  └────────────────────────────────┬────────────────────────────────────┘
                                   │
                                   ▼
  ┌─────────────────────────────────────────────────────────────────────┐
  │                         APPLICATION                                 │
  │                                                                     │
  │  ┌──────────────────────┐      ┌──────────────────────┐            │
  │  │   65+ Query Functions │─────▶│   55+ SWR Hooks      │            │
  │  │   (src/lib/queries/) │      │   (src/hooks/)       │            │
  │  └──────────────────────┘      └──────────┬───────────┘            │
  │                                            │                        │
  │                                            ▼                        │
  │                               ┌───────────────────────┐            │
  │                               │   React Components    │            │
  │                               │   60+ Charts (D3.js)  │            │
  │                               │   12 Tables (TanStack) │            │
  │                               │   PDF + Excel Exports │            │
  │                               └───────────────────────┘            │
  └─────────────────────────────────────────────────────────────────────┘`}
      </DiagramBox>

      <Typography variant="h6" sx={{ mt: 3, mb: 2, fontSize: '1rem' }}>
        Database Domain Inventory
      </Typography>

      <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Domain</TableCell>
              <TableCell sx={{ textAlign: 'center' }}>Tables</TableCell>
              <TableCell>Key Tables</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {DOMAINS.map((d) => (
              <TableRow key={d.domain} hover>
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: d.color, flexShrink: 0 }} />
                    <Typography sx={{ fontWeight: 600, fontSize: '0.82rem' }}>{d.domain}</Typography>
                  </Box>
                </TableCell>
                <TableCell sx={{ textAlign: 'center' }}>
                  <Chip label={d.tables} size="small" sx={{ fontWeight: 700, fontSize: '0.72rem', minWidth: 32 }} />
                </TableCell>
                <TableCell sx={{ fontSize: '0.75rem', color: 'text.secondary', fontFamily: '"IBM Plex Mono", monospace' }}>
                  {d.examples}
                </TableCell>
              </TableRow>
            ))}
            <TableRow sx={{ bgcolor: 'action.hover' }}>
              <TableCell sx={{ fontWeight: 700 }}>Total</TableCell>
              <TableCell sx={{ textAlign: 'center' }}>
                <Chip label={DOMAINS.reduce((s, d) => s + d.tables, 0)} size="small" color="primary" sx={{ fontWeight: 700, fontSize: '0.72rem' }} />
              </TableCell>
              <TableCell />
            </TableRow>
          </TableBody>
        </Table>
      </TableContainer>

      <Box sx={{ mt: 3, p: 2, borderLeft: 3, borderColor: 'info.main', bgcolor: 'action.hover', borderRadius: 1 }}>
        <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>Multi-Geography Data Model</Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary', lineHeight: 1.7, fontSize: '0.82rem' }}>
          All fact tables include a <code>subsidiary_id</code> foreign key referencing the <code>subsidiaries</code> dimension
          table. This enables scope-based filtering at Group, Region, or Subsidiary level. The <code>applyScopeAsync()</code>
          utility function automatically injects the appropriate WHERE clause based on the user&apos;s current scope selection.
          SWR cache keys include scope parameters to ensure cache isolation between scope levels.
        </Typography>
      </Box>
    </PRDSection>
  );
}
