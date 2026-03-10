'use client';

import { useMemo } from 'react';
import * as d3 from 'd3';
import { useD3Chart } from '@/hooks/useD3Chart';
import { useThemeMode } from '@/lib/theme-context';
import { ChartContainer } from '@/components/charts/ChartContainer';
import { formatPercent } from '@/lib/format';
import type { EclSensitivityRow } from '@/lib/types';

interface Props {
  data: EclSensitivityRow[];
}

interface TornadoBar {
  factor: string;
  upImpact: number;
  downImpact: number;
  maxAbs: number;
}

export function SensitivityTornado({ data }: Props) {
  const { d3Tokens } = useThemeMode();

  const bars = useMemo<TornadoBar[]>(() => {
    if (!data.length) return [];

    // Group by factor
    const factorMap = new Map<string, { up: number; down: number }>();
    data.forEach((row) => {
      if (!factorMap.has(row.factor)) factorMap.set(row.factor, { up: 0, down: 0 });
      const entry = factorMap.get(row.factor)!;
      if (row.direction === 'up') entry.up = row.eclImpactPct;
      else entry.down = row.eclImpactPct;
    });

    const result: TornadoBar[] = [];
    factorMap.forEach((val, factor) => {
      result.push({
        factor,
        upImpact: val.up,
        downImpact: val.down,
        maxAbs: Math.max(Math.abs(val.up), Math.abs(val.down)),
      });
    });

    // Sort by max absolute impact — largest at top
    result.sort((a, b) => b.maxAbs - a.maxAbs);

    return result;
  }, [data]);

  const chartHeight = Math.max(320, bars.length * 44 + 50);

  const ref = useD3Chart(
    (svg, width, height) => {
      const margin = { top: 30, right: 70, bottom: 30, left: 140 };
      const w = width - margin.left - margin.right;
      const h = height - margin.top - margin.bottom;
      const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

      // Scales
      const y = d3
        .scaleBand<string>()
        .domain(bars.map((d) => d.factor))
        .range([0, h])
        .padding(0.25);

      const maxAbs = d3.max(bars, (d) => d.maxAbs) ?? 1;
      const x = d3.scaleLinear().domain([-maxAbs * 1.15, maxAbs * 1.15]).nice().range([0, w]);
      const center = x(0);

      // Grid lines
      g.append('g')
        .call(
          d3.axisBottom(x)
            .ticks(7)
            .tickFormat((d) => formatPercent(+d, 1))
            .tickSize(h),
        )
        .selectAll('text')
        .attr('fill', d3Tokens.textFaint)
        .attr('font-size', '10px')
        .attr('dy', '1.5em');

      g.selectAll('.domain').remove();
      g.selectAll('.tick line').attr('stroke', d3Tokens.gridLine).attr('stroke-dasharray', '2,2');

      // Center line (zero)
      g.append('line')
        .attr('x1', center)
        .attr('y1', 0)
        .attr('x2', center)
        .attr('y2', h)
        .attr('stroke', d3Tokens.axisDomain)
        .attr('stroke-width', 1.5);

      // Up bars (right, red — positive ECL impact)
      g.selectAll('rect.up')
        .data(bars)
        .join('rect')
        .attr('class', 'up')
        .attr('y', (d) => y(d.factor)!)
        .attr('height', y.bandwidth())
        .attr('x', (d) => d.upImpact >= 0 ? center : x(d.upImpact))
        .attr('width', (d) => Math.abs(x(d.upImpact) - center))
        .attr('fill', '#f44336')
        .attr('rx', 3)
        .attr('opacity', 0.85)
        .on('mouseover', function () {
          d3.select(this).attr('opacity', 1);
        })
        .on('mouseout', function () {
          d3.select(this).attr('opacity', 0.85);
        });

      // Down bars (left, green — negative ECL impact)
      g.selectAll('rect.down')
        .data(bars)
        .join('rect')
        .attr('class', 'down')
        .attr('y', (d) => y(d.factor)!)
        .attr('height', y.bandwidth())
        .attr('x', (d) => d.downImpact >= 0 ? center : x(d.downImpact))
        .attr('width', (d) => Math.abs(x(d.downImpact) - center))
        .attr('fill', '#4caf50')
        .attr('rx', 3)
        .attr('opacity', 0.85)
        .on('mouseover', function () {
          d3.select(this).attr('opacity', 1);
        })
        .on('mouseout', function () {
          d3.select(this).attr('opacity', 0.85);
        });

      // Up impact labels
      g.selectAll('text.up-label')
        .data(bars)
        .join('text')
        .attr('class', 'up-label')
        .attr('x', (d) => x(d.upImpact) + (d.upImpact >= 0 ? 6 : -6))
        .attr('y', (d) => y(d.factor)! + y.bandwidth() / 2)
        .attr('dy', '0.35em')
        .attr('text-anchor', (d) => (d.upImpact >= 0 ? 'start' : 'end'))
        .attr('fill', '#f44336')
        .attr('font-size', '10px')
        .attr('font-family', 'IBM Plex Mono, monospace')
        .text((d) => formatPercent(d.upImpact, 1));

      // Down impact labels
      g.selectAll('text.down-label')
        .data(bars)
        .join('text')
        .attr('class', 'down-label')
        .attr('x', (d) => x(d.downImpact) + (d.downImpact >= 0 ? 6 : -6))
        .attr('y', (d) => y(d.factor)! + y.bandwidth() / 2)
        .attr('dy', '0.35em')
        .attr('text-anchor', (d) => (d.downImpact >= 0 ? 'start' : 'end'))
        .attr('fill', '#4caf50')
        .attr('font-size', '10px')
        .attr('font-family', 'IBM Plex Mono, monospace')
        .text((d) => formatPercent(d.downImpact, 1));

      // Y axis (factor names)
      g.append('g')
        .call(d3.axisLeft(y).tickSize(0))
        .selectAll('text')
        .attr('fill', d3Tokens.text)
        .attr('font-size', '10px');

      g.selectAll('.domain').remove();

      // Legend at top
      const legend = g.append('g').attr('transform', `translate(0, -18)`);

      // Up legend
      legend.append('rect')
        .attr('width', 12)
        .attr('height', 12)
        .attr('rx', 2)
        .attr('fill', '#f44336')
        .attr('opacity', 0.85);
      legend.append('text')
        .attr('x', 16)
        .attr('y', 10)
        .attr('fill', d3Tokens.textMuted)
        .attr('font-size', '10px')
        .text('Up shock');

      // Down legend
      legend.append('rect')
        .attr('x', 90)
        .attr('width', 12)
        .attr('height', 12)
        .attr('rx', 2)
        .attr('fill', '#4caf50')
        .attr('opacity', 0.85);
      legend.append('text')
        .attr('x', 106)
        .attr('y', 10)
        .attr('fill', d3Tokens.textMuted)
        .attr('font-size', '10px')
        .text('Down shock');
    },
    [bars, d3Tokens],
  );

  return (
    <ChartContainer
      title="ECL Sensitivity — Tornado"
      subtitle="Impact of macro factor shocks on ECL"
      height={chartHeight}
      empty={!bars.length}
    >
      <svg ref={ref} width="100%" height="100%" style={{ overflow: 'visible' }} />
    </ChartContainer>
  );
}
