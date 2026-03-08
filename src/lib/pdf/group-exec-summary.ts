import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { PDF_COLORS, PDF_FONTS, PDF_MARGINS } from '@/components/export/PDFStyles';
import { formatPercent, formatCurrencyMM } from '@/lib/format';
import { fetchConsolidatedScorecard } from '@/lib/queries/overview';
import type { ScopeSelection } from '@/lib/types';

function drawCoverPage(doc: jsPDF) {
  const w = doc.internal.pageSize.getWidth();
  const h = doc.internal.pageSize.getHeight();

  doc.setFillColor(PDF_COLORS.coverGradientStart);
  doc.rect(0, 0, w, h, 'F');
  doc.setFillColor(PDF_COLORS.coverGradientEnd);
  doc.rect(0, h * 0.35, w, h * 0.3, 'F');

  doc.setTextColor(PDF_COLORS.white);
  doc.setFontSize(PDF_FONTS.title);
  doc.setFont('helvetica', 'bold');
  doc.text('Group Overview', w / 2, h * 0.4, { align: 'center' });
  doc.text('Executive Summary', w / 2, h * 0.4 + 14, { align: 'center' });

  doc.setFontSize(PDF_FONTS.subtitle);
  doc.setFont('helvetica', 'normal');
  doc.text('Consolidated Portfolio Review', w / 2, h * 0.4 + 30, { align: 'center' });

  doc.setFontSize(PDF_FONTS.body);
  const dateStr = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  doc.text(`Report Date: ${dateStr}`, w / 2, h * 0.72, { align: 'center' });

  doc.setFontSize(PDF_FONTS.small);
  doc.setTextColor('#b0bec5');
  doc.text('CONFIDENTIAL — For Internal Use Only', w / 2, h * 0.85, { align: 'center' });
}

function drawHeader(doc: jsPDF, title: string) {
  const w = doc.internal.pageSize.getWidth();
  doc.setFillColor(PDF_COLORS.headerBg);
  doc.rect(0, 0, w, 12, 'F');
  doc.setTextColor(PDF_COLORS.white);
  doc.setFontSize(PDF_FONTS.body);
  doc.setFont('helvetica', 'bold');
  doc.text(title, PDF_MARGINS.page.left, 8);

  const dateStr = new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  doc.setFontSize(PDF_FONTS.tiny);
  doc.setFont('helvetica', 'normal');
  doc.text(dateStr, w - PDF_MARGINS.page.right, 8, { align: 'right' });
}

function drawFooter(doc: jsPDF, pageNum: number, totalPages: number) {
  const w = doc.internal.pageSize.getWidth();
  const h = doc.internal.pageSize.getHeight();
  doc.setDrawColor(PDF_COLORS.border);
  doc.line(PDF_MARGINS.page.left, h - 12, w - PDF_MARGINS.page.right, h - 12);
  doc.setTextColor(PDF_COLORS.textLight);
  doc.setFontSize(PDF_FONTS.tiny);
  doc.text('Group Overview PQR — Executive Summary', PDF_MARGINS.page.left, h - 7);
  doc.text(`Page ${pageNum} of ${totalPages}`, w - PDF_MARGINS.page.right, h - 7, { align: 'right' });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ScorecardRow = Record<string, any>;

export async function generateGroupExecSummary(scope?: ScopeSelection): Promise<void> {
  const scorecard = await fetchConsolidatedScorecard(scope);

  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

  // Page 1: Cover
  drawCoverPage(doc);

  // Page 2: Consolidated Scorecard — Consumer & Trade
  doc.addPage('a4', 'landscape');
  drawHeader(doc, 'CONSOLIDATED SCORECARD — CONSUMER & TRADE PORTFOLIOS');

  const rows1 = (scorecard as ScorecardRow[]).map((r) => [
    r.subsidiary ?? r.shortCode ?? '',
    r.country ?? '',
    r.currencyCode ?? '',
    formatCurrencyMM(r.consumerAumUsd),
    formatPercent(r.consumerDelinquency30Plus),
    formatPercent(r.consumerDelinquency90Plus),
    formatCurrencyMM(r.tradeOutstandingUsd),
    formatPercent(r.tradeUtilization),
    formatPercent(r.tradeNplRatio),
  ]);

  autoTable(doc, {
    startY: 18,
    head: [['Subsidiary', 'Country', 'CCY', 'Consumer AUM', '30+ DPD', '90+ DPD', 'Trade Outstanding', 'Utilization', 'NPL Ratio']],
    body: rows1,
    theme: 'grid',
    headStyles: { fillColor: PDF_COLORS.headerBg, textColor: PDF_COLORS.white, fontSize: PDF_FONTS.small, fontStyle: 'bold' },
    bodyStyles: { fontSize: PDF_FONTS.small, textColor: PDF_COLORS.textDark },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 30 },
      3: { halign: 'right' },
      4: { halign: 'right' },
      5: { halign: 'right' },
      6: { halign: 'right' },
      7: { halign: 'right' },
      8: { halign: 'right' },
    },
    margin: { left: PDF_MARGINS.page.left },
  });

  // Page 3: Risk & EWS
  doc.addPage('a4', 'landscape');
  drawHeader(doc, 'CONSOLIDATED SCORECARD — RISK & EARLY WARNING');

  const rows2 = (scorecard as ScorecardRow[]).map((r) => [
    r.subsidiary ?? r.shortCode ?? '',
    String(r.corporateWatchlistCount ?? 0),
    formatCurrencyMM(r.corporateWatchlistExposureUsd),
    typeof r.avgEwsScore === 'number' ? r.avgEwsScore.toFixed(2) : '—',
    formatCurrencyMM(r.ewsFlaggedExposureUsd),
    r.ewsRagStatus ?? '—',
    formatPercent(r.fxYtdDepreciation),
    r.fxRagStatus ?? '—',
    typeof r.countryRiskScore === 'number' ? r.countryRiskScore.toFixed(1) : '—',
    r.countryRiskRagStatus ?? '—',
  ]);

  autoTable(doc, {
    startY: 18,
    head: [['Subsidiary', 'Watchlist #', 'Watchlist Exp.', 'Avg EWS', 'EWS Flagged', 'EWS RAG', 'FX YTD Dep.', 'FX RAG', 'Country Risk', 'Country RAG']],
    body: rows2,
    theme: 'grid',
    headStyles: { fillColor: PDF_COLORS.headerBg, textColor: PDF_COLORS.white, fontSize: PDF_FONTS.small, fontStyle: 'bold' },
    bodyStyles: { fontSize: PDF_FONTS.small, textColor: PDF_COLORS.textDark },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 28 },
      2: { halign: 'right' },
      4: { halign: 'right' },
      6: { halign: 'right' },
    },
    didParseCell(hookData) {
      if (hookData.section === 'body') {
        const col = hookData.column.index;
        if (col === 5 || col === 7 || col === 9) {
          const val = String(hookData.cell.raw).toUpperCase();
          if (val === 'RED' || val.includes('RED')) hookData.cell.styles.textColor = PDF_COLORS.danger;
          else if (val === 'AMBER' || val.includes('AMBER')) hookData.cell.styles.textColor = PDF_COLORS.warning;
          else if (val === 'GREEN' || val.includes('GREEN')) hookData.cell.styles.textColor = PDF_COLORS.success;
          hookData.cell.styles.fontStyle = 'bold';
        }
      }
    },
    margin: { left: PDF_MARGINS.page.left },
  });

  // Footers
  const totalPages = doc.getNumberOfPages();
  for (let i = 2; i <= totalPages; i++) {
    doc.setPage(i);
    drawFooter(doc, i - 1, totalPages - 1);
  }

  doc.save('Group-Overview-Executive-Summary.pdf');
}
