-- ============================================================================
-- Rollback for v9: Samman Capital Wholesale / Corporate PQR fields
-- ============================================================================

ALTER TABLE corporate_watchlist
  DROP COLUMN IF EXISTS watch_grade,
  DROP COLUMN IF EXISTS dpd,
  DROP COLUMN IF EXISTS ifrs_stage;

ALTER TABLE corporate_covenants
  DROP COLUMN IF EXISTS threshold_value,
  DROP COLUMN IF EXISTS actual_value,
  DROP COLUMN IF EXISTS breach_pct,
  DROP COLUMN IF EXISTS waiver_status,
  DROP COLUMN IF EXISTS cure_deadline;

ALTER TABLE corporate_provisioning_ecl
  DROP COLUMN IF EXISTS opening_balance,
  DROP COLUMN IF EXISTS opening_balance_usd,
  DROP COLUMN IF EXISTS new_provisions,
  DROP COLUMN IF EXISTS new_provisions_usd,
  DROP COLUMN IF EXISTS releases,
  DROP COLUMN IF EXISTS releases_usd,
  DROP COLUMN IF EXISTS writeoffs,
  DROP COLUMN IF EXISTS writeoffs_usd,
  DROP COLUMN IF EXISTS closing_balance,
  DROP COLUMN IF EXISTS closing_balance_usd;
