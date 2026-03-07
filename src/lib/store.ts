import type { PortfolioData, DatasetInfo } from './types';

const emptyDataset: PortfolioData = {
  tradeFacilities: [],
  entityPerformance: [],
  productMix: [],
  assetQuality: [],
  ratingDistribution: [],
  concentrationNodes: [],
  collectionEfficiency: [],
  watchlistSummary: [],
  watchlistAccounts: [],
  ewsEntitySummary: [],
  ewsFacilityAlerts: [],
  fxRisk: [],
  countryRisk: [],
  tradeExecutiveSummary: null,

  consumerOverall: [],
  consumerProducts: [],
  netFlowRates: [],
  collectionMetrics: [],
  rollRateTimeSeries: [],
  vintagePoints: [],
  nonStarterData: [],
  tddPreDisbursal: [],
  tddPostDisbursal: [],
  approvedBase: [],
  rejectedBase: [],

  losMetrics: [],
  losFunnel: [],
  losDaily: [],

  corporatePortfolio: [],
  covenantTracking: [],
  corporateWatchlist: [],
  corporateDelinquency: [],
  corporateRatingAnalysis: [],

  datasetInfo: {
    files: [],
    loadedAt: '',
    entities: [],
    countries: [],
    portfolioTypes: [],
  },
};

let portfolioData: PortfolioData = { ...emptyDataset };

export function getPortfolioData(): PortfolioData {
  return portfolioData;
}

export function setPortfolioData(data: PortfolioData): void {
  portfolioData = data;
}

export function mergePortfolioData(partial: Partial<PortfolioData>): void {
  portfolioData = { ...portfolioData, ...partial };
}

export function clearPortfolioData(): void {
  portfolioData = { ...emptyDataset };
}

export function isDataLoaded(): boolean {
  return portfolioData.datasetInfo.files.length > 0;
}

export function getDatasetInfo(): DatasetInfo {
  return portfolioData.datasetInfo;
}
