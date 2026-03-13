import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { PDF_COLORS, PDF_FONTS, PDF_MARGINS } from '@/components/export/PDFStyles';
import { formatPercent, formatCurrency } from '@/lib/format';
import { fetchAllThresholds } from '@/lib/queries/risk-appetite';
import { resolveThreshold, getRAGStatus } from '@/lib/risk-appetite/resolve-thresholds';
import { getMetricDef } from '@/lib/risk-appetite/metric-registry';
import * as tradeQueries from '@/lib/queries/trade';
import type {
  RiskAppetiteRow,
  ThresholdContext,
  ScopeSelection,
  PortfolioSummary,
  EntityPerformance,
  AssetQualityByEntity,
  CollectionEfficiency,
  WatchlistAccount,
} from '@/lib/types';

// ── Data bundle ──────────────────────────────────────────────────
interface TradeExecData {
  summary: PortfolioSummary;
  entityPerformance: EntityPerformance[];
  assetQuality: AssetQualityByEntity[];
  watchlist: WatchlistAccount[];
  collectionEfficiency: CollectionEfficiency[];
}

// ── RAG helpers ──────────────────────────────────────────────────

/** Get RAG label for a metric value using dynamic thresholds */
function ragLabel(
  metricKey: string,
  value: number,
  allThresholds: RiskAppetiteRow[],
  ctx: ThresholdContext = {},
): string {
  const resolved = resolveThreshold(metricKey, allThresholds, ctx);
  const def = getMetricDef(metricKey);
  return getRAGStatus(value, resolved.appetite, resolved.tolerance, def?.direction ?? 'lower_is_better');
}

// ── Drawing helpers ──────────────────────────────────────────────

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
  doc.text('Trade Finance', w / 2, h * 0.4, { align: 'center' });
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

function drawFooter(doc: jsPDF, pageNum: number, totalPages: number) {
  const w = doc.internal.pageSize.getWidth();
  const h = doc.internal.pageSize.getHeight();

  doc.setDrawColor(PDF_COLORS.border);
  doc.line(PDF_MARGINS.page.left, h - 12, w - PDF_MARGINS.page.right, h - 12);
  doc.setTextColor(PDF_COLORS.textLight);
  doc.setFontSize(PDF_FONTS.tiny);
  doc.text('Trade Finance PQR — Executive Summary', PDF_MARGINS.page.left, h - 7);
  doc.text(`Page ${pageNum} of ${totalPages}`, w - PDF_MARGINS.page.right, h - 7, { align: 'right' });
}

// ── Page 2: Key Metrics & Portfolio Health ───────────────────────

function drawKeyMetricsPage(
  doc: jsPDF,
  data: TradeExecData,
  allThresholds: RiskAppetiteRow[] = [],
) {
  doc.addPage('a4', 'landscape');
  drawHeader(doc, 'KEY METRICS & PORTFOLIO HEALTH');

  const startY = 20;
  const { summary, collectionEfficiency } = data;

  // Compute aggregate collection efficiency
  const avgCollectionEfficiency =
    collectionEfficiency.length > 0
      ? collectionEfficiency.reduce((s, e) => s + e.collectionEfficiencyRatio, 0) / collectionEfficiency.length
      : summary.collectionEfficiency;

  // Auto-narrative
  doc.setTextColor(PDF_COLORS.textDark);
  doc.setFontSize(PDF_FONTS.body);
  doc.setFont('helvetica', 'normal');

  const narrative =
    `The trade finance portfolio has a total outstanding of ${formatCurrency(summary.totalAUM)} ` +
    `across ${summary.totalFacilities} facilities. ` +
    `The NPL ratio stands at ${formatPercent(summary.nplRatio)}, ` +
    `Stage 2+3 exposure at ${formatPercent(summary.stage2Plus3Pct)}, ` +
    `and provision coverage at ${formatPercent(summary.provisionCoverage)}. ` +
    `Collection efficiency is at ${formatPercent(avgCollectionEfficiency)}.`;

  const lines = doc.splitTextToSize(narrative, 260);
  doc.text(lines, PDF_MARGINS.page.left, startY);

  // KPI table with RAG traffic lights
  const kpiRows = [
    ['Total Outstanding', formatCurrency(summary.totalAUM), `${summary.totalFacilities} facilities`, '—'],
    ['NPL Ratio', formatPercent(summary.nplRatio), '', ragLabel('npl_ratio', summary.nplRatio, allThresholds).toUpperCase()],
    ['Stage 2+3%', formatPercent(summary.stage2Plus3Pct), '', ragLabel('stage_2_3_pct', summary.stage2Plus3Pct, allThresholds).toUpperCase()],
    ['Provision Coverage', formatPercent(summary.provisionCoverage), '', ragLabel('trade_utilization', summary.provisionCoverage, allThresholds).toUpperCase()],
    ['Collection Efficiency', formatPercent(avgCollectionEfficiency), '', ragLabel('trade_overdue_ratio', avgCollectionEfficiency, allThresholds).toUpperCase()],
  ];

  autoTable(doc, {
    startY: startY + lines.length * 5 + 5,
    head: [['Metric', 'Value', 'Detail', 'RAG Status']],
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
      0: { cellWidth: 50, fontStyle: 'bold' },
      1: { cellWidth: 40, halign: 'right' },
      2: { cellWidth: 40, halign: 'right' },
      3: { cellWidth: 30, halign: 'center' },
    },
    didParseCell(hookData) {
      if (hookData.section === 'body' && hookData.column.index === 3) {
        const val = hookData.cell.raw as string;
        if (val === 'RED') hookData.cell.styles.textColor = PDF_COLORS.danger;
        else if (val === 'AMBER') hookData.cell.styles.textColor = PDF_COLORS.warning;
        else if (val === 'GREEN') hookData.cell.styles.textColor = PDF_COLORS.success;
        hookData.cell.styles.fontStyle = 'bold';
      }
    },
    margin: { left: PDF_MARGINS.page.left },
  });

  // Collection Efficiency by Entity table
  if (collectionEfficiency.length > 0) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const finalY = (doc as any).lastAutoTable?.finalY ?? 90;
    doc.setFontSize(PDF_FONTS.sectionTitle);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(PDF_COLORS.textDark);
    doc.text('Collection Efficiency by Entity', PDF_MARGINS.page.left, finalY + 10);

    const ceRows = collectionEfficiency.map((ce) => [
      ce.entity,
      formatPercent(ce.collectionEfficiencyRatio),
      formatPercent(ce.overdueRatio),
      `${ce.avgDPD.toFixed(0)} days`,
      formatPercent(ce.recoveryRate),
      formatPercent(ce.rolloverRate),
      ce.rag.toUpperCase(),
    ]);

    autoTable(doc, {
      startY: finalY + 14,
      head: [['Entity', 'Collection Eff.', 'Overdue Ratio', 'Avg DPD', 'Recovery Rate', 'Rollover Rate', 'RAG']],
      body: ceRows,
      theme: 'grid',
      headStyles: {
        fillColor: PDF_COLORS.primary,
        textColor: PDF_COLORS.white,
        fontSize: PDF_FONTS.small,
        fontStyle: 'bold',
      },
      bodyStyles: {
        fontSize: PDF_FONTS.small,
        textColor: PDF_COLORS.textDark,
        halign: 'right',
      },
      columnStyles: {
        0: { halign: 'left', fontStyle: 'bold', cellWidth: 40 },
        6: { halign: 'center' },
      },
      didParseCell(hookData) {
        if (hookData.section === 'body' && hookData.column.index === 6) {
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
}

// ── Page 3: Entity Performance & Asset Quality ───────────────────

function drawEntityPerformancePage(
  doc: jsPDF,
  data: TradeExecData,
) {
  doc.addPage('a4', 'landscape');
  drawHeader(doc, 'ENTITY PERFORMANCE & ASSET QUALITY');

  let currentY = 20;

  // Entity Performance table
  if (data.entityPerformance.length > 0) {
    doc.setFontSize(PDF_FONTS.sectionTitle);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(PDF_COLORS.textDark);
    doc.text('Entity Performance Summary', PDF_MARGINS.page.left, currentY);
    currentY += 5;

    const perfRows = data.entityPerformance.map((ep) => [
      ep.entity,
      formatCurrency(ep.approvedLimit),
      formatCurrency(ep.outstanding),
      formatPercent(ep.utilization),
      formatPercent(ep.provisionCoverage),
      ep.ragStatus.toUpperCase(),
    ]);

    autoTable(doc, {
      startY: currentY,
      head: [['Entity', 'Approved Limit', 'Outstanding', 'Utilization', 'Provision Coverage', 'RAG']],
      body: perfRows,
      theme: 'grid',
      headStyles: {
        fillColor: PDF_COLORS.headerBg,
        textColor: PDF_COLORS.white,
        fontSize: PDF_FONTS.small,
        fontStyle: 'bold',
      },
      bodyStyles: { fontSize: PDF_FONTS.small, textColor: PDF_COLORS.textDark },
      columnStyles: {
        0: { fontStyle: 'bold', cellWidth: 40 },
        1: { halign: 'right', cellWidth: 35 },
        2: { halign: 'right', cellWidth: 35 },
        3: { halign: 'right', cellWidth: 30 },
        4: { halign: 'right', cellWidth: 35 },
        5: { halign: 'center', cellWidth: 20 },
      },
      didParseCell(hookData) {
        if (hookData.section === 'body' && hookData.column.index === 5) {
          const val = hookData.cell.raw as string;
          if (val === 'RED') hookData.cell.styles.textColor = PDF_COLORS.danger;
          else if (val === 'AMBER') hookData.cell.styles.textColor = PDF_COLORS.warning;
          else if (val === 'GREEN') hookData.cell.styles.textColor = PDF_COLORS.success;
          hookData.cell.styles.fontStyle = 'bold';
        }
      },
      margin: { left: PDF_MARGINS.page.left },
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    currentY = ((doc as any).lastAutoTable?.finalY ?? currentY) + 10;
  }

  // Asset Quality by Entity table
  if (data.assetQuality.length > 0) {
    doc.setFontSize(PDF_FONTS.sectionTitle);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(PDF_COLORS.textDark);
    doc.text('Asset Quality by Entity', PDF_MARGINS.page.left, currentY);
    currentY += 5;

    const aqRows = data.assetQuality.map((aq) => [
      aq.entity,
      formatCurrency(aq.stage1Balance),
      formatCurrency(aq.stage2Balance),
      formatCurrency(aq.stage3Balance),
      formatPercent(aq.stage2Plus3Pct),
      aq.rag.toUpperCase(),
    ]);

    autoTable(doc, {
      startY: currentY,
      head: [['Entity', 'Stage 1 Balance', 'Stage 2 Balance', 'Stage 3 Balance', 'Stage 2+3%', 'RAG']],
      body: aqRows,
      theme: 'grid',
      headStyles: {
        fillColor: PDF_COLORS.primary,
        textColor: PDF_COLORS.white,
        fontSize: PDF_FONTS.small,
        fontStyle: 'bold',
      },
      bodyStyles: { fontSize: PDF_FONTS.small, textColor: PDF_COLORS.textDark, halign: 'right' },
      columnStyles: {
        0: { halign: 'left', fontStyle: 'bold', cellWidth: 40 },
        5: { halign: 'center', cellWidth: 20 },
      },
      didParseCell(hookData) {
        if (hookData.section === 'body' && hookData.column.index === 5) {
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
}

// ── Page 4: Risk Assessment & Watchlist ──────────────────────────

function drawRiskAndWatchlistPage(
  doc: jsPDF,
  data: TradeExecData,
  allThresholds: RiskAppetiteRow[] = [],
) {
  doc.addPage('a4', 'landscape');
  drawHeader(doc, 'RISK ASSESSMENT & WATCHLIST');

  let currentY = 20;
  const { summary, collectionEfficiency } = data;

  const avgCollectionEfficiency =
    collectionEfficiency.length > 0
      ? collectionEfficiency.reduce((s, e) => s + e.collectionEfficiencyRatio, 0) / collectionEfficiency.length
      : summary.collectionEfficiency;

  // Key Risk Indicators
  doc.setFontSize(PDF_FONTS.sectionTitle);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(PDF_COLORS.textDark);
  doc.text('Key Risk Indicators', PDF_MARGINS.page.left, currentY);
  currentY += 6;

  // Risk bullets — use dynamic thresholds
  const risks: string[] = [];

  const nplStatus = ragLabel('npl_ratio', summary.nplRatio, allThresholds);
  if (nplStatus === 'Red') risks.push(`NPL ratio at ${formatPercent(summary.nplRatio)} exceeds tolerance threshold. Recommend reviewing credit approval criteria and counterparty exposure limits.`);
  else if (nplStatus === 'Amber') risks.push(`NPL ratio at ${formatPercent(summary.nplRatio)} is approaching threshold. Closely monitor Stage 3 migrations and provisioning adequacy.`);
  else risks.push(`NPL ratio at ${formatPercent(summary.nplRatio)} is within acceptable range. Credit quality remains healthy.`);

  const stage23Status = ragLabel('stage_2_3_pct', summary.stage2Plus3Pct, allThresholds);
  if (stage23Status === 'Red') risks.push(`Stage 2+3 concentration at ${formatPercent(summary.stage2Plus3Pct)} is elevated. Intensify monitoring of distressed obligors and review facility renewals.`);
  else risks.push(`Stage 2+3 exposure at ${formatPercent(summary.stage2Plus3Pct)} is within benchmarks.`);

  const utilizationStatus = ragLabel('trade_utilization', summary.provisionCoverage, allThresholds);
  if (utilizationStatus === 'Red' || utilizationStatus === 'Amber') risks.push(`Provision coverage at ${formatPercent(summary.provisionCoverage)} requires attention. Evaluate adequacy against expected credit losses.`);
  else risks.push(`Provision coverage at ${formatPercent(summary.provisionCoverage)} is adequate for current portfolio risk profile.`);

  const overdueStatus = ragLabel('trade_overdue_ratio', avgCollectionEfficiency, allThresholds);
  if (overdueStatus === 'Red' || overdueStatus === 'Amber') risks.push(`Collection efficiency at ${formatPercent(avgCollectionEfficiency)} is below target. Review overdue recovery processes and escalation triggers.`);
  else risks.push(`Collection efficiency at ${formatPercent(avgCollectionEfficiency)} is performing within expectations.`);

  doc.setFontSize(PDF_FONTS.body);
  doc.setFont('helvetica', 'normal');
  risks.forEach((risk) => {
    const bullet = `\u2022 ${risk}`;
    const splitLines = doc.splitTextToSize(bullet, 260);
    doc.text(splitLines, PDF_MARGINS.page.left + 2, currentY);
    currentY += splitLines.length * 4.5 + 2;
  });

  currentY += 4;

  // Watchlist table (top 10)
  if (data.watchlist.length > 0) {
    doc.setFontSize(PDF_FONTS.sectionTitle);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(PDF_COLORS.textDark);
    doc.text('Watchlist — Top Exposures', PDF_MARGINS.page.left, currentY);
    currentY += 5;

    const watchlistRows = data.watchlist.slice(0, 10).map((w) => [
      w.facilityRef,
      w.obligorName,
      formatCurrency(w.outstanding),
      `${w.dpd}`,
      w.stage,
      `${w.ewsScore.toFixed(1)}`,
      w.action,
    ]);

    autoTable(doc, {
      startY: currentY,
      head: [['Facility', 'Obligor', 'Outstanding', 'DPD', 'Stage', 'EWS Score', 'Action']],
      body: watchlistRows,
      theme: 'grid',
      headStyles: {
        fillColor: PDF_COLORS.headerBg,
        textColor: PDF_COLORS.white,
        fontSize: PDF_FONTS.small,
        fontStyle: 'bold',
      },
      bodyStyles: { fontSize: PDF_FONTS.small, textColor: PDF_COLORS.textDark },
      columnStyles: {
        0: { cellWidth: 28 },
        1: { cellWidth: 40 },
        2: { halign: 'right', cellWidth: 30 },
        3: { halign: 'right', cellWidth: 18 },
        4: { halign: 'center', cellWidth: 22 },
        5: { halign: 'right', cellWidth: 22 },
        6: { cellWidth: 60 },
      },
      didParseCell(hookData) {
        // Highlight high DPD cells
        if (hookData.section === 'body' && hookData.column.index === 3) {
          const dpd = parseInt(String(hookData.cell.raw), 10);
          if (!isNaN(dpd) && dpd >= 90) hookData.cell.styles.textColor = PDF_COLORS.danger;
          else if (!isNaN(dpd) && dpd >= 30) hookData.cell.styles.textColor = PDF_COLORS.warning;
        }
        // Highlight Stage 3
        if (hookData.section === 'body' && hookData.column.index === 4) {
          const stage = String(hookData.cell.raw);
          if (stage.includes('3')) hookData.cell.styles.textColor = PDF_COLORS.danger;
          else if (stage.includes('2')) hookData.cell.styles.textColor = PDF_COLORS.warning;
        }
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
    'Maintain proactive monitoring of watchlist obligors and enforce early warning escalation protocols.',
    'Review entity-level concentration limits where utilization exceeds 80% to manage counterparty risk.',
    'Strengthen Stage 2 to Stage 3 migration surveillance, particularly for entities showing elevated overdue ratios.',
    'Evaluate provision adequacy against IFRS 9 expected credit loss models for trade-specific risk profiles.',
    summary.totalAUM > 500_000_000
      ? 'Portfolio growth remains robust; ensure credit quality standards are not diluted for volume expansion.'
      : 'Consider targeted growth in well-rated counterparties while maintaining current credit discipline.',
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
    'Data Sources: Supabase — trade_entity_performance, trade_asset_quality, trade_collection_efficiency, trade_watchlist',
    PDF_MARGINS.page.left,
    h - 25,
  );
}

// ── Main export ──────────────────────────────────────────────────

export async function generateTradeExecSummary(scope?: ScopeSelection): Promise<void> {
  // Fetch all data in parallel
  const [summaryResult, entityPerformance, assetQuality, watchlist, collectionEfficiency, allThresholds] =
    await Promise.all([
      tradeQueries.fetchTradeExecutiveSummary(scope),
      tradeQueries.fetchTradeEntityPerformance(scope),
      tradeQueries.fetchTradeAssetQuality(scope),
      tradeQueries.fetchTradeWatchlist(scope),
      tradeQueries.fetchTradeCollectionEfficiency(scope),
      fetchAllThresholds().catch(() => [] as RiskAppetiteRow[]),
    ]);

  // Bail out if no summary data
  const summary = summaryResult ?? {
    totalAUM: 0,
    totalFacilities: 0,
    newBookings: 0,
    momChange: 0,
    momChangePercent: 0,
    nplRatio: 0,
    stage2Plus3Pct: 0,
    provisionCoverage: 0,
    delinquency30Plus: 0,
    delinquency90Plus: 0,
    writeOffRate: 0,
    collectionEfficiency: 0,
    avgEWSScore: 0,
    watchlistCount: 0,
    watchlistExposure: 0,
    creditCost: 0,
  };

  const data: TradeExecData = {
    summary,
    entityPerformance,
    assetQuality,
    watchlist,
    collectionEfficiency,
  };

  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

  // Page 1: Cover
  drawCoverPage(doc);

  // Page 2: Key Metrics & Portfolio Health
  drawKeyMetricsPage(doc, data, allThresholds);

  // Page 3: Entity Performance & Asset Quality
  drawEntityPerformancePage(doc, data);

  // Page 4: Risk Assessment & Watchlist
  drawRiskAndWatchlistPage(doc, data, allThresholds);

  // Add footers to pages 2-4
  const totalPages = doc.getNumberOfPages();
  for (let i = 2; i <= totalPages; i++) {
    doc.setPage(i);
    drawFooter(doc, i - 1, totalPages - 1);
  }

  doc.save('Trade-Finance-Executive-Summary.pdf');
}
