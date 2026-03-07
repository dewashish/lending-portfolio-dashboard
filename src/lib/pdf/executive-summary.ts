import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { PDF_COLORS, PDF_FONTS, PDF_MARGINS, ragColor } from '@/components/export/PDFStyles';
import * as queries from '@/lib/queries/consumer';
import { formatPercent, formatCurrency } from '@/lib/format';

interface ExecSummaryData {
  overall: Awaited<ReturnType<typeof queries.fetchConsumerOverall>>;
  products: Awaited<ReturnType<typeof queries.fetchProductMetrics>>;
  netFlow: Awaited<ReturnType<typeof queries.fetchNetFlowRates>>;
  rollRates: Awaited<ReturnType<typeof queries.fetchRollRates>>;
  losMetrics: Awaited<ReturnType<typeof queries.fetchLOSMetrics>>;
  vintage: Awaited<ReturnType<typeof queries.fetchVintagePoints>>;
}

function getLatestValue(data: { metric: string; values: Record<string, number | string | null> }[], metricName: string): number {
  const row = data.find((d) => d.metric === metricName);
  if (!row) return 0;
  const periods = Object.keys(row.values).sort();
  const val = row.values[periods[periods.length - 1]];
  return typeof val === 'number' ? val : 0;
}

function getPreviousValue(data: { metric: string; values: Record<string, number | string | null> }[], metricName: string): number {
  const row = data.find((d) => d.metric === metricName);
  if (!row) return 0;
  const periods = Object.keys(row.values).sort();
  if (periods.length < 2) return 0;
  const val = row.values[periods[periods.length - 2]];
  return typeof val === 'number' ? val : 0;
}

function momPct(current: number, previous: number): string {
  if (previous === 0) return 'N/A';
  const change = ((current - previous) / previous) * 100;
  const sign = change > 0 ? '+' : '';
  return `${sign}${change.toFixed(1)}%`;
}

function getLatestPeriod(data: { values: Record<string, number | string | null> }[]): string {
  if (!data.length) return '';
  const periods = Object.keys(data[0].values).sort();
  return periods[periods.length - 1] || '';
}

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
  doc.text('Consumer Finance', w / 2, h * 0.4, { align: 'center' });
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
  doc.text('Consumer Finance PQR — Executive Summary', PDF_MARGINS.page.left, h - 7);
  doc.text(`Page ${pageNum} of ${totalPages}`, w - PDF_MARGINS.page.right, h - 7, { align: 'right' });
}

function drawKeyMetricsPage(doc: jsPDF, data: ExecSummaryData) {
  doc.addPage('a4', 'landscape');
  drawHeader(doc, 'KEY METRICS & PORTFOLIO HEALTH');

  const startY = 20;
  const { overall } = data;

  // Auto-narrative
  const aum = getLatestValue(overall, 'Total AUM');
  const aumPrev = getPreviousValue(overall, 'Total AUM');
  const fpd = getLatestValue(overall, 'FPD%');
  const dpd30 = getLatestValue(overall, '30+ Amt%');
  const dpd90 = getLatestValue(overall, '90+ Amt%');
  const ncl = getLatestValue(overall, 'Net Credit Loss');
  const period = getLatestPeriod(overall);

  doc.setTextColor(PDF_COLORS.textDark);
  doc.setFontSize(PDF_FONTS.body);
  doc.setFont('helvetica', 'normal');

  const narrative = `As of ${period || 'latest period'}, the consumer portfolio stands at ${formatCurrency(aum)} ` +
    `(${momPct(aum, aumPrev)} MoM). First Payment Default rate is at ${formatPercent(fpd)}, ` +
    `30+ DPD at ${formatPercent(dpd30)}, 90+ DPD at ${formatPercent(dpd90)}, ` +
    `and Net Credit Loss at ${formatPercent(ncl)}.`;

  const lines = doc.splitTextToSize(narrative, 260);
  doc.text(lines, PDF_MARGINS.page.left, startY);

  // KPI table with traffic lights
  const kpiRows = [
    ['Total AUM', formatCurrency(aum), momPct(aum, aumPrev), '—'],
    ['FPD%', formatPercent(fpd), '', fpd > 0.035 ? 'RED' : fpd > 0.03 ? 'AMBER' : 'GREEN'],
    ['30+ DPD%', formatPercent(dpd30), '', dpd30 > 0.06 ? 'RED' : dpd30 > 0.05 ? 'AMBER' : 'GREEN'],
    ['90+ DPD%', formatPercent(dpd90), '', dpd90 > 0.02 ? 'RED' : dpd90 > 0.015 ? 'AMBER' : 'GREEN'],
    ['Net Credit Loss', formatPercent(ncl), '', ncl > 0.012 ? 'RED' : ncl > 0.008 ? 'AMBER' : 'GREEN'],
  ];

  autoTable(doc, {
    startY: startY + lines.length * 5 + 5,
    head: [['Metric', 'Value', 'MoM Change', 'RAG Status']],
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
      2: { cellWidth: 35, halign: 'right' },
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

  // 5-month DPD trend table
  const periods = overall.length > 0 ? Object.keys(overall[0].values).sort() : [];
  const dpdMetrics = ['30+ Amt%', '60+ Amt%', '90+ Amt%'];
  const trendRows = dpdMetrics.map((m) => {
    const row = overall.find((r) => r.metric === m);
    return [m, ...periods.map((p) => {
      const val = row?.values[p];
      return typeof val === 'number' ? formatPercent(val) : '—';
    })];
  });

  if (trendRows.length > 0 && periods.length > 0) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const finalY = (doc as any).lastAutoTable?.finalY ?? 90;
    doc.setFontSize(PDF_FONTS.sectionTitle);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(PDF_COLORS.textDark);
    doc.text('DPD Trend (Last 5 Months)', PDF_MARGINS.page.left, finalY + 10);

    autoTable(doc, {
      startY: finalY + 14,
      head: [['Metric', ...periods]],
      body: trendRows,
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
      columnStyles: { 0: { halign: 'left', fontStyle: 'bold', cellWidth: 40 } },
      margin: { left: PDF_MARGINS.page.left },
    });
  }
}

function drawCompositionPage(doc: jsPDF, data: ExecSummaryData) {
  doc.addPage('a4', 'landscape');
  drawHeader(doc, 'PORTFOLIO COMPOSITION & ORIGINATION');

  let currentY = 20;

  // Product-wise summary
  if (data.products.length > 0) {
    doc.setFontSize(PDF_FONTS.sectionTitle);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(PDF_COLORS.textDark);
    doc.text('Product-wise Portfolio Summary', PDF_MARGINS.page.left, currentY);
    currentY += 5;

    const prodRows = data.products.map((prod) => {
      const aum = getLatestValue(prod.metrics, 'Total AUM');
      const dpd30 = getLatestValue(prod.metrics, '30+ Amt%');
      const dpd90 = getLatestValue(prod.metrics, '90+ Amt%');
      return [prod.productName, formatCurrency(aum), formatPercent(dpd30), formatPercent(dpd90)];
    });

    autoTable(doc, {
      startY: currentY,
      head: [['Product', 'AUM', '30+ DPD%', '90+ DPD%']],
      body: prodRows,
      theme: 'grid',
      headStyles: {
        fillColor: PDF_COLORS.headerBg,
        textColor: PDF_COLORS.white,
        fontSize: PDF_FONTS.small,
        fontStyle: 'bold',
      },
      bodyStyles: { fontSize: PDF_FONTS.small, textColor: PDF_COLORS.textDark },
      columnStyles: {
        0: { fontStyle: 'bold', cellWidth: 50 },
        1: { halign: 'right', cellWidth: 40 },
        2: { halign: 'right', cellWidth: 30 },
        3: { halign: 'right', cellWidth: 30 },
      },
      margin: { left: PDF_MARGINS.page.left },
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    currentY = ((doc as any).lastAutoTable?.finalY ?? currentY) + 10;
  }

  // LOS Origination Summary
  if (data.losMetrics.length > 0) {
    doc.setFontSize(PDF_FONTS.sectionTitle);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(PDF_COLORS.textDark);
    doc.text('LOS Origination — MTD vs LMTD', PDF_MARGINS.page.left, currentY);
    currentY += 5;

    const losRows = data.losMetrics
      .filter((m) => m.product === 'All Products')
      .map((m) => [
        m.metric,
        formatCurrency(m.ftd),
        formatCurrency(m.mtd),
        formatCurrency(m.lmtd),
        `${m.momChange > 0 ? '+' : ''}${m.momChange.toFixed(1)}%`,
        m.achievement != null ? `${m.achievement.toFixed(0)}%` : '—',
      ]);

    autoTable(doc, {
      startY: currentY,
      head: [['Metric', 'FTD', 'MTD', 'LMTD', 'MoM Δ', 'Achievement']],
      body: losRows,
      theme: 'grid',
      headStyles: {
        fillColor: PDF_COLORS.primary,
        textColor: PDF_COLORS.white,
        fontSize: PDF_FONTS.small,
        fontStyle: 'bold',
      },
      bodyStyles: { fontSize: PDF_FONTS.small, textColor: PDF_COLORS.textDark, halign: 'right' },
      columnStyles: { 0: { halign: 'left', fontStyle: 'bold', cellWidth: 50 } },
      didParseCell(hookData) {
        if (hookData.section === 'body' && hookData.column.index === 4) {
          const raw = String(hookData.cell.raw);
          if (raw.startsWith('-')) hookData.cell.styles.textColor = PDF_COLORS.danger;
          else if (raw.startsWith('+')) hookData.cell.styles.textColor = PDF_COLORS.success;
        }
      },
      margin: { left: PDF_MARGINS.page.left },
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    currentY = ((doc as any).lastAutoTable?.finalY ?? currentY) + 10;
  }

  // Net Flow Summary
  if (data.netFlow.length > 0) {
    doc.setFontSize(PDF_FONTS.sectionTitle);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(PDF_COLORS.textDark);
    doc.text('Net Flow Rate Summary', PDF_MARGINS.page.left, currentY);
    currentY += 5;

    const periods = data.netFlow.length > 0 ? Object.keys(data.netFlow[0].values).sort().slice(-3) : [];
    const flowRows = data.netFlow
      .filter((r) => r.bucket.includes('Flow'))
      .slice(0, 8)
      .map((r) => [r.bucket, ...periods.map((p) => formatPercent(r.values[p]))]);

    if (flowRows.length > 0) {
      autoTable(doc, {
        startY: currentY,
        head: [['Flow Bucket', ...periods]],
        body: flowRows,
        theme: 'grid',
        headStyles: {
          fillColor: PDF_COLORS.headerBg,
          textColor: PDF_COLORS.white,
          fontSize: PDF_FONTS.small,
          fontStyle: 'bold',
        },
        bodyStyles: { fontSize: PDF_FONTS.small, textColor: PDF_COLORS.textDark, halign: 'right' },
        columnStyles: { 0: { halign: 'left', fontStyle: 'bold', cellWidth: 50 } },
        margin: { left: PDF_MARGINS.page.left },
      });
    }
  }
}

function drawRisksPage(doc: jsPDF, data: ExecSummaryData) {
  doc.addPage('a4', 'landscape');
  drawHeader(doc, 'RISK ASSESSMENT & RECOMMENDATIONS');

  let currentY = 20;

  // Auto-generated risk assessment
  const aum = getLatestValue(data.overall, 'Total AUM');
  const fpd = getLatestValue(data.overall, 'FPD%');
  const dpd30 = getLatestValue(data.overall, '30+ Amt%');
  const dpd90 = getLatestValue(data.overall, '90+ Amt%');
  const ncl = getLatestValue(data.overall, 'Net Credit Loss');

  doc.setFontSize(PDF_FONTS.sectionTitle);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(PDF_COLORS.textDark);
  doc.text('Key Risk Indicators', PDF_MARGINS.page.left, currentY);
  currentY += 6;

  // Risk bullets
  const risks: string[] = [];
  if (fpd > 0.035) risks.push(`FPD rate at ${formatPercent(fpd)} exceeds tolerance threshold of 3.5%. Recommend tightening sourcing criteria and bureau score cut-offs.`);
  else if (fpd > 0.03) risks.push(`FPD rate at ${formatPercent(fpd)} approaching threshold. Monitor sourcing quality closely.`);
  else risks.push(`FPD rate at ${formatPercent(fpd)} is within acceptable range. Sourcing quality is healthy.`);

  if (dpd30 > 0.06) risks.push(`30+ delinquency at ${formatPercent(dpd30)} is elevated. Intensify early-bucket collection efforts and review skip-payment trends.`);
  else risks.push(`30+ delinquency at ${formatPercent(dpd30)} is within benchmarks.`);

  if (dpd90 > 0.02) risks.push(`90+ delinquency at ${formatPercent(dpd90)} requires attention. Review write-off and recovery strategies.`);
  else risks.push(`90+ delinquency at ${formatPercent(dpd90)} remains controlled.`);

  if (ncl > 0.01) risks.push(`Net Credit Loss at ${formatPercent(ncl)} is above target. Evaluate provision adequacy and recovery pipeline.`);
  else risks.push(`Net Credit Loss at ${formatPercent(ncl)} is within budget parameters.`);

  doc.setFontSize(PDF_FONTS.body);
  doc.setFont('helvetica', 'normal');
  risks.forEach((risk) => {
    const bullet = `• ${risk}`;
    const splitLines = doc.splitTextToSize(bullet, 260);
    doc.text(splitLines, PDF_MARGINS.page.left + 2, currentY);
    currentY += splitLines.length * 4.5 + 2;
  });

  currentY += 6;

  // Recommendations
  doc.setFontSize(PDF_FONTS.sectionTitle);
  doc.setFont('helvetica', 'bold');
  doc.text('Recommendations', PDF_MARGINS.page.left, currentY);
  currentY += 6;

  const recommendations = [
    'Continue monitoring FPD and early-bucket delinquency for any deterioration signals.',
    'Review product-level underwriting standards for segments showing elevated roll-forward rates.',
    'Strengthen collection intensity in B2-B3 buckets where resolution rates have shown declining trends.',
    'Evaluate vintage-level performance to identify cohorts requiring targeted intervention.',
    aum > 300 ? 'Portfolio growth remains on track; ensure credit quality is not being compromised for volume.' : 'Consider targeted growth in well-performing segments while maintaining credit standards.',
  ];

  doc.setFontSize(PDF_FONTS.body);
  doc.setFont('helvetica', 'normal');
  recommendations.forEach((rec, i) => {
    const text = `${i + 1}. ${rec}`;
    const splitLines = doc.splitTextToSize(text, 260);
    doc.text(splitLines, PDF_MARGINS.page.left + 2, currentY);
    currentY += splitLines.length * 4.5 + 2;
  });

  // Roll Rate summary if available
  if (data.rollRates.length > 0) {
    currentY += 6;
    doc.setFontSize(PDF_FONTS.sectionTitle);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(PDF_COLORS.textDark);
    doc.text('Roll Rate Summary (Latest Period)', PDF_MARGINS.page.left, currentY);
    currentY += 5;

    const periods = data.rollRates.length > 0 ? Object.keys(data.rollRates[0].values).sort() : [];
    const latestPeriod = periods[periods.length - 1];
    const buckets = ['B1', 'B2', 'B3', 'B4', 'B5', 'B6'];
    const rrRows = buckets.map((b) => {
      const bucketMetrics = data.rollRates.filter((r) => r.metric.startsWith(b));
      const resolution = bucketMetrics.find((m) => m.metric.toLowerCase().includes('resolution'));
      const rollFwd = bucketMetrics.find((m) => m.metric.toLowerCase().includes('roll forward'));
      return [
        b,
        resolution && latestPeriod ? formatPercent(resolution.values[latestPeriod]) : '—',
        rollFwd && latestPeriod ? formatPercent(rollFwd.values[latestPeriod]) : '—',
      ];
    });

    autoTable(doc, {
      startY: currentY,
      head: [['Bucket', 'Resolution Rate', 'Roll Forward Rate']],
      body: rrRows,
      theme: 'grid',
      headStyles: {
        fillColor: PDF_COLORS.primary,
        textColor: PDF_COLORS.white,
        fontSize: PDF_FONTS.small,
        fontStyle: 'bold',
      },
      bodyStyles: { fontSize: PDF_FONTS.small, textColor: PDF_COLORS.textDark, halign: 'right' },
      columnStyles: { 0: { halign: 'left', fontStyle: 'bold', cellWidth: 30 } },
      didParseCell(hookData) {
        if (hookData.section === 'body' && hookData.column.index === 2) {
          const raw = String(hookData.cell.raw);
          const numVal = parseFloat(raw);
          if (!isNaN(numVal)) {
            hookData.cell.styles.textColor = ragColor(numVal / 100, 0.25, 0.35);
          }
        }
      },
      margin: { left: PDF_MARGINS.page.left },
    });
  }

  // Data sources footnote
  const h = doc.internal.pageSize.getHeight();
  doc.setFontSize(PDF_FONTS.tiny);
  doc.setTextColor(PDF_COLORS.textLight);
  doc.text(
    'Data Sources: Supabase — consumer_overall_metrics, consumer_product_metrics, net_flow_rates, roll_rate_series, los_metrics, vintage_points',
    PDF_MARGINS.page.left,
    h - 25
  );
}

export async function generateExecutiveSummary(): Promise<void> {
  // Fetch all data in parallel
  const [overall, products, netFlow, rollRates, losMetrics, vintage] = await Promise.all([
    queries.fetchConsumerOverall(),
    queries.fetchProductMetrics(),
    queries.fetchNetFlowRates(),
    queries.fetchRollRates(),
    queries.fetchLOSMetrics(),
    queries.fetchVintagePoints(),
  ]);

  const data: ExecSummaryData = { overall, products, netFlow, rollRates, losMetrics, vintage };

  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

  // Page 1: Cover
  drawCoverPage(doc);

  // Page 2: Key Metrics
  drawKeyMetricsPage(doc, data);

  // Page 3: Composition & Origination
  drawCompositionPage(doc, data);

  // Page 4: Risks & Recommendations
  drawRisksPage(doc, data);

  // Add footers to pages 2-4
  const totalPages = doc.getNumberOfPages();
  for (let i = 2; i <= totalPages; i++) {
    doc.setPage(i);
    drawFooter(doc, i - 1, totalPages - 1);
  }

  doc.save('Consumer-Finance-Executive-Summary.pdf');
}
