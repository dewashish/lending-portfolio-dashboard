'use client';

import { useMemo } from 'react';
import * as d3 from 'd3';
import { useD3Chart } from '@/hooks/useD3Chart';
import { useThemeMode } from '@/lib/theme-context';
import { ChartContainer } from '@/components/charts/ChartContainer';
import { useCurrencyFormat } from '@/lib/currency-context';
import type { EclWaterfallRow } from '@/lib/types';

interface Props {
  data: EclWaterfallRow[];
}

interface WaterfallBar {
  driver: string;
  amount: number;
  start: number;
  end: number;
  type: 'total' | 'increase' | 'decrease';
}

export function ECLWaterfall({ data }: Props) {
  const { d3Tokens } = useThemeMode();
  const { formatCurrency } = useCurrencyFormat();

  const bars = useMemo<WaterfallBar[]>(() => {
    if (!data.length) return [];

    const sorted = [...data].sort((a, b) => a.sortOrder - b.sortOrder);

    const result: WaterfallBar[] = [];
    let running = 0;

    sorted.forEach((row, i) => {
      const isFirst = i === 0;
      const isLast = i === sorted.length - 1;

      if (isFirst || isLast) {
        // Opening or Closing — bar starts from 0
        result.push({
          driver: row.driver,
          amount: row.amountUsd,
          start: 0,
          end: row.amountUsd,
          type: 'total',
        });
        running = row.amountUsd;
      } else {
        const start = running;
        running += row.amountUsd;
        result.push({
          driver: row.driver,
          amount: row.amountUsd,
          start,
          end: running,
          type: row.amountUsd >= 0 ? 'increase' : 'decrease',
        });
      }
    });

    return result;
  }, [data]);

  const chartHeight = Math.max(320, bars.length * 40 + 40);

  const ref = useD3Chart(
    (svg, width, height) => {
      const margin = { top: 10, right: 110, bottom: 30, left: 160 };
      const w = width - margin.left - margin.right;
      const h = height - margin.top - margin.bottom;
      const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

      // Scales
      const y = d3
        .scaleBand<string>()
        .domain(bars.map((d) => d.driver))
        .range([0, h])
        .padding(0.25);

      const allExtents = bars.flatMap((d) => [d.start, d.end]);
      const xMin = d3.min(allExtents) ?? 0;
      const xMax = d3.max(allExtents) ?? 1;
      const xPad = (xMax - xMin) * 0.1;
      const x = d3.scaleLinear().domain([Math.min(0, xMin - xPad), xMax + xPad]).nice().range([0, w]);

      // Grid lines
      g.append('g')
        .call(
          d3.axisBottom(x)
            .ticks(5)
            .tickFormat((d) => formatCurrency(+d))
            .tickSize(h),
        )
        .attr('transform', `translate(0,0)`)
        .selectAll('text')
        .attr('fill', d3Tokens.textFaint)
        .attr('font-size', '10px')
        .attr('dy', '1.5em');

      g.selectAll('.domain').remove();
      g.selectAll('.tick line').attr('stroke', d3Tokens.gridLine).attr('stroke-dasharray', '2,2');

      // Connector lines between bars
      bars.forEach((bar, i) => {
        if (i < bars.length - 1 && bar.type !== 'total') {
          const nextBar = bars[i + 1];
          g.append('line')
            .attr('x1', x(bar.end))
            .attr('y1', y(bar.driver)! + y.bandwidth())
            .attr('x2', x(bar.end))
            .attr('y2', nextBar.type === 'total'
              ? y(nextBar.driver)! + y.bandwidth()
              : y(nextBar.driver)!)
            .attr('stroke', d3Tokens.textFaint)
            .attr('stroke-width', 1)
            .attr('stroke-dasharray', '2,2');
        }
      });

      // Bars
      const barColor = (d: WaterfallBar) => {
        if (d.type === 'total') return '#2196f3';
        return d.type === 'increase' ? '#f44336' : '#4caf50';
      };

      g.selectAll('rect.bar')
        .data(bars)
        .join('rect')
        .attr('class', 'bar')
        .attr('y', (d) => y(d.driver)!)
        .attr('height', y.bandwidth())
        .attr('x', (d) => x(Math.min(d.start, d.end)))
        .attr('width', (d) => Math.abs(x(d.end) - x(d.start)))
        .attr('fill', barColor)
        .attr('rx', 3)
        .attr('opacity', 0.9)
        .on('mouseover', function () {
          d3.select(this).attr('opacity', 1);
        })
        .on('mouseout', function () {
          d3.select(this).attr('opacity', 0.9);
        });

      // Value labels at end of each bar
      g.selectAll('text.val')
        .data(bars)
        .join('text')
        .attr('class', 'val')
        .attr('x', (d) => x(d.end) + (d.amount >= 0 ? 6 : -6))
        .attr('y', (d) => y(d.driver)! + y.bandwidth() / 2)
        .attr('dy', '0.35em')
        .attr('text-anchor', (d) => (d.amount >= 0 ? 'start' : 'end'))
        .attr('fill', d3Tokens.textMuted)
        .attr('font-size', '11px')
        .attr('font-family', 'IBM Plex Mono, monospace')
        .text((d) => formatCurrency(d.amount));

      // Y axis
      g.append('g')
        .call(d3.axisLeft(y).tickSize(0))
        .selectAll('text')
        .attr('fill', d3Tokens.text)
        .attr('font-size', '10px');

      g.selectAll('.domain').remove();
    },
    [bars, d3Tokens, formatCurrency],
  );

  return (
    <ChartContainer
      title="ECL Change Decomposition"
      subtitle="Waterfall of ECL movement drivers"
      height={chartHeight}
      empty={!bars.length}
    >
      <svg ref={ref} width="100%" height="100%" style={{ overflow: 'visible' }} />
    </ChartContainer>
  );
}
