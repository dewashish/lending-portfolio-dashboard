-- Multi-Geography Consumer Finance Database Schema
-- 37 tables (6 dimension + 17 operational + 14 PQR summary) + 8 views
-- Supports 5 subsidiaries across 4 regions with USD consolidation

-- ============================================================================
-- PHASE 1: Dimension Tables (6 tables)
-- ============================================================================

-- 1. Regions
CREATE TABLE IF NOT EXISTS regions (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Subsidiaries
CREATE TABLE IF NOT EXISTS subsidiaries (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  short_code TEXT NOT NULL UNIQUE,
  country TEXT NOT NULL,
  country_code CHAR(2) NOT NULL,
  region_id INTEGER NOT NULL REFERENCES regions(id),
  currency_code CHAR(3) NOT NULL,
  institution_type TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Currencies
CREATE TABLE IF NOT EXISTS currencies (
  code CHAR(3) PRIMARY KEY,
  name TEXT NOT NULL,
  symbol TEXT NOT NULL
);

-- 4. FX Rates
CREATE TABLE IF NOT EXISTS fx_rates (
  id SERIAL PRIMARY KEY,
  from_currency CHAR(3) NOT NULL REFERENCES currencies(code),
  to_currency CHAR(3) NOT NULL DEFAULT 'USD',
  rate NUMERIC NOT NULL,
  effective_date DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(from_currency, to_currency, effective_date)
);

-- 5. Data Sources
CREATE TABLE IF NOT EXISTS data_sources (
  id SERIAL PRIMARY KEY,
  subsidiary_id INTEGER NOT NULL REFERENCES subsidiaries(id),
  source_type TEXT NOT NULL,
  source_name TEXT,
  last_sync_at TIMESTAMPTZ,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 6. Product Catalog
CREATE TABLE IF NOT EXISTS product_catalog (
  id SERIAL PRIMARY KEY,
  subsidiary_id INTEGER NOT NULL REFERENCES subsidiaries(id),
  product_name TEXT NOT NULL,
  product_category TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(subsidiary_id, product_name)
);

-- ============================================================================
-- PHASE 2: LOS — Loan Origination System (5 tables)
-- ============================================================================

-- 7. LOS Customers
CREATE TABLE IF NOT EXISTS los_customers (
  id SERIAL PRIMARY KEY,
  subsidiary_id INTEGER NOT NULL REFERENCES subsidiaries(id),
  customer_ref TEXT NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  date_of_birth DATE,
  gender TEXT,
  national_id TEXT,
  email TEXT,
  phone TEXT,
  employment_type TEXT,
  employer_name TEXT,
  monthly_income NUMERIC,
  monthly_income_usd NUMERIC,
  address_line1 TEXT,
  city TEXT,
  state_province TEXT,
  postal_code TEXT,
  country_code CHAR(2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(subsidiary_id, customer_ref)
);
CREATE INDEX IF NOT EXISTS idx_los_customers_subsidiary ON los_customers(subsidiary_id);
CREATE INDEX IF NOT EXISTS idx_los_customers_state ON los_customers(subsidiary_id, state_province);

-- 8. LOS Applications
CREATE TABLE IF NOT EXISTS los_applications (
  id SERIAL PRIMARY KEY,
  subsidiary_id INTEGER NOT NULL REFERENCES subsidiaries(id),
  application_ref TEXT NOT NULL,
  customer_id INTEGER NOT NULL REFERENCES los_customers(id),
  product_name TEXT NOT NULL,
  product_category TEXT NOT NULL,
  channel TEXT NOT NULL,
  requested_amount NUMERIC NOT NULL,
  requested_amount_usd NUMERIC,
  requested_tenure_months INTEGER,
  current_stage TEXT NOT NULL,
  lead_date DATE,
  application_date DATE,
  sanction_date DATE,
  disbursement_date DATE,
  rejection_date DATE,
  sanctioned_amount NUMERIC,
  sanctioned_amount_usd NUMERIC,
  approved_rate NUMERIC,
  approved_tenure_months INTEGER,
  branch_code TEXT,
  rm_code TEXT,
  data_source_id INTEGER REFERENCES data_sources(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(subsidiary_id, application_ref)
);
CREATE INDEX IF NOT EXISTS idx_los_applications_subsidiary ON los_applications(subsidiary_id);
CREATE INDEX IF NOT EXISTS idx_los_applications_stage ON los_applications(subsidiary_id, current_stage);
CREATE INDEX IF NOT EXISTS idx_los_applications_product ON los_applications(subsidiary_id, product_name);
CREATE INDEX IF NOT EXISTS idx_los_applications_date ON los_applications(subsidiary_id, application_date);

-- 9. LOS Credit Bureau Pulls
CREATE TABLE IF NOT EXISTS los_credit_bureau_pulls (
  id SERIAL PRIMARY KEY,
  subsidiary_id INTEGER NOT NULL REFERENCES subsidiaries(id),
  application_id INTEGER NOT NULL REFERENCES los_applications(id),
  customer_id INTEGER NOT NULL REFERENCES los_customers(id),
  bureau_name TEXT NOT NULL,
  score INTEGER,
  score_band TEXT,
  pull_date DATE NOT NULL,
  num_active_accounts INTEGER,
  num_inquiries_90d INTEGER,
  total_existing_debt NUMERIC,
  total_existing_debt_usd NUMERIC,
  delinquency_flag BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_los_bureau_subsidiary ON los_credit_bureau_pulls(subsidiary_id);
CREATE INDEX IF NOT EXISTS idx_los_bureau_band ON los_credit_bureau_pulls(subsidiary_id, score_band);

-- 10. LOS Decisions
CREATE TABLE IF NOT EXISTS los_decisions (
  id SERIAL PRIMARY KEY,
  subsidiary_id INTEGER NOT NULL REFERENCES subsidiaries(id),
  application_id INTEGER NOT NULL REFERENCES los_applications(id),
  decision TEXT NOT NULL,
  decision_date DATE NOT NULL,
  decided_by TEXT,
  rejection_reason TEXT,
  conditions TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_los_decisions_subsidiary ON los_decisions(subsidiary_id);

-- 11. LOS Disbursements
CREATE TABLE IF NOT EXISTS los_disbursements (
  id SERIAL PRIMARY KEY,
  subsidiary_id INTEGER NOT NULL REFERENCES subsidiaries(id),
  application_id INTEGER NOT NULL REFERENCES los_applications(id),
  customer_id INTEGER NOT NULL REFERENCES los_customers(id),
  lms_account_ref TEXT,
  disbursement_date DATE NOT NULL,
  disbursed_amount NUMERIC NOT NULL,
  disbursed_amount_usd NUMERIC,
  disbursement_type TEXT NOT NULL,
  product_name TEXT NOT NULL,
  interest_rate NUMERIC NOT NULL,
  tenure_months INTEGER NOT NULL,
  emi_amount NUMERIC,
  emi_amount_usd NUMERIC,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_los_disbursements_subsidiary ON los_disbursements(subsidiary_id);
CREATE INDEX IF NOT EXISTS idx_los_disbursements_date ON los_disbursements(subsidiary_id, disbursement_date);

-- ============================================================================
-- PHASE 3: LMS — Loan Management System (7 tables)
-- ============================================================================

-- 12. LMS Accounts
CREATE TABLE IF NOT EXISTS lms_accounts (
  id SERIAL PRIMARY KEY,
  subsidiary_id INTEGER NOT NULL REFERENCES subsidiaries(id),
  account_ref TEXT NOT NULL,
  customer_id INTEGER NOT NULL REFERENCES los_customers(id),
  application_id INTEGER REFERENCES los_applications(id),
  product_name TEXT NOT NULL,
  product_category TEXT NOT NULL,
  disbursement_date DATE NOT NULL,
  maturity_date DATE NOT NULL,
  sanction_amount NUMERIC NOT NULL,
  sanction_amount_usd NUMERIC,
  disbursed_amount NUMERIC NOT NULL,
  disbursed_amount_usd NUMERIC,
  interest_rate NUMERIC NOT NULL,
  tenure_months INTEGER NOT NULL,
  emi_amount NUMERIC NOT NULL,
  emi_amount_usd NUMERIC,
  principal_outstanding NUMERIC NOT NULL DEFAULT 0,
  principal_outstanding_usd NUMERIC DEFAULT 0,
  current_dpd INTEGER NOT NULL DEFAULT 0,
  dpd_bucket TEXT NOT NULL DEFAULT 'Current',
  ifrs_stage TEXT NOT NULL DEFAULT 'Stage 1',
  account_status TEXT NOT NULL DEFAULT 'Active',
  vintage TEXT NOT NULL,
  is_secured BOOLEAN NOT NULL DEFAULT false,
  is_npa BOOLEAN NOT NULL DEFAULT false,
  is_restructured BOOLEAN NOT NULL DEFAULT false,
  disbursement_type TEXT DEFAULT 'Fresh',
  branch_code TEXT,
  data_source_id INTEGER REFERENCES data_sources(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(subsidiary_id, account_ref)
);
CREATE INDEX IF NOT EXISTS idx_lms_accounts_subsidiary ON lms_accounts(subsidiary_id);
CREATE INDEX IF NOT EXISTS idx_lms_accounts_dpd ON lms_accounts(subsidiary_id, dpd_bucket);
CREATE INDEX IF NOT EXISTS idx_lms_accounts_product ON lms_accounts(subsidiary_id, product_name);
CREATE INDEX IF NOT EXISTS idx_lms_accounts_vintage ON lms_accounts(subsidiary_id, vintage);
CREATE INDEX IF NOT EXISTS idx_lms_accounts_status ON lms_accounts(subsidiary_id, account_status);

-- 13. LMS Balance Snapshots
CREATE TABLE IF NOT EXISTS lms_balance_snapshots (
  id SERIAL PRIMARY KEY,
  subsidiary_id INTEGER NOT NULL REFERENCES subsidiaries(id),
  account_id INTEGER NOT NULL REFERENCES lms_accounts(id),
  snapshot_date DATE NOT NULL,
  principal_outstanding NUMERIC NOT NULL,
  principal_outstanding_usd NUMERIC,
  interest_outstanding NUMERIC DEFAULT 0,
  interest_outstanding_usd NUMERIC,
  overdue_amount NUMERIC DEFAULT 0,
  overdue_amount_usd NUMERIC,
  provision_amount NUMERIC DEFAULT 0,
  provision_amount_usd NUMERIC,
  dpd INTEGER NOT NULL DEFAULT 0,
  dpd_bucket TEXT NOT NULL,
  ifrs_stage TEXT NOT NULL,
  emi_due_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(account_id, snapshot_date)
);
CREATE INDEX IF NOT EXISTS idx_lms_balances_subsidiary ON lms_balance_snapshots(subsidiary_id);
CREATE INDEX IF NOT EXISTS idx_lms_balances_date ON lms_balance_snapshots(subsidiary_id, snapshot_date);
CREATE INDEX IF NOT EXISTS idx_lms_balances_dpd ON lms_balance_snapshots(subsidiary_id, snapshot_date, dpd_bucket);

-- 14. LMS DPD History
CREATE TABLE IF NOT EXISTS lms_dpd_history (
  id SERIAL PRIMARY KEY,
  subsidiary_id INTEGER NOT NULL REFERENCES subsidiaries(id),
  account_id INTEGER NOT NULL REFERENCES lms_accounts(id),
  period TEXT NOT NULL,
  dpd INTEGER NOT NULL,
  dpd_bucket TEXT NOT NULL,
  previous_dpd_bucket TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(account_id, period)
);
CREATE INDEX IF NOT EXISTS idx_lms_dpd_subsidiary ON lms_dpd_history(subsidiary_id);
CREATE INDEX IF NOT EXISTS idx_lms_dpd_period ON lms_dpd_history(subsidiary_id, period);

-- 15. LMS Payment Transactions
CREATE TABLE IF NOT EXISTS lms_payment_transactions (
  id SERIAL PRIMARY KEY,
  subsidiary_id INTEGER NOT NULL REFERENCES subsidiaries(id),
  account_id INTEGER NOT NULL REFERENCES lms_accounts(id),
  payment_date DATE NOT NULL,
  amount NUMERIC NOT NULL,
  amount_usd NUMERIC,
  payment_mode TEXT NOT NULL,
  principal_component NUMERIC DEFAULT 0,
  interest_component NUMERIC DEFAULT 0,
  fees_component NUMERIC DEFAULT 0,
  penalty_component NUMERIC DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'Success',
  bounce_reason TEXT,
  reference_number TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_lms_payments_subsidiary ON lms_payment_transactions(subsidiary_id);
CREATE INDEX IF NOT EXISTS idx_lms_payments_date ON lms_payment_transactions(subsidiary_id, payment_date);
CREATE INDEX IF NOT EXISTS idx_lms_payments_status ON lms_payment_transactions(subsidiary_id, status);

-- 16. LMS Collateral
CREATE TABLE IF NOT EXISTS lms_collateral (
  id SERIAL PRIMARY KEY,
  subsidiary_id INTEGER NOT NULL REFERENCES subsidiaries(id),
  account_id INTEGER NOT NULL REFERENCES lms_accounts(id),
  collateral_type TEXT NOT NULL,
  description TEXT,
  valuation_amount NUMERIC NOT NULL,
  valuation_amount_usd NUMERIC,
  valuation_date DATE NOT NULL,
  ltv_ratio NUMERIC,
  current_ltv NUMERIC,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_lms_collateral_subsidiary ON lms_collateral(subsidiary_id);

-- 17. LMS Write-offs
CREATE TABLE IF NOT EXISTS lms_writeoffs (
  id SERIAL PRIMARY KEY,
  subsidiary_id INTEGER NOT NULL REFERENCES subsidiaries(id),
  account_id INTEGER NOT NULL REFERENCES lms_accounts(id),
  writeoff_date DATE NOT NULL,
  writeoff_amount NUMERIC NOT NULL,
  writeoff_amount_usd NUMERIC,
  reason TEXT,
  total_recovered NUMERIC DEFAULT 0,
  total_recovered_usd NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_lms_writeoffs_subsidiary ON lms_writeoffs(subsidiary_id);

-- 18. LMS Restructures
CREATE TABLE IF NOT EXISTS lms_restructures (
  id SERIAL PRIMARY KEY,
  subsidiary_id INTEGER NOT NULL REFERENCES subsidiaries(id),
  account_id INTEGER NOT NULL REFERENCES lms_accounts(id),
  restructure_date DATE NOT NULL,
  restructure_type TEXT NOT NULL,
  original_emi NUMERIC,
  revised_emi NUMERIC,
  revised_emi_usd NUMERIC,
  original_tenure INTEGER,
  revised_tenure INTEGER,
  dpd_at_restructure INTEGER,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_lms_restructures_subsidiary ON lms_restructures(subsidiary_id);

-- ============================================================================
-- PHASE 4: Collections (5 tables)
-- ============================================================================

-- 19. Collection Agencies
CREATE TABLE IF NOT EXISTS col_agencies (
  id SERIAL PRIMARY KEY,
  subsidiary_id INTEGER NOT NULL REFERENCES subsidiaries(id),
  agency_name TEXT NOT NULL,
  agency_type TEXT NOT NULL,
  coverage_buckets TEXT[],
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(subsidiary_id, agency_name)
);

-- 20. Collection Assignments
CREATE TABLE IF NOT EXISTS col_assignments (
  id SERIAL PRIMARY KEY,
  subsidiary_id INTEGER NOT NULL REFERENCES subsidiaries(id),
  account_id INTEGER NOT NULL REFERENCES lms_accounts(id),
  agency_id INTEGER NOT NULL REFERENCES col_agencies(id),
  assigned_date DATE NOT NULL,
  dpd_at_assignment INTEGER NOT NULL,
  bucket_at_assignment TEXT NOT NULL,
  outstanding_at_assignment NUMERIC NOT NULL,
  outstanding_at_assignment_usd NUMERIC,
  status TEXT NOT NULL DEFAULT 'Active',
  resolved_date DATE,
  resolution_type TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_col_assignments_subsidiary ON col_assignments(subsidiary_id);
CREATE INDEX IF NOT EXISTS idx_col_assignments_status ON col_assignments(subsidiary_id, status);
CREATE INDEX IF NOT EXISTS idx_col_assignments_bucket ON col_assignments(subsidiary_id, bucket_at_assignment);

-- 21. Collection Actions
CREATE TABLE IF NOT EXISTS col_actions (
  id SERIAL PRIMARY KEY,
  subsidiary_id INTEGER NOT NULL REFERENCES subsidiaries(id),
  assignment_id INTEGER NOT NULL REFERENCES col_assignments(id),
  account_id INTEGER NOT NULL REFERENCES lms_accounts(id),
  action_date DATE NOT NULL,
  action_type TEXT NOT NULL,
  outcome TEXT NOT NULL,
  promise_date DATE,
  promise_amount NUMERIC,
  notes TEXT,
  agent_code TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_col_actions_subsidiary ON col_actions(subsidiary_id);
CREATE INDEX IF NOT EXISTS idx_col_actions_date ON col_actions(subsidiary_id, action_date);

-- 22. Collection Recovery Payments
CREATE TABLE IF NOT EXISTS col_recovery_payments (
  id SERIAL PRIMARY KEY,
  subsidiary_id INTEGER NOT NULL REFERENCES subsidiaries(id),
  assignment_id INTEGER NOT NULL REFERENCES col_assignments(id),
  account_id INTEGER NOT NULL REFERENCES lms_accounts(id),
  payment_date DATE NOT NULL,
  amount NUMERIC NOT NULL,
  amount_usd NUMERIC,
  payment_mode TEXT NOT NULL,
  is_settlement BOOLEAN DEFAULT false,
  settlement_discount_pct NUMERIC,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_col_recovery_subsidiary ON col_recovery_payments(subsidiary_id);
CREATE INDEX IF NOT EXISTS idx_col_recovery_date ON col_recovery_payments(subsidiary_id, payment_date);

-- 23. Legal Cases
CREATE TABLE IF NOT EXISTS col_legal_cases (
  id SERIAL PRIMARY KEY,
  subsidiary_id INTEGER NOT NULL REFERENCES subsidiaries(id),
  account_id INTEGER NOT NULL REFERENCES lms_accounts(id),
  assignment_id INTEGER REFERENCES col_assignments(id),
  case_ref TEXT,
  filing_date DATE NOT NULL,
  case_type TEXT NOT NULL,
  case_status TEXT NOT NULL DEFAULT 'Filed',
  outstanding_at_filing NUMERIC NOT NULL,
  outstanding_at_filing_usd NUMERIC,
  decree_amount NUMERIC,
  decree_amount_usd NUMERIC,
  closed_date DATE,
  recovery_amount NUMERIC DEFAULT 0,
  recovery_amount_usd NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_col_legal_subsidiary ON col_legal_cases(subsidiary_id);

-- ============================================================================
-- PHASE 5: Modified PQR Summary Tables (14 tables)
-- Each gets subsidiary_id FK + USD companion columns + data_source_id
-- ============================================================================

-- Drop old tables if they exist (clean migration)
DROP TABLE IF EXISTS los_daily CASCADE;
DROP TABLE IF EXISTS los_funnel CASCADE;
DROP TABLE IF EXISTS los_metrics CASCADE;
DROP TABLE IF EXISTS rejected_base CASCADE;
DROP TABLE IF EXISTS approved_base CASCADE;
DROP TABLE IF EXISTS tdd_post_disbursal CASCADE;
DROP TABLE IF EXISTS tdd_pre_disbursal CASCADE;
DROP TABLE IF EXISTS non_starters CASCADE;
DROP TABLE IF EXISTS vintage_points CASCADE;
DROP TABLE IF EXISTS collection_metrics CASCADE;
DROP TABLE IF EXISTS roll_rate_series CASCADE;
DROP TABLE IF EXISTS net_flow_rates CASCADE;
DROP TABLE IF EXISTS consumer_product_metrics CASCADE;
DROP TABLE IF EXISTS consumer_overall_metrics CASCADE;

-- 24. Consumer Overall Metrics
CREATE TABLE consumer_overall_metrics (
  id SERIAL PRIMARY KEY,
  subsidiary_id INTEGER NOT NULL REFERENCES subsidiaries(id),
  metric_type TEXT NOT NULL,
  metric TEXT NOT NULL,
  period TEXT NOT NULL,
  value NUMERIC,
  value_usd NUMERIC,
  benchmark NUMERIC,
  data_source_id INTEGER REFERENCES data_sources(id),
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_com_subsidiary ON consumer_overall_metrics(subsidiary_id);

-- 25. Consumer Product Metrics
CREATE TABLE consumer_product_metrics (
  id SERIAL PRIMARY KEY,
  subsidiary_id INTEGER NOT NULL REFERENCES subsidiaries(id),
  product_name TEXT NOT NULL,
  metric_type TEXT NOT NULL,
  metric TEXT NOT NULL,
  period TEXT NOT NULL,
  value NUMERIC,
  value_usd NUMERIC,
  benchmark NUMERIC,
  data_source_id INTEGER REFERENCES data_sources(id),
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_cpm_subsidiary ON consumer_product_metrics(subsidiary_id);

-- 26. Net Flow Rates
CREATE TABLE net_flow_rates (
  id SERIAL PRIMARY KEY,
  subsidiary_id INTEGER NOT NULL REFERENCES subsidiaries(id),
  portfolio TEXT NOT NULL,
  bucket TEXT NOT NULL,
  period TEXT NOT NULL,
  value NUMERIC NOT NULL,
  value_usd NUMERIC,
  data_source_id INTEGER REFERENCES data_sources(id),
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_nfr_subsidiary ON net_flow_rates(subsidiary_id);

-- 27. Roll Rate Series
CREATE TABLE roll_rate_series (
  id SERIAL PRIMARY KEY,
  subsidiary_id INTEGER NOT NULL REFERENCES subsidiaries(id),
  bucket TEXT NOT NULL,
  metric TEXT NOT NULL,
  period TEXT NOT NULL,
  value NUMERIC NOT NULL,
  data_source_id INTEGER REFERENCES data_sources(id),
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_rrs_subsidiary ON roll_rate_series(subsidiary_id);

-- 28. Collection Metrics (PQR summary)
CREATE TABLE collection_metrics (
  id SERIAL PRIMARY KEY,
  subsidiary_id INTEGER NOT NULL REFERENCES subsidiaries(id),
  portfolio TEXT NOT NULL,
  bucket TEXT NOT NULL,
  amount NUMERIC,
  amount_usd NUMERIC,
  transitions NUMERIC,
  normalized NUMERIC,
  roll_backward NUMERIC,
  stabilized NUMERIC,
  roll_forward NUMERIC,
  period TEXT NOT NULL,
  data_source_id INTEGER REFERENCES data_sources(id),
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_cm_subsidiary ON collection_metrics(subsidiary_id);

-- 29. Vintage Points
CREATE TABLE vintage_points (
  id SERIAL PRIMARY KEY,
  subsidiary_id INTEGER NOT NULL REFERENCES subsidiaries(id),
  vintage TEXT NOT NULL,
  portfolio_segment TEXT DEFAULT 'Total',
  product_name TEXT,
  loan_amount NUMERIC,
  loan_amount_usd NUMERIC,
  mob INTEGER NOT NULL,
  delinquency_rate NUMERIC NOT NULL,
  metric_type TEXT NOT NULL,
  data_source_id INTEGER REFERENCES data_sources(id),
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_vp_subsidiary ON vintage_points(subsidiary_id);

-- 30. Non-Starters
CREATE TABLE non_starters (
  id SERIAL PRIMARY KEY,
  subsidiary_id INTEGER NOT NULL REFERENCES subsidiaries(id),
  category TEXT NOT NULL,
  product TEXT NOT NULL,
  metric TEXT NOT NULL,
  period TEXT NOT NULL,
  value NUMERIC,
  value_usd NUMERIC,
  data_source_id INTEGER REFERENCES data_sources(id),
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_ns_subsidiary ON non_starters(subsidiary_id);

-- 31. TDD Pre Disbursal
CREATE TABLE tdd_pre_disbursal (
  id SERIAL PRIMARY KEY,
  subsidiary_id INTEGER NOT NULL REFERENCES subsidiaries(id),
  metric TEXT NOT NULL,
  period TEXT NOT NULL,
  value NUMERIC,
  data_source_id INTEGER REFERENCES data_sources(id),
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_tddpre_subsidiary ON tdd_pre_disbursal(subsidiary_id);

-- 32. TDD Post Disbursal
CREATE TABLE tdd_post_disbursal (
  id SERIAL PRIMARY KEY,
  subsidiary_id INTEGER NOT NULL REFERENCES subsidiaries(id),
  variant TEXT NOT NULL,
  bureau_bucket TEXT NOT NULL,
  period TEXT NOT NULL,
  value NUMERIC,
  data_source_id INTEGER REFERENCES data_sources(id),
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_tddpost_subsidiary ON tdd_post_disbursal(subsidiary_id);

-- 33. Approved Base
CREATE TABLE approved_base (
  id SERIAL PRIMARY KEY,
  subsidiary_id INTEGER NOT NULL REFERENCES subsidiaries(id),
  la_band TEXT NOT NULL,
  loan_band TEXT NOT NULL,
  count INTEGER,
  amount NUMERIC,
  amount_usd NUMERIC,
  data_source_id INTEGER REFERENCES data_sources(id),
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_ab_subsidiary ON approved_base(subsidiary_id);

-- 34. Rejected Base
CREATE TABLE rejected_base (
  id SERIAL PRIMARY KEY,
  subsidiary_id INTEGER NOT NULL REFERENCES subsidiaries(id),
  loan_type TEXT NOT NULL,
  amount_band TEXT NOT NULL,
  count INTEGER,
  amount NUMERIC,
  amount_usd NUMERIC,
  data_source_id INTEGER REFERENCES data_sources(id),
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_rb_subsidiary ON rejected_base(subsidiary_id);

-- 35. LOS Metrics (MTD/LMTD/FTD)
CREATE TABLE los_metrics (
  id SERIAL PRIMARY KEY,
  subsidiary_id INTEGER NOT NULL REFERENCES subsidiaries(id),
  metric TEXT NOT NULL,
  product TEXT NOT NULL,
  ftd NUMERIC,
  mtd NUMERIC,
  lmtd NUMERIC,
  lm_full NUMERIC,
  ftd_usd NUMERIC,
  mtd_usd NUMERIC,
  lmtd_usd NUMERIC,
  lm_full_usd NUMERIC,
  mom_change NUMERIC,
  target NUMERIC,
  target_usd NUMERIC,
  achievement NUMERIC,
  report_date DATE DEFAULT CURRENT_DATE,
  data_source_id INTEGER REFERENCES data_sources(id),
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_lm_subsidiary ON los_metrics(subsidiary_id);

-- 36. LOS Funnel
CREATE TABLE los_funnel (
  id SERIAL PRIMARY KEY,
  subsidiary_id INTEGER NOT NULL REFERENCES subsidiaries(id),
  stage TEXT NOT NULL,
  product TEXT NOT NULL,
  ftd NUMERIC,
  mtd NUMERIC,
  lmtd NUMERIC,
  ftd_usd NUMERIC,
  mtd_usd NUMERIC,
  lmtd_usd NUMERIC,
  conversion_rate NUMERIC,
  report_date DATE DEFAULT CURRENT_DATE,
  data_source_id INTEGER REFERENCES data_sources(id),
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_lf_subsidiary ON los_funnel(subsidiary_id);

-- 37. LOS Daily
CREATE TABLE los_daily (
  id SERIAL PRIMARY KEY,
  subsidiary_id INTEGER NOT NULL REFERENCES subsidiaries(id),
  date DATE NOT NULL,
  product TEXT NOT NULL,
  count INTEGER,
  amount NUMERIC,
  amount_usd NUMERIC,
  avg_ticket_size NUMERIC,
  avg_ticket_size_usd NUMERIC,
  data_source_id INTEGER REFERENCES data_sources(id),
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_ld_subsidiary ON los_daily(subsidiary_id);

-- ============================================================================
-- PHASE 6: Consolidation Views (8 views)
-- ============================================================================

-- V1. Group AUM Summary
CREATE OR REPLACE VIEW v_group_aum_summary AS
SELECT
  s.name AS subsidiary,
  r.name AS region,
  s.currency_code,
  com.period,
  com.metric,
  com.metric_type,
  com.value AS value_local,
  com.value_usd
FROM consumer_overall_metrics com
JOIN subsidiaries s ON s.id = com.subsidiary_id
JOIN regions r ON r.id = s.region_id;

-- V2. Group Delinquency (weighted-average rates)
CREATE OR REPLACE VIEW v_group_delinquency AS
SELECT
  s.name AS subsidiary,
  r.name AS region,
  com.period,
  com.metric,
  com.value AS rate_local,
  aum.value_usd AS aum_usd,
  com.value * COALESCE(aum.value_usd, 1) AS weighted_value
FROM consumer_overall_metrics com
JOIN subsidiaries s ON s.id = com.subsidiary_id
JOIN regions r ON r.id = s.region_id
LEFT JOIN consumer_overall_metrics aum
  ON aum.subsidiary_id = com.subsidiary_id
  AND aum.period = com.period
  AND aum.metric = 'Total AUM'
WHERE com.metric_type = 'Portfolio Performance';

-- V3. Group Origination
CREATE OR REPLACE VIEW v_group_origination AS
SELECT
  s.name AS subsidiary,
  r.name AS region,
  lm.metric,
  lm.product,
  lm.ftd, lm.mtd, lm.lmtd, lm.lm_full,
  lm.ftd_usd, lm.mtd_usd, lm.lmtd_usd, lm.lm_full_usd,
  lm.target, lm.target_usd, lm.achievement,
  lm.report_date
FROM los_metrics lm
JOIN subsidiaries s ON s.id = lm.subsidiary_id
JOIN regions r ON r.id = s.region_id;

-- V4. Group Collection Efficiency
CREATE OR REPLACE VIEW v_group_collection_efficiency AS
SELECT
  s.name AS subsidiary,
  r.name AS region,
  cm.portfolio, cm.bucket, cm.period,
  cm.amount AS amount_local,
  cm.amount_usd,
  cm.transitions, cm.normalized,
  cm.roll_backward, cm.stabilized, cm.roll_forward
FROM collection_metrics cm
JOIN subsidiaries s ON s.id = cm.subsidiary_id
JOIN regions r ON r.id = s.region_id;

-- V5. Group Vintage Comparison
CREATE OR REPLACE VIEW v_group_vintage_comparison AS
SELECT
  s.name AS subsidiary,
  r.name AS region,
  vp.vintage, vp.mob, vp.metric_type,
  vp.delinquency_rate,
  vp.loan_amount AS loan_amount_local,
  vp.loan_amount_usd
FROM vintage_points vp
JOIN subsidiaries s ON s.id = vp.subsidiary_id
JOIN regions r ON r.id = s.region_id;

-- V6. Subsidiary Scorecard (one row per subsidiary)
CREATE OR REPLACE VIEW v_subsidiary_scorecard AS
SELECT
  s.id AS subsidiary_id,
  s.name AS subsidiary,
  s.short_code,
  s.country,
  s.currency_code,
  r.name AS region,
  s.institution_type,
  -- Latest period AUM
  aum.value AS aum_local,
  aum.value_usd AS aum_usd,
  aum.period AS latest_period,
  -- Delinquency rates
  d30.value AS delinquency_30plus,
  d90.value AS delinquency_90plus,
  ncl.value AS net_credit_loss,
  fpd.value AS fpd_pct
FROM subsidiaries s
JOIN regions r ON r.id = s.region_id
LEFT JOIN LATERAL (
  SELECT value, value_usd, period
  FROM consumer_overall_metrics
  WHERE subsidiary_id = s.id AND metric = 'Total AUM'
  ORDER BY period DESC LIMIT 1
) aum ON true
LEFT JOIN LATERAL (
  SELECT value FROM consumer_overall_metrics
  WHERE subsidiary_id = s.id AND metric = '30+ Amt%'
  ORDER BY period DESC LIMIT 1
) d30 ON true
LEFT JOIN LATERAL (
  SELECT value FROM consumer_overall_metrics
  WHERE subsidiary_id = s.id AND metric = '90+ Amt%'
  ORDER BY period DESC LIMIT 1
) d90 ON true
LEFT JOIN LATERAL (
  SELECT value FROM consumer_overall_metrics
  WHERE subsidiary_id = s.id AND metric = 'Net Credit Loss'
  ORDER BY period DESC LIMIT 1
) ncl ON true
LEFT JOIN LATERAL (
  SELECT value FROM consumer_overall_metrics
  WHERE subsidiary_id = s.id AND metric = 'FPD%'
  ORDER BY period DESC LIMIT 1
) fpd ON true
WHERE s.is_active = true;

-- V7. Region Summary
CREATE OR REPLACE VIEW v_region_summary AS
SELECT
  r.id AS region_id,
  r.name AS region,
  COUNT(DISTINCT s.id) AS subsidiary_count,
  SUM(aum.value_usd) AS total_aum_usd,
  aum.period AS latest_period
FROM regions r
JOIN subsidiaries s ON s.region_id = r.id AND s.is_active = true
LEFT JOIN LATERAL (
  SELECT value_usd, period
  FROM consumer_overall_metrics
  WHERE subsidiary_id = s.id AND metric = 'Total AUM'
  ORDER BY period DESC LIMIT 1
) aum ON true
GROUP BY r.id, r.name, aum.period;

-- V8. Latest FX Rates
CREATE OR REPLACE VIEW v_fx_latest AS
SELECT DISTINCT ON (from_currency, to_currency)
  from_currency,
  to_currency,
  rate,
  effective_date
FROM fx_rates
ORDER BY from_currency, to_currency, effective_date DESC;

-- ============================================================================
-- PHASE 7: Risk Appetite Settings
-- ============================================================================

CREATE TABLE IF NOT EXISTS risk_appetite_settings (
  id SERIAL PRIMARY KEY,
  metric_key TEXT NOT NULL,
  scope_level TEXT NOT NULL CHECK (scope_level IN ('global','region','subsidiary','business_line','product')),
  region_id INTEGER REFERENCES regions(id),
  subsidiary_id INTEGER REFERENCES subsidiaries(id),
  business_line TEXT CHECK (business_line IN ('consumer_finance','trade_finance','corporate_finance')),
  product_name TEXT,
  appetite NUMERIC NOT NULL,
  tolerance NUMERIC NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now(),

  CONSTRAINT scope_consistency CHECK (
    (scope_level = 'global' AND region_id IS NULL AND subsidiary_id IS NULL AND business_line IS NULL AND product_name IS NULL) OR
    (scope_level = 'region' AND region_id IS NOT NULL AND subsidiary_id IS NULL AND business_line IS NULL AND product_name IS NULL) OR
    (scope_level = 'subsidiary' AND subsidiary_id IS NOT NULL AND business_line IS NULL AND product_name IS NULL) OR
    (scope_level = 'business_line' AND subsidiary_id IS NOT NULL AND business_line IS NOT NULL AND product_name IS NULL) OR
    (scope_level = 'product' AND subsidiary_id IS NOT NULL AND business_line IS NOT NULL AND product_name IS NOT NULL)
  ),
  UNIQUE(metric_key, scope_level, region_id, subsidiary_id, business_line, product_name)
);

-- ============================================================================
-- PHASE 8: Row Level Security
-- ============================================================================

DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOR tbl IN
    SELECT unnest(ARRAY[
      -- Dimension tables
      'regions', 'subsidiaries', 'currencies', 'fx_rates',
      'data_sources', 'product_catalog',
      -- LOS tables
      'los_customers', 'los_applications', 'los_credit_bureau_pulls',
      'los_decisions', 'los_disbursements',
      -- LMS tables
      'lms_accounts', 'lms_balance_snapshots', 'lms_dpd_history',
      'lms_payment_transactions', 'lms_collateral', 'lms_writeoffs', 'lms_restructures',
      -- Collections tables
      'col_agencies', 'col_assignments', 'col_actions',
      'col_recovery_payments', 'col_legal_cases',
      -- PQR summary tables
      'consumer_overall_metrics', 'consumer_product_metrics',
      'net_flow_rates', 'roll_rate_series', 'collection_metrics',
      'vintage_points', 'non_starters', 'tdd_pre_disbursal',
      'tdd_post_disbursal', 'approved_base', 'rejected_base',
      'los_metrics', 'los_funnel', 'los_daily',
      -- Risk appetite
      'risk_appetite_settings'
    ])
  LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', tbl);
    EXECUTE format(
      'CREATE POLICY "Allow anon read %1$s" ON %1$I FOR SELECT USING (true)',
      tbl
    );
    EXECUTE format(
      'CREATE POLICY "Allow anon insert %1$s" ON %1$I FOR INSERT WITH CHECK (true)',
      tbl
    );
    EXECUTE format(
      'CREATE POLICY "Allow anon delete %1$s" ON %1$I FOR DELETE USING (true)',
      tbl
    );
  END LOOP;
END
$$;
