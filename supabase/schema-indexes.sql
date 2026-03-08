-- Filter-optimized composite indexes for consumer finance queries
-- Run in Supabase SQL Editor after deploying code changes

-- Overall metrics
CREATE INDEX IF NOT EXISTS idx_com_period ON consumer_overall_metrics(subsidiary_id, period);

-- Product metrics
CREATE INDEX IF NOT EXISTS idx_cpm_product ON consumer_product_metrics(subsidiary_id, product_name);
CREATE INDEX IF NOT EXISTS idx_cpm_period ON consumer_product_metrics(subsidiary_id, period);

-- Net flow rates
CREATE INDEX IF NOT EXISTS idx_nfr_period ON net_flow_rates(subsidiary_id, period);

-- Roll rate series
CREATE INDEX IF NOT EXISTS idx_rrs_period ON roll_rate_series(subsidiary_id, period);

-- Collection metrics
CREATE INDEX IF NOT EXISTS idx_cm_period ON collection_metrics(subsidiary_id, period);

-- Non-starters
CREATE INDEX IF NOT EXISTS idx_ns_product ON non_starters(subsidiary_id, product);
CREATE INDEX IF NOT EXISTS idx_ns_period ON non_starters(subsidiary_id, period);

-- TDD pre/post disbursal
CREATE INDEX IF NOT EXISTS idx_tddpre_period ON tdd_pre_disbursal(subsidiary_id, period);
CREATE INDEX IF NOT EXISTS idx_tddpost_period ON tdd_post_disbursal(subsidiary_id, period);

-- LOS metrics/funnel/daily
CREATE INDEX IF NOT EXISTS idx_lm_product ON los_metrics(subsidiary_id, product);
CREATE INDEX IF NOT EXISTS idx_lf_product ON los_funnel(subsidiary_id, product);
CREATE INDEX IF NOT EXISTS idx_ld_product ON los_daily(subsidiary_id, product);
CREATE INDEX IF NOT EXISTS idx_ld_date ON los_daily(subsidiary_id, date);

-- Vintage points
CREATE INDEX IF NOT EXISTS idx_vp_metric ON vintage_points(subsidiary_id, metric_type);
