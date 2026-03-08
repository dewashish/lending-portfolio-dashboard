import { supabase } from '../supabase';
import type { RiskAppetiteRow } from '../types';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const table = () => supabase.from('risk_appetite_settings' as any);

/** Fetch all risk appetite threshold rows */
export async function fetchAllThresholds(): Promise<RiskAppetiteRow[]> {
  const { data, error } = await table()
    .select('*')
    .order('metric_key');

  if (error) throw error;
  return (data ?? []) as RiskAppetiteRow[];
}

/** Upsert a threshold (insert or update based on unique constraint) */
export async function upsertThreshold(row: Omit<RiskAppetiteRow, 'id' | 'updated_at'>): Promise<void> {
  const payload = {
    metric_key: row.metric_key,
    scope_level: row.scope_level,
    region_id: row.region_id,
    subsidiary_id: row.subsidiary_id,
    business_line: row.business_line,
    product_name: row.product_name,
    appetite: row.appetite,
    tolerance: row.tolerance,
    updated_at: new Date().toISOString(),
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await table().upsert(payload as any, {
    onConflict: 'metric_key,scope_level,region_id,subsidiary_id,business_line,product_name',
  });
  if (error) throw error;
}

/** Delete a threshold override by id (falls back to parent scope) */
export async function deleteThreshold(id: number): Promise<void> {
  const { error } = await table()
    .delete()
    .eq('id', id);
  if (error) throw error;
}
