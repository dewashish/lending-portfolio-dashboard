-- Schema V2: Trade Finance, Corporate Finance, EWS, Risk Tables
-- 16 new tables + 4 consolidation views
-- All tables reference subsidiaries(id) for multi-geo scope support
-- Run AFTER schema.sql in Supabase SQL Editor

-- ============================================================================
-- TRADE FINANCE (8 tables)
-- ============================================================================

-- 1. Trade Facilities — Raw deal-level data
CREATE TABLE IF NOT EXISTS trade_facilities (
  id SERIAL PRIMARY KEY,
  subsidiary_id INTEGER NOT NULL REFERENCES subsidiaries(id),
  facility_reference TEXT NOT NULL,
  obligor_name TEXT NOT NULL,
  sector TEXT NOT NULL,
  commodity TEXT,
  product_type TEXT NOT NULL,
  currency CHAR(3) NOT NULL,
  facility_limit NUMERIC NOT NULL,
  facility_limit_usd NUMERIC,
  outstanding NUMERIC NOT NULL DEFAULT 0,
  outstanding_usd NUMERIC,
  prev_month_outstanding NUMERIC DEFAULT 0,
  prev_month_outstanding_usd NUMERIC,
  tenor_days INTEGER,
  start_date DATE,
  maturity_date DATE,
  internal_rating INTEGER,
  external_rating TEXT,
  days_past_due INTEGER NOT NULL DEFAULT 0,
  ifrs9_stage TEXT NOT NULL DEFAULT 'Stage 1',
  provision_rate NUMERIC DEFAULT 0,
  provision_amount NUMERIC DEFAULT 0,
  provision_amount_usd NUMERIC,
  collateral_value NUMERIC DEFAULT 0,
  collateral_value_usd NUMERIC,
  collateral_coverage NUMERIC DEFAULT 0,
  risk_weight NUMERIC DEFAULT 0,
  counterparty_bank TEXT,
  watchlist_flag BOOLEAN DEFAULT false,
  ews_score INTEGER DEFAULT 0,
  ews_triggers TEXT,
  report_date DATE NOT NULL DEFAULT CURRENT_DATE,
  data_source_id INTEGER REFERENCES data_sources(id),
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_tf_subsidiary ON trade_facilities(subsidiary_id);
CREATE INDEX IF NOT EXISTS idx_tf_report_date ON trade_facilities(subsidiary_id, report_date);
CREATE INDEX IF NOT EXISTS idx_tf_sector ON trade_facilities(subsidiary_id, sector);
CREATE INDEX IF NOT EXISTS idx_tf_stage ON trade_facilities(subsidiary_id, ifrs9_stage);

-- 2. Trade Entity Performance — Aggregated per entity
CREATE TABLE IF NOT EXISTS trade_entity_performance (
  id SERIAL PRIMARY KEY,
  subsidiary_id INTEGER NOT NULL REFERENCES subsidiaries(id),
  approved_limit NUMERIC NOT NULL DEFAULT 0,
  approved_limit_usd NUMERIC,
  outstanding NUMERIC NOT NULL DEFAULT 0,
  outstanding_usd NUMERIC,
  headroom NUMERIC DEFAULT 0,
  utilization NUMERIC DEFAULT 0,
  stage1_balance NUMERIC DEFAULT 0,
  stage1_balance_usd NUMERIC,
  stage2_balance NUMERIC DEFAULT 0,
  stage2_balance_usd NUMERIC,
  stage3_balance NUMERIC DEFAULT 0,
  stage3_balance_usd NUMERIC,
  provisions NUMERIC DEFAULT 0,
  provisions_usd NUMERIC,
  provision_coverage NUMERIC DEFAULT 0,
  rag_status TEXT DEFAULT 'Green',
  report_date DATE NOT NULL DEFAULT CURRENT_DATE,
  data_source_id INTEGER REFERENCES data_sources(id),
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_tep_subsidiary ON trade_entity_performance(subsidiary_id);

-- 3. Trade Product Mix — Product breakdown
CREATE TABLE IF NOT EXISTS trade_product_mix (
  id SERIAL PRIMARY KEY,
  subsidiary_id INTEGER NOT NULL REFERENCES subsidiaries(id),
  product_type TEXT NOT NULL,
  facilities INTEGER NOT NULL DEFAULT 0,
  facility_limit NUMERIC DEFAULT 0,
  facility_limit_usd NUMERIC,
  outstanding NUMERIC DEFAULT 0,
  outstanding_usd NUMERIC,
  portfolio_share NUMERIC DEFAULT 0,
  avg_tenor NUMERIC DEFAULT 0,
  utilization NUMERIC DEFAULT 0,
  stage2_plus3_pct NUMERIC DEFAULT 0,
  avg_rating NUMERIC DEFAULT 0,
  watchlist_count INTEGER DEFAULT 0,
  report_date DATE NOT NULL DEFAULT CURRENT_DATE,
  data_source_id INTEGER REFERENCES data_sources(id),
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_tpm_subsidiary ON trade_product_mix(subsidiary_id);

-- 4. Trade Asset Quality — IFRS staging summary
CREATE TABLE IF NOT EXISTS trade_asset_quality (
  id SERIAL PRIMARY KEY,
  subsidiary_id INTEGER NOT NULL REFERENCES subsidiaries(id),
  stage1_count INTEGER DEFAULT 0,
  stage1_balance NUMERIC DEFAULT 0,
  stage1_balance_usd NUMERIC,
  stage2_count INTEGER DEFAULT 0,
  stage2_balance NUMERIC DEFAULT 0,
  stage2_balance_usd NUMERIC,
  stage3_count INTEGER DEFAULT 0,
  stage3_balance NUMERIC DEFAULT 0,
  stage3_balance_usd NUMERIC,
  stage2_plus3_pct NUMERIC DEFAULT 0,
  provision_coverage NUMERIC DEFAULT 0,
  rag_status TEXT DEFAULT 'Green',
  report_date DATE NOT NULL DEFAULT CURRENT_DATE,
  data_source_id INTEGER REFERENCES data_sources(id),
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_taq_subsidiary ON trade_asset_quality(subsidiary_id);

-- 5. Trade Rating Distribution — Rating bands
CREATE TABLE IF NOT EXISTS trade_rating_distribution (
  id SERIAL PRIMARY KEY,
  subsidiary_id INTEGER NOT NULL REFERENCES subsidiaries(id),
  rating_band TEXT NOT NULL,
  count INTEGER NOT NULL DEFAULT 0,
  balance NUMERIC DEFAULT 0,
  balance_usd NUMERIC,
  portfolio_share NUMERIC DEFAULT 0,
  avg_provision NUMERIC DEFAULT 0,
  report_date DATE NOT NULL DEFAULT CURRENT_DATE,
  data_source_id INTEGER REFERENCES data_sources(id),
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_trd_subsidiary ON trade_rating_distribution(subsidiary_id);

-- 6. Trade Concentrations — Obligor + sector concentrations
CREATE TABLE IF NOT EXISTS trade_concentrations (
  id SERIAL PRIMARY KEY,
  subsidiary_id INTEGER NOT NULL REFERENCES subsidiaries(id),
  name TEXT NOT NULL,
  category TEXT NOT NULL, -- 'obligor' | 'sector'
  value NUMERIC DEFAULT 0,
  value_usd NUMERIC,
  portfolio_share NUMERIC DEFAULT 0,
  facilities INTEGER DEFAULT 0,
  rating TEXT,
  report_date DATE NOT NULL DEFAULT CURRENT_DATE,
  data_source_id INTEGER REFERENCES data_sources(id),
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_tc_subsidiary ON trade_concentrations(subsidiary_id);
CREATE INDEX IF NOT EXISTS idx_tc_category ON trade_concentrations(subsidiary_id, category);

-- 7. Trade Collection Efficiency — Collections & efficiency metrics
CREATE TABLE IF NOT EXISTS trade_collection_efficiency (
  id SERIAL PRIMARY KEY,
  subsidiary_id INTEGER NOT NULL REFERENCES subsidiaries(id),
  collection_efficiency_ratio NUMERIC DEFAULT 0,
  overdue_ratio NUMERIC DEFAULT 0,
  avg_dpd NUMERIC DEFAULT 0,
  recovery_rate NUMERIC,
  rollover_rate NUMERIC DEFAULT 0,
  provision_outstanding NUMERIC DEFAULT 0,
  provision_outstanding_usd NUMERIC,
  rag_status TEXT DEFAULT 'Green',
  report_date DATE NOT NULL DEFAULT CURRENT_DATE,
  data_source_id INTEGER REFERENCES data_sources(id),
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_tce_subsidiary ON trade_collection_efficiency(subsidiary_id);

-- 8. Trade Watchlist — Watchlist accounts
CREATE TABLE IF NOT EXISTS trade_watchlist (
  id SERIAL PRIMARY KEY,
  subsidiary_id INTEGER NOT NULL REFERENCES subsidiaries(id),
  facility_ref TEXT NOT NULL,
  obligor_name TEXT NOT NULL,
  product_type TEXT,
  outstanding NUMERIC DEFAULT 0,
  outstanding_usd NUMERIC,
  dpd INTEGER DEFAULT 0,
  ifrs_stage TEXT DEFAULT 'Stage 1',
  rating INTEGER,
  ews_score INTEGER DEFAULT 0,
  triggers TEXT,
  action TEXT,
  report_date DATE NOT NULL DEFAULT CURRENT_DATE,
  data_source_id INTEGER REFERENCES data_sources(id),
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_tw_subsidiary ON trade_watchlist(subsidiary_id);

-- ============================================================================
-- EWS — Early Warning System (2 tables)
-- ============================================================================

-- 9. EWS Entity Summary — Score distribution per subsidiary
CREATE TABLE IF NOT EXISTS ews_entity_summary (
  id SERIAL PRIMARY KEY,
  subsidiary_id INTEGER NOT NULL REFERENCES subsidiaries(id),
  score0 INTEGER DEFAULT 0,
  score1 INTEGER DEFAULT 0,
  score2 INTEGER DEFAULT 0,
  score3 INTEGER DEFAULT 0,
  score4_plus INTEGER DEFAULT 0,
  total_facilities INTEGER DEFAULT 0,
  avg_ews_score NUMERIC DEFAULT 0,
  flagged_exposure NUMERIC DEFAULT 0,
  flagged_exposure_usd NUMERIC,
  rag_status TEXT DEFAULT 'Green',
  report_date DATE NOT NULL DEFAULT CURRENT_DATE,
  data_source_id INTEGER REFERENCES data_sources(id),
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ees_subsidiary ON ews_entity_summary(subsidiary_id);

-- 10. EWS Facility Alerts — Flagged facilities
CREATE TABLE IF NOT EXISTS ews_facility_alerts (
  id SERIAL PRIMARY KEY,
  subsidiary_id INTEGER NOT NULL REFERENCES subsidiaries(id),
  facility_ref TEXT NOT NULL,
  obligor TEXT NOT NULL,
  ews_score INTEGER NOT NULL DEFAULT 0,
  outstanding NUMERIC DEFAULT 0,
  outstanding_usd NUMERIC,
  triggers TEXT,
  ifrs_stage TEXT DEFAULT 'Stage 1',
  action TEXT,
  report_date DATE NOT NULL DEFAULT CURRENT_DATE,
  data_source_id INTEGER REFERENCES data_sources(id),
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_efa_subsidiary ON ews_facility_alerts(subsidiary_id);

-- ============================================================================
-- RISK (2 tables)
-- ============================================================================

-- 11. FX Risk — FX exposure per subsidiary
CREATE TABLE IF NOT EXISTS fx_risk (
  id SERIAL PRIMARY KEY,
  subsidiary_id INTEGER NOT NULL REFERENCES subsidiaries(id),
  primary_currency CHAR(3) NOT NULL,
  fx_rate NUMERIC NOT NULL,
  volatility_30d NUMERIC DEFAULT 0,
  volatility_90d NUMERIC DEFAULT 0,
  ytd_depreciation NUMERIC DEFAULT 0,
  portfolio_exposure NUMERIC DEFAULT 0,
  portfolio_exposure_usd NUMERIC,
  fx_impact NUMERIC DEFAULT 0,
  fx_impact_usd NUMERIC,
  capital_controls BOOLEAN DEFAULT false,
  transfer_risk TEXT DEFAULT 'Low',
  rag_status TEXT DEFAULT 'Green',
  report_date DATE NOT NULL DEFAULT CURRENT_DATE,
  data_source_id INTEGER REFERENCES data_sources(id),
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_fxr_subsidiary ON fx_risk(subsidiary_id);

-- 12. Country Risk — Country risk scoring
CREATE TABLE IF NOT EXISTS country_risk (
  id SERIAL PRIMARY KEY,
  subsidiary_id INTEGER NOT NULL REFERENCES subsidiaries(id),
  sovereign_rating INTEGER,
  country_risk_score NUMERIC DEFAULT 0,
  regulatory_score NUMERIC DEFAULT 0,
  political_stability_score NUMERIC DEFAULT 0,
  composite_score NUMERIC DEFAULT 0,
  exposure NUMERIC DEFAULT 0,
  exposure_usd NUMERIC,
  rwa_share NUMERIC DEFAULT 0,
  capital_impact NUMERIC DEFAULT 0,
  capital_impact_usd NUMERIC,
  recommendation TEXT,
  rag_status TEXT DEFAULT 'Green',
  report_date DATE NOT NULL DEFAULT CURRENT_DATE,
  data_source_id INTEGER REFERENCES data_sources(id),
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_cr_subsidiary ON country_risk(subsidiary_id);

-- ============================================================================
-- CORPORATE FINANCE (4 tables)
-- ============================================================================

-- 13. Corporate Watchlist — Watchlist tracking
CREATE TABLE IF NOT EXISTS corporate_watchlist (
  id SERIAL PRIMARY KEY,
  subsidiary_id INTEGER NOT NULL REFERENCES subsidiaries(id),
  borrower TEXT NOT NULL,
  sector TEXT NOT NULL,
  exposure NUMERIC DEFAULT 0,
  exposure_usd NUMERIC,
  ews_trigger_type TEXT,
  internal_rating TEXT,
  status TEXT DEFAULT 'Active',
  remedial_action TEXT,
  report_date DATE NOT NULL DEFAULT CURRENT_DATE,
  data_source_id INTEGER REFERENCES data_sources(id),
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_cw_subsidiary ON corporate_watchlist(subsidiary_id);

-- 14. Corporate Covenants — Covenant tracking
CREATE TABLE IF NOT EXISTS corporate_covenants (
  id SERIAL PRIMARY KEY,
  subsidiary_id INTEGER NOT NULL REFERENCES subsidiaries(id),
  group_id TEXT NOT NULL,
  cust_id TEXT NOT NULL,
  customer_name TEXT NOT NULL,
  date_of_disbursal DATE,
  sanctioned_limit NUMERIC DEFAULT 0,
  sanctioned_limit_usd NUMERIC,
  disbursed_amount NUMERIC DEFAULT 0,
  disbursed_amount_usd NUMERIC,
  current_pos NUMERIC DEFAULT 0,
  current_pos_usd NUMERIC,
  facility_type TEXT,
  security_type TEXT,
  security_cover NUMERIC DEFAULT 0,
  risk_rating TEXT,
  covenant_category TEXT,
  covenant_type TEXT,
  covenant_description TEXT,
  covenant_frequency TEXT,
  submission_date DATE,
  approval_for_extension TEXT,
  npa_flag BOOLEAN DEFAULT false,
  restructured_flag BOOLEAN DEFAULT false,
  watchlist_flag BOOLEAN DEFAULT false,
  writeoff_flag BOOLEAN DEFAULT false,
  report_date DATE NOT NULL DEFAULT CURRENT_DATE,
  data_source_id INTEGER REFERENCES data_sources(id),
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_cc_subsidiary ON corporate_covenants(subsidiary_id);
CREATE INDEX IF NOT EXISTS idx_cc_customer ON corporate_covenants(subsidiary_id, customer_name);

-- 15. Corporate Delinquency — Delinquency overview
CREATE TABLE IF NOT EXISTS corporate_delinquency (
  id SERIAL PRIMARY KEY,
  subsidiary_id INTEGER NOT NULL REFERENCES subsidiaries(id),
  group_id TEXT NOT NULL,
  cust_id TEXT NOT NULL,
  customer_name TEXT NOT NULL,
  sector TEXT,
  industry TEXT,
  sanctioned_limit NUMERIC DEFAULT 0,
  sanctioned_limit_usd NUMERIC,
  disbursed_amount NUMERIC DEFAULT 0,
  disbursed_amount_usd NUMERIC,
  current_pos NUMERIC DEFAULT 0,
  current_pos_usd NUMERIC,
  facility_type TEXT,
  security_type TEXT,
  security_cover NUMERIC DEFAULT 0,
  rating_at_disbursement TEXT,
  current_rating TEXT,
  renewal_done BOOLEAN DEFAULT false,
  dpd_at_month_end INTEGER DEFAULT 0,
  current_dpd INTEGER DEFAULT 0,
  reason_for_delinquency TEXT,
  last_remedial_action TEXT,
  update_on_remedial TEXT,
  current_status TEXT,
  next_step TEXT,
  report_date DATE NOT NULL DEFAULT CURRENT_DATE,
  data_source_id INTEGER REFERENCES data_sources(id),
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_cd_subsidiary ON corporate_delinquency(subsidiary_id);
CREATE INDEX IF NOT EXISTS idx_cd_dpd ON corporate_delinquency(subsidiary_id, current_dpd);

-- 16. Corporate Portfolio Metrics — Summary time-series
CREATE TABLE IF NOT EXISTS corporate_portfolio_metrics (
  id SERIAL PRIMARY KEY,
  subsidiary_id INTEGER NOT NULL REFERENCES subsidiaries(id),
  particular TEXT NOT NULL,
  period TEXT NOT NULL,
  total NUMERIC DEFAULT 0,
  total_usd NUMERIC,
  fund_based NUMERIC DEFAULT 0,
  fund_based_usd NUMERIC,
  non_fund_based NUMERIC DEFAULT 0,
  non_fund_based_usd NUMERIC,
  report_date DATE NOT NULL DEFAULT CURRENT_DATE,
  data_source_id INTEGER REFERENCES data_sources(id),
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_cpm2_subsidiary ON corporate_portfolio_metrics(subsidiary_id);
CREATE INDEX IF NOT EXISTS idx_cpm2_period ON corporate_portfolio_metrics(subsidiary_id, period);

-- ============================================================================
-- CONSOLIDATION VIEWS (4 views)
-- ============================================================================

-- V9. Group Trade Overview
CREATE OR REPLACE VIEW v_group_trade_overview AS
SELECT
  s.id AS subsidiary_id,
  s.name AS subsidiary,
  s.short_code,
  r.name AS region,
  tep.outstanding_usd,
  tep.approved_limit_usd,
  tep.utilization,
  tep.provisions_usd,
  tep.provision_coverage,
  taq.stage2_plus3_pct AS npl_ratio,
  taq.stage1_balance_usd,
  taq.stage2_balance_usd,
  taq.stage3_balance_usd,
  tep.rag_status,
  tep.report_date
FROM subsidiaries s
JOIN regions r ON r.id = s.region_id
LEFT JOIN trade_entity_performance tep ON tep.subsidiary_id = s.id
LEFT JOIN trade_asset_quality taq ON taq.subsidiary_id = s.id
WHERE s.is_active = true;

-- V10. Group Corporate Overview
CREATE OR REPLACE VIEW v_group_corporate_overview AS
SELECT
  s.id AS subsidiary_id,
  s.name AS subsidiary,
  s.short_code,
  r.name AS region,
  COALESCE(wl.watchlist_count, 0) AS watchlist_count,
  COALESCE(wl.watchlist_exposure_usd, 0) AS watchlist_exposure_usd,
  COALESCE(dl.delinquent_count, 0) AS delinquent_count,
  COALESCE(dl.delinquent_exposure_usd, 0) AS delinquent_exposure_usd
FROM subsidiaries s
JOIN regions r ON r.id = s.region_id
LEFT JOIN LATERAL (
  SELECT
    COUNT(*)::INTEGER AS watchlist_count,
    SUM(exposure_usd) AS watchlist_exposure_usd
  FROM corporate_watchlist
  WHERE subsidiary_id = s.id
) wl ON true
LEFT JOIN LATERAL (
  SELECT
    COUNT(*)::INTEGER AS delinquent_count,
    SUM(current_pos_usd) AS delinquent_exposure_usd
  FROM corporate_delinquency
  WHERE subsidiary_id = s.id AND current_dpd > 0
) dl ON true
WHERE s.is_active = true;

-- V11. Group EWS Summary
CREATE OR REPLACE VIEW v_group_ews_summary AS
SELECT
  s.id AS subsidiary_id,
  s.name AS subsidiary,
  s.short_code,
  r.name AS region,
  ees.score0, ees.score1, ees.score2, ees.score3, ees.score4_plus,
  ees.total_facilities,
  ees.avg_ews_score,
  ees.flagged_exposure_usd,
  ees.rag_status,
  ees.report_date
FROM subsidiaries s
JOIN regions r ON r.id = s.region_id
LEFT JOIN ews_entity_summary ees ON ees.subsidiary_id = s.id
WHERE s.is_active = true;

-- V12. Group Consolidated Scorecard
CREATE OR REPLACE VIEW v_group_consolidated_scorecard AS
SELECT
  s.id AS subsidiary_id,
  s.name AS subsidiary,
  s.short_code,
  s.country,
  s.currency_code,
  r.name AS region,
  s.institution_type,
  -- Consumer AUM
  consumer_aum.value_usd AS consumer_aum_usd,
  consumer_aum.period AS consumer_latest_period,
  -- Consumer delinquency
  d30.value AS consumer_delinquency_30plus,
  d90.value AS consumer_delinquency_90plus,
  -- Trade outstanding
  tep.outstanding_usd AS trade_outstanding_usd,
  tep.utilization AS trade_utilization,
  taq.stage2_plus3_pct AS trade_npl_ratio,
  -- Corporate watchlist
  COALESCE(cwl.watchlist_count, 0) AS corporate_watchlist_count,
  COALESCE(cwl.watchlist_exposure_usd, 0) AS corporate_watchlist_exposure_usd,
  -- EWS
  ees.avg_ews_score,
  ees.flagged_exposure_usd AS ews_flagged_exposure_usd,
  ees.rag_status AS ews_rag_status,
  -- FX
  fxr.ytd_depreciation AS fx_ytd_depreciation,
  fxr.rag_status AS fx_rag_status,
  -- Country risk
  cr.composite_score AS country_risk_score,
  cr.rag_status AS country_risk_rag_status
FROM subsidiaries s
JOIN regions r ON r.id = s.region_id
-- Consumer
LEFT JOIN LATERAL (
  SELECT value_usd, period
  FROM consumer_overall_metrics
  WHERE subsidiary_id = s.id AND metric = 'Total AUM'
  ORDER BY period DESC LIMIT 1
) consumer_aum ON true
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
-- Trade
LEFT JOIN trade_entity_performance tep ON tep.subsidiary_id = s.id
LEFT JOIN trade_asset_quality taq ON taq.subsidiary_id = s.id
-- Corporate
LEFT JOIN LATERAL (
  SELECT
    COUNT(*)::INTEGER AS watchlist_count,
    SUM(exposure_usd) AS watchlist_exposure_usd
  FROM corporate_watchlist
  WHERE subsidiary_id = s.id
) cwl ON true
-- EWS
LEFT JOIN ews_entity_summary ees ON ees.subsidiary_id = s.id
-- FX
LEFT JOIN fx_risk fxr ON fxr.subsidiary_id = s.id
-- Country
LEFT JOIN country_risk cr ON cr.subsidiary_id = s.id
WHERE s.is_active = true;

-- ============================================================================
-- ROW LEVEL SECURITY for new tables
-- ============================================================================

DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOR tbl IN
    SELECT unnest(ARRAY[
      'trade_facilities', 'trade_entity_performance', 'trade_product_mix',
      'trade_asset_quality', 'trade_rating_distribution', 'trade_concentrations',
      'trade_collection_efficiency', 'trade_watchlist',
      'ews_entity_summary', 'ews_facility_alerts',
      'fx_risk', 'country_risk',
      'corporate_watchlist', 'corporate_covenants',
      'corporate_delinquency', 'corporate_portfolio_metrics'
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

-- ============================================================================
-- Schema additions for Watchlist Tracking Redesign (v0.3.53)
-- ============================================================================
ALTER TABLE corporate_watchlist ADD COLUMN IF NOT EXISTS trigger_category TEXT;
ALTER TABLE corporate_watchlist ADD COLUMN IF NOT EXISTS date_added DATE;
ALTER TABLE corporate_watchlist ADD COLUMN IF NOT EXISTS days_on_watchlist INTEGER DEFAULT 0;
ALTER TABLE corporate_watchlist ADD COLUMN IF NOT EXISTS prior_rating TEXT;
