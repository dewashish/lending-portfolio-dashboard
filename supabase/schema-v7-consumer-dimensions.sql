-- =============================================================================
-- Schema V7: Consumer Finance Granular Dimensions
-- Adds 12 reference tables + ALTER TABLE on 13 consumer summary tables
-- Run AFTER schema-v6-integration.sql
-- =============================================================================

-- =============================================================================
-- PHASE 1: Reference / Lookup Tables
-- =============================================================================

-- 1. Program Types (subsidiary-scoped — each subsidiary has its own programs)
CREATE TABLE IF NOT EXISTS ref_program_types (
  id SERIAL PRIMARY KEY,
  subsidiary_id INTEGER NOT NULL REFERENCES subsidiaries(id),
  code TEXT NOT NULL,
  label TEXT NOT NULL,
  description TEXT,
  product_name TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(subsidiary_id, code)
);

-- 2. Customer Segments (global)
CREATE TABLE IF NOT EXISTS ref_customer_segments (
  id SERIAL PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Product Variants (global)
CREATE TABLE IF NOT EXISTS ref_product_variants (
  id SERIAL PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Bureau Buckets (global)
CREATE TABLE IF NOT EXISTS ref_bureau_buckets (
  id SERIAL PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL,
  score_min INTEGER,
  score_max INTEGER,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 5. Risk Bands (global)
CREATE TABLE IF NOT EXISTS ref_risk_bands (
  id SERIAL PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 6. Income Bands (subsidiary-scoped — currency-dependent)
CREATE TABLE IF NOT EXISTS ref_income_bands (
  id SERIAL PRIMARY KEY,
  subsidiary_id INTEGER NOT NULL REFERENCES subsidiaries(id),
  code TEXT NOT NULL,
  label TEXT NOT NULL,
  min_amount NUMERIC,
  max_amount NUMERIC,
  currency_code CHAR(3),
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(subsidiary_id, code)
);

-- 7. DBR Bands (global)
CREATE TABLE IF NOT EXISTS ref_dbr_bands (
  id SERIAL PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL,
  min_ratio NUMERIC,
  max_ratio NUMERIC,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 8. Limit Bands (subsidiary-scoped — currency-dependent)
CREATE TABLE IF NOT EXISTS ref_limit_bands (
  id SERIAL PRIMARY KEY,
  subsidiary_id INTEGER NOT NULL REFERENCES subsidiaries(id),
  code TEXT NOT NULL,
  label TEXT NOT NULL,
  min_amount NUMERIC,
  max_amount NUMERIC,
  currency_code CHAR(3),
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(subsidiary_id, code)
);

-- 9. Locations (subsidiary-scoped)
CREATE TABLE IF NOT EXISTS ref_locations (
  id SERIAL PRIMARY KEY,
  subsidiary_id INTEGER NOT NULL REFERENCES subsidiaries(id),
  code TEXT NOT NULL,
  label TEXT NOT NULL,
  city TEXT,
  state_province TEXT,
  branch_code TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(subsidiary_id, code)
);

-- 10. Age Brackets (global)
CREATE TABLE IF NOT EXISTS ref_age_brackets (
  id SERIAL PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL,
  min_age INTEGER,
  max_age INTEGER,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 11. Channels (global)
CREATE TABLE IF NOT EXISTS ref_channels (
  id SERIAL PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 12. Tenure Bands (global)
CREATE TABLE IF NOT EXISTS ref_tenure_bands (
  id SERIAL PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL,
  min_months INTEGER,
  max_months INTEGER,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);


-- =============================================================================
-- PHASE 2: ALTER TABLE — Add dimension columns to consumer summary tables
-- =============================================================================

-- consumer_product_metrics: +program_type, customer_segment, product_variant
ALTER TABLE consumer_product_metrics
  ADD COLUMN IF NOT EXISTS program_type TEXT,
  ADD COLUMN IF NOT EXISTS customer_segment TEXT,
  ADD COLUMN IF NOT EXISTS product_variant TEXT;

-- net_flow_rates: +program_type, customer_segment, product_variant, risk_band
ALTER TABLE net_flow_rates
  ADD COLUMN IF NOT EXISTS program_type TEXT,
  ADD COLUMN IF NOT EXISTS customer_segment TEXT,
  ADD COLUMN IF NOT EXISTS product_variant TEXT,
  ADD COLUMN IF NOT EXISTS risk_band TEXT;

-- roll_rate_series: +program_type, customer_segment, product_variant, risk_band
ALTER TABLE roll_rate_series
  ADD COLUMN IF NOT EXISTS program_type TEXT,
  ADD COLUMN IF NOT EXISTS customer_segment TEXT,
  ADD COLUMN IF NOT EXISTS product_variant TEXT,
  ADD COLUMN IF NOT EXISTS risk_band TEXT;

-- collection_metrics: +program_type, customer_segment, product_variant, risk_band
ALTER TABLE collection_metrics
  ADD COLUMN IF NOT EXISTS program_type TEXT,
  ADD COLUMN IF NOT EXISTS customer_segment TEXT,
  ADD COLUMN IF NOT EXISTS product_variant TEXT,
  ADD COLUMN IF NOT EXISTS risk_band TEXT;

-- vintage_points: +program_type, customer_segment, product_variant, bureau_bucket,
--                  risk_band, income_band, dbr_band, age_bracket, tenure_band
ALTER TABLE vintage_points
  ADD COLUMN IF NOT EXISTS program_type TEXT,
  ADD COLUMN IF NOT EXISTS customer_segment TEXT,
  ADD COLUMN IF NOT EXISTS product_variant TEXT,
  ADD COLUMN IF NOT EXISTS bureau_bucket TEXT,
  ADD COLUMN IF NOT EXISTS risk_band TEXT,
  ADD COLUMN IF NOT EXISTS income_band TEXT,
  ADD COLUMN IF NOT EXISTS dbr_band TEXT,
  ADD COLUMN IF NOT EXISTS age_bracket TEXT,
  ADD COLUMN IF NOT EXISTS tenure_band TEXT;

-- non_starters: +customer_segment, product_variant
ALTER TABLE non_starters
  ADD COLUMN IF NOT EXISTS customer_segment TEXT,
  ADD COLUMN IF NOT EXISTS product_variant TEXT;

-- tdd_post_disbursal: +program_type, customer_segment, product_variant, risk_band,
--                      income_band, dbr_band, age_bracket
ALTER TABLE tdd_post_disbursal
  ADD COLUMN IF NOT EXISTS program_type TEXT,
  ADD COLUMN IF NOT EXISTS customer_segment TEXT,
  ADD COLUMN IF NOT EXISTS product_variant TEXT,
  ADD COLUMN IF NOT EXISTS risk_band TEXT,
  ADD COLUMN IF NOT EXISTS income_band TEXT,
  ADD COLUMN IF NOT EXISTS dbr_band TEXT,
  ADD COLUMN IF NOT EXISTS age_bracket TEXT;

-- approved_base: +program_type, customer_segment, product_variant, bureau_bucket,
--                 risk_band, income_band, dbr_band, limit_band, location,
--                 age_bracket, channel, tenure_band
ALTER TABLE approved_base
  ADD COLUMN IF NOT EXISTS program_type TEXT,
  ADD COLUMN IF NOT EXISTS customer_segment TEXT,
  ADD COLUMN IF NOT EXISTS product_variant TEXT,
  ADD COLUMN IF NOT EXISTS bureau_bucket TEXT,
  ADD COLUMN IF NOT EXISTS risk_band TEXT,
  ADD COLUMN IF NOT EXISTS income_band TEXT,
  ADD COLUMN IF NOT EXISTS dbr_band TEXT,
  ADD COLUMN IF NOT EXISTS limit_band TEXT,
  ADD COLUMN IF NOT EXISTS location TEXT,
  ADD COLUMN IF NOT EXISTS age_bracket TEXT,
  ADD COLUMN IF NOT EXISTS channel TEXT,
  ADD COLUMN IF NOT EXISTS tenure_band TEXT;

-- rejected_base: +program_type, customer_segment, product_variant, bureau_bucket,
--                  risk_band, income_band, dbr_band, limit_band, location,
--                  age_bracket, channel
ALTER TABLE rejected_base
  ADD COLUMN IF NOT EXISTS program_type TEXT,
  ADD COLUMN IF NOT EXISTS customer_segment TEXT,
  ADD COLUMN IF NOT EXISTS product_variant TEXT,
  ADD COLUMN IF NOT EXISTS bureau_bucket TEXT,
  ADD COLUMN IF NOT EXISTS risk_band TEXT,
  ADD COLUMN IF NOT EXISTS income_band TEXT,
  ADD COLUMN IF NOT EXISTS dbr_band TEXT,
  ADD COLUMN IF NOT EXISTS limit_band TEXT,
  ADD COLUMN IF NOT EXISTS location TEXT,
  ADD COLUMN IF NOT EXISTS age_bracket TEXT,
  ADD COLUMN IF NOT EXISTS channel TEXT;

-- los_metrics: +location, channel
ALTER TABLE los_metrics
  ADD COLUMN IF NOT EXISTS location TEXT,
  ADD COLUMN IF NOT EXISTS channel TEXT;

-- los_funnel: +location, channel
ALTER TABLE los_funnel
  ADD COLUMN IF NOT EXISTS location TEXT,
  ADD COLUMN IF NOT EXISTS channel TEXT;

-- los_daily: +location, channel
ALTER TABLE los_daily
  ADD COLUMN IF NOT EXISTS location TEXT,
  ADD COLUMN IF NOT EXISTS channel TEXT;


-- =============================================================================
-- PHASE 3: UNIQUE constraint updates
-- Uses COALESCE(col, '__ALL__') so NULL dimensions match as aggregates
-- =============================================================================

-- consumer_product_metrics
ALTER TABLE consumer_product_metrics DROP CONSTRAINT IF EXISTS uq_consumer_product;
DROP INDEX IF EXISTS uq_consumer_product_v7;
CREATE UNIQUE INDEX uq_consumer_product_v7
  ON consumer_product_metrics(
    subsidiary_id, product_name, metric_type, metric, period,
    COALESCE(program_type, '__ALL__'),
    COALESCE(customer_segment, '__ALL__'),
    COALESCE(product_variant, '__ALL__')
  );

-- net_flow_rates
ALTER TABLE net_flow_rates DROP CONSTRAINT IF EXISTS uq_net_flow;
DROP INDEX IF EXISTS uq_net_flow_v7;
CREATE UNIQUE INDEX uq_net_flow_v7
  ON net_flow_rates(
    subsidiary_id, portfolio, bucket, period,
    COALESCE(product_name, '__ALL__'),
    COALESCE(program_type, '__ALL__'),
    COALESCE(customer_segment, '__ALL__'),
    COALESCE(product_variant, '__ALL__'),
    COALESCE(risk_band, '__ALL__')
  );

-- roll_rate_series
ALTER TABLE roll_rate_series DROP CONSTRAINT IF EXISTS uq_roll_rate;
DROP INDEX IF EXISTS uq_roll_rate_v7;
CREATE UNIQUE INDEX uq_roll_rate_v7
  ON roll_rate_series(
    subsidiary_id, bucket, metric, period,
    COALESCE(product_name, '__ALL__'),
    COALESCE(program_type, '__ALL__'),
    COALESCE(customer_segment, '__ALL__'),
    COALESCE(product_variant, '__ALL__'),
    COALESCE(risk_band, '__ALL__')
  );

-- collection_metrics
ALTER TABLE collection_metrics DROP CONSTRAINT IF EXISTS uq_collection;
DROP INDEX IF EXISTS uq_collection_v7;
CREATE UNIQUE INDEX uq_collection_v7
  ON collection_metrics(
    subsidiary_id, portfolio, bucket, period,
    COALESCE(product_name, '__ALL__'),
    COALESCE(program_type, '__ALL__'),
    COALESCE(customer_segment, '__ALL__'),
    COALESCE(product_variant, '__ALL__'),
    COALESCE(risk_band, '__ALL__')
  );

-- vintage_points
ALTER TABLE vintage_points DROP CONSTRAINT IF EXISTS uq_vintage;
DROP INDEX IF EXISTS uq_vintage_v7;
CREATE UNIQUE INDEX uq_vintage_v7
  ON vintage_points(
    subsidiary_id, vintage, mob, metric_type,
    COALESCE(portfolio_segment, '__ALL__'),
    COALESCE(product_name, '__ALL__'),
    COALESCE(program_type, '__ALL__'),
    COALESCE(customer_segment, '__ALL__'),
    COALESCE(product_variant, '__ALL__'),
    COALESCE(bureau_bucket, '__ALL__'),
    COALESCE(risk_band, '__ALL__'),
    COALESCE(income_band, '__ALL__'),
    COALESCE(dbr_band, '__ALL__'),
    COALESCE(age_bracket, '__ALL__'),
    COALESCE(tenure_band, '__ALL__')
  );

-- non_starters
ALTER TABLE non_starters DROP CONSTRAINT IF EXISTS uq_non_starters;
DROP INDEX IF EXISTS uq_non_starters_v7;
CREATE UNIQUE INDEX uq_non_starters_v7
  ON non_starters(
    subsidiary_id, category, product, metric, period,
    COALESCE(customer_segment, '__ALL__'),
    COALESCE(product_variant, '__ALL__')
  );

-- tdd_post_disbursal
ALTER TABLE tdd_post_disbursal DROP CONSTRAINT IF EXISTS uq_tdd_post;
DROP INDEX IF EXISTS uq_tdd_post_v7;
CREATE UNIQUE INDEX uq_tdd_post_v7
  ON tdd_post_disbursal(
    subsidiary_id, variant, bureau_bucket, period,
    COALESCE(program_type, '__ALL__'),
    COALESCE(customer_segment, '__ALL__'),
    COALESCE(product_variant, '__ALL__'),
    COALESCE(risk_band, '__ALL__'),
    COALESCE(income_band, '__ALL__'),
    COALESCE(dbr_band, '__ALL__'),
    COALESCE(age_bracket, '__ALL__')
  );

-- approved_base
ALTER TABLE approved_base DROP CONSTRAINT IF EXISTS uq_approved;
DROP INDEX IF EXISTS uq_approved_v7;
CREATE UNIQUE INDEX uq_approved_v7
  ON approved_base(
    subsidiary_id, la_band, loan_band,
    COALESCE(program_type, '__ALL__'),
    COALESCE(customer_segment, '__ALL__'),
    COALESCE(product_variant, '__ALL__'),
    COALESCE(bureau_bucket, '__ALL__'),
    COALESCE(risk_band, '__ALL__'),
    COALESCE(income_band, '__ALL__'),
    COALESCE(dbr_band, '__ALL__'),
    COALESCE(limit_band, '__ALL__'),
    COALESCE(location, '__ALL__'),
    COALESCE(age_bracket, '__ALL__'),
    COALESCE(channel, '__ALL__'),
    COALESCE(tenure_band, '__ALL__')
  );

-- rejected_base
ALTER TABLE rejected_base DROP CONSTRAINT IF EXISTS uq_rejected;
DROP INDEX IF EXISTS uq_rejected_v7;
CREATE UNIQUE INDEX uq_rejected_v7
  ON rejected_base(
    subsidiary_id, loan_type, amount_band,
    COALESCE(program_type, '__ALL__'),
    COALESCE(customer_segment, '__ALL__'),
    COALESCE(product_variant, '__ALL__'),
    COALESCE(bureau_bucket, '__ALL__'),
    COALESCE(risk_band, '__ALL__'),
    COALESCE(income_band, '__ALL__'),
    COALESCE(dbr_band, '__ALL__'),
    COALESCE(limit_band, '__ALL__'),
    COALESCE(location, '__ALL__'),
    COALESCE(age_bracket, '__ALL__'),
    COALESCE(channel, '__ALL__')
  );

-- los_metrics
ALTER TABLE los_metrics DROP CONSTRAINT IF EXISTS uq_los_metrics;
DROP INDEX IF EXISTS uq_los_metrics_v7;
CREATE UNIQUE INDEX uq_los_metrics_v7
  ON los_metrics(
    subsidiary_id, metric, product, report_date,
    COALESCE(location, '__ALL__'),
    COALESCE(channel, '__ALL__')
  );

-- los_funnel
ALTER TABLE los_funnel DROP CONSTRAINT IF EXISTS uq_los_funnel;
DROP INDEX IF EXISTS uq_los_funnel_v7;
CREATE UNIQUE INDEX uq_los_funnel_v7
  ON los_funnel(
    subsidiary_id, stage, product, report_date,
    COALESCE(location, '__ALL__'),
    COALESCE(channel, '__ALL__')
  );

-- los_daily
ALTER TABLE los_daily DROP CONSTRAINT IF EXISTS uq_los_daily;
DROP INDEX IF EXISTS uq_los_daily_v7;
CREATE UNIQUE INDEX uq_los_daily_v7
  ON los_daily(
    subsidiary_id, date, product,
    COALESCE(location, '__ALL__'),
    COALESCE(channel, '__ALL__')
  );


-- =============================================================================
-- PHASE 4: Filter indexes for common queries
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_cpm_segment ON consumer_product_metrics(subsidiary_id, customer_segment);
CREATE INDEX IF NOT EXISTS idx_cpm_variant ON consumer_product_metrics(subsidiary_id, product_variant);
CREATE INDEX IF NOT EXISTS idx_cpm_program ON consumer_product_metrics(subsidiary_id, program_type);

CREATE INDEX IF NOT EXISTS idx_nfr_segment ON net_flow_rates(subsidiary_id, customer_segment);
CREATE INDEX IF NOT EXISTS idx_nfr_risk ON net_flow_rates(subsidiary_id, risk_band);

CREATE INDEX IF NOT EXISTS idx_rrs_segment ON roll_rate_series(subsidiary_id, customer_segment);
CREATE INDEX IF NOT EXISTS idx_rrs_risk ON roll_rate_series(subsidiary_id, risk_band);

CREATE INDEX IF NOT EXISTS idx_cm_segment ON collection_metrics(subsidiary_id, customer_segment);
CREATE INDEX IF NOT EXISTS idx_cm_risk ON collection_metrics(subsidiary_id, risk_band);

CREATE INDEX IF NOT EXISTS idx_vp_segment ON vintage_points(subsidiary_id, customer_segment);
CREATE INDEX IF NOT EXISTS idx_vp_bureau ON vintage_points(subsidiary_id, bureau_bucket);
CREATE INDEX IF NOT EXISTS idx_vp_risk ON vintage_points(subsidiary_id, risk_band);
CREATE INDEX IF NOT EXISTS idx_vp_age ON vintage_points(subsidiary_id, age_bracket);

CREATE INDEX IF NOT EXISTS idx_ab_segment ON approved_base(subsidiary_id, customer_segment);
CREATE INDEX IF NOT EXISTS idx_ab_location ON approved_base(subsidiary_id, location);
CREATE INDEX IF NOT EXISTS idx_ab_channel ON approved_base(subsidiary_id, channel);
CREATE INDEX IF NOT EXISTS idx_ab_bureau ON approved_base(subsidiary_id, bureau_bucket);

CREATE INDEX IF NOT EXISTS idx_rb_segment ON rejected_base(subsidiary_id, customer_segment);
CREATE INDEX IF NOT EXISTS idx_rb_location ON rejected_base(subsidiary_id, location);

CREATE INDEX IF NOT EXISTS idx_lm_location ON los_metrics(subsidiary_id, location);
CREATE INDEX IF NOT EXISTS idx_lm_channel ON los_metrics(subsidiary_id, channel);

CREATE INDEX IF NOT EXISTS idx_lf_location ON los_funnel(subsidiary_id, location);

CREATE INDEX IF NOT EXISTS idx_ld_location ON los_daily(subsidiary_id, location);
CREATE INDEX IF NOT EXISTS idx_ld_channel ON los_daily(subsidiary_id, channel);


-- =============================================================================
-- PHASE 5: RLS for reference tables
-- =============================================================================

DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOR tbl IN
    SELECT unnest(ARRAY[
      'ref_program_types', 'ref_customer_segments', 'ref_product_variants',
      'ref_bureau_buckets', 'ref_risk_bands', 'ref_income_bands',
      'ref_dbr_bands', 'ref_limit_bands', 'ref_locations',
      'ref_age_brackets', 'ref_channels', 'ref_tenure_bands'
    ])
  LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', tbl);
    EXECUTE format(
      'CREATE POLICY "Allow anon read %1$s" ON %1$I FOR SELECT USING (true)',
      tbl
    );
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


-- =============================================================================
-- PHASE 6: Seed reference data
-- =============================================================================

-- Customer Segments
INSERT INTO ref_customer_segments (code, label, description) VALUES
  ('SAL', 'Salaried', 'Employed with fixed monthly salary'),
  ('SE', 'Self-Employed', 'Self-employed business owner'),
  ('SE_PROF', 'Self-Employed Professional', 'Self-employed professional (doctor, lawyer, CA, etc.)'),
  ('OTH', 'Others', 'Pensioners, freelancers, and others')
ON CONFLICT (code) DO NOTHING;

-- Product Variants
INSERT INTO ref_product_variants (code, label, description) VALUES
  ('FRESH', 'Fresh', 'New loan disbursement'),
  ('RENEWAL', 'Renewal', 'Renewal of existing facility'),
  ('TOPUP', 'Top-Up', 'Additional amount on existing loan'),
  ('BT', 'Balance Transfer', 'Loan taken over from another lender')
ON CONFLICT (code) DO NOTHING;

-- Bureau Buckets
INSERT INTO ref_bureau_buckets (code, label, score_min, score_max, display_order) VALUES
  ('NTC', 'New to Credit', NULL, NULL, 0),
  ('SUB_550', 'Below 550', 0, 549, 1),
  ('550_600', '550-600', 550, 600, 2),
  ('601_650', '601-650', 601, 650, 3),
  ('651_700', '651-700', 651, 700, 4),
  ('701_750', '701-750', 701, 750, 5),
  ('751_800', '751-800', 751, 800, 6),
  ('800_PLUS', '800+', 801, 999, 7)
ON CONFLICT (code) DO NOTHING;

-- Risk Bands
INSERT INTO ref_risk_bands (code, label, display_order) VALUES
  ('LOW', 'Low Risk', 1),
  ('MEDIUM', 'Medium Risk', 2),
  ('HIGH', 'High Risk', 3),
  ('VERY_HIGH', 'Very High Risk', 4)
ON CONFLICT (code) DO NOTHING;

-- DBR Bands
INSERT INTO ref_dbr_bands (code, label, min_ratio, max_ratio, display_order) VALUES
  ('0_30', '0-30%', 0, 0.30, 1),
  ('30_40', '30-40%', 0.30, 0.40, 2),
  ('40_50', '40-50%', 0.40, 0.50, 3),
  ('50_60', '50-60%', 0.50, 0.60, 4),
  ('60_PLUS', '60%+', 0.60, 1.00, 5)
ON CONFLICT (code) DO NOTHING;

-- Age Brackets
INSERT INTO ref_age_brackets (code, label, min_age, max_age, display_order) VALUES
  ('18_25', '18-25', 18, 25, 1),
  ('26_30', '26-30', 26, 30, 2),
  ('31_35', '31-35', 31, 35, 3),
  ('36_40', '36-40', 36, 40, 4),
  ('41_50', '41-50', 41, 50, 5),
  ('51_60', '51-60', 51, 60, 6),
  ('60_PLUS', '60+', 61, 99, 7)
ON CONFLICT (code) DO NOTHING;

-- Channels
INSERT INTO ref_channels (code, label) VALUES
  ('BRANCH', 'Branch'),
  ('DIGITAL', 'Digital'),
  ('DSA', 'DSA/Connector'),
  ('DIRECT', 'Direct Sales'),
  ('PARTNER', 'Partner/OEM')
ON CONFLICT (code) DO NOTHING;

-- Tenure Bands
INSERT INTO ref_tenure_bands (code, label, min_months, max_months, display_order) VALUES
  ('0_6', '0-6 months', 0, 6, 1),
  ('6_12', '6-12 months', 6, 12, 2),
  ('12_24', '1-2 years', 12, 24, 3),
  ('24_36', '2-3 years', 24, 36, 4),
  ('36_60', '3-5 years', 36, 60, 5),
  ('60_PLUS', '5+ years', 60, 360, 6)
ON CONFLICT (code) DO NOTHING;

-- Program Types (per-subsidiary)
-- Subsidiary 1: Samman Capital (India, INR)
INSERT INTO ref_program_types (subsidiary_id, code, label, product_name) VALUES
  (1, 'INCOME_PROOF', 'Income Proof Program', NULL),
  (1, 'BUREAU_BASED', 'Bureau-Based Program', NULL),
  (1, 'CAR_OWNER', 'Car Ownership Program', 'Auto Loan'),
  (1, 'SALARY_DEDUCT', 'Salary Deduction Program', 'Personal Loan'),
  (1, 'BANK_STMT', 'Bank Statement Program', NULL)
ON CONFLICT (subsidiary_id, code) DO NOTHING;

-- Subsidiary 2: Oasis Lending (UAE, AED)
INSERT INTO ref_program_types (subsidiary_id, code, label, product_name) VALUES
  (2, 'INCOME_PROOF', 'Income Proof Program', NULL),
  (2, 'BUREAU_BASED', 'Bureau-Based Program', NULL),
  (2, 'SALARY_ASSIGN', 'Salary Assignment Program', 'Personal Loan'),
  (2, 'PROPERTY_BACK', 'Property-Backed Program', 'Home Loan'),
  (2, 'FLEET_FINANCE', 'Fleet Finance Program', 'Auto Loan')
ON CONFLICT (subsidiary_id, code) DO NOTHING;

-- Subsidiary 3: Nile Finance (Egypt, EGP)
INSERT INTO ref_program_types (subsidiary_id, code, label, product_name) VALUES
  (3, 'INCOME_PROOF', 'Income Proof Program', NULL),
  (3, 'BUREAU_BASED', 'Bureau-Based Program', NULL),
  (3, 'PAYROLL', 'Payroll Deduction Program', 'Personal Loan'),
  (3, 'CLUB_MEMBER', 'Club Membership Program', NULL),
  (3, 'MICRO_FINANCE', 'Micro Finance Program', NULL)
ON CONFLICT (subsidiary_id, code) DO NOTHING;

-- Subsidiary 4: Atlas Credit (Turkey, TRY)
INSERT INTO ref_program_types (subsidiary_id, code, label, product_name) VALUES
  (4, 'INCOME_PROOF', 'Income Proof Program', NULL),
  (4, 'BUREAU_BASED', 'Bureau-Based Program', NULL),
  (4, 'DEPOSIT_BACK', 'Deposit-Backed Program', NULL),
  (4, 'MERCHANT', 'Merchant Finance Program', NULL),
  (4, 'GOVT_EMPLOYEE', 'Government Employee Program', 'Personal Loan')
ON CONFLICT (subsidiary_id, code) DO NOTHING;

-- Subsidiary 5: Meridian Loans (Pakistan, PKR)
INSERT INTO ref_program_types (subsidiary_id, code, label, product_name) VALUES
  (5, 'INCOME_PROOF', 'Income Proof Program', NULL),
  (5, 'BUREAU_BASED', 'Bureau-Based Program', NULL),
  (5, 'SALARY_DEDUCT', 'Salary Deduction Program', 'Personal Loan'),
  (5, 'GOLD_BACKED', 'Gold-Backed Program', NULL),
  (5, 'AGRI_FINANCE', 'Agriculture Finance Program', NULL)
ON CONFLICT (subsidiary_id, code) DO NOTHING;

-- Income Bands (per-subsidiary, different currencies)
-- Subsidiary 1: INR
INSERT INTO ref_income_bands (subsidiary_id, code, label, min_amount, max_amount, currency_code, display_order) VALUES
  (1, 'LT_25K', 'Below 25K', 0, 25000, 'INR', 1),
  (1, '25K_50K', '25K-50K', 25000, 50000, 'INR', 2),
  (1, '50K_1L', '50K-1L', 50000, 100000, 'INR', 3),
  (1, '1L_2L', '1L-2L', 100000, 200000, 'INR', 4),
  (1, 'GT_2L', '2L+', 200000, NULL, 'INR', 5)
ON CONFLICT (subsidiary_id, code) DO NOTHING;

-- Subsidiary 2: AED
INSERT INTO ref_income_bands (subsidiary_id, code, label, min_amount, max_amount, currency_code, display_order) VALUES
  (2, 'LT_5K', 'Below 5K', 0, 5000, 'AED', 1),
  (2, '5K_10K', '5K-10K', 5000, 10000, 'AED', 2),
  (2, '10K_20K', '10K-20K', 10000, 20000, 'AED', 3),
  (2, '20K_40K', '20K-40K', 20000, 40000, 'AED', 4),
  (2, 'GT_40K', '40K+', 40000, NULL, 'AED', 5)
ON CONFLICT (subsidiary_id, code) DO NOTHING;

-- Subsidiary 3: EGP
INSERT INTO ref_income_bands (subsidiary_id, code, label, min_amount, max_amount, currency_code, display_order) VALUES
  (3, 'LT_10K', 'Below 10K', 0, 10000, 'EGP', 1),
  (3, '10K_20K', '10K-20K', 10000, 20000, 'EGP', 2),
  (3, '20K_40K', '20K-40K', 20000, 40000, 'EGP', 3),
  (3, '40K_80K', '40K-80K', 40000, 80000, 'EGP', 4),
  (3, 'GT_80K', '80K+', 80000, NULL, 'EGP', 5)
ON CONFLICT (subsidiary_id, code) DO NOTHING;

-- Subsidiary 4: TRY
INSERT INTO ref_income_bands (subsidiary_id, code, label, min_amount, max_amount, currency_code, display_order) VALUES
  (4, 'LT_20K', 'Below 20K', 0, 20000, 'TRY', 1),
  (4, '20K_40K', '20K-40K', 20000, 40000, 'TRY', 2),
  (4, '40K_80K', '40K-80K', 40000, 80000, 'TRY', 3),
  (4, '80K_150K', '80K-150K', 80000, 150000, 'TRY', 4),
  (4, 'GT_150K', '150K+', 150000, NULL, 'TRY', 5)
ON CONFLICT (subsidiary_id, code) DO NOTHING;

-- Subsidiary 5: PKR
INSERT INTO ref_income_bands (subsidiary_id, code, label, min_amount, max_amount, currency_code, display_order) VALUES
  (5, 'LT_50K', 'Below 50K', 0, 50000, 'PKR', 1),
  (5, '50K_100K', '50K-100K', 50000, 100000, 'PKR', 2),
  (5, '100K_200K', '100K-200K', 100000, 200000, 'PKR', 3),
  (5, '200K_400K', '200K-400K', 200000, 400000, 'PKR', 4),
  (5, 'GT_400K', '400K+', 400000, NULL, 'PKR', 5)
ON CONFLICT (subsidiary_id, code) DO NOTHING;

-- Limit Bands (per-subsidiary, different currencies)
-- Subsidiary 1: INR
INSERT INTO ref_limit_bands (subsidiary_id, code, label, min_amount, max_amount, currency_code, display_order) VALUES
  (1, 'LT_1L', 'Below 1L', 0, 100000, 'INR', 1),
  (1, '1L_5L', '1L-5L', 100000, 500000, 'INR', 2),
  (1, '5L_10L', '5L-10L', 500000, 1000000, 'INR', 3),
  (1, '10L_25L', '10L-25L', 1000000, 2500000, 'INR', 4),
  (1, 'GT_25L', '25L+', 2500000, NULL, 'INR', 5)
ON CONFLICT (subsidiary_id, code) DO NOTHING;

-- Subsidiary 2: AED
INSERT INTO ref_limit_bands (subsidiary_id, code, label, min_amount, max_amount, currency_code, display_order) VALUES
  (2, 'LT_50K', 'Below 50K', 0, 50000, 'AED', 1),
  (2, '50K_150K', '50K-150K', 50000, 150000, 'AED', 2),
  (2, '150K_500K', '150K-500K', 150000, 500000, 'AED', 3),
  (2, '500K_1M', '500K-1M', 500000, 1000000, 'AED', 4),
  (2, 'GT_1M', '1M+', 1000000, NULL, 'AED', 5)
ON CONFLICT (subsidiary_id, code) DO NOTHING;

-- Subsidiary 3: EGP
INSERT INTO ref_limit_bands (subsidiary_id, code, label, min_amount, max_amount, currency_code, display_order) VALUES
  (3, 'LT_100K', 'Below 100K', 0, 100000, 'EGP', 1),
  (3, '100K_500K', '100K-500K', 100000, 500000, 'EGP', 2),
  (3, '500K_1M', '500K-1M', 500000, 1000000, 'EGP', 3),
  (3, '1M_5M', '1M-5M', 1000000, 5000000, 'EGP', 4),
  (3, 'GT_5M', '5M+', 5000000, NULL, 'EGP', 5)
ON CONFLICT (subsidiary_id, code) DO NOTHING;

-- Subsidiary 4: TRY
INSERT INTO ref_limit_bands (subsidiary_id, code, label, min_amount, max_amount, currency_code, display_order) VALUES
  (4, 'LT_100K', 'Below 100K', 0, 100000, 'TRY', 1),
  (4, '100K_500K', '100K-500K', 100000, 500000, 'TRY', 2),
  (4, '500K_1M', '500K-1M', 500000, 1000000, 'TRY', 3),
  (4, '1M_5M', '1M-5M', 1000000, 5000000, 'TRY', 4),
  (4, 'GT_5M', '5M+', 5000000, NULL, 'TRY', 5)
ON CONFLICT (subsidiary_id, code) DO NOTHING;

-- Subsidiary 5: PKR
INSERT INTO ref_limit_bands (subsidiary_id, code, label, min_amount, max_amount, currency_code, display_order) VALUES
  (5, 'LT_500K', 'Below 500K', 0, 500000, 'PKR', 1),
  (5, '500K_2M', '500K-2M', 500000, 2000000, 'PKR', 2),
  (5, '2M_5M', '2M-5M', 2000000, 5000000, 'PKR', 3),
  (5, '5M_10M', '5M-10M', 5000000, 10000000, 'PKR', 4),
  (5, 'GT_10M', '10M+', 10000000, NULL, 'PKR', 5)
ON CONFLICT (subsidiary_id, code) DO NOTHING;

-- Locations (per-subsidiary, top cities)
-- Subsidiary 1: India
INSERT INTO ref_locations (subsidiary_id, code, label, city, state_province) VALUES
  (1, 'MUM', 'Mumbai', 'Mumbai', 'Maharashtra'),
  (1, 'DEL', 'Delhi NCR', 'New Delhi', 'Delhi'),
  (1, 'BLR', 'Bangalore', 'Bangalore', 'Karnataka'),
  (1, 'CHN', 'Chennai', 'Chennai', 'Tamil Nadu'),
  (1, 'HYD', 'Hyderabad', 'Hyderabad', 'Telangana'),
  (1, 'PUN', 'Pune', 'Pune', 'Maharashtra'),
  (1, 'KOL', 'Kolkata', 'Kolkata', 'West Bengal'),
  (1, 'AHM', 'Ahmedabad', 'Ahmedabad', 'Gujarat')
ON CONFLICT (subsidiary_id, code) DO NOTHING;

-- Subsidiary 2: UAE
INSERT INTO ref_locations (subsidiary_id, code, label, city, state_province) VALUES
  (2, 'DXB', 'Dubai', 'Dubai', 'Dubai'),
  (2, 'AUH', 'Abu Dhabi', 'Abu Dhabi', 'Abu Dhabi'),
  (2, 'SHJ', 'Sharjah', 'Sharjah', 'Sharjah'),
  (2, 'AJM', 'Ajman', 'Ajman', 'Ajman'),
  (2, 'RAK', 'Ras Al Khaimah', 'Ras Al Khaimah', 'RAK')
ON CONFLICT (subsidiary_id, code) DO NOTHING;

-- Subsidiary 3: Egypt
INSERT INTO ref_locations (subsidiary_id, code, label, city, state_province) VALUES
  (3, 'CAI', 'Cairo', 'Cairo', 'Cairo'),
  (3, 'ALX', 'Alexandria', 'Alexandria', 'Alexandria'),
  (3, 'GIZ', 'Giza', 'Giza', 'Giza'),
  (3, 'MNS', 'Mansoura', 'Mansoura', 'Dakahlia'),
  (3, 'ASW', 'Aswan', 'Aswan', 'Aswan')
ON CONFLICT (subsidiary_id, code) DO NOTHING;

-- Subsidiary 4: Turkey
INSERT INTO ref_locations (subsidiary_id, code, label, city, state_province) VALUES
  (4, 'IST', 'Istanbul', 'Istanbul', 'Istanbul'),
  (4, 'ANK', 'Ankara', 'Ankara', 'Ankara'),
  (4, 'IZM', 'Izmir', 'Izmir', 'Izmir'),
  (4, 'BUR', 'Bursa', 'Bursa', 'Bursa'),
  (4, 'ANT', 'Antalya', 'Antalya', 'Antalya')
ON CONFLICT (subsidiary_id, code) DO NOTHING;

-- Subsidiary 5: Pakistan
INSERT INTO ref_locations (subsidiary_id, code, label, city, state_province) VALUES
  (5, 'KHI', 'Karachi', 'Karachi', 'Sindh'),
  (5, 'LHR', 'Lahore', 'Lahore', 'Punjab'),
  (5, 'ISB', 'Islamabad', 'Islamabad', 'ICT'),
  (5, 'RWP', 'Rawalpindi', 'Rawalpindi', 'Punjab'),
  (5, 'FSD', 'Faisalabad', 'Faisalabad', 'Punjab')
ON CONFLICT (subsidiary_id, code) DO NOTHING;


-- =============================================================================
-- PHASE 7: Register schema version
-- =============================================================================

INSERT INTO schema_versions (version, script_name, description) VALUES
  ('7.0', 'schema-v7-consumer-dimensions.sql', 'Consumer finance granular dimensions — 12 ref tables, 13 ALTER TABLEs, UNIQUE constraint updates')
ON CONFLICT (version) DO NOTHING;
