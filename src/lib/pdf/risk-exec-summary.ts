import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { PDF_COLORS, PDF_FONTS, PDF_MARGINS } from '@/components/export/PDFStyles';
import { formatPercent, formatCurrencyMM } from '@/lib/format';
import * as risk from '@/lib/queries/risk';
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
  doc.text('Risk & Concentrations', w / 2, h * 0.4, { align: 'center' });
  doc.text('Executive Summary', w / 2, h * 0.4 + 14, { align: 'center' });

  doc.setFontSize(PDF_FONTS.subtitle);
  doc.setFont('helvetica', 'normal');
  doc.text('Early Warning System, FX & Country Risk', w / 2, h * 0.4 + 30, { align: 'center' });

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
  doc.text('Risk & Concentrations PQR — Executive Summary', PDF_MARGINS.page.left, h - 7);
  doc.text(`Page ${pageNum} of ${totalPages}`, w - PDF_MARGINS.page.right, h - 7, { align: 'right' });
}

export async function generateRiskExecSummary(scope?: ScopeSelection): Promise<void> {
  const [ewsSummary, ewsAlerts, fxRisk, countryRisk] = await Promise.all([
    risk.fetchEWSEntitySummary(scope),
    risk.fetchEWSFacilityAlerts(scope),
    risk.fetchFXRisk(scope),
    risk.fetchCountryRisk(scope),
  ]);

  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

  // Page 1: Cover
  drawCoverPage(doc);

  // Page 2: EWS Summary
  doc.addPage('a4', 'landscape');
  drawHeader(doc, 'EARLY WARNING SYSTEM — ENTITY SUMMARY');

  const ewsRows = ewsSummary.map((e) => [
    e.entity,
    String(e.score0),
    String(e.score1),
    String(e.score2),
    String(e.score3),
    String(e.score4Plus),
    String(e.totalFacilities),
    e.avgEWSScore.toFixed(2),
    formatCurrencyMM(e.flaggedExposure),
    e.rag,
  ]);

  autoTable(doc, {
    startY: 18,
    head: [['Entity', 'Score 0', 'Score 1', 'Score 2', 'Score 3', 'Score 4+', 'Total', 'Avg EWS', 'Flagged Exp.', 'RAG']],
    body: ewsRows,
    theme: 'grid',
    headStyles: { fillColor: PDF_COLORS.headerBg, textColor: PDF_COLORS.white, fontSize: PDF_FONTS.small, fontStyle: 'bold' },
    bodyStyles: { fontSize: PDF_FONTS.small, textColor: PDF_COLORS.textDark },
    columnStyles: { 0: { fontStyle: 'bold', cellWidth: 28 }, 8: { halign: 'right' } },
    didParseCell(hookData) {
      if (hookData.section === 'body' && hookData.column.index === 9) {
        const val = String(hookData.cell.raw).toUpperCase();
        if (val.includes('RED')) hookData.cell.styles.textColor = PDF_COLORS.danger;
        else if (val.includes('AMBER')) hookData.cell.styles.textColor = PDF_COLORS.warning;
        else if (val.includes('GREEN')) hookData.cell.styles.textColor = PDF_COLORS.success;
        hookData.cell.styles.fontStyle = 'bold';
      }
    },
    margin: { left: PDF_MARGINS.page.left },
  });

  // Top EWS Alerts below
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ewsFinalY = ((doc as any).lastAutoTable?.finalY ?? 80) + 8;
  doc.setFontSize(PDF_FONTS.sectionTitle);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(PDF_COLORS.textDark);
  doc.text('Top Facility Alerts (by EWS Score)', PDF_MARGINS.page.left, ewsFinalY);

  const alertRows = ewsAlerts.slice(0, 10).map((a) => [
    a.facilityRef,
    a.entity,
    a.obligor,
    String(a.ewsScore),
    formatCurrencyMM(a.outstanding),
    a.triggers,
    a.action,
  ]);

  autoTable(doc, {
    startY: ewsFinalY + 4,
    head: [['Facility', 'Entity', 'Obligor', 'EWS', 'Outstanding', 'Triggers', 'Action']],
    body: alertRows,
    theme: 'grid',
    headStyles: { fillColor: PDF_COLORS.primary, textColor: PDF_COLORS.white, fontSize: PDF_FONTS.small, fontStyle: 'bold' },
    bodyStyles: { fontSize: PDF_FONTS.small, textColor: PDF_COLORS.textDark },
    columnStyles: { 0: { cellWidth: 22 }, 2: { cellWidth: 30 }, 4: { halign: 'right' } },
    margin: { left: PDF_MARGINS.page.left },
  });

  // Page 3: FX & Country Risk
  doc.addPage('a4', 'landscape');
  drawHeader(doc, 'FX RISK & COUNTRY RISK');

  doc.setFontSize(PDF_FONTS.sectionTitle);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(PDF_COLORS.textDark);
  doc.text('FX Risk by Entity', PDF_MARGINS.page.left, 18);

  const fxRows = fxRisk.map((f) => [
    f.entity,
    f.primaryCurrency,
    f.fxRate.toFixed(4),
    formatPercent(f.volatility30Day),
    formatPercent(f.volatility90Day),
    formatPercent(f.ytdDepreciation),
    formatCurrencyMM(f.portfolioExposure),
    formatCurrencyMM(f.fxImpact),
    f.rag,
  ]);

  autoTable(doc, {
    startY: 22,
    head: [['Entity', 'CCY', 'FX Rate', '30D Vol', '90D Vol', 'YTD Dep.', 'Exposure', 'FX Impact', 'RAG']],
    body: fxRows,
    theme: 'grid',
    headStyles: { fillColor: PDF_COLORS.headerBg, textColor: PDF_COLORS.white, fontSize: PDF_FONTS.small, fontStyle: 'bold' },
    bodyStyles: { fontSize: PDF_FONTS.small, textColor: PDF_COLORS.textDark },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 28 },
      6: { halign: 'right' },
      7: { halign: 'right' },
    },
    didParseCell(hookData) {
      if (hookData.section === 'body' && hookData.column.index === 8) {
        const val = String(hookData.cell.raw).toUpperCase();
        if (val.includes('RED')) hookData.cell.styles.textColor = PDF_COLORS.danger;
        else if (val.includes('AMBER')) hookData.cell.styles.textColor = PDF_COLORS.warning;
        else if (val.includes('GREEN')) hookData.cell.styles.textColor = PDF_COLORS.success;
        hookData.cell.styles.fontStyle = 'bold';
      }
    },
    margin: { left: PDF_MARGINS.page.left },
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const fxFinalY = ((doc as any).lastAutoTable?.finalY ?? 80) + 8;
  doc.setFontSize(PDF_FONTS.sectionTitle);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(PDF_COLORS.textDark);
  doc.text('Country Risk by Entity', PDF_MARGINS.page.left, fxFinalY);

  const crRows = countryRisk.map((c) => [
    c.entity,
    c.sovereignRating,
    c.countryRiskScore.toFixed(1),
    c.regulatoryScore.toFixed(1),
    c.compositeScore.toFixed(1),
    formatCurrencyMM(c.exposure),
    formatPercent(c.rwaShare),
    c.recommendation,
    c.rag,
  ]);

  autoTable(doc, {
    startY: fxFinalY + 4,
    head: [['Entity', 'Sovereign', 'Country Score', 'Regulatory', 'Composite', 'Exposure', 'RWA Share', 'Recommendation', 'RAG']],
    body: crRows,
    theme: 'grid',
    headStyles: { fillColor: PDF_COLORS.primary, textColor: PDF_COLORS.white, fontSize: PDF_FONTS.small, fontStyle: 'bold' },
    bodyStyles: { fontSize: PDF_FONTS.small, textColor: PDF_COLORS.textDark },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 28 },
      5: { halign: 'right' },
      6: { halign: 'right' },
    },
    didParseCell(hookData) {
      if (hookData.section === 'body' && hookData.column.index === 8) {
        const val = String(hookData.cell.raw).toUpperCase();
        if (val.includes('RED')) hookData.cell.styles.textColor = PDF_COLORS.danger;
        else if (val.includes('AMBER')) hookData.cell.styles.textColor = PDF_COLORS.warning;
        else if (val.includes('GREEN')) hookData.cell.styles.textColor = PDF_COLORS.success;
        hookData.cell.styles.fontStyle = 'bold';
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

  doc.save('Risk-Concentrations-Executive-Summary.pdf');
}
