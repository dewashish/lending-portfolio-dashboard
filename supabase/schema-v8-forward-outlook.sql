-- Schema V8: Forward Outlook — Subsidiary Stress Scores & Management Actions
-- Run against Supabase SQL Editor

-- ── 1. subsidiary_stress_scores ─────────────────────────────────────

CREATE TABLE IF NOT EXISTS subsidiary_stress_scores (
  id SERIAL PRIMARY KEY,
  subsidiary_id INT NOT NULL REFERENCES subsidiaries(id),
  dimension TEXT NOT NULL,
  score NUMERIC NOT NULL DEFAULT 0,
  rag_status TEXT NOT NULL DEFAULT 'Green',
  drivers JSONB DEFAULT '[]'::jsonb,
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE subsidiary_stress_scores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anon_read_subsidiary_stress_scores" ON subsidiary_stress_scores FOR SELECT TO anon USING (true);
CREATE POLICY "service_write_subsidiary_stress_scores" ON subsidiary_stress_scores FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE INDEX idx_subsidiary_stress_scores_sub ON subsidiary_stress_scores(subsidiary_id);
CREATE UNIQUE INDEX idx_subsidiary_stress_scores_unique ON subsidiary_stress_scores(subsidiary_id, dimension);

-- ── 2. management_actions ───────────────────────────────────────────

CREATE TABLE IF NOT EXISTS management_actions (
  id SERIAL PRIMARY KEY,
  subsidiary_id INT NOT NULL REFERENCES subsidiaries(id),
  trigger_source TEXT NOT NULL,
  trigger_indicator TEXT NOT NULL,
  rag_status TEXT NOT NULL DEFAULT 'Red',
  action_category TEXT NOT NULL,
  action_description TEXT NOT NULL,
  priority TEXT NOT NULL DEFAULT 'Medium',
  owner TEXT,
  deadline TEXT,
  status TEXT NOT NULL DEFAULT 'Open',
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE management_actions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anon_read_management_actions" ON management_actions FOR SELECT TO anon USING (true);
CREATE POLICY "service_write_management_actions" ON management_actions FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE INDEX idx_management_actions_sub ON management_actions(subsidiary_id);
CREATE INDEX idx_management_actions_category ON management_actions(action_category);

-- ── Schema version ──────────────────────────────────────────────────
INSERT INTO schema_versions (version, script_name, description)
VALUES ('8.0', 'schema-v8-forward-outlook.sql', 'Forward Outlook: subsidiary stress scores & management actions')
ON CONFLICT (version) DO NOTHING;
