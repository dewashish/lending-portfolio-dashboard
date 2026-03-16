'use client';

import { useState, useEffect, useMemo } from 'react';
import * as d3 from 'd3';
import {
  Box,
  Card,
  Typography,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  TableContainer,
  Grid,
  Chip,
  Tabs,
  Tab,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import { LoadingSkeleton } from '@/components/common/LoadingSkeleton';
import { ChartContainer } from '@/components/charts/ChartContainer';
import { PDDistributionChart } from '@/components/charts/PDDistributionChart';
import { MaturityProfileChart } from '@/components/charts/MaturityProfileChart';
import { SectorBreakdownChart } from '@/components/charts/SectorBreakdownChart';
import { PipelineHorizontalChart } from '@/components/charts/PipelineHorizontalChart';
import { KPIRow } from '@/components/cards/KPIRow';
import type { KPIItem } from '@/components/cards/KPIRow';
import { useD3Chart } from '@/hooks/useD3Chart';
import { useThemeMode } from '@/lib/theme-context';
import {
  useCorporatePortfolioMetrics,
  useCorporateTopCustomers,
  useCorporateTopDisbursements,
  useCorporateTopSanctioned,
  useCorporateIndustryConcentration,
  useCorporateCollateralAnalysis,
  useCorporateMaturityProfile,
  useCorporatePDDistribution,
  useCorporatePipeline,
} from '@/hooks/useCorporateData';
import { formatPercent } from '@/lib/format';
import { useCurrencyFormat } from '@/lib/currency-context';
import type {
  ScopeSelection,
  CorporateCollateralRow,
  CorporateTopCustomerRow,
  CorporateIndustryConcentrationRow,
} from '@/lib/types';

interface Props {
  scope?: ScopeSelection;
}

// ── Styling constants ────────────────────────────────────────────
const HDR = { fontWeight: 700, fontSize: '0.65rem', textTransform: 'uppercase' as const, letterSpacing: '0.04em' };
const CELL = { fontSize: '0.72rem', fontFamily: 'IBM Plex Mono, monospace' };
const CELL_TEXT = { fontSize: '0.72rem' };
const SECTION_TITLE = { fontWeight: 700, fontSize: '0.82rem', mb: 1.5 };
const HDR_BG = 'rgba(0,0,0,0.03)';
// ── Helpers ──────────────────────────────────────────────────────
function utilizationColor(ratio: number): string {
  if (ratio <= 0.75) return '#4caf50';
  if (ratio <= 0.90) return '#ff9800';
  return '#f44336';
}

function sortPeriods(periods: string[]): string[] {
  const monthOrder: Record<string, number> = {
    Jan: 1, Feb: 2, Mar: 3, Apr: 4, May: 5, Jun: 6,
    Jul: 7, Aug: 8, Sep: 9, Oct: 10, Nov: 11, Dec: 12,
  };
  return [...periods].sort((a, b) => {
    const [mA, yA] = [a.slice(0, 3), a.replace(/[^0-9]/g, '')];
    const [mB, yB] = [b.slice(0, 3), b.replace(/[^0-9]/g, '')];
    if (yA !== yB) return +yA - +yB;
    return (monthOrder[mA] ?? 0) - (monthOrder[mB] ?? 0);
  });
}

// ── Collateral Donut (inline D3 with tooltip + click) ────────────
function OverviewCollateralDonut({
  data,
  activeFilter,
  onSliceClick,
}: {
  data: CorporateCollateralRow[];
  activeFilter: string | null;
  onSliceClick: (type: string | null) => void;
}) {
  const { formatCurrency } = useCurrencyFormat();
  const { d3Tokens } = useThemeMode();

  const ref = useD3Chart(
    (svg, width, height) => {
      d3.selectAll('.collateral-donut-tooltip').remove();

      const tooltip = d3.select('body').append('div')
        .attr('class', 'collateral-donut-tooltip')
        .style('position', 'absolute')
        .style('pointer-events', 'none')
        .style('opacity', '0')
        .style('background', d3Tokens.tooltipBg)
        .style('border', `1px solid ${d3Tokens.tooltipBorder}`)
        .style('border-radius', '8px')
        .style('padding', '12px 16px')
        .style('font-size', '12px')
        .style('color', d3Tokens.tooltipText)
        .style('box-shadow', '0 4px 12px rgba(0,0,0,0.15)')
        .style('z-index', '9999')
        .style('max-width', '280px')
        .style('line-height', '1.5');

      const size = Math.min(width, height);
      const radius = size / 2 - 20;
      const innerRadius = radius * 0.55;
      const g = svg.append('g').attr('transform', `translate(${width / 2},${height / 2})`);

      const color = d3.scaleOrdinal<string>().domain(data.map((d) => d.collateralType)).range(d3.schemeSet2);
      const total = d3.sum(data, (d) => d.principalOS);

      const pie = d3
        .pie<CorporateCollateralRow>()
        .value((d) => d.principalOS)
        .sort(null)
        .padAngle(0.02);

      const arc = d3
        .arc<d3.PieArcDatum<CorporateCollateralRow>>()
        .innerRadius(innerRadius)
        .outerRadius(radius)
        .cornerRadius(4);

      g.selectAll('.slice')
        .data(pie(data))
        .join('path')
        .attr('class', 'slice')
        .attr('d', arc)
        .attr('fill', (d) => color(d.data.collateralType))
        .attr('opacity', (d) => (!activeFilter || activeFilter === d.data.collateralType) ? 0.9 : 0.3)
        .attr('stroke', (d) => activeFilter === d.data.collateralType ? d3Tokens.text : 'none')
        .attr('stroke-width', (d) => activeFilter === d.data.collateralType ? 2 : 0)
        .style('cursor', 'pointer')
        .on('mouseover', function (event, d) {
          d3.select(this).attr('opacity', 1).attr('stroke', d3Tokens.text).attr('stroke-width', 1.5);
          tooltip.html(`
            <div style="font-weight:600;margin-bottom:4px">${d.data.collateralType}</div>
            <table style="border-collapse:collapse;width:100%">
              <tr><td style="padding:1px 8px 1px 0">Principal O/s</td><td style="text-align:right;font-family:monospace">${formatCurrency(d.data.principalOS)}</td></tr>
              <tr><td style="padding:1px 8px 1px 0">Share</td><td style="text-align:right;font-family:monospace">${total > 0 ? formatPercent(d.data.principalOS / total) : '—'}</td></tr>
              <tr><td style="padding:1px 8px 1px 0">Sanctioned</td><td style="text-align:right;font-family:monospace">${formatCurrency(d.data.sanctionedAmount)}</td></tr>
              <tr><td style="padding:1px 8px 1px 0">Disbursed</td><td style="text-align:right;font-family:monospace">${formatCurrency(d.data.disbursedAmount)}</td></tr>
              <tr><td style="padding:1px 8px 1px 0">Coverage</td><td style="text-align:right;font-family:monospace">${d.data.coverageRatio.toFixed(2)}x</td></tr>
            </table>
          `).style('opacity', '1');
          const ttNode = tooltip.node() as HTMLDivElement;
          let left = event.pageX + 16;
          const top = event.pageY - 20;
          if (left + ttNode.offsetWidth > window.innerWidth - 8) left = event.pageX - ttNode.offsetWidth - 16;
          tooltip.style('left', `${left}px`).style('top', `${Math.max(8, top)}px`);
        })
        .on('mouseout', function (_, d) {
          const isActive = activeFilter === d.data.collateralType;
          d3.select(this)
            .attr('opacity', (!activeFilter || isActive) ? 0.9 : 0.3)
            .attr('stroke', isActive ? d3Tokens.text : 'none')
            .attr('stroke-width', isActive ? 2 : 0);
          tooltip.style('opacity', '0');
        })
        .on('click', function (_, d) {
          onSliceClick(activeFilter === d.data.collateralType ? null : d.data.collateralType);
        });

      // Labels
      const labelArc = d3
        .arc<d3.PieArcDatum<CorporateCollateralRow>>()
        .innerRadius(radius + 12)
        .outerRadius(radius + 12);

      g.selectAll('.label')
        .data(pie(data))
        .join('text')
        .attr('class', 'label')
        .attr('transform', (d) => `translate(${labelArc.centroid(d)})`)
        .attr('text-anchor', (d) => {
          const mid = (d.startAngle + d.endAngle) / 2;
          return mid < Math.PI ? 'start' : 'end';
        })
        .attr('fill', d3Tokens.textMuted)
        .attr('font-size', '8px')
        .text((d) => {
          if (d.endAngle - d.startAngle < 0.35) return '';
          return d.data.collateralType;
        });

      // Center label
      g.append('text').attr('text-anchor', 'middle').attr('dy', '-0.3em')
        .attr('fill', d3Tokens.text).attr('font-size', '11px').attr('font-weight', 700).text('Collateral Mix');
      g.append('text').attr('text-anchor', 'middle').attr('dy', '1.2em')
        .attr('fill', d3Tokens.text).attr('font-size', '12px').attr('font-family', 'IBM Plex Mono, monospace')
        .attr('font-weight', 700).text(formatCurrency(total));
    },
    [data, d3Tokens, activeFilter],
  );

  return (
    <ChartContainer title="Collateral Mix" subtitle="Click a slice to filter" empty={!data.length}>
      <svg ref={ref} width="100%" height="100%" style={{ overflow: 'visible' }} />
    </ChartContainer>
  );
}

// ── Top N Table ──────────────────────────────────────────────────
function TopNTable({
  data,
  amountField,
  amountLabel,
  formatCurrency,
}: {
  data: CorporateTopCustomerRow[];
  amountField: 'disbursedAmount' | 'currentPOS' | 'sanctionedLimit';
  amountLabel: string;
  formatCurrency: (v: number) => string;
}) {
  const totalAmount = data.reduce((s, r) => s + r[amountField], 0);
  const totalPCE = data.reduce((s, r) => s + r.pceAmount, 0);
  const totalSL = data.reduce((s, r) => s + r.sanctionedLimit, 0);
  const totalDL = data.reduce((s, r) => s + r.disbursementLimit, 0);
  const totalPOS = data.reduce((s, r) => s + r.currentPOS, 0);

  if (data.length === 0) return <Typography variant="caption" color="text.secondary">No data available</Typography>;

  return (
    <TableContainer sx={{ maxHeight: 480 }}>
      <Table size="small" stickyHeader>
        <TableHead>
          <TableRow>
            <TableCell sx={HDR}>#</TableCell>
            <TableCell sx={HDR}>Customer</TableCell>
            <TableCell align="right" sx={HDR}>Sanction Limit</TableCell>
            <TableCell align="right" sx={HDR}>Disburse Limit</TableCell>
            <TableCell align="right" sx={HDR}>{amountLabel}</TableCell>
            <TableCell align="right" sx={HDR}>POS</TableCell>
            <TableCell align="right" sx={HDR}>POS/SL %</TableCell>
            <TableCell align="right" sx={HDR}>POS/DL %</TableCell>
            <TableCell align="right" sx={HDR}>PCE</TableCell>
            <TableCell align="right" sx={HDR}>IRR</TableCell>
            <TableCell sx={HDR}>Rating</TableCell>
            <TableCell sx={HDR}>Security</TableCell>
            <TableCell align="right" sx={HDR}>Cover</TableCell>
            <TableCell sx={HDR}>Industry</TableCell>
            <TableCell sx={HDR}>Sector</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {data.map((row, idx) => {
            const posSL = row.sanctionedLimit > 0 ? row.currentPOS / row.sanctionedLimit : null;
            const posDL = row.disbursementLimit > 0 ? row.currentPOS / row.disbursementLimit : null;
            return (
              <TableRow key={idx} hover>
                <TableCell sx={CELL}>{idx + 1}</TableCell>
                <TableCell sx={{ ...CELL_TEXT, maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.customerName}</TableCell>
                <TableCell align="right" sx={CELL}>{formatCurrency(row.sanctionedLimit)}</TableCell>
                <TableCell align="right" sx={CELL}>{formatCurrency(row.disbursementLimit)}</TableCell>
                <TableCell align="right" sx={CELL}>{formatCurrency(row[amountField])}</TableCell>
                <TableCell align="right" sx={CELL}>{formatCurrency(row.currentPOS)}</TableCell>
                <TableCell align="right" sx={{ ...CELL, color: posSL != null ? utilizationColor(posSL) : undefined }}>{posSL != null ? formatPercent(posSL) : '—'}</TableCell>
                <TableCell align="right" sx={{ ...CELL, color: posDL != null ? utilizationColor(posDL) : undefined }}>{posDL != null ? formatPercent(posDL) : '—'}</TableCell>
                <TableCell align="right" sx={CELL}>{formatCurrency(row.pceAmount)}</TableCell>
                <TableCell align="right" sx={CELL}>{row.irr != null ? formatPercent(row.irr) : '—'}</TableCell>
                <TableCell sx={CELL_TEXT}>{row.riskRating}</TableCell>
                <TableCell sx={CELL_TEXT}>{row.securityType}</TableCell>
                <TableCell align="right" sx={CELL}>{row.securityCover > 0 ? `${row.securityCover.toFixed(1)}x` : '—'}</TableCell>
                <TableCell sx={CELL_TEXT}>{row.industry}</TableCell>
                <TableCell sx={CELL_TEXT}>{row.sector}</TableCell>
              </TableRow>
            );
          })}
          <TableRow sx={{ bgcolor: HDR_BG }}>
            <TableCell sx={{ ...CELL, fontWeight: 700 }} colSpan={2}>Total</TableCell>
            <TableCell align="right" sx={{ ...CELL, fontWeight: 700 }}>{formatCurrency(totalSL)}</TableCell>
            <TableCell align="right" sx={{ ...CELL, fontWeight: 700 }}>{formatCurrency(totalDL)}</TableCell>
            <TableCell align="right" sx={{ ...CELL, fontWeight: 700 }}>{formatCurrency(totalAmount)}</TableCell>
            <TableCell align="right" sx={{ ...CELL, fontWeight: 700 }}>{formatCurrency(totalPOS)}</TableCell>
            <TableCell align="right" sx={{ ...CELL, fontWeight: 700, color: totalSL > 0 ? utilizationColor(totalPOS / totalSL) : undefined }}>{totalSL > 0 ? formatPercent(totalPOS / totalSL) : '—'}</TableCell>
            <TableCell align="right" sx={{ ...CELL, fontWeight: 700, color: totalDL > 0 ? utilizationColor(totalPOS / totalDL) : undefined }}>{totalDL > 0 ? formatPercent(totalPOS / totalDL) : '—'}</TableCell>
            <TableCell align="right" sx={{ ...CELL, fontWeight: 700 }}>{formatCurrency(totalPCE)}</TableCell>
            <TableCell colSpan={6} />
          </TableRow>
        </TableBody>
      </Table>
    </TableContainer>
  );
}

// ── Sector Pivot Table ───────────────────────────────────────────
function SectorPivotTable({
  data,
  valueField,
  valueLabel,
  formatCurrency,
}: {
  data: CorporateIndustryConcentrationRow[];
  valueField: 'disbursement' | 'pos' | 'sanctioned';
  valueLabel: string;
  formatCurrency: (v: number) => string;
}) {
  const { sectors, periods, grid, periodTotals } = useMemo(() => {
    if (!data.length) return { sectors: [], periods: [], grid: new Map(), periodTotals: new Map() };
    const pSet = new Set(data.map((d) => d.period));
    const sortedPeriods = sortPeriods(Array.from(pSet));
    const sSet = new Set(data.map((d) => d.sector));
    const sortedSectors = Array.from(sSet);

    const g = new Map<string, Map<string, { value: number; irr: number | null }>>();
    const pTotals = new Map<string, number>();
    sortedPeriods.forEach((p) => pTotals.set(p, 0));

    data.forEach((row) => {
      if (!g.has(row.sector)) g.set(row.sector, new Map());
      g.get(row.sector)!.set(row.period, { value: row[valueField], irr: row.irr });
      pTotals.set(row.period, (pTotals.get(row.period) ?? 0) + row[valueField]);
    });

    return { sectors: sortedSectors, periods: sortedPeriods, grid: g, periodTotals: pTotals };
  }, [data, valueField]);

  if (!sectors.length) return null;

  return (
    <TableContainer sx={{ maxHeight: 400 }}>
      <Table size="small" stickyHeader>
        <TableHead>
          <TableRow>
            <TableCell rowSpan={2} sx={HDR}>Sector</TableCell>
            {periods.map((p) => (
              <TableCell key={p} align="center" colSpan={3} sx={{ ...HDR, borderBottom: 0 }}>{p}</TableCell>
            ))}
          </TableRow>
          <TableRow>
            {periods.map((p) => [
              <TableCell key={`${p}-amt`} align="right" sx={HDR}>{valueLabel}</TableCell>,
              <TableCell key={`${p}-pct`} align="right" sx={HDR}>% Total</TableCell>,
              <TableCell key={`${p}-irr`} align="right" sx={HDR}>IRR</TableCell>,
            ])}
          </TableRow>
        </TableHead>
        <TableBody>
          {sectors.map((sector) => (
            <TableRow key={sector} hover>
              <TableCell sx={CELL_TEXT}>{sector}</TableCell>
              {periods.map((p) => {
                const cell = grid.get(sector)?.get(p);
                const val = cell?.value ?? 0;
                const total = periodTotals.get(p) ?? 1;
                return [
                  <TableCell key={`${sector}-${p}-amt`} align="right" sx={CELL}>{formatCurrency(val)}</TableCell>,
                  <TableCell key={`${sector}-${p}-pct`} align="right" sx={CELL}>{total > 0 ? formatPercent(val / total) : '—'}</TableCell>,
                  <TableCell key={`${sector}-${p}-irr`} align="right" sx={CELL}>{cell?.irr != null ? formatPercent(cell.irr) : '—'}</TableCell>,
                ];
              })}
            </TableRow>
          ))}
          <TableRow sx={{ bgcolor: HDR_BG }}>
            <TableCell sx={{ ...CELL, fontWeight: 700 }}>Total</TableCell>
            {periods.map((p) => {
              const total = periodTotals.get(p) ?? 0;
              return [
                <TableCell key={`total-${p}-amt`} align="right" sx={{ ...CELL, fontWeight: 700 }}>{formatCurrency(total)}</TableCell>,
                <TableCell key={`total-${p}-pct`} align="right" sx={{ ...CELL, fontWeight: 700 }}>100%</TableCell>,
                <TableCell key={`total-${p}-irr`} />,
              ];
            })}
          </TableRow>
        </TableBody>
      </Table>
    </TableContainer>
  );
}

// ── Main Component ───────────────────────────────────────────────
export function CorporateOverviewSection({ scope }: Props) {
  const { formatCurrency, formatCurrencyMM } = useCurrencyFormat();

  // ── Data hooks ──
  const { data: portfolio, isLoading: l1 } = useCorporatePortfolioMetrics(scope);
  const { data: topDisbursements, isLoading: l2 } = useCorporateTopDisbursements(scope);
  const { data: topCustomers, isLoading: l3 } = useCorporateTopCustomers(scope);
  const { data: topSanctioned, isLoading: l9 } = useCorporateTopSanctioned(scope);
  const { data: industry, isLoading: l4 } = useCorporateIndustryConcentration(scope);
  const { data: collateral, isLoading: l5 } = useCorporateCollateralAnalysis(scope);
  const { data: maturity, isLoading: l6 } = useCorporateMaturityProfile(scope);
  const { data: pdDist, isLoading: l7 } = useCorporatePDDistribution(scope);
  const { data: pipelineData, isLoading: l8 } = useCorporatePipeline(scope);

  // ── State ──
  const [selectedPeriods, setSelectedPeriods] = useState<string[]>([]);
  const [topN, setTopN] = useState<number>(20);
  const [customerTab, setCustomerTab] = useState<'disbursement' | 'pos' | 'sanctioned'>('disbursement');
  const [sectorTab, setSectorTab] = useState<'disbursement' | 'pos' | 'sanctioned'>('disbursement');
  const [collateralFilter, setCollateralFilter] = useState<string | null>(null);

  // ── Derived data ──
  const allPeriods = useMemo(() => {
    if (!portfolio?.length) return [];
    return sortPeriods(Object.keys(portfolio[0].months));
  }, [portfolio]);

  // Initialize to last 3 periods
  useEffect(() => {
    if (allPeriods.length > 0 && selectedPeriods.length === 0) {
      setSelectedPeriods(allPeriods.slice(-3));
    }
  }, [allPeriods, selectedPeriods.length]);

  const visiblePeriods = useMemo(() => {
    return allPeriods.filter((p) => selectedPeriods.includes(p));
  }, [allPeriods, selectedPeriods]);

  // Flow-type metrics for disbursement table
  const flowMetrics = useMemo(() => {
    const flowParticulars = ['Disbursement (for the month)', 'Repayments (for the month)', 'Net Change', 'Growth Rate (in % vs earlier year)'];
    return (portfolio ?? []).filter((r) => flowParticulars.includes(r.particular));
  }, [portfolio]);

  // Utilization rows (SL % and DL %) for disbursement flow table
  const utilizationRows = useMemo(() => {
    if (!portfolio?.length) return [];
    const outstandingRow = portfolio.find((r) => r.particular === 'Outstanding');
    const sanctionedRow = portfolio.find((r) => r.particular === 'Sanctioned Limit');
    const disbLimitRow = portfolio.find((r) => r.particular === 'Disbursement Limit');

    if (!outstandingRow || !sanctionedRow) return [];

    const num = (v: number | string): number => (typeof v === 'number' ? v : 0);
    const rows: typeof portfolio = [];

    // Utilization (SL %)
    const slMonths: Record<string, { total: number; fundBased: number; nonFB: number }> = {};
    Object.keys(outstandingRow.months).forEach((period) => {
      const o = outstandingRow.months[period];
      const s = sanctionedRow.months[period];
      if (o && s) {
        const oT = num(o.total), oF = num(o.fundBased), oN = num(o.nonFB);
        const sT = num(s.total), sF = num(s.fundBased), sN = num(s.nonFB);
        slMonths[period] = {
          total: sT > 0 ? oT / sT : 0,
          fundBased: sF > 0 ? oF / sF : 0,
          nonFB: sN > 0 ? oN / sN : 0,
        };
      }
    });
    rows.push({ particular: 'Utilization (SL %)', months: slMonths });

    // Utilization (DL %)
    if (disbLimitRow) {
      const dlMonths: Record<string, { total: number; fundBased: number; nonFB: number }> = {};
      Object.keys(outstandingRow.months).forEach((period) => {
        const o = outstandingRow.months[period];
        const d = disbLimitRow.months[period];
        if (o && d) {
          const oT = num(o.total), oF = num(o.fundBased), oN = num(o.nonFB);
          const dT = num(d.total), dF = num(d.fundBased), dN = num(d.nonFB);
          dlMonths[period] = {
            total: dT > 0 ? oT / dT : 0,
            fundBased: dF > 0 ? oF / dF : 0,
            nonFB: dN > 0 ? oN / dN : 0,
          };
        }
      });
      rows.push({ particular: 'Utilization (DL %)', months: dlMonths });
    }

    return rows;
  }, [portfolio]);

  // KPI items from latest period
  const kpiItems = useMemo((): KPIItem[] => {
    if (!portfolio?.length || !visiblePeriods.length) return [];
    const latestPeriod = visiblePeriods[visiblePeriods.length - 1];
    const prevPeriod = visiblePeriods.length >= 2 ? visiblePeriods[visiblePeriods.length - 2] : null;

    const findRow = (particular: string) => portfolio.find((r) => r.particular === particular);

    const getValue = (row: typeof portfolio[0] | undefined, period: string) => {
      const val = row?.months[period]?.total;
      return typeof val === 'number' ? val : 0;
    };

    const computeTrend = (row: typeof portfolio[0] | undefined) => {
      if (!prevPeriod || !row) return undefined;
      const curr = getValue(row, latestPeriod);
      const prev = getValue(row, prevPeriod);
      if (prev === 0) return undefined;
      return { value: (curr - prev) / Math.abs(prev) };
    };

    const disbRow = findRow('Disbursement (for the month)');
    const repayRow = findRow('Repayments (for the month)');
    const netRow = findRow('Net Change');
    const growthRow = findRow('Growth Rate (in % vs earlier year)');
    const posRow = findRow('Outstanding');
    const sanctionRow = findRow('Sanctioned Limit');

    const items: KPIItem[] = [];

    if (disbRow) {
      items.push({
        label: 'Disbursement',
        value: formatCurrency(getValue(disbRow, latestPeriod)),
        trend: computeTrend(disbRow),
        subtitle: latestPeriod,
        sparkline: visiblePeriods.map((p) => getValue(disbRow, p)),
      });
    }
    if (repayRow) {
      items.push({
        label: 'Repayment',
        value: formatCurrency(getValue(repayRow, latestPeriod)),
        trend: computeTrend(repayRow),
        subtitle: latestPeriod,
        invertTrend: true,
        sparkline: visiblePeriods.map((p) => getValue(repayRow, p)),
      });
    }
    if (netRow) {
      const netVal = getValue(netRow, latestPeriod);
      items.push({
        label: 'Net Change',
        value: formatCurrency(netVal),
        subtitle: latestPeriod,
        color: netVal >= 0 ? '#66bb6a' : '#ef5350',
      });
    }
    if (growthRow) {
      const gVal = getValue(growthRow, latestPeriod);
      items.push({
        label: 'Growth Rate',
        value: formatPercent(gVal),
        subtitle: latestPeriod,
      });
    }
    if (posRow) {
      items.push({
        label: 'Outstanding',
        value: formatCurrency(getValue(posRow, latestPeriod)),
        trend: computeTrend(posRow),
        sparkline: visiblePeriods.map((p) => getValue(posRow, p)),
      });
    }
    if (sanctionRow) {
      items.push({
        label: 'Sanctioned',
        value: formatCurrency(getValue(sanctionRow, latestPeriod)),
        subtitle: latestPeriod,
      });
    }

    // Utilization KPIs
    if (posRow && sanctionRow) {
      const posVal = getValue(posRow, latestPeriod);
      const slVal = getValue(sanctionRow, latestPeriod);
      items.push({
        label: '% Sanctioned Used',
        value: formatPercent(slVal > 0 ? posVal / slVal : 0),
        subtitle: latestPeriod,
        info: 'Outstanding / Sanctioned Limit',
      });
    }

    const disbLimitRow = findRow('Disbursement Limit');
    if (posRow && disbLimitRow) {
      const posVal = getValue(posRow, latestPeriod);
      const dlVal = getValue(disbLimitRow, latestPeriod);
      items.push({
        label: '% Disbursed Used',
        value: formatPercent(dlVal > 0 ? posVal / dlVal : 0),
        subtitle: latestPeriod,
        info: 'Outstanding / Disbursement Limit',
      });
    }

    return items;
  }, [portfolio, visiblePeriods, formatCurrency]);

  // Top N customer data based on tab
  const visibleTopCustomers = useMemo(() => {
    const source = customerTab === 'disbursement'
      ? (topDisbursements ?? [])
      : customerTab === 'sanctioned'
        ? (topSanctioned ?? [])
        : (topCustomers ?? []);
    return topN === -1 ? source : source.slice(0, topN);
  }, [customerTab, topDisbursements, topCustomers, topSanctioned, topN]);

  // Maturity pivot
  const maturityPivot = useMemo(() => {
    const rows = maturity ?? [];
    const bands = Array.from(new Set(rows.map((r) => r.maturityBand)));
    return bands.map((band) => ({
      band,
      fund: rows.find((r) => r.maturityBand === band && r.facilityBasis === 'Fund Based'),
      nonFund: rows.find((r) => r.maturityBand === band && r.facilityBasis === 'Non-Fund Based'),
    }));
  }, [maturity]);

  // Collateral aggregated by collateralType (dedup for Group scope)
  const aggregatedCollateral = useMemo(() => {
    const rows = collateral ?? [];
    const map = new Map<string, CorporateCollateralRow>();
    rows.forEach((r) => {
      const existing = map.get(r.collateralType);
      if (existing) {
        existing.facilityCount += r.facilityCount;
        existing.collateralValue += r.collateralValue;
        existing.exposureCovered += r.exposureCovered;
        existing.sanctionedAmount += r.sanctionedAmount;
        existing.disbursedAmount += r.disbursedAmount;
        existing.principalOS += r.principalOS;
      } else {
        map.set(r.collateralType, { ...r });
      }
    });
    // Recompute coverage ratio and principal share
    const totalPOS = Array.from(map.values()).reduce((s, r) => s + r.principalOS, 0);
    map.forEach((r) => {
      r.coverageRatio = r.exposureCovered > 0 ? r.collateralValue / r.exposureCovered : 0;
      r.principalShare = totalPOS > 0 ? r.principalOS / totalPOS : 0;
    });
    return Array.from(map.values());
  }, [collateral]);

  // Collateral filtered by donut click
  const visibleCollateral = useMemo(() => {
    return collateralFilter ? aggregatedCollateral.filter((r) => r.collateralType === collateralFilter) : aggregatedCollateral;
  }, [aggregatedCollateral, collateralFilter]);

  // ── Period toggle helpers ──
  const togglePeriod = (p: string) => {
    setSelectedPeriods((prev) =>
      prev.includes(p) ? prev.filter((x) => x !== p) : sortPeriods([...prev, p]),
    );
  };

  const setPeriodPreset = (n: number) => {
    if (n === -1) setSelectedPeriods([...allPeriods]);
    else setSelectedPeriods(allPeriods.slice(-n));
  };

  // ── Loading ──
  if (l1 || l2 || l3 || l4 || l5 || l6 || l7 || l8 || l9) return <LoadingSkeleton />;

  const pdRows = pdDist ?? [];
  const pipelineRows = pipelineData ?? [];
  const maturityRows = maturity ?? [];

  // Periods to use for tables — fall back to allPeriods before useEffect fires
  const tablePeriods = visiblePeriods.length > 0 ? visiblePeriods : allPeriods;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>

      {/* ═══════════════════════════════════════════════════════════════
          PERIOD FILTER (applies to everything below)
          ═══════════════════════════════════════════════════════════════ */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
        <Typography variant="caption" sx={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'text.secondary', mr: 1 }}>
          Period
        </Typography>
        {[
          { label: 'Last 3', value: 3 },
          { label: 'Last 6', value: 6 },
          { label: 'All', value: -1 },
        ].map(({ label, value }) => (
          <Chip
            key={label}
            label={label}
            size="small"
            variant={
              (value === -1 && selectedPeriods.length === allPeriods.length) ||
              (value !== -1 && selectedPeriods.length === value && selectedPeriods.join() === allPeriods.slice(-value).join())
                ? 'filled' : 'outlined'
            }
            color={
              (value === -1 && selectedPeriods.length === allPeriods.length) ||
              (value !== -1 && selectedPeriods.length === value && selectedPeriods.join() === allPeriods.slice(-value).join())
                ? 'primary' : 'default'
            }
            onClick={() => setPeriodPreset(value)}
            sx={{ fontWeight: 600, fontSize: '0.68rem' }}
          />
        ))}
        <Box sx={{ borderLeft: '1px solid', borderColor: 'divider', pl: 1, ml: 0.5, display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
          {allPeriods.map((p) => (
            <Chip
              key={p}
              label={p}
              size="small"
              variant={selectedPeriods.includes(p) ? 'filled' : 'outlined'}
              color={selectedPeriods.includes(p) ? 'primary' : 'default'}
              onClick={() => togglePeriod(p)}
              sx={{ fontSize: '0.65rem' }}
            />
          ))}
        </Box>
      </Box>

      {/* ═══════════════════════════════════════════════════════════════
          PORTFOLIO SUMMARY TABLE
          ═══════════════════════════════════════════════════════════════ */}
      {(portfolio ?? []).length > 0 && tablePeriods.length > 0 && (
        <Card sx={{ p: 2 }}>
          <Typography variant="subtitle2" sx={SECTION_TITLE}>Portfolio Summary</Typography>
          <TableContainer sx={{ overflowX: 'auto' }}>
            <Table size="small" stickyHeader sx={{ minWidth: tablePeriods.length > 3 ? tablePeriods.length * 320 : undefined }}>
              <TableHead>
                <TableRow>
                  <TableCell rowSpan={2} sx={{ ...HDR, position: 'sticky', left: 0, zIndex: 3, bgcolor: 'background.paper' }}>Particular</TableCell>
                  {tablePeriods.map((p) => (
                    <TableCell key={p} align="center" colSpan={3} sx={{ ...HDR, borderBottom: 0 }}>{p}</TableCell>
                  ))}
                </TableRow>
                <TableRow>
                  {tablePeriods.map((p) => [
                    <TableCell key={`${p}-t`} align="right" sx={HDR}>Total</TableCell>,
                    <TableCell key={`${p}-f`} align="right" sx={HDR}>Fund Based</TableCell>,
                    <TableCell key={`${p}-n`} align="right" sx={HDR}>Non-FB</TableCell>,
                  ])}
                </TableRow>
              </TableHead>
              <TableBody>
                {(portfolio ?? []).map((row, idx) => {
                  const isGrowthRate = row.particular.includes('Growth Rate');
                  const isPercent = isGrowthRate;
                  return (
                    <TableRow key={idx} hover>
                      <TableCell sx={{ ...CELL_TEXT, fontWeight: 600, position: 'sticky', left: 0, bgcolor: 'background.paper', zIndex: 1 }}>{row.particular}</TableCell>
                      {tablePeriods.map((p) => {
                        const v = row.months[p];
                        if (!v) return [<TableCell key={`${p}-t`} />, <TableCell key={`${p}-f`} />, <TableCell key={`${p}-n`} />];
                        const fmt = isPercent
                          ? (val: number | string) => typeof val === 'number' ? formatPercent(val) : String(val)
                          : (val: number | string) => typeof val === 'number' ? formatCurrency(val) : String(val);
                        return [
                          <TableCell key={`${p}-t`} align="right" sx={CELL}>{fmt(v.total)}</TableCell>,
                          <TableCell key={`${p}-f`} align="right" sx={CELL}>{fmt(v.fundBased)}</TableCell>,
                          <TableCell key={`${p}-n`} align="right" sx={CELL}>{fmt(v.nonFB)}</TableCell>,
                        ];
                      })}
                    </TableRow>
                  );
                })}
                {utilizationRows.map((row, idx) => (
                  <TableRow key={`util-${idx}`} hover sx={{ bgcolor: 'rgba(0,0,0,0.02)' }}>
                    <TableCell sx={{ ...CELL_TEXT, fontWeight: 600, fontStyle: 'italic', position: 'sticky', left: 0, bgcolor: 'background.paper', zIndex: 1 }}>{row.particular}</TableCell>
                    {tablePeriods.map((p) => {
                      const v = row.months[p];
                      if (!v) return [<TableCell key={`${p}-t`} />, <TableCell key={`${p}-f`} />, <TableCell key={`${p}-n`} />];
                      const t = Number(v.total), f = Number(v.fundBased), n = Number(v.nonFB);
                      return [
                        <TableCell key={`${p}-t`} align="right" sx={{ ...CELL, color: utilizationColor(t) }}>{formatPercent(t)}</TableCell>,
                        <TableCell key={`${p}-f`} align="right" sx={{ ...CELL, color: utilizationColor(f) }}>{formatPercent(f)}</TableCell>,
                        <TableCell key={`${p}-n`} align="right" sx={{ ...CELL, color: utilizationColor(n) }}>{formatPercent(n)}</TableCell>,
                      ];
                    })}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Card>
      )}

      {/* ═══════════════════════════════════════════════════════════════
          GROUP A: PORTFOLIO KPIs + DISBURSEMENT FLOW
          ═══════════════════════════════════════════════════════════════ */}

      <Card sx={{ p: 2 }}>
        {/* KPI Strip */}
        {kpiItems.length > 0 && (
          <Box sx={{ mb: 2 }}>
            <KPIRow items={kpiItems} />
          </Box>
        )}

        {/* Disbursement Flow Table */}
        {flowMetrics.length > 0 && visiblePeriods.length > 0 && (
          <>
            <Typography variant="subtitle2" sx={SECTION_TITLE}>Disbursement Flow</Typography>
            <TableContainer>
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell rowSpan={2} sx={HDR}>Particulars</TableCell>
                    {visiblePeriods.map((p) => (
                      <TableCell key={p} align="center" colSpan={3} sx={{ ...HDR, borderBottom: 0 }}>{p}</TableCell>
                    ))}
                  </TableRow>
                  <TableRow>
                    {visiblePeriods.map((p) => [
                      <TableCell key={`${p}-t`} align="right" sx={HDR}>Total</TableCell>,
                      <TableCell key={`${p}-f`} align="right" sx={HDR}>Fund Based</TableCell>,
                      <TableCell key={`${p}-n`} align="right" sx={HDR}>Non-FB</TableCell>,
                    ])}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {flowMetrics.map((row, idx) => {
                    const isGrowthRate = row.particular.includes('Growth Rate');
                    return (
                      <TableRow key={idx} hover>
                        <TableCell sx={{ ...CELL_TEXT, fontWeight: 600 }}>{row.particular}</TableCell>
                        {visiblePeriods.map((p) => {
                          const v = row.months[p];
                          if (!v) return [<TableCell key={`${p}-t`} />, <TableCell key={`${p}-f`} />, <TableCell key={`${p}-n`} />];
                          const fmt = isGrowthRate
                            ? (val: number | string) => typeof val === 'number' ? formatPercent(val) : String(val)
                            : (val: number | string) => typeof val === 'number' ? formatCurrency(val) : String(val);
                          return [
                            <TableCell key={`${p}-t`} align="right" sx={CELL}>{fmt(v.total)}</TableCell>,
                            <TableCell key={`${p}-f`} align="right" sx={CELL}>{fmt(v.fundBased)}</TableCell>,
                            <TableCell key={`${p}-n`} align="right" sx={CELL}>{fmt(v.nonFB)}</TableCell>,
                          ];
                        })}
                      </TableRow>
                    );
                  })}
                  {utilizationRows.map((row, idx) => (
                    <TableRow key={`util-${idx}`} hover sx={{ bgcolor: 'rgba(0,0,0,0.02)' }}>
                      <TableCell sx={{ ...CELL_TEXT, fontWeight: 600, fontStyle: 'italic' }}>{row.particular}</TableCell>
                      {visiblePeriods.map((p) => {
                        const v = row.months[p];
                        if (!v) return [<TableCell key={`${p}-t`} />, <TableCell key={`${p}-f`} />, <TableCell key={`${p}-n`} />];
                        const t = Number(v.total), f = Number(v.fundBased), n = Number(v.nonFB);
                        return [
                          <TableCell key={`${p}-t`} align="right" sx={{ ...CELL, color: utilizationColor(t) }}>{formatPercent(t)}</TableCell>,
                          <TableCell key={`${p}-f`} align="right" sx={{ ...CELL, color: utilizationColor(f) }}>{formatPercent(f)}</TableCell>,
                          <TableCell key={`${p}-n`} align="right" sx={{ ...CELL, color: utilizationColor(n) }}>{formatPercent(n)}</TableCell>,
                        ];
                      })}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </>
        )}
      </Card>

      {/* ═══════════════════════════════════════════════════════════════
          GROUP B: CUSTOMER CONCENTRATION
          ═══════════════════════════════════════════════════════════════ */}

      {/* Top N Customers + Sector Chart */}
      <Card sx={{ p: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5, flexWrap: 'wrap', gap: 1 }}>
          <Tabs
            value={customerTab}
            onChange={(_, v) => setCustomerTab(v)}
            sx={{ minHeight: 32, '& .MuiTab-root': { minHeight: 32, py: 0.5, textTransform: 'none', fontSize: '0.75rem', fontWeight: 600 } }}
          >
            <Tab label="Top Disbursements" value="disbursement" />
            <Tab label="Top Principal O/s" value="pos" />
            <Tab label="Top Sanctioned" value="sanctioned" />
          </Tabs>
          <FormControl size="small" sx={{ minWidth: 90 }}>
            <InputLabel sx={{ fontSize: '0.72rem' }}>Show</InputLabel>
            <Select
              value={topN}
              label="Show"
              onChange={(e) => setTopN(Number(e.target.value))}
              sx={{ fontSize: '0.72rem' }}
            >
              <MenuItem value={10}>Top 10</MenuItem>
              <MenuItem value={20}>Top 20</MenuItem>
              <MenuItem value={50}>Top 50</MenuItem>
              <MenuItem value={-1}>All</MenuItem>
            </Select>
          </FormControl>
        </Box>
        <Grid container spacing={2}>
          <Grid item xs={12} md={4}>
            <SectorBreakdownChart
              data={industry ?? []}
              period={visiblePeriods[visiblePeriods.length - 1] ?? ''}
              valueField={customerTab === 'pos' ? 'pos' : customerTab === 'sanctioned' ? 'sanctioned' : 'disbursement'}
            />
          </Grid>
          <Grid item xs={12} md={8}>
            <TopNTable
              data={visibleTopCustomers}
              amountField={customerTab === 'disbursement' ? 'disbursedAmount' : customerTab === 'sanctioned' ? 'sanctionedLimit' : 'currentPOS'}
              amountLabel={customerTab === 'disbursement' ? 'Disbursed' : customerTab === 'sanctioned' ? 'Sanctioned' : 'Principal O/s'}
              formatCurrency={formatCurrency}
            />
          </Grid>
        </Grid>
      </Card>

      {/* Sector Pivot Table */}
      <Card sx={{ p: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
          <Tabs
            value={sectorTab}
            onChange={(_, v) => setSectorTab(v)}
            sx={{ minHeight: 32, '& .MuiTab-root': { minHeight: 32, py: 0.5, textTransform: 'none', fontSize: '0.75rem', fontWeight: 600 } }}
          >
            <Tab label="Sector Disbursement" value="disbursement" />
            <Tab label="Sector Principal O/s" value="pos" />
            <Tab label="Sector Sanctioned" value="sanctioned" />
          </Tabs>
        </Box>
        <SectorPivotTable
          data={industry ?? []}
          valueField={sectorTab}
          valueLabel={sectorTab === 'disbursement' ? 'Disbursed' : sectorTab === 'sanctioned' ? 'Sanctioned' : 'Principal'}
          formatCurrency={formatCurrency}
        />
      </Card>

      {/* ═══════════════════════════════════════════════════════════════
          GROUP C: RISK & PORTFOLIO STRUCTURE
          ═══════════════════════════════════════════════════════════════ */}

      {/* Charts Row */}
      <Grid container spacing={2}>
        <Grid item xs={12} md={4}>
          <OverviewCollateralDonut
            data={aggregatedCollateral}
            activeFilter={collateralFilter}
            onSliceClick={setCollateralFilter}
          />
        </Grid>
        <Grid item xs={12} md={4}>
          <PDDistributionChart data={pdRows} />
        </Grid>
        <Grid item xs={12} md={4}>
          <MaturityProfileChart data={maturityRows} />
        </Grid>
      </Grid>

      {/* Tables Row */}
      <Grid container spacing={2}>
        {/* Collateral Table */}
        <Grid item xs={12} md={4}>
          <Card sx={{ p: 1.5 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, fontSize: '0.75rem' }}>Collateral Detail</Typography>
              {collateralFilter && (
                <Chip label={collateralFilter} size="small" onDelete={() => setCollateralFilter(null)} sx={{ fontSize: '0.65rem' }} />
              )}
            </Box>
            <TableContainer sx={{ maxHeight: 320 }}>
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell sx={HDR}>Type</TableCell>
                    <TableCell align="right" sx={HDR}>Principal O/s</TableCell>
                    <TableCell align="right" sx={HDR}>% Total</TableCell>
                    <TableCell sx={HDR}>Particulars</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {visibleCollateral.map((row, idx) => (
                    <TableRow key={idx} hover>
                      <TableCell sx={CELL_TEXT}>{row.collateralType}</TableCell>
                      <TableCell align="right" sx={CELL}>{formatCurrency(row.principalOS)}</TableCell>
                      <TableCell align="right" sx={CELL}>{formatPercent(row.principalShare)}</TableCell>
                      <TableCell sx={{ ...CELL_TEXT, maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.particulars}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Card>
        </Grid>

        {/* PD Table */}
        <Grid item xs={12} md={4}>
          <Card sx={{ p: 1.5 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, fontSize: '0.75rem', mb: 1 }}>PD Distribution</Typography>
            <TableContainer sx={{ maxHeight: 320 }}>
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell sx={HDR}>PD Band</TableCell>
                    <TableCell align="right" sx={HDR}>Principal O/s</TableCell>
                    <TableCell align="right" sx={HDR}>% Total</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {pdRows.map((row, idx) => (
                    <TableRow key={idx} hover>
                      <TableCell sx={CELL_TEXT}>{row.pdBand}</TableCell>
                      <TableCell align="right" sx={CELL}>{formatCurrency(row.principalOS)}</TableCell>
                      <TableCell align="right" sx={CELL}>{formatPercent(row.principalShare)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Card>
        </Grid>

        {/* Maturity Table */}
        <Grid item xs={12} md={4}>
          <Card sx={{ p: 1.5 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, fontSize: '0.75rem', mb: 1 }}>Maturity Detail</Typography>
            <TableContainer sx={{ maxHeight: 320 }}>
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell sx={HDR}>Band</TableCell>
                    <TableCell align="right" sx={HDR}>Fund</TableCell>
                    <TableCell align="right" sx={HDR}>Non-Fund</TableCell>
                    <TableCell align="right" sx={HDR}>% Total</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {maturityPivot.map((row) => (
                    <TableRow key={row.band} hover>
                      <TableCell sx={CELL_TEXT}>{row.band}</TableCell>
                      <TableCell align="right" sx={CELL}>{formatCurrency(row.fund?.balance ?? 0)}</TableCell>
                      <TableCell align="right" sx={CELL}>{formatCurrency(row.nonFund?.balance ?? 0)}</TableCell>
                      <TableCell align="right" sx={CELL}>{formatPercent((row.fund?.portfolioShare ?? 0) + (row.nonFund?.portfolioShare ?? 0))}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Card>
        </Grid>
      </Grid>

      {/* ═══════════════════════════════════════════════════════════════
          GROUP D: PIPELINE & DRAWDOWN
          ═══════════════════════════════════════════════════════════════ */}
      {pipelineRows.length > 0 && (
        <Card sx={{ p: 2 }}>
          <Typography variant="subtitle2" sx={SECTION_TITLE}>Pipeline & Drawdown</Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} md={5}>
              <PipelineHorizontalChart data={pipelineRows} />
            </Grid>
            <Grid item xs={12} md={7}>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell sx={HDR}>Stage</TableCell>
                      <TableCell align="right" sx={HDR}>Gross Amount</TableCell>
                      <TableCell align="right" sx={HDR}>Product (Bid)</TableCell>
                      <TableCell align="right" sx={HDR}>PCR %</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {pipelineRows.map((row, idx) => (
                      <TableRow key={idx} hover>
                        <TableCell sx={CELL_TEXT}>{row.stage}</TableCell>
                        <TableCell align="right" sx={CELL}>{formatCurrencyMM(row.grossAmount)}</TableCell>
                        <TableCell align="right" sx={CELL}>{formatCurrencyMM(row.productBid)}</TableCell>
                        <TableCell align="right" sx={CELL}>{formatPercent(row.pcrPct)}</TableCell>
                      </TableRow>
                    ))}
                    <TableRow sx={{ bgcolor: HDR_BG }}>
                      <TableCell sx={{ ...CELL, fontWeight: 700 }}>Total</TableCell>
                      <TableCell align="right" sx={{ ...CELL, fontWeight: 700 }}>
                        {formatCurrencyMM(pipelineRows.reduce((s, r) => s + r.grossAmount, 0))}
                      </TableCell>
                      <TableCell align="right" sx={{ ...CELL, fontWeight: 700 }}>
                        {formatCurrencyMM(pipelineRows.reduce((s, r) => s + r.productBid, 0))}
                      </TableCell>
                      <TableCell align="right" sx={{ ...CELL, fontWeight: 700 }}>
                        {formatPercent(
                          pipelineRows.reduce((s, r) => s + r.grossAmount, 0) > 0
                            ? pipelineRows.reduce((s, r) => s + r.pcrPct * r.grossAmount, 0) / pipelineRows.reduce((s, r) => s + r.grossAmount, 0)
                            : 0,
                        )}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </TableContainer>
            </Grid>
          </Grid>
        </Card>
      )}
    </Box>
  );
}
