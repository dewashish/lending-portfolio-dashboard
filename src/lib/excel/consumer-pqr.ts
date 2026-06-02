import ExcelJS from 'exceljs';
import type { ScopeSelection } from '@/lib/types';
import * as queries from '@/lib/queries/consumer';
import { addDataSheet, pivotTimeSeries, getTabColor, downloadWorkbook, getFilename, EXCEL } from './utils';

export async function generateConsumerPQR(scope?: ScopeSelection): Promise<void> {
  const [
    overall,
    products,
    netFlow,
    rollRates,
    collections,
    vintagePoints,
    nonStarters,
    tddPre,
    tddPost,
    approved,
    rejected,
    losMetrics,
    losFunnel,
    losDaily,
  ] = await Promise.all([
    queries.fetchConsumerOverall(scope),
    queries.fetchProductMetrics(scope),
    queries.fetchNetFlowRates(scope),
    queries.fetchRollRates(scope),
    queries.fetchCollectionMetrics(scope),
    queries.fetchVintagePoints(undefined, scope),
    queries.fetchNonStarters(scope),
    queries.fetchTDDPre(scope),
    queries.fetchTDDPost(scope),
    queries.fetchApprovedBase(scope),
    queries.fetchRejectedBase(scope),
    queries.fetchLOSMetrics(scope),
    queries.fetchLOSFunnel(undefined, scope),
    queries.fetchLOSDaily(scope),
  ]);

  const wb = new ExcelJS.Workbook();
  wb.creator = 'Baobab Portfolio Monitor';
  wb.created = new Date();
  const tabColor = getTabColor(1);

  // ── Sheet 1: Portfolio Summary ──────────────────────────────────
  {
    const { columns, rows } = pivotTimeSeries(overall, 'metric');
    addDataSheet(wb, 'Portfolio Summary', columns, rows, tabColor);
  }

  // ── Sheet 2: Product Metrics ────────────────────────────────────
  {
    const productRows: Record<string, unknown>[] = [];
    const allPeriods = new Set<string>();
    for (const p of products) {
      for (const m of p.metrics) {
        Object.keys(m.values).forEach(k => allPeriods.add(k));
      }
    }
    const sortedPeriods = Array.from(allPeriods).sort();
    for (const p of products) {
      for (const m of p.metrics) {
        const row: Record<string, unknown> = { product: p.productName, metricType: m.metricType, metric: m.metric };
        for (const period of sortedPeriods) row[period] = m.values[period] ?? null;
        productRows.push(row);
      }
    }
    const productCols = [
      { header: 'Product', key: 'product', width: 20 },
      { header: 'Type', key: 'metricType', width: 16 },
      { header: 'Metric', key: 'metric', width: 24 },
      ...sortedPeriods.map(p => ({ header: p, key: p, width: 14 })),
    ];
    addDataSheet(wb, 'Product Metrics', productCols, productRows, tabColor);
  }

  // ── Sheet 3: Net Flow Rates ─────────────────────────────────────
  {
    const { columns, rows } = pivotTimeSeries(netFlow, 'bucket');
    addDataSheet(wb, 'Net Flow Rates', columns, rows, tabColor);
  }

  // ── Sheet 4: Roll Rates ─────────────────────────────────────────
  {
    const { columns, rows } = pivotTimeSeries(rollRates, 'metric');
    addDataSheet(wb, 'Roll Rates', columns, rows, tabColor);
  }

  // ── Sheet 5: Collections ────────────────────────────────────────
  {
    addDataSheet(
      wb,
      'Collections',
      [
        { header: 'Portfolio', key: 'portfolio', width: 18 },
        { header: 'Bucket', key: 'bucket', width: 14 },
        { header: 'Amount', key: 'amount', width: 16, style: { numFmt: EXCEL.currency } },
        { header: 'Transitions', key: 'transitions', width: 14, style: { numFmt: EXCEL.number } },
        { header: 'Normalized', key: 'normalized', width: 14, style: { numFmt: EXCEL.percent } },
        { header: 'Roll Backward', key: 'rollBackward', width: 14, style: { numFmt: EXCEL.percent } },
        { header: 'Stabilized', key: 'stabilized', width: 14, style: { numFmt: EXCEL.percent } },
        { header: 'Roll Forward', key: 'rollForward', width: 14, style: { numFmt: EXCEL.percent } },
      ],
      collections.map(c => ({
        portfolio: c.portfolio,
        bucket: c.bucket,
        amount: c.amount,
        transitions: c.transitions,
        normalized: c.normalized,
        rollBackward: c.rollBackward,
        stabilized: c.stabilized,
        rollForward: c.rollForward,
      })),
      tabColor,
    );
  }

  // ── Sheet 6: Vintage Analysis ───────────────────────────────────
  {
    addDataSheet(
      wb,
      'Vintage Analysis',
      [
        { header: 'Vintage', key: 'vintage', width: 14 },
        { header: 'Loan Amount', key: 'loanAmount', width: 16, style: { numFmt: EXCEL.currency } },
        { header: 'MOB', key: 'mob', width: 8 },
        { header: 'Delinquency Rate', key: 'delinquencyRate', width: 16, style: { numFmt: EXCEL.percent } },
        { header: 'Metric Type', key: 'metricType', width: 14 },
      ],
      vintagePoints.map(v => ({
        vintage: v.vintage,
        loanAmount: v.loanAmount,
        mob: v.mob,
        delinquencyRate: v.delinquencyRate,
        metricType: v.metricType,
      })),
      tabColor,
    );
  }

  // ── Sheet 7: Non-Starters ──────────────────────────────────────
  {
    const nsAllPeriods = new Set<string>();
    for (const ns of nonStarters) Object.keys(ns.monthlyValues).forEach(k => nsAllPeriods.add(k));
    const nsPeriods = Array.from(nsAllPeriods).sort();
    const nsRows = nonStarters.map(ns => {
      const row: Record<string, unknown> = { category: ns.category, product: ns.product, metric: ns.metric };
      for (const p of nsPeriods) row[p] = ns.monthlyValues[p] ?? null;
      return row;
    });
    const nsCols = [
      { header: 'Category', key: 'category', width: 18 },
      { header: 'Product', key: 'product', width: 18 },
      { header: 'Metric', key: 'metric', width: 28 },
      ...nsPeriods.map(p => ({ header: p, key: p, width: 14 })),
    ];
    addDataSheet(wb, 'Non-Starters', nsCols, nsRows, tabColor);
  }

  // ── Sheet 8: TDD Pre-Disbursal ─────────────────────────────────
  {
    const { columns, rows } = pivotTimeSeries(tddPre, 'metric');
    addDataSheet(wb, 'TDD Pre-Disbursal', columns, rows, tabColor);
  }

  // ── Sheet 9: TDD Post-Disbursal ────────────────────────────────
  {
    const tddPostPeriods = new Set<string>();
    for (const t of tddPost) Object.keys(t.values).forEach(k => tddPostPeriods.add(k));
    const tddPostSorted = Array.from(tddPostPeriods).sort();
    const tddPostRows = tddPost.map(t => {
      const row: Record<string, unknown> = { variant: t.variant, bureauBucket: t.bureauBucket };
      for (const p of tddPostSorted) row[p] = t.values[p] ?? null;
      return row;
    });
    const tddPostCols = [
      { header: 'Variant', key: 'variant', width: 14 },
      { header: 'Bureau Bucket', key: 'bureauBucket', width: 18 },
      ...tddPostSorted.map(p => ({ header: p, key: p, width: 14 })),
    ];
    addDataSheet(wb, 'TDD Post-Disbursal', tddPostCols, tddPostRows, tabColor);
  }

  // ── Sheet 10: Approved Base ─────────────────────────────────────
  {
    const abBands = new Set<string>();
    for (const a of approved) Object.keys(a.loanBands).forEach(k => abBands.add(k));
    const abBandsSorted = Array.from(abBands).sort();
    const abRows = approved.map(a => {
      const row: Record<string, unknown> = { laBand: a.laBand };
      for (const b of abBandsSorted) row[b] = a.loanBands[b] ?? 0;
      row['total'] = a.total;
      return row;
    });
    const abCols = [
      { header: 'LA Band', key: 'laBand', width: 20 },
      ...abBandsSorted.map(b => ({ header: b, key: b, width: 14 })),
      { header: 'Total', key: 'total', width: 14 },
    ];
    addDataSheet(wb, 'Approved Base', abCols, abRows, tabColor);
  }

  // ── Sheet 11: Rejected Base ─────────────────────────────────────
  {
    const rbBands = new Set<string>();
    for (const r of rejected) Object.keys(r.amountBands).forEach(k => rbBands.add(k));
    const rbBandsSorted = Array.from(rbBands).sort();
    const rbRows = rejected.map(r => {
      const row: Record<string, unknown> = { loanType: r.loanType };
      for (const b of rbBandsSorted) row[b] = r.amountBands[b] ?? 0;
      row['total'] = r.total;
      return row;
    });
    const rbCols = [
      { header: 'Loan Type', key: 'loanType', width: 20 },
      ...rbBandsSorted.map(b => ({ header: b, key: b, width: 14 })),
      { header: 'Total', key: 'total', width: 14 },
    ];
    addDataSheet(wb, 'Rejected Base', rbCols, rbRows, tabColor);
  }

  // ── Sheet 12: LOS Metrics ──────────────────────────────────────
  {
    addDataSheet(
      wb,
      'LOS Metrics',
      [
        { header: 'Metric', key: 'metric', width: 24 },
        { header: 'Product', key: 'product', width: 18 },
        { header: 'FTD', key: 'ftd', width: 14, style: { numFmt: EXCEL.currency } },
        { header: 'MTD', key: 'mtd', width: 14, style: { numFmt: EXCEL.currency } },
        { header: 'LMTD', key: 'lmtd', width: 14, style: { numFmt: EXCEL.currency } },
        { header: 'LM Full', key: 'lmFull', width: 14, style: { numFmt: EXCEL.currency } },
        { header: 'MoM Change', key: 'momChange', width: 14, style: { numFmt: EXCEL.percent } },
        { header: 'Target', key: 'target', width: 14 },
        { header: 'Achievement', key: 'achievement', width: 14, style: { numFmt: EXCEL.percent } },
      ],
      losMetrics.map(m => ({
        metric: m.metric,
        product: m.product,
        ftd: m.ftd,
        mtd: m.mtd,
        lmtd: m.lmtd,
        lmFull: m.lmFull,
        momChange: m.momChange,
        target: m.target,
        achievement: m.achievement,
      })),
      tabColor,
    );
  }

  // ── Sheet 13: LOS Funnel ───────────────────────────────────────
  {
    addDataSheet(
      wb,
      'LOS Funnel',
      [
        { header: 'Stage', key: 'stage', width: 20 },
        { header: 'Product', key: 'product', width: 18 },
        { header: 'FTD', key: 'ftd', width: 14 },
        { header: 'MTD', key: 'mtd', width: 14 },
        { header: 'LMTD', key: 'lmtd', width: 14 },
        { header: 'Conversion Rate', key: 'conversionRate', width: 16, style: { numFmt: EXCEL.percent } },
      ],
      losFunnel.map(f => ({
        stage: f.stage,
        product: f.product,
        ftd: f.ftd,
        mtd: f.mtd,
        lmtd: f.lmtd,
        conversionRate: f.conversionRate,
      })),
      tabColor,
    );
  }

  // ── Sheet 14: LOS Daily ────────────────────────────────────────
  {
    addDataSheet(
      wb,
      'LOS Daily',
      [
        { header: 'Date', key: 'date', width: 14 },
        { header: 'Product', key: 'product', width: 18 },
        { header: 'Count', key: 'count', width: 10, style: { numFmt: EXCEL.number } },
        { header: 'Amount', key: 'amount', width: 16, style: { numFmt: EXCEL.currency } },
        { header: 'Avg Ticket Size', key: 'avgTicketSize', width: 16, style: { numFmt: EXCEL.currency } },
      ],
      losDaily.map(d => ({
        date: d.date,
        product: d.product,
        count: d.count,
        amount: d.amount,
        avgTicketSize: d.avgTicketSize,
      })),
      tabColor,
    );
  }

  await downloadWorkbook(wb, getFilename(1));
}
