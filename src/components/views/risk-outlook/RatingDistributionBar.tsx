'use client';

import * as d3 from 'd3';
import { useD3Chart } from '@/hooks/useD3Chart';
import { useThemeMode } from '@/lib/theme-context';
import { ChartContainer } from '@/components/charts/ChartContainer';
import { formatPercent } from '@/lib/format';
import type { RatingDistributionRow } from '@/lib/types';

interface Props {
  data: RatingDistributionRow[];
}

const GRADES = ['AAA', 'AA', 'A', 'BBB', 'BB', 'B', 'CCC', 'D'];

export function RatingDistributionBar({ data }: Props) {
  const { d3Tokens } = useThemeMode();

  const ref = useD3Chart(
    (svg, width, height) => {
      const margin = { top: 20, right: 20, bottom: 40, left: 50 };
      const w = width - margin.left - margin.right;
      const h = height - margin.top - margin.bottom;
      const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

      const grades = GRADES.filter((gr) => data.some((d) => d.ratingGrade === gr));

      const x0 = d3.scaleBand<string>().domain(grades).range([0, w]).padding(0.2);
      const x1 = d3.scaleBand<string>().domain(['current', 'projected']).range([0, x0.bandwidth()]).padding(0.08);

      const maxShare = d3.max(data, (d) => Math.max(d.currentShare, d.projectedShare)) ?? 0.5;
      const y = d3.scaleLinear().domain([0, maxShare * 1.15]).nice().range([h, 0]);

      // Grid
      g.append('g')
        .call(d3.axisLeft(y).ticks(5).tickFormat((d) => formatPercent(+d, 0)).tickSize(-w))
        .selectAll('text')
        .attr('fill', d3Tokens.textMuted)
        .attr('font-size', '10px');
      g.selectAll('.domain').remove();
      g.selectAll('.tick line').attr('stroke', d3Tokens.gridLine);

      // Bars
      grades.forEach((grade) => {
        const row = data.find((d) => d.ratingGrade === grade);
        if (!row) return;

        // Current
        g.append('rect')
          .attr('x', x0(grade)! + x1('current')!)
          .attr('y', y(row.currentShare))
          .attr('width', x1.bandwidth())
          .attr('height', h - y(row.currentShare))
          .attr('fill', '#2196f3')
          .attr('rx', 2)
          .attr('opacity', 0.85);

        // Projected
        g.append('rect')
          .attr('x', x0(grade)! + x1('projected')!)
          .attr('y', y(row.projectedShare))
          .attr('width', x1.bandwidth())
          .attr('height', h - y(row.projectedShare))
          .attr('fill', '#ff9800')
          .attr('rx', 2)
          .attr('opacity', 0.85);
      });

      // X axis
      g.append('g')
        .attr('transform', `translate(0,${h})`)
        .call(d3.axisBottom(x0).tickSize(0))
        .selectAll('text')
        .attr('fill', d3Tokens.text)
        .attr('font-size', '11px')
        .attr('font-weight', '600');
      g.selectAll('.domain').attr('stroke', d3Tokens.axisDomain);

      // Legend
      const legend = g.append('g').attr('transform', `translate(0, -8)`);
      const items = [
        { label: 'Current', color: '#2196f3' },
        { label: 'Projected', color: '#ff9800' },
      ];
      let lx = 0;
      items.forEach(({ label, color }) => {
        const lg = legend.append('g').attr('transform', `translate(${lx}, 0)`);
        lg.append('rect').attr('width', 12).attr('height', 10).attr('fill', color).attr('rx', 2);
        lg.append('text')
          .attr('x', 16)
          .attr('y', 9)
          .attr('fill', d3Tokens.textMuted)
          .attr('font-size', '10px')
          .text(label);
        lx += label.length * 7 + 30;
      });
    },
    [data, d3Tokens],
  );

  return (
    <ChartContainer title="Rating Distribution Shift" subtitle="Current vs projected portfolio composition" empty={!data.length}>
      <svg ref={ref} width="100%" height="100%" style={{ overflow: 'visible' }} />
    </ChartContainer>
  );
}
