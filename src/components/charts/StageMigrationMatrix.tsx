'use client';

import { useMemo } from 'react';
import * as d3 from 'd3';
import { useD3Chart } from '@/hooks/useD3Chart';
import { useThemeMode } from '@/lib/theme-context';
import { ChartContainer } from '@/components/charts/ChartContainer';
import { useCurrencyFormat } from '@/lib/currency-context';
import type { TradeStageMigrationRow } from '@/lib/types';

interface Props {
  data: TradeStageMigrationRow[];
}

const STAGES = ['Stage 1', 'Stage 2', 'Stage 3'] as const;

/** Color by migration direction */
const CELL_COLORS: Record<string, string> = {
  'Stage 1->Stage 1': '#4caf50',   // stable green
  'Stage 2->Stage 1': '#66bb6a',   // cure - light green
  'Stage 3->Stage 1': '#81c784',   // upgrade - lighter green
  'Stage 3->Stage 2': '#81c784',   // upgrade - lighter green
  'Stage 2->Stage 2': '#ff9800',   // stable orange
  'Stage 1->Stage 2': '#ffa726',   // watch - amber
  'Stage 2->Stage 3': '#ef5350',   // downgrade - red
  'Stage 1->Stage 3': '#f44336',   // downgrade - dark red
  'Stage 3->Stage 3': '#b71c1c',   // stuck - very dark red
};

interface MatrixCell {
  priorStage: string;
  currentStage: string;
  balance: number;
  facilityCount: number;
}

export function StageMigrationMatrix({ data }: Props) {
  const { d3Tokens } = useThemeMode();
  const { formatCurrencyMM } = useCurrencyFormat();

  // Aggregate into 3x3 matrix using the latest period
  const matrix = useMemo<MatrixCell[]>(() => {
    if (!data.length) return [];

    // Find latest period
    const periods = Array.from(new Set(data.map((d) => d.period))).sort();
    const latestPeriod = periods[periods.length - 1];
    const filtered = data.filter((d) => d.period === latestPeriod);

    // Build cell lookup
    const cellMap = new Map<string, MatrixCell>();
    STAGES.forEach((prior) => {
      STAGES.forEach((current) => {
        cellMap.set(`${prior}->${current}`, {
          priorStage: prior,
          currentStage: current,
          balance: 0,
          facilityCount: 0,
        });
      });
    });

    filtered.forEach((row) => {
      const key = `${row.priorStage}->${row.currentStage}`;
      const cell = cellMap.get(key);
      if (cell) {
        cell.balance += row.balance;
        cell.facilityCount += row.facilityCount;
      }
    });

    const cells: MatrixCell[] = [];
    cellMap.forEach((cell) => cells.push(cell));
    return cells;
  }, [data]);

  const ref = useD3Chart(
    (svg, width, height) => {
      const margin = { top: 50, right: 20, bottom: 20, left: 80 };
      const w = width - margin.left - margin.right;
      const h = height - margin.top - margin.bottom;
      const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

      const x = d3.scaleBand<string>().domain([...STAGES]).range([0, w]).padding(0.08);
      const y = d3.scaleBand<string>().domain([...STAGES]).range([0, h]).padding(0.08);

      // Draw cells
      g.selectAll('rect.cell')
        .data(matrix)
        .join('rect')
        .attr('class', 'cell')
        .attr('x', (d) => x(d.currentStage)!)
        .attr('y', (d) => y(d.priorStage)!)
        .attr('width', x.bandwidth())
        .attr('height', y.bandwidth())
        .attr('fill', (d) => CELL_COLORS[`${d.priorStage}->${d.currentStage}`] ?? '#9e9e9e')
        .attr('rx', 4)
        .attr('opacity', 0.85)
        .on('mouseover', function () {
          d3.select(this).attr('opacity', 1).attr('stroke', d3Tokens.text).attr('stroke-width', 1.5);
        })
        .on('mouseout', function () {
          d3.select(this).attr('opacity', 0.85).attr('stroke', 'none');
        });

      // Balance label (top line in cell)
      g.selectAll('text.balance-label')
        .data(matrix)
        .join('text')
        .attr('class', 'balance-label')
        .attr('x', (d) => x(d.currentStage)! + x.bandwidth() / 2)
        .attr('y', (d) => y(d.priorStage)! + y.bandwidth() / 2 - 6)
        .attr('text-anchor', 'middle')
        .attr('fill', '#fff')
        .attr('font-size', Math.min(12, x.bandwidth() * 0.15) + 'px')
        .attr('font-weight', '700')
        .attr('font-family', 'IBM Plex Mono, monospace')
        .attr('pointer-events', 'none')
        .text((d) => formatCurrencyMM(d.balance));

      // Facility count label (bottom line in cell)
      g.selectAll('text.count-label')
        .data(matrix)
        .join('text')
        .attr('class', 'count-label')
        .attr('x', (d) => x(d.currentStage)! + x.bandwidth() / 2)
        .attr('y', (d) => y(d.priorStage)! + y.bandwidth() / 2 + 12)
        .attr('text-anchor', 'middle')
        .attr('fill', 'rgba(255,255,255,0.75)')
        .attr('font-size', Math.min(10, x.bandwidth() * 0.12) + 'px')
        .attr('font-family', 'IBM Plex Mono, monospace')
        .attr('pointer-events', 'none')
        .text((d) => `${d.facilityCount} fac.`);

      // X axis (Current Stage) - top
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
        .attr('y', -32)
        .attr('text-anchor', 'middle')
        .attr('fill', d3Tokens.textMuted)
        .attr('font-size', '10px')
        .attr('font-weight', '600')
        .text('Current Stage');

      // Y axis (Prior Stage)
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
        .attr('y', -60)
        .attr('text-anchor', 'middle')
        .attr('fill', d3Tokens.textMuted)
        .attr('font-size', '10px')
        .attr('font-weight', '600')
        .text('Prior Stage');
    },
    [matrix, d3Tokens, formatCurrencyMM],
  );

  return (
    <ChartContainer title="Stage Migration Matrix" subtitle="IFRS 9 stage transitions (latest period)" empty={!matrix.length}>
      <svg ref={ref} width="100%" height="100%" style={{ overflow: 'visible' }} />
    </ChartContainer>
  );
}
