-- Rollback for Schema V6: Subsidiary Integration Infrastructure
-- Reverses all changes made by schema-v6-integration.sql
-- Run in Supabase SQL Editor if rollback is needed

-- =============================================================================
-- 1. DROP new tables (reverse of section 2)
-- =============================================================================
DROP TABLE IF EXISTS data_quality_results CASCADE;
DROP TABLE IF EXISTS sync_watermarks CASCADE;
DROP TABLE IF EXISTS data_ingestion_log CASCADE;
DROP TABLE IF EXISTS field_mappings CASCADE;
DROP TABLE IF EXISTS api_keys CASCADE;
DROP TABLE IF EXISTS schema_versions CASCADE;

-- =============================================================================
-- 2. REMOVE added columns from existing tables (reverse of section 3)
-- =============================================================================
ALTER TABLE subsidiaries DROP COLUMN IF EXISTS fiscal_year_start_month;
ALTER TABLE subsidiaries DROP COLUMN IF EXISTS onboarding_status;
ALTER TABLE data_sources DROP COLUMN IF EXISTS sync_frequency;
ALTER TABLE data_sources DROP COLUMN IF EXISTS expected_tables;

-- =============================================================================
-- 3. DROP UNIQUE constraints (reverse of section 4)
-- =============================================================================
ALTER TABLE consumer_overall_metrics DROP CONSTRAINT IF EXISTS uq_consumer_overall;
ALTER TABLE consumer_product_metrics DROP CONSTRAINT IF EXISTS uq_consumer_product;
ALTER TABLE net_flow_rates DROP CONSTRAINT IF EXISTS uq_net_flow;
ALTER TABLE roll_rate_series DROP CONSTRAINT IF EXISTS uq_roll_rate;
ALTER TABLE collection_metrics DROP CONSTRAINT IF EXISTS uq_collection;
ALTER TABLE vintage_points DROP CONSTRAINT IF EXISTS uq_vintage;
ALTER TABLE non_starters DROP CONSTRAINT IF EXISTS uq_non_starters;
ALTER TABLE tdd_pre_disbursal DROP CONSTRAINT IF EXISTS uq_tdd_pre;
ALTER TABLE tdd_post_disbursal DROP CONSTRAINT IF EXISTS uq_tdd_post;
ALTER TABLE approved_base DROP CONSTRAINT IF EXISTS uq_approved;
ALTER TABLE rejected_base DROP CONSTRAINT IF EXISTS uq_rejected;
ALTER TABLE los_metrics DROP CONSTRAINT IF EXISTS uq_los_metrics;
ALTER TABLE los_funnel DROP CONSTRAINT IF EXISTS uq_los_funnel;
ALTER TABLE los_daily DROP CONSTRAINT IF EXISTS uq_los_daily;
ALTER TABLE trade_entity_performance DROP CONSTRAINT IF EXISTS uq_trade_entity;
ALTER TABLE trade_product_mix DROP CONSTRAINT IF EXISTS uq_trade_product;
ALTER TABLE trade_asset_quality DROP CONSTRAINT IF EXISTS uq_trade_asset;
ALTER TABLE trade_rating_distribution DROP CONSTRAINT IF EXISTS uq_trade_rating;
ALTER TABLE trade_concentrations DROP CONSTRAINT IF EXISTS uq_trade_concentration;
ALTER TABLE trade_collection_efficiency DROP CONSTRAINT IF EXISTS uq_trade_collection;
ALTER TABLE trade_stage_migration DROP CONSTRAINT IF EXISTS uq_trade_stage_migration;
ALTER TABLE trade_dpd_roll_rates DROP CONSTRAINT IF EXISTS uq_trade_dpd_roll;
ALTER TABLE trade_dpd_aging_by_entity DROP CONSTRAINT IF EXISTS uq_trade_dpd_aging;
ALTER TABLE corporate_portfolio_metrics DROP CONSTRAINT IF EXISTS uq_corp_portfolio;
ALTER TABLE corporate_industry_concentration DROP CONSTRAINT IF EXISTS uq_corp_industry;
ALTER TABLE corporate_provisioning_ecl DROP CONSTRAINT IF EXISTS uq_corp_ecl;
ALTER TABLE corporate_rating_analysis DROP CONSTRAINT IF EXISTS uq_corp_rating;
ALTER TABLE corporate_collateral_analysis DROP CONSTRAINT IF EXISTS uq_corp_collateral;
ALTER TABLE corporate_ltv_distribution DROP CONSTRAINT IF EXISTS uq_corp_ltv;
ALTER TABLE corporate_maturity_profile DROP CONSTRAINT IF EXISTS uq_corp_maturity;
ALTER TABLE corporate_pd_distribution DROP CONSTRAINT IF EXISTS uq_corp_pd;
ALTER TABLE corporate_pipeline DROP CONSTRAINT IF EXISTS uq_corp_pipeline;
ALTER TABLE corporate_watchlist_trend DROP CONSTRAINT IF EXISTS uq_corp_watchlist_trend;
ALTER TABLE ews_entity_summary DROP CONSTRAINT IF EXISTS uq_ews_entity;
ALTER TABLE ecl_forecast DROP CONSTRAINT IF EXISTS uq_ecl_forecast;
ALTER TABLE ecl_waterfall DROP CONSTRAINT IF EXISTS uq_ecl_waterfall;
ALTER TABLE stress_scenario_losses DROP CONSTRAINT IF EXISTS uq_stress_losses;
ALTER TABLE cet1_trajectory DROP CONSTRAINT IF EXISTS uq_cet1;
ALTER TABLE ecl_sensitivity DROP CONSTRAINT IF EXISTS uq_ecl_sensitivity;
ALTER TABLE pd_migration_matrix DROP CONSTRAINT IF EXISTS uq_pd_migration;
ALTER TABLE pd_term_structure DROP CONSTRAINT IF EXISTS uq_pd_term;
ALTER TABLE rating_distribution DROP CONSTRAINT IF EXISTS uq_rating_dist;
ALTER TABLE vintage_forecast DROP CONSTRAINT IF EXISTS uq_vintage_forecast;
ALTER TABLE roll_rate_forecast DROP CONSTRAINT IF EXISTS uq_roll_forecast;
ALTER TABLE leading_indicators DROP CONSTRAINT IF EXISTS uq_leading_ind;
ALTER TABLE macro_credit_linkage DROP CONSTRAINT IF EXISTS uq_macro_credit;

-- =============================================================================
-- 4. RESTORE anon INSERT/DELETE policies (reverse of section 6)
-- Re-applies the original rls-seed-policies.sql pattern
-- =============================================================================
DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOR tbl IN
    SELECT unnest(ARRAY[
      'consumer_overall_metrics', 'consumer_product_metrics',
      'net_flow_rates', 'roll_rate_series', 'collection_metrics',
      'vintage_points', 'non_starters', 'tdd_pre_disbursal',
      'tdd_post_disbursal', 'approved_base', 'rejected_base',
      'los_metrics', 'los_funnel', 'los_daily'
    ])
  LOOP
    -- Drop service_role policies
    EXECUTE format('DROP POLICY IF EXISTS "Service role insert %1$s" ON %1$I', tbl);
    EXECUTE format('DROP POLICY IF EXISTS "Service role update %1$s" ON %1$I', tbl);
    EXECUTE format('DROP POLICY IF EXISTS "Service role delete %1$s" ON %1$I', tbl);
    -- Restore anon policies
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

-- Note: updated_at columns and triggers are left in place as they are harmless
-- and removing them could cause issues if any code has started depending on them.
-- To fully remove, drop each trigger: DROP TRIGGER IF EXISTS trg_updated_at_<table> ON <table>;
-- Then drop columns: ALTER TABLE <table> DROP COLUMN IF EXISTS updated_at;
