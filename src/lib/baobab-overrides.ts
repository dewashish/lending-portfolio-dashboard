import type { Subsidiary, Region } from './types';

// Frontend label override for the Baobab instance.
// Keyed on the stable subsidiary id, this relabels the existing subsidiaries,
// regions and products to the real Baobab Group without any database changes.
// Currencies/FX are intentionally left untouched (USD figures are precomputed).

interface SubsidiaryOverride {
  name: string;
  shortCode: string;
  country: string;
  countryCode: string;
  regionId: number;
  institutionType: string;
}

export const SUBSIDIARY_OVERRIDES: Record<number, SubsidiaryOverride> = {
  1: { name: 'Baobab Sénégal', shortCode: 'SEN', country: 'Senegal', countryCode: 'SN', regionId: 1, institutionType: 'Microfinance' },
  2: { name: "Baobab Côte d'Ivoire", shortCode: 'CIV', country: "Côte d'Ivoire", countryCode: 'CI', regionId: 1, institutionType: 'Microfinance' },
  3: { name: 'Baobab Mali', shortCode: 'MLI', country: 'Mali', countryCode: 'ML', regionId: 1, institutionType: 'Microfinance' },
  4: { name: 'Baobab RDC', shortCode: 'RDC', country: 'DR Congo', countryCode: 'CD', regionId: 2, institutionType: 'Microfinance' },
  5: { name: 'Baobab Banque Madagascar', shortCode: 'MDG', country: 'Madagascar', countryCode: 'MG', regionId: 3, institutionType: 'Microfinance Bank' },
};

export const REGION_OVERRIDES: Region[] = [
  { id: 1, name: 'West Africa', displayOrder: 1 },
  { id: 2, name: 'Central Africa', displayOrder: 2 },
  { id: 3, name: 'East Africa & Indian Ocean', displayOrder: 3 },
];

export function applySubsidiaryOverride(sub: Subsidiary): Subsidiary {
  const o = SUBSIDIARY_OVERRIDES[sub.id];
  if (!o) return sub;
  return {
    ...sub,
    name: o.name,
    shortCode: o.shortCode,
    country: o.country,
    countryCode: o.countryCode,
    regionId: o.regionId,
    institutionType: o.institutionType,
  };
}

// Relabel an embedded scorecard/joined row (which carries subsidiary name,
// short code, country and region NAME) by its subsidiary id. Resolves the
// region name from the overridden region grouping.
export function overrideScorecardRow<
  T extends { subsidiaryId: number; subsidiary: string; shortCode: string; country: string; region: string },
>(row: T): T {
  const o = SUBSIDIARY_OVERRIDES[row.subsidiaryId];
  if (!o) return row;
  const region = REGION_OVERRIDES.find((r) => r.id === o.regionId)?.name ?? row.region;
  return { ...row, subsidiary: o.name, shortCode: o.shortCode, country: o.country, region };
}

// ── Product label mapping (DB name ⇄ Baobab display name) ──────────
// Only Auto Loan / Home Loan / LAP / Personal Loan carry metric data;
// the rest only appear in the product catalog / filter list.
const PRODUCT_TO_BAOBAB: Record<string, string> = {
  'Personal Loan': 'Micro-Loan',
  'Consumer Loan': 'Salary Advance',
  'Credit Card': 'TAKA Nano-Loan',
  'LAP': 'SME / Croissance Loan',
  'Auto Loan': 'Equipment & Asset Finance',
  'Home Loan': 'Home Improvement Loan',
  'Housing Loan': 'Housing Loan',
  'Mortgage': 'Agri-Asset Loan',
  'Leasing': 'Leasing',
};

const PRODUCT_TO_DB: Record<string, string> = Object.fromEntries(
  Object.entries(PRODUCT_TO_BAOBAB).map(([db, baobab]) => [baobab, db]),
);

// DB → Baobab (identity passthrough for unmapped names like aggregates).
export function toBaobabProduct(name: string): string {
  return PRODUCT_TO_BAOBAB[name] ?? name;
}

// Baobab → DB (identity passthrough for unmapped names).
export function toDbProduct(name: string): string {
  return PRODUCT_TO_DB[name] ?? name;
}

export function toDbProducts(names?: string[] | null): string[] {
  return (names ?? []).map(toDbProduct);
}
