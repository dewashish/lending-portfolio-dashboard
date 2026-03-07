import { supabase } from '../supabase';
import type { Database } from '../database.types';
import type {
  CorporateWatchlistRow,
  CovenantTrackingRow,
  CorporateDelinquencyRow,
  CorporatePortfolioRow,
  ScopeSelection,
} from '../types';
import { applyScopeAsync } from './shared';

// ── Type aliases ─────────────────────────────────────────────────
type WatchlistDbRow = Database['public']['Tables']['corporate_watchlist']['Row'];
type CovenantDbRow = Database['public']['Tables']['corporate_covenants']['Row'];
type DelinquencyDbRow = Database['public']['Tables']['corporate_delinquency']['Row'];
type PortfolioMetricDbRow = Database['public']['Tables']['corporate_portfolio_metrics']['Row'];

// ── Query Functions ──────────────────────────────────────────────

export async function fetchCorporateWatchlist(scope?: ScopeSelection): Promise<CorporateWatchlistRow[]> {
  let query = supabase
    .from('corporate_watchlist')
    .select('*')
    .order('exposure_usd', { ascending: false });
  query = await applyScopeAsync(query, scope);
  const { data, error } = await query;
  if (error) throw error;
  return ((data ?? []) as WatchlistDbRow[]).map((r) => ({
    borrower: r.borrower,
    sector: r.sector,
    exposure: String(r.exposure_usd ?? r.exposure ?? 0),
    ewsTriggerType: r.ews_trigger_type ?? '',
    internalRating: r.internal_rating ?? '',
    status: r.status ?? '',
    remedialAction: r.remedial_action ?? '',
  }));
}

export async function fetchCorporateCovenants(scope?: ScopeSelection): Promise<CovenantTrackingRow[]> {
  let query = supabase
    .from('corporate_covenants')
    .select('*')
    .order('id');
  query = await applyScopeAsync(query, scope);
  const { data, error } = await query;
  if (error) throw error;
  return ((data ?? []) as CovenantDbRow[]).map((r) => ({
    groupId: r.group_id,
    custId: r.cust_id,
    customerName: r.customer_name,
    dateOfDisbursal: r.date_of_disbursal ?? '',
    sanctionedLimit: r.sanctioned_limit_usd ?? r.sanctioned_limit ?? 0,
    disbursedAmount: r.disbursed_amount_usd ?? r.disbursed_amount ?? 0,
    currentPOS: r.current_pos_usd ?? r.current_pos ?? 0,
    facilityType: r.facility_type ?? '',
    securityType: r.security_type ?? '',
    securityCover: r.security_cover ?? 0,
    riskRating: r.risk_rating ?? '',
    covenantCategory: r.covenant_category ?? '',
    covenantType: r.covenant_type ?? '',
    covenantDescription: r.covenant_description ?? '',
    covenantFrequency: r.covenant_frequency ?? '',
    submissionDate: r.submission_date ?? '',
    approvalForExtension: r.approval_for_extension ?? '',
    npaFlag: r.npa_flag,
    restructuredFlag: r.restructured_flag,
    watchlistFlag: r.watchlist_flag,
    writeoffFlag: r.writeoff_flag,
  }));
}

export async function fetchCorporateDelinquency(scope?: ScopeSelection): Promise<CorporateDelinquencyRow[]> {
  let query = supabase
    .from('corporate_delinquency')
    .select('*')
    .order('current_dpd', { ascending: false });
  query = await applyScopeAsync(query, scope);
  const { data, error } = await query;
  if (error) throw error;
  return ((data ?? []) as DelinquencyDbRow[]).map((r) => ({
    groupId: r.group_id,
    custId: r.cust_id,
    customerName: r.customer_name,
    sector: r.sector ?? '',
    industry: r.industry ?? '',
    sanctionedLimit: r.sanctioned_limit_usd ?? r.sanctioned_limit ?? 0,
    disbursedAmount: r.disbursed_amount_usd ?? r.disbursed_amount ?? 0,
    currentPOS: r.current_pos_usd ?? r.current_pos ?? 0,
    facilityType: r.facility_type ?? '',
    securityType: r.security_type ?? '',
    securityCover: r.security_cover ?? 0,
    ratingAtDisbursement: r.rating_at_disbursement ?? '',
    currentRating: r.current_rating ?? '',
    renewalDone: r.renewal_done,
    dpdAtMonthEnd: r.dpd_at_month_end ?? 0,
    currentDPD: r.current_dpd ?? 0,
    reasonForDelinquency: r.reason_for_delinquency ?? '',
    lastRemedialAction: r.last_remedial_action ?? '',
    updateOnRemedial: r.update_on_remedial ?? '',
    currentStatus: r.current_status ?? '',
    nextStep: r.next_step ?? '',
  }));
}

export async function fetchCorporatePortfolioMetrics(scope?: ScopeSelection): Promise<CorporatePortfolioRow[]> {
  let query = supabase
    .from('corporate_portfolio_metrics')
    .select('*')
    .order('id');
  query = await applyScopeAsync(query, scope);
  const { data, error } = await query;
  if (error) throw error;

  // Pivot: group by particular, nest periods
  const map = new Map<string, CorporatePortfolioRow>();
  for (const r of (data ?? []) as PortfolioMetricDbRow[]) {
    if (!map.has(r.particular)) {
      map.set(r.particular, { particular: r.particular, months: {} });
    }
    map.get(r.particular)!.months[r.period] = {
      total: r.total_usd ?? r.total ?? 0,
      fundBased: r.fund_based_usd ?? r.fund_based ?? 0,
      nonFB: r.non_fund_based_usd ?? r.non_fund_based ?? 0,
    };
  }
  return Array.from(map.values());
}
