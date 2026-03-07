'use client';

import * as d3 from 'd3';
import { useD3Chart } from '@/hooks/useD3Chart';
import { useThemeMode } from '@/lib/theme-context';
import { ChartContainer } from '@/components/charts/ChartContainer';
import type { EWSEntitySummary } from '@/lib/types';

interface Props {
  data: EWSEntitySummary[];
}

const AXES: { key: keyof EWSEntitySummary; label: string }[] = [
  { key: 'score0', label: 'Score 0' },
  { key: 'score1', label: 'Score 1' },
  { key: 'score2', label: 'Score 2' },
  { key: 'score3', label: 'Score 3' },
  { key: 'score4Plus', label: 'Score 4+' },
];

export function EWSRadar({ data }: Props) {
  const { d3Tokens } = useThemeMode();
  const color = d3.scaleOrdinal(d3.schemeTableau10);

  const ref = useD3Chart(
    (svg, width, height) => {
      const cx = width / 2;
      const cy = height / 2;
      const radius = Math.min(cx, cy) - 40;
      const levels = 5;
      const angleSlice = (Math.PI * 2) / AXES.length;

      const g = svg.append('g').attr('transform', `translate(${cx},${cy})`);

      // Compute max per axis for normalization
      const maxPerAxis = AXES.map((axis) =>
        Math.max(1, d3.max(data, (d) => d[axis.key] as number) ?? 1),
      );

      // Grid circles
      for (let level = 1; level <= levels; level++) {
        const r = (radius / levels) * level;
        g.append('circle')
          .attr('r', r)
          .attr('fill', 'none')
          .attr('stroke', d3Tokens.gridStroke)
          .attr('stroke-dasharray', '3,3');
      }

      // Axis lines and labels
      AXES.forEach((axis, i) => {
        const angle = angleSlice * i - Math.PI / 2;
        const x2 = Math.cos(angle) * radius;
        const y2 = Math.sin(angle) * radius;

        g.append('line')
          .attr('x1', 0)
          .attr('y1', 0)
          .attr('x2', x2)
          .attr('y2', y2)
          .attr('stroke', d3Tokens.axisDomain);

        g.append('text')
          .attr('x', Math.cos(angle) * (radius + 18))
          .attr('y', Math.sin(angle) * (radius + 18))
          .attr('text-anchor', 'middle')
          .attr('dy', '0.35em')
          .attr('fill', d3Tokens.textMuted)
          .attr('font-size', '10px')
          .text(axis.label);
      });

      // Threshold polygon (normalized value = 0.6 threshold)
      const thresholdValue = 0.6;
      const thresholdPoints = AXES.map((_, i) => {
        const angle = angleSlice * i - Math.PI / 2;
        const r = radius * thresholdValue;
        return `${Math.cos(angle) * r},${Math.sin(angle) * r}`;
      }).join(' ');

      g.append('polygon')
        .attr('points', thresholdPoints)
        .attr('fill', 'none')
        .attr('stroke', '#f44336')
        .attr('stroke-width', 1.5)
        .attr('stroke-dasharray', '6,3')
        .attr('opacity', 0.6);

      // Entity polygons
      data.forEach((entity, idx) => {
        const points = AXES.map((axis, i) => {
          const angle = angleSlice * i - Math.PI / 2;
          const val = (entity[axis.key] as number) / maxPerAxis[i];
          const r = radius * Math.min(val, 1);
          return `${Math.cos(angle) * r},${Math.sin(angle) * r}`;
        }).join(' ');

        g.append('polygon')
          .attr('points', points)
          .attr('fill', color(String(idx)))
          .attr('fill-opacity', 0.15)
          .attr('stroke', color(String(idx)))
          .attr('stroke-width', 2);

        // Dots
        AXES.forEach((axis, i) => {
          const angle = angleSlice * i - Math.PI / 2;
          const val = (entity[axis.key] as number) / maxPerAxis[i];
          const r = radius * Math.min(val, 1);
          g.append('circle')
            .attr('cx', Math.cos(angle) * r)
            .attr('cy', Math.sin(angle) * r)
            .attr('r', 3)
            .attr('fill', color(String(idx)));
        });
      });

      // Legend
      const legend = svg.append('g').attr('transform', `translate(12,16)`);

      data.forEach((entity, i) => {
        const row = legend.append('g').attr('transform', `translate(0,${i * 18})`);
        row
          .append('rect')
          .attr('width', 10)
          .attr('height', 10)
          .attr('rx', 2)
          .attr('fill', color(String(i)));
        row
          .append('text')
          .attr('x', 14)
          .attr('y', 9)
          .attr('fill', d3Tokens.textMuted)
          .attr('font-size', '10px')
          .text(entity.entity);
      });
    },
    [data, d3Tokens],
  );

  return (
    <ChartContainer title="EWS Radar — Score Distribution" empty={!data.length}>
      <svg ref={ref} width="100%" height="100%" style={{ overflow: 'visible' }} />
    </ChartContainer>
  );
}
