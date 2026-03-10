// ── DPD & Risk Enums ──────────────────────────────────────────────
export type DPDBucket =
  | 'Current'
  | '1-30'
  | '31-60'
  | '61-90'
  | '91-120'
  | '120+'
  | 'Write-off';

export type RiskGrade = 'A' | 'B' | 'C' | 'D' | 'E';

export type IFRSStage = 'Stage 1' | 'Stage 2' | 'Stage 3';

export type RAGStatus = 'Green' | 'Amber' | 'Red';

export type PortfolioType =
  | 'consumer_finance'
  | 'trade_finance'
  | 'corporate_finance';

// ── Multi-Geography Scope ─────────────────────────────────────────
export type ScopeLevel = 'group' | 'region' | 'subsidiary';

export interface ScopeSelection {
  level: ScopeLevel;
  regionId?: number;
  subsidiaryId?: number;
}

export interface Region {
  id: number;
  name: string;
  displayOrder: number;
}

export interface Subsidiary {
  id: number;
  name: string;
  shortCode: string;
  country: string;
  countryCode: string;
  regionId: number;
  currencyCode: string;
  institutionType: string;
  isActive: boolean;
}

export interface Currency {
  code: string;
  name: string;
  symbol: string;
}

export interface FXRate {
  fromCurrency: string;
  toCurrency: string;
  rate: number;
  effectiveDate: string;
}

export interface DataSource {
  id: number;
  subsidiaryId: number;
  sourceType: string;
  sourceName: string | null;
  lastSyncAt: string | null;
  status: string;
}

export interface SubsidiaryScorecard {
  subsidiaryId: number;
  subsidiary: string;
  shortCode: string;
  country: string;
  currencyCode: string;
  region: string;
  institutionType: string;
  aumLocal: number | null;
  aumUsd: number | null;
  latestPeriod: string | null;
  delinquency30Plus: number | null;
  delinquency90Plus: number | null;
  netCreditLoss: number | null;
  fpdPct: number | null;
}

// ── Hierarchy ─────────────────────────────────────────────────────
export interface Entity {
  id: string;
  name: string;
  geography: string;
  country: string;
}

export interface ProductType {
  id: string;
  name: string;
  category: PortfolioType;
}

// ── Filter State ──────────────────────────────────────────────────
export interface FilterState {
  dateRange: { from: string | null; to: string | null };
  portfolioTypes: PortfolioType[];
  entities: string[];
  countries: string[];
  products: string[];
  riskGrades: string[];
  ifrsStages: IFRSStage[];
  dpdBuckets: DPDBucket[];
  scope: ScopeSelection;
}

// ── Consumer Filters (contextual) ────────────────────────────────
export interface ConsumerFilters {
  period: string | null;   // null = all periods (show full trend)
  products: string[];      // [] = all products
}

// ── Trade Finance Facility (Raw Data) ─────────────────────────────
export interface TradeFacility {
  facilityReference: string;
  entity: string;
  obligorName: string;
  region: string;
  country: string;
  sector: string;
  commodity: string;
  productType: string;
  currency: string;
  facilityLimit: number;
  outstanding: number;
  prevMonthOutstanding: number;
  tenorDays: number;
  startDate: string;
  maturityDate: string;
  internalRating: number;
  externalRating: string;
  daysPastDue: number;
  ifrs9Stage: IFRSStage;
  provisionRate: number;
  provisionAmount: number;
  collateralValue: number;
  collateralCoverage: number;
  riskWeight: number;
  counterpartyBank: string | null;
  watchlistFlag: boolean;
  ewsScore: number;
  ewsTriggers: string | null;
}

// ── Consumer Finance Metrics ──────────────────────────────────────
export interface ConsumerMetricRow {
  metricType: string;
  metric: string;
  values: Record<string, number | string | null>; // keyed by month e.g. "Apr'25"
  benchmark: number | string | null;
}

export interface ConsumerProductData {
  productName: string;
  metrics: ConsumerMetricRow[];
}

// ── Net Flow Rate ─────────────────────────────────────────────────
export interface NetFlowRow {
  bucket: string;
  values: Record<string, number>; // keyed by date string
}

// ── Collection / Roll Rate ────────────────────────────────────────
export interface CollectionMetricRow {
  portfolio: string;
  bucket: string;
  amount: number;
  transitions: number;
  normalized: number;
  rollBackward: number;
  stabilized: number;
  rollForward: number;
  period: string;
}

export interface RollRateTimeSeries {
  metric: string;
  values: Record<string, number>; // keyed by date
}

// ── Static Pool / Vintage ─────────────────────────────────────────
export interface VintagePoint {
  vintage: string; // e.g. "Jan'22"
  loanAmount: number;
  mob: number;
  delinquencyRate: number;
  metricType: string; // X+, 30+, 60+, 90+, Gross Loss, Recoveries, NCL
}

// ── Roll Rate Flow (Sankey) ───────────────────────────────────────
export interface RollRateFlow {
  from: DPDBucket;
  to: DPDBucket;
  balance: number;
  percentage: number;
}

// ── Heatmap Cell ──────────────────────────────────────────────────
export interface HeatmapCell {
  vintage: string;
  mob: number;
  rate: number;
}

// ── Portfolio Summary KPIs ────────────────────────────────────────
export interface PortfolioSummary {
  totalAUM: number;
  totalFacilities: number;
  newBookings: number;
  momChange: number;
  momChangePercent: number;
  nplRatio: number;
  stage2Plus3Pct: number;
  provisionCoverage: number;
  delinquency30Plus: number;
  delinquency90Plus: number;
  writeOffRate: number;
  collectionEfficiency: number;
  avgEWSScore: number;
  watchlistCount: number;
  watchlistExposure: number;
}

// ── Entity Performance ────────────────────────────────────────────
export interface EntityPerformance {
  entity: string;
  geography: string;
  approvedLimit: number;
  outstanding: number;
  headroom: number;
  utilization: number;
  stage1: number;
  stage2: number;
  stage3: number;
  provisions: number;
  provisionCoverage: number;
  ragStatus: RAGStatus;
}

// ── Product Mix ───────────────────────────────────────────────────
export interface ProductMixRow {
  productType: string;
  facilities: number;
  limit: number;
  outstanding: number;
  portfolioShare: number;
  avgTenor: number;
  utilization: number;
  stage2Plus3: number;
  avgRating: number;
  watchlistCount: number;
}

// ── Asset Quality / IFRS 9 ───────────────────────────────────────
export interface AssetQualityByEntity {
  entity: string;
  stage1Count: number;
  stage1Balance: number;
  stage2Count: number;
  stage2Balance: number;
  stage3Count: number;
  stage3Balance: number;
  stage2Plus3Pct: number;
  provisionCoverage: number;
  rag: RAGStatus;
}

export interface RatingDistribution {
  ratingBand: string;
  count: number;
  balance: number;
  portfolioShare: number;
  avgProvision: number;
}

// ── Concentration ─────────────────────────────────────────────────
export interface ConcentrationNode {
  name: string;
  entity: string;
  category: string; // obligor | sector | country
  value: number;
  portfolioShare: number;
  facilities: number;
  rating: number | string;
}

// ── Collections & Efficiency ──────────────────────────────────────
export interface CollectionEfficiency {
  entity: string;
  collectionEfficiencyRatio: number;
  overdueRatio: number;
  avgDPD: number;
  recoveryRate: number | null;
  rolloverRate: number;
  provisionOutstanding: number;
  rag: RAGStatus;
}

// ── Watchlist ─────────────────────────────────────────────────────
export interface WatchlistSummary {
  entity: string;
  watchlistCount: number;
  watchlistExposure: number;
  entityPortfolioShare: number;
  ewsScore2PlusCount: number;
  ewsScore2PlusExposure: number;
  stage2Plus3Count: number;
  rag: RAGStatus;
}

export interface WatchlistAccount {
  facilityRef: string;
  entity: string;
  obligorName: string;
  productType: string;
  outstanding: number;
  dpd: number;
  stage: IFRSStage;
  rating: number;
  ewsScore: number;
  triggers: string;
  action: string;
}

// ── EWS Dashboard ─────────────────────────────────────────────────
export interface EWSEntitySummary {
  entity: string;
  score0: number;
  score1: number;
  score2: number;
  score3: number;
  score4Plus: number;
  totalFacilities: number;
  avgEWSScore: number;
  flaggedExposure: number;
  rag: RAGStatus;
}

export interface EWSSignal {
  dimension: string;
  score: number;
  threshold: number;
  status: RAGStatus;
}

export interface EWSFacilityAlert {
  facilityRef: string;
  entity: string;
  obligor: string;
  ewsScore: number;
  outstanding: number;
  triggers: string;
  stage: IFRSStage;
  action: string;
}

// ── Macro & External Risk ─────────────────────────────────────────
export interface FXRiskRow {
  entity: string;
  primaryCurrency: string;
  fxRate: number;
  volatility30Day: number;
  volatility90Day: number;
  ytdDepreciation: number;
  portfolioExposure: number;
  fxImpact: number;
  capitalControls: boolean;
  transferRisk: string;
  rag: RAGStatus;
}

export interface CountryRiskRow {
  entity: string;
  sovereignRating: number;
  countryRiskScore: number;
  regulatoryScore: number;
  politicalStabilityScore: number;
  compositeScore: number;
  exposure: number;
  rwaShare: number;
  capitalImpact: number;
  recommendation: string;
  rag: RAGStatus;
}

// ── Corporate Finance ─────────────────────────────────────────────
export interface CorporatePortfolioRow {
  particular: string;
  months: Record<string, { total: number | string; fundBased: number | string; nonFB: number | string }>;
}

export interface CovenantTrackingRow {
  groupId: string;
  custId: string;
  customerName: string;
  dateOfDisbursal: string;
  sanctionedLimit: number;
  disbursedAmount: number;
  currentPOS: number;
  facilityType: string;
  securityType: string;
  securityCover: number;
  riskRating: string;
  covenantCategory: string;
  covenantType: string;
  covenantDescription: string;
  covenantFrequency: string;
  submissionDate: string;
  approvalForExtension: string;
  npaFlag: boolean;
  restructuredFlag: boolean;
  watchlistFlag: boolean;
  writeoffFlag: boolean;
}

export interface CorporateWatchlistRow {
  borrower: string;
  sector: string;
  exposure: string;
  exposureNum: number;
  ewsTriggerType: string;
  triggerCategory: string;
  internalRating: string;
  priorRating: string;
  status: string;
  remedialAction: string;
  dateAdded: string;
  daysOnWatchlist: number;
}

export interface CorporateDelinquencyRow {
  groupId: string;
  custId: string;
  customerName: string;
  sector: string;
  industry: string;
  sanctionedLimit: number;
  disbursedAmount: number;
  currentPOS: number;
  facilityType: string;
  securityType: string;
  securityCover: number;
  ratingAtDisbursement: string;
  currentRating: string;
  renewalDone: boolean;
  dpdAtMonthEnd: number;
  currentDPD: number;
  reasonForDelinquency: string;
  lastRemedialAction: string;
  updateOnRemedial: string;
  currentStatus: string;
  nextStep: string;
}

// ── Trade Stage Migration ────────────────────────────────────────
export interface TradeStageMigrationRow {
  period: string;
  priorStage: IFRSStage;
  currentStage: IFRSStage;
  facilityCount: number;
  balance: number;
}

// ── Trade DPD Roll Rate ──────────────────────────────────────────
export interface TradeDPDRollRateRow {
  period: string;
  fromBucket: string;
  toBucket: string;
  facilityCount: number;
  balance: number;
  transitionPct: number;
}

// ── Trade DPD Aging ──────────────────────────────────────────────
export interface TradeDPDAgingRow {
  subsidiaryName: string;
  dpdBucket: string;
  facilityCount: number;
  balance: number;
}

// ── Corporate Top Customers ──────────────────────────────────────
export interface CorporateTopCustomerRow {
  customerName: string;
  sector: string;
  sanctionedLimit: number;
  disbursedAmount: number;
  currentPOS: number;
  facilityType: string;
  riskRating: string;
  dpd: number;
  ifrsStage: string;
  rankByDisbursement: number;
  rankByPOS: number;
  pceAmount: number;
  irr: number | null;
  securityType: string;
  securityCover: number;
  industry: string;
}

// ── Corporate Industry Concentration ─────────────────────────────
export interface CorporateIndustryConcentrationRow {
  sector: string;
  period: string;
  disbursement: number;
  pos: number;
  portfolioShare: number;
  irr: number | null;
  facilityCount: number;
}

// ── Corporate Collateral Analysis ────────────────────────────────
export interface CorporateCollateralRow {
  collateralType: string;
  facilityCount: number;
  collateralValue: number;
  exposureCovered: number;
  coverageRatio: number;
  sanctionedAmount: number;
  disbursedAmount: number;
  principalOS: number;
  principalShare: number;
  particulars: string;
}

// ── Corporate LTV Distribution ───────────────────────────────────
export interface CorporateLTVRow {
  ltvBand: string;
  facilityCount: number;
  balance: number;
  portfolioShare: number;
}

// ── Corporate Maturity Profile ───────────────────────────────────
export interface CorporateMaturityRow {
  maturityBand: string;
  facilityBasis: string;
  facilityCount: number;
  balance: number;
  portfolioShare: number;
  sanctionedAmount: number;
  disbursedAmount: number;
}

// ── Corporate PD Distribution ───────────────────────────────────
export interface CorporatePDDistributionRow {
  pdBand: string;
  sanctionedAmount: number;
  disbursedAmount: number;
  principalOS: number;
  principalShare: number;
}

// ── Corporate Pipeline ──────────────────────────────────────────
export interface CorporatePipelineRow {
  stage: string;
  grossAmount: number;
  productBid: number;
  pcrPct: number;
}

// ── Corporate Provisioning & ECL ─────────────────────────────────
export interface CorporateProvisioningRow {
  period: string;
  ifrsStage: string;
  grossExposure: number;
  provisionAmount: number;
  pcrPct: number;
}

// ── Corporate Rating Analysis ────────────────────────────────────
export interface CorporateRatingAnalysisRow {
  period: string;
  ratingBand: string;
  disbursement: number;
  pos: number;
  facilityCount: number;
  portfolioShare: number;
}

// ── Corporate Rating Migration ───────────────────────────────────
export interface CorporateRatingMigrationRow {
  customerName: string;
  sector: string;
  priorRating: string;
  currentRating: string;
  migrationDirection: string;
  triggerReason: string;
  exposure: number;
  migrationDate: string;
}

// ── Corporate Executive Summary ──────────────────────────────────
export interface CorporatePortfolioSummary {
  totalPOS: number;
  totalDisbursement: number;
  totalSanctioned: number;
  delinquencyRate: number;
  npaRate: number;
  avgSecurityCover: number;
  covenantBreachRate: number;
  provisionCoverageRatio: number;
  watchlistCount: number;
  delinquentCount: number;
}

// ── Non-Starter Analysis ──────────────────────────────────────────
export interface NonStarterRow {
  category: string;
  product: string;
  metric: string; // 'Facility in Force (#)' | 'Facility in Force ($)'
  monthlyValues: Record<string, number>;
  yearlyAverages: Record<string, number>;
  quarterlyValues: Record<string, number>;
}

// ── Risk Appetite Settings ────────────────────────────────────────
export type MetricDirection = 'lower_is_better' | 'higher_is_better';
export type RiskAppetiteScopeLevel = 'global' | 'region' | 'subsidiary' | 'business_line' | 'product';

export interface RiskAppetiteRow {
  id: number;
  metric_key: string;
  scope_level: RiskAppetiteScopeLevel;
  region_id: number | null;
  subsidiary_id: number | null;
  business_line: string | null;
  product_name: string | null;
  appetite: number;
  tolerance: number;
  updated_at: string;
}

export interface ResolvedThreshold {
  appetite: number;
  tolerance: number;
  scopeLevel: RiskAppetiteScopeLevel;
  isInherited: boolean;
}

export interface MetricDefinition {
  key: string;
  label: string;
  direction: MetricDirection;
  defaultAppetite: number;
  defaultTolerance: number;
  businessLine: 'consumer_finance' | 'trade_finance' | 'corporate_finance';
  category: string;
}

export interface ThresholdContext {
  subsidiaryId?: number;
  regionId?: number;
  businessLine?: string;
  product?: string;
}

// ── TDD Metrics ───────────────────────────────────────────────────
export interface TDDPreDisbursal {
  metric: string;
  values: Record<string, number | string>;
}

export interface TDDPostDisbursal {
  variant: string; // Fresh | Renewal | Topup
  bureauBucket: string;
  values: Record<string, number>;
}

// ── Business Support / Risk Analytics ─────────────────────────────
export interface ApprovedBaseRow {
  laBand: string;
  loanBands: Record<string, number>;
  total: number;
}

export interface RejectedBaseRow {
  loanType: string;
  amountBands: Record<string, number>;
  total: number;
}

// ── LOS Data — MTD / LMTD / FTD ─────────────────────────────────
export interface LOSComparisonMetric {
  metric: string;
  product: string;
  ftd: number;
  mtd: number;
  lmtd: number;
  lmFull: number;
  momChange: number;
  target: number | null;
  achievement: number | null;
}

export interface LOSFunnelStep {
  stage: string;
  product: string;
  ftd: number;
  mtd: number;
  lmtd: number;
  conversionRate: number;
}

export interface LOSDisbursementDaily {
  date: string;
  product: string;
  count: number;
  amount: number;
  avgTicketSize: number;
}

// ── Risk Outlook ─────────────────────────────────────────────────

export interface EclForecastRow {
  id: number;
  subsidiaryId: number;
  stage: string;
  scenario: string;
  quarter: string;
  eclAmount: number;
  eclAmountUsd: number;
  coverageRatio: number | null;
}

export interface EclWaterfallRow {
  id: number;
  subsidiaryId: number;
  scenario: string;
  driver: string;
  amount: number;
  amountUsd: number;
  sortOrder: number;
}

export interface StressScenarioLossRow {
  id: number;
  subsidiaryId: number;
  segment: string;
  scenario: string;
  lossRate: number;
  lossAmount: number;
  lossAmountUsd: number;
}

export interface CET1TrajectoryRow {
  id: number;
  subsidiaryId: number;
  scenario: string;
  quarter: string;
  cet1Ratio: number;
  rwaAmount: number;
  capitalAmount: number;
}

export interface EclSensitivityRow {
  id: number;
  subsidiaryId: number;
  factor: string;
  direction: string;
  eclImpactPct: number;
  eclImpactAmount: number;
}

export interface PDMigrationCell {
  id: number;
  subsidiaryId: number;
  fromGrade: string;
  toGrade: string;
  probability: number;
  longRunAvg: number;
}

export interface PDTermStructureRow {
  id: number;
  subsidiaryId: number;
  ratingGrade: string;
  horizonYears: number;
  cumulativePd: number;
}

export interface RatingDistributionRow {
  id: number;
  subsidiaryId: number;
  ratingGrade: string;
  currentShare: number;
  projectedShare: number;
  projectionQuarter: string;
}

export interface VintageForecastRow {
  id: number;
  subsidiaryId: number;
  vintage: string;
  mob: number;
  actualDelinqRate: number | null;
  projectedDelinqRate: number | null;
  isProjected: boolean;
}

export interface RollRateForecastRow {
  id: number;
  subsidiaryId: number;
  fromBucket: string;
  toBucket: string;
  forecastMonth: number;
  transitionRate: number;
}

export interface LeadingIndicatorRow {
  id: number;
  subsidiaryId: number;
  indicatorName: string;
  currentValue: number;
  zScore: number;
  trend: string;
  ragStatus: string;
  category: string;
}

export interface MacroCreditLinkageRow {
  id: number;
  subsidiaryId: number;
  macroVariable: string;
  creditMetric: string;
  period: string;
  macroValue: number;
  creditValue: number;
  leadMonths: number;
}

export interface RiskOutlookKPIs {
  totalEcl: number;
  provisionCoverage: number;
  cet1UnderStress: number;
  avgPd1Y: number;
  ewsAlerts: number;
}

