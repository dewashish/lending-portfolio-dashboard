'use client';

import * as d3 from 'd3';
import { useD3Chart } from '@/hooks/useD3Chart';
import { useThemeMode } from '@/lib/theme-context';
import { ChartContainer } from '@/components/charts/ChartContainer';
import { formatPercent, formatNumber } from '@/lib/format';
import { useCurrencyFormat } from '@/lib/currency-context';
import type { CorporateMaturityRow } from '@/lib/types';

interface Props {
  data: CorporateMaturityRow[];
}

export function MaturityProfileChart({ data }: Props) {
  const { d3Tokens } = useThemeMode();
  const { formatCurrencyMM } = useCurrencyFormat();

  const ref = useD3Chart(
    (svg, width, height) => {
      // Cleanup stale tooltips
      d3.selectAll('.maturity-tooltip').remove();

      // Create tooltip
      const tooltip = d3.select('body').append('div')
        .attr('class', 'maturity-tooltip')
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

      const margin = { top: 30, right: 20, bottom: 50, left: 70 };
      const w = width - margin.left - margin.right;
      const h = height - margin.top - margin.bottom;
      const g = svg
        .append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);

      // Group data by maturity band and facility basis
      const bands = Array.from(new Set(data.map((d) => d.maturityBand)));
      const facilityTypes = Array.from(new Set(data.map((d) => d.facilityBasis)));
      const colorMap: Record<string, string> = {};
      facilityTypes.forEach((ft, i) => {
        colorMap[ft] = i === 0 ? '#42a5f5' : '#ff9800';
      });

      // X scale: maturity bands
      const x0 = d3
        .scaleBand()
        .domain(bands)
        .range([0, w])
        .padding(0.25);

      const x1 = d3
        .scaleBand()
        .domain(facilityTypes)
        .range([0, x0.bandwidth()])
        .padding(0.08);

      // Y scale: balance
      const maxBalance = d3.max(data, (d) => d.balance) ?? 0;
      const y = d3
        .scaleLinear()
        .domain([0, maxBalance * 1.15])
        .nice()
        .range([h, 0]);

      // Grid lines
      g.append('g')
        .call(
          d3
            .axisLeft(y)
            .ticks(5)
            .tickSize(-w)
            .tickFormat((d) => formatCurrencyMM(+d)),
        )
        .selectAll('text')
        .attr('fill', d3Tokens.textMuted)
        .attr('font-size', '10px');

      g.selectAll('.domain').remove();
      g.selectAll('.tick line').attr('stroke', d3Tokens.gridLine);

      // Bars
      const bandGroups = g
        .selectAll('.band-group')
        .data(bands)
        .join('g')
        .attr('class', 'band-group')
        .attr('transform', (d) => `translate(${x0(d)},0)`);

      bandGroups.each(function (band) {
        const groupData = data.filter((d) => d.maturityBand === band);
        const group = d3.select(this);

        group
          .selectAll('rect')
          .data(groupData)
          .join('rect')
          .attr('x', (d) => x1(d.facilityBasis) ?? 0)
          .attr('y', (d) => y(d.balance))
          .attr('width', x1.bandwidth())
          .attr('height', (d) => h - y(d.balance))
          .attr('fill', (d) => colorMap[d.facilityBasis] ?? '#42a5f5')
          .attr('rx', 3)
          .attr('opacity', 0.9)
          .style('cursor', 'pointer')
          .on('mouseover', function (event, d) {
            d3.select(this).attr('opacity', 1).attr('stroke', d3Tokens.text).attr('stroke-width', 1.5);
            tooltip.html(
              `<strong>${d.maturityBand} &middot; ${d.facilityBasis}</strong><br/>` +
              `Balance: ${formatCurrencyMM(d.balance)}<br/>` +
              `Portfolio Share: ${formatPercent(d.portfolioShare)}<br/>` +
              `Sanctioned Amt: ${formatCurrencyMM(d.sanctionedAmount)}<br/>` +
              `Disbursed Amt: ${formatCurrencyMM(d.disbursedAmount)}<br/>` +
              `Facility Count: ${formatNumber(d.facilityCount)}`
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

        // Portfolio share labels on top of bars
        group
          .selectAll('.share-label')
          .data(groupData)
          .join('text')
          .attr('class', 'share-label')
          .attr('x', (d) => (x1(d.facilityBasis) ?? 0) + x1.bandwidth() / 2)
          .attr('y', (d) => y(d.balance) - 6)
          .attr('text-anchor', 'middle')
          .attr('fill', d3Tokens.textMuted)
          .attr('font-size', '9px')
          .attr('font-family', 'IBM Plex Mono, monospace')
          .text((d) => formatPercent(d.portfolioShare));
      });

      // X axis
      g.append('g')
        .attr('transform', `translate(0,${h})`)
        .call(d3.axisBottom(x0).tickSize(0))
        .selectAll('text')
        .attr('fill', d3Tokens.text)
        .attr('font-size', '10px')
        .attr('dy', '0.8em');

      g.selectAll('.domain').attr('stroke', d3Tokens.axisDomain);

      // X axis label
      g.append('text')
        .attr('x', w / 2)
        .attr('y', h + 42)
        .attr('text-anchor', 'middle')
        .attr('fill', d3Tokens.textFaint)
        .attr('font-size', '10px')
        .text('Maturity Band');

      // Legend
      const legend = g
        .append('g')
        .attr('transform', `translate(${w - facilityTypes.length * 110}, -16)`);

      facilityTypes.forEach((ft, i) => {
        const lg = legend.append('g').attr('transform', `translate(${i * 110}, 0)`);
        lg.append('rect')
          .attr('width', 10)
          .attr('height', 10)
          .attr('rx', 2)
          .attr('fill', colorMap[ft]);
        lg.append('text')
          .attr('x', 14)
          .attr('y', 9)
          .attr('fill', d3Tokens.textMuted)
          .attr('font-size', '10px')
          .text(ft);
      });
    },
    [data, d3Tokens, formatCurrencyMM],
  );

  return (
    <ChartContainer title="Maturity Profile" subtitle="Balance by maturity band and facility type" height={400} empty={!data.length}>
      <svg ref={ref} width="100%" height="100%" style={{ overflow: 'visible' }} />
    </ChartContainer>
  );
}
