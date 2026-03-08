'use client';

import { useMemo } from 'react';
import * as d3 from 'd3';
import { useD3Chart } from '@/hooks/useD3Chart';
import { useThemeMode } from '@/lib/theme-context';
import { ChartContainer } from '@/components/charts/ChartContainer';
import { formatPercent } from '@/lib/format';
import type { CollectionMetricRow } from '@/lib/types';

interface Props {
  data: CollectionMetricRow[];
}

interface LineData {
  label: string;
  portfolio: string;
  type: 'normalized' | 'rollBackward';
  points: { bucket: string; value: number }[];
}

export function CollectionTrend({ data }: Props) {
  const { d3Tokens } = useThemeMode();

  const { lines, buckets } = useMemo(() => {
    const portfolios = Array.from(new Set(data.map((d) => d.portfolio)));
    const bucketList = Array.from(new Set(data.map((d) => d.bucket)));

    const lineData: LineData[] = [];

    portfolios.forEach((portfolio) => {
      const rows = data.filter((d) => d.portfolio === portfolio);

      // Normalized rate line
      const normalizedPoints = rows
        .filter((r) => r.normalized != null)
        .map((r) => ({ bucket: r.bucket, value: r.normalized! }));
      if (normalizedPoints.length > 0) {
        lineData.push({
          label: `${portfolio} — Normalized`,
          portfolio,
          type: 'normalized',
          points: normalizedPoints,
        });
      }

      // Roll backward rate line
      const rollBackPoints = rows
        .filter((r) => r.rollBackward != null)
        .map((r) => ({ bucket: r.bucket, value: r.rollBackward! }));
      if (rollBackPoints.length > 0) {
        lineData.push({
          label: `${portfolio} — Roll Back`,
          portfolio,
          type: 'rollBackward',
          points: rollBackPoints,
        });
      }
    });

    return { lines: lineData, buckets: bucketList };
  }, [data]);

  const color = useMemo(
    () => d3.scaleOrdinal(d3.schemeTableau10).domain(lines.map((l) => l.label)),
    [lines],
  );

  const ref = useD3Chart(
    (svg, width, height) => {
      const margin = { top: 10, right: 20, bottom: 60, left: 50 };
      const w = width - margin.left - margin.right;
      const h = height - margin.top - margin.bottom;
      const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

      const x = d3.scaleBand<string>().domain(buckets).range([0, w]).padding(0.1);

      const allValues = lines.flatMap((l) => l.points.map((p) => p.value));
      const maxVal = d3.max(allValues) ?? 1;

      const y = d3.scaleLinear().domain([0, maxVal * 1.1]).nice().range([h, 0]);

      // Grid lines
      g.append('g')
        .call(
          d3.axisLeft(y)
            .ticks(6)
            .tickFormat((d) => formatPercent(+d, 0))
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
        .call(d3.axisBottom(x).tickSize(0))
        .selectAll('text')
        .attr('fill', d3Tokens.textFaint)
        .attr('font-size', '10px');

      g.selectAll('.domain').attr('stroke', d3Tokens.axisDomain);

      // Lines
      lines.forEach((lineData) => {
        const lineGen = d3
          .line<{ bucket: string; value: number }>()
          .x((d) => x(d.bucket)! + x.bandwidth() / 2)
          .y((d) => y(d.value))
          .curve(d3.curveMonotoneX);

        g.append('path')
          .datum(lineData.points)
          .attr('d', lineGen)
          .attr('fill', 'none')
          .attr('stroke', color(lineData.label))
          .attr('stroke-width', 2)
          .attr('stroke-dasharray', lineData.type === 'rollBackward' ? '5,3' : 'none')
          .attr('opacity', 0.85);

        // Dots
        g.selectAll(`.dot-${lineData.label.replace(/[^a-zA-Z0-9]/g, '')}`)
          .data(lineData.points)
          .join('circle')
          .attr('cx', (d) => x(d.bucket)! + x.bandwidth() / 2)
          .attr('cy', (d) => y(d.value))
          .attr('r', 3.5)
          .attr('fill', color(lineData.label))
          .attr('stroke', d3Tokens.bg)
          .attr('stroke-width', 1);
      });

      // Legend at bottom
      const legendG = svg
        .append('g')
        .attr('transform', `translate(${margin.left},${height - 16})`);

      let legendX = 0;
      lines.forEach((l) => {
        // Colored line segment
        legendG
          .append('line')
          .attr('x1', legendX)
          .attr('y1', 5)
          .attr('x2', legendX + 14)
          .attr('y2', 5)
          .attr('stroke', color(l.label))
          .attr('stroke-width', 2)
          .attr('stroke-dasharray', l.type === 'rollBackward' ? '4,2' : 'none');

        const label = legendG
          .append('text')
          .attr('x', legendX + 18)
          .attr('y', 9)
          .attr('fill', d3Tokens.textMuted)
          .attr('font-size', '9px')
          .text(l.label);

        legendX += (label.node()?.getComputedTextLength() ?? 60) + 28;
      });
    },
    [lines, buckets, color, d3Tokens],
  );

  return (
    <ChartContainer
      title="Collection Trend"
      subtitle="Normalized and roll-back rates by bucket"
      empty={!data.length}
    >
      <svg ref={ref} width="100%" height="100%" style={{ overflow: 'visible' }} />
    </ChartContainer>
  );
}
