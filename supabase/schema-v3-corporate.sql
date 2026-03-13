-- Schema V3-Corporate: Corporate Finance Enhancement Tables
-- 8 new tables for top customers, industry concentration, collateral,
-- LTV, maturity, provisioning/ECL, rating analysis, and rating migration
-- Run AFTER schema-v2.sql in Supabase SQL Editor

-- ============================================================================
-- CORPORATE FINANCE ENHANCEMENTS (8 tables)
-- ============================================================================

-- 1. Corporate Top Customers — Largest exposures ranked
CREATE TABLE IF NOT EXISTS corporate_top_customers (
  id SERIAL PRIMARY KEY,
  subsidiary_id INTEGER NOT NULL REFERENCES subsidiaries(id),
  customer_name TEXT NOT NULL,
  sector TEXT NOT NULL,
  sanctioned_limit NUMERIC DEFAULT 0,
  sanctioned_limit_usd NUMERIC,
  disbursed_amount NUMERIC DEFAULT 0,
  disbursed_amount_usd NUMERIC,
  current_pos NUMERIC DEFAULT 0,
  current_pos_usd NUMERIC,
  facility_type TEXT,
  risk_rating TEXT,
  dpd INTEGER DEFAULT 0,
  ifrs_stage TEXT DEFAULT 'Stage 1',
  rank_by_disbursement INTEGER,
  rank_by_pos INTEGER,
  report_date DATE NOT NULL DEFAULT CURRENT_DATE,
  data_source_id INTEGER REFERENCES data_sources(id),
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ctc_subsidiary ON corporate_top_customers(subsidiary_id);
CREATE INDEX IF NOT EXISTS idx_ctc_rank ON corporate_top_customers(subsidiary_id, rank_by_pos);

-- 2. Corporate Industry Concentration — Sector breakdown
CREATE TABLE IF NOT EXISTS corporate_industry_concentration (
  id SERIAL PRIMARY KEY,
  subsidiary_id INTEGER NOT NULL REFERENCES subsidiaries(id),
  sector TEXT NOT NULL,
  period TEXT NOT NULL,
  disbursement NUMERIC DEFAULT 0,
  disbursement_usd NUMERIC,
  pos NUMERIC DEFAULT 0,
  pos_usd NUMERIC,
  portfolio_share NUMERIC DEFAULT 0,
  irr NUMERIC,
  facility_count INTEGER DEFAULT 0,
  report_date DATE NOT NULL DEFAULT CURRENT_DATE,
  data_source_id INTEGER REFERENCES data_sources(id),
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_cic_subsidiary ON corporate_industry_concentration(subsidiary_id);
CREATE INDEX IF NOT EXISTS idx_cic_period ON corporate_industry_concentration(subsidiary_id, period);

-- 3. Corporate Collateral Analysis — Collateral type breakdown
CREATE TABLE IF NOT EXISTS corporate_collateral_analysis (
  id SERIAL PRIMARY KEY,
  subsidiary_id INTEGER NOT NULL REFERENCES subsidiaries(id),
  collateral_type TEXT NOT NULL,
  facility_count INTEGER DEFAULT 0,
  collateral_value NUMERIC DEFAULT 0,
  collateral_value_usd NUMERIC,
  exposure_covered NUMERIC DEFAULT 0,
  exposure_covered_usd NUMERIC,
  coverage_ratio NUMERIC DEFAULT 0,
  report_date DATE NOT NULL DEFAULT CURRENT_DATE,
  data_source_id INTEGER REFERENCES data_sources(id),
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_cca_subsidiary ON corporate_collateral_analysis(subsidiary_id);

-- 4. Corporate LTV Distribution — Loan-to-value bands
CREATE TABLE IF NOT EXISTS corporate_ltv_distribution (
  id SERIAL PRIMARY KEY,
  subsidiary_id INTEGER NOT NULL REFERENCES subsidiaries(id),
  ltv_band TEXT NOT NULL,
  facility_count INTEGER DEFAULT 0,
  balance NUMERIC DEFAULT 0,
  balance_usd NUMERIC,
  portfolio_share NUMERIC DEFAULT 0,
  report_date DATE NOT NULL DEFAULT CURRENT_DATE,
  data_source_id INTEGER REFERENCES data_sources(id),
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_cltv_subsidiary ON corporate_ltv_distribution(subsidiary_id);

-- 5. Corporate Maturity Profile — Maturity band breakdown
CREATE TABLE IF NOT EXISTS corporate_maturity_profile (
  id SERIAL PRIMARY KEY,
  subsidiary_id INTEGER NOT NULL REFERENCES subsidiaries(id),
  maturity_band TEXT NOT NULL,
  facility_basis TEXT NOT NULL,
  facility_count INTEGER DEFAULT 0,
  balance NUMERIC DEFAULT 0,
  balance_usd NUMERIC,
  portfolio_share NUMERIC DEFAULT 0,
  report_date DATE NOT NULL DEFAULT CURRENT_DATE,
  data_source_id INTEGER REFERENCES data_sources(id),
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_cmp_subsidiary ON corporate_maturity_profile(subsidiary_id);

-- 6. Corporate Provisioning & ECL — IFRS stage provisioning
CREATE TABLE IF NOT EXISTS corporate_provisioning_ecl (
  id SERIAL PRIMARY KEY,
  subsidiary_id INTEGER NOT NULL REFERENCES subsidiaries(id),
  period TEXT NOT NULL,
  ifrs_stage TEXT NOT NULL,
  gross_exposure NUMERIC DEFAULT 0,
  gross_exposure_usd NUMERIC,
  provision_amount NUMERIC DEFAULT 0,
  provision_amount_usd NUMERIC,
  pcr_pct NUMERIC DEFAULT 0,
  report_date DATE NOT NULL DEFAULT CURRENT_DATE,
  data_source_id INTEGER REFERENCES data_sources(id),
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_cpe_subsidiary ON corporate_provisioning_ecl(subsidiary_id);
CREATE INDEX IF NOT EXISTS idx_cpe_period ON corporate_provisioning_ecl(subsidiary_id, period);

-- 7. Corporate Rating Analysis — Rating band distribution over time
CREATE TABLE IF NOT EXISTS corporate_rating_analysis (
  id SERIAL PRIMARY KEY,
  subsidiary_id INTEGER NOT NULL REFERENCES subsidiaries(id),
  period TEXT NOT NULL,
  rating_band TEXT NOT NULL,
  disbursement NUMERIC DEFAULT 0,
  disbursement_usd NUMERIC,
  pos NUMERIC DEFAULT 0,
  pos_usd NUMERIC,
  facility_count INTEGER DEFAULT 0,
  portfolio_share NUMERIC DEFAULT 0,
  report_date DATE NOT NULL DEFAULT CURRENT_DATE,
  data_source_id INTEGER REFERENCES data_sources(id),
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_cra_subsidiary ON corporate_rating_analysis(subsidiary_id);
CREATE INDEX IF NOT EXISTS idx_cra_period ON corporate_rating_analysis(subsidiary_id, period);

-- 8. Corporate Rating Migration — Individual rating changes
CREATE TABLE IF NOT EXISTS corporate_rating_migration (
  id SERIAL PRIMARY KEY,
  subsidiary_id INTEGER NOT NULL REFERENCES subsidiaries(id),
  customer_name TEXT NOT NULL,
  sector TEXT,
  prior_rating TEXT NOT NULL,
  current_rating TEXT NOT NULL,
  migration_direction TEXT NOT NULL,
  trigger_reason TEXT,
  exposure NUMERIC DEFAULT 0,
  exposure_usd NUMERIC,
  migration_date DATE,
  report_date DATE NOT NULL DEFAULT CURRENT_DATE,
  data_source_id INTEGER REFERENCES data_sources(id),
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_crm_subsidiary ON corporate_rating_migration(subsidiary_id);

-- ============================================================================
-- ROW LEVEL SECURITY for corporate enhancement tables
-- ============================================================================

DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOR tbl IN
    SELECT unnest(ARRAY[
      'corporate_top_customers', 'corporate_industry_concentration',
      'corporate_collateral_analysis', 'corporate_ltv_distribution',
      'corporate_maturity_profile', 'corporate_provisioning_ecl',
      'corporate_rating_analysis', 'corporate_rating_migration'
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
-- v0.3.55: Schema additions for Industry, Collateral, Covenants tab redesigns
-- ============================================================================

-- Collateral: Add Sanctioned/Disbursed/POS/Particulars columns
ALTER TABLE corporate_collateral_analysis
  ADD COLUMN IF NOT EXISTS sanctioned_amount NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS sanctioned_amount_usd NUMERIC,
  ADD COLUMN IF NOT EXISTS disbursed_amount NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS disbursed_amount_usd NUMERIC,
  ADD COLUMN IF NOT EXISTS principal_os NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS principal_os_usd NUMERIC,
  ADD COLUMN IF NOT EXISTS principal_share NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS particulars TEXT DEFAULT '';

-- LTV: Add Sanctioned/Disbursed/POS columns
ALTER TABLE corporate_ltv_distribution
  ADD COLUMN IF NOT EXISTS sanctioned NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS sanctioned_usd NUMERIC,
  ADD COLUMN IF NOT EXISTS disbursed NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS disbursed_usd NUMERIC,
  ADD COLUMN IF NOT EXISTS pos NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS pos_usd NUMERIC;

-- Covenants: Add creation_date, extended_closure_date, rm_name, breached, days_since_breach
ALTER TABLE corporate_covenants
  ADD COLUMN IF NOT EXISTS creation_date DATE,
  ADD COLUMN IF NOT EXISTS extended_closure_date DATE,
  ADD COLUMN IF NOT EXISTS rm_name TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS breached BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS days_since_breach INTEGER DEFAULT 0;

-- ============================================================================
-- v0.4.2: Add disbursement_limit to corporate_top_customers
-- ============================================================================
ALTER TABLE corporate_top_customers
  ADD COLUMN IF NOT EXISTS disbursement_limit NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS disbursement_limit_usd NUMERIC;

-- ============================================================================
-- v0.4.3: Add period_type and credit_cost to corporate_provisioning_ecl
-- ============================================================================
ALTER TABLE corporate_provisioning_ecl
  ADD COLUMN IF NOT EXISTS period_type TEXT DEFAULT 'Actual',
  ADD COLUMN IF NOT EXISTS credit_cost NUMERIC DEFAULT 0;

-- ============================================================================
-- v0.4.7: Add RM profile fields to corporate_covenants
-- ============================================================================
ALTER TABLE corporate_covenants
  ADD COLUMN IF NOT EXISTS rm_email TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS rm_phone TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS rm_department TEXT DEFAULT '';

-- ============================================================================
-- v0.4.9: Corporate watchlist trend (monthly summary for 6-month trend chart)
-- ============================================================================
CREATE TABLE IF NOT EXISTS corporate_watchlist_trend (
  id SERIAL PRIMARY KEY,
  subsidiary_id INTEGER NOT NULL REFERENCES subsidiaries(id),
  period TEXT NOT NULL,
  active_count INTEGER DEFAULT 0,
  escalated_count INTEGER DEFAULT 0,
  monitoring_count INTEGER DEFAULT 0,
  review_pending_count INTEGER DEFAULT 0,
  total_count INTEGER DEFAULT 0,
  total_exposure NUMERIC DEFAULT 0,
  total_exposure_usd NUMERIC,
  new_additions INTEGER DEFAULT 0,
  removals INTEGER DEFAULT 0,
  report_date DATE NOT NULL DEFAULT CURRENT_DATE,
  data_source_id INTEGER REFERENCES data_sources(id),
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_cwt_subsidiary ON corporate_watchlist_trend(subsidiary_id);
CREATE INDEX IF NOT EXISTS idx_cwt_period ON corporate_watchlist_trend(subsidiary_id, period);

ALTER TABLE corporate_watchlist_trend ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow anon read corporate_watchlist_trend" ON corporate_watchlist_trend FOR SELECT USING (true);
CREATE POLICY "Allow anon insert corporate_watchlist_trend" ON corporate_watchlist_trend FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow anon delete corporate_watchlist_trend" ON corporate_watchlist_trend FOR DELETE USING (true);
