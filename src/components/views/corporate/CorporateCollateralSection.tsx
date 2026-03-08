'use client';

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
import { LTVDistributionChart } from '@/components/charts/LTVDistributionChart';
import { useD3Chart } from '@/hooks/useD3Chart';
import { useThemeMode } from '@/lib/theme-context';
import {
  useCorporateCollateralAnalysis,
  useCorporateLTVDistribution,
} from '@/hooks/useCorporateData';
import { formatCurrency, formatPercent, formatNumber } from '@/lib/format';
import type { ScopeSelection, CorporateCollateralRow } from '@/lib/types';

interface Props {
  scope?: ScopeSelection;
}

function CollateralDonut({ data }: { data: CorporateCollateralRow[] }) {
  const { d3Tokens } = useThemeMode();

  const ref = useD3Chart(
    (svg, width, height) => {
      const size = Math.min(width, height);
      const radius = size / 2 - 20;
      const innerRadius = radius * 0.55;
      const g = svg
        .append('g')
        .attr('transform', `translate(${width / 2},${height / 2})`);

      const color = d3.scaleOrdinal<string>().domain(data.map((d) => d.collateralType)).range(d3.schemeSet2);

      const pie = d3
        .pie<CorporateCollateralRow>()
        .value((d) => d.collateralValue)
        .sort(null)
        .padAngle(0.02);

      const arc = d3
        .arc<d3.PieArcDatum<CorporateCollateralRow>>()
        .innerRadius(innerRadius)
        .outerRadius(radius)
        .cornerRadius(4);

      const labelArc = d3
        .arc<d3.PieArcDatum<CorporateCollateralRow>>()
        .innerRadius(radius + 12)
        .outerRadius(radius + 12);

      // Slices
      g.selectAll('.slice')
        .data(pie(data))
        .join('path')
        .attr('class', 'slice')
        .attr('d', arc)
        .attr('fill', (d) => color(d.data.collateralType))
        .attr('opacity', 0.9)
        .on('mouseover', function () {
          d3.select(this).attr('opacity', 1);
        })
        .on('mouseout', function () {
          d3.select(this).attr('opacity', 0.9);
        });

      // Labels
      g.selectAll('.label')
        .data(pie(data))
        .join('text')
        .attr('class', 'label')
        .attr('transform', (d) => `translate(${labelArc.centroid(d)})`)
        .attr('text-anchor', (d) => {
          const midAngle = (d.startAngle + d.endAngle) / 2;
          return midAngle < Math.PI ? 'start' : 'end';
        })
        .attr('fill', d3Tokens.textMuted)
        .attr('font-size', '9px')
        .text((d) => {
          const angle = d.endAngle - d.startAngle;
          if (angle < 0.3) return '';
          return `${d.data.collateralType} (${formatPercent(d.data.coverageRatio)})`;
        });

      // Center label
      const total = d3.sum(data, (d) => d.collateralValue);
      g.append('text')
        .attr('text-anchor', 'middle')
        .attr('dy', '-0.3em')
        .attr('fill', d3Tokens.text)
        .attr('font-size', '11px')
        .attr('font-weight', 700)
        .text('Total');
      g.append('text')
        .attr('text-anchor', 'middle')
        .attr('dy', '1em')
        .attr('fill', d3Tokens.text)
        .attr('font-size', '12px')
        .attr('font-family', 'IBM Plex Mono, monospace')
        .attr('font-weight', 700)
        .text(formatCurrency(total));
    },
    [data, d3Tokens],
  );

  return (
    <ChartContainer title="Collateral Breakdown" subtitle="By collateral type" empty={!data.length}>
      <svg ref={ref} width="100%" height="100%" style={{ overflow: 'visible' }} />
    </ChartContainer>
  );
}

export function CorporateCollateralSection({ scope }: Props) {
  const { data: collateral, isLoading: loadingCollateral } = useCorporateCollateralAnalysis(scope);
  const { data: ltv, isLoading: loadingLTV } = useCorporateLTVDistribution(scope);

  if (loadingCollateral || loadingLTV) return <LoadingSkeleton />;

  const collateralRows = collateral ?? [];
  const ltvRows = ltv ?? [];

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
      {/* Charts row */}
      <Grid container spacing={2}>
        <Grid item xs={12} md={6}>
          <CollateralDonut data={collateralRows} />
        </Grid>
        <Grid item xs={12} md={6}>
          <LTVDistributionChart data={ltvRows} />
        </Grid>
      </Grid>

      {/* Collateral Coverage Table */}
      <Card sx={{ p: 2 }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 700, fontSize: '0.8rem', mb: 2 }}>
          Collateral Coverage Detail
        </Typography>
        {collateralRows.length === 0 ? (
          <Typography variant="caption" color="text.secondary">No collateral data available</Typography>
        ) : (
          <TableContainer sx={{ maxHeight: 480 }}>
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem' }}>Collateral Type</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700, fontSize: '0.75rem' }}>Facility Count</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700, fontSize: '0.75rem' }}>Collateral Value</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700, fontSize: '0.75rem' }}>Exposure Covered</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700, fontSize: '0.75rem' }}>Coverage Ratio</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {collateralRows.map((row, idx) => (
                  <TableRow key={idx} hover>
                    <TableCell sx={{ fontSize: '0.75rem' }}>{row.collateralType}</TableCell>
                    <TableCell align="right" sx={{ fontSize: '0.75rem', fontFamily: 'IBM Plex Mono, monospace' }}>
                      {formatNumber(row.facilityCount)}
                    </TableCell>
                    <TableCell align="right" sx={{ fontSize: '0.75rem', fontFamily: 'IBM Plex Mono, monospace' }}>
                      {formatCurrency(row.collateralValue)}
                    </TableCell>
                    <TableCell align="right" sx={{ fontSize: '0.75rem', fontFamily: 'IBM Plex Mono, monospace' }}>
                      {formatCurrency(row.exposureCovered)}
                    </TableCell>
                    <TableCell align="right" sx={{ fontSize: '0.75rem', fontFamily: 'IBM Plex Mono, monospace' }}>
                      {formatPercent(row.coverageRatio)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Card>

      {/* LTV Distribution Table */}
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
                <TableRow>
                  <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem' }}>LTV Band</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700, fontSize: '0.75rem' }}>Facility Count</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700, fontSize: '0.75rem' }}>Balance</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700, fontSize: '0.75rem' }}>Portfolio Share %</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {ltvRows.map((row, idx) => (
                  <TableRow key={idx} hover>
                    <TableCell sx={{ fontSize: '0.75rem' }}>{row.ltvBand}</TableCell>
                    <TableCell align="right" sx={{ fontSize: '0.75rem', fontFamily: 'IBM Plex Mono, monospace' }}>
                      {formatNumber(row.facilityCount)}
                    </TableCell>
                    <TableCell align="right" sx={{ fontSize: '0.75rem', fontFamily: 'IBM Plex Mono, monospace' }}>
                      {formatCurrency(row.balance)}
                    </TableCell>
                    <TableCell align="right" sx={{ fontSize: '0.75rem', fontFamily: 'IBM Plex Mono, monospace' }}>
                      {formatPercent(row.portfolioShare)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Card>
    </Box>
  );
}
