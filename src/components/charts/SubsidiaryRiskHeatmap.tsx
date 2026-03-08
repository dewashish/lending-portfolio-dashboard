'use client';

import * as d3 from 'd3';
import { useD3Chart } from '@/hooks/useD3Chart';
import { useThemeMode } from '@/lib/theme-context';
import { ChartContainer } from '@/components/charts/ChartContainer';
import type { RAGStatus } from '@/lib/types';

const RAG_CELL_COLORS: Record<RAGStatus, string> = {
  Green: '#4caf50',
  Amber: '#ff9800',
  Red: '#f44336',
};

export interface RiskHeatmapCell {
  subsidiary: string;
  subsidiaryId: number;
  dimension: string;
  formattedValue: string;
  rag: RAGStatus;
  tabIndex: number; // which tab to navigate to on click
}

interface Props {
  cells: RiskHeatmapCell[];
  subsidiaries: string[];
  dimensions: string[];
  onCellClick?: (subsidiaryId: number, tabIndex: number) => void;
}

const ROW_H = 48;
const MARGIN = { top: 50, right: 20, bottom: 20, left: 160 };

export function SubsidiaryRiskHeatmap({ cells, subsidiaries, dimensions, onCellClick }: Props) {
  const { d3Tokens } = useThemeMode();
  const chartHeight = Math.max(280, subsidiaries.length * ROW_H + MARGIN.top + MARGIN.bottom);

  const ref = useD3Chart(
    (svg, width, height) => {
      const margin = MARGIN;
      const w = width - margin.left - margin.right;
      const h = height - margin.top - margin.bottom;
      const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

      const x = d3.scaleBand<string>().domain(dimensions).range([0, w]).padding(0.08);
      const y = d3.scaleBand<string>().domain(subsidiaries).range([0, h]).padding(0.08);

      // Cells
      g.selectAll('rect.cell')
        .data(cells)
        .join('rect')
        .attr('class', 'cell')
        .attr('x', d => x(d.dimension)!)
        .attr('y', d => y(d.subsidiary)!)
        .attr('width', x.bandwidth())
        .attr('height', y.bandwidth())
        .attr('fill', d => RAG_CELL_COLORS[d.rag])
        .attr('rx', 4)
        .attr('opacity', 0.85)
        .style('cursor', onCellClick ? 'pointer' : 'default')
        .on('click', (_, d) => onCellClick?.(d.subsidiaryId, d.tabIndex))
        .on('mouseover', function () {
          d3.select(this).attr('opacity', 1).attr('stroke', d3Tokens.text).attr('stroke-width', 1.5);
        })
        .on('mouseout', function () {
          d3.select(this).attr('opacity', 0.85).attr('stroke', 'none');
        });

      // Value labels inside cells
      g.selectAll('text.cell-val')
        .data(cells)
        .join('text')
        .attr('class', 'cell-val')
        .attr('x', d => x(d.dimension)! + x.bandwidth() / 2)
        .attr('y', d => y(d.subsidiary)! + y.bandwidth() / 2)
        .attr('dy', '0.35em')
        .attr('text-anchor', 'middle')
        .attr('fill', '#fff')
        .attr('font-size', Math.min(13, x.bandwidth() * 0.18) + 'px')
        .attr('font-weight', 700)
        .attr('font-family', 'IBM Plex Mono, monospace')
        .attr('pointer-events', 'none')
        .text(d => d.formattedValue);

      // X axis — dimension labels at top
      g.append('g')
        .attr('transform', 'translate(0,-6)')
        .call(d3.axisTop(x).tickSize(0))
        .selectAll('text')
        .attr('fill', d3Tokens.text)
        .attr('font-size', '11px')
        .attr('font-weight', 600)
        .attr('text-anchor', 'middle');

      g.selectAll('.domain').remove();

      // Y axis — subsidiary names
      g.append('g')
        .call(d3.axisLeft(y).tickSize(0))
        .selectAll('text')
        .attr('fill', d3Tokens.text)
        .attr('font-size', '11px')
        .attr('font-weight', 600);

      g.selectAll('.domain').remove();
    },
    [cells, subsidiaries, dimensions, d3Tokens, onCellClick],
  );

  return (
    <ChartContainer
      title="Subsidiary Risk Heatmap"
      subtitle="RAG status across risk dimensions — click to drill down"
      height={chartHeight}
      empty={!cells.length}
    >
      <svg ref={ref} width="100%" height="100%" style={{ overflow: 'visible' }} />
    </ChartContainer>
  );
}
