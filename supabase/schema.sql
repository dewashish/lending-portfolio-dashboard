-- Consumer Finance PQR Dashboard — Supabase Schema
-- 14 tables covering all PQR sheets + LOS origination data

-- 1. Overall Level metrics (PQR Sheet 1)
CREATE TABLE IF NOT EXISTS consumer_overall_metrics (
  id SERIAL PRIMARY KEY,
  metric_type TEXT NOT NULL,
  metric TEXT NOT NULL,
  period TEXT NOT NULL,
  value NUMERIC,
  benchmark NUMERIC,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Product-wise metrics (PQR Sheet 2)
CREATE TABLE IF NOT EXISTS consumer_product_metrics (
  id SERIAL PRIMARY KEY,
  product_name TEXT NOT NULL,
  metric_type TEXT NOT NULL,
  metric TEXT NOT NULL,
  period TEXT NOT NULL,
  value NUMERIC,
  benchmark NUMERIC,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Net Flow Rates (PQR Sheet 4)
CREATE TABLE IF NOT EXISTS net_flow_rates (
  id SERIAL PRIMARY KEY,
  portfolio TEXT NOT NULL,
  bucket TEXT NOT NULL,
  period TEXT NOT NULL,
  value NUMERIC NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Roll Rate time series (PQR Sheet 6)
CREATE TABLE IF NOT EXISTS roll_rate_series (
  id SERIAL PRIMARY KEY,
  bucket TEXT NOT NULL,
  metric TEXT NOT NULL,
  period TEXT NOT NULL,
  value NUMERIC NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 5. Collection Metrics (PQR Sheet 5)
CREATE TABLE IF NOT EXISTS collection_metrics (
  id SERIAL PRIMARY KEY,
  portfolio TEXT NOT NULL,
  bucket TEXT NOT NULL,
  amount NUMERIC,
  transitions NUMERIC,
  normalized NUMERIC,
  roll_backward NUMERIC,
  stabilized NUMERIC,
  roll_forward NUMERIC,
  period TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 6. Vintage / Static Pool (PQR Sheet 11)
CREATE TABLE IF NOT EXISTS vintage_points (
  id SERIAL PRIMARY KEY,
  vintage TEXT NOT NULL,
  portfolio_segment TEXT DEFAULT 'Total',
  loan_amount NUMERIC,
  mob INTEGER NOT NULL,
  delinquency_rate NUMERIC NOT NULL,
  metric_type TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 7. Non-Starter Analysis (PQR Sheet 7)
CREATE TABLE IF NOT EXISTS non_starters (
  id SERIAL PRIMARY KEY,
  category TEXT NOT NULL,
  product TEXT NOT NULL,
  metric TEXT NOT NULL,
  period TEXT NOT NULL,
  value NUMERIC,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 8. TDD Pre Disbursal (PQR Sheet 9)
CREATE TABLE IF NOT EXISTS tdd_pre_disbursal (
  id SERIAL PRIMARY KEY,
  metric TEXT NOT NULL,
  period TEXT NOT NULL,
  value NUMERIC,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 9. TDD Post Disbursal (PQR Sheet 10)
CREATE TABLE IF NOT EXISTS tdd_post_disbursal (
  id SERIAL PRIMARY KEY,
  variant TEXT NOT NULL,
  bureau_bucket TEXT NOT NULL,
  period TEXT NOT NULL,
  value NUMERIC,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 10. Approved Base (PQR Sheet 8 — Business Support)
CREATE TABLE IF NOT EXISTS approved_base (
  id SERIAL PRIMARY KEY,
  la_band TEXT NOT NULL,
  loan_band TEXT NOT NULL,
  count INTEGER,
  amount NUMERIC,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 11. Rejected Base (PQR Sheet 8 — Business Support)
CREATE TABLE IF NOT EXISTS rejected_base (
  id SERIAL PRIMARY KEY,
  loan_type TEXT NOT NULL,
  amount_band TEXT NOT NULL,
  count INTEGER,
  amount NUMERIC,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 12. LOS Comparison Metrics (MTD/LMTD/FTD)
CREATE TABLE IF NOT EXISTS los_metrics (
  id SERIAL PRIMARY KEY,
  metric TEXT NOT NULL,
  product TEXT NOT NULL,
  ftd NUMERIC,
  mtd NUMERIC,
  lmtd NUMERIC,
  lm_full NUMERIC,
  mom_change NUMERIC,
  target NUMERIC,
  achievement NUMERIC,
  report_date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 13. LOS Funnel Steps
CREATE TABLE IF NOT EXISTS los_funnel (
  id SERIAL PRIMARY KEY,
  stage TEXT NOT NULL,
  product TEXT NOT NULL,
  ftd NUMERIC,
  mtd NUMERIC,
  lmtd NUMERIC,
  conversion_rate NUMERIC,
  report_date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 14. LOS Daily Disbursements
CREATE TABLE IF NOT EXISTS los_daily (
  id SERIAL PRIMARY KEY,
  date DATE NOT NULL,
  product TEXT NOT NULL,
  count INTEGER,
  amount NUMERIC,
  avg_ticket_size NUMERIC,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Row Level Security — allow anonymous read access
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
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', tbl);
    EXECUTE format(
      'CREATE POLICY "Allow anon read %1$s" ON %1$I FOR SELECT USING (true)',
      tbl
    );
  END LOOP;
END
$$;
