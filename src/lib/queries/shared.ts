import { supabase } from '../supabase';
import type { Database } from '../database.types';
import type { ScopeSelection, Subsidiary, Region, ConsumerFilters } from '../types';
import { applySubsidiaryOverride, REGION_OVERRIDES } from '../baobab-overrides';

// ── Type aliases ─────────────────────────────────────────────────
type SubsidiaryRow = Database['public']['Tables']['subsidiaries']['Row'];

// ── Subsidiary Cache ─────────────────────────────────────────────

let _subsidiaryCache: Subsidiary[] | null = null;

export async function getSubsidiaries(): Promise<Subsidiary[]> {
  if (_subsidiaryCache) return _subsidiaryCache;
  const { data } = await supabase
    .from('subsidiaries')
    .select('id, name, short_code, country, country_code, region_id, currency_code, institution_type, is_active')
    .eq('is_active', true);
  _subsidiaryCache = ((data ?? []) as SubsidiaryRow[]).map((s) => applySubsidiaryOverride({
    id: s.id,
    name: s.name,
    shortCode: s.short_code,
    country: s.country,
    countryCode: s.country_code,
    regionId: s.region_id,
    currencyCode: s.currency_code,
    institutionType: s.institution_type,
    isActive: s.is_active,
  }));
  return _subsidiaryCache;
}

export async function getSubsidiaryIdsByRegion(regionId: number): Promise<number[]> {
  const subs = await getSubsidiaries();
  return subs.filter((s) => s.regionId === regionId).map((s) => s.id);
}

// ── Scope Helpers ────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function applyScopeAsync(query: any, scope?: ScopeSelection) {
  if (!scope || scope.level === 'group') return query;
  if (scope.level === 'subsidiary' && scope.subsidiaryId) {
    return query.eq('subsidiary_id', scope.subsidiaryId);
  }
  if (scope.level === 'region' && scope.regionId) {
    const ids = await getSubsidiaryIdsByRegion(scope.regionId);
    return query.in('subsidiary_id', ids);
  }
  return query;
}

export function scopeKey(base: string, scope?: ScopeSelection): string {
  if (!scope || scope.level === 'group') return base;
  if (scope.level === 'subsidiary') return `${base}-sub-${scope.subsidiaryId}`;
  if (scope.level === 'region') return `${base}-reg-${scope.regionId}`;
  return base;
}

// ── Consumer Filter Key ─────────────────────────────────────────

export function consumerFilterKey(base: string, filters?: ConsumerFilters): string {
  if (!filters) return base;
  let key = base;
  if (filters.period) key += `|p:${filters.period}`;
  if (filters.products.length > 0) key += `|pr:${filters.products.sort().join(',')}`;
  return key;
}

// ── Region / Subsidiary Fetch ────────────────────────────────────

export async function fetchSubsidiaries(): Promise<Subsidiary[]> {
  return getSubsidiaries();
}

export async function fetchRegions(): Promise<Region[]> {
  // Region grouping is overridden to the Baobab African regions. The ids align
  // with the overridden subsidiary region_ids so scope filtering stays correct.
  return REGION_OVERRIDES;
}
