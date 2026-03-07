-- Temporary INSERT + DELETE policies for seeding (run in Supabase SQL Editor)
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
