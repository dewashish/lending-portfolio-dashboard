'use client';

import * as d3 from 'd3';
import { useD3Chart } from '@/hooks/useD3Chart';
import { useThemeMode } from '@/lib/theme-context';
import { ChartContainer } from '@/components/charts/ChartContainer';
import { formatCurrency, formatPercent } from '@/lib/format';
import type { ConcentrationNode } from '@/lib/types';

interface Props {
  data: ConcentrationNode[];
  groupBy: 'obligor' | 'sector';
}

export function ConcentrationTreemap({ data, groupBy }: Props) {
  const { d3Tokens } = useThemeMode();
  const filtered = data.filter((d) => d.category === groupBy && d.value > 0);

  const chartHeight = Math.max(360, filtered.length * 28 + 8);

  const ref = useD3Chart(
    (svg, width, height) => {
      const margin = { top: 4, right: 4, bottom: 4, left: 4 };
      const w = width - margin.left - margin.right;
      const h = height - margin.top - margin.bottom;
      const g = svg
        .append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);

      const color = d3.scaleOrdinal(d3.schemeSet2);

      // Build hierarchy
      const root = d3
        .hierarchy<{ name: string; children?: ConcentrationNode[] }>({
          name: 'root',
          children: filtered,
        })
        .sum((d) => (d as ConcentrationNode).value ?? 0)
        .sort((a, b) => (b.value ?? 0) - (a.value ?? 0));

      d3.treemap<{ name: string; children?: ConcentrationNode[] }>()
        .size([w, h])
        .padding(2)
        .round(true)(root);

      type TreemapNode = d3.HierarchyRectangularNode<{ name: string; children?: ConcentrationNode[] }>;
      const leaves = root.leaves() as TreemapNode[];

      // Rectangles
      g.selectAll('rect')
        .data(leaves)
        .join('rect')
        .attr('x', (d) => d.x0!)
        .attr('y', (d) => d.y0!)
        .attr('width', (d) => d.x1! - d.x0!)
        .attr('height', (d) => d.y1! - d.y0!)
        .attr('fill', (_, i) => color(String(i)))
        .attr('opacity', 0.85)
        .attr('rx', 3)
        .on('mouseover', function () {
          d3.select(this).attr('opacity', 1);
        })
        .on('mouseout', function () {
          d3.select(this).attr('opacity', 0.85);
        });

      // Labels — name
      g.selectAll('.label-name')
        .data(leaves)
        .join('text')
        .attr('class', 'label-name')
        .attr('x', (d) => d.x0! + 6)
        .attr('y', (d) => d.y0! + 16)
        .attr('fill', d3Tokens.treemapLabel)
        .attr('font-size', '11px')
        .attr('font-weight', 600)
        .attr('pointer-events', 'none')
        .text((d) => {
          const cellW = d.x1! - d.x0!;
          const node = d.data as ConcentrationNode;
          if (cellW < 60) return '';
          return node.name.length > cellW / 7
            ? node.name.slice(0, Math.floor(cellW / 7)) + '...'
            : node.name;
        });

      // Labels — value
      g.selectAll('.label-val')
        .data(leaves)
        .join('text')
        .attr('class', 'label-val')
        .attr('x', (d) => d.x0! + 6)
        .attr('y', (d) => d.y0! + 30)
        .attr('fill', d3Tokens.treemapLabel)
        .attr('font-size', '10px')
        .attr('font-family', 'IBM Plex Mono, monospace')
        .attr('pointer-events', 'none')
        .text((d) => {
          const cellW = d.x1! - d.x0!;
          const cellH = d.y1! - d.y0!;
          if (cellW < 60 || cellH < 36) return '';
          const node = d.data as ConcentrationNode;
          return `${formatCurrency(node.value)} (${formatPercent(node.portfolioShare)})`;
        });
    },
    [filtered, groupBy, d3Tokens],
  );

  return (
    <ChartContainer
      title={`Concentration — ${groupBy === 'obligor' ? 'Obligor' : 'Sector'}`}
      height={chartHeight}
      empty={!filtered.length}
    >
      <svg ref={ref} width="100%" height="100%" style={{ overflow: 'visible' }} />
    </ChartContainer>
  );
}
