'use client';

import { useMemo, useState } from 'react';
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
  Tabs,
  Tab,
} from '@mui/material';
import { LoadingSkeleton } from '@/components/common/LoadingSkeleton';
import { ChartContainer } from '@/components/charts/ChartContainer';
import { LTVDistributionChart } from '@/components/charts/LTVDistributionChart';
import { MaturityProfileChart } from '@/components/charts/MaturityProfileChart';
import { useD3Chart } from '@/hooks/useD3Chart';
import { useThemeMode } from '@/lib/theme-context';
import {
  useCorporateCollateralAnalysis,
  useCorporateLTVDistribution,
  useCorporateMaturityProfile,
} from '@/hooks/useCorporateData';
import { formatPercent, formatNumber } from '@/lib/format';
import { useCurrencyFormat } from '@/lib/currency-context';
import type { ScopeSelection, CorporateCollateralRow } from '@/lib/types';

// ── Styling constants ────────────────────────────────────────────
const HDR = { fontWeight: 700, fontSize: '0.65rem', textTransform: 'uppercase' as const, letterSpacing: '0.04em' };
const CELL = { fontSize: '0.72rem', fontFamily: 'IBM Plex Mono, monospace' };
const CELL_TEXT = { fontSize: '0.72rem' };
const HDR_BG = 'rgba(0,0,0,0.03)';

interface Props {
  scope?: ScopeSelection;
}

// ── Collateral Donut with Tooltip ────────────────────────────────
const TOOLTIP_CLASS = 'collateral-donut-tooltip';

function CollateralDonut({ data, valueField }: { data: CorporateCollateralRow[]; valueField: 'principalOS' | 'sanctionedAmount' | 'disbursedAmount' }) {
  const { formatCurrency } = useCurrencyFormat();
  const { d3Tokens } = useThemeMode();

  const metricLabel: Record<typeof valueField, string> = {
    principalOS: 'Total POS',
    sanctionedAmount: 'Total Sanctioned',
    disbursedAmount: 'Total Disbursed',
  };

  const metricName: Record<typeof valueField, string> = {
    principalOS: 'POS',
    sanctionedAmount: 'Sanctioned',
    disbursedAmount: 'Disbursed',
  };

  const ref = useD3Chart(
    (svg, width, height) => {
      d3.selectAll(`.${TOOLTIP_CLASS}`).remove();

      const tooltip = d3.select('body').append('div')
        .attr('class', TOOLTIP_CLASS)
        .style('position', 'absolute')
        .style('pointer-events', 'none')
        .style('opacity', '0')
        .style('background', d3Tokens.tooltipBg)
        .style('border', `1px solid ${d3Tokens.tooltipBorder}`)
        .style('border-radius', '8px')
        .style('padding', '10px 14px')
        .style('font-size', '11px')
        .style('color', d3Tokens.tooltipText)
        .style('box-shadow', '0 4px 12px rgba(0,0,0,0.3)')
        .style('z-index', '9999')
        .style('max-width', '300px')
        .style('line-height', '1.6')
        .style('transition', 'opacity 0.15s ease');

      const mutedColor = d3Tokens.textMuted;

      const size = Math.min(width, height);
      const radius = size / 2 - 20;
      const innerRadius = radius * 0.55;
      const g = svg
        .append('g')
        .attr('transform', `translate(${width / 2},${height / 2})`);

      const color = d3.scaleOrdinal<string>().domain(data.map((d) => d.collateralType)).range(d3.schemeSet2);

      const pie = d3
        .pie<CorporateCollateralRow>()
        .value((d) => d[valueField])
        .sort(null)
        .padAngle(0.02);

      const arc = d3
        .arc<d3.PieArcDatum<CorporateCollateralRow>>()
        .innerRadius(innerRadius)
        .outerRadius(radius)
        .cornerRadius(4);

      const total = d3.sum(data, (d) => d[valueField]);

      // Slices
      const arcs = g.selectAll('.slice')
        .data(pie(data))
        .join('g')
        .attr('class', 'slice');

      // All three metric fields for tooltip context
      const allFields: Array<'principalOS' | 'sanctionedAmount' | 'disbursedAmount'> = ['principalOS', 'sanctionedAmount', 'disbursedAmount'];
      const otherFields = allFields.filter((f) => f !== valueField);

      arcs.append('path')
        .attr('d', arc)
        .attr('fill', (d) => color(d.data.collateralType))
        .attr('opacity', 0.9)
        .style('cursor', 'pointer')
        .on('mouseover', function (_event, d) {
          d3.select(this).attr('opacity', 1).attr('stroke', d3Tokens.text).attr('stroke-width', 2);
          const share = total > 0 ? d.data[valueField] / total : 0;
          tooltip.html(
            `<div style="font-weight:700;font-size:12px;margin-bottom:4px">${d.data.collateralType}</div>` +
            `<div><span style="color:${mutedColor}">${metricName[valueField]}:</span> <b>${formatCurrency(d.data[valueField])}</b></div>` +
            otherFields.map((f) => `<div><span style="color:${mutedColor}">${metricName[f]}:</span> ${formatCurrency(d.data[f])}</div>`).join('') +
            `<div><span style="color:${mutedColor}">Collateral Value:</span> ${formatCurrency(d.data.collateralValue)}</div>` +
            `<div><span style="color:${mutedColor}">Coverage Ratio:</span> ${formatPercent(d.data.coverageRatio)}</div>` +
            `<div><span style="color:${mutedColor}">Facilities:</span> ${d.data.facilityCount}</div>` +
            `<div><span style="color:${mutedColor}">Share:</span> <b>${formatPercent(share, 1)}</b></div>`
          ).style('opacity', '1');
          const ttNode = tooltip.node() as HTMLDivElement;
          const ttW = ttNode.offsetWidth;
          let left = (_event as unknown as MouseEvent).pageX + 12;
          let top = (_event as unknown as MouseEvent).pageY - 10;
          if (left + ttW > window.innerWidth - 8) left = (_event as unknown as MouseEvent).pageX - ttW - 12;
          if (top < 8) top = 8;
          tooltip.style('left', `${left}px`).style('top', `${top}px`);
        })
        .on('mousemove', function (_event) {
          const ttNode = tooltip.node() as HTMLDivElement;
          const ttW = ttNode.offsetWidth;
          let left = (_event as unknown as MouseEvent).pageX + 12;
          let top = (_event as unknown as MouseEvent).pageY - 10;
          if (left + ttW > window.innerWidth - 8) left = (_event as unknown as MouseEvent).pageX - ttW - 12;
          if (top < 8) top = 8;
          tooltip.style('left', `${left}px`).style('top', `${top}px`);
        })
        .on('mouseout', function () {
          d3.select(this).attr('opacity', 0.9).attr('stroke', 'none');
          tooltip.style('opacity', '0');
        });

      // Percentage labels on slices > 10%
      const labelArc = d3
        .arc<d3.PieArcDatum<CorporateCollateralRow>>()
        .innerRadius(radius * 0.78)
        .outerRadius(radius * 0.78);

      arcs.filter(d => total > 0 && d.data[valueField] / total > 0.10)
        .append('text')
        .attr('transform', d => `translate(${labelArc.centroid(d)})`)
        .attr('text-anchor', 'middle')
        .attr('fill', '#ffffff')
        .attr('font-size', '11px')
        .attr('font-weight', 700)
        .attr('pointer-events', 'none')
        .text(d => formatPercent(d.data[valueField] / total, 1));

      // Center label
      g.append('text')
        .attr('text-anchor', 'middle')
        .attr('dy', '-0.3em')
        .attr('fill', d3Tokens.text)
        .attr('font-size', '11px')
        .attr('font-weight', 700)
        .text(metricLabel[valueField]);
      g.append('text')
        .attr('text-anchor', 'middle')
        .attr('dy', '1em')
        .attr('fill', d3Tokens.text)
        .attr('font-size', '12px')
        .attr('font-family', 'IBM Plex Mono, monospace')
        .attr('font-weight', 700)
        .text(formatCurrency(total));

      // Legend
      const legend = svg.append('g').attr('transform', `translate(${width - 110},${12})`);
      data.forEach((d, i) => {
        const row = legend.append('g').attr('transform', `translate(0,${i * 16})`);
        row.append('rect').attr('width', 10).attr('height', 10).attr('rx', 2).attr('fill', color(d.collateralType));
        row.append('text').attr('x', 14).attr('y', 9).attr('fill', d3Tokens.textMuted).attr('font-size', '9px')
          .text(d.collateralType.length > 14 ? d.collateralType.slice(0, 13) + '...' : d.collateralType);
      });
    },
    [data, d3Tokens, formatCurrency, valueField],
  );

  return (
    <ChartContainer title="Collateral Breakdown" subtitle={`By collateral type (${metricName[valueField]})`} empty={!data.length}>
      <svg ref={ref} width="100%" height="100%" style={{ overflow: 'visible' }} />
    </ChartContainer>
  );
}

// ── Main Section Component ───────────────────────────────────────
export function CorporateCollateralSection({ scope }: Props) {
  const { formatCurrency } = useCurrencyFormat();
  const { data: collateral, isLoading: loadingCollateral } = useCorporateCollateralAnalysis(scope);
  const { data: ltv, isLoading: loadingLTV } = useCorporateLTVDistribution(scope);
  const { data: maturity, isLoading: loadingMaturity } = useCorporateMaturityProfile(scope);

  // Distribution basis state
  const [distBasis, setDistBasis] = useState<'pos' | 'sanctioned' | 'disbursed'>('pos');

  // Aggregate collateral rows by type (dedup at Group scope)
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
    const totalPOS = Array.from(map.values()).reduce((s, r) => s + r.principalOS, 0);
    map.forEach((r) => {
      r.coverageRatio = r.exposureCovered > 0 ? r.collateralValue / r.exposureCovered : 0;
      r.principalShare = totalPOS > 0 ? r.principalOS / totalPOS : 0;
    });
    return Array.from(map.values());
  }, [collateral]);

  if (loadingCollateral || loadingLTV || loadingMaturity) return <LoadingSkeleton />;

  const ltvRows = ltv ?? [];
  const maturityRows = maturity ?? [];

  // Totals for collateral table
  const collateralTotals = {
    facilityCount: aggregatedCollateral.reduce((s, r) => s + r.facilityCount, 0),
    sanctionedAmount: aggregatedCollateral.reduce((s, r) => s + r.sanctionedAmount, 0),
    disbursedAmount: aggregatedCollateral.reduce((s, r) => s + r.disbursedAmount, 0),
    principalOS: aggregatedCollateral.reduce((s, r) => s + r.principalOS, 0),
    collateralValue: aggregatedCollateral.reduce((s, r) => s + r.collateralValue, 0),
    exposureCovered: aggregatedCollateral.reduce((s, r) => s + r.exposureCovered, 0),
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
      {/* Distribution basis selector */}
      <Tabs
        value={distBasis}
        onChange={(_, v) => setDistBasis(v)}
        sx={{ mb: 2, minHeight: 32, '& .MuiTab-root': { minHeight: 32, py: 0.5, textTransform: 'none', fontSize: '0.75rem', fontWeight: 600 } }}
      >
        <Tab label="By POS" value="pos" />
        <Tab label="By Sanctioned" value="sanctioned" />
        <Tab label="By Disbursed" value="disbursed" />
      </Tabs>

      {/* Charts row: 3 charts */}
      <Grid container spacing={2}>
        <Grid item xs={12} md={4}>
          <CollateralDonut data={aggregatedCollateral} valueField={distBasis === 'pos' ? 'principalOS' : distBasis === 'sanctioned' ? 'sanctionedAmount' : 'disbursedAmount'} />
        </Grid>
        <Grid item xs={12} md={4}>
          <LTVDistributionChart data={ltvRows} />
        </Grid>
        <Grid item xs={12} md={4}>
          <MaturityProfileChart data={maturityRows} />
        </Grid>
      </Grid>

      {/* Collateral Coverage Detail Table (enhanced) */}
      <Card sx={{ p: 2 }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 700, fontSize: '0.8rem', mb: 2 }}>
          Collateral Coverage Detail
        </Typography>
        {aggregatedCollateral.length === 0 ? (
          <Typography variant="caption" color="text.secondary">No collateral data available</Typography>
        ) : (
          <TableContainer sx={{ maxHeight: 480 }}>
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow sx={{ bgcolor: HDR_BG }}>
                  <TableCell sx={HDR}>Collateral Type</TableCell>
                  <TableCell sx={HDR}>Particulars</TableCell>
                  <TableCell align="right" sx={HDR}>Facilities</TableCell>
                  <TableCell align="right" sx={{ ...HDR, ...(distBasis === 'sanctioned' && { bgcolor: 'rgba(25,118,210,0.08)', fontWeight: 800 }) }}>Sanctioned</TableCell>
                  <TableCell align="right" sx={{ ...HDR, ...(distBasis === 'disbursed' && { bgcolor: 'rgba(25,118,210,0.08)', fontWeight: 800 }) }}>Disbursed</TableCell>
                  <TableCell align="right" sx={{ ...HDR, ...(distBasis === 'pos' && { bgcolor: 'rgba(25,118,210,0.08)', fontWeight: 800 }) }}>POS</TableCell>
                  <TableCell align="right" sx={HDR}>Collateral Value</TableCell>
                  <TableCell align="right" sx={HDR}>Exposure Covered</TableCell>
                  <TableCell align="right" sx={HDR}>Coverage Ratio</TableCell>
                  <TableCell align="right" sx={HDR}>Principal Share</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {aggregatedCollateral.map((row, idx) => (
                  <TableRow key={idx} hover>
                    <TableCell sx={CELL_TEXT}>{row.collateralType}</TableCell>
                    <TableCell sx={{ ...CELL_TEXT, maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {row.particulars || '—'}
                    </TableCell>
                    <TableCell align="right" sx={CELL}>{formatNumber(row.facilityCount)}</TableCell>
                    <TableCell align="right" sx={{ ...CELL, ...(distBasis === 'sanctioned' && { fontWeight: 700, bgcolor: 'rgba(25,118,210,0.04)' }) }}>{formatCurrency(row.sanctionedAmount)}</TableCell>
                    <TableCell align="right" sx={{ ...CELL, ...(distBasis === 'disbursed' && { fontWeight: 700, bgcolor: 'rgba(25,118,210,0.04)' }) }}>{formatCurrency(row.disbursedAmount)}</TableCell>
                    <TableCell align="right" sx={{ ...CELL, ...(distBasis === 'pos' && { fontWeight: 700, bgcolor: 'rgba(25,118,210,0.04)' }) }}>{formatCurrency(row.principalOS)}</TableCell>
                    <TableCell align="right" sx={CELL}>{formatCurrency(row.collateralValue)}</TableCell>
                    <TableCell align="right" sx={CELL}>{formatCurrency(row.exposureCovered)}</TableCell>
                    <TableCell
                      align="right"
                      sx={{
                        ...CELL,
                        color: row.coverageRatio >= 1 ? '#4caf50' : row.coverageRatio >= 0.5 ? '#ff9800' : '#f44336',
                      }}
                    >
                      {row.coverageRatio.toFixed(2)}x
                    </TableCell>
                    <TableCell align="right" sx={CELL}>{formatPercent(row.principalShare)}</TableCell>
                  </TableRow>
                ))}
                {/* Total row */}
                <TableRow sx={{ bgcolor: '#fff9c4' }}>
                  <TableCell sx={{ ...CELL_TEXT, fontWeight: 700 }}>Total</TableCell>
                  <TableCell sx={CELL_TEXT} />
                  <TableCell align="right" sx={{ ...CELL, fontWeight: 700 }}>{formatNumber(collateralTotals.facilityCount)}</TableCell>
                  <TableCell align="right" sx={{ ...CELL, fontWeight: 700, ...(distBasis === 'sanctioned' && { bgcolor: 'rgba(25,118,210,0.06)' }) }}>{formatCurrency(collateralTotals.sanctionedAmount)}</TableCell>
                  <TableCell align="right" sx={{ ...CELL, fontWeight: 700, ...(distBasis === 'disbursed' && { bgcolor: 'rgba(25,118,210,0.06)' }) }}>{formatCurrency(collateralTotals.disbursedAmount)}</TableCell>
                  <TableCell align="right" sx={{ ...CELL, fontWeight: 700, ...(distBasis === 'pos' && { bgcolor: 'rgba(25,118,210,0.06)' }) }}>{formatCurrency(collateralTotals.principalOS)}</TableCell>
                  <TableCell align="right" sx={{ ...CELL, fontWeight: 700 }}>{formatCurrency(collateralTotals.collateralValue)}</TableCell>
                  <TableCell align="right" sx={{ ...CELL, fontWeight: 700 }}>{formatCurrency(collateralTotals.exposureCovered)}</TableCell>
                  <TableCell align="right" sx={{ ...CELL, fontWeight: 700 }}>
                    {collateralTotals.exposureCovered > 0 ? (collateralTotals.collateralValue / collateralTotals.exposureCovered).toFixed(2) : '—'}x
                  </TableCell>
                  <TableCell align="right" sx={{ ...CELL, fontWeight: 700 }}>100%</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Card>

      {/* LTV Distribution Table (enhanced) */}
      <Card sx={{ p: 2 }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 700, fontSize: '0.8rem', mb: 2 }}>
          LTV Distribution
        </Typography>
        {ltvRows.length === 0 ? (
          <Typography variant="caption" color="text.secondary">No LTV data available</Typography>
        ) : (
          <TableContainer sx={{ maxHeight: 480 }}>
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow sx={{ bgcolor: HDR_BG }}>
                  <TableCell sx={HDR}>LTV Band</TableCell>
                  <TableCell align="right" sx={HDR}>Facilities</TableCell>
                  <TableCell align="right" sx={HDR}>Sanctioned</TableCell>
                  <TableCell align="right" sx={HDR}>Disbursed</TableCell>
                  <TableCell align="right" sx={HDR}>POS</TableCell>
                  <TableCell align="right" sx={HDR}>Balance</TableCell>
                  <TableCell align="right" sx={HDR}>Portfolio Share</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {ltvRows.map((row, idx) => (
                  <TableRow key={idx} hover>
                    <TableCell sx={CELL_TEXT}>{row.ltvBand}</TableCell>
                    <TableCell align="right" sx={CELL}>{formatNumber(row.facilityCount)}</TableCell>
                    <TableCell align="right" sx={CELL}>{row.sanctioned ? formatCurrency(row.sanctioned) : '—'}</TableCell>
                    <TableCell align="right" sx={CELL}>{row.disbursed ? formatCurrency(row.disbursed) : '—'}</TableCell>
                    <TableCell align="right" sx={CELL}>{row.pos ? formatCurrency(row.pos) : '—'}</TableCell>
                    <TableCell align="right" sx={CELL}>{formatCurrency(row.balance)}</TableCell>
                    <TableCell align="right" sx={CELL}>{formatPercent(row.portfolioShare)}</TableCell>
                  </TableRow>
                ))}
                {/* Total row */}
                <TableRow sx={{ bgcolor: '#fff9c4' }}>
                  <TableCell sx={{ ...CELL_TEXT, fontWeight: 700 }}>Total</TableCell>
                  <TableCell align="right" sx={{ ...CELL, fontWeight: 700 }}>{formatNumber(ltvRows.reduce((s, r) => s + r.facilityCount, 0))}</TableCell>
                  <TableCell align="right" sx={{ ...CELL, fontWeight: 700 }}>{formatCurrency(ltvRows.reduce((s, r) => s + r.sanctioned, 0))}</TableCell>
                  <TableCell align="right" sx={{ ...CELL, fontWeight: 700 }}>{formatCurrency(ltvRows.reduce((s, r) => s + r.disbursed, 0))}</TableCell>
                  <TableCell align="right" sx={{ ...CELL, fontWeight: 700 }}>{formatCurrency(ltvRows.reduce((s, r) => s + r.pos, 0))}</TableCell>
                  <TableCell align="right" sx={{ ...CELL, fontWeight: 700 }}>{formatCurrency(ltvRows.reduce((s, r) => s + r.balance, 0))}</TableCell>
                  <TableCell align="right" sx={{ ...CELL, fontWeight: 700 }}>100%</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Card>

      {/* Maturity Profile Table */}
      <Card sx={{ p: 2 }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 700, fontSize: '0.8rem', mb: 2 }}>
          Maturity Profile
        </Typography>
        {maturityRows.length === 0 ? (
          <Typography variant="caption" color="text.secondary">No maturity data available</Typography>
        ) : (
          <TableContainer sx={{ maxHeight: 480 }}>
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow sx={{ bgcolor: HDR_BG }}>
                  <TableCell sx={HDR}>Maturity Band</TableCell>
                  <TableCell sx={HDR}>Facility Basis</TableCell>
                  <TableCell align="right" sx={HDR}>Facilities</TableCell>
                  <TableCell align="right" sx={HDR}>Sanctioned</TableCell>
                  <TableCell align="right" sx={HDR}>Disbursed</TableCell>
                  <TableCell align="right" sx={HDR}>Balance</TableCell>
                  <TableCell align="right" sx={HDR}>Portfolio Share</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {maturityRows.map((row, idx) => (
                  <TableRow key={idx} hover>
                    <TableCell sx={CELL_TEXT}>{row.maturityBand}</TableCell>
                    <TableCell sx={CELL_TEXT}>{row.facilityBasis}</TableCell>
                    <TableCell align="right" sx={CELL}>{formatNumber(row.facilityCount)}</TableCell>
                    <TableCell align="right" sx={CELL}>{formatCurrency(row.sanctionedAmount)}</TableCell>
                    <TableCell align="right" sx={CELL}>{formatCurrency(row.disbursedAmount)}</TableCell>
                    <TableCell align="right" sx={CELL}>{formatCurrency(row.balance)}</TableCell>
                    <TableCell align="right" sx={CELL}>{formatPercent(row.portfolioShare)}</TableCell>
                  </TableRow>
                ))}
                {/* Total row */}
                <TableRow sx={{ bgcolor: '#fff9c4' }}>
                  <TableCell sx={{ ...CELL_TEXT, fontWeight: 700 }}>Total</TableCell>
                  <TableCell sx={CELL_TEXT} />
                  <TableCell align="right" sx={{ ...CELL, fontWeight: 700 }}>{formatNumber(maturityRows.reduce((s, r) => s + r.facilityCount, 0))}</TableCell>
                  <TableCell align="right" sx={{ ...CELL, fontWeight: 700 }}>{formatCurrency(maturityRows.reduce((s, r) => s + r.sanctionedAmount, 0))}</TableCell>
                  <TableCell align="right" sx={{ ...CELL, fontWeight: 700 }}>{formatCurrency(maturityRows.reduce((s, r) => s + r.disbursedAmount, 0))}</TableCell>
                  <TableCell align="right" sx={{ ...CELL, fontWeight: 700 }}>{formatCurrency(maturityRows.reduce((s, r) => s + r.balance, 0))}</TableCell>
                  <TableCell align="right" sx={{ ...CELL, fontWeight: 700 }}>100%</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Card>
    </Box>
  );
}
