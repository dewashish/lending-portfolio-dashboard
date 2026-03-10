-- Risk Outlook Schema (v4)

-- =============================================================================
-- 1. ecl_forecast
-- =============================================================================
CREATE TABLE IF NOT EXISTS ecl_forecast (
  id SERIAL PRIMARY KEY,
  subsidiary_id INT NOT NULL REFERENCES subsidiaries(id),
  stage TEXT NOT NULL,
  scenario TEXT NOT NULL,
  quarter TEXT NOT NULL,
  ecl_amount NUMERIC NOT NULL DEFAULT 0,
  ecl_amount_usd NUMERIC NOT NULL DEFAULT 0,
  coverage_ratio NUMERIC,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ecl_forecast_subsidiary_id ON ecl_forecast(subsidiary_id);

ALTER TABLE ecl_forecast ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ecl_forecast_anon_read" ON ecl_forecast FOR SELECT TO anon USING (true);
CREATE POLICY "ecl_forecast_anon_insert" ON ecl_forecast FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "ecl_forecast_anon_delete" ON ecl_forecast FOR DELETE TO anon USING (true);

-- =============================================================================
-- 2. ecl_waterfall
-- =============================================================================
CREATE TABLE IF NOT EXISTS ecl_waterfall (
  id SERIAL PRIMARY KEY,
  subsidiary_id INT NOT NULL REFERENCES subsidiaries(id),
  scenario TEXT NOT NULL,
  driver TEXT NOT NULL,
  amount NUMERIC NOT NULL DEFAULT 0,
  amount_usd NUMERIC NOT NULL DEFAULT 0,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ecl_waterfall_subsidiary_id ON ecl_waterfall(subsidiary_id);

ALTER TABLE ecl_waterfall ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ecl_waterfall_anon_read" ON ecl_waterfall FOR SELECT TO anon USING (true);
CREATE POLICY "ecl_waterfall_anon_insert" ON ecl_waterfall FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "ecl_waterfall_anon_delete" ON ecl_waterfall FOR DELETE TO anon USING (true);

-- =============================================================================
-- 3. stress_scenario_losses
-- =============================================================================
CREATE TABLE IF NOT EXISTS stress_scenario_losses (
  id SERIAL PRIMARY KEY,
  subsidiary_id INT NOT NULL REFERENCES subsidiaries(id),
  segment TEXT NOT NULL,
  scenario TEXT NOT NULL,
  loss_rate NUMERIC NOT NULL DEFAULT 0,
  loss_amount NUMERIC NOT NULL DEFAULT 0,
  loss_amount_usd NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_stress_scenario_losses_subsidiary_id ON stress_scenario_losses(subsidiary_id);

ALTER TABLE stress_scenario_losses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "stress_scenario_losses_anon_read" ON stress_scenario_losses FOR SELECT TO anon USING (true);
CREATE POLICY "stress_scenario_losses_anon_insert" ON stress_scenario_losses FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "stress_scenario_losses_anon_delete" ON stress_scenario_losses FOR DELETE TO anon USING (true);

-- =============================================================================
-- 4. cet1_trajectory
-- =============================================================================
CREATE TABLE IF NOT EXISTS cet1_trajectory (
  id SERIAL PRIMARY KEY,
  subsidiary_id INT NOT NULL REFERENCES subsidiaries(id),
  scenario TEXT NOT NULL,
  quarter TEXT NOT NULL,
  cet1_ratio NUMERIC NOT NULL DEFAULT 0,
  rwa_amount NUMERIC NOT NULL DEFAULT 0,
  capital_amount NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cet1_trajectory_subsidiary_id ON cet1_trajectory(subsidiary_id);

ALTER TABLE cet1_trajectory ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cet1_trajectory_anon_read" ON cet1_trajectory FOR SELECT TO anon USING (true);
CREATE POLICY "cet1_trajectory_anon_insert" ON cet1_trajectory FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "cet1_trajectory_anon_delete" ON cet1_trajectory FOR DELETE TO anon USING (true);

-- =============================================================================
-- 5. ecl_sensitivity
-- =============================================================================
CREATE TABLE IF NOT EXISTS ecl_sensitivity (
  id SERIAL PRIMARY KEY,
  subsidiary_id INT NOT NULL REFERENCES subsidiaries(id),
  factor TEXT NOT NULL,
  direction TEXT NOT NULL,
  ecl_impact_pct NUMERIC NOT NULL DEFAULT 0,
  ecl_impact_amount NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ecl_sensitivity_subsidiary_id ON ecl_sensitivity(subsidiary_id);

ALTER TABLE ecl_sensitivity ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ecl_sensitivity_anon_read" ON ecl_sensitivity FOR SELECT TO anon USING (true);
CREATE POLICY "ecl_sensitivity_anon_insert" ON ecl_sensitivity FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "ecl_sensitivity_anon_delete" ON ecl_sensitivity FOR DELETE TO anon USING (true);

-- =============================================================================
-- 6. pd_migration_matrix
-- =============================================================================
CREATE TABLE IF NOT EXISTS pd_migration_matrix (
  id SERIAL PRIMARY KEY,
  subsidiary_id INT NOT NULL REFERENCES subsidiaries(id),
  from_grade TEXT NOT NULL,
  to_grade TEXT NOT NULL,
  probability NUMERIC NOT NULL DEFAULT 0,
  long_run_avg NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pd_migration_matrix_subsidiary_id ON pd_migration_matrix(subsidiary_id);

ALTER TABLE pd_migration_matrix ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pd_migration_matrix_anon_read" ON pd_migration_matrix FOR SELECT TO anon USING (true);
CREATE POLICY "pd_migration_matrix_anon_insert" ON pd_migration_matrix FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "pd_migration_matrix_anon_delete" ON pd_migration_matrix FOR DELETE TO anon USING (true);

-- =============================================================================
-- 7. pd_term_structure
-- =============================================================================
CREATE TABLE IF NOT EXISTS pd_term_structure (
  id SERIAL PRIMARY KEY,
  subsidiary_id INT NOT NULL REFERENCES subsidiaries(id),
  rating_grade TEXT NOT NULL,
  horizon_years INT NOT NULL,
  cumulative_pd NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pd_term_structure_subsidiary_id ON pd_term_structure(subsidiary_id);

ALTER TABLE pd_term_structure ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pd_term_structure_anon_read" ON pd_term_structure FOR SELECT TO anon USING (true);
CREATE POLICY "pd_term_structure_anon_insert" ON pd_term_structure FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "pd_term_structure_anon_delete" ON pd_term_structure FOR DELETE TO anon USING (true);

-- =============================================================================
-- 8. rating_distribution
-- =============================================================================
CREATE TABLE IF NOT EXISTS rating_distribution (
  id SERIAL PRIMARY KEY,
  subsidiary_id INT NOT NULL REFERENCES subsidiaries(id),
  rating_grade TEXT NOT NULL,
  current_share NUMERIC NOT NULL DEFAULT 0,
  projected_share NUMERIC NOT NULL DEFAULT 0,
  projection_quarter TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rating_distribution_subsidiary_id ON rating_distribution(subsidiary_id);

ALTER TABLE rating_distribution ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rating_distribution_anon_read" ON rating_distribution FOR SELECT TO anon USING (true);
CREATE POLICY "rating_distribution_anon_insert" ON rating_distribution FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "rating_distribution_anon_delete" ON rating_distribution FOR DELETE TO anon USING (true);

-- =============================================================================
-- 9. vintage_forecast
-- =============================================================================
CREATE TABLE IF NOT EXISTS vintage_forecast (
  id SERIAL PRIMARY KEY,
  subsidiary_id INT NOT NULL REFERENCES subsidiaries(id),
  vintage TEXT NOT NULL,
  mob INT NOT NULL,
  actual_delinq_rate NUMERIC,
  projected_delinq_rate NUMERIC,
  is_projected BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_vintage_forecast_subsidiary_id ON vintage_forecast(subsidiary_id);

ALTER TABLE vintage_forecast ENABLE ROW LEVEL SECURITY;
CREATE POLICY "vintage_forecast_anon_read" ON vintage_forecast FOR SELECT TO anon USING (true);
CREATE POLICY "vintage_forecast_anon_insert" ON vintage_forecast FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "vintage_forecast_anon_delete" ON vintage_forecast FOR DELETE TO anon USING (true);

-- =============================================================================
-- 10. roll_rate_forecast
-- =============================================================================
CREATE TABLE IF NOT EXISTS roll_rate_forecast (
  id SERIAL PRIMARY KEY,
  subsidiary_id INT NOT NULL REFERENCES subsidiaries(id),
  from_bucket TEXT NOT NULL,
  to_bucket TEXT NOT NULL,
  forecast_month INT NOT NULL,
  transition_rate NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_roll_rate_forecast_subsidiary_id ON roll_rate_forecast(subsidiary_id);

ALTER TABLE roll_rate_forecast ENABLE ROW LEVEL SECURITY;
CREATE POLICY "roll_rate_forecast_anon_read" ON roll_rate_forecast FOR SELECT TO anon USING (true);
CREATE POLICY "roll_rate_forecast_anon_insert" ON roll_rate_forecast FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "roll_rate_forecast_anon_delete" ON roll_rate_forecast FOR DELETE TO anon USING (true);

-- =============================================================================
-- 11. leading_indicators
-- =============================================================================
CREATE TABLE IF NOT EXISTS leading_indicators (
  id SERIAL PRIMARY KEY,
  subsidiary_id INT NOT NULL REFERENCES subsidiaries(id),
  indicator_name TEXT NOT NULL,
  current_value NUMERIC NOT NULL DEFAULT 0,
  z_score NUMERIC NOT NULL DEFAULT 0,
  trend TEXT NOT NULL DEFAULT 'stable',
  rag_status TEXT NOT NULL DEFAULT 'Green',
  category TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_leading_indicators_subsidiary_id ON leading_indicators(subsidiary_id);

ALTER TABLE leading_indicators ENABLE ROW LEVEL SECURITY;
CREATE POLICY "leading_indicators_anon_read" ON leading_indicators FOR SELECT TO anon USING (true);
CREATE POLICY "leading_indicators_anon_insert" ON leading_indicators FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "leading_indicators_anon_delete" ON leading_indicators FOR DELETE TO anon USING (true);

-- =============================================================================
-- 12. macro_credit_linkage
-- =============================================================================
CREATE TABLE IF NOT EXISTS macro_credit_linkage (
  id SERIAL PRIMARY KEY,
  subsidiary_id INT NOT NULL REFERENCES subsidiaries(id),
  macro_variable TEXT NOT NULL,
  credit_metric TEXT NOT NULL,
  period TEXT NOT NULL,
  macro_value NUMERIC NOT NULL DEFAULT 0,
  credit_value NUMERIC NOT NULL DEFAULT 0,
  lead_months INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_macro_credit_linkage_subsidiary_id ON macro_credit_linkage(subsidiary_id);

ALTER TABLE macro_credit_linkage ENABLE ROW LEVEL SECURITY;
CREATE POLICY "macro_credit_linkage_anon_read" ON macro_credit_linkage FOR SELECT TO anon USING (true);
CREATE POLICY "macro_credit_linkage_anon_insert" ON macro_credit_linkage FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "macro_credit_linkage_anon_delete" ON macro_credit_linkage FOR DELETE TO anon USING (true);
