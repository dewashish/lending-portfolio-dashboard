import type { Workbook, Worksheet, Column } from 'exceljs';

// ── Color & Format Constants ─────────────────────────────────────
export const EXCEL = {
  headerBg: '004D40',
  headerFont: 'FFFFFF',
  consumerTab: '4CAF50',
  tradeTab: '1565C0',
  corporateTab: 'EF6C00',
  groupTab: '37474F',
  riskTab: 'C62828',
  currency: '#,##0.00',
  percent: '0.00%',
  number: '#,##0',
  date: 'MMM DD, YYYY',
} as const;

export function getTabColor(tabIndex: number): string {
  return [EXCEL.groupTab, EXCEL.consumerTab, EXCEL.tradeTab, EXCEL.corporateTab, EXCEL.riskTab][tabIndex] ?? EXCEL.headerBg;
}

export function getFilename(tabIndex: number): string {
  const d = new Date().toISOString().slice(0, 10);
  const names = ['Group-Overview', 'Consumer-Finance', 'Trade-Finance', 'Corporate-Finance', 'Risk-Assessment'];
  return `${names[tabIndex] ?? 'Portfolio'}-PQR-${d}.xlsx`;
}

// ── Style header row ─────────────────────────────────────────────
export function styleHeaderRow(sheet: Worksheet): void {
  const row = sheet.getRow(1);
  row.eachCell((cell) => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: EXCEL.headerBg } };
    cell.font = { bold: true, color: { argb: EXCEL.headerFont }, size: 11 };
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    cell.border = { bottom: { style: 'thin', color: { argb: '000000' } } };
  });
  row.height = 24;
}

// ── Create a styled data sheet ───────────────────────────────────
export function addDataSheet(
  wb: Workbook,
  name: string,
  columns: Partial<Column>[],
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  rows: Record<string, any>[],
  tabColor: string,
): Worksheet {
  const sheet = wb.addWorksheet(name, { properties: { tabColor: { argb: tabColor } } });
  sheet.columns = columns;
  for (const r of rows) sheet.addRow(r);
  styleHeaderRow(sheet);
  sheet.views = [{ state: 'frozen', ySplit: 1 }];
  if (rows.length > 0) {
    sheet.autoFilter = { from: { row: 1, column: 1 }, to: { row: rows.length + 1, column: columns.length } };
  }
  return sheet;
}

// ── Pivot time-series data (metric × periods → flat rows) ───────
export function pivotTimeSeries(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: { values: Record<string, any>; [key: string]: any }[],
  labelKey: string,
): { columns: Partial<Column>[]; rows: Record<string, unknown>[] } {
  if (!data.length) return { columns: [], rows: [] };
  const periods = Array.from(new Set(data.flatMap((d) => Object.keys(d.values)))).sort();
  const columns: Partial<Column>[] = [
    { header: labelKey.charAt(0).toUpperCase() + labelKey.slice(1), key: 'label', width: 30 },
    ...periods.map((p) => ({ header: p, key: p, width: 14 })),
  ];
  const rows = data.map((d) => {
    const row: Record<string, unknown> = { label: d[labelKey] ?? '' };
    for (const p of periods) row[p] = d.values[p] ?? null;
    return row;
  });
  return { columns, rows };
}

// ── Trigger browser download ─────────────────────────────────────
export async function downloadWorkbook(wb: Workbook, filename: string): Promise<void> {
  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
