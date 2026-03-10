-- Schema V5: CRO Overview — Corporate Finance Overview Enhancement
-- ALTER existing tables + CREATE 2 new tables
-- Run in Supabase SQL Editor

-- =============================================================================
-- 1. ALTER corporate_top_customers — add PCE, IRR, security, industry columns
-- =============================================================================
ALTER TABLE corporate_top_customers
  ADD COLUMN IF NOT EXISTS pce_amount NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS pce_amount_usd NUMERIC,
  ADD COLUMN IF NOT EXISTS irr NUMERIC,
  ADD COLUMN IF NOT EXISTS security_type TEXT,
  ADD COLUMN IF NOT EXISTS security_cover NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS industry TEXT;

-- =============================================================================
-- 2. ALTER corporate_collateral_analysis — add amounts + particulars
-- =============================================================================
ALTER TABLE corporate_collateral_analysis
  ADD COLUMN IF NOT EXISTS sanctioned_amount NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS sanctioned_amount_usd NUMERIC,
  ADD COLUMN IF NOT EXISTS disbursed_amount NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS disbursed_amount_usd NUMERIC,
  ADD COLUMN IF NOT EXISTS principal_os NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS principal_os_usd NUMERIC,
  ADD COLUMN IF NOT EXISTS principal_share NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS particulars TEXT;

-- =============================================================================
-- 3. ALTER corporate_maturity_profile — add sanctioned + disbursed amounts
-- =============================================================================
ALTER TABLE corporate_maturity_profile
  ADD COLUMN IF NOT EXISTS sanctioned_amount NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS sanctioned_amount_usd NUMERIC,
  ADD COLUMN IF NOT EXISTS disbursed_amount NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS disbursed_amount_usd NUMERIC;

-- =============================================================================
-- 4. CREATE corporate_pd_distribution — PD ratio band breakdown
-- =============================================================================
CREATE TABLE IF NOT EXISTS corporate_pd_distribution (
  id SERIAL PRIMARY KEY,
  subsidiary_id INTEGER NOT NULL REFERENCES subsidiaries(id),
  pd_band TEXT NOT NULL,
  sanctioned_amount NUMERIC DEFAULT 0,
  sanctioned_amount_usd NUMERIC,
  disbursed_amount NUMERIC DEFAULT 0,
  disbursed_amount_usd NUMERIC,
  principal_os NUMERIC DEFAULT 0,
  principal_os_usd NUMERIC,
  principal_share NUMERIC DEFAULT 0,
  report_date DATE NOT NULL DEFAULT CURRENT_DATE,
  data_source_id INTEGER REFERENCES data_sources(id),
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_cpd_subsidiary ON corporate_pd_distribution(subsidiary_id);

-- =============================================================================
-- 5. CREATE corporate_pipeline — Pipeline & drawdown stages
-- =============================================================================
CREATE TABLE IF NOT EXISTS corporate_pipeline (
  id SERIAL PRIMARY KEY,
  subsidiary_id INTEGER NOT NULL REFERENCES subsidiaries(id),
  stage TEXT NOT NULL,
  gross_amount NUMERIC DEFAULT 0,
  gross_amount_usd NUMERIC,
  product_bid NUMERIC DEFAULT 0,
  product_bid_usd NUMERIC,
  pcr_pct NUMERIC DEFAULT 0,
  report_date DATE NOT NULL DEFAULT CURRENT_DATE,
  data_source_id INTEGER REFERENCES data_sources(id),
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_cpipe_subsidiary ON corporate_pipeline(subsidiary_id);

-- =============================================================================
-- 6. RLS policies for new tables
-- =============================================================================
DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOR tbl IN
    SELECT unnest(ARRAY['corporate_pd_distribution', 'corporate_pipeline'])
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
