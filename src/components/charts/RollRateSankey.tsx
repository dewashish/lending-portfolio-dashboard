'use client';

import { useMemo, useEffect } from 'react';
import * as d3 from 'd3';
import { sankey as d3Sankey, sankeyLinkHorizontal } from 'd3-sankey';
import { useD3Chart } from '@/hooks/useD3Chart';
import { useThemeMode } from '@/lib/theme-context';
import { ChartContainer } from '@/components/charts/ChartContainer';
import { BUCKET_COLORS } from '@/lib/constants';
import { formatPercent, sortPeriodsChronologically } from '@/lib/format';
import type { RollRateTimeSeries, DPDBucket } from '@/lib/types';

interface Props {
  data: RollRateTimeSeries[];
  period?: string;
}

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
  metricName: string;
  flowType: string;
  rawRate: number;
  prevRate: number | null;
}

function classifyFlow(lowerMetric: string): string {
  if (lowerMetric.includes('resolution') || lowerMetric.includes('cure')) return 'Resolution / Cure';
  if (lowerMetric.includes('roll forward') || lowerMetric.includes('rollforward')) return 'Roll Forward';
  if (lowerMetric.includes('rollback') || lowerMetric.includes('roll back')) return 'Roll Back';
  if (lowerMetric.includes('stabilize') || lowerMetric.includes('norm')) return 'Stabilize';
  return 'Other';
}

const TOOLTIP_CLASS = 'sankey-tooltip';

export function RollRateSankey({ data, period }: Props) {
  const { d3Tokens } = useThemeMode();

  // Cleanup tooltip on unmount
  useEffect(() => {
    return () => { d3.selectAll(`.${TOOLTIP_CLASS}`).remove(); };
  }, []);

  const { nodes, links, activePeriod, previousPeriod } = useMemo(() => {
    if (!data.length) return { nodes: [], links: [], activePeriod: '', previousPeriod: '' };

    const allPeriods = new Set<string>();
    data.forEach((r) => Object.keys(r.values).forEach((k) => allPeriods.add(k)));
    const sortedPeriods = sortPeriodsChronologically(Array.from(allPeriods));
    const selectedPeriod =
      period && allPeriods.has(period)
        ? period
        : sortedPeriods[sortedPeriods.length - 1] ?? '';

    const selectedIdx = sortedPeriods.indexOf(selectedPeriod);
    const prevPeriod = selectedIdx > 0 ? sortedPeriods[selectedIdx - 1] : '';

    const nodeList: SankeyNode[] = [
      ...BUCKETS.map((b, i) => ({ name: b, column: 'source' as const, bucketIdx: i })),
      ...BUCKETS.map((b, i) => ({ name: b, column: 'dest' as const, bucketIdx: i })),
    ];

    const linkList: SankeyLink[] = [];
    const DEST_OFFSET = BUCKETS.length;

    data.forEach((row) => {
      const metricName = row.metric;
      const value = row.values[selectedPeriod];
      if (value == null || value === 0) return;

      const prefixMatch = metricName.match(/^(B[1-6])/);
      if (!prefixMatch) return;
      const srcIdx = BUCKET_PREFIX_MAP[prefixMatch[1]];
      if (srcIdx == null) return;

      const lowerMetric = metricName.toLowerCase();
      const flowType = classifyFlow(lowerMetric);
      const prevValue = prevPeriod ? (row.values[prevPeriod] ?? null) : null;

      const baseLinkData = {
        metricName,
        flowType,
        rawRate: value,
        prevRate: prevValue,
      };

      if (lowerMetric.includes('resolution') || lowerMetric.includes('cure')) {
        linkList.push({ source: srcIdx, target: DEST_OFFSET + 0, value: Math.abs(value) * 100, ...baseLinkData });
      } else if (lowerMetric.includes('roll forward') || lowerMetric.includes('rollforward')) {
        const destIdx = Math.min(srcIdx + 1, BUCKETS.length - 1);
        linkList.push({ source: srcIdx, target: DEST_OFFSET + destIdx, value: Math.abs(value) * 100, ...baseLinkData });
      } else if (lowerMetric.includes('rollback') || lowerMetric.includes('roll back')) {
        const destIdx = Math.max(srcIdx - 1, 0);
        if (destIdx !== srcIdx) {
          linkList.push({ source: srcIdx, target: DEST_OFFSET + destIdx, value: Math.abs(value) * 100, ...baseLinkData });
        }
      } else if (lowerMetric.includes('stabilize') || lowerMetric.includes('norm')) {
        linkList.push({ source: srcIdx, target: DEST_OFFSET + srcIdx, value: Math.abs(value) * 100, ...baseLinkData });
      }
    });

    const validLinks = linkList.filter((l) => l.value > 0);

    return { nodes: nodeList, links: validLinks, activePeriod: selectedPeriod, previousPeriod: prevPeriod };
  }, [data, period]);

  const ref = useD3Chart(
    (svg, width, height) => {
      // Clean up stale tooltips
      d3.selectAll(`.${TOOLTIP_CLASS}`).remove();

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
        g.append('text')
          .attr('x', w / 2).attr('y', h / 2)
          .attr('text-anchor', 'middle')
          .attr('fill', d3Tokens.text)
          .attr('font-size', '13px')
          .text('Insufficient flow data for Sankey diagram');
        return;
      }

      // Link color based on destination bucket severity
      const linkColor = (link: { target: { bucketIdx?: number } | number }) => {
        const t = typeof link.target === 'object' ? link.target : null;
        const idx = t?.bucketIdx ?? 0;
        if (idx === 0) return '#4caf5080';
        if (idx <= 1) return '#8bc34a80';
        if (idx <= 2) return '#ffeb3b80';
        if (idx <= 3) return '#ff980080';
        return '#f4433680';
      };

      // Create tooltip
      const tooltip = d3
        .select('body')
        .append('div')
        .attr('class', TOOLTIP_CLASS)
        .style('position', 'absolute')
        .style('pointer-events', 'none')
        .style('opacity', '0')
        .style('background', d3Tokens.tooltipBg)
        .style('border', `1px solid ${d3Tokens.tooltipBorder}`)
        .style('border-radius', '8px')
        .style('padding', '10px 14px')
        .style('font-size', '12px')
        .style('color', d3Tokens.tooltipText)
        .style('box-shadow', '0 4px 12px rgba(0,0,0,0.3)')
        .style('z-index', '9999')
        .style('max-width', '280px')
        .style('line-height', '1.5')
        .style('transition', 'opacity 0.15s ease');

      const positionTooltip = (event: MouseEvent) => {
        const ttNode = tooltip.node() as HTMLDivElement;
        const ttW = ttNode.offsetWidth;
        const ttH = ttNode.offsetHeight;
        let left = event.pageX + 14;
        let top = event.pageY - ttH / 2;
        if (left + ttW > window.innerWidth - 8) left = event.pageX - ttW - 14;
        if (top < 8) top = 8;
        if (top + ttH > window.innerHeight - 8) top = window.innerHeight - ttH - 8;
        tooltip.style('left', `${left}px`).style('top', `${top}px`);
      };

      // Draw links with tooltip
      g.selectAll('path.link')
        .data(graph.links)
        .join('path')
        .attr('class', 'link')
        .attr('d', sankeyLinkHorizontal())
        .attr('fill', 'none')
        .attr('stroke', (d) => linkColor(d as { target: { bucketIdx?: number } }))
        .attr('stroke-width', (d) => Math.max(1, (d as { width?: number }).width ?? 1))
        .attr('opacity', 0.5)
        .style('cursor', 'pointer')
        .on('mouseover', function (event: MouseEvent, d) {
          d3.select(this).attr('opacity', 0.85).attr('stroke-width', Math.max(2, ((d as { width?: number }).width ?? 1) + 1));

          const linkData = d as unknown as SankeyLink & { source: SankeyNode; target: SankeyNode };
          const srcName = linkData.source?.name ?? '';
          const destName = linkData.target?.name ?? '';
          const rate = linkData.rawRate;
          const prevRate = linkData.prevRate;

          let html = `<div style="font-weight:700;margin-bottom:4px;font-size:13px">${linkData.flowType}</div>`;
          html += `<div style="color:${d3Tokens.textMuted};margin-bottom:6px;font-size:11px">${srcName} → ${destName}</div>`;
          html += `<table style="border-collapse:collapse;width:100%">`;
          html += `<tr>
            <td style="padding:2px 8px 2px 0;white-space:nowrap;font-size:11px">${activePeriod}</td>
            <td style="padding:2px 0;text-align:right;font-family:'IBM Plex Mono',monospace;font-weight:600;font-size:12px">${formatPercent(rate, 1)}</td>
          </tr>`;

          if (prevRate != null && previousPeriod) {
            const delta = rate - prevRate;
            const deltaColor = Math.abs(delta) < 0.001 ? d3Tokens.textMuted : delta > 0 ? '#ef5350' : '#66bb6a';
            html += `<tr>
              <td style="padding:2px 8px 2px 0;white-space:nowrap;font-size:11px;color:${d3Tokens.textMuted}">${previousPeriod}</td>
              <td style="padding:2px 0;text-align:right;font-family:'IBM Plex Mono',monospace;font-size:11px;color:${d3Tokens.textMuted}">${formatPercent(prevRate, 1)}</td>
            </tr>`;
            html += `<tr style="border-top:1px solid ${d3Tokens.tooltipBorder}">
              <td style="padding:4px 8px 0 0;font-size:11px;font-weight:600">Change</td>
              <td style="padding:4px 0 0;text-align:right;font-family:'IBM Plex Mono',monospace;font-size:11px;font-weight:600;color:${deltaColor}">${delta >= 0 ? '+' : ''}${(delta * 100).toFixed(1)}pp</td>
            </tr>`;
          }
          html += '</table>';

          tooltip.html(html).style('opacity', '1');
          positionTooltip(event);
        })
        .on('mousemove', function (event: MouseEvent) {
          positionTooltip(event);
        })
        .on('mouseout', function (_, d) {
          d3.select(this).attr('opacity', 0.5).attr('stroke-width', Math.max(1, ((d as { width?: number }).width ?? 1)));
          tooltip.style('opacity', '0');
        });

      // Draw nodes with tooltip
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
        .attr('opacity', 0.9)
        .style('cursor', 'pointer')
        .on('mouseover', function (event: MouseEvent, d) {
          d3.select(this).attr('opacity', 1).attr('stroke', d3Tokens.text).attr('stroke-width', 1.5);

          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const nodeData = d as any;
          const col = (nodeData as SankeyNode).column;
          const nodeName = (nodeData as SankeyNode).name;
          const isSource = col === 'source';

          let html = `<div style="font-weight:700;margin-bottom:4px;font-size:13px">${nodeName}</div>`;
          html += `<div style="color:${d3Tokens.textMuted};margin-bottom:6px;font-size:11px">${isSource ? 'Outflows' : 'Inflows'} — ${activePeriod}</div>`;

          const relevantLinks: Array<Record<string, unknown>> = isSource ? (nodeData.sourceLinks ?? []) : (nodeData.targetLinks ?? []);

          if (relevantLinks.length > 0) {
            html += '<table style="border-collapse:collapse;width:100%">';
            relevantLinks.forEach((link) => {
              const peer = isSource ? link.target : link.source;
              const peerName = (peer as { name?: string })?.name ?? '';
              const rate = link.rawRate as number;
              html += `<tr>
                <td style="padding:2px 8px 2px 0;white-space:nowrap;font-size:11px">
                  <span style="display:inline-block;width:8px;height:8px;border-radius:2px;background:${BUCKET_COLORS[peerName as DPDBucket] ?? '#64748b'};margin-right:5px;vertical-align:middle"></span>${isSource ? '→' : '←'} ${peerName}
                </td>
                <td style="padding:2px 0;text-align:right;font-family:'IBM Plex Mono',monospace;font-weight:600;font-size:11px">${formatPercent(rate, 1)}</td>
              </tr>`;
            });
            html += '</table>';
          }

          tooltip.html(html).style('opacity', '1');
          positionTooltip(event);
        })
        .on('mousemove', function (event: MouseEvent) {
          positionTooltip(event);
        })
        .on('mouseout', function () {
          d3.select(this).attr('opacity', 0.9).attr('stroke', 'none');
          tooltip.style('opacity', '0');
        });

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
    [nodes, links, d3Tokens, activePeriod, previousPeriod],
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
