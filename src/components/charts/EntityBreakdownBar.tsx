'use client';

import * as d3 from 'd3';
import { useD3Chart } from '@/hooks/useD3Chart';
import { useThemeMode } from '@/lib/theme-context';
import { ChartContainer } from './ChartContainer';
import { useCurrencyFormat } from '@/lib/currency-context';
import type { EntityPerformance } from '@/lib/types';

interface Props {
  data: EntityPerformance[];
  onEntityClick?: (entity: string) => void;
}

export function EntityBreakdownBar({ data, onEntityClick }: Props) {
  const { d3Tokens } = useThemeMode();
  const { formatCurrencyMM } = useCurrencyFormat();
  const filtered = data.filter(d => d.entity !== 'GROUP TOTAL');

  const chartHeight = Math.max(320, filtered.length * 48 + 40);

  const ref = useD3Chart((svg, width, height) => {
    const margin = { top: 10, right: 120, bottom: 30, left: 160 };
    const w = width - margin.left - margin.right;
    const h = height - margin.top - margin.bottom;
    const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

    const y = d3.scaleBand()
      .domain(filtered.map(d => d.entity))
      .range([0, h])
      .padding(0.3);

    const x = d3.scaleLinear()
      .domain([0, d3.max(filtered, d => d.outstanding) ?? 0])
      .range([0, w]);

    const color = d3.scaleOrdinal(d3.schemeTableau10);

    // Bars
    g.selectAll('.bar')
      .data(filtered)
      .join('rect')
      .attr('class', 'bar')
      .attr('y', d => y(d.entity)!)
      .attr('height', y.bandwidth())
      .attr('x', 0)
      .attr('width', d => x(d.outstanding))
      .attr('fill', (_, i) => color(String(i)))
      .attr('rx', 4)
      .style('cursor', 'pointer')
      .on('click', (_, d) => onEntityClick?.(d.entity))
      .on('mouseover', function () { d3.select(this).attr('opacity', 0.8); })
      .on('mouseout', function () { d3.select(this).attr('opacity', 1); });

    // Value labels
    g.selectAll('.val')
      .data(filtered)
      .join('text')
      .attr('x', d => x(d.outstanding) + 6)
      .attr('y', d => y(d.entity)! + y.bandwidth() / 2)
      .attr('dy', '0.35em')
      .attr('fill', d3Tokens.textMuted)
      .attr('font-size', '11px')
      .attr('font-family', 'IBM Plex Mono, monospace')
      .text(d => formatCurrencyMM(d.outstanding));

    // Y axis
    g.append('g')
      .call(d3.axisLeft(y).tickSize(0))
      .selectAll('text')
      .attr('fill', d3Tokens.text)
      .attr('font-size', '11px');

    g.selectAll('.domain, .tick line').remove();

    // X axis
    g.append('g')
      .attr('transform', `translate(0,${h})`)
      .call(d3.axisBottom(x).ticks(5).tickFormat(d => formatCurrencyMM(+d)))
      .selectAll('text')
      .attr('fill', d3Tokens.textFaint)
      .attr('font-size', '10px');

    g.selectAll('.domain').attr('stroke', d3Tokens.axisDomain);
    g.selectAll('.tick line').attr('stroke', d3Tokens.gridLine);
  }, [filtered, d3Tokens, formatCurrencyMM]);

  return (
    <ChartContainer title="Entity Outstanding Breakdown" subtitle="USD mm" height={chartHeight} empty={!filtered.length}>
      <svg ref={ref} width="100%" height="100%" style={{ overflow: 'visible' }} />
    </ChartContainer>
  );
}
