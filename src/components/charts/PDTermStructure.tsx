'use client';

import { useMemo } from 'react';
import * as d3 from 'd3';
import { useD3Chart } from '@/hooks/useD3Chart';
import { useThemeMode } from '@/lib/theme-context';
import { ChartContainer } from '@/components/charts/ChartContainer';
import { formatPercent } from '@/lib/format';
import type { PDTermStructureRow } from '@/lib/types';

interface Props {
  data: PDTermStructureRow[];
}

const GRADE_COLORS: Record<string, string> = {
  AAA: '#4caf50',
  AA: '#66bb6a',
  A: '#8bc34a',
  BBB: '#ff9800',
  BB: '#f57c00',
  B: '#f44336',
  CCC: '#b71c1c',
};

const DISPLAY_GRADES = ['AAA', 'AA', 'A', 'BBB', 'BB', 'B', 'CCC'];

export function PDTermStructure({ data }: Props) {
  const { d3Tokens } = useThemeMode();

  const filtered = useMemo(
    () => data.filter((d) => DISPLAY_GRADES.includes(d.ratingGrade)),
    [data],
  );

  const grouped = useMemo(() => {
    const map = new Map<string, PDTermStructureRow[]>();
    filtered.forEach((row) => {
      const arr = map.get(row.ratingGrade) ?? [];
      arr.push(row);
      map.set(row.ratingGrade, arr);
    });
    return map;
  }, [filtered]);

  const grades = useMemo(
    () => DISPLAY_GRADES.filter((g) => grouped.has(g)),
    [grouped],
  );

  const ref = useD3Chart(
    (svg, width, height) => {
      const margin = { top: 28, right: 70, bottom: 36, left: 54 };
      const w = width - margin.left - margin.right;
      const h = height - margin.top - margin.bottom;
      const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

      const allHorizons = filtered.map((d) => d.horizonYears);
      const allPds = filtered.map((d) => d.cumulativePd);

      const x = d3
        .scaleLinear()
        .domain([d3.min(allHorizons) ?? 1, d3.max(allHorizons) ?? 5])
        .range([0, w]);

      const y = d3
        .scaleLinear()
        .domain([0, (d3.max(allPds) ?? 0.1) * 1.1])
        .nice()
        .range([h, 0]);

      // Grid
      g.append('g')
        .call(
          d3
            .axisLeft(y)
            .ticks(6)
            .tickFormat((d) => formatPercent(+d, 1))
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
        .call(d3.axisBottom(x).ticks(5).tickFormat((d) => `${d}Y`))
        .selectAll('text')
        .attr('fill', d3Tokens.textFaint)
        .attr('font-size', '10px');

      // X axis label
      g.append('text')
        .attr('x', w / 2)
        .attr('y', h + 30)
        .attr('text-anchor', 'middle')
        .attr('fill', d3Tokens.textFaint)
        .attr('font-size', '10px')
        .text('Horizon (Years)');

      // Lines per grade
      const line = d3
        .line<PDTermStructureRow>()
        .x((d) => x(d.horizonYears))
        .y((d) => y(d.cumulativePd))
        .curve(d3.curveMonotoneX);

      grades.forEach((grade) => {
        const points = (grouped.get(grade) ?? []).sort((a, b) => a.horizonYears - b.horizonYears);
        const clr = GRADE_COLORS[grade] ?? '#999';

        // Line
        g.append('path')
          .datum(points)
          .attr('d', line)
          .attr('fill', 'none')
          .attr('stroke', clr)
          .attr('stroke-width', 2)
          .attr('opacity', 0.85);

        // Dots
        g.selectAll(`.dot-${grade}`)
          .data(points)
          .join('circle')
          .attr('cx', (d) => x(d.horizonYears))
          .attr('cy', (d) => y(d.cumulativePd))
          .attr('r', 3.5)
          .attr('fill', clr)
          .attr('stroke', d3Tokens.bg)
          .attr('stroke-width', 1);

        // Value label on rightmost point
        const last = points[points.length - 1];
        if (last) {
          g.append('text')
            .attr('x', x(last.horizonYears) + 6)
            .attr('y', y(last.cumulativePd))
            .attr('dy', '0.35em')
            .attr('fill', clr)
            .attr('font-size', '10px')
            .attr('font-family', 'IBM Plex Mono, monospace')
            .attr('font-weight', '600')
            .text(formatPercent(last.cumulativePd, 1));
        }
      });

      // Legend at top
      const legendG = svg
        .append('g')
        .attr('transform', `translate(${margin.left},${12})`);

      let legendX = 0;
      grades.forEach((grade) => {
        const clr = GRADE_COLORS[grade] ?? '#999';

        legendG
          .append('line')
          .attr('x1', legendX)
          .attr('y1', 5)
          .attr('x2', legendX + 14)
          .attr('y2', 5)
          .attr('stroke', clr)
          .attr('stroke-width', 2);

        legendG
          .append('circle')
          .attr('cx', legendX + 7)
          .attr('cy', 5)
          .attr('r', 2.5)
          .attr('fill', clr);

        const label = legendG
          .append('text')
          .attr('x', legendX + 18)
          .attr('y', 9)
          .attr('fill', d3Tokens.textMuted)
          .attr('font-size', '9px')
          .text(grade);

        legendX += (label.node()?.getComputedTextLength() ?? 30) + 24;
      });
    },
    [filtered, grouped, grades, d3Tokens],
  );

  return (
    <ChartContainer
      title="PD Term Structure"
      subtitle="Cumulative PD curves by rating grade (1-5 year horizon)"
      empty={!filtered.length}
    >
      <svg ref={ref} width="100%" height="100%" style={{ overflow: 'visible' }} />
    </ChartContainer>
  );
}
