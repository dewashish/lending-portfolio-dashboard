'use client';

import { useMemo } from 'react';
import { Box } from '@mui/material';
import * as d3 from 'd3';
import { useD3Chart } from '@/hooks/useD3Chart';
import { useThemeMode } from '@/lib/theme-context';
import { ChartContainer } from '@/components/charts/ChartContainer';
import { formatPercent } from '@/lib/format';
import { useCurrencyFormat } from '@/lib/currency-context';
import type { VintagePoint } from '@/lib/types';

interface Props {
  data: VintagePoint[];
  metricType: string;
  fillHeight?: boolean;
}

const ROW_H = 28;
const MIN_CELL_W = 56;
const LA_COL_W = 60;
const MARGIN = { top: 24, right: 16, bottom: 36, left: 72 };

export function VintageHeatmap({ data, metricType, fillHeight }: Props) {
  const { d3Tokens } = useThemeMode();
  const { formatCurrency } = useCurrencyFormat();

  const filtered = useMemo(
    () => data.filter((d) => d.metricType === metricType),
    [data, metricType],
  );

  const { vintages, mobs, maxRate, cellMap, vintageLoanMap } = useMemo(() => {
    const vintageSet = Array.from(new Set(filtered.map((d) => d.vintage)));
    const sorted = vintageSet.sort((a, b) => {
      const parseV = (s: string) => {
        const months: Record<string, number> = {
          Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5,
          Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11,
        };
        const match = s.match(/([A-Za-z]+)'?(\d{2,4})/);
        if (!match) return 0;
        const m = months[match[1]] ?? 0;
        let y = parseInt(match[2], 10);
        if (y < 100) y += 2000;
        return y * 12 + m;
      };
      return parseV(a) - parseV(b);
    });

    const mobSet = Array.from(new Set(filtered.map((d) => d.mob))).sort((a, b) => a - b);
    const max = d3.max(filtered, (d) => d.delinquencyRate) ?? 0.1;

    // Build lookup map for rates
    const map = new Map<string, number>();
    filtered.forEach((d) => {
      map.set(`${d.vintage}|${d.mob}`, d.delinquencyRate);
    });

    // Build loan amount per vintage (take from MOB 1 which exists for all vintages)
    const laMap = new Map<string, number>();
    filtered.forEach((d) => {
      if (d.mob === 1) {
        laMap.set(d.vintage, d.loanAmount);
      }
    });

    return { vintages: sorted, mobs: mobSet, maxRate: max, cellMap: map, vintageLoanMap: laMap };
  }, [filtered]);

  const chartHeight = Math.max(300, vintages.length * ROW_H + MARGIN.top + MARGIN.bottom);
  const chartMinWidth = mobs.length * MIN_CELL_W + LA_COL_W + MARGIN.left + MARGIN.right;

  const ref = useD3Chart(
    (svg, width, height) => {
      const margin = MARGIN;
      const w = width - margin.left - margin.right - LA_COL_W;
      const h = height - margin.top - margin.bottom;
      const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

      const x = d3
        .scaleBand<number>()
        .domain(mobs)
        .range([LA_COL_W, LA_COL_W + w])
        .padding(0.04);

      const y = d3
        .scaleBand<string>()
        .domain(vintages)
        .range([0, h])
        .padding(0.04);

      // Color: green (low) → yellow → red (high)
      const colorScale = d3
        .scaleSequential(d3.interpolateRdYlGn)
        .domain([maxRate, 0]);

      // ── LA column header ────────────────────────────────────────────
      g.append('text')
        .attr('x', LA_COL_W / 2)
        .attr('y', -8)
        .attr('text-anchor', 'middle')
        .attr('fill', d3Tokens.textFaint)
        .attr('font-size', '9px')
        .attr('font-weight', 600)
        .text('Loan Amt');

      // ── LA values per vintage ───────────────────────────────────────
      vintages.forEach((v) => {
        const la = vintageLoanMap.get(v);
        // Background cell
        g.append('rect')
          .attr('x', 2)
          .attr('y', y(v)!)
          .attr('width', LA_COL_W - 6)
          .attr('height', y.bandwidth())
          .attr('fill', 'rgba(128,128,128,0.08)')
          .attr('rx', 2);
        // Value
        g.append('text')
          .attr('x', LA_COL_W / 2)
          .attr('y', y(v)! + y.bandwidth() / 2)
          .attr('dy', '0.35em')
          .attr('text-anchor', 'middle')
          .attr('fill', d3Tokens.text)
          .attr('font-size', '9px')
          .attr('font-family', 'IBM Plex Mono, monospace')
          .text(la != null ? formatCurrency(la) : '—');
      });

      // ── Build cell data (only cells with data → triangular) ─────────
      const cells: { vintage: string; mob: number; rate: number }[] = [];
      vintages.forEach((v) => {
        mobs.forEach((m) => {
          const rate = cellMap.get(`${v}|${m}`);
          if (rate != null) {
            cells.push({ vintage: v, mob: m, rate });
          }
        });
      });

      // ── Render heatmap cells ────────────────────────────────────────
      g.selectAll('rect.cell')
        .data(cells)
        .join('rect')
        .attr('class', 'cell')
        .attr('x', (d) => x(d.mob)!)
        .attr('y', (d) => y(d.vintage)!)
        .attr('width', x.bandwidth())
        .attr('height', y.bandwidth())
        .attr('fill', (d) => colorScale(d.rate))
        .attr('rx', 2)
        .attr('opacity', 0.92)
        .on('mouseover', function () {
          d3.select(this).attr('opacity', 1).attr('stroke', d3Tokens.text).attr('stroke-width', 1.5);
        })
        .on('mouseout', function () {
          d3.select(this).attr('opacity', 0.92).attr('stroke', 'none');
        });

      // ── Rate labels inside cells ────────────────────────────────────
      g.selectAll('text.cell-label')
        .data(cells)
        .join('text')
        .attr('class', 'cell-label')
        .attr('x', (d) => x(d.mob)! + x.bandwidth() / 2)
        .attr('y', (d) => y(d.vintage)! + y.bandwidth() / 2)
        .attr('dy', '0.35em')
        .attr('text-anchor', 'middle')
        .attr('fill', (d) => (d.rate > maxRate * 0.6 ? '#fff' : '#1e293b'))
        .attr('font-size', Math.min(10, x.bandwidth() * 0.4) + 'px')
        .attr('font-family', 'IBM Plex Mono, monospace')
        .attr('pointer-events', 'none')
        .text((d) => {
          if (x.bandwidth() < 32 || y.bandwidth() < 14) return '';
          return formatPercent(d.rate, 1);
        });

      // ── Y axis (vintage labels) ────────────────────────────────────
      g.append('g')
        .call(d3.axisLeft(y).tickSize(0))
        .selectAll('text')
        .attr('fill', d3Tokens.text)
        .attr('font-size', '9px');

      g.selectAll('.domain').remove();

      // ── X axis (MOB numbers) ───────────────────────────────────────
      g.append('g')
        .attr('transform', `translate(0,${h})`)
        .call(d3.axisBottom(x).tickSize(0).tickFormat((d) => `${d}`))
        .selectAll('text')
        .attr('fill', d3Tokens.textFaint)
        .attr('font-size', '9px');

      g.selectAll('.domain').remove();

      // ── X axis label ───────────────────────────────────────────────
      g.append('text')
        .attr('x', LA_COL_W + w / 2)
        .attr('y', h + 28)
        .attr('text-anchor', 'middle')
        .attr('fill', d3Tokens.textFaint)
        .attr('font-size', '9px')
        .text('Months on Book (MOB)');
    },
    [filtered, vintages, mobs, maxRate, cellMap, vintageLoanMap, d3Tokens, formatCurrency],
  );

  return (
    <ChartContainer
      title={`Static Pool \u2014 ${metricType}`}
      subtitle="Delinquency rate by vintage cohort and MOB"
      height={chartHeight}
      empty={!filtered.length}
      fillHeight={fillHeight}
    >
      <Box sx={{ overflowX: 'auto', width: '100%', height: '100%' }}>
        <svg
          ref={ref}
          style={{ minWidth: chartMinWidth, width: '100%', height: '100%', overflow: 'visible' }}
        />
      </Box>
    </ChartContainer>
  );
}
