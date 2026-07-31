import useSWR from 'swr';
import * as queries from '@/lib/queries/risk';
import { scopeKey } from '@/lib/queries/shared';
import type { ScopeSelection } from '@/lib/types';

export function useEWSEntitySummary(scope?: ScopeSelection) {
  return useSWR(scopeKey('ews-entity-summary', scope), () => queries.fetchEWSEntitySummary(scope));
}

export function useEWSFacilityAlerts(scope?: ScopeSelection) {
  return useSWR(scopeKey('ews-facility-alerts', scope), () => queries.fetchEWSFacilityAlerts(scope));
}

export function useFXRisk(scope?: ScopeSelection) {
  return useSWR(scopeKey('fx-risk', scope), () => queries.fetchFXRisk(scope));
}

export function useCountryRisk(scope?: ScopeSelection) {
  return useSWR(scopeKey('country-risk', scope), () => queries.fetchCountryRisk(scope));
}

export function useArcPerformance(scope?: ScopeSelection) {
  return useSWR(scopeKey('arc-performance', scope), () => queries.fetchArcPerformance(scope));
}

export function useNpaCollection(scope?: ScopeSelection) {
  return useSWR(scopeKey('npa-collection', scope), () => queries.fetchNpaCollection(scope));
}
