'use client';

import * as d3 from 'd3';
import { useD3Chart } from '@/hooks/useD3Chart';
import { useThemeMode } from '@/lib/theme-context';
import { ChartContainer } from '@/components/charts/ChartContainer';
import { formatCurrencyMM } from '@/lib/format';
import type { CorporateIndustryConcentrationRow } from '@/lib/types';

interface Props {
  data: CorporateIndustryConcentrationRow[];
}

export function IndustryConcentrationChart({ data }: Props) {
  const { d3Tokens } = useThemeMode();

  const ref = useD3Chart(
    (svg, width, height) => {
      const margin = { top: 20, right: 20, bottom: 80, left: 65 };
      const w = width - margin.left - margin.right;
      const h = height - margin.top - margin.bottom;
      const g = svg
        .append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);

      // Get unique periods and sectors
      const periods = Array.from(new Set(data.map((d) => d.period))).sort();
      const sectors = Array.from(new Set(data.map((d) => d.sector)));
      const color = d3.scaleOrdinal<string>().domain(sectors).range(d3.schemeTableau10);

      // Build a matrix for the stack layout: rows keyed by period, columns keyed by sector
      type MatrixRow = { period: string; [sector: string]: string | number };
      const matrix: MatrixRow[] = periods.map((period) => {
        const row: MatrixRow = { period };
        sectors.forEach((sector) => {
          const match = data.find((d) => d.period === period && d.sector === sector);
          row[sector] = match ? match.disbursement : 0;
        });
        return row;
      });

      // X scale
      const x = d3
        .scalePoint()
        .domain(periods)
        .range([0, w])
        .padding(0.5);

      // Stack
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const stack = d3
        .stack<MatrixRow>()
        .keys(sectors)
        .order(d3.stackOrderNone)
        .offset(d3.stackOffsetNone);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const series = stack(matrix as any);

      // Y scale
      const maxY = d3.max(series, (s) => d3.max(s, (d) => d[1])) ?? 0;
      const y = d3
        .scaleLinear()
        .domain([0, maxY * 1.1])
        .nice()
        .range([h, 0]);

      // Grid lines
      g.append('g')
        .call(
          d3
            .axisLeft(y)
            .ticks(5)
            .tickSize(-w)
            .tickFormat((d) => formatCurrencyMM(+d)),
        )
        .selectAll('text')
        .attr('fill', d3Tokens.textMuted)
        .attr('font-size', '10px');

      g.selectAll('.domain').remove();
      g.selectAll('.tick line').attr('stroke', d3Tokens.gridLine);

      // Area generator
      const area = d3
        .area<d3.SeriesPoint<MatrixRow>>()
        .x((d) => x(d.data.period as string)!)
        .y0((d) => y(d[0]))
        .y1((d) => y(d[1]))
        .curve(d3.curveMonotoneX);

      // Render areas
      g.selectAll('.area-layer')
        .data(series)
        .join('path')
        .attr('class', 'area-layer')
        .attr('d', area)
        .attr('fill', (d) => color(d.key))
        .attr('opacity', 0.75)
        .on('mouseover', function () {
          d3.select(this).attr('opacity', 0.95);
        })
        .on('mouseout', function () {
          d3.select(this).attr('opacity', 0.75);
        });

      // X axis
      g.append('g')
        .attr('transform', `translate(0,${h})`)
        .call(d3.axisBottom(x).tickSize(0))
        .selectAll('text')
        .attr('fill', d3Tokens.text)
        .attr('font-size', '10px')
        .attr('text-anchor', 'end')
        .attr('transform', 'rotate(-35)')
        .attr('dx', '-0.5em')
        .attr('dy', '0.5em');

      g.selectAll('.domain').attr('stroke', d3Tokens.axisDomain);

      // Legend at bottom
      const legendY = h + 50;
      const legendPerRow = Math.floor(w / 120) || 1;
      sectors.forEach((sector, i) => {
        const row = Math.floor(i / legendPerRow);
        const col = i % legendPerRow;
        const lg = g
          .append('g')
          .attr('transform', `translate(${col * 120}, ${legendY + row * 16})`);
        lg.append('rect')
          .attr('width', 10)
          .attr('height', 10)
          .attr('rx', 2)
          .attr('fill', color(sector))
          .attr('opacity', 0.75);
        lg.append('text')
          .attr('x', 14)
          .attr('y', 9)
          .attr('fill', d3Tokens.textMuted)
          .attr('font-size', '9px')
          .text(sector.length > 16 ? sector.slice(0, 15) + '...' : sector);
      });
    },
    [data, d3Tokens],
  );

  return (
    <ChartContainer
      title="Industry Concentration"
      subtitle="Disbursement by sector over time"
      empty={!data.length}
      height={380}
    >
      <svg ref={ref} width="100%" height="100%" style={{ overflow: 'visible' }} />
    </ChartContainer>
  );
}
