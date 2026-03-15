import useSWR from 'swr';
import * as queries from '@/lib/queries/risk-outlook';
import { scopeKey } from '@/lib/queries/shared';
import type { ScopeSelection } from '@/lib/types';

export function useEclForecast(scope?: ScopeSelection, scenario?: string) {
  const key = `ecl-forecast${scenario ? '-' + scenario : ''}`;
  return useSWR(scopeKey(key, scope), () => queries.fetchEclForecast(scope, scenario));
}

export function useEclWaterfall(scope?: ScopeSelection, scenario?: string) {
  const key = `ecl-waterfall${scenario ? '-' + scenario : ''}`;
  return useSWR(scopeKey(key, scope), () => queries.fetchEclWaterfall(scope, scenario));
}

export function useStressScenarioLosses(scope?: ScopeSelection) {
  return useSWR(scopeKey('stress-scenario-losses', scope), () => queries.fetchStressScenarioLosses(scope));
}

export function useCET1Trajectory(scope?: ScopeSelection) {
  return useSWR(scopeKey('cet1-trajectory', scope), () => queries.fetchCET1Trajectory(scope));
}

export function useEclSensitivity(scope?: ScopeSelection) {
  return useSWR(scopeKey('ecl-sensitivity', scope), () => queries.fetchEclSensitivity(scope));
}

export function usePDMigrationMatrix(scope?: ScopeSelection) {
  return useSWR(scopeKey('pd-migration-matrix', scope), () => queries.fetchPDMigrationMatrix(scope));
}

export function usePDTermStructure(scope?: ScopeSelection) {
  return useSWR(scopeKey('pd-term-structure', scope), () => queries.fetchPDTermStructure(scope));
}

export function useRatingDistribution(scope?: ScopeSelection) {
  return useSWR(scopeKey('rating-distribution', scope), () => queries.fetchRatingDistribution(scope));
}

export function useVintageForecast(scope?: ScopeSelection) {
  return useSWR(scopeKey('vintage-forecast', scope), () => queries.fetchVintageForecast(scope));
}

export function useRollRateForecast(scope?: ScopeSelection) {
  return useSWR(scopeKey('roll-rate-forecast', scope), () => queries.fetchRollRateForecast(scope));
}

export function useLeadingIndicators(scope?: ScopeSelection) {
  return useSWR(scopeKey('leading-indicators', scope), () => queries.fetchLeadingIndicators(scope));
}

export function useMacroCreditLinkage(scope?: ScopeSelection) {
  return useSWR(scopeKey('macro-credit-linkage', scope), () => queries.fetchMacroCreditLinkage(scope));
}

export function useSubsidiaryStressScores(scope?: ScopeSelection) {
  return useSWR(scopeKey('subsidiary-stress-scores', scope), () => queries.fetchSubsidiaryStressScores(scope));
}

export function useManagementActions(scope?: ScopeSelection) {
  return useSWR(scopeKey('management-actions', scope), () => queries.fetchManagementActions(scope));
}

export function useRiskOutlookKPIs(scope?: ScopeSelection) {
  return useSWR(scopeKey('risk-outlook-kpis', scope), () => queries.fetchRiskOutlookKPIs(scope));
}
