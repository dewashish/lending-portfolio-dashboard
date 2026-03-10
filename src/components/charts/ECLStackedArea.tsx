'use client';

import { useMemo } from 'react';
import * as d3 from 'd3';
import { useD3Chart } from '@/hooks/useD3Chart';
import { useThemeMode } from '@/lib/theme-context';
import { ChartContainer } from '@/components/charts/ChartContainer';
import { useCurrencyFormat } from '@/lib/currency-context';
import type { EclForecastRow } from '@/lib/types';

interface Props {
  data: EclForecastRow[];
  scenario?: string;
}

const STAGES = ['Stage 1', 'Stage 2', 'Stage 3'] as const;
const STAGE_COLORS: Record<string, string> = {
  'Stage 1': '#4caf50',
  'Stage 2': '#ff9800',
  'Stage 3': '#f44336',
};

export function ECLStackedArea({ data, scenario = 'Base' }: Props) {
  const { d3Tokens } = useThemeMode();
  const { formatCurrency } = useCurrencyFormat();

  const { quarters, stackData, keys } = useMemo(() => {
    if (!data.length) return { quarters: [], stackData: [], keys: [] };

    // Filter to the selected scenario
    const filtered = data.filter((d) => d.scenario === scenario);

    // Get sorted unique quarters
    const qSet = new Set(filtered.map((d) => d.quarter));
    const sortedQuarters = Array.from(qSet).sort();

    // Build rows: one object per quarter with stage keys
    const rows = sortedQuarters.map((q) => {
      const row: Record<string, number | string> = { quarter: q };
      STAGES.forEach((stage) => {
        const match = filtered.find((d) => d.quarter === q && d.stage === stage);
        row[stage] = match ? match.eclAmountUsd : 0;
      });
      return row;
    });

    return { quarters: sortedQuarters, stackData: rows, keys: [...STAGES] };
  }, [data, scenario]);

  const ref = useD3Chart(
    (svg, width, height) => {
      const margin = { top: 30, right: 30, bottom: 40, left: 65 };
      const w = width - margin.left - margin.right;
      const h = height - margin.top - margin.bottom;
      const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

      // Scales
      const x = d3.scalePoint().domain(quarters).range([0, w]).padding(0.5);

      const stack = d3.stack<Record<string, number | string>>().keys(keys).order(d3.stackOrderNone).offset(d3.stackOffsetNone);
      const series = stack(stackData as Iterable<Record<string, number | string>>);

      const yMax = d3.max(series, (s) => d3.max(s, (d) => d[1])) ?? 1;
      const y = d3.scaleLinear().domain([0, yMax * 1.1]).nice().range([h, 0]);

      // Grid lines
      g.append('g')
        .call(
          d3.axisLeft(y)
            .ticks(5)
            .tickFormat((d) => formatCurrency(+d))
            .tickSize(-w),
        )
        .selectAll('text')
        .attr('fill', d3Tokens.textMuted)
        .attr('font-size', '10px')
        .attr('font-family', 'IBM Plex Mono, monospace');

      g.selectAll('.domain').remove();
      g.selectAll('.tick line').attr('stroke', d3Tokens.gridLine);

      // Area generator
      const area = d3
        .area<d3.SeriesPoint<Record<string, number | string>>>()
        .x((d) => x(d.data.quarter as string)!)
        .y0((d) => y(d[0]))
        .y1((d) => y(d[1]))
        .curve(d3.curveMonotoneX);

      // Draw stacked areas
      g.selectAll('path.area')
        .data(series)
        .join('path')
        .attr('class', 'area')
        .attr('d', area)
        .attr('fill', (d) => STAGE_COLORS[d.key] ?? '#9e9e9e')
        .attr('opacity', 0.75);

      // Draw lines on top for definition
      const line = d3
        .line<d3.SeriesPoint<Record<string, number | string>>>()
        .x((d) => x(d.data.quarter as string)!)
        .y((d) => y(d[1]))
        .curve(d3.curveMonotoneX);

      g.selectAll('path.line')
        .data(series)
        .join('path')
        .attr('class', 'line')
        .attr('d', line)
        .attr('fill', 'none')
        .attr('stroke', (d) => STAGE_COLORS[d.key] ?? '#9e9e9e')
        .attr('stroke-width', 1.5);

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

      // Legend at top
      const legend = g.append('g').attr('transform', `translate(0, -18)`);
      let legendX = 0;
      keys.forEach((key) => {
        const color = STAGE_COLORS[key] ?? '#9e9e9e';
        const lg = legend.append('g').attr('transform', `translate(${legendX}, 0)`);
        lg.append('rect')
          .attr('width', 12)
          .attr('height', 12)
          .attr('rx', 2)
          .attr('fill', color)
          .attr('opacity', 0.75);
        lg.append('text')
          .attr('x', 16)
          .attr('y', 10)
          .attr('fill', d3Tokens.textMuted)
          .attr('font-size', '10px')
          .text(key);
        legendX += key.length * 7 + 30;
      });
    },
    [quarters, stackData, keys, d3Tokens, formatCurrency],
  );

  return (
    <ChartContainer
      title="ECL by IFRS Stage"
      subtitle={`Stacked area \u2014 ${scenario} scenario`}
      empty={!stackData.length}
    >
      <svg ref={ref} width="100%" height="100%" style={{ overflow: 'visible' }} />
    </ChartContainer>
  );
}
