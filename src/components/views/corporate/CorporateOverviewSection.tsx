'use client';

import { useMemo } from 'react';
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
} from '@mui/material';
import { LoadingSkeleton } from '@/components/common/LoadingSkeleton';
import { ChartContainer } from '@/components/charts/ChartContainer';
import { PDDistributionChart } from '@/components/charts/PDDistributionChart';
import { MaturityProfileChart } from '@/components/charts/MaturityProfileChart';
import { useD3Chart } from '@/hooks/useD3Chart';
import { useThemeMode } from '@/lib/theme-context';
import {
  useCorporatePortfolioMetrics,
  useCorporateTopCustomers,
  useCorporateTopDisbursements,
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
  CorporateMaturityRow,
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

// ── Collateral Donut (inline D3) ─────────────────────────────────
function OverviewCollateralDonut({ data }: { data: CorporateCollateralRow[] }) {
  const { formatCurrency } = useCurrencyFormat();
  const { d3Tokens } = useThemeMode();

  const ref = useD3Chart(
    (svg, width, height) => {
      const size = Math.min(width, height);
      const radius = size / 2 - 20;
      const innerRadius = radius * 0.55;
      const g = svg.append('g').attr('transform', `translate(${width / 2},${height / 2})`);

      const color = d3.scaleOrdinal<string>().domain(data.map((d) => d.collateralType)).range(d3.schemeSet2);

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
        .attr('opacity', 0.9)
        .on('mouseover', function () { d3.select(this).attr('opacity', 1); })
        .on('mouseout', function () { d3.select(this).attr('opacity', 0.9); });

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
          return `${d.data.collateralType}`;
        });

      const total = d3.sum(data, (d) => d.principalOS);
      g.append('text').attr('text-anchor', 'middle').attr('dy', '-0.3em')
        .attr('fill', d3Tokens.text).attr('font-size', '11px').attr('font-weight', 700).text('Collateral Mix');
      g.append('text').attr('text-anchor', 'middle').attr('dy', '1.2em')
        .attr('fill', d3Tokens.text).attr('font-size', '12px').attr('font-family', 'IBM Plex Mono, monospace')
        .attr('font-weight', 700).text(formatCurrency(total));
    },
    [data, d3Tokens],
  );

  return (
    <ChartContainer title="Collateral Mix" subtitle="By principal outstanding" empty={!data.length}>
      <svg ref={ref} width="100%" height="100%" style={{ overflow: 'visible' }} />
    </ChartContainer>
  );
}

// ── Top 20 Table (shared for Disbursements & POS) ────────────────
function Top20Table({
  title,
  data,
  amountField,
  amountLabel,
  formatCurrency,
}: {
  title: string;
  data: CorporateTopCustomerRow[];
  amountField: 'disbursedAmount' | 'currentPOS';
  amountLabel: string;
  formatCurrency: (v: number) => string;
}) {
  const totalAmount = data.reduce((s, r) => s + r[amountField], 0);
  const totalPCE = data.reduce((s, r) => s + r.pceAmount, 0);

  return (
    <Card sx={{ p: 2 }}>
      <Typography variant="subtitle2" sx={SECTION_TITLE}>{title}</Typography>
      {data.length === 0 ? (
        <Typography variant="caption" color="text.secondary">No data available</Typography>
      ) : (
        <TableContainer sx={{ maxHeight: 480 }}>
          <Table size="small" stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell sx={HDR}>#</TableCell>
                <TableCell sx={HDR}>Customer</TableCell>
                <TableCell align="right" sx={HDR}>{amountLabel}</TableCell>
                <TableCell align="right" sx={HDR}>% of Total</TableCell>
                <TableCell align="right" sx={HDR}>PCE</TableCell>
                <TableCell align="right" sx={HDR}>% Total PCE</TableCell>
                <TableCell align="right" sx={HDR}>IRR</TableCell>
                <TableCell sx={HDR}>Rating</TableCell>
                <TableCell sx={HDR}>Security Type</TableCell>
                <TableCell align="right" sx={HDR}>Security Cover</TableCell>
                <TableCell sx={HDR}>Industry</TableCell>
                <TableCell sx={HDR}>Sector</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {data.map((row, idx) => (
                <TableRow key={idx} hover>
                  <TableCell sx={CELL}>{idx + 1}</TableCell>
                  <TableCell sx={CELL_TEXT}>{row.customerName}</TableCell>
                  <TableCell align="right" sx={CELL}>{formatCurrency(row[amountField])}</TableCell>
                  <TableCell align="right" sx={CELL}>{totalAmount > 0 ? formatPercent(row[amountField] / totalAmount) : '—'}</TableCell>
                  <TableCell align="right" sx={CELL}>{formatCurrency(row.pceAmount)}</TableCell>
                  <TableCell align="right" sx={CELL}>{totalPCE > 0 ? formatPercent(row.pceAmount / totalPCE) : '—'}</TableCell>
                  <TableCell align="right" sx={CELL}>{row.irr != null ? formatPercent(row.irr) : '—'}</TableCell>
                  <TableCell sx={CELL_TEXT}>{row.riskRating}</TableCell>
                  <TableCell sx={CELL_TEXT}>{row.securityType}</TableCell>
                  <TableCell align="right" sx={CELL}>{row.securityCover > 0 ? `${row.securityCover.toFixed(2)}x` : '—'}</TableCell>
                  <TableCell sx={CELL_TEXT}>{row.industry}</TableCell>
                  <TableCell sx={CELL_TEXT}>{row.sector}</TableCell>
                </TableRow>
              ))}
              {/* Total row */}
              <TableRow sx={{ bgcolor: HDR_BG }}>
                <TableCell sx={{ ...CELL, fontWeight: 700 }} colSpan={2}>Total</TableCell>
                <TableCell align="right" sx={{ ...CELL, fontWeight: 700 }}>{formatCurrency(totalAmount)}</TableCell>
                <TableCell align="right" sx={{ ...CELL, fontWeight: 700 }}>100%</TableCell>
                <TableCell align="right" sx={{ ...CELL, fontWeight: 700 }}>{formatCurrency(totalPCE)}</TableCell>
                <TableCell align="right" sx={{ ...CELL, fontWeight: 700 }}>100%</TableCell>
                <TableCell colSpan={6} />
              </TableRow>
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Card>
  );
}

// ── Sector Pivot Table (shared for Disbursement & POS) ───────────
function SectorPivotTable({
  title,
  data,
  valueField,
  valueLabel,
  formatCurrency,
}: {
  title: string;
  data: CorporateIndustryConcentrationRow[];
  valueField: 'disbursement' | 'pos';
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
    <Card sx={{ p: 2 }}>
      <Typography variant="subtitle2" sx={SECTION_TITLE}>{title}</Typography>
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
              {periods.map((p) => (
                [
                  <TableCell key={`${p}-amt`} align="right" sx={HDR}>{valueLabel}</TableCell>,
                  <TableCell key={`${p}-pct`} align="right" sx={HDR}>% of Total</TableCell>,
                  <TableCell key={`${p}-irr`} align="right" sx={HDR}>IRR</TableCell>,
                ]
              ))}
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
            {/* Total row */}
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
    </Card>
  );
}

// ── Main Component ───────────────────────────────────────────────
export function CorporateOverviewSection({ scope }: Props) {
  const { formatCurrency, formatCurrencyMM } = useCurrencyFormat();

  const { data: portfolio, isLoading: l1 } = useCorporatePortfolioMetrics(scope);
  const { data: topDisbursements, isLoading: l2 } = useCorporateTopDisbursements(scope);
  const { data: topCustomers, isLoading: l3 } = useCorporateTopCustomers(scope);
  const { data: industry, isLoading: l4 } = useCorporateIndustryConcentration(scope);
  const { data: collateral, isLoading: l5 } = useCorporateCollateralAnalysis(scope);
  const { data: maturity, isLoading: l6 } = useCorporateMaturityProfile(scope);
  const { data: pdDist, isLoading: l7 } = useCorporatePDDistribution(scope);
  const { data: pipeline, isLoading: l8 } = useCorporatePipeline(scope);

  // Derive portfolio metrics periods
  const portfolioPeriods = useMemo(() => {
    if (!portfolio?.length) return [];
    const periods = Object.keys(portfolio[0].months);
    return sortPeriods(periods);
  }, [portfolio]);

  // Filter to flow-type particulars for section 1
  const flowMetrics = useMemo(() => {
    const flowParticulars = ['Disbursement (for the month)', 'Repayments (for the month)', 'Net Change', 'Growth Rate (in % vs earlier year)'];
    return (portfolio ?? []).filter((r) => flowParticulars.includes(r.particular));
  }, [portfolio]);

  // Maturity pivot: group by band → { fundBased, nonFund }
  const maturityPivot = useMemo(() => {
    const rows = maturity ?? [];
    const bands = Array.from(new Set(rows.map((r) => r.maturityBand)));
    const pivoted = bands.map((band) => {
      const fund = rows.find((r) => r.maturityBand === band && r.facilityBasis === 'Fund Based');
      const nonFund = rows.find((r) => r.maturityBand === band && r.facilityBasis === 'Non-Fund Based');
      return { band, fund, nonFund };
    });
    return pivoted;
  }, [maturity]);

  if (l1 || l2 || l3 || l4 || l5 || l6 || l7 || l8) return <LoadingSkeleton />;

  const collateralRows = collateral ?? [];
  const pdRows = pdDist ?? [];
  const pipelineRows = pipeline ?? [];
  const maturityRows = maturity ?? [];

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
      {/* ═══ 1. Disbursement (for the month) ═══ */}
      {flowMetrics.length > 0 && (
        <Card sx={{ p: 2 }}>
          <Typography variant="subtitle2" sx={SECTION_TITLE}>1. Disbursement (for the month)</Typography>
          <TableContainer>
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell rowSpan={2} sx={HDR}>Particulars</TableCell>
                  {portfolioPeriods.map((p) => (
                    <TableCell key={p} align="center" colSpan={3} sx={{ ...HDR, borderBottom: 0 }}>{p}</TableCell>
                  ))}
                </TableRow>
                <TableRow>
                  {portfolioPeriods.map((p) => [
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
                      {portfolioPeriods.map((p) => {
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
              </TableBody>
            </Table>
          </TableContainer>
        </Card>
      )}

      {/* ═══ 2. Top 20 Disbursements ═══ */}
      <Top20Table
        title="2. Top 20 Disbursements"
        data={topDisbursements ?? []}
        amountField="disbursedAmount"
        amountLabel="Amount"
        formatCurrency={formatCurrency}
      />

      {/* ═══ 3. Top 20 Customers (Principal O/s) ═══ */}
      <Top20Table
        title="3. Top 20 Customers (Principal O/s)"
        data={topCustomers ?? []}
        amountField="currentPOS"
        amountLabel="Amount"
        formatCurrency={formatCurrency}
      />

      {/* ═══ 4. Value of Disbursement ═══ */}
      <SectorPivotTable
        title="4. Value of Disbursement"
        data={industry ?? []}
        valueField="disbursement"
        valueLabel="Amount"
        formatCurrency={formatCurrency}
      />

      {/* ═══ 5. Current Principal O/s ═══ */}
      <SectorPivotTable
        title="5. Current Principal O/s"
        data={industry ?? []}
        valueField="pos"
        valueLabel="Amount"
        formatCurrency={formatCurrency}
      />

      {/* ═══ 6. Collateral Type ═══ */}
      {collateralRows.length > 0 && (
        <Card sx={{ p: 2 }}>
          <Typography variant="subtitle2" sx={SECTION_TITLE}>6. Collateral Type</Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} md={7}>
              <TableContainer sx={{ maxHeight: 440 }}>
                <Table size="small" stickyHeader>
                  <TableHead>
                    <TableRow>
                      <TableCell sx={HDR}>Collateral Type</TableCell>
                      <TableCell align="right" sx={HDR}>Sanctioned Amt</TableCell>
                      <TableCell align="right" sx={HDR}>Disbursed Amt</TableCell>
                      <TableCell align="right" sx={HDR}>Principal O/s</TableCell>
                      <TableCell align="right" sx={HDR}>% Total Principal</TableCell>
                      <TableCell sx={HDR}>Particulars / Requirement</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {collateralRows.map((row, idx) => (
                      <TableRow key={idx} hover>
                        <TableCell sx={CELL_TEXT}>{row.collateralType}</TableCell>
                        <TableCell align="right" sx={CELL}>{formatCurrency(row.sanctionedAmount)}</TableCell>
                        <TableCell align="right" sx={CELL}>{formatCurrency(row.disbursedAmount)}</TableCell>
                        <TableCell align="right" sx={CELL}>{formatCurrency(row.principalOS)}</TableCell>
                        <TableCell align="right" sx={CELL}>{formatPercent(row.principalShare)}</TableCell>
                        <TableCell sx={CELL_TEXT}>{row.particulars}</TableCell>
                      </TableRow>
                    ))}
                    <TableRow sx={{ bgcolor: HDR_BG }}>
                      <TableCell sx={{ ...CELL, fontWeight: 700 }}>Total</TableCell>
                      <TableCell align="right" sx={{ ...CELL, fontWeight: 700 }}>
                        {formatCurrency(collateralRows.reduce((s, r) => s + r.sanctionedAmount, 0))}
                      </TableCell>
                      <TableCell align="right" sx={{ ...CELL, fontWeight: 700 }}>
                        {formatCurrency(collateralRows.reduce((s, r) => s + r.disbursedAmount, 0))}
                      </TableCell>
                      <TableCell align="right" sx={{ ...CELL, fontWeight: 700 }}>
                        {formatCurrency(collateralRows.reduce((s, r) => s + r.principalOS, 0))}
                      </TableCell>
                      <TableCell align="right" sx={{ ...CELL, fontWeight: 700 }}>100%</TableCell>
                      <TableCell />
                    </TableRow>
                  </TableBody>
                </Table>
              </TableContainer>
            </Grid>
            <Grid item xs={12} md={5}>
              <OverviewCollateralDonut data={collateralRows} />
            </Grid>
          </Grid>
        </Card>
      )}

      {/* ═══ 7. PD Ratio ═══ */}
      {pdRows.length > 0 && (
        <Card sx={{ p: 2 }}>
          <Typography variant="subtitle2" sx={SECTION_TITLE}>7. PD Ratio</Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} md={7}>
              <TableContainer sx={{ maxHeight: 400 }}>
                <Table size="small" stickyHeader>
                  <TableHead>
                    <TableRow>
                      <TableCell sx={HDR}>PD Band</TableCell>
                      <TableCell align="right" sx={HDR}>Sanctioned Amt</TableCell>
                      <TableCell align="right" sx={HDR}>Disbursed Amt</TableCell>
                      <TableCell align="right" sx={HDR}>Principal O/s</TableCell>
                      <TableCell align="right" sx={HDR}>% Total Principal</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {pdRows.map((row, idx) => (
                      <TableRow key={idx} hover>
                        <TableCell sx={CELL_TEXT}>{row.pdBand}</TableCell>
                        <TableCell align="right" sx={CELL}>{formatCurrency(row.sanctionedAmount)}</TableCell>
                        <TableCell align="right" sx={CELL}>{formatCurrency(row.disbursedAmount)}</TableCell>
                        <TableCell align="right" sx={CELL}>{formatCurrency(row.principalOS)}</TableCell>
                        <TableCell align="right" sx={CELL}>{formatPercent(row.principalShare)}</TableCell>
                      </TableRow>
                    ))}
                    <TableRow sx={{ bgcolor: HDR_BG }}>
                      <TableCell sx={{ ...CELL, fontWeight: 700 }}>Total</TableCell>
                      <TableCell align="right" sx={{ ...CELL, fontWeight: 700 }}>
                        {formatCurrency(pdRows.reduce((s, r) => s + r.sanctionedAmount, 0))}
                      </TableCell>
                      <TableCell align="right" sx={{ ...CELL, fontWeight: 700 }}>
                        {formatCurrency(pdRows.reduce((s, r) => s + r.disbursedAmount, 0))}
                      </TableCell>
                      <TableCell align="right" sx={{ ...CELL, fontWeight: 700 }}>
                        {formatCurrency(pdRows.reduce((s, r) => s + r.principalOS, 0))}
                      </TableCell>
                      <TableCell align="right" sx={{ ...CELL, fontWeight: 700 }}>100%</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </TableContainer>
            </Grid>
            <Grid item xs={12} md={5}>
              <PDDistributionChart data={pdRows} />
            </Grid>
          </Grid>
        </Card>
      )}

      {/* ═══ 8. Maturity ═══ */}
      {maturityPivot.length > 0 && (
        <Card sx={{ p: 2 }}>
          <Typography variant="subtitle2" sx={SECTION_TITLE}>8. Maturity</Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} md={7}>
              <TableContainer sx={{ maxHeight: 400 }}>
                <Table size="small" stickyHeader>
                  <TableHead>
                    <TableRow>
                      <TableCell rowSpan={2} sx={HDR}>Maturity Band</TableCell>
                      <TableCell align="center" colSpan={4} sx={{ ...HDR, borderBottom: 0 }}>Fund Based</TableCell>
                      <TableCell align="center" colSpan={4} sx={{ ...HDR, borderBottom: 0 }}>Non-Fund Based</TableCell>
                    </TableRow>
                    <TableRow>
                      {['Sanctioned', 'Disbursed', 'Principal', '% Total'].map((h) => (
                        <TableCell key={`fb-${h}`} align="right" sx={HDR}>{h}</TableCell>
                      ))}
                      {['Sanctioned', 'Disbursed', 'Principal', '% Total'].map((h) => (
                        <TableCell key={`nfb-${h}`} align="right" sx={HDR}>{h}</TableCell>
                      ))}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {maturityPivot.map((row) => (
                      <TableRow key={row.band} hover>
                        <TableCell sx={CELL_TEXT}>{row.band}</TableCell>
                        {/* Fund Based */}
                        <TableCell align="right" sx={CELL}>{formatCurrency(row.fund?.sanctionedAmount ?? 0)}</TableCell>
                        <TableCell align="right" sx={CELL}>{formatCurrency(row.fund?.disbursedAmount ?? 0)}</TableCell>
                        <TableCell align="right" sx={CELL}>{formatCurrency(row.fund?.balance ?? 0)}</TableCell>
                        <TableCell align="right" sx={CELL}>{formatPercent(row.fund?.portfolioShare ?? 0)}</TableCell>
                        {/* Non-Fund Based */}
                        <TableCell align="right" sx={CELL}>{formatCurrency(row.nonFund?.sanctionedAmount ?? 0)}</TableCell>
                        <TableCell align="right" sx={CELL}>{formatCurrency(row.nonFund?.disbursedAmount ?? 0)}</TableCell>
                        <TableCell align="right" sx={CELL}>{formatCurrency(row.nonFund?.balance ?? 0)}</TableCell>
                        <TableCell align="right" sx={CELL}>{formatPercent(row.nonFund?.portfolioShare ?? 0)}</TableCell>
                      </TableRow>
                    ))}
                    {/* Total row */}
                    <TableRow sx={{ bgcolor: HDR_BG }}>
                      <TableCell sx={{ ...CELL, fontWeight: 700 }}>Total</TableCell>
                      {(() => {
                        const fundRows = maturityPivot.map((r) => r.fund).filter(Boolean) as CorporateMaturityRow[];
                        const nfRows = maturityPivot.map((r) => r.nonFund).filter(Boolean) as CorporateMaturityRow[];
                        return [
                          <TableCell key="ft-s" align="right" sx={{ ...CELL, fontWeight: 700 }}>{formatCurrency(fundRows.reduce((s, r) => s + r.sanctionedAmount, 0))}</TableCell>,
                          <TableCell key="ft-d" align="right" sx={{ ...CELL, fontWeight: 700 }}>{formatCurrency(fundRows.reduce((s, r) => s + r.disbursedAmount, 0))}</TableCell>,
                          <TableCell key="ft-p" align="right" sx={{ ...CELL, fontWeight: 700 }}>{formatCurrency(fundRows.reduce((s, r) => s + r.balance, 0))}</TableCell>,
                          <TableCell key="ft-pct" align="right" sx={{ ...CELL, fontWeight: 700 }}>100%</TableCell>,
                          <TableCell key="nf-s" align="right" sx={{ ...CELL, fontWeight: 700 }}>{formatCurrency(nfRows.reduce((s, r) => s + r.sanctionedAmount, 0))}</TableCell>,
                          <TableCell key="nf-d" align="right" sx={{ ...CELL, fontWeight: 700 }}>{formatCurrency(nfRows.reduce((s, r) => s + r.disbursedAmount, 0))}</TableCell>,
                          <TableCell key="nf-p" align="right" sx={{ ...CELL, fontWeight: 700 }}>{formatCurrency(nfRows.reduce((s, r) => s + r.balance, 0))}</TableCell>,
                          <TableCell key="nf-pct" align="right" sx={{ ...CELL, fontWeight: 700 }}>100%</TableCell>,
                        ];
                      })()}
                    </TableRow>
                  </TableBody>
                </Table>
              </TableContainer>
            </Grid>
            <Grid item xs={12} md={5}>
              <MaturityProfileChart data={maturityRows} />
            </Grid>
          </Grid>
        </Card>
      )}

      {/* ═══ 9. Pipeline & Drawdown ═══ */}
      {pipelineRows.length > 0 && (
        <Card sx={{ p: 2 }}>
          <Typography variant="subtitle2" sx={SECTION_TITLE}>9. Pipeline & Drawdown</Typography>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={HDR}>Stage</TableCell>
                  <TableCell align="right" sx={HDR}>Gross (USD Mn)</TableCell>
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
        </Card>
      )}
    </Box>
  );
}
