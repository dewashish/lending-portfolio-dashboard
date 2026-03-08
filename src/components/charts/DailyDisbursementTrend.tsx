'use client';

import { useMemo } from 'react';
import * as d3 from 'd3';
import { useD3Chart } from '@/hooks/useD3Chart';
import { useThemeMode } from '@/lib/theme-context';
import { ChartContainer } from '@/components/charts/ChartContainer';
import { useCurrencyFormat } from '@/lib/currency-context';
import type { LOSDisbursementDaily } from '@/lib/types';

interface Props {
  data: LOSDisbursementDaily[];
}

const TEAL = '#00897b';
const TEAL_FILL = 'rgba(0, 137, 123, 0.15)';

export function DailyDisbursementTrend({ data }: Props) {
  const { d3Tokens } = useThemeMode();
  const { formatCurrency } = useCurrencyFormat();

  const sorted = useMemo(() => {
    // Aggregate across products if needed, or just sort by date
    const byDate = new Map<string, number>();
    data.forEach((d) => {
      byDate.set(d.date, (byDate.get(d.date) ?? 0) + d.amount);
    });
    return Array.from(byDate.entries())
      .map(([date, amount]) => ({ date: new Date(date), amount, dateStr: date }))
      .sort((a, b) => a.date.getTime() - b.date.getTime());
  }, [data]);

  const ref = useD3Chart(
    (svg, width, height) => {
      const margin = { top: 10, right: 20, bottom: 36, left: 60 };
      const w = width - margin.left - margin.right;
      const h = height - margin.top - margin.bottom;
      const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

      const x = d3
        .scaleTime()
        .domain(d3.extent(sorted, (d) => d.date) as [Date, Date])
        .range([0, w]);

      const maxAmount = d3.max(sorted, (d) => d.amount) ?? 1;
      const y = d3.scaleLinear().domain([0, maxAmount * 1.15]).nice().range([h, 0]);

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
        .attr('font-size', '10px');

      g.selectAll('.domain').attr('stroke', d3Tokens.axisDomain);
      g.selectAll('.tick line').attr('stroke', d3Tokens.gridLine);

      // X axis
      g.append('g')
        .attr('transform', `translate(0,${h})`)
        .call(
          d3.axisBottom(x)
            .ticks(d3.timeDay.every(Math.max(1, Math.floor(sorted.length / 10))))
            .tickFormat((d) => d3.timeFormat('%d %b')(d as Date)),
        )
        .selectAll('text')
        .attr('fill', d3Tokens.textFaint)
        .attr('font-size', '10px')
        .attr('text-anchor', 'end')
        .attr('transform', 'rotate(-30)')
        .attr('dx', '-0.4em')
        .attr('dy', '0.6em');

      g.selectAll('.domain').attr('stroke', d3Tokens.axisDomain);

      // Area fill
      const area = d3
        .area<{ date: Date; amount: number }>()
        .x((d) => x(d.date))
        .y0(h)
        .y1((d) => y(d.amount))
        .curve(d3.curveMonotoneX);

      g.append('path')
        .datum(sorted)
        .attr('d', area)
        .attr('fill', TEAL_FILL);

      // Line
      const line = d3
        .line<{ date: Date; amount: number }>()
        .x((d) => x(d.date))
        .y((d) => y(d.amount))
        .curve(d3.curveMonotoneX);

      g.append('path')
        .datum(sorted)
        .attr('d', line)
        .attr('fill', 'none')
        .attr('stroke', TEAL)
        .attr('stroke-width', 2.5);

      // Dots + day number labels
      g.selectAll('circle.dot')
        .data(sorted)
        .join('circle')
        .attr('class', 'dot')
        .attr('cx', (d) => x(d.date))
        .attr('cy', (d) => y(d.amount))
        .attr('r', 4)
        .attr('fill', TEAL)
        .attr('stroke', d3Tokens.bg)
        .attr('stroke-width', 1.5);

      // Day number labels above dots
      g.selectAll('text.day-label')
        .data(sorted)
        .join('text')
        .attr('class', 'day-label')
        .attr('x', (d) => x(d.date))
        .attr('y', (d) => y(d.amount) - 10)
        .attr('text-anchor', 'middle')
        .attr('fill', d3Tokens.textMuted)
        .attr('font-size', '9px')
        .attr('font-family', 'IBM Plex Mono, monospace')
        .text((d) => d.date.getDate().toString());
    },
    [sorted, d3Tokens, formatCurrency],
  );

  return (
    <ChartContainer
      title="Daily Disbursement Trend"
      subtitle="Aggregated across products"
      empty={!sorted.length}
    >
      <svg ref={ref} width="100%" height="100%" style={{ overflow: 'visible' }} />
    </ChartContainer>
  );
}
