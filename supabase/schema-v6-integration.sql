-- Schema V6: Subsidiary Integration Infrastructure
-- New tables, UNIQUE constraints, updated_at triggers, RLS hardening
-- Run in Supabase SQL Editor (staging first, then production)

-- =============================================================================
-- 1. UTILITY: updated_at trigger function
-- =============================================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- 2. NEW TABLES
-- =============================================================================

-- 2a. API Keys — per-subsidiary service credentials
CREATE TABLE IF NOT EXISTS api_keys (
  id SERIAL PRIMARY KEY,
  subsidiary_id INTEGER NOT NULL REFERENCES subsidiaries(id),
  key_hash TEXT NOT NULL,
  scopes TEXT[] DEFAULT '{ingest}',
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  expires_at TIMESTAMPTZ NOT NULL,
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_api_keys_hash ON api_keys(key_hash);
CREATE INDEX IF NOT EXISTS idx_api_keys_subsidiary ON api_keys(subsidiary_id);

-- 2b. Data ingestion log — tracks every batch
CREATE TABLE IF NOT EXISTS data_ingestion_log (
  id SERIAL PRIMARY KEY,
  subsidiary_id INTEGER NOT NULL REFERENCES subsidiaries(id),
  table_name TEXT NOT NULL,
  operation TEXT NOT NULL,
  row_count INTEGER,
  period_start TEXT,
  period_end TEXT,
  status TEXT NOT NULL DEFAULT 'started',
  error_message TEXT,
  validation_errors JSONB,
  started_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ,
  source_system TEXT,
  batch_id UUID DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ingestion_log_subsidiary ON data_ingestion_log(subsidiary_id);
CREATE INDEX IF NOT EXISTS idx_ingestion_log_status ON data_ingestion_log(status);
CREATE INDEX IF NOT EXISTS idx_ingestion_log_batch ON data_ingestion_log(batch_id);

-- 2c. Sync watermarks — last sync per subsidiary per table
CREATE TABLE IF NOT EXISTS sync_watermarks (
  id SERIAL PRIMARY KEY,
  subsidiary_id INTEGER NOT NULL REFERENCES subsidiaries(id),
  table_name TEXT NOT NULL,
  last_synced_at TIMESTAMPTZ,
  last_period TEXT,
  last_batch_id UUID,
  row_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(subsidiary_id, table_name)
);

-- 2d. Data quality check results
CREATE TABLE IF NOT EXISTS data_quality_results (
  id SERIAL PRIMARY KEY,
  subsidiary_id INTEGER NOT NULL REFERENCES subsidiaries(id),
  check_id TEXT NOT NULL,
  check_name TEXT NOT NULL,
  table_name TEXT,
  period TEXT,
  passed BOOLEAN NOT NULL,
  details JSONB,
  batch_id UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_dq_results_subsidiary ON data_quality_results(subsidiary_id);

-- 2e. Field mappings — per-subsidiary column mapping
CREATE TABLE IF NOT EXISTS field_mappings (
  id SERIAL PRIMARY KEY,
  subsidiary_id INTEGER NOT NULL REFERENCES subsidiaries(id),
  target_table TEXT NOT NULL,
  target_column TEXT NOT NULL,
  source_field TEXT NOT NULL,
  transform_expression TEXT,
  is_required BOOLEAN DEFAULT false,
  default_value TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(subsidiary_id, target_table, target_column)
);

-- 2f. Schema version tracking
CREATE TABLE IF NOT EXISTS schema_versions (
  id SERIAL PRIMARY KEY,
  version TEXT NOT NULL UNIQUE,
  script_name TEXT NOT NULL,
  description TEXT,
  applied_at TIMESTAMPTZ DEFAULT now()
);
INSERT INTO schema_versions (version, script_name, description) VALUES
  ('1.0', 'schema.sql', 'Base schema'),
  ('2.0', 'schema-v2.sql', 'Trade, Corporate, EWS, Risk'),
  ('3.0', 'schema-v3-corporate.sql', 'Corporate enhancements'),
  ('3.1', 'schema-v3-trade.sql', 'Trade enhancements'),
  ('4.0', 'schema-v4-risk-outlook.sql', 'Risk outlook tables'),
  ('5.0', 'schema-v5-cro-overview.sql', 'CRO overview additions'),
  ('6.0', 'schema-v6-integration.sql', 'Integration infrastructure')
ON CONFLICT (version) DO NOTHING;

-- =============================================================================
-- 3. ALTER EXISTING TABLES — add columns
-- =============================================================================

-- subsidiaries: onboarding status + fiscal year
ALTER TABLE subsidiaries
  ADD COLUMN IF NOT EXISTS fiscal_year_start_month INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS onboarding_status TEXT DEFAULT 'pending';

-- data_sources: sync frequency + expected tables
ALTER TABLE data_sources
  ADD COLUMN IF NOT EXISTS sync_frequency TEXT DEFAULT 'monthly',
  ADD COLUMN IF NOT EXISTS expected_tables TEXT[];

-- =============================================================================
-- 4. UNIQUE CONSTRAINTS — enable idempotent upserts
-- =============================================================================

-- Consumer summary tables
DO $$ BEGIN
  ALTER TABLE consumer_overall_metrics
    ADD CONSTRAINT uq_consumer_overall UNIQUE(subsidiary_id, metric_type, metric, period);
EXCEPTION WHEN duplicate_table THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE consumer_product_metrics
    ADD CONSTRAINT uq_consumer_product UNIQUE(subsidiary_id, product_name, metric_type, metric, period);
EXCEPTION WHEN duplicate_table THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE net_flow_rates
    ADD CONSTRAINT uq_net_flow UNIQUE(subsidiary_id, portfolio, bucket, period);
EXCEPTION WHEN duplicate_table THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE roll_rate_series
    ADD CONSTRAINT uq_roll_rate UNIQUE(subsidiary_id, bucket, metric, period);
EXCEPTION WHEN duplicate_table THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE collection_metrics
    ADD CONSTRAINT uq_collection UNIQUE(subsidiary_id, portfolio, bucket, period);
EXCEPTION WHEN duplicate_table THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE vintage_points
    ADD CONSTRAINT uq_vintage UNIQUE(subsidiary_id, vintage, mob, metric_type, portfolio_segment, product_name);
EXCEPTION WHEN duplicate_table THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE non_starters
    ADD CONSTRAINT uq_non_starters UNIQUE(subsidiary_id, category, product, metric, period);
EXCEPTION WHEN duplicate_table THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE tdd_pre_disbursal
    ADD CONSTRAINT uq_tdd_pre UNIQUE(subsidiary_id, metric, period);
EXCEPTION WHEN duplicate_table THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE tdd_post_disbursal
    ADD CONSTRAINT uq_tdd_post UNIQUE(subsidiary_id, variant, bureau_bucket, period);
EXCEPTION WHEN duplicate_table THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE approved_base
    ADD CONSTRAINT uq_approved UNIQUE(subsidiary_id, la_band, loan_band);
EXCEPTION WHEN duplicate_table THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE rejected_base
    ADD CONSTRAINT uq_rejected UNIQUE(subsidiary_id, loan_type, amount_band);
EXCEPTION WHEN duplicate_table THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE los_metrics
    ADD CONSTRAINT uq_los_metrics UNIQUE(subsidiary_id, metric, product, report_date);
EXCEPTION WHEN duplicate_table THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE los_funnel
    ADD CONSTRAINT uq_los_funnel UNIQUE(subsidiary_id, stage, product, report_date);
EXCEPTION WHEN duplicate_table THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE los_daily
    ADD CONSTRAINT uq_los_daily UNIQUE(subsidiary_id, date, product);
EXCEPTION WHEN duplicate_table THEN NULL; END $$;

-- Trade summary tables
DO $$ BEGIN
  ALTER TABLE trade_entity_performance
    ADD CONSTRAINT uq_trade_entity UNIQUE(subsidiary_id);
EXCEPTION WHEN duplicate_table THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE trade_product_mix
    ADD CONSTRAINT uq_trade_product UNIQUE(subsidiary_id, product_type);
EXCEPTION WHEN duplicate_table THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE trade_asset_quality
    ADD CONSTRAINT uq_trade_asset UNIQUE(subsidiary_id);
EXCEPTION WHEN duplicate_table THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE trade_rating_distribution
    ADD CONSTRAINT uq_trade_rating UNIQUE(subsidiary_id, rating_band);
EXCEPTION WHEN duplicate_table THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE trade_concentrations
    ADD CONSTRAINT uq_trade_concentration UNIQUE(subsidiary_id, name, category);
EXCEPTION WHEN duplicate_table THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE trade_collection_efficiency
    ADD CONSTRAINT uq_trade_collection UNIQUE(subsidiary_id);
EXCEPTION WHEN duplicate_table THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE trade_stage_migration
    ADD CONSTRAINT uq_trade_stage_migration UNIQUE(subsidiary_id, period, prior_stage, current_stage);
EXCEPTION WHEN duplicate_table THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE trade_dpd_roll_rates
    ADD CONSTRAINT uq_trade_dpd_roll UNIQUE(subsidiary_id, period, from_bucket, to_bucket);
EXCEPTION WHEN duplicate_table THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE trade_dpd_aging_by_entity
    ADD CONSTRAINT uq_trade_dpd_aging UNIQUE(subsidiary_id, dpd_bucket);
EXCEPTION WHEN duplicate_table THEN NULL; END $$;

-- Corporate summary tables
DO $$ BEGIN
  ALTER TABLE corporate_portfolio_metrics
    ADD CONSTRAINT uq_corp_portfolio UNIQUE(subsidiary_id, particular, period);
EXCEPTION WHEN duplicate_table THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE corporate_industry_concentration
    ADD CONSTRAINT uq_corp_industry UNIQUE(subsidiary_id, sector, period);
EXCEPTION WHEN duplicate_table THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE corporate_provisioning_ecl
    ADD CONSTRAINT uq_corp_ecl UNIQUE(subsidiary_id, period, ifrs_stage);
EXCEPTION WHEN duplicate_table THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE corporate_rating_analysis
    ADD CONSTRAINT uq_corp_rating UNIQUE(subsidiary_id, period, rating_band);
EXCEPTION WHEN duplicate_table THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE corporate_collateral_analysis
    ADD CONSTRAINT uq_corp_collateral UNIQUE(subsidiary_id, collateral_type);
EXCEPTION WHEN duplicate_table THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE corporate_ltv_distribution
    ADD CONSTRAINT uq_corp_ltv UNIQUE(subsidiary_id, ltv_band);
EXCEPTION WHEN duplicate_table THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE corporate_maturity_profile
    ADD CONSTRAINT uq_corp_maturity UNIQUE(subsidiary_id, maturity_band, facility_basis);
EXCEPTION WHEN duplicate_table THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE corporate_pd_distribution
    ADD CONSTRAINT uq_corp_pd UNIQUE(subsidiary_id, pd_band);
EXCEPTION WHEN duplicate_table THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE corporate_pipeline
    ADD CONSTRAINT uq_corp_pipeline UNIQUE(subsidiary_id, stage);
EXCEPTION WHEN duplicate_table THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE corporate_watchlist_trend
    ADD CONSTRAINT uq_corp_watchlist_trend UNIQUE(subsidiary_id, period);
EXCEPTION WHEN duplicate_table THEN NULL; END $$;

-- EWS
DO $$ BEGIN
  ALTER TABLE ews_entity_summary
    ADD CONSTRAINT uq_ews_entity UNIQUE(subsidiary_id);
EXCEPTION WHEN duplicate_table THEN NULL; END $$;

-- Risk outlook tables
DO $$ BEGIN
  ALTER TABLE ecl_forecast
    ADD CONSTRAINT uq_ecl_forecast UNIQUE(subsidiary_id, stage, scenario, quarter);
EXCEPTION WHEN duplicate_table THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE ecl_waterfall
    ADD CONSTRAINT uq_ecl_waterfall UNIQUE(subsidiary_id, scenario, driver);
EXCEPTION WHEN duplicate_table THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE stress_scenario_losses
    ADD CONSTRAINT uq_stress_losses UNIQUE(subsidiary_id, segment, scenario);
EXCEPTION WHEN duplicate_table THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE cet1_trajectory
    ADD CONSTRAINT uq_cet1 UNIQUE(subsidiary_id, scenario, quarter);
EXCEPTION WHEN duplicate_table THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE ecl_sensitivity
    ADD CONSTRAINT uq_ecl_sensitivity UNIQUE(subsidiary_id, factor, direction);
EXCEPTION WHEN duplicate_table THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE pd_migration_matrix
    ADD CONSTRAINT uq_pd_migration UNIQUE(subsidiary_id, from_grade, to_grade);
EXCEPTION WHEN duplicate_table THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE pd_term_structure
    ADD CONSTRAINT uq_pd_term UNIQUE(subsidiary_id, rating_grade, horizon_years);
EXCEPTION WHEN duplicate_table THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE rating_distribution
    ADD CONSTRAINT uq_rating_dist UNIQUE(subsidiary_id, rating_grade, projection_quarter);
EXCEPTION WHEN duplicate_table THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE vintage_forecast
    ADD CONSTRAINT uq_vintage_forecast UNIQUE(subsidiary_id, vintage, mob);
EXCEPTION WHEN duplicate_table THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE roll_rate_forecast
    ADD CONSTRAINT uq_roll_forecast UNIQUE(subsidiary_id, from_bucket, to_bucket, forecast_month);
EXCEPTION WHEN duplicate_table THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE leading_indicators
    ADD CONSTRAINT uq_leading_ind UNIQUE(subsidiary_id, indicator_name);
EXCEPTION WHEN duplicate_table THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE macro_credit_linkage
    ADD CONSTRAINT uq_macro_credit UNIQUE(subsidiary_id, macro_variable, credit_metric, period);
EXCEPTION WHEN duplicate_table THEN NULL; END $$;

-- =============================================================================
-- 5. ADD updated_at COLUMNS + TRIGGERS
-- =============================================================================
DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOR tbl IN
    SELECT unnest(ARRAY[
      -- Consumer summary
      'consumer_overall_metrics', 'consumer_product_metrics',
      'net_flow_rates', 'roll_rate_series', 'collection_metrics',
      'vintage_points', 'non_starters', 'tdd_pre_disbursal',
      'tdd_post_disbursal', 'approved_base', 'rejected_base',
      'los_metrics', 'los_funnel', 'los_daily',
      -- Trade
      'trade_entity_performance', 'trade_product_mix', 'trade_asset_quality',
      'trade_rating_distribution', 'trade_concentrations', 'trade_collection_efficiency',
      'trade_watchlist', 'trade_facilities', 'trade_stage_migration',
      'trade_dpd_roll_rates', 'trade_dpd_aging_by_entity',
      -- Corporate
      'corporate_portfolio_metrics', 'corporate_top_customers',
      'corporate_industry_concentration', 'corporate_delinquency',
      'corporate_covenants', 'corporate_watchlist', 'corporate_collateral_analysis',
      'corporate_ltv_distribution', 'corporate_maturity_profile',
      'corporate_provisioning_ecl', 'corporate_rating_analysis',
      'corporate_rating_migration', 'corporate_watchlist_trend',
      'corporate_pd_distribution', 'corporate_pipeline',
      'corporate_par_trend',
      -- EWS
      'ews_entity_summary', 'ews_facility_alerts',
      -- Risk outlook
      'ecl_forecast', 'ecl_waterfall', 'stress_scenario_losses',
      'cet1_trajectory', 'ecl_sensitivity', 'pd_migration_matrix',
      'pd_term_structure', 'rating_distribution', 'vintage_forecast',
      'roll_rate_forecast', 'leading_indicators', 'macro_credit_linkage',
      -- Other
      'fx_risk', 'country_risk', 'risk_appetite_settings',
      -- LOS/LMS/Collections
      'lms_accounts', 'lms_balance_snapshots', 'lms_dpd_history',
      'lms_payment_transactions', 'lms_collateral', 'lms_writeoffs',
      'lms_restructures', 'los_customers', 'los_applications',
      'los_credit_bureau_pulls', 'los_decisions', 'los_disbursements',
      'col_agencies', 'col_assignments', 'col_actions',
      'col_recovery_payments', 'col_legal_cases',
      -- Dimensions
      'data_sources', 'product_catalog', 'subsidiaries'
    ])
  LOOP
    -- Add updated_at column if not exists
    EXECUTE format(
      'ALTER TABLE %I ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now()',
      tbl
    );
    -- Create trigger (drop first to be idempotent)
    EXECUTE format(
      'DROP TRIGGER IF EXISTS trg_updated_at_%1$s ON %1$I',
      tbl
    );
    EXECUTE format(
      'CREATE TRIGGER trg_updated_at_%1$s BEFORE UPDATE ON %1$I FOR EACH ROW EXECUTE FUNCTION update_updated_at()',
      tbl
    );
  END LOOP;
END
$$;

-- =============================================================================
-- 6. RLS POLICIES — harden for production
-- =============================================================================

-- Enable RLS on new tables
DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOR tbl IN
    SELECT unnest(ARRAY[
      'api_keys', 'data_ingestion_log', 'sync_watermarks',
      'data_quality_results', 'field_mappings', 'schema_versions'
    ])
  LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', tbl);
    -- Read access for authenticated users
    EXECUTE format(
      'CREATE POLICY "Allow authenticated read %1$s" ON %1$I FOR SELECT TO authenticated USING (true)',
      tbl
    );
    -- Service role full access
    EXECUTE format(
      'CREATE POLICY "Service role full %1$s" ON %1$I FOR ALL TO service_role USING (true) WITH CHECK (true)',
      tbl
    );
  END LOOP;
END
$$;

-- Revoke permissive anon INSERT/DELETE on summary tables, add service_role write
-- (Keep anon SELECT for dashboard reads)
DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOR tbl IN
    SELECT unnest(ARRAY[
      -- Consumer
      'consumer_overall_metrics', 'consumer_product_metrics',
      'net_flow_rates', 'roll_rate_series', 'collection_metrics',
      'vintage_points', 'non_starters', 'tdd_pre_disbursal',
      'tdd_post_disbursal', 'approved_base', 'rejected_base',
      'los_metrics', 'los_funnel', 'los_daily',
      -- Trade
      'trade_entity_performance', 'trade_product_mix', 'trade_asset_quality',
      'trade_rating_distribution', 'trade_concentrations', 'trade_collection_efficiency',
      'trade_watchlist', 'trade_stage_migration', 'trade_dpd_roll_rates',
      'trade_dpd_aging_by_entity',
      -- Corporate
      'corporate_portfolio_metrics', 'corporate_top_customers',
      'corporate_industry_concentration', 'corporate_delinquency',
      'corporate_covenants', 'corporate_watchlist', 'corporate_collateral_analysis',
      'corporate_ltv_distribution', 'corporate_maturity_profile',
      'corporate_provisioning_ecl', 'corporate_rating_analysis',
      'corporate_rating_migration', 'corporate_watchlist_trend',
      'corporate_pd_distribution', 'corporate_pipeline',
      'corporate_par_trend',
      -- EWS
      'ews_entity_summary', 'ews_facility_alerts',
      -- Risk outlook
      'ecl_forecast', 'ecl_waterfall', 'stress_scenario_losses',
      'cet1_trajectory', 'ecl_sensitivity', 'pd_migration_matrix',
      'pd_term_structure', 'rating_distribution', 'vintage_forecast',
      'roll_rate_forecast', 'leading_indicators', 'macro_credit_linkage',
      -- Other
      'fx_risk', 'country_risk'
    ])
  LOOP
    -- Drop existing permissive anon INSERT/DELETE policies
    EXECUTE format('DROP POLICY IF EXISTS "Allow anon insert %1$s" ON %1$I', tbl);
    EXECUTE format('DROP POLICY IF EXISTS "Allow anon delete %1$s" ON %1$I', tbl);

    -- Add service_role write policies
    EXECUTE format(
      'CREATE POLICY "Service role insert %1$s" ON %1$I FOR INSERT TO service_role WITH CHECK (true)',
      tbl
    );
    EXECUTE format(
      'CREATE POLICY "Service role update %1$s" ON %1$I FOR UPDATE TO service_role USING (true) WITH CHECK (true)',
      tbl
    );
    EXECUTE format(
      'CREATE POLICY "Service role delete %1$s" ON %1$I FOR DELETE TO service_role USING (true)',
      tbl
    );
  END LOOP;
END
$$;
