import fs from 'fs';
import path from 'path';
import * as XLSX from 'xlsx';
import {
  parseTradeFinancePQR,
  parseConsumerFinancePQR,
  parseCorporateFinancePQR,
  identifyFileType,
} from './excel-parser';
import { getPortfolioData, setPortfolioData, isDataLoaded } from './store';
import type { PortfolioData, DatasetInfo, PortfolioType } from './types';

export function loadDataFromDisk(force = false): PortfolioData {
  if (isDataLoaded() && !force) return getPortfolioData();

  const dataDir = path.join(process.cwd(), 'data');
  if (!fs.existsSync(dataDir)) return getPortfolioData();

  const files = fs.readdirSync(dataDir).filter(
    f => (f.endsWith('.xlsx') || f.endsWith('.xls')) && !f.startsWith('._') && !f.startsWith('~$'),
  );

  if (files.length === 0) return getPortfolioData();

  const current = getPortfolioData();
  const merged: PortfolioData = { ...current };
  const fileInfos: DatasetInfo['files'] = [];
  const allEntities = new Set<string>();
  const allCountries = new Set<string>();
  const allPortfolioTypes = new Set<PortfolioType>();

  for (const fname of files) {
    const fpath = path.join(dataDir, fname);
    const buffer = fs.readFileSync(fpath);
    const fileType = identifyFileType(buffer);

    let partial: Partial<PortfolioData> = {};
    let recordCount = 0;

    switch (fileType) {
      case 'trade':
        partial = parseTradeFinancePQR(buffer);
        recordCount = partial.tradeFacilities?.length ?? 0;
        allPortfolioTypes.add('trade_finance');
        partial.tradeFacilities?.forEach(f => {
          allEntities.add(f.entity);
          allCountries.add(f.country);
        });
        break;
      case 'consumer':
        partial = parseConsumerFinancePQR(buffer);
        recordCount = partial.consumerOverall?.length ?? 0;
        allPortfolioTypes.add('consumer_finance');
        break;
      case 'corporate':
        partial = parseCorporateFinancePQR(buffer);
        recordCount = partial.corporateWatchlist?.length ?? 0;
        allPortfolioTypes.add('corporate_finance');
        break;
      default:
        console.warn(`Unknown file type for ${fname}, skipping.`);
        continue;
    }

    // Get sheet names
    const wb = XLSX.read(buffer, { type: 'buffer' });
    fileInfos.push({ name: fname, sheets: wb.SheetNames, recordCount });

    // Merge partial into merged
    for (const [key, value] of Object.entries(partial)) {
      if (value != null && key !== 'datasetInfo') {
        (merged as unknown as Record<string, unknown>)[key] = value;
      }
    }
  }

  merged.datasetInfo = {
    files: fileInfos,
    loadedAt: new Date().toISOString(),
    entities: Array.from(allEntities),
    countries: Array.from(allCountries),
    portfolioTypes: Array.from(allPortfolioTypes),
  };

  setPortfolioData(merged);
  return merged;
}
