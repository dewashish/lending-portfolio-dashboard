'use client';

import * as d3 from 'd3';
import { useD3Chart } from '@/hooks/useD3Chart';
import { useThemeMode } from '@/lib/theme-context';
import { ChartContainer } from '@/components/charts/ChartContainer';
import { formatPercent } from '@/lib/format';
import { useCurrencyFormat } from '@/lib/currency-context';
import type { CorporatePDDistributionRow } from '@/lib/types';

interface Props {
  data: CorporatePDDistributionRow[];
}

export function PDDistributionChart({ data }: Props) {
  const { d3Tokens } = useThemeMode();
  const { formatCurrency } = useCurrencyFormat();

  const ref = useD3Chart(
    (svg, width, height) => {
      // Cleanup stale tooltips
      d3.selectAll('.pd-dist-tooltip').remove();

      // Create tooltip
      const tooltip = d3.select('body').append('div')
        .attr('class', 'pd-dist-tooltip')
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

      const margin = { top: 10, right: 20, bottom: 40, left: 60 };
      const w = width - margin.left - margin.right;
      const h = height - margin.top - margin.bottom;
      const g = svg
        .append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);

      const x = d3
        .scaleBand()
        .domain(data.map((d) => d.pdBand))
        .range([0, w])
        .padding(0.3);

      const y = d3
        .scaleLinear()
        .domain([0, d3.max(data, (d) => d.principalOS) ?? 0])
        .nice()
        .range([h, 0]);

      // Color gradient from green (low PD) to red (high PD)
      const colorScale = d3
        .scaleLinear<string>()
        .domain([0, data.length - 1])
        .range(['#4caf50', '#f44336'])
        .interpolate(d3.interpolateRgb);

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
        .attr('x', (d) => x(d.pdBand)!)
        .attr('y', (d) => y(d.principalOS))
        .attr('width', x.bandwidth())
        .attr('height', (d) => h - y(d.principalOS))
        .attr('fill', (_, i) => colorScale(i))
        .attr('rx', 3)
        .attr('opacity', 0.9)
        .style('cursor', 'pointer')
        .on('mouseover', function (event, d) {
          d3.select(this).attr('opacity', 1).attr('stroke', d3Tokens.text).attr('stroke-width', 1.5);
          tooltip.html(
            `<strong>${d.pdBand}</strong><br/>` +
            `Principal O/s: ${formatCurrency(d.principalOS)}<br/>` +
            `Portfolio Share: ${formatPercent(d.principalShare)}<br/>` +
            `Sanctioned Amt: ${formatCurrency(d.sanctionedAmount)}<br/>` +
            `Disbursed Amt: ${formatCurrency(d.disbursedAmount)}`
          ).style('opacity', '1');
          const ttNode = tooltip.node() as HTMLDivElement;
          const ttW = ttNode.offsetWidth;
          let left = event.pageX + 16;
          let top = event.pageY - 20;
          if (left + ttW > window.innerWidth - 8) left = event.pageX - ttW - 16;
          if (top < 8) top = 8;
          tooltip.style('left', `${left}px`).style('top', `${top}px`);
        })
        .on('mouseout', function () {
          d3.select(this).attr('opacity', 0.9).attr('stroke', 'none');
          tooltip.style('opacity', '0');
        });

      // Value labels
      g.selectAll('.val')
        .data(data)
        .join('text')
        .attr('x', (d) => x(d.pdBand)! + x.bandwidth() / 2)
        .attr('y', (d) => y(d.principalOS) - 6)
        .attr('text-anchor', 'middle')
        .attr('fill', d3Tokens.textMuted)
        .attr('font-size', '10px')
        .attr('font-family', 'IBM Plex Mono, monospace')
        .text((d) => formatCurrency(d.principalOS));

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
        .text('PD Band');
    },
    [data, d3Tokens, formatCurrency],
  );

  return (
    <ChartContainer title="PD Distribution" subtitle="Principal outstanding by PD band" empty={!data.length}>
      <svg ref={ref} width="100%" height="100%" style={{ overflow: 'visible' }} />
    </ChartContainer>
  );
}
