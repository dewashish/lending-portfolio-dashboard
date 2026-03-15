-- =============================================================================
-- Rollback for Schema V7: Consumer Finance Granular Dimensions
-- Reverses all changes from schema-v7-consumer-dimensions.sql
-- =============================================================================

-- 1. DROP v7 unique indexes
DROP INDEX IF EXISTS uq_consumer_product_v7;
DROP INDEX IF EXISTS uq_net_flow_v7;
DROP INDEX IF EXISTS uq_roll_rate_v7;
DROP INDEX IF EXISTS uq_collection_v7;
DROP INDEX IF EXISTS uq_vintage_v7;
DROP INDEX IF EXISTS uq_non_starters_v7;
DROP INDEX IF EXISTS uq_tdd_post_v7;
DROP INDEX IF EXISTS uq_approved_v7;
DROP INDEX IF EXISTS uq_rejected_v7;
DROP INDEX IF EXISTS uq_los_metrics_v7;
DROP INDEX IF EXISTS uq_los_funnel_v7;
DROP INDEX IF EXISTS uq_los_daily_v7;

-- 2. DROP v7 filter indexes
DROP INDEX IF EXISTS idx_cpm_segment;
DROP INDEX IF EXISTS idx_cpm_variant;
DROP INDEX IF EXISTS idx_cpm_program;
DROP INDEX IF EXISTS idx_nfr_segment;
DROP INDEX IF EXISTS idx_nfr_risk;
DROP INDEX IF EXISTS idx_rrs_segment;
DROP INDEX IF EXISTS idx_rrs_risk;
DROP INDEX IF EXISTS idx_cm_segment;
DROP INDEX IF EXISTS idx_cm_risk;
DROP INDEX IF EXISTS idx_vp_segment;
DROP INDEX IF EXISTS idx_vp_bureau;
DROP INDEX IF EXISTS idx_vp_risk;
DROP INDEX IF EXISTS idx_vp_age;
DROP INDEX IF EXISTS idx_ab_segment;
DROP INDEX IF EXISTS idx_ab_location;
DROP INDEX IF EXISTS idx_ab_channel;
DROP INDEX IF EXISTS idx_ab_bureau;
DROP INDEX IF EXISTS idx_rb_segment;
DROP INDEX IF EXISTS idx_rb_location;
DROP INDEX IF EXISTS idx_lm_location;
DROP INDEX IF EXISTS idx_lm_channel;
DROP INDEX IF EXISTS idx_lf_location;
DROP INDEX IF EXISTS idx_ld_location;
DROP INDEX IF EXISTS idx_ld_channel;

-- 3. DROP new columns from consumer summary tables
ALTER TABLE consumer_product_metrics
  DROP COLUMN IF EXISTS program_type,
  DROP COLUMN IF EXISTS customer_segment,
  DROP COLUMN IF EXISTS product_variant;

ALTER TABLE net_flow_rates
  DROP COLUMN IF EXISTS program_type,
  DROP COLUMN IF EXISTS customer_segment,
  DROP COLUMN IF EXISTS product_variant,
  DROP COLUMN IF EXISTS risk_band;

ALTER TABLE roll_rate_series
  DROP COLUMN IF EXISTS program_type,
  DROP COLUMN IF EXISTS customer_segment,
  DROP COLUMN IF EXISTS product_variant,
  DROP COLUMN IF EXISTS risk_band;

ALTER TABLE collection_metrics
  DROP COLUMN IF EXISTS program_type,
  DROP COLUMN IF EXISTS customer_segment,
  DROP COLUMN IF EXISTS product_variant,
  DROP COLUMN IF EXISTS risk_band;

ALTER TABLE vintage_points
  DROP COLUMN IF EXISTS program_type,
  DROP COLUMN IF EXISTS customer_segment,
  DROP COLUMN IF EXISTS product_variant,
  DROP COLUMN IF EXISTS bureau_bucket,
  DROP COLUMN IF EXISTS risk_band,
  DROP COLUMN IF EXISTS income_band,
  DROP COLUMN IF EXISTS dbr_band,
  DROP COLUMN IF EXISTS age_bracket,
  DROP COLUMN IF EXISTS tenure_band;

ALTER TABLE non_starters
  DROP COLUMN IF EXISTS customer_segment,
  DROP COLUMN IF EXISTS product_variant;

ALTER TABLE tdd_post_disbursal
  DROP COLUMN IF EXISTS program_type,
  DROP COLUMN IF EXISTS customer_segment,
  DROP COLUMN IF EXISTS product_variant,
  DROP COLUMN IF EXISTS risk_band,
  DROP COLUMN IF EXISTS income_band,
  DROP COLUMN IF EXISTS dbr_band,
  DROP COLUMN IF EXISTS age_bracket;

ALTER TABLE approved_base
  DROP COLUMN IF EXISTS program_type,
  DROP COLUMN IF EXISTS customer_segment,
  DROP COLUMN IF EXISTS product_variant,
  DROP COLUMN IF EXISTS bureau_bucket,
  DROP COLUMN IF EXISTS risk_band,
  DROP COLUMN IF EXISTS income_band,
  DROP COLUMN IF EXISTS dbr_band,
  DROP COLUMN IF EXISTS limit_band,
  DROP COLUMN IF EXISTS location,
  DROP COLUMN IF EXISTS age_bracket,
  DROP COLUMN IF EXISTS channel,
  DROP COLUMN IF EXISTS tenure_band;

ALTER TABLE rejected_base
  DROP COLUMN IF EXISTS program_type,
  DROP COLUMN IF EXISTS customer_segment,
  DROP COLUMN IF EXISTS product_variant,
  DROP COLUMN IF EXISTS bureau_bucket,
  DROP COLUMN IF EXISTS risk_band,
  DROP COLUMN IF EXISTS income_band,
  DROP COLUMN IF EXISTS dbr_band,
  DROP COLUMN IF EXISTS limit_band,
  DROP COLUMN IF EXISTS location,
  DROP COLUMN IF EXISTS age_bracket,
  DROP COLUMN IF EXISTS channel;

ALTER TABLE los_metrics
  DROP COLUMN IF EXISTS location,
  DROP COLUMN IF EXISTS channel;

ALTER TABLE los_funnel
  DROP COLUMN IF EXISTS location,
  DROP COLUMN IF EXISTS channel;

ALTER TABLE los_daily
  DROP COLUMN IF EXISTS location,
  DROP COLUMN IF EXISTS channel;

-- 4. Restore original UNIQUE constraints (from v6)
DO $$ BEGIN ALTER TABLE consumer_product_metrics ADD CONSTRAINT uq_consumer_product UNIQUE(subsidiary_id, product_name, metric_type, metric, period); EXCEPTION WHEN duplicate_table THEN NULL; WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE net_flow_rates ADD CONSTRAINT uq_net_flow UNIQUE(subsidiary_id, portfolio, bucket, period, product_name); EXCEPTION WHEN duplicate_table THEN NULL; WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE roll_rate_series ADD CONSTRAINT uq_roll_rate UNIQUE(subsidiary_id, bucket, metric, period, product_name); EXCEPTION WHEN duplicate_table THEN NULL; WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE collection_metrics ADD CONSTRAINT uq_collection UNIQUE(subsidiary_id, portfolio, bucket, period, product_name); EXCEPTION WHEN duplicate_table THEN NULL; WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE vintage_points ADD CONSTRAINT uq_vintage UNIQUE(subsidiary_id, vintage, mob, metric_type, portfolio_segment, product_name); EXCEPTION WHEN duplicate_table THEN NULL; WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE non_starters ADD CONSTRAINT uq_non_starters UNIQUE(subsidiary_id, category, product, metric, period); EXCEPTION WHEN duplicate_table THEN NULL; WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE tdd_post_disbursal ADD CONSTRAINT uq_tdd_post UNIQUE(subsidiary_id, variant, bureau_bucket, period); EXCEPTION WHEN duplicate_table THEN NULL; WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE approved_base ADD CONSTRAINT uq_approved UNIQUE(subsidiary_id, la_band, loan_band); EXCEPTION WHEN duplicate_table THEN NULL; WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE rejected_base ADD CONSTRAINT uq_rejected UNIQUE(subsidiary_id, loan_type, amount_band); EXCEPTION WHEN duplicate_table THEN NULL; WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE los_metrics ADD CONSTRAINT uq_los_metrics UNIQUE(subsidiary_id, metric, product, report_date); EXCEPTION WHEN duplicate_table THEN NULL; WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE los_funnel ADD CONSTRAINT uq_los_funnel UNIQUE(subsidiary_id, stage, product, report_date); EXCEPTION WHEN duplicate_table THEN NULL; WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE los_daily ADD CONSTRAINT uq_los_daily UNIQUE(subsidiary_id, date, product); EXCEPTION WHEN duplicate_table THEN NULL; WHEN duplicate_object THEN NULL; END $$;

-- 5. DROP reference tables
DROP TABLE IF EXISTS ref_program_types CASCADE;
DROP TABLE IF EXISTS ref_customer_segments CASCADE;
DROP TABLE IF EXISTS ref_product_variants CASCADE;
DROP TABLE IF EXISTS ref_bureau_buckets CASCADE;
DROP TABLE IF EXISTS ref_risk_bands CASCADE;
DROP TABLE IF EXISTS ref_income_bands CASCADE;
DROP TABLE IF EXISTS ref_dbr_bands CASCADE;
DROP TABLE IF EXISTS ref_limit_bands CASCADE;
DROP TABLE IF EXISTS ref_locations CASCADE;
DROP TABLE IF EXISTS ref_age_brackets CASCADE;
DROP TABLE IF EXISTS ref_channels CASCADE;
DROP TABLE IF EXISTS ref_tenure_bands CASCADE;

-- 6. Remove schema version
DELETE FROM schema_versions WHERE version = '7.0';
