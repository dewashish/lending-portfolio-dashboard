import { supabaseService } from '../supabase/service';

interface DQCheckResult {
  checkId: string;
  checkName: string;
  passed: boolean;
  details: Record<string, unknown>;
}

/**
 * Run post-ingestion data quality checks for a subsidiary + table.
 * Results are stored in data_quality_results table.
 */
export async function runPostIngestionChecks(
  subsidiaryId: number,
  tableName: string,
  batchId: string
): Promise<DQCheckResult[]> {
  const results: DQCheckResult[] = [];

  // POST-01: Check data freshness
  const freshness = await checkFreshness(subsidiaryId, tableName);
  results.push(freshness);

  // POST-02: Check for MoM anomalies (only for consumer_overall_metrics)
  if (tableName === 'consumer_overall_metrics') {
    const anomaly = await checkMoMAnomalies(subsidiaryId);
    results.push(anomaly);
  }

  // Store results
  const insertRows = results.map((r) => ({
    subsidiary_id: subsidiaryId,
    check_id: r.checkId,
    check_name: r.checkName,
    table_name: tableName,
    passed: r.passed,
    details: r.details,
    batch_id: batchId,
  }));

  await supabaseService.from('data_quality_results').insert(insertRows);

  return results;
}

async function checkFreshness(subsidiaryId: number, tableName: string): Promise<DQCheckResult> {
  const { data } = await supabaseService
    .from('sync_watermarks')
    .select('last_synced_at')
    .eq('subsidiary_id', subsidiaryId)
    .eq('table_name', tableName)
    .single();

  if (!data?.last_synced_at) {
    return {
      checkId: 'POST-01',
      checkName: 'Data Freshness',
      passed: true,
      details: { message: 'First sync — no freshness baseline yet' },
    };
  }

  const daysSinceSync = Math.floor(
    (Date.now() - new Date(data.last_synced_at).getTime()) / (1000 * 60 * 60 * 24)
  );

  return {
    checkId: 'POST-01',
    checkName: 'Data Freshness',
    passed: daysSinceSync <= 45,
    details: { daysSinceLastSync: daysSinceSync, threshold: 45 },
  };
}

async function checkMoMAnomalies(subsidiaryId: number): Promise<DQCheckResult> {
  // Get the two most recent periods for Total AUM
  const { data } = await supabaseService
    .from('consumer_overall_metrics')
    .select('period, value')
    .eq('subsidiary_id', subsidiaryId)
    .eq('metric', 'Total AUM')
    .eq('metric_type', 'Portfolio Performance')
    .order('period', { ascending: false })
    .limit(2);

  if (!data || data.length < 2) {
    return {
      checkId: 'POST-02',
      checkName: 'MoM Anomaly Check',
      passed: true,
      details: { message: 'Not enough data for MoM comparison' },
    };
  }

  const [current, previous] = data;
  if (!previous.value || previous.value === 0) {
    return {
      checkId: 'POST-02',
      checkName: 'MoM Anomaly Check',
      passed: true,
      details: { message: 'Previous period value is zero or null' },
    };
  }

  const changePercent = Math.abs(
    ((current.value - previous.value) / previous.value) * 100
  );

  return {
    checkId: 'POST-02',
    checkName: 'MoM Anomaly Check',
    passed: changePercent <= 50,
    details: {
      currentPeriod: current.period,
      previousPeriod: previous.period,
      currentValue: current.value,
      previousValue: previous.value,
      changePercent: Math.round(changePercent * 10) / 10,
      threshold: 50,
    },
  };
}
