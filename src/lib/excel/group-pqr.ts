import ExcelJS from 'exceljs';
import type { ScopeSelection } from '@/lib/types';
import { fetchConsolidatedScorecard } from '@/lib/queries/overview';
import { addDataSheet, getTabColor, downloadWorkbook, getFilename, EXCEL } from './utils';

export async function generateGroupPQR(scope?: ScopeSelection): Promise<void> {
  const scorecard = await fetchConsolidatedScorecard(scope);

  const wb = new ExcelJS.Workbook();
  wb.creator = 'Baobab Portfolio Monitor';
  wb.created = new Date();
  const tabColor = getTabColor(0);

  addDataSheet(wb, 'Consolidated Scorecard', [
    { header: 'Subsidiary', key: 'subsidiary', width: 22 },
    { header: 'Code', key: 'shortCode', width: 8 },
    { header: 'Country', key: 'country', width: 14 },
    { header: 'Currency', key: 'currencyCode', width: 10 },
    { header: 'Region', key: 'region', width: 14 },
    { header: 'Type', key: 'institutionType', width: 14 },
    { header: 'Consumer AUM (USD)', key: 'consumerAumUsd', width: 20, style: { numFmt: EXCEL.currency } },
    { header: 'Consumer Latest Period', key: 'consumerLatestPeriod', width: 20 },
    { header: 'Consumer 30+ DPD%', key: 'consumerDelinquency30Plus', width: 18, style: { numFmt: EXCEL.percent } },
    { header: 'Consumer 90+ DPD%', key: 'consumerDelinquency90Plus', width: 18, style: { numFmt: EXCEL.percent } },
    { header: 'Trade Outstanding (USD)', key: 'tradeOutstandingUsd', width: 22, style: { numFmt: EXCEL.currency } },
    { header: 'Trade Utilization', key: 'tradeUtilization', width: 16, style: { numFmt: EXCEL.percent } },
    { header: 'Trade NPL Ratio', key: 'tradeNplRatio', width: 16, style: { numFmt: EXCEL.percent } },
    { header: 'Corp Watchlist Count', key: 'corporateWatchlistCount', width: 18 },
    { header: 'Corp Watchlist (USD)', key: 'corporateWatchlistExposureUsd', width: 20, style: { numFmt: EXCEL.currency } },
    { header: 'Avg EWS Score', key: 'avgEwsScore', width: 14 },
    { header: 'EWS Flagged (USD)', key: 'ewsFlaggedExposureUsd', width: 18, style: { numFmt: EXCEL.currency } },
    { header: 'EWS RAG', key: 'ewsRagStatus', width: 10 },
    { header: 'FX YTD Deprec.', key: 'fxYtdDepreciation', width: 16, style: { numFmt: EXCEL.percent } },
    { header: 'FX RAG', key: 'fxRagStatus', width: 10 },
    { header: 'Country Risk Score', key: 'countryRiskScore', width: 16 },
    { header: 'Country Risk RAG', key: 'countryRiskRagStatus', width: 14 },
  ], scorecard, tabColor);

  await downloadWorkbook(wb, getFilename(0));
}
