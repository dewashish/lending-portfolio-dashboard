'use client';

import { Typography, Accordion, AccordionSummary, AccordionDetails, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Chip, Box } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { PRDSection } from '@/components/docs/PRDSection';

interface SubFeature {
  subTab: string;
  components: string;
  keyMetrics: string;
}

interface TabFeatures {
  tab: string;
  color: string;
  icon: string;
  features: SubFeature[];
}

const FEATURE_MAP: TabFeatures[] = [
  {
    tab: 'Group CRO Overview',
    color: '#00897b',
    icon: 'Dashboard',
    features: [
      { subTab: 'Hero KPIs', components: 'KPI strip with sparklines', keyMetrics: 'Group AUM, Consumer AUM, Trade Outstanding, Corporate POS, 30+ DPD, NPL Ratio, EWS Critical, Provision Coverage' },
      { subTab: 'Breach Alert Panel', components: 'GroupBreachPanel with pulse animation', keyMetrics: 'Red (tolerance breach) count, Amber (appetite breach) count, scrollable alert chips' },
      { subTab: 'Portfolio Composition', components: 'BusinessLineDonut, SubsidiaryAUMBar, StagingDonut', keyMetrics: 'Consumer/Trade/Corporate split, AUM by subsidiary with RAG, IFRS 9 stage distribution' },
      { subTab: 'Risk Heatmap', components: 'SubsidiaryRiskHeatmap (7 dimensions)', keyMetrics: 'Consumer 30+, Trade NPL, Corp Watchlist, EWS, FX Risk, Country Risk, Provision Coverage' },
      { subTab: 'Trend Grid', components: 'GroupTrendGrid with sparklines', keyMetrics: 'Consumer, Trade, Corporate trend time-series' },
      { subTab: 'Consolidated Scorecard', components: 'Consolidated scorecard table + BusinessLineComparisonTable', keyMetrics: 'Per-subsidiary cross-portfolio KPIs with breach badges and group totals' },
    ],
  },
  {
    tab: 'Consumer Finance',
    color: '#2196f3',
    icon: 'Person',
    features: [
      { subTab: 'Overview', components: 'DPDBucketDistribution, ConsumerOverallTable', keyMetrics: 'AUM, 30+ DPD%, NPL, Stage 2+3%, DPD bucket stacked area' },
      { subTab: 'Origination', components: 'MTDFunnelComparison, DailyDisbursementTrend, LOSComparisonTable', keyMetrics: '8-stage conversion funnel (Clicks→Disbursement), daily disbursement amount/count, MTD vs LMTD operational metrics' },
      { subTab: 'Products', components: 'ConsumerProductTable, CollectionTrend', keyMetrics: 'Product-level AUM, delinquency, disbursement, collection trends' },
      { subTab: 'Delinquency', components: 'RollRateHeatmap, DPDRollRateHeatmap', keyMetrics: 'DPD bucket transitions, roll forward/backward rates, cure rates' },
      { subTab: 'Collections', components: 'CollectionTrend, CollectionMetricsTable', keyMetrics: 'Collection efficiency, recovery rates, bucket migration' },
      { subTab: 'Vintage Analysis', components: 'VintageCurves, VintageHeatmap', keyMetrics: 'Delinquency curves by origination cohort, MOB progression' },
      { subTab: 'Non-Starters', components: 'NonStarterTable', keyMetrics: 'Non-starter origination counts by category and product' },
      { subTab: 'Risk Analytics', components: 'Risk grade distribution charts', keyMetrics: 'Risk grade distribution, IFRS stage breakdown' },
      { subTab: 'TDD', components: 'TDDTable', keyMetrics: 'Pre-disbursal and post-disbursal bureau score distributions' },
    ],
  },
  {
    tab: 'Trade Finance',
    color: '#9c27b0',
    icon: 'AccountBalance',
    features: [
      { subTab: 'Overview', components: 'Trade summary KPIs, facility breakdown', keyMetrics: 'Trade Outstanding, Active Facilities, NPL Ratio, Stage 2+3%, Provision Coverage' },
      { subTab: 'Product Mix', components: 'TradeProductMixSection tables', keyMetrics: 'Distribution by product type (LC, SBLC, BG, Trade Loan, etc.)' },
      { subTab: 'Concentrations', components: 'ConcentrationTreemap (obligor + sector)', keyMetrics: 'Top obligor exposure, sector concentration, portfolio share %' },
      { subTab: 'Watchlist', components: 'TradeWatchlistSection tables', keyMetrics: 'Watchlisted facilities, EWS scores, triggers, exposure amounts' },
      { subTab: 'EWS & Migration', components: 'EWSRadar, EntityPerformanceTable, RollRateSankey', keyMetrics: 'EWS score distribution, stage migration matrix, entity utilization' },
      { subTab: 'Macro Risk', components: 'TradeMacroRiskSection', keyMetrics: 'Macro risk factors affecting trade portfolio' },
    ],
  },
  {
    tab: 'Corporate Finance',
    color: '#ff9800',
    icon: 'Business',
    features: [
      { subTab: 'Overview', components: 'CorporateOverviewSection', keyMetrics: 'Total POS, Disbursement, Delinquency Rate, NPA Rate, Security Cover' },
      { subTab: 'Industry', components: 'IndustryBarChart, ConcentrationTreemap, drill-down detail table', keyMetrics: 'D3 horizontal bar chart by sector, period filters, sector drill-down, row limits, IRR, % of Total Disbursement' },
      { subTab: 'Collateral & LTV', components: 'CollateralDonut, LTVDistributionChart, MaturityProfileChart + 3 detail tables', keyMetrics: 'Collateral coverage with tooltips, LTV bands, maturity profile, Sanctioned/Disbursed/POS columns' },
      { subTab: 'Maturity', components: 'CorporateMaturitySection, MaturityProfileChart', keyMetrics: 'Maturity band analysis, concentration by tenor' },
      { subTab: 'Provisioning', components: 'CorporateProvisioningSection, ProvisioningTrendChart', keyMetrics: 'IFRS 9 stage provisioning (ECL), provision coverage ratio trend' },
      { subTab: 'Rating Analysis', components: 'CorporateRatingSection, RatingDistributionBar', keyMetrics: 'Credit rating distribution, rating migration matrix' },
      { subTab: 'Watchlist', components: 'CorporateWatchlistSection', keyMetrics: 'Flagged borrowers, sectors, exposure, EWS triggers, status' },
      { subTab: 'Covenants', components: 'CovenantCategoryDonut, CovenantComplianceDonut, 14-column detail table', keyMetrics: 'KPI strip, category/compliance D3 donuts, category summary, filterable detail with flags' },
      { subTab: 'Delinquency', components: 'CorporateDelinquencySection', keyMetrics: 'Customer-level DPD, reason for delinquency, remedial actions' },
    ],
  },
  {
    tab: 'Risk & Concentrations',
    color: '#f44336',
    icon: 'Warning',
    features: [
      { subTab: 'EWS Radar', components: 'EWSRadar chart, EWSAlertTable', keyMetrics: 'Flagged entity count by score band, facility-level alerts with triggers' },
      { subTab: 'Concentrations', components: 'ConcentrationTreemap (obligor + sector)', keyMetrics: 'Obligor concentration, sector concentration, portfolio share' },
      { subTab: 'FX Risk', components: 'FX exposure table', keyMetrics: 'Currency, FX Rate, Volatility (30D/90D), YTD Depreciation, Exposure, RAG' },
      { subTab: 'Country Risk', components: 'Country risk table', keyMetrics: 'Sovereign rating, composite risk score, exposure, capital impact, RAG' },
    ],
  },
  {
    tab: 'Forward Outlook',
    color: '#009688',
    icon: 'TrendingUp',
    features: [
      { subTab: 'KPI Row', components: 'ForwardOutlookKPIRow (4 cards)', keyMetrics: 'Expected Credit Loss (Base), Provision Coverage %, Forecasted Loss Rate, 90+ DPD Forecast' },
      { subTab: 'ECL & Provision Forecast', components: 'ECLStackedArea + ProvisionCoverageLine', keyMetrics: 'ECL by IFRS stage (stacked area with scenario dropdown), weighted-avg provision coverage ratio trend' },
      { subTab: 'Forward Risk Indicators', components: 'VintageProjectionChart + ScenarioImpactTable', keyMetrics: 'Vintage delinquency forecast (solid=actual, dashed=projected), scenario comparison (Base/Adverse/Severe)' },
      { subTab: 'Methodology', components: 'FilteredMethodologySection (4 accordions)', keyMetrics: 'ECL Forecast, Provision Coverage, Vintage Delinquency, Scenario Analysis — assumptions, methods, limitations' },
    ],
  },
];

export function FeatureInventory() {
  return (
    <PRDSection id="feature-inventory" title="Feature Inventory" sectionNumber={6}>
      <Typography variant="body2" sx={{ mb: 2.5, lineHeight: 1.8 }}>
        The platform is organized into six main navigation tabs, each containing multiple sub-views
        with specialized charts, tables, and analytics. The total feature surface spans 38+ sub-views,
        50+ chart types, and 15+ table components.
      </Typography>

      {FEATURE_MAP.map((tab) => (
        <Accordion
          key={tab.tab}
          defaultExpanded={tab.tab === 'Group CRO Overview'}
          sx={{ mb: 1, '&:before': { display: 'none' }, borderRadius: '8px !important', overflow: 'hidden' }}
        >
          <AccordionSummary
            expandIcon={<ExpandMoreIcon />}
            sx={{ bgcolor: 'action.hover' }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: tab.color }} />
              <Typography sx={{ fontWeight: 700, fontSize: '0.9rem' }}>{tab.tab}</Typography>
              <Chip label={`${tab.features.length} views`} size="small" sx={{ fontSize: '0.65rem', fontWeight: 600 }} />
            </Box>
          </AccordionSummary>
          <AccordionDetails sx={{ p: 0 }}>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Sub-Tab / Section</TableCell>
                    <TableCell>Components</TableCell>
                    <TableCell>Key Metrics</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {tab.features.map((f) => (
                    <TableRow key={f.subTab} hover>
                      <TableCell sx={{ fontWeight: 600, whiteSpace: 'nowrap' }}>{f.subTab}</TableCell>
                      <TableCell sx={{ fontSize: '0.78rem' }}>{f.components}</TableCell>
                      <TableCell sx={{ fontSize: '0.78rem', color: 'text.secondary' }}>{f.keyMetrics}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </AccordionDetails>
        </Accordion>
      ))}
    </PRDSection>
  );
}
