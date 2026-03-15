import { NextResponse } from 'next/server';
import { authenticateIngestion } from '@/lib/ingestion';
import { supabaseService } from '@/lib/supabase/service';

export async function GET(request: Request) {
  const authResult = await authenticateIngestion(request);
  if (!authResult.ok) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  const { subsidiaryId } = authResult.context;

  // Fetch subsidiary info
  const { data: sub } = await supabaseService
    .from('subsidiaries')
    .select('name')
    .eq('id', subsidiaryId)
    .single();

  // Fetch all watermarks for this subsidiary
  const { data: watermarks } = await supabaseService
    .from('sync_watermarks')
    .select('table_name, last_synced_at, last_period, row_count')
    .eq('subsidiary_id', subsidiaryId);

  // Build table status map
  const tables: Record<string, { lastSync: string | null; lastPeriod: string | null; rows: number; status: string }> = {};
  const warnings: string[] = [];

  const EXPECTED_TABLES = [
    'consumer_overall_metrics', 'consumer_product_metrics',
    'net_flow_rates', 'roll_rate_series', 'collection_metrics',
    'vintage_points', 'los_metrics', 'los_funnel', 'los_daily',
  ];

  for (const tableName of EXPECTED_TABLES) {
    const wm = watermarks?.find(w => w.table_name === tableName);
    if (!wm) {
      tables[tableName] = { lastSync: null, lastPeriod: null, rows: 0, status: 'never_synced' };
      warnings.push(`${tableName} has never been synced`);
    } else {
      const daysSince = wm.last_synced_at
        ? Math.floor((Date.now() - new Date(wm.last_synced_at).getTime()) / (1000 * 60 * 60 * 24))
        : null;
      const isStale = daysSince !== null && daysSince > 45;
      tables[tableName] = {
        lastSync: wm.last_synced_at,
        lastPeriod: wm.last_period,
        rows: wm.row_count,
        status: isStale ? 'stale' : 'ok',
      };
      if (isStale) {
        warnings.push(`${tableName} last synced ${daysSince} days ago`);
      }
    }
  }

  // Also include any additional watermarks not in the expected list
  for (const wm of watermarks || []) {
    if (!tables[wm.table_name]) {
      tables[wm.table_name] = {
        lastSync: wm.last_synced_at,
        lastPeriod: wm.last_period,
        rows: wm.row_count,
        status: 'ok',
      };
    }
  }

  return NextResponse.json({
    subsidiaryId,
    name: sub?.name || 'Unknown',
    tables,
    warnings,
  });
}
