'use client';

import * as d3 from 'd3';
import { useD3Chart } from '@/hooks/useD3Chart';
import { useThemeMode } from '@/lib/theme-context';
import { ChartContainer } from '@/components/charts/ChartContainer';
import { formatCurrency } from '@/lib/format';
import type { RatingDistribution } from '@/lib/types';

interface Props {
  data: RatingDistribution[];
}

export function RatingDistributionBar({ data }: Props) {
  const { d3Tokens } = useThemeMode();

  const ref = useD3Chart(
    (svg, width, height) => {
      const margin = { top: 10, right: 20, bottom: 40, left: 60 };
      const w = width - margin.left - margin.right;
      const h = height - margin.top - margin.bottom;
      const g = svg
        .append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);

      const x = d3
        .scaleBand()
        .domain(data.map((d) => d.ratingBand))
        .range([0, w])
        .padding(0.3);

      const y = d3
        .scaleLinear()
        .domain([0, d3.max(data, (d) => d.balance) ?? 0])
        .nice()
        .range([h, 0]);

      // Color gradient from green (low risk) to red (high risk)
      const colorScale = d3
        .scaleLinear<string>()
        .domain([0, data.length - 1])
        .range(['#4caf50', '#f44336'])
        .interpolate(d3.interpolateHcl);

      // Grid lines
      g.append('g')
        .call(d3.axisLeft(y).ticks(5).tickSize(-w).tickFormat((d) => formatCurrency(+d)))
        .selectAll('text')
        .attr('fill', d3Tokens.textMuted)
        .attr('font-size', '10px');

      g.selectAll('.domain').remove();
      g.selectAll('.tick line').attr('stroke', d3Tokens.gridLine);

      // Bars
      g.selectAll('.bar')
        .data(data)
        .join('rect')
        .attr('class', 'bar')
        .attr('x', (d) => x(d.ratingBand)!)
        .attr('y', (d) => y(d.balance))
        .attr('width', x.bandwidth())
        .attr('height', (d) => h - y(d.balance))
        .attr('fill', (_, i) => colorScale(i))
        .attr('rx', 3)
        .attr('opacity', 0.9)
        .on('mouseover', function () {
          d3.select(this).attr('opacity', 1);
        })
        .on('mouseout', function () {
          d3.select(this).attr('opacity', 0.9);
        });

      // Value labels
      g.selectAll('.val')
        .data(data)
        .join('text')
        .attr('x', (d) => x(d.ratingBand)! + x.bandwidth() / 2)
        .attr('y', (d) => y(d.balance) - 6)
        .attr('text-anchor', 'middle')
        .attr('fill', d3Tokens.textMuted)
        .attr('font-size', '10px')
        .attr('font-family', 'IBM Plex Mono, monospace')
        .text((d) => formatCurrency(d.balance));

      // X axis
      g.append('g')
        .attr('transform', `translate(0,${h})`)
        .call(d3.axisBottom(x).tickSize(0))
        .selectAll('text')
        .attr('fill', d3Tokens.text)
        .attr('font-size', '11px');

      g.selectAll('.domain').attr('stroke', d3Tokens.axisDomain);

      // X axis label
      g.append('text')
        .attr('x', w / 2)
        .attr('y', h + 34)
        .attr('text-anchor', 'middle')
        .attr('fill', d3Tokens.textFaint)
        .attr('font-size', '10px')
        .text('Rating Band');
    },
    [data, d3Tokens],
  );

  return (
    <ChartContainer title="Rating Distribution" subtitle="Balance by rating band" empty={!data.length}>
      <svg ref={ref} width="100%" height="100%" style={{ overflow: 'visible' }} />
    </ChartContainer>
  );
}
