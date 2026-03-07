'use client';

import * as d3 from 'd3';
import { useD3Chart } from '@/hooks/useD3Chart';
import { useThemeMode } from '@/lib/theme-context';
import { ChartContainer } from '@/components/charts/ChartContainer';
import { formatCurrency } from '@/lib/format';
import type { AssetQualityByEntity } from '@/lib/types';

interface Props {
  data: AssetQualityByEntity[];
}

const STAGE_COLORS: Record<string, string> = {
  'Stage 1': '#4caf50',
  'Stage 2': '#ff9800',
  'Stage 3': '#f44336',
};

export function StagingDonut({ data }: Props) {
  const { d3Tokens } = useThemeMode();

  // Aggregate balances across all entities
  const aggregated = data.reduce(
    (acc, row) => {
      acc['Stage 1'] += row.stage1Balance;
      acc['Stage 2'] += row.stage2Balance;
      acc['Stage 3'] += row.stage3Balance;
      return acc;
    },
    { 'Stage 1': 0, 'Stage 2': 0, 'Stage 3': 0 } as Record<string, number>,
  );

  const pieData = Object.entries(aggregated).map(([stage, balance]) => ({
    stage,
    balance,
  }));

  const total = pieData.reduce((s, d) => s + d.balance, 0);

  const ref = useD3Chart(
    (svg, width, height) => {
      const radius = Math.min(width, height) / 2 - 10;
      const innerRadius = radius * 0.55;

      const g = svg
        .append('g')
        .attr('transform', `translate(${width / 2},${height / 2})`);

      const pie = d3
        .pie<{ stage: string; balance: number }>()
        .value((d) => d.balance)
        .sort(null);

      const arc = d3
        .arc<d3.PieArcDatum<{ stage: string; balance: number }>>()
        .innerRadius(innerRadius)
        .outerRadius(radius)
        .cornerRadius(3)
        .padAngle(0.02);

      const arcs = g
        .selectAll('.arc')
        .data(pie(pieData))
        .join('g')
        .attr('class', 'arc');

      arcs
        .append('path')
        .attr('d', arc)
        .attr('fill', (d) => STAGE_COLORS[d.data.stage])
        .attr('opacity', 0.9)
        .on('mouseover', function () {
          d3.select(this).attr('opacity', 1).attr('stroke', d3Tokens.text).attr('stroke-width', 2);
        })
        .on('mouseout', function () {
          d3.select(this).attr('opacity', 0.9).attr('stroke', 'none');
        });

      // Slice labels
      const labelArc = d3
        .arc<d3.PieArcDatum<{ stage: string; balance: number }>>()
        .innerRadius(radius * 0.78)
        .outerRadius(radius * 0.78);

      arcs
        .append('text')
        .attr('transform', (d) => `translate(${labelArc.centroid(d)})`)
        .attr('text-anchor', 'middle')
        .attr('fill', d3Tokens.text)
        .attr('font-size', '11px')
        .attr('font-weight', 600)
        .attr('pointer-events', 'none')
        .text((d) => {
          const pct = ((d.data.balance / total) * 100).toFixed(1);
          return `${d.data.stage.replace('Stage ', 'S')} ${pct}%`;
        });

      // Center text — total
      g.append('text')
        .attr('text-anchor', 'middle')
        .attr('dy', '-0.3em')
        .attr('fill', d3Tokens.text)
        .attr('font-size', '13px')
        .attr('font-weight', 700)
        .text('Total');

      g.append('text')
        .attr('text-anchor', 'middle')
        .attr('dy', '1.1em')
        .attr('fill', d3Tokens.textMuted)
        .attr('font-size', '14px')
        .attr('font-family', 'IBM Plex Mono, monospace')
        .text(formatCurrency(total));

      // Legend
      const legend = svg
        .append('g')
        .attr('transform', `translate(${width - 100},${16})`);

      pieData.forEach((d, i) => {
        const row = legend.append('g').attr('transform', `translate(0,${i * 20})`);
        row
          .append('rect')
          .attr('width', 10)
          .attr('height', 10)
          .attr('rx', 2)
          .attr('fill', STAGE_COLORS[d.stage]);
        row
          .append('text')
          .attr('x', 14)
          .attr('y', 9)
          .attr('fill', d3Tokens.textMuted)
          .attr('font-size', '10px')
          .text(d.stage);
      });
    },
    [pieData, total, d3Tokens],
  );

  return (
    <ChartContainer title="IFRS 9 Staging Distribution" empty={!data.length}>
      <svg ref={ref} width="100%" height="100%" style={{ overflow: 'visible' }} />
    </ChartContainer>
  );
}
