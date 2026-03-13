import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { PDF_COLORS, PDF_FONTS, PDF_MARGINS } from '@/components/export/PDFStyles';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ExecSummaryContent {
  outlook: string;
  kpis: { name: string; value: string; trend: 'up' | 'down' | 'flat'; comment: string }[];
  trends: { title: string; description: string; sentiment: 'positive' | 'negative' | 'neutral' }[];
  watchItems: { title: string; description: string }[];
  recommendations: { title: string; rationale: string }[];
  tabName: string;
  scopeLabel: string;
}

// ---------------------------------------------------------------------------
// Helpers — hex to RGB for jsPDF setFillColor / setTextColor
// ---------------------------------------------------------------------------

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  return [
    parseInt(h.substring(0, 2), 16),
    parseInt(h.substring(2, 4), 16),
    parseInt(h.substring(4, 6), 16),
  ];
}

// ---------------------------------------------------------------------------
// Layout constants
// ---------------------------------------------------------------------------

const HEADER_HEIGHT = 12; // mm
const CONTENT_START_Y = HEADER_HEIGHT + 6; // first usable Y after header
const LINE_HEIGHT = 4.2; // mm per line at body font size
const BLOCK_GAP = 6; // mm between card-style blocks
const LEFT_BAR_WIDTH = 1.5; // mm — accent bar thickness
const LEFT_BAR_GAP = 3; // mm — gap between bar and text

// ---------------------------------------------------------------------------
// Cover page
// ---------------------------------------------------------------------------

function drawCoverPage(doc: jsPDF, tabName: string, scopeLabel: string): void {
  const w = doc.internal.pageSize.getWidth();
  const h = doc.internal.pageSize.getHeight();

  // Full-page dark background
  doc.setFillColor(PDF_COLORS.coverGradientStart);
  doc.rect(0, 0, w, h, 'F');

  // Lighter accent band in the middle third
  doc.setFillColor(PDF_COLORS.coverGradientEnd);
  doc.rect(0, h * 0.35, w, h * 0.3, 'F');

  // Title
  doc.setTextColor(PDF_COLORS.white);
  doc.setFontSize(PDF_FONTS.title);
  doc.setFont('helvetica', 'bold');
  doc.text(tabName, w / 2, h * 0.4, { align: 'center' });
  doc.text('Executive Summary', w / 2, h * 0.4 + 14, { align: 'center' });

  // Subtitle
  doc.setFontSize(PDF_FONTS.subtitle);
  doc.setFont('helvetica', 'normal');
  doc.text('AI-Powered Portfolio Analysis', w / 2, h * 0.4 + 30, { align: 'center' });

  // Report date and scope
  doc.setFontSize(PDF_FONTS.body);
  const dateStr = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  doc.text(`Report Date: ${dateStr}`, w / 2, h * 0.68, { align: 'center' });
  if (scopeLabel) {
    doc.text(`Scope: ${scopeLabel}`, w / 2, h * 0.68 + 6, { align: 'center' });
  }

  // Confidentiality notice
  doc.setFontSize(PDF_FONTS.small);
  doc.setTextColor('#b0bec5');
  doc.text('CONFIDENTIAL — For Internal Use Only', w / 2, h * 0.85, { align: 'center' });
}

// ---------------------------------------------------------------------------
// Header bar (every content page)
// ---------------------------------------------------------------------------

function drawHeader(doc: jsPDF, sectionTitle: string): void {
  const w = doc.internal.pageSize.getWidth();

  doc.setFillColor(PDF_COLORS.headerBg);
  doc.rect(0, 0, w, HEADER_HEIGHT, 'F');

  doc.setTextColor(PDF_COLORS.white);
  doc.setFontSize(PDF_FONTS.body);
  doc.setFont('helvetica', 'bold');
  doc.text(sectionTitle, PDF_MARGINS.page.left, 8);

  const dateStr = new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  doc.setFontSize(PDF_FONTS.tiny);
  doc.setFont('helvetica', 'normal');
  doc.text(dateStr, w - PDF_MARGINS.page.right, 8, { align: 'right' });
}

// ---------------------------------------------------------------------------
// Footer (added in a final pass after all pages are generated)
// ---------------------------------------------------------------------------

function drawFooter(
  doc: jsPDF,
  tabName: string,
  pageNum: number,
  totalPages: number,
): void {
  const w = doc.internal.pageSize.getWidth();
  const h = doc.internal.pageSize.getHeight();

  doc.setDrawColor(PDF_COLORS.border);
  doc.line(PDF_MARGINS.page.left, h - 12, w - PDF_MARGINS.page.right, h - 12);

  doc.setTextColor(PDF_COLORS.textLight);
  doc.setFontSize(PDF_FONTS.tiny);
  doc.setFont('helvetica', 'normal');
  doc.text(`Executive Summary \u2014 ${tabName}`, PDF_MARGINS.page.left, h - 7);
  doc.text(`Page ${pageNum} of ${totalPages}`, w - PDF_MARGINS.page.right, h - 7, {
    align: 'right',
  });
}

// ---------------------------------------------------------------------------
// addTextSection — renders word-wrapped text, auto-paginates when needed
// Returns the final Y position on the (possibly new) page.
// headerTitle is redrawn on new pages so the reader knows which section they
// are in even when content overflows.
// ---------------------------------------------------------------------------

function addTextSection(
  doc: jsPDF,
  text: string,
  startY: number,
  maxWidth: number,
  headerTitle: string,
): number {
  const pageH = doc.internal.pageSize.getHeight();
  const bottomLimit = pageH - PDF_MARGINS.page.bottom;

  doc.setFontSize(PDF_FONTS.body);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(PDF_COLORS.textDark);

  const lines = doc.splitTextToSize(text, maxWidth);
  let currentY = startY;

  for (let i = 0; i < lines.length; i++) {
    if (currentY + LINE_HEIGHT > bottomLimit) {
      doc.addPage('a4', 'landscape');
      drawHeader(doc, headerTitle);
      currentY = CONTENT_START_Y;
      doc.setFontSize(PDF_FONTS.body);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(PDF_COLORS.textDark);
    }
    doc.text(lines[i], PDF_MARGINS.page.left, currentY);
    currentY += LINE_HEIGHT;
  }

  return currentY;
}

// ---------------------------------------------------------------------------
// Page: Outlook & Introduction
// ---------------------------------------------------------------------------

function drawOutlookPage(doc: jsPDF, content: ExecSummaryContent): void {
  doc.addPage('a4', 'landscape');
  const headerTitle = 'OUTLOOK & INTRODUCTION';
  drawHeader(doc, headerTitle);

  const maxWidth =
    doc.internal.pageSize.getWidth() - PDF_MARGINS.page.left - PDF_MARGINS.page.right;

  addTextSection(doc, content.outlook, CONTENT_START_Y, maxWidth, headerTitle);
}

// ---------------------------------------------------------------------------
// Page: KPI Snapshot
// ---------------------------------------------------------------------------

function drawKPIPage(doc: jsPDF, content: ExecSummaryContent): void {
  doc.addPage('a4', 'landscape');
  drawHeader(doc, 'KEY PERFORMANCE INDICATORS');

  const trendSymbol = (t: 'up' | 'down' | 'flat'): string => {
    if (t === 'up') return '\u25B2'; // filled triangle up
    if (t === 'down') return '\u25BC'; // filled triangle down
    return '\u25BA'; // filled triangle right
  };

  const bodyRows = content.kpis.map((kpi) => [
    kpi.name,
    kpi.value,
    trendSymbol(kpi.trend),
    kpi.comment,
  ]);

  autoTable(doc, {
    startY: CONTENT_START_Y,
    head: [['Metric', 'Value', 'Trend', 'Commentary']],
    body: bodyRows,
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
      0: { fontStyle: 'bold', cellWidth: 55 },
      1: { cellWidth: 35, halign: 'right' },
      2: { cellWidth: 18, halign: 'center' },
      3: { cellWidth: 'auto' }, // flex — takes remaining space
    },
    didParseCell(hookData) {
      if (hookData.section === 'body' && hookData.column.index === 2) {
        const raw = String(hookData.cell.raw);
        if (raw === '\u25B2') {
          hookData.cell.styles.textColor = hexToRgb(PDF_COLORS.success);
        } else if (raw === '\u25BC') {
          hookData.cell.styles.textColor = hexToRgb(PDF_COLORS.danger);
        } else {
          hookData.cell.styles.textColor = hexToRgb(PDF_COLORS.textMedium);
        }
        hookData.cell.styles.fontStyle = 'bold';
      }
    },
    margin: { left: PDF_MARGINS.page.left, right: PDF_MARGINS.page.right },
  });
}

// ---------------------------------------------------------------------------
// Page: Trends & Analysis
// ---------------------------------------------------------------------------

function sentimentColor(sentiment: 'positive' | 'negative' | 'neutral'): string {
  if (sentiment === 'positive') return PDF_COLORS.success;
  if (sentiment === 'negative') return PDF_COLORS.danger;
  return PDF_COLORS.textMedium;
}

function drawTrendsPage(doc: jsPDF, content: ExecSummaryContent): void {
  doc.addPage('a4', 'landscape');
  const headerTitle = 'TRENDS & ANALYSIS';
  drawHeader(doc, headerTitle);

  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const bottomLimit = pageH - PDF_MARGINS.page.bottom;
  const textX = PDF_MARGINS.page.left + LEFT_BAR_WIDTH + LEFT_BAR_GAP;
  const maxTextWidth = pageW - textX - PDF_MARGINS.page.right;
  let currentY = CONTENT_START_Y;

  content.trends.forEach((trend) => {
    // Pre-calculate height needed for this block
    doc.setFontSize(PDF_FONTS.sectionTitle);
    const titleLines = doc.splitTextToSize(trend.title, maxTextWidth);
    doc.setFontSize(PDF_FONTS.body);
    const descLines = doc.splitTextToSize(trend.description, maxTextWidth);
    const blockHeight = titleLines.length * 5.5 + descLines.length * LINE_HEIGHT + 4;

    // Auto-paginate if block won't fit
    if (currentY + blockHeight > bottomLimit) {
      doc.addPage('a4', 'landscape');
      drawHeader(doc, headerTitle);
      currentY = CONTENT_START_Y;
    }

    // Left accent bar
    const [r, g, b] = hexToRgb(sentimentColor(trend.sentiment));
    doc.setFillColor(r, g, b);
    doc.rect(PDF_MARGINS.page.left, currentY - 3, LEFT_BAR_WIDTH, blockHeight, 'F');

    // Title
    doc.setFontSize(PDF_FONTS.sectionTitle);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(PDF_COLORS.textDark);
    doc.text(titleLines, textX, currentY);
    currentY += titleLines.length * 5.5;

    // Description
    doc.setFontSize(PDF_FONTS.body);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(PDF_COLORS.textMedium);
    doc.text(descLines, textX, currentY);
    currentY += descLines.length * LINE_HEIGHT + BLOCK_GAP;
  });
}

// ---------------------------------------------------------------------------
// Page: Watch Items
// ---------------------------------------------------------------------------

function drawWatchItemsPage(doc: jsPDF, content: ExecSummaryContent): void {
  doc.addPage('a4', 'landscape');
  const headerTitle = 'ITEMS TO WATCH';
  drawHeader(doc, headerTitle);

  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const bottomLimit = pageH - PDF_MARGINS.page.bottom;
  const textX = PDF_MARGINS.page.left + LEFT_BAR_WIDTH + LEFT_BAR_GAP;
  const maxTextWidth = pageW - textX - PDF_MARGINS.page.right;
  const [wR, wG, wB] = hexToRgb(PDF_COLORS.warning);
  let currentY = CONTENT_START_Y;

  content.watchItems.forEach((item, idx) => {
    // Pre-calculate height
    const label = `${idx + 1}. ${item.title}`;
    doc.setFontSize(PDF_FONTS.sectionTitle);
    const titleLines = doc.splitTextToSize(label, maxTextWidth);
    doc.setFontSize(PDF_FONTS.body);
    const descLines = doc.splitTextToSize(item.description, maxTextWidth);
    const blockHeight = titleLines.length * 5.5 + descLines.length * LINE_HEIGHT + 4;

    if (currentY + blockHeight > bottomLimit) {
      doc.addPage('a4', 'landscape');
      drawHeader(doc, headerTitle);
      currentY = CONTENT_START_Y;
    }

    // Amber accent bar
    doc.setFillColor(wR, wG, wB);
    doc.rect(PDF_MARGINS.page.left, currentY - 3, LEFT_BAR_WIDTH, blockHeight, 'F');

    // Title (numbered)
    doc.setFontSize(PDF_FONTS.sectionTitle);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(PDF_COLORS.textDark);
    doc.text(titleLines, textX, currentY);
    currentY += titleLines.length * 5.5;

    // Description
    doc.setFontSize(PDF_FONTS.body);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(PDF_COLORS.textMedium);
    doc.text(descLines, textX, currentY);
    currentY += descLines.length * LINE_HEIGHT + BLOCK_GAP;
  });
}

// ---------------------------------------------------------------------------
// Page: Recommendations & Next Steps
// ---------------------------------------------------------------------------

function drawRecommendationsPage(doc: jsPDF, content: ExecSummaryContent): void {
  doc.addPage('a4', 'landscape');
  const headerTitle = 'RECOMMENDATIONS & NEXT STEPS';
  drawHeader(doc, headerTitle);

  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const bottomLimit = pageH - PDF_MARGINS.page.bottom;
  const textX = PDF_MARGINS.page.left + LEFT_BAR_WIDTH + LEFT_BAR_GAP;
  const maxTextWidth = pageW - textX - PDF_MARGINS.page.right;
  const [pR, pG, pB] = hexToRgb(PDF_COLORS.primary);
  let currentY = CONTENT_START_Y;

  content.recommendations.forEach((rec, idx) => {
    const label = `${idx + 1}. ${rec.title}`;
    doc.setFontSize(PDF_FONTS.sectionTitle);
    const titleLines = doc.splitTextToSize(label, maxTextWidth);
    doc.setFontSize(PDF_FONTS.body);
    const ratLines = doc.splitTextToSize(rec.rationale, maxTextWidth);
    const blockHeight = titleLines.length * 5.5 + ratLines.length * LINE_HEIGHT + 4;

    if (currentY + blockHeight > bottomLimit) {
      doc.addPage('a4', 'landscape');
      drawHeader(doc, headerTitle);
      currentY = CONTENT_START_Y;
    }

    // Teal/primary accent bar
    doc.setFillColor(pR, pG, pB);
    doc.rect(PDF_MARGINS.page.left, currentY - 3, LEFT_BAR_WIDTH, blockHeight, 'F');

    // Title (numbered)
    doc.setFontSize(PDF_FONTS.sectionTitle);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(PDF_COLORS.textDark);
    doc.text(titleLines, textX, currentY);
    currentY += titleLines.length * 5.5;

    // Rationale
    doc.setFontSize(PDF_FONTS.body);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(PDF_COLORS.textMedium);
    doc.text(ratLines, textX, currentY);
    currentY += ratLines.length * LINE_HEIGHT + BLOCK_GAP;
  });
}

// ---------------------------------------------------------------------------
// Main entry point
// ---------------------------------------------------------------------------

export function generateExecSummaryPDF(content: ExecSummaryContent): jsPDF {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

  // Page 1: Cover
  drawCoverPage(doc, content.tabName, content.scopeLabel);

  // Page 2: Outlook & Introduction (skip if empty)
  if (content.outlook && content.outlook.trim().length > 0) {
    drawOutlookPage(doc, content);
  }

  // Page 3: KPI Snapshot (skip if empty)
  if (content.kpis && content.kpis.length > 0) {
    drawKPIPage(doc, content);
  }

  // Page 4: Trends & Analysis (skip if empty)
  if (content.trends && content.trends.length > 0) {
    drawTrendsPage(doc, content);
  }

  // Page 5: Watch Items (skip if empty)
  if (content.watchItems && content.watchItems.length > 0) {
    drawWatchItemsPage(doc, content);
  }

  // Page 6: Recommendations & Next Steps (skip if empty)
  if (content.recommendations && content.recommendations.length > 0) {
    drawRecommendationsPage(doc, content);
  }

  // Final pass: add footers to every content page (skip cover = page 1)
  const totalPages = doc.getNumberOfPages();
  const contentPageCount = totalPages - 1; // cover is not counted
  for (let i = 2; i <= totalPages; i++) {
    doc.setPage(i);
    drawFooter(doc, content.tabName, i - 1, contentPageCount);
  }

  return doc;
}
