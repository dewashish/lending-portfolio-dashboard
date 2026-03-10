'use client';

import * as d3 from 'd3';
import { useD3Chart } from '@/hooks/useD3Chart';
import { useThemeMode } from '@/lib/theme-context';
import { ChartContainer } from '@/components/charts/ChartContainer';
import { useCurrencyFormat } from '@/lib/currency-context';
import { formatPercent } from '@/lib/format';
import type { RatingDistribution } from '@/lib/types';

const TOOLTIP_CLASS = 'rating-dist-tooltip';

interface Props {
  data: RatingDistribution[];
  period?: string;
}

export function RatingDistributionBar({ data, period }: Props) {
  const { d3Tokens } = useThemeMode();
  const { formatCurrency } = useCurrencyFormat();

  const ref = useD3Chart(
    (svg, width, height) => {
      d3.selectAll(`.${TOOLTIP_CLASS}`).remove();

      const margin = { top: 10, right: 20, bottom: 40, left: 60 };
      const w = width - margin.left - margin.right;
      const h = height - margin.top - margin.bottom;
      const g = svg
        .append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);

      const x = d3
        .scaleBand()
        .domain(data.map((d) => d.ratingBand))
        .range([0, w])
        .padding(0.3);

      const y = d3
        .scaleLinear()
        .domain([0, d3.max(data, (d) => d.balance) ?? 0])
        .nice()
        .range([h, 0]);

      // Color gradient from green (low risk) to red (high risk)
      const colorScale = d3
        .scaleLinear<string>()
        .domain([0, data.length - 1])
        .range(['#4caf50', '#f44336'])
        .interpolate(d3.interpolateHcl);

      // Tooltip
      const tooltip = d3.select('body').append('div')
        .attr('class', TOOLTIP_CLASS)
        .style('position', 'absolute')
        .style('pointer-events', 'none')
        .style('opacity', '0')
        .style('background', d3Tokens.tooltipBg)
        .style('border', `1px solid ${d3Tokens.tooltipBorder}`)
        .style('border-radius', '8px')
        .style('padding', '10px 14px')
        .style('font-size', '11px')
        .style('color', d3Tokens.tooltipText)
        .style('box-shadow', '0 4px 12px rgba(0,0,0,0.15)')
        .style('z-index', '9999')
        .style('max-width', '280px')
        .style('line-height', '1.6')
        .style('transition', 'opacity 0.15s ease');

      const mutedColor = d3Tokens.textMuted;

      function positionTooltip(event: MouseEvent) {
        const ttNode = tooltip.node() as HTMLDivElement;
        const ttW = ttNode.offsetWidth;
        const ttH = ttNode.offsetHeight;
        let left = event.pageX + 12;
        let top = event.pageY - 10;
        if (left + ttW > window.innerWidth - 8) left = event.pageX - ttW - 12;
        if (top + ttH > window.innerHeight + window.scrollY - 8) top = event.pageY - ttH - 10;
        if (top < window.scrollY + 4) top = window.scrollY + 4;
        tooltip.style('left', `${left}px`).style('top', `${top}px`);
      }

      // Grid lines
      g.append('g')
        .call(d3.axisLeft(y).ticks(5).tickSize(-w).tickFormat((d) => formatCurrency(+d)))
        .selectAll('text')
        .attr('fill', d3Tokens.textMuted)
        .attr('font-size', '10px');

      g.selectAll('.domain').remove();
      g.selectAll('.tick line').attr('stroke', d3Tokens.gridLine);

      // Bars
      g.selectAll('.bar')
        .data(data)
        .join('rect')
        .attr('class', 'bar')
        .attr('x', (d) => x(d.ratingBand)!)
        .attr('y', (d) => y(d.balance))
        .attr('width', x.bandwidth())
        .attr('height', (d) => h - y(d.balance))
        .attr('fill', (_, i) => colorScale(i))
        .attr('rx', 3)
        .attr('opacity', 0.9)
        .on('mouseover', function (_event, d) {
          d3.select(this).attr('opacity', 1).attr('stroke', d3Tokens.text).attr('stroke-width', 1.5);
          tooltip.html(
            `<div style="font-weight:700;font-size:12px;margin-bottom:4px">${d.ratingBand}</div>` +
            `<div><span style="color:${mutedColor}">Balance:</span> <b>${formatCurrency(d.balance)}</b></div>` +
            `<div><span style="color:${mutedColor}">Facilities:</span> <b>${d.count}</b></div>` +
            `<div><span style="color:${mutedColor}">Share:</span> <b>${formatPercent(d.portfolioShare)}</b></div>`
          ).style('opacity', '1');
          positionTooltip(_event as unknown as MouseEvent);
        })
        .on('mousemove', function (_event) {
          positionTooltip(_event as unknown as MouseEvent);
        })
        .on('mouseout', function () {
          d3.select(this).attr('opacity', 0.9).attr('stroke', 'none');
          tooltip.style('opacity', '0');
        });

      // Value labels
      g.selectAll('.val')
        .data(data)
        .join('text')
        .attr('x', (d) => x(d.ratingBand)! + x.bandwidth() / 2)
        .attr('y', (d) => y(d.balance) - 6)
        .attr('text-anchor', 'middle')
        .attr('fill', d3Tokens.textMuted)
        .attr('font-size', '10px')
        .attr('font-family', 'IBM Plex Mono, monospace')
        .text((d) => formatCurrency(d.balance));

      // X axis
      g.append('g')
        .attr('transform', `translate(0,${h})`)
        .call(d3.axisBottom(x).tickSize(0))
        .selectAll('text')
        .attr('fill', d3Tokens.text)
        .attr('font-size', '11px');

      g.selectAll('.domain').attr('stroke', d3Tokens.axisDomain);

      // X axis label
      g.append('text')
        .attr('x', w / 2)
        .attr('y', h + 34)
        .attr('text-anchor', 'middle')
        .attr('fill', d3Tokens.textFaint)
        .attr('font-size', '10px')
        .text('Rating Band');
    },
    [data, d3Tokens, formatCurrency],
  );

  const subtitle = period ? `Balance by rating band — ${period}` : 'Balance by rating band';

  return (
    <ChartContainer title="Rating Distribution" subtitle={subtitle} empty={!data.length}>
      <svg ref={ref} width="100%" height="100%" style={{ overflow: 'visible' }} />
    </ChartContainer>
  );
}
