import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { PDF_COLORS, PDF_FONTS, PDF_MARGINS } from '@/components/export/PDFStyles';
import { formatPercent, formatCurrencyMM } from '@/lib/format';
import { fetchAllThresholds } from '@/lib/queries/risk-appetite';
import { resolveThreshold, getRAGStatus } from '@/lib/risk-appetite/resolve-thresholds';
import { getMetricDef } from '@/lib/risk-appetite/metric-registry';
import type { RiskAppetiteRow, ThresholdContext, ScopeSelection } from '@/lib/types';
import {
  fetchCorporateExecutiveSummary,
  fetchCorporateTopCustomers,
  fetchCorporateWatchlist,
  fetchCorporateCollateralAnalysis,
  fetchCorporateIndustryConcentration,
} from '@/lib/queries/corporate';

// ── Types ──────────────────────────────────────────────────────────
interface CorporateExecData {
  summary: Awaited<ReturnType<typeof fetchCorporateExecutiveSummary>>;
  topCustomers: Awaited<ReturnType<typeof fetchCorporateTopCustomers>>;
  watchlist: Awaited<ReturnType<typeof fetchCorporateWatchlist>>;
  collateral: Awaited<ReturnType<typeof fetchCorporateCollateralAnalysis>>;
  industryConcentration: Awaited<ReturnType<typeof fetchCorporateIndustryConcentration>>;
}

// ── RAG helper ─────────────────────────────────────────────────────
function ragLabel(metricKey: string, value: number, allThresholds: RiskAppetiteRow[], ctx: ThresholdContext = {}): string {
  const resolved = resolveThreshold(metricKey, allThresholds, ctx);
  const def = getMetricDef(metricKey);
  return getRAGStatus(value, resolved.appetite, resolved.tolerance, def?.direction ?? 'lower_is_better');
}

// ── Cover page ─────────────────────────────────────────────────────
function drawCoverPage(doc: jsPDF) {
  const w = doc.internal.pageSize.getWidth();
  const h = doc.internal.pageSize.getHeight();

  // Full-page gradient background
  doc.setFillColor(PDF_COLORS.coverGradientStart);
  doc.rect(0, 0, w, h, 'F');

  // Lighter accent band
  doc.setFillColor(PDF_COLORS.coverGradientEnd);
  doc.rect(0, h * 0.35, w, h * 0.3, 'F');

  // Title block
  doc.setTextColor(PDF_COLORS.white);
  doc.setFontSize(PDF_FONTS.title);
  doc.setFont('helvetica', 'bold');
  doc.text('Corporate Finance', w / 2, h * 0.4, { align: 'center' });
  doc.text('Executive Summary', w / 2, h * 0.4 + 14, { align: 'center' });

  doc.setFontSize(PDF_FONTS.subtitle);
  doc.setFont('helvetica', 'normal');
  doc.text('Portfolio Quality Review', w / 2, h * 0.4 + 30, { align: 'center' });

  // Date and confidential
  doc.setFontSize(PDF_FONTS.body);
  const now = new Date();
  const dateStr = now.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  doc.text(`Report Date: ${dateStr}`, w / 2, h * 0.72, { align: 'center' });

  doc.setFontSize(PDF_FONTS.small);
  doc.setTextColor('#b0bec5');
  doc.text('CONFIDENTIAL — For Internal Use Only', w / 2, h * 0.85, { align: 'center' });
}

// ── Header ─────────────────────────────────────────────────────────
function drawHeader(doc: jsPDF, title: string) {
  const w = doc.internal.pageSize.getWidth();
  doc.setFillColor(PDF_COLORS.headerBg);
  doc.rect(0, 0, w, 12, 'F');
  doc.setTextColor(PDF_COLORS.white);
  doc.setFontSize(PDF_FONTS.body);
  doc.setFont('helvetica', 'bold');
  doc.text(title, PDF_MARGINS.page.left, 8);

  const now = new Date();
  const dateStr = now.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  doc.setFontSize(PDF_FONTS.tiny);
  doc.setFont('helvetica', 'normal');
  doc.text(dateStr, w - PDF_MARGINS.page.right, 8, { align: 'right' });
}

// ── Footer ─────────────────────────────────────────────────────────
function drawFooter(doc: jsPDF, pageNum: number, totalPages: number) {
  const w = doc.internal.pageSize.getWidth();
  const h = doc.internal.pageSize.getHeight();

  doc.setDrawColor(PDF_COLORS.border);
  doc.line(PDF_MARGINS.page.left, h - 12, w - PDF_MARGINS.page.right, h - 12);
  doc.setTextColor(PDF_COLORS.textLight);
  doc.setFontSize(PDF_FONTS.tiny);
  doc.text('Corporate Finance PQR — Executive Summary', PDF_MARGINS.page.left, h - 7);
  doc.text(`Page ${pageNum} of ${totalPages}`, w - PDF_MARGINS.page.right, h - 7, { align: 'right' });
}

// ── Page 2: Key Metrics & Portfolio Health ─────────────────────────
function drawKeyMetricsPage(doc: jsPDF, data: CorporateExecData, allThresholds: RiskAppetiteRow[] = []) {
  doc.addPage('a4', 'landscape');
  drawHeader(doc, 'KEY METRICS & PORTFOLIO HEALTH');

  const startY = 20;
  const summary = data.summary;

  if (!summary) {
    doc.setTextColor(PDF_COLORS.textDark);
    doc.setFontSize(PDF_FONTS.body);
    doc.text('No corporate portfolio data available.', PDF_MARGINS.page.left, startY);
    return;
  }

  // Auto-narrative
  doc.setTextColor(PDF_COLORS.textDark);
  doc.setFontSize(PDF_FONTS.body);
  doc.setFont('helvetica', 'normal');

  const narrative =
    `The corporate finance portfolio currently stands at ${formatCurrencyMM(summary.totalPOS)} in total POS ` +
    `with ${formatCurrencyMM(summary.totalDisbursement)} disbursed. ` +
    `The delinquency rate is ${formatPercent(summary.delinquencyRate)} (${summary.delinquentCount} accounts), ` +
    `and the NPA rate is ${formatPercent(summary.npaRate)}. ` +
    `Average security cover is ${summary.avgSecurityCover.toFixed(2)}x, ` +
    `covenant breach rate is ${formatPercent(summary.covenantBreachRate)}, ` +
    `and provision coverage ratio stands at ${formatPercent(summary.provisionCoverageRatio)}.`;

  const lines = doc.splitTextToSize(narrative, 260);
  doc.text(lines, PDF_MARGINS.page.left, startY);

  // KPI table with RAG traffic lights
  const kpiRows = [
    ['Total POS', formatCurrencyMM(summary.totalPOS), '—'],
    ['Total Disbursement', formatCurrencyMM(summary.totalDisbursement), '—'],
    ['Delinquency Rate', formatPercent(summary.delinquencyRate), ragLabel('corp_delinquency_rate', summary.delinquencyRate, allThresholds).toUpperCase()],
    ['NPA Rate', formatPercent(summary.npaRate), ragLabel('corp_npa_rate', summary.npaRate, allThresholds).toUpperCase()],
    ['Security Cover', `${summary.avgSecurityCover.toFixed(2)}x`, ragLabel('corp_security_cover', summary.avgSecurityCover, allThresholds).toUpperCase()],
    ['Covenant Breach Rate', formatPercent(summary.covenantBreachRate), ragLabel('corp_covenant_breach_rate', summary.covenantBreachRate, allThresholds).toUpperCase()],
    ['Provision Coverage Ratio', formatPercent(summary.provisionCoverageRatio), ragLabel('corp_pcr', summary.provisionCoverageRatio, allThresholds).toUpperCase()],
  ];

  autoTable(doc, {
    startY: startY + lines.length * 5 + 5,
    head: [['Metric', 'Value', 'RAG Status']],
    body: kpiRows,
    theme: 'grid',
    headStyles: {
      fillColor: PDF_COLORS.headerBg,
      textColor: PDF_COLORS.white,
      fontSize: PDF_FONTS.small,
      fontStyle: 'bold',
    },
    bodyStyles: {
      fontSize: PDF_FONTS.small,
      textColor: PDF_COLORS.textDark,
    },
    columnStyles: {
      0: { cellWidth: 55, fontStyle: 'bold' },
      1: { cellWidth: 45, halign: 'right' },
      2: { cellWidth: 30, halign: 'center' },
    },
    didParseCell(hookData) {
      if (hookData.section === 'body' && hookData.column.index === 2) {
        const val = hookData.cell.raw as string;
        if (val === 'RED') hookData.cell.styles.textColor = PDF_COLORS.danger;
        else if (val === 'AMBER') hookData.cell.styles.textColor = PDF_COLORS.warning;
        else if (val === 'GREEN') hookData.cell.styles.textColor = PDF_COLORS.success;
        hookData.cell.styles.fontStyle = 'bold';
      }
    },
    margin: { left: PDF_MARGINS.page.left },
  });
}

// ── Page 3: Portfolio Composition ──────────────────────────────────
function drawCompositionPage(doc: jsPDF, data: CorporateExecData) {
  doc.addPage('a4', 'landscape');
  drawHeader(doc, 'PORTFOLIO COMPOSITION');

  let currentY = 20;

  // Top Customers table (top 10)
  if (data.topCustomers.length > 0) {
    doc.setFontSize(PDF_FONTS.sectionTitle);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(PDF_COLORS.textDark);
    doc.text('Top Customers by POS', PDF_MARGINS.page.left, currentY);
    currentY += 5;

    const custRows = data.topCustomers.slice(0, 10).map((c) => [
      c.customerName,
      c.sector,
      formatCurrencyMM(c.currentPOS),
      c.riskRating,
      String(c.dpd),
      c.ifrsStage,
    ]);

    autoTable(doc, {
      startY: currentY,
      head: [['Customer', 'Sector', 'POS', 'Rating', 'DPD', 'Stage']],
      body: custRows,
      theme: 'grid',
      headStyles: {
        fillColor: PDF_COLORS.headerBg,
        textColor: PDF_COLORS.white,
        fontSize: PDF_FONTS.small,
        fontStyle: 'bold',
      },
      bodyStyles: { fontSize: PDF_FONTS.small, textColor: PDF_COLORS.textDark },
      columnStyles: {
        0: { fontStyle: 'bold', cellWidth: 55 },
        1: { cellWidth: 40 },
        2: { halign: 'right', cellWidth: 30 },
        3: { halign: 'center', cellWidth: 25 },
        4: { halign: 'right', cellWidth: 20 },
        5: { halign: 'center', cellWidth: 25 },
      },
      margin: { left: PDF_MARGINS.page.left },
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    currentY = ((doc as any).lastAutoTable?.finalY ?? currentY) + 10;
  }

  // Industry Concentration table
  if (data.industryConcentration.length > 0) {
    doc.setFontSize(PDF_FONTS.sectionTitle);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(PDF_COLORS.textDark);
    doc.text('Industry Concentration', PDF_MARGINS.page.left, currentY);
    currentY += 5;

    const concRows = data.industryConcentration.map((ic) => [
      ic.sector,
      formatCurrencyMM(ic.pos),
      formatPercent(ic.portfolioShare),
      ic.irr != null ? formatPercent(ic.irr) : '—',
      String(ic.facilityCount),
    ]);

    autoTable(doc, {
      startY: currentY,
      head: [['Sector', 'POS', 'Portfolio Share%', 'IRR', 'Facility Count']],
      body: concRows,
      theme: 'grid',
      headStyles: {
        fillColor: PDF_COLORS.primary,
        textColor: PDF_COLORS.white,
        fontSize: PDF_FONTS.small,
        fontStyle: 'bold',
      },
      bodyStyles: { fontSize: PDF_FONTS.small, textColor: PDF_COLORS.textDark },
      columnStyles: {
        0: { fontStyle: 'bold', cellWidth: 55 },
        1: { halign: 'right', cellWidth: 35 },
        2: { halign: 'right', cellWidth: 35 },
        3: { halign: 'right', cellWidth: 25 },
        4: { halign: 'right', cellWidth: 30 },
      },
      margin: { left: PDF_MARGINS.page.left },
    });
  }
}

// ── Page 4: Risk Assessment & Watchlist ────────────────────────────
function drawRiskWatchlistPage(doc: jsPDF, data: CorporateExecData, allThresholds: RiskAppetiteRow[] = []) {
  doc.addPage('a4', 'landscape');
  drawHeader(doc, 'RISK ASSESSMENT & WATCHLIST');

  let currentY = 20;
  const summary = data.summary;

  // Key Risk Indicators (auto-generated risk bullets)
  doc.setFontSize(PDF_FONTS.sectionTitle);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(PDF_COLORS.textDark);
  doc.text('Key Risk Indicators', PDF_MARGINS.page.left, currentY);
  currentY += 6;

  const risks: string[] = [];

  if (summary) {
    const delStatus = ragLabel('corp_delinquency_rate', summary.delinquencyRate, allThresholds);
    if (delStatus === 'Red') risks.push(`Delinquency rate at ${formatPercent(summary.delinquencyRate)} exceeds tolerance. Escalate collection intensity and review exposure limits for high-DPD accounts.`);
    else if (delStatus === 'Amber') risks.push(`Delinquency rate at ${formatPercent(summary.delinquencyRate)} approaching threshold. Monitor closely and prepare contingency actions.`);
    else risks.push(`Delinquency rate at ${formatPercent(summary.delinquencyRate)} is within acceptable range.`);

    const npaStatus = ragLabel('corp_npa_rate', summary.npaRate, allThresholds);
    if (npaStatus === 'Red') risks.push(`NPA rate at ${formatPercent(summary.npaRate)} is elevated. Review restructuring pipeline and provision adequacy.`);
    else if (npaStatus === 'Amber') risks.push(`NPA rate at ${formatPercent(summary.npaRate)} approaching threshold. Ensure proactive engagement with stressed borrowers.`);
    else risks.push(`NPA rate at ${formatPercent(summary.npaRate)} remains controlled.`);

    const secStatus = ragLabel('corp_security_cover', summary.avgSecurityCover, allThresholds);
    if (secStatus === 'Red') risks.push(`Average security cover at ${summary.avgSecurityCover.toFixed(2)}x is below tolerance. Seek additional collateral or guarantees on under-secured exposures.`);
    else if (secStatus === 'Amber') risks.push(`Average security cover at ${summary.avgSecurityCover.toFixed(2)}x is declining. Review collateral adequacy on large exposures.`);
    else risks.push(`Average security cover at ${summary.avgSecurityCover.toFixed(2)}x is adequate.`);

    const covStatus = ragLabel('corp_covenant_breach_rate', summary.covenantBreachRate, allThresholds);
    if (covStatus === 'Red') risks.push(`Covenant breach rate at ${formatPercent(summary.covenantBreachRate)} exceeds tolerance. Engage with borrowers and consider remedial actions.`);
    else if (covStatus === 'Amber') risks.push(`Covenant breach rate at ${formatPercent(summary.covenantBreachRate)} is rising. Intensify covenant monitoring.`);
    else risks.push(`Covenant breach rate at ${formatPercent(summary.covenantBreachRate)} is within acceptable levels.`);

    const pcrStatus = ragLabel('corp_pcr', summary.provisionCoverageRatio, allThresholds);
    if (pcrStatus === 'Red' || pcrStatus === 'Amber') risks.push(`Provision coverage ratio at ${formatPercent(summary.provisionCoverageRatio)} is below target. Evaluate adequacy and top-up provisions where needed.`);
    else risks.push(`Provision coverage ratio at ${formatPercent(summary.provisionCoverageRatio)} is satisfactory.`);
  }

  doc.setFontSize(PDF_FONTS.body);
  doc.setFont('helvetica', 'normal');
  risks.forEach((risk) => {
    const bullet = `\u2022 ${risk}`;
    const splitLines = doc.splitTextToSize(bullet, 260);
    doc.text(splitLines, PDF_MARGINS.page.left + 2, currentY);
    currentY += splitLines.length * 4.5 + 2;
  });

  currentY += 4;

  // Watchlist table
  if (data.watchlist.length > 0) {
    doc.setFontSize(PDF_FONTS.sectionTitle);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(PDF_COLORS.textDark);
    doc.text('Watchlist', PDF_MARGINS.page.left, currentY);
    currentY += 5;

    const wlRows = data.watchlist.map((w) => [
      w.borrower,
      w.sector,
      formatCurrencyMM(Number(w.exposure)),
      w.internalRating,
      w.status,
      w.remedialAction,
    ]);

    autoTable(doc, {
      startY: currentY,
      head: [['Borrower', 'Sector', 'Exposure', 'Rating', 'Status', 'Action']],
      body: wlRows,
      theme: 'grid',
      headStyles: {
        fillColor: PDF_COLORS.headerBg,
        textColor: PDF_COLORS.white,
        fontSize: PDF_FONTS.small,
        fontStyle: 'bold',
      },
      bodyStyles: { fontSize: PDF_FONTS.small, textColor: PDF_COLORS.textDark },
      columnStyles: {
        0: { fontStyle: 'bold', cellWidth: 45 },
        1: { cellWidth: 35 },
        2: { halign: 'right', cellWidth: 28 },
        3: { halign: 'center', cellWidth: 22 },
        4: { cellWidth: 30 },
        5: { cellWidth: 45 },
      },
      margin: { left: PDF_MARGINS.page.left },
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    currentY = ((doc as any).lastAutoTable?.finalY ?? currentY) + 8;
  }

  // Collateral summary table
  if (data.collateral.length > 0) {
    doc.setFontSize(PDF_FONTS.sectionTitle);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(PDF_COLORS.textDark);
    doc.text('Collateral Summary', PDF_MARGINS.page.left, currentY);
    currentY += 5;

    const colRows = data.collateral.map((c) => [
      c.collateralType,
      String(c.facilityCount),
      formatCurrencyMM(c.collateralValue),
      `${c.coverageRatio.toFixed(2)}x`,
    ]);

    autoTable(doc, {
      startY: currentY,
      head: [['Type', 'Count', 'Value', 'Coverage Ratio']],
      body: colRows,
      theme: 'grid',
      headStyles: {
        fillColor: PDF_COLORS.primary,
        textColor: PDF_COLORS.white,
        fontSize: PDF_FONTS.small,
        fontStyle: 'bold',
      },
      bodyStyles: { fontSize: PDF_FONTS.small, textColor: PDF_COLORS.textDark },
      columnStyles: {
        0: { fontStyle: 'bold', cellWidth: 50 },
        1: { halign: 'right', cellWidth: 25 },
        2: { halign: 'right', cellWidth: 35 },
        3: { halign: 'right', cellWidth: 35 },
      },
      margin: { left: PDF_MARGINS.page.left },
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    currentY = ((doc as any).lastAutoTable?.finalY ?? currentY) + 8;
  }

  // Recommendations
  doc.setFontSize(PDF_FONTS.sectionTitle);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(PDF_COLORS.textDark);
  doc.text('Recommendations', PDF_MARGINS.page.left, currentY);
  currentY += 6;

  const recommendations = [
    'Maintain proactive engagement with watchlist accounts and ensure timely escalation of early warning signals.',
    'Review covenant compliance on a quarterly basis; initiate remedial dialogue where breaches persist.',
    'Reassess collateral valuations on under-secured exposures and explore additional security options.',
    'Evaluate sector concentration limits and reduce over-exposure to sectors exhibiting stress.',
    summary && summary.watchlistCount > 5
      ? `Watchlist currently contains ${summary.watchlistCount} names. Prioritize resolution on the top exposures to reduce portfolio risk.`
      : 'Continue monitoring portfolio composition and diversification targets.',
  ];

  doc.setFontSize(PDF_FONTS.body);
  doc.setFont('helvetica', 'normal');
  recommendations.forEach((rec, i) => {
    const text = `${i + 1}. ${rec}`;
    const splitLines = doc.splitTextToSize(text, 260);
    doc.text(splitLines, PDF_MARGINS.page.left + 2, currentY);
    currentY += splitLines.length * 4.5 + 2;
  });

  // Data sources footnote
  const h = doc.internal.pageSize.getHeight();
  doc.setFontSize(PDF_FONTS.tiny);
  doc.setTextColor(PDF_COLORS.textLight);
  doc.text(
    'Data Sources: Supabase — corporate_delinquency, corporate_top_customers, corporate_watchlist, corporate_collateral_analysis, corporate_industry_concentration, corporate_covenants, corporate_provisioning_ecl',
    PDF_MARGINS.page.left,
    h - 25,
  );
}

// ── Main export ────────────────────────────────────────────────────
export async function generateCorporateExecSummary(scope?: ScopeSelection): Promise<void> {
  // Fetch all data in parallel
  const [summary, topCustomers, watchlist, collateral, industryConcentration, allThresholds] = await Promise.all([
    fetchCorporateExecutiveSummary(scope),
    fetchCorporateTopCustomers(scope),
    fetchCorporateWatchlist(scope),
    fetchCorporateCollateralAnalysis(scope),
    fetchCorporateIndustryConcentration(scope),
    fetchAllThresholds().catch(() => [] as RiskAppetiteRow[]),
  ]);

  const data: CorporateExecData = { summary, topCustomers, watchlist, collateral, industryConcentration };

  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

  // Page 1: Cover
  drawCoverPage(doc);

  // Page 2: Key Metrics & Portfolio Health
  drawKeyMetricsPage(doc, data, allThresholds);

  // Page 3: Portfolio Composition
  drawCompositionPage(doc, data);

  // Page 4: Risk Assessment & Watchlist
  drawRiskWatchlistPage(doc, data, allThresholds);

  // Add footers to pages 2-4
  const totalPages = doc.getNumberOfPages();
  for (let i = 2; i <= totalPages; i++) {
    doc.setPage(i);
    drawFooter(doc, i - 1, totalPages - 1);
  }

  doc.save('Corporate-Finance-Executive-Summary.pdf');
}
