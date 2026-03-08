'use client';

import { useMemo } from 'react';
import * as d3 from 'd3';
import { useD3Chart } from '@/hooks/useD3Chart';
import { useThemeMode } from '@/lib/theme-context';
import { ChartContainer } from '@/components/charts/ChartContainer';
import { formatPercent } from '@/lib/format';
import type { RollRateTimeSeries } from '@/lib/types';

interface Props {
  data: RollRateTimeSeries[];
}

/** Bucket group prefixes used to insert thicker separator lines */
const BUCKET_PREFIXES = ['B1', 'B2', 'B3', 'B4', 'B5', 'B6'];

const ROW_H = 32;
const MARGIN = { top: 60, right: 20, bottom: 10, left: 170 };

export function RollRateHeatmap({ data }: Props) {
  const { d3Tokens } = useThemeMode();

  const { metrics, periods } = useMemo(() => {
    const metricNames = data.map((d) => d.metric);
    const periodSet = new Set<string>();
    data.forEach((row) => Object.keys(row.values).forEach((k) => periodSet.add(k)));
    const sortedPeriods = Array.from(periodSet).sort();
    return { metrics: metricNames, periods: sortedPeriods };
  }, [data]);

  // Determine which row indices start a new bucket group (for separator lines)
  const groupStartIndices = useMemo(() => {
    const indices: number[] = [];
    let lastPrefix = '';
    metrics.forEach((m, i) => {
      const prefix = BUCKET_PREFIXES.find((p) => m.startsWith(p)) ?? '';
      if (prefix && prefix !== lastPrefix && i > 0) {
        indices.push(i);
      }
      lastPrefix = prefix;
    });
    return indices;
  }, [metrics]);

  const chartHeight = Math.max(320, metrics.length * ROW_H + MARGIN.top + MARGIN.bottom);

  const ref = useD3Chart(
    (svg, width, height) => {
      const margin = MARGIN;
      const w = width - margin.left - margin.right;
      const h = height - margin.top - margin.bottom;
      const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

      const x = d3.scaleBand<string>().domain(periods).range([0, w]).padding(0.04);
      const y = d3.scaleBand<string>().domain(metrics).range([0, h]).padding(0.04);

      // Color: green (0 = good resolution) → red (1 = bad roll-forward)
      const colorScale = d3.scaleSequential(d3.interpolateRdYlGn).domain([1, 0]);

      // Build flat cell data
      const cells: { metric: string; period: string; value: number }[] = [];
      data.forEach((row) => {
        periods.forEach((p) => {
          if (row.values[p] != null) {
            cells.push({ metric: row.metric, period: p, value: row.values[p] });
          }
        });
      });

      // Draw cells
      g.selectAll('rect.cell')
        .data(cells)
        .join('rect')
        .attr('class', 'cell')
        .attr('x', (d) => x(d.period)!)
        .attr('y', (d) => y(d.metric)!)
        .attr('width', x.bandwidth())
        .attr('height', y.bandwidth())
        .attr('fill', (d) => colorScale(d.value))
        .attr('rx', 2)
        .attr('opacity', 0.9)
        .on('mouseover', function () {
          d3.select(this).attr('opacity', 1).attr('stroke', d3Tokens.text).attr('stroke-width', 1.5);
        })
        .on('mouseout', function () {
          d3.select(this).attr('opacity', 0.9).attr('stroke', 'none');
        });

      // Percentage labels inside cells
      g.selectAll('text.cell-label')
        .data(cells)
        .join('text')
        .attr('class', 'cell-label')
        .attr('x', (d) => x(d.period)! + x.bandwidth() / 2)
        .attr('y', (d) => y(d.metric)! + y.bandwidth() / 2)
        .attr('dy', '0.35em')
        .attr('text-anchor', 'middle')
        .attr('fill', (d) => (d.value > 0.6 ? '#fff' : '#1e293b'))
        .attr('font-size', Math.min(10, y.bandwidth() * 0.6) + 'px')
        .attr('font-family', 'IBM Plex Mono, monospace')
        .attr('pointer-events', 'none')
        .text((d) => {
          if (x.bandwidth() < 28 || y.bandwidth() < 14) return '';
          return formatPercent(d.value, 1);
        });

      // Group separator lines
      groupStartIndices.forEach((idx) => {
        const yPos = y(metrics[idx])! - y.step() * y.padding() / 2;
        g.append('line')
          .attr('x1', 0)
          .attr('x2', w)
          .attr('y1', yPos)
          .attr('y2', yPos)
          .attr('stroke', d3Tokens.textMuted)
          .attr('stroke-width', 1.5)
          .attr('stroke-dasharray', '4,3');
      });

      // Y axis (metric names)
      g.append('g')
        .call(d3.axisLeft(y).tickSize(0))
        .selectAll('text')
        .attr('fill', d3Tokens.text)
        .attr('font-size', '10px');

      g.selectAll('.domain').remove();

      // X axis (period labels at top)
      g.append('g')
        .attr('transform', `translate(0,${-4})`)
        .call(d3.axisTop(x).tickSize(0))
        .selectAll('text')
        .attr('fill', d3Tokens.textMuted)
        .attr('font-size', '10px')
        .attr('text-anchor', 'start')
        .attr('transform', 'rotate(-45)')
        .attr('dx', '0.5em')
        .attr('dy', '0.2em');

      g.selectAll('.domain').remove();
    },
    [data, metrics, periods, groupStartIndices, d3Tokens],
  );

  return (
    <ChartContainer title="Roll Rate Heatmap" subtitle="Transition rates by period" height={chartHeight} empty={!data.length}>
      <svg ref={ref} width="100%" height="100%" style={{ overflow: 'visible' }} />
    </ChartContainer>
  );
}
