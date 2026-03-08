'use client';

import * as d3 from 'd3';
import { useD3Chart } from '@/hooks/useD3Chart';
import { useThemeMode } from '@/lib/theme-context';
import { ChartContainer } from '@/components/charts/ChartContainer';
import { formatPercent } from '@/lib/format';
import type { CorporateProvisioningRow } from '@/lib/types';

interface Props {
  data: CorporateProvisioningRow[];
}

const STAGE_COLORS: Record<string, string> = {
  'Stage 1': '#4caf50',
  'Stage 2': '#ff9800',
  'Stage 3': '#f44336',
};

export function ProvisioningTrendChart({ data }: Props) {
  const { d3Tokens } = useThemeMode();

  const ref = useD3Chart(
    (svg, width, height) => {
      const margin = { top: 20, right: 30, bottom: 50, left: 55 };
      const w = width - margin.left - margin.right;
      const h = height - margin.top - margin.bottom;
      const g = svg
        .append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);

      // Group data by stage
      const stages = Array.from(new Set(data.map((d) => d.ifrsStage)));
      const periods = Array.from(new Set(data.map((d) => d.period))).sort();

      // X scale
      const x = d3
        .scalePoint()
        .domain(periods)
        .range([0, w])
        .padding(0.5);

      // Y scale: PCR% (0-100)
      const allPCR = data.map((d) => d.pcrPct);
      const maxPCR = d3.max(allPCR) ?? 100;
      const y = d3
        .scaleLinear()
        .domain([0, Math.min(Math.max(maxPCR * 1.15, 10), 100)])
        .nice()
        .range([h, 0]);

      // Grid lines
      g.append('g')
        .call(
          d3
            .axisLeft(y)
            .ticks(5)
            .tickSize(-w)
            .tickFormat((d) => `${d}%`),
        )
        .selectAll('text')
        .attr('fill', d3Tokens.textMuted)
        .attr('font-size', '10px');

      g.selectAll('.domain').remove();
      g.selectAll('.tick line').attr('stroke', d3Tokens.gridLine);

      // Lines and dots for each stage
      const line = d3
        .line<CorporateProvisioningRow>()
        .x((d) => x(d.period)!)
        .y((d) => y(d.pcrPct))
        .curve(d3.curveMonotoneX);

      stages.forEach((stage) => {
        const stageData = data
          .filter((d) => d.ifrsStage === stage)
          .sort((a, b) => a.period.localeCompare(b.period));

        if (stageData.length === 0) return;

        const color = STAGE_COLORS[stage] ?? '#64b5f6';

        // Line
        g.append('path')
          .datum(stageData)
          .attr('fill', 'none')
          .attr('stroke', color)
          .attr('stroke-width', 2.5)
          .attr('d', line);

        // Dots
        g.selectAll(`.dot-${stage.replace(/\s/g, '')}`)
          .data(stageData)
          .join('circle')
          .attr('cx', (d) => x(d.period)!)
          .attr('cy', (d) => y(d.pcrPct))
          .attr('r', 4)
          .attr('fill', color)
          .attr('stroke', d3Tokens.bg)
          .attr('stroke-width', 2);

        // Value labels on last point
        const lastPoint = stageData[stageData.length - 1];
        if (lastPoint) {
          g.append('text')
            .attr('x', x(lastPoint.period)! + 8)
            .attr('y', y(lastPoint.pcrPct))
            .attr('dy', '0.35em')
            .attr('fill', color)
            .attr('font-size', '10px')
            .attr('font-family', 'IBM Plex Mono, monospace')
            .text(formatPercent(lastPoint.pcrPct));
        }
      });

      // X axis
      g.append('g')
        .attr('transform', `translate(0,${h})`)
        .call(d3.axisBottom(x).tickSize(0))
        .selectAll('text')
        .attr('fill', d3Tokens.text)
        .attr('font-size', '10px')
        .attr('text-anchor', 'end')
        .attr('transform', 'rotate(-35)')
        .attr('dx', '-0.5em')
        .attr('dy', '0.5em');

      g.selectAll('.domain').attr('stroke', d3Tokens.axisDomain);

      // Legend at bottom
      const legend = g
        .append('g')
        .attr('transform', `translate(0, -8)`);

      let legendX = 0;
      stages.forEach((stage) => {
        const color = STAGE_COLORS[stage] ?? '#64b5f6';
        const lg = legend.append('g').attr('transform', `translate(${legendX}, 0)`);
        lg.append('line')
          .attr('x1', 0)
          .attr('y1', 5)
          .attr('x2', 16)
          .attr('y2', 5)
          .attr('stroke', color)
          .attr('stroke-width', 2.5);
        lg.append('circle')
          .attr('cx', 8)
          .attr('cy', 5)
          .attr('r', 3)
          .attr('fill', color);
        lg.append('text')
          .attr('x', 20)
          .attr('y', 9)
          .attr('fill', d3Tokens.textMuted)
          .attr('font-size', '10px')
          .text(stage);
        legendX += stage.length * 7 + 35;
      });
    },
    [data, d3Tokens],
  );

  return (
    <ChartContainer title="PCR Trend" subtitle="Provision coverage ratio by IFRS stage over time" empty={!data.length}>
      <svg ref={ref} width="100%" height="100%" style={{ overflow: 'visible' }} />
    </ChartContainer>
  );
}
