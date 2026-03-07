'use client';

import { useMemo } from 'react';
import * as d3 from 'd3';
import { sankey as d3Sankey, sankeyLinkHorizontal } from 'd3-sankey';
import { useD3Chart } from '@/hooks/useD3Chart';
import { useThemeMode } from '@/lib/theme-context';
import { ChartContainer } from '@/components/charts/ChartContainer';
import { BUCKET_COLORS } from '@/lib/constants';
import type { RollRateTimeSeries, DPDBucket } from '@/lib/types';

interface Props {
  data: RollRateTimeSeries[];
  period?: string;
}

/**
 * Two-column Sankey: source buckets (left) → destination buckets (right).
 * This avoids circular links that d3-sankey cannot handle.
 */
const BUCKETS: DPDBucket[] = ['Current', '1-30', '31-60', '61-90', '91-120', '120+'];

const BUCKET_PREFIX_MAP: Record<string, number> = {
  B1: 0, B2: 1, B3: 2, B4: 3, B5: 4, B6: 5,
};

interface SankeyNode {
  name: string;
  column: 'source' | 'dest';
  bucketIdx: number;
  index?: number;
}

interface SankeyLink {
  source: number;
  target: number;
  value: number;
}

export function RollRateSankey({ data, period }: Props) {
  const { d3Tokens } = useThemeMode();

  const { nodes, links, activePeriod } = useMemo(() => {
    if (!data.length) return { nodes: [], links: [], activePeriod: '' };

    const allPeriods = new Set<string>();
    data.forEach((r) => Object.keys(r.values).forEach((k) => allPeriods.add(k)));
    const sortedPeriods = Array.from(allPeriods).sort();
    const selectedPeriod =
      period && allPeriods.has(period)
        ? period
        : sortedPeriods[sortedPeriods.length - 1] ?? '';

    // Two-column node layout: source buckets [0..5], destination buckets [6..11]
    const nodeList: SankeyNode[] = [
      ...BUCKETS.map((b, i) => ({ name: b, column: 'source' as const, bucketIdx: i })),
      ...BUCKETS.map((b, i) => ({ name: b, column: 'dest' as const, bucketIdx: i })),
    ];

    const linkList: SankeyLink[] = [];
    const DEST_OFFSET = BUCKETS.length; // destination nodes start at index 6

    data.forEach((row) => {
      const metricName = row.metric;
      const value = row.values[selectedPeriod];
      if (value == null || value === 0) return;

      const prefixMatch = metricName.match(/^(B[1-6])/);
      if (!prefixMatch) return;
      const srcIdx = BUCKET_PREFIX_MAP[prefixMatch[1]];
      if (srcIdx == null) return;

      const lowerMetric = metricName.toLowerCase();

      if (lowerMetric.includes('resolution') || lowerMetric.includes('cure')) {
        // Flows to Current destination
        linkList.push({ source: srcIdx, target: DEST_OFFSET + 0, value: Math.abs(value) * 100 });
      } else if (lowerMetric.includes('roll forward') || lowerMetric.includes('rollforward')) {
        const destIdx = Math.min(srcIdx + 1, BUCKETS.length - 1);
        linkList.push({ source: srcIdx, target: DEST_OFFSET + destIdx, value: Math.abs(value) * 100 });
      } else if (lowerMetric.includes('rollback') || lowerMetric.includes('roll back')) {
        const destIdx = Math.max(srcIdx - 1, 0);
        if (destIdx !== srcIdx) {
          linkList.push({ source: srcIdx, target: DEST_OFFSET + destIdx, value: Math.abs(value) * 100 });
        }
      } else if (lowerMetric.includes('stabilize') || lowerMetric.includes('norm')) {
        // Stabilized: stays in same bucket (source → same dest)
        linkList.push({ source: srcIdx, target: DEST_OFFSET + srcIdx, value: Math.abs(value) * 100 });
      }
    });

    const validLinks = linkList.filter((l) => l.value > 0);

    // Remove unused nodes (no links attached)
    const usedNodeIndices = new Set<number>();
    validLinks.forEach((l) => { usedNodeIndices.add(l.source); usedNodeIndices.add(l.target); });

    return { nodes: nodeList, links: validLinks, activePeriod: selectedPeriod };
  }, [data, period]);

  const ref = useD3Chart(
    (svg, width, height) => {
      if (nodes.length === 0 || links.length === 0) return;

      const margin = { top: 10, right: 100, bottom: 10, left: 80 };
      const w = width - margin.left - margin.right;
      const h = height - margin.top - margin.bottom;
      const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

      const sankeyGen = d3Sankey<SankeyNode, SankeyLink>()
        .nodeWidth(18)
        .nodePadding(12)
        .extent([[0, 0], [w, h]]);

      let graph;
      try {
        graph = sankeyGen({
          nodes: nodes.map((n) => ({ ...n })),
          links: links.map((l) => ({ ...l })),
        });
      } catch {
        // Fallback: if sankey still fails, skip rendering
        g.append('text')
          .attr('x', w / 2).attr('y', h / 2)
          .attr('text-anchor', 'middle')
          .attr('fill', d3Tokens.text)
          .attr('font-size', '13px')
          .text('Insufficient flow data for Sankey diagram');
        return;
      }

      // Link color based on destination bucket severity
      const linkColor = (link: { target: { bucketIdx?: number; column?: string } | number }) => {
        const t = typeof link.target === 'object' ? link.target : null;
        const idx = t?.bucketIdx ?? 0;
        if (idx === 0) return '#4caf5080';
        if (idx <= 1) return '#8bc34a80';
        if (idx <= 2) return '#ffeb3b80';
        if (idx <= 3) return '#ff980080';
        return '#f4433680';
      };

      // Draw links
      g.selectAll('path.link')
        .data(graph.links)
        .join('path')
        .attr('class', 'link')
        .attr('d', sankeyLinkHorizontal())
        .attr('fill', 'none')
        .attr('stroke', (d) => linkColor(d as { target: { bucketIdx?: number } }))
        .attr('stroke-width', (d) => Math.max(1, (d as { width?: number }).width ?? 1))
        .attr('opacity', 0.5)
        .on('mouseover', function () { d3.select(this).attr('opacity', 0.8); })
        .on('mouseout', function () { d3.select(this).attr('opacity', 0.5); });

      // Draw nodes
      g.selectAll('rect.node')
        .data(graph.nodes)
        .join('rect')
        .attr('class', 'node')
        .attr('x', (d) => (d as { x0: number }).x0)
        .attr('y', (d) => (d as { y0: number }).y0)
        .attr('width', (d) => (d as { x1: number }).x1 - (d as { x0: number }).x0)
        .attr('height', (d) => Math.max(1, (d as { y1: number }).y1 - (d as { y0: number }).y0))
        .attr('fill', (d) => {
          const name = (d as SankeyNode).name as DPDBucket;
          return BUCKET_COLORS[name] ?? '#64748b';
        })
        .attr('rx', 3)
        .attr('opacity', 0.9);

      // Node labels
      g.selectAll('text.node-label')
        .data(graph.nodes)
        .join('text')
        .attr('class', 'node-label')
        .attr('x', (d) => {
          const col = (d as SankeyNode).column;
          const x0 = (d as { x0: number }).x0;
          const x1 = (d as { x1: number }).x1;
          return col === 'source' ? x0 - 6 : x1 + 6;
        })
        .attr('y', (d) => ((d as { y0: number }).y0 + (d as { y1: number }).y1) / 2)
        .attr('dy', '0.35em')
        .attr('text-anchor', (d) => (d as SankeyNode).column === 'source' ? 'end' : 'start')
        .attr('fill', d3Tokens.text)
        .attr('font-size', '11px')
        .attr('font-weight', 600)
        .text((d) => (d as SankeyNode).name);
    },
    [nodes, links, d3Tokens],
  );

  return (
    <ChartContainer
      title="Roll Rate Flow (Sankey)"
      subtitle={activePeriod ? `Period: ${activePeriod}` : undefined}
      empty={!links.length}
    >
      <svg ref={ref} width="100%" height="100%" style={{ overflow: 'visible' }} />
    </ChartContainer>
  );
}
