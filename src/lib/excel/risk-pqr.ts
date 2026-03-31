import ExcelJS from 'exceljs';
import type { ScopeSelection } from '@/lib/types';
import * as risk from '@/lib/queries/risk';
import { addDataSheet, getTabColor, downloadWorkbook, getFilename, EXCEL } from './utils';

export async function generateRiskPQR(scope?: ScopeSelection): Promise<void> {
  const [ewsSummary, ewsAlerts, fxRisk, countryRisk] = await Promise.all([
    risk.fetchEWSEntitySummary(scope),
    risk.fetchEWSFacilityAlerts(scope),
    risk.fetchFXRisk(scope),
    risk.fetchCountryRisk(scope),
  ]);

  const wb = new ExcelJS.Workbook();
  wb.creator = 'Avalora Portfolio Monitor';
  wb.created = new Date();
  const tabColor = getTabColor(4);

  addDataSheet(wb, 'EWS Summary', [
    { header: 'Entity', key: 'entity', width: 22 },
    { header: 'Score 0', key: 'score0', width: 10 },
    { header: 'Score 1', key: 'score1', width: 10 },
    { header: 'Score 2', key: 'score2', width: 10 },
    { header: 'Score 3', key: 'score3', width: 10 },
    { header: 'Score 4+', key: 'score4Plus', width: 10 },
    { header: 'Total Facilities', key: 'totalFacilities', width: 14 },
    { header: 'Avg EWS Score', key: 'avgEWSScore', width: 14 },
    { header: 'Flagged Exposure', key: 'flaggedExposure', width: 18, style: { numFmt: EXCEL.currency } },
    { header: 'RAG', key: 'rag', width: 10 },
  ], ewsSummary, tabColor);

  addDataSheet(wb, 'EWS Alerts', [
    { header: 'Facility Ref', key: 'facilityRef', width: 16 },
    { header: 'Entity', key: 'entity', width: 18 },
    { header: 'Obligor', key: 'obligor', width: 22 },
    { header: 'EWS Score', key: 'ewsScore', width: 10 },
    { header: 'Outstanding', key: 'outstanding', width: 16, style: { numFmt: EXCEL.currency } },
    { header: 'Triggers', key: 'triggers', width: 24 },
    { header: 'Stage', key: 'stage', width: 10 },
    { header: 'Action', key: 'action', width: 20 },
  ], ewsAlerts, tabColor);

  addDataSheet(wb, 'FX Risk', [
    { header: 'Entity', key: 'entity', width: 22 },
    { header: 'Currency', key: 'primaryCurrency', width: 10 },
    { header: 'FX Rate', key: 'fxRate', width: 10 },
    { header: '30D Volatility', key: 'volatility30Day', width: 14, style: { numFmt: EXCEL.percent } },
    { header: '90D Volatility', key: 'volatility90Day', width: 14, style: { numFmt: EXCEL.percent } },
    { header: 'YTD Deprec.', key: 'ytdDepreciation', width: 14, style: { numFmt: EXCEL.percent } },
    { header: 'Portfolio Exposure', key: 'portfolioExposure', width: 18, style: { numFmt: EXCEL.currency } },
    { header: 'FX Impact', key: 'fxImpact', width: 14, style: { numFmt: EXCEL.currency } },
    { header: 'Capital Controls', key: 'capitalControls', width: 14 },
    { header: 'Transfer Risk', key: 'transferRisk', width: 14 },
    { header: 'RAG', key: 'rag', width: 10 },
  ], fxRisk, tabColor);

  addDataSheet(wb, 'Country Risk', [
    { header: 'Entity', key: 'entity', width: 22 },
    { header: 'Sovereign Rating', key: 'sovereignRating', width: 14 },
    { header: 'Country Risk Score', key: 'countryRiskScore', width: 16 },
    { header: 'Regulatory Score', key: 'regulatoryScore', width: 14 },
    { header: 'Political Stability', key: 'politicalStabilityScore', width: 16 },
    { header: 'Composite Score', key: 'compositeScore', width: 14 },
    { header: 'Exposure', key: 'exposure', width: 16, style: { numFmt: EXCEL.currency } },
    { header: 'RWA Share', key: 'rwaShare', width: 12, style: { numFmt: EXCEL.percent } },
    { header: 'Capital Impact', key: 'capitalImpact', width: 14, style: { numFmt: EXCEL.currency } },
    { header: 'Recommendation', key: 'recommendation', width: 20 },
    { header: 'RAG', key: 'rag', width: 10 },
  ], countryRisk, tabColor);

  await downloadWorkbook(wb, getFilename(4));
}
