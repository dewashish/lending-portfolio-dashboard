import useSWR from 'swr';
import * as queries from '@/lib/queries/corporate';
import { scopeKey } from '@/lib/queries/shared';
import type { ScopeSelection } from '@/lib/types';

export function useCorporateWatchlist(scope?: ScopeSelection) {
  return useSWR(scopeKey('corporate-watchlist', scope), () => queries.fetchCorporateWatchlist(scope));
}

export function useCorporateCovenants(scope?: ScopeSelection) {
  return useSWR(scopeKey('corporate-covenants', scope), () => queries.fetchCorporateCovenants(scope));
}

export function useCorporateDelinquency(scope?: ScopeSelection) {
  return useSWR(scopeKey('corporate-delinquency', scope), () => queries.fetchCorporateDelinquency(scope));
}

export function useCorporatePortfolioMetrics(scope?: ScopeSelection) {
  return useSWR(scopeKey('corporate-portfolio', scope), () => queries.fetchCorporatePortfolioMetrics(scope));
}

export function useCorporateTopCustomers(scope?: ScopeSelection) {
  return useSWR(scopeKey('corporate-top-customers', scope), () => queries.fetchCorporateTopCustomers(scope));
}

export function useCorporateIndustryConcentration(scope?: ScopeSelection) {
  return useSWR(scopeKey('corporate-industry-conc', scope), () => queries.fetchCorporateIndustryConcentration(scope));
}

export function useCorporateCollateralAnalysis(scope?: ScopeSelection) {
  return useSWR(scopeKey('corporate-collateral', scope), () => queries.fetchCorporateCollateralAnalysis(scope));
}

export function useCorporateLTVDistribution(scope?: ScopeSelection) {
  return useSWR(scopeKey('corporate-ltv', scope), () => queries.fetchCorporateLTVDistribution(scope));
}

export function useCorporateMaturityProfile(scope?: ScopeSelection) {
  return useSWR(scopeKey('corporate-maturity', scope), () => queries.fetchCorporateMaturityProfile(scope));
}

export function useCorporateProvisioningECL(scope?: ScopeSelection) {
  return useSWR(scopeKey('corporate-provisioning', scope), () => queries.fetchCorporateProvisioningECL(scope));
}

export function useCorporateRatingAnalysis(scope?: ScopeSelection) {
  return useSWR(scopeKey('corporate-rating-analysis', scope), () => queries.fetchCorporateRatingAnalysis(scope));
}

export function useCorporateRatingMigration(scope?: ScopeSelection) {
  return useSWR(scopeKey('corporate-rating-migration', scope), () => queries.fetchCorporateRatingMigration(scope));
}

export function useCorporateExecutiveSummary(scope?: ScopeSelection) {
  return useSWR(scopeKey('corporate-exec-summary', scope), () => queries.fetchCorporateExecutiveSummary(scope));
}

export function useCorporateTopDisbursements(scope?: ScopeSelection) {
  return useSWR(
    scopeKey('corporate-top-disbursements', scope),
    () => queries.fetchCorporateTopDisbursements(scope),
  );
}

export function useCorporatePDDistribution(scope?: ScopeSelection) {
  return useSWR(
    scopeKey('corporate-pd-distribution', scope),
    () => queries.fetchCorporatePDDistribution(scope),
  );
}

export function useCorporatePipeline(scope?: ScopeSelection) {
  return useSWR(
    scopeKey('corporate-pipeline', scope),
    () => queries.fetchCorporatePipeline(scope),
  );
}
