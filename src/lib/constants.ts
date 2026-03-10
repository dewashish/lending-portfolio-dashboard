import type { DPDBucket, IFRSStage, FilterState, PortfolioType, RAGStatus } from './types';

export const DPD_BUCKETS: DPDBucket[] = [
  'Current',
  '1-30',
  '31-60',
  '61-90',
  '91-120',
  '120+',
  'Write-off',
];

export const IFRS_STAGES: IFRSStage[] = ['Stage 1', 'Stage 2', 'Stage 3'];

export const PORTFOLIO_TYPES: { value: PortfolioType; label: string }[] = [
  { value: 'consumer_finance', label: 'Consumer Finance' },
  { value: 'trade_finance', label: 'Trade Finance' },
  { value: 'corporate_finance', label: 'Corporate Finance' },
];

export const BUCKET_COLORS: Record<DPDBucket, string> = {
  Current: '#4caf50',
  '1-30': '#8bc34a',
  '31-60': '#ffeb3b',
  '61-90': '#ff9800',
  '91-120': '#f44336',
  '120+': '#b71c1c',
  'Write-off': '#424242',
};

export const RAG_COLORS: Record<RAGStatus, string> = {
  Green: '#4caf50',
  Amber: '#ff9800',
  Red: '#f44336',
};

export const STAGE_COLORS: Record<IFRSStage, string> = {
  'Stage 1': '#4caf50',
  'Stage 2': '#ff9800',
  'Stage 3': '#f44336',
};

export const TAB_NAMES = [
  'Group Overview',
  'Consumer Finance',
  'Corporate Finance',
  'Trade Finance',
  'Risk & Concentrations',
  'Risk Outlook',
] as const;

export type TabName = (typeof TAB_NAMES)[number];

export const DEFAULT_SCOPE = { level: 'group' as const };

export const DEFAULT_CONSUMER_FILTERS = { period: null, products: [] as string[] };

export const DEFAULT_FILTERS: FilterState = {
  dateRange: { from: null, to: null },
  portfolioTypes: [],
  entities: [],
  countries: [],
  products: [],
  riskGrades: [],
  ifrsStages: [],
  dpdBuckets: [],
  scope: DEFAULT_SCOPE,
};

export const ENTITIES = [
  'Samman Capital',
  'First Woman Bank Limited',
  'Beltone',
  'Mirabank',
  'LuloBank',
] as const;

export const TRADE_PRODUCT_TYPES = [
  'Import LC',
  'Export LC',
  'Bank Guarantee - Performance',
  'Bank Guarantee - Financial',
  'Trade Loan - Pre-Export',
  'Trade Loan - Post-Import',
  'SBLC',
  'Forfaiting',
  'Documentary Collection - D/P',
  'Documentary Collection - D/A',
] as const;
