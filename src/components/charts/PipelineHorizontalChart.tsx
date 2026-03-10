'use client';

import * as d3 from 'd3';
import { useD3Chart } from '@/hooks/useD3Chart';
import { useThemeMode } from '@/lib/theme-context';
import { ChartContainer } from '@/components/charts/ChartContainer';
import { useCurrencyFormat } from '@/lib/currency-context';
import { formatPercent } from '@/lib/format';
import type { CorporatePipelineRow } from '@/lib/types';

interface Props {
  data: CorporatePipelineRow[];
}

/** Strip "Stage X - " prefix from stage names, keeping only the description. */
function shortStage(stage: string): string {
  return stage.replace(/^Stage\s+\d+\s*[-–—]\s*/i, '');
}

const GROSS_COLOR = '#90caf9';
const BID_COLOR = '#1976d2';

export function PipelineHorizontalChart({ data }: Props) {
  const { d3Tokens } = useThemeMode();
  const { formatCurrencyMM } = useCurrencyFormat();

  const ref = useD3Chart(
    (svg, width, height) => {
      // Clean up any stale tooltips
      d3.selectAll('.pipeline-tooltip').remove();

      const margin = { top: 10, right: 80, bottom: 36, left: 130 };
      const w = width - margin.left - margin.right;
      const h = height - margin.top - margin.bottom;
      const g = svg
        .append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);

      const stages = data.map((d) => shortStage(d.stage));

      // Y axis: stage names
      const y = d3
        .scaleBand()
        .domain(stages)
        .range([0, h])
        .padding(0.3);

      // X axis: gross amount (max)
      const maxVal = d3.max(data, (d) => d.grossAmount) ?? 0;
      const x = d3.scaleLinear().domain([0, maxVal * 1.2]).nice().range([0, w]);

      // Grid lines
      g.append('g')
        .call(
          d3
            .axisBottom(x)
            .ticks(4)
            .tickSize(h)
            .tickFormat(() => ''),
        )
        .selectAll('.tick line')
        .attr('stroke', d3Tokens.gridLine);
      g.selectAll('.domain').remove();

      // Tooltip
      const tooltip = d3
        .select('body')
        .append('div')
        .attr('class', 'pipeline-tooltip')
        .style('position', 'absolute')
        .style('pointer-events', 'none')
        .style('opacity', '0')
        .style('background', d3Tokens.tooltipBg)
        .style('border', `1px solid ${d3Tokens.tooltipBorder}`)
        .style('border-radius', '8px')
        .style('padding', '12px 16px')
        .style('font-size', '12px')
        .style('color', d3Tokens.tooltipText)
        .style('box-shadow', '0 4px 12px rgba(0,0,0,0.15)')
        .style('z-index', '9999')
        .style('max-width', '280px')
        .style('line-height', '1.5');

      // Background bars: grossAmount (light blue)
      g.selectAll('.bar-gross')
        .data(data)
        .join('rect')
        .attr('class', 'bar-gross')
        .attr('y', (d) => y(shortStage(d.stage))!)
        .attr('height', y.bandwidth())
        .attr('x', 0)
        .attr('width', (d) => x(d.grossAmount))
        .attr('fill', GROSS_COLOR)
        .attr('opacity', 0.5)
        .attr('rx', 4);

      // Foreground bars: productBid (solid blue)
      g.selectAll('.bar-bid')
        .data(data)
        .join('rect')
        .attr('class', 'bar-bid')
        .attr('y', (d) => y(shortStage(d.stage))!)
        .attr('height', y.bandwidth())
        .attr('x', 0)
        .attr('width', (d) => x(d.productBid))
        .attr('fill', BID_COLOR)
        .attr('opacity', 0.85)
        .attr('rx', 4)
        .style('cursor', 'pointer')
        .on('mouseover', function (event: MouseEvent, d) {
          d3.select(this).attr('opacity', 1).attr('stroke', d3Tokens.text).attr('stroke-width', 1.5);

          const conversion =
            d.grossAmount > 0 ? (d.productBid / d.grossAmount) * 100 : 0;

          const html = `
            <div style="font-weight:700;margin-bottom:6px;font-size:13px">${d.stage}</div>
            <table style="border-collapse:collapse;width:100%">
              <tr>
                <td style="padding:2px 8px 2px 0;color:${d3Tokens.tooltipText}">Gross Amount</td>
                <td style="padding:2px 0;text-align:right;font-family:'IBM Plex Mono',monospace;font-size:11px">${formatCurrencyMM(d.grossAmount)}</td>
              </tr>
              <tr>
                <td style="padding:2px 8px 2px 0;color:${d3Tokens.tooltipText}">Product Bid</td>
                <td style="padding:2px 0;text-align:right;font-family:'IBM Plex Mono',monospace;font-size:11px">${formatCurrencyMM(d.productBid)}</td>
              </tr>
              <tr>
                <td style="padding:2px 8px 2px 0;color:${d3Tokens.tooltipText}">PCR</td>
                <td style="padding:2px 0;text-align:right;font-family:'IBM Plex Mono',monospace;font-size:11px">${formatPercent(d.pcrPct)}</td>
              </tr>
              <tr style="border-top:1px solid ${d3Tokens.tooltipBorder}">
                <td style="padding:4px 8px 0 0;font-weight:600;color:${d3Tokens.tooltipText}">Conversion</td>
                <td style="padding:4px 0 0;text-align:right;font-family:'IBM Plex Mono',monospace;font-size:11px;font-weight:600">${conversion.toFixed(1)}%</td>
              </tr>
            </table>
          `;

          tooltip.html(html).style('opacity', '1');

          const ttNode = tooltip.node() as HTMLDivElement;
          const ttW = ttNode.offsetWidth;
          const ttH = ttNode.offsetHeight;
          let left = event.pageX + 16;
          let top = event.pageY - ttH / 2;
          if (left + ttW > window.innerWidth - 8) left = event.pageX - ttW - 16;
          if (top < 8) top = 8;
          if (top + ttH > window.innerHeight - 8) top = window.innerHeight - ttH - 8;
          tooltip.style('left', `${left}px`).style('top', `${top}px`);
        })
        .on('mousemove', (event: MouseEvent) => {
          const ttNode = tooltip.node() as HTMLDivElement;
          const ttW = ttNode.offsetWidth;
          const ttH = ttNode.offsetHeight;
          let left = event.pageX + 16;
          let top = event.pageY - ttH / 2;
          if (left + ttW > window.innerWidth - 8) left = event.pageX - ttW - 16;
          if (top < 8) top = 8;
          if (top + ttH > window.innerHeight - 8) top = window.innerHeight - ttH - 8;
          tooltip.style('left', `${left}px`).style('top', `${top}px`);
        })
        .on('mouseout', function () {
          d3.select(this).attr('opacity', 0.85).attr('stroke', 'none');
          tooltip.style('opacity', '0');
        });

      // PCR % labels at the right of each gross bar
      g.selectAll('.pcr-label')
        .data(data)
        .join('text')
        .attr('class', 'pcr-label')
        .attr('x', (d) => x(d.grossAmount) + 8)
        .attr('y', (d) => y(shortStage(d.stage))! + y.bandwidth() / 2)
        .attr('dy', '0.35em')
        .attr('fill', d3Tokens.textMuted)
        .attr('font-size', '10px')
        .attr('font-family', 'IBM Plex Mono, monospace')
        .text((d) => formatPercent(d.pcrPct));

      // Y axis: stage labels
      g.append('g')
        .call(d3.axisLeft(y).tickSize(0))
        .selectAll('text')
        .attr('fill', d3Tokens.text)
        .attr('font-size', '11px');

      g.selectAll('.domain, .tick line').remove();

      // Legend at bottom
      const legendG = svg
        .append('g')
        .attr('transform', `translate(${margin.left},${height - 16})`);

      let lx = 0;
      const legendItems = [
        { label: 'Gross Amount', color: GROSS_COLOR, opacity: 0.5 },
        { label: 'Product Bid', color: BID_COLOR, opacity: 0.85 },
      ];

      legendItems.forEach(({ label, color, opacity }) => {
        legendG
          .append('rect')
          .attr('x', lx)
          .attr('y', 0)
          .attr('width', 12)
          .attr('height', 10)
          .attr('fill', color)
          .attr('opacity', opacity)
          .attr('rx', 2);

        const text = legendG
          .append('text')
          .attr('x', lx + 16)
          .attr('y', 9)
          .attr('fill', d3Tokens.textMuted)
          .attr('font-size', '10px')
          .text(label);

        lx += (text.node()?.getComputedTextLength() ?? 60) + 28;
      });
    },
    [data, d3Tokens, formatCurrencyMM],
  );

  return (
    <ChartContainer
      title="Pipeline & Drawdown"
      subtitle="Gross amount vs product bid by stage"
      height={220}
      empty={!data.length}
    >
      <svg ref={ref} width="100%" height="100%" style={{ overflow: 'visible' }} />
    </ChartContainer>
  );
}
