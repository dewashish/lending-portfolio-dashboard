import { z } from 'zod';

// ── Shared validation patterns ──────────────────────────────────

const periodRegex = /^[A-Z][a-z]{2}'\d{2}$/;

const periodSchema = z.string().regex(periodRegex, {
  message: "Invalid period format. Expected Mon'YY (e.g., Apr'25)",
});

const DPD_BUCKET_VALUES = ['Current', '1-30', '31-60', '61-90', '91-120', '120+', 'Write-off'] as const;
const dpdBucketSchema = z.enum(DPD_BUCKET_VALUES, {
  message: `Invalid DPD bucket. Must be one of: ${DPD_BUCKET_VALUES.join(', ')}`,
});

const IFRS_STAGE_VALUES = ['Stage 1', 'Stage 2', 'Stage 3'] as const;
const ifrsStageSchema = z.enum(IFRS_STAGE_VALUES, {
  message: 'Invalid IFRS stage. Must be Stage 1, Stage 2, or Stage 3',
});

const nonNegativeNumber = z.number().min(0, 'Value must be non-negative');

// ── Shared optional dimension fields (V7) ───────────────────────

const dimensionFields = {
  program_type: z.string().nullable().optional(),
  customer_segment: z.string().nullable().optional(),
  product_variant: z.string().nullable().optional(),
  bureau_bucket: z.string().nullable().optional(),
  risk_band: z.string().nullable().optional(),
  income_band: z.string().nullable().optional(),
  dbr_band: z.string().nullable().optional(),
  limit_band: z.string().nullable().optional(),
  location: z.string().nullable().optional(),
  age_bracket: z.string().nullable().optional(),
  channel: z.string().nullable().optional(),
  tenure_band: z.string().nullable().optional(),
} as const;

// ── Consumer Overall Metrics ────────────────────────────────────

const consumerOverallRowSchema = z.object({
  metric_type: z.string().min(1, 'metric_type is required'),
  metric: z.string().min(1, 'metric is required'),
  period: periodSchema,
  value: z.number().nullable(),
  benchmark: z.number().nullable().optional(),
  data_source_id: z.number().positive().optional(),
});

export const consumerOverallPayloadSchema = z.object({
  subsidiary_id: z.number().positive(),
  rows: z.array(consumerOverallRowSchema).min(1, 'At least one row is required'),
});

// ── Consumer Product Metrics ────────────────────────────────────

const consumerProductRowSchema = consumerOverallRowSchema.extend({
  product_name: z.string().min(1, 'product_name is required'),
  program_type: dimensionFields.program_type,
  customer_segment: dimensionFields.customer_segment,
  product_variant: dimensionFields.product_variant,
});

export const consumerProductPayloadSchema = z.object({
  subsidiary_id: z.number().positive(),
  rows: z.array(consumerProductRowSchema).min(1),
});

// ── Net Flow Rates ──────────────────────────────────────────────

const netFlowRowSchema = z.object({
  portfolio: z.string().min(1),
  bucket: dpdBucketSchema,
  period: periodSchema,
  value: z.number().nullable(),
  product_name: z.string().nullable().optional(),
  program_type: dimensionFields.program_type,
  customer_segment: dimensionFields.customer_segment,
  product_variant: dimensionFields.product_variant,
  risk_band: dimensionFields.risk_band,
});

export const netFlowPayloadSchema = z.object({
  subsidiary_id: z.number().positive(),
  rows: z.array(netFlowRowSchema).min(1),
});

// ── Roll Rate Series ────────────────────────────────────────────

const rollRateRowSchema = z.object({
  bucket: dpdBucketSchema,
  metric: z.string().min(1),
  period: periodSchema,
  value: z.number().nullable(),
  product_name: z.string().nullable().optional(),
  program_type: dimensionFields.program_type,
  customer_segment: dimensionFields.customer_segment,
  product_variant: dimensionFields.product_variant,
  risk_band: dimensionFields.risk_band,
});

export const rollRatePayloadSchema = z.object({
  subsidiary_id: z.number().positive(),
  rows: z.array(rollRateRowSchema).min(1),
});

// ── Collection Metrics ──────────────────────────────────────────

const collectionRowSchema = z.object({
  portfolio: z.string().min(1),
  bucket: dpdBucketSchema,
  amount: nonNegativeNumber,
  transitions: z.number().optional(),
  normalized: z.number().optional(),
  roll_backward: z.number().optional(),
  stabilized: z.number().optional(),
  roll_forward: z.number().optional(),
  period: periodSchema,
  product_name: z.string().nullable().optional(),
  program_type: dimensionFields.program_type,
  customer_segment: dimensionFields.customer_segment,
  product_variant: dimensionFields.product_variant,
  risk_band: dimensionFields.risk_band,
});

export const collectionPayloadSchema = z.object({
  subsidiary_id: z.number().positive(),
  rows: z.array(collectionRowSchema).min(1),
});

// ── Vintage Points ──────────────────────────────────────────────

const vintageRowSchema = z.object({
  vintage: z.string().min(1),
  portfolio_segment: z.string().min(1),
  product_name: z.string().min(1),
  loan_amount: nonNegativeNumber,
  mob: z.number().int().min(0),
  delinquency_rate: z.number(),
  metric_type: z.string().min(1),
  program_type: dimensionFields.program_type,
  customer_segment: dimensionFields.customer_segment,
  product_variant: dimensionFields.product_variant,
  bureau_bucket: dimensionFields.bureau_bucket,
  risk_band: dimensionFields.risk_band,
  income_band: dimensionFields.income_band,
  dbr_band: dimensionFields.dbr_band,
  age_bracket: dimensionFields.age_bracket,
  tenure_band: dimensionFields.tenure_band,
});

export const vintagePayloadSchema = z.object({
  subsidiary_id: z.number().positive(),
  rows: z.array(vintageRowSchema).min(1),
});

// ── Non-Starters ────────────────────────────────────────────────

const nonStarterRowSchema = z.object({
  category: z.string().min(1),
  product: z.string().min(1),
  metric: z.string().min(1),
  period: periodSchema,
  value: z.number().nullable(),
  customer_segment: dimensionFields.customer_segment,
  product_variant: dimensionFields.product_variant,
});

export const nonStarterPayloadSchema = z.object({
  subsidiary_id: z.number().positive(),
  rows: z.array(nonStarterRowSchema).min(1),
});

// ── TDD Pre/Post Disbursal ──────────────────────────────────────

const tddPreRowSchema = z.object({
  metric: z.string().min(1),
  period: periodSchema,
  value: z.number().nullable(),
});

export const tddPrePayloadSchema = z.object({
  subsidiary_id: z.number().positive(),
  rows: z.array(tddPreRowSchema).min(1),
});

const tddPostRowSchema = z.object({
  variant: z.enum(['Fresh', 'Renewal', 'Topup']),
  bureau_bucket: z.string().min(1),
  period: periodSchema,
  value: z.number().nullable(),
  program_type: dimensionFields.program_type,
  customer_segment: dimensionFields.customer_segment,
  product_variant: dimensionFields.product_variant,
  risk_band: dimensionFields.risk_band,
  income_band: dimensionFields.income_band,
  dbr_band: dimensionFields.dbr_band,
  age_bracket: dimensionFields.age_bracket,
});

export const tddPostPayloadSchema = z.object({
  subsidiary_id: z.number().positive(),
  rows: z.array(tddPostRowSchema).min(1),
});

// ── Approved/Rejected Base ──────────────────────────────────────

const approvedRowSchema = z.object({
  la_band: z.string().min(1),
  loan_band: z.string().min(1),
  count: z.number().int().min(0),
  amount: nonNegativeNumber,
  program_type: dimensionFields.program_type,
  customer_segment: dimensionFields.customer_segment,
  product_variant: dimensionFields.product_variant,
  bureau_bucket: dimensionFields.bureau_bucket,
  risk_band: dimensionFields.risk_band,
  income_band: dimensionFields.income_band,
  dbr_band: dimensionFields.dbr_band,
  limit_band: dimensionFields.limit_band,
  location: dimensionFields.location,
  age_bracket: dimensionFields.age_bracket,
  channel: dimensionFields.channel,
  tenure_band: dimensionFields.tenure_band,
});

export const approvedBasePayloadSchema = z.object({
  subsidiary_id: z.number().positive(),
  rows: z.array(approvedRowSchema).min(1),
});

const rejectedRowSchema = z.object({
  loan_type: z.string().min(1),
  amount_band: z.string().min(1),
  count: z.number().int().min(0),
  amount: nonNegativeNumber,
  program_type: dimensionFields.program_type,
  customer_segment: dimensionFields.customer_segment,
  product_variant: dimensionFields.product_variant,
  bureau_bucket: dimensionFields.bureau_bucket,
  risk_band: dimensionFields.risk_band,
  income_band: dimensionFields.income_band,
  dbr_band: dimensionFields.dbr_band,
  limit_band: dimensionFields.limit_band,
  location: dimensionFields.location,
  age_bracket: dimensionFields.age_bracket,
  channel: dimensionFields.channel,
});

export const rejectedBasePayloadSchema = z.object({
  subsidiary_id: z.number().positive(),
  rows: z.array(rejectedRowSchema).min(1),
});

// ── LOS Metrics ─────────────────────────────────────────────────

const losMetricRowSchema = z.object({
  metric: z.string().min(1),
  product: z.string().min(1),
  ftd: z.number().nullable().optional(),
  mtd: z.number().nullable().optional(),
  lmtd: z.number().nullable().optional(),
  lm_full: z.number().nullable().optional(),
  mom_change: z.number().nullable().optional(),
  target: z.number().nullable().optional(),
  achievement: z.number().nullable().optional(),
  report_date: z.string().min(1),
  location: dimensionFields.location,
  channel: dimensionFields.channel,
});

export const losMetricsPayloadSchema = z.object({
  subsidiary_id: z.number().positive(),
  rows: z.array(losMetricRowSchema).min(1),
});

const losFunnelRowSchema = z.object({
  stage: z.string().min(1),
  product: z.string().min(1),
  ftd: z.number().nullable().optional(),
  mtd: z.number().nullable().optional(),
  lmtd: z.number().nullable().optional(),
  conversion_rate: z.number().nullable().optional(),
  report_date: z.string().min(1),
  location: dimensionFields.location,
  channel: dimensionFields.channel,
});

export const losFunnelPayloadSchema = z.object({
  subsidiary_id: z.number().positive(),
  rows: z.array(losFunnelRowSchema).min(1),
});

const losDailyRowSchema = z.object({
  date: z.string().min(1),
  product: z.string().min(1),
  count: z.number().int().min(0),
  amount: nonNegativeNumber,
  avg_ticket_size: z.number().nullable().optional(),
  location: dimensionFields.location,
  channel: dimensionFields.channel,
});

export const losDailyPayloadSchema = z.object({
  subsidiary_id: z.number().positive(),
  rows: z.array(losDailyRowSchema).min(1),
});

// ── Trade Facilities ────────────────────────────────────────────

const TRADE_PRODUCT_TYPES = [
  'Import LC', 'Export LC', 'Bank Guarantee - Performance',
  'Bank Guarantee - Financial', 'Trade Loan - Pre-Export',
  'Trade Loan - Post-Import', 'SBLC', 'Forfaiting',
  'Documentary Collection - D/P', 'Documentary Collection - D/A',
] as const;

const tradeFacilityRowSchema = z.object({
  facility_reference: z.string().min(1),
  obligor_name: z.string().min(1),
  sector: z.string().optional(),
  commodity: z.string().optional(),
  product_type: z.enum(TRADE_PRODUCT_TYPES),
  currency: z.string().length(3),
  facility_limit: nonNegativeNumber,
  outstanding: nonNegativeNumber,
  prev_month_outstanding: z.number().optional(),
  tenor_days: z.number().int().optional(),
  start_date: z.string().optional(),
  maturity_date: z.string().optional(),
  internal_rating: z.string().optional(),
  external_rating: z.string().optional(),
  days_past_due: z.number().int().min(0).optional(),
  ifrs9_stage: ifrsStageSchema.optional(),
  provision_rate: z.number().optional(),
  provision_amount: z.number().optional(),
  collateral_value: z.number().optional(),
  collateral_coverage: z.number().optional(),
  risk_weight: z.number().optional(),
  counterparty_bank: z.string().nullable().optional(),
  watchlist_flag: z.boolean().optional(),
  ews_score: z.number().min(0).max(10).optional(),
  ews_triggers: z.array(z.string()).optional(),
  report_date: z.string().min(1),
});

export const tradeFacilitiesPayloadSchema = z.object({
  subsidiary_id: z.number().positive(),
  rows: z.array(tradeFacilityRowSchema).min(1),
});

// ── Corporate Portfolio Metrics ─────────────────────────────────

const corporateMetricRowSchema = z.object({
  particular: z.string().min(1),
  period: periodSchema,
  total: z.number().nullable(),
  fund_based: z.number().nullable().optional(),
  non_fund_based: z.number().nullable().optional(),
});

export const corporateMetricsPayloadSchema = z.object({
  subsidiary_id: z.number().positive(),
  rows: z.array(corporateMetricRowSchema).min(1),
});

// ── Corporate Covenants ─────────────────────────────────────────

const corporateCovenantRowSchema = z.object({
  group_id: z.string().min(1),
  cust_id: z.string().min(1),
  customer_name: z.string().min(1),
  date_of_disbursal: z.string().optional(),
  sanctioned_limit: nonNegativeNumber,
  disbursed_amount: nonNegativeNumber,
  current_pos: nonNegativeNumber,
  facility_type: z.string().optional(),
  security_type: z.string().optional(),
  security_cover: z.number().optional(),
  risk_rating: z.string().optional(),
  covenant_category: z.string().min(1),
  covenant_type: z.string().min(1),
  covenant_description: z.string().optional(),
  covenant_frequency: z.string().optional(),
  submission_date: z.string().optional(),
  approval_for_extension: z.string().optional(),
  creation_date: z.string().optional(),
  extended_closure_date: z.string().nullable().optional(),
  npa_flag: z.boolean().optional(),
  restructured_flag: z.boolean().optional(),
  watchlist_flag: z.boolean().optional(),
  writeoff_flag: z.boolean().optional(),
  rm_name: z.string().optional(),
  rm_email: z.string().optional(),
  rm_phone: z.string().optional(),
  rm_department: z.string().optional(),
  breached: z.boolean().optional(),
  days_since_breach: z.number().int().optional(),
  // Sammaan PQR covenant monitoring (net-new; optional)
  threshold_value: z.string().nullable().optional(),
  actual_value: z.string().nullable().optional(),
  breach_pct: z.number().nullable().optional(),
  waiver_status: z.string().nullable().optional(),
  cure_deadline: z.string().nullable().optional(),
});

export const corporateCovenantsPayloadSchema = z.object({
  subsidiary_id: z.number().positive(),
  rows: z.array(corporateCovenantRowSchema).min(1),
});

// ── Corporate Delinquency ───────────────────────────────────────

const corporateDelinquencyRowSchema = z.object({
  group_id: z.string().min(1),
  cust_id: z.string().min(1),
  customer_name: z.string().min(1),
  sector: z.string().optional(),
  industry: z.string().optional(),
  sanctioned_limit: nonNegativeNumber,
  disbursed_amount: nonNegativeNumber,
  current_pos: nonNegativeNumber,
  facility_type: z.string().optional(),
  security_type: z.string().optional(),
  security_cover: z.number().optional(),
  rating_at_disbursement: z.string().optional(),
  current_rating: z.string().optional(),
  renewal_done: z.boolean().optional(),
  dpd_at_month_end: z.number().int().min(0).optional(),
  current_dpd: z.number().int().min(0).optional(),
  reason_for_delinquency: z.string().optional(),
  last_remedial_action: z.string().optional(),
  update_on_remedial: z.string().optional(),
  current_status: z.string().optional(),
  next_step: z.string().optional(),
});

export const corporateDelinquencyPayloadSchema = z.object({
  subsidiary_id: z.number().positive(),
  rows: z.array(corporateDelinquencyRowSchema).min(1),
});

// ── Corporate Watchlist ─────────────────────────────────────────

const corporateWatchlistRowSchema = z.object({
  borrower: z.string().min(1),
  sector: z.string().optional(),
  exposure: nonNegativeNumber,
  ews_trigger_type: z.string().optional(),
  internal_rating: z.string().optional(),
  status: z.string().optional(),
  remedial_action: z.string().optional(),
  // Sammaan PQR watch-list detail (net-new; optional)
  watch_grade: z.string().nullable().optional(),
  dpd: z.number().int().nullable().optional(),
  ifrs_stage: z.string().nullable().optional(),
});

export const corporateWatchlistPayloadSchema = z.object({
  subsidiary_id: z.number().positive(),
  rows: z.array(corporateWatchlistRowSchema).min(1),
});

// ── EWS Entity Summary ─────────────────────────────────────────

const ewsEntityRowSchema = z.object({
  score0: z.number().int().min(0),
  score1: z.number().int().min(0),
  score2: z.number().int().min(0),
  score3: z.number().int().min(0),
  score4_plus: z.number().int().min(0),
  total_facilities: z.number().int().min(0),
  avg_ews_score: z.number(),
  flagged_exposure: nonNegativeNumber,
  rag_status: z.enum(['Green', 'Amber', 'Red']),
});

export const ewsEntityPayloadSchema = z.object({
  subsidiary_id: z.number().positive(),
  data: ewsEntityRowSchema,
});

// ── EWS Facility Alerts ─────────────────────────────────────────

const ewsFacilityAlertRowSchema = z.object({
  facility_ref: z.string().min(1),
  obligor: z.string().min(1),
  ews_score: z.number().min(0),
  outstanding: nonNegativeNumber,
  triggers: z.string().optional(),
  ifrs_stage: ifrsStageSchema.optional(),
  action: z.string().optional(),
});

export const ewsFacilityAlertsPayloadSchema = z.object({
  subsidiary_id: z.number().positive(),
  rows: z.array(ewsFacilityAlertRowSchema).min(1),
});

// ── FX Rates ────────────────────────────────────────────────────

const fxRateRowSchema = z.object({
  from_currency: z.string().length(3),
  to_currency: z.string().length(3).default('USD'),
  rate: z.number().positive(),
  effective_date: z.string().min(1),
});

export const fxRatesPayloadSchema = z.object({
  rows: z.array(fxRateRowSchema).min(1),
});

// ── ARC Performance (Sammaan PQR) ───────────────────────────────

const arcPerformanceRowSchema = z.object({
  arc_name: z.string().min(1),
  period: z.string().min(1),
  original_pos: nonNegativeNumber.optional(),
  current_pos: nonNegativeNumber.optional(),
  lifetime_recoveries: nonNegativeNumber.optional(),
  expected_recoveries_agreed: nonNegativeNumber.optional(),
  current_month_recoveries: nonNegativeNumber.optional(),
  agreement_start_date: z.string().nullable().optional(),
  agreement_end_date: z.string().nullable().optional(),
});

export const arcPerformancePayloadSchema = z.object({
  subsidiary_id: z.number().positive(),
  rows: z.array(arcPerformanceRowSchema).min(1),
});

// ── NPA Collection (ARC & Non-ARC) ──────────────────────────────

const npaCollectionRowSchema = z.object({
  period: z.string().min(1),
  arc_type: z.string().min(1),
  pos: nonNegativeNumber.optional(),
  money_collected: nonNegativeNumber.optional(),
  collected_to_pos_pct: z.number().optional(),
});

export const npaCollectionPayloadSchema = z.object({
  subsidiary_id: z.number().positive(),
  rows: z.array(npaCollectionRowSchema).min(1),
});

// ── Validate Payload (dry-run) ──────────────────────────────────

const validatePayloadSchema = z.object({
  subsidiary_id: z.number().positive(),
  table: z.string().min(1),
  rows: z.array(z.record(z.string(), z.unknown())).min(1),
});

export const validateRequestSchema = validatePayloadSchema;

// ── Export all schemas for dynamic lookup ────────────────────────

export const SCHEMA_MAP: Record<string, z.ZodType> = {
  consumer_overall_metrics: consumerOverallPayloadSchema,
  consumer_product_metrics: consumerProductPayloadSchema,
  net_flow_rates: netFlowPayloadSchema,
  roll_rate_series: rollRatePayloadSchema,
  collection_metrics: collectionPayloadSchema,
  vintage_points: vintagePayloadSchema,
  non_starters: nonStarterPayloadSchema,
  tdd_pre_disbursal: tddPrePayloadSchema,
  tdd_post_disbursal: tddPostPayloadSchema,
  approved_base: approvedBasePayloadSchema,
  rejected_base: rejectedBasePayloadSchema,
  los_metrics: losMetricsPayloadSchema,
  los_funnel: losFunnelPayloadSchema,
  los_daily: losDailyPayloadSchema,
  trade_facilities: tradeFacilitiesPayloadSchema,
  corporate_portfolio_metrics: corporateMetricsPayloadSchema,
  corporate_covenants: corporateCovenantsPayloadSchema,
  corporate_delinquency: corporateDelinquencyPayloadSchema,
  corporate_watchlist: corporateWatchlistPayloadSchema,
  ews_entity_summary: ewsEntityPayloadSchema,
  ews_facility_alerts: ewsFacilityAlertsPayloadSchema,
  fx_rates: fxRatesPayloadSchema,
  arc_performance: arcPerformancePayloadSchema,
  npa_collection: npaCollectionPayloadSchema,
};
