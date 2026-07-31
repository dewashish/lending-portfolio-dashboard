-- ============================================================================
-- v9: Samman Capital Wholesale / Corporate PQR — net-new templatized fields
-- ============================================================================
-- Additive columns so the Sammaan PQR's Wholesale Summary + Corporate Snapshot
-- data points have a home. All nullable / defaulted → render as '—' for
-- subsidiaries that do not supply them (Hybrid templatization rule).
-- ============================================================================

-- Watch-list: watch grade (WL-1/2/3), DPD, and IFRS stage per account
ALTER TABLE corporate_watchlist
  ADD COLUMN IF NOT EXISTS watch_grade TEXT,
  ADD COLUMN IF NOT EXISTS dpd INTEGER,
  ADD COLUMN IF NOT EXISTS ifrs_stage TEXT;

-- Covenants: numeric threshold vs actual, breach %, waiver status, cure deadline
ALTER TABLE corporate_covenants
  ADD COLUMN IF NOT EXISTS threshold_value TEXT,
  ADD COLUMN IF NOT EXISTS actual_value TEXT,
  ADD COLUMN IF NOT EXISTS breach_pct NUMERIC,
  ADD COLUMN IF NOT EXISTS waiver_status TEXT,
  ADD COLUMN IF NOT EXISTS cure_deadline DATE;

-- ECL provision movement per (period, stage): opening → new → releases → write-offs → closing
ALTER TABLE corporate_provisioning_ecl
  ADD COLUMN IF NOT EXISTS opening_balance NUMERIC,
  ADD COLUMN IF NOT EXISTS opening_balance_usd NUMERIC,
  ADD COLUMN IF NOT EXISTS new_provisions NUMERIC,
  ADD COLUMN IF NOT EXISTS new_provisions_usd NUMERIC,
  ADD COLUMN IF NOT EXISTS releases NUMERIC,
  ADD COLUMN IF NOT EXISTS releases_usd NUMERIC,
  ADD COLUMN IF NOT EXISTS writeoffs NUMERIC,
  ADD COLUMN IF NOT EXISTS writeoffs_usd NUMERIC,
  ADD COLUMN IF NOT EXISTS closing_balance NUMERIC,
  ADD COLUMN IF NOT EXISTS closing_balance_usd NUMERIC;
