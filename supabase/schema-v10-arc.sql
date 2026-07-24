-- ============================================================================
-- v10: ARC Performance + NPA Collection (Sammaan PQR — Samman Capital)
-- ============================================================================
-- Surfaced in Risk & Concentrations → "ARC Performance" sub-tab. Scope-filtered
-- by subsidiary_id; the sub-tab is gated on data availability (Samman only).
-- ============================================================================

-- Per-ARC recovery tracking (quarterly)
CREATE TABLE IF NOT EXISTS arc_performance (
  id SERIAL PRIMARY KEY,
  subsidiary_id INTEGER NOT NULL REFERENCES subsidiaries(id),
  arc_name TEXT NOT NULL,
  period TEXT NOT NULL,
  original_pos NUMERIC DEFAULT 0,
  original_pos_usd NUMERIC,
  current_pos NUMERIC DEFAULT 0,
  current_pos_usd NUMERIC,
  lifetime_recoveries NUMERIC DEFAULT 0,
  lifetime_recoveries_usd NUMERIC,
  expected_recoveries_agreed NUMERIC DEFAULT 0,
  expected_recoveries_agreed_usd NUMERIC,
  current_month_recoveries NUMERIC DEFAULT 0,
  current_month_recoveries_usd NUMERIC,
  agreement_start_date DATE,
  agreement_end_date DATE,
  data_source_id INTEGER REFERENCES data_sources(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT uq_arc_performance UNIQUE (subsidiary_id, arc_name, period)
);
CREATE INDEX IF NOT EXISTS idx_arc_perf_subsidiary ON arc_performance(subsidiary_id);

-- NPA collection trend split ARC vs Non-ARC vs Total (monthly)
CREATE TABLE IF NOT EXISTS npa_collection (
  id SERIAL PRIMARY KEY,
  subsidiary_id INTEGER NOT NULL REFERENCES subsidiaries(id),
  period TEXT NOT NULL,
  arc_type TEXT NOT NULL,               -- 'ARC' | 'Non-ARC' | 'Total'
  pos NUMERIC DEFAULT 0,
  pos_usd NUMERIC,
  money_collected NUMERIC DEFAULT 0,
  money_collected_usd NUMERIC,
  collected_to_pos_pct NUMERIC DEFAULT 0,
  data_source_id INTEGER REFERENCES data_sources(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT uq_npa_collection UNIQUE (subsidiary_id, arc_type, period)
);
CREATE INDEX IF NOT EXISTS idx_npa_collection_subsidiary ON npa_collection(subsidiary_id);

-- RLS: anon read, service_role write (mirrors existing tables)
ALTER TABLE arc_performance ENABLE ROW LEVEL SECURITY;
ALTER TABLE npa_collection ENABLE ROW LEVEL SECURITY;
CREATE POLICY "arc_performance_anon_read" ON arc_performance FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "arc_performance_service_write" ON arc_performance FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "npa_collection_anon_read" ON npa_collection FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "npa_collection_service_write" ON npa_collection FOR ALL TO service_role USING (true) WITH CHECK (true);
