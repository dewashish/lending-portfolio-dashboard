-- Schema V3: Trade Finance Enhancement Tables
-- 3 new tables for stage migration, DPD roll rates, and DPD aging
-- Run AFTER schema-v2.sql in Supabase SQL Editor

-- 1. Trade Stage Migration — Stage transition matrix
CREATE TABLE IF NOT EXISTS trade_stage_migration (
  id SERIAL PRIMARY KEY,
  subsidiary_id INTEGER NOT NULL REFERENCES subsidiaries(id),
  period TEXT NOT NULL,
  prior_stage TEXT NOT NULL,
  current_stage TEXT NOT NULL,
  facility_count INTEGER DEFAULT 0,
  balance NUMERIC DEFAULT 0,
  balance_usd NUMERIC,
  report_date DATE NOT NULL DEFAULT CURRENT_DATE,
  data_source_id INTEGER REFERENCES data_sources(id),
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_tsm_subsidiary ON trade_stage_migration(subsidiary_id);
CREATE INDEX IF NOT EXISTS idx_tsm_period ON trade_stage_migration(subsidiary_id, period);

-- 2. Trade DPD Roll Rates — DPD bucket transition probabilities
CREATE TABLE IF NOT EXISTS trade_dpd_roll_rates (
  id SERIAL PRIMARY KEY,
  subsidiary_id INTEGER NOT NULL REFERENCES subsidiaries(id),
  period TEXT NOT NULL,
  from_bucket TEXT NOT NULL,
  to_bucket TEXT NOT NULL,
  facility_count INTEGER DEFAULT 0,
  balance NUMERIC DEFAULT 0,
  balance_usd NUMERIC,
  transition_pct NUMERIC DEFAULT 0,
  report_date DATE NOT NULL DEFAULT CURRENT_DATE,
  data_source_id INTEGER REFERENCES data_sources(id),
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_tdrr_subsidiary ON trade_dpd_roll_rates(subsidiary_id);
CREATE INDEX IF NOT EXISTS idx_tdrr_period ON trade_dpd_roll_rates(subsidiary_id, period);

-- 3. Trade DPD Aging by Entity — Past due aging breakdown per subsidiary
CREATE TABLE IF NOT EXISTS trade_dpd_aging_by_entity (
  id SERIAL PRIMARY KEY,
  subsidiary_id INTEGER NOT NULL REFERENCES subsidiaries(id),
  dpd_bucket TEXT NOT NULL,
  facility_count INTEGER DEFAULT 0,
  balance NUMERIC DEFAULT 0,
  balance_usd NUMERIC,
  report_date DATE NOT NULL DEFAULT CURRENT_DATE,
  data_source_id INTEGER REFERENCES data_sources(id),
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_tdae_subsidiary ON trade_dpd_aging_by_entity(subsidiary_id);

-- RLS Policies
DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOR tbl IN
    SELECT unnest(ARRAY[
      'trade_stage_migration', 'trade_dpd_roll_rates', 'trade_dpd_aging_by_entity'
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
