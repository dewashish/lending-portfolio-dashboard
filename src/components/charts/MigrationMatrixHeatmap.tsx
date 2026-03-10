'use client';

import { useMemo } from 'react';
import { Box } from '@mui/material';
import * as d3 from 'd3';
import { useD3Chart } from '@/hooks/useD3Chart';
import { useThemeMode } from '@/lib/theme-context';
import { ChartContainer } from '@/components/charts/ChartContainer';
import { formatPercent } from '@/lib/format';
import type { PDMigrationCell } from '@/lib/types';

interface Props {
  data: PDMigrationCell[];
}

const GRADES = ['AAA', 'AA', 'A', 'BBB', 'BB', 'B', 'CCC', 'D'] as const;

const MARGIN = { top: 56, right: 20, bottom: 20, left: 68 };
const ROW_H = 56;
const MIN_CELL_W = 72;

function gradeIndex(grade: string): number {
  return GRADES.indexOf(grade as (typeof GRADES)[number]);
}

export function MigrationMatrixHeatmap({ data }: Props) {
  const { d3Tokens } = useThemeMode();

  const matrix = useMemo(() => {
    const cells: { fromGrade: string; toGrade: string; probability: number }[] = [];
    GRADES.forEach((from) => {
      GRADES.forEach((to) => {
        const match = data.find((d) => d.fromGrade === from && d.toGrade === to);
        cells.push({ fromGrade: from, toGrade: to, probability: match?.probability ?? 0 });
      });
    });
    return cells;
  }, [data]);

  const chartHeight = GRADES.length * ROW_H + MARGIN.top + MARGIN.bottom;
  const chartMinWidth = GRADES.length * MIN_CELL_W + MARGIN.left + MARGIN.right;

  const ref = useD3Chart(
    (svg, width, height) => {
      const w = width - MARGIN.left - MARGIN.right;
      const h = height - MARGIN.top - MARGIN.bottom;
      const g = svg.append('g').attr('transform', `translate(${MARGIN.left},${MARGIN.top})`);

      const x = d3.scaleBand<string>().domain([...GRADES]).range([0, w]).padding(0.06);
      const y = d3.scaleBand<string>().domain([...GRADES]).range([0, h]).padding(0.06);

      // Color function
      const cellColor = (from: string, to: string, prob: number): string => {
        const fi = gradeIndex(from);
        const ti = gradeIndex(to);
        if (fi === ti) return d3.interpolateBlues(Math.min(prob * 1.2, 0.95));
        if (ti < fi) return d3.interpolateGreens(Math.min(prob * 5, 0.95)); // upgrade (lower index = better)
        return d3.interpolateReds(Math.min(prob * 5, 0.95)); // downgrade
      };

      // Draw cells
      g.selectAll('rect.cell')
        .data(matrix)
        .join('rect')
        .attr('class', 'cell')
        .attr('x', (d) => x(d.toGrade)!)
        .attr('y', (d) => y(d.fromGrade)!)
        .attr('width', x.bandwidth())
        .attr('height', y.bandwidth())
        .attr('fill', (d) => cellColor(d.fromGrade, d.toGrade, d.probability))
        .attr('rx', 3)
        .attr('opacity', 0.9)
        .on('mouseover', function () {
          d3.select(this).attr('opacity', 1).attr('stroke', d3Tokens.text).attr('stroke-width', 1.5);
        })
        .on('mouseout', function () {
          d3.select(this).attr('opacity', 0.9).attr('stroke', 'none');
        });

      // Cell labels
      g.selectAll('text.cell-label')
        .data(matrix)
        .join('text')
        .attr('class', 'cell-label')
        .attr('x', (d) => x(d.toGrade)! + x.bandwidth() / 2)
        .attr('y', (d) => y(d.fromGrade)! + y.bandwidth() / 2)
        .attr('dy', '0.35em')
        .attr('text-anchor', 'middle')
        .attr('fill', (d) => {
          const fi = gradeIndex(d.fromGrade);
          const ti = gradeIndex(d.toGrade);
          const intensity = fi === ti ? d.probability * 1.2 : d.probability * 5;
          return intensity > 0.5 ? '#fff' : '#1e293b';
        })
        .attr('font-size', Math.min(12, x.bandwidth() * 0.2) + 'px')
        .attr('font-family', 'IBM Plex Mono, monospace')
        .attr('font-weight', '600')
        .attr('pointer-events', 'none')
        .text((d) => {
          if (x.bandwidth() < 36 || y.bandwidth() < 20) return '';
          if (d.probability === 0) return '';
          return formatPercent(d.probability, 1);
        });

      // X axis (To Grade) - top
      g.append('g')
        .attr('transform', `translate(0,${-6})`)
        .call(d3.axisTop(x).tickSize(0))
        .selectAll('text')
        .attr('fill', d3Tokens.text)
        .attr('font-size', '11px')
        .attr('font-weight', '600');

      g.selectAll('.domain').remove();

      // X axis title
      g.append('text')
        .attr('x', w / 2)
        .attr('y', -36)
        .attr('text-anchor', 'middle')
        .attr('fill', d3Tokens.textMuted)
        .attr('font-size', '11px')
        .attr('font-weight', '600')
        .text('To Grade');

      // Y axis (From Grade)
      g.append('g')
        .call(d3.axisLeft(y).tickSize(0))
        .selectAll('text')
        .attr('fill', d3Tokens.text)
        .attr('font-size', '11px')
        .attr('font-weight', '600');

      g.selectAll('.domain').remove();

      // Y axis title
      g.append('text')
        .attr('transform', 'rotate(-90)')
        .attr('x', -h / 2)
        .attr('y', -48)
        .attr('text-anchor', 'middle')
        .attr('fill', d3Tokens.textMuted)
        .attr('font-size', '11px')
        .attr('font-weight', '600')
        .text('From Grade');
    },
    [matrix, d3Tokens],
  );

  return (
    <ChartContainer
      title="Forward PD Migration Matrix"
      subtitle="Probability of rating transition (1-year horizon)"
      height={chartHeight}
      empty={!data.length}
    >
      <Box sx={{ overflowX: 'auto', width: '100%', height: '100%' }}>
        <svg
          ref={ref}
          style={{ minWidth: chartMinWidth, width: '100%', height: '100%', overflow: 'visible' }}
        />
      </Box>
    </ChartContainer>
  );
}
