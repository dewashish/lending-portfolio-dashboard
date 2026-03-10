'use client';

import * as d3 from 'd3';
import { useD3Chart } from '@/hooks/useD3Chart';
import { useThemeMode } from '@/lib/theme-context';
import { ChartContainer } from '@/components/charts/ChartContainer';
import { formatPercent } from '@/lib/format';
import { useCurrencyFormat } from '@/lib/currency-context';
import type { CorporateLTVRow } from '@/lib/types';

interface Props {
  data: CorporateLTVRow[];
}

const LTV_COLOR_MAP: Record<string, string> = {
  '<50%': '#4caf50',
  '50-70%': '#8bc34a',
  '70-90%': '#ff9800',
  '>90%': '#f44336',
};

function getLTVColor(band: string): string {
  // Try exact match first
  if (LTV_COLOR_MAP[band]) return LTV_COLOR_MAP[band];
  // Fallback: check keywords
  const lower = band.toLowerCase();
  if (lower.includes('<50') || lower.includes('under 50')) return '#4caf50';
  if (lower.includes('50') && lower.includes('70')) return '#8bc34a';
  if (lower.includes('70') && lower.includes('90')) return '#ff9800';
  if (lower.includes('>90') || lower.includes('over 90') || lower.includes('above 90')) return '#f44336';
  return '#64b5f6';
}

export function LTVDistributionChart({ data }: Props) {
  const { d3Tokens } = useThemeMode();
  const { formatCurrencyMM } = useCurrencyFormat();
  const { formatCurrency } = useCurrencyFormat();

  const ref = useD3Chart(
    (svg, width, height) => {
      // Cleanup stale tooltips
      d3.selectAll('.ltv-dist-tooltip').remove();

      const tooltip = d3.select('body').append('div')
        .attr('class', 'ltv-dist-tooltip')
        .style('position', 'absolute')
        .style('pointer-events', 'none')
        .style('opacity', '0')
        .style('background', d3Tokens.tooltipBg)
        .style('border', `1px solid ${d3Tokens.tooltipBorder}`)
        .style('border-radius', '8px')
        .style('padding', '10px 14px')
        .style('font-size', '11px')
        .style('color', d3Tokens.tooltipText)
        .style('box-shadow', '0 4px 12px rgba(0,0,0,0.3)')
        .style('z-index', '9999')
        .style('max-width', '280px')
        .style('line-height', '1.6')
        .style('transition', 'opacity 0.15s ease');

      const mutedColor = d3Tokens.textMuted;

      const margin = { top: 20, right: 80, bottom: 30, left: 90 };
      const w = width - margin.left - margin.right;
      const h = height - margin.top - margin.bottom;
      const g = svg
        .append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);

      // Y scale: LTV bands
      const y = d3
        .scaleBand()
        .domain(data.map((d) => d.ltvBand))
        .range([0, h])
        .padding(0.3);

      // X scale: balance
      const maxBalance = d3.max(data, (d) => d.balance) ?? 0;
      const x = d3
        .scaleLinear()
        .domain([0, maxBalance * 1.15])
        .nice()
        .range([0, w]);

      // Grid lines
      g.append('g')
        .call(
          d3
            .axisBottom(x)
            .ticks(5)
            .tickSize(h)
            .tickFormat((d) => formatCurrencyMM(+d)),
        )
        .attr('transform', `translate(0,0)`)
        .selectAll('text')
        .attr('fill', d3Tokens.textMuted)
        .attr('font-size', '10px')
        .attr('dy', '-0.5em');

      g.selectAll('.domain').remove();
      g.selectAll('.tick line').attr('stroke', d3Tokens.gridLine);

      // Bars
      g.selectAll('.bar')
        .data(data)
        .join('rect')
        .attr('class', 'bar')
        .attr('x', 0)
        .attr('y', (d) => y(d.ltvBand)!)
        .attr('width', (d) => x(d.balance))
        .attr('height', y.bandwidth())
        .attr('fill', (d) => getLTVColor(d.ltvBand))
        .attr('rx', 3)
        .attr('opacity', 0.9)
        .style('cursor', 'pointer')
        .on('mouseover', function (_event, d) {
          d3.select(this).attr('opacity', 1).attr('stroke', d3Tokens.text).attr('stroke-width', 1.5);
          tooltip.html(
            `<div style="font-weight:700;font-size:12px;margin-bottom:4px">${d.ltvBand}</div>` +
            `<div><span style="color:${mutedColor}">Balance:</span> <b>${formatCurrency(d.balance)}</b></div>` +
            `<div><span style="color:${mutedColor}">Facilities:</span> <b>${d.facilityCount}</b></div>` +
            `<div><span style="color:${mutedColor}">Share:</span> <b>${formatPercent(d.portfolioShare)}</b></div>` +
            (d.sanctioned ? `<div><span style="color:${mutedColor}">Sanctioned:</span> <b>${formatCurrency(d.sanctioned)}</b></div>` : '') +
            (d.disbursed ? `<div><span style="color:${mutedColor}">Disbursed:</span> <b>${formatCurrency(d.disbursed)}</b></div>` : '') +
            (d.pos ? `<div><span style="color:${mutedColor}">POS:</span> <b>${formatCurrency(d.pos)}</b></div>` : '')
          ).style('opacity', '1');
          const ttNode = tooltip.node() as HTMLDivElement;
          const ttW = ttNode.offsetWidth;
          let left = (_event as unknown as MouseEvent).pageX + 12;
          let top = (_event as unknown as MouseEvent).pageY - 10;
          if (left + ttW > window.innerWidth - 8) left = (_event as unknown as MouseEvent).pageX - ttW - 12;
          if (top < 8) top = 8;
          tooltip.style('left', `${left}px`).style('top', `${top}px`);
        })
        .on('mousemove', function (_event) {
          const ttNode = tooltip.node() as HTMLDivElement;
          const ttW = ttNode.offsetWidth;
          let left = (_event as unknown as MouseEvent).pageX + 12;
          let top = (_event as unknown as MouseEvent).pageY - 10;
          if (left + ttW > window.innerWidth - 8) left = (_event as unknown as MouseEvent).pageX - ttW - 12;
          if (top < 8) top = 8;
          tooltip.style('left', `${left}px`).style('top', `${top}px`);
        })
        .on('mouseout', function () {
          d3.select(this).attr('opacity', 0.9).attr('stroke', 'none');
          tooltip.style('opacity', '0');
        });

      // Portfolio share labels at end of bars
      g.selectAll('.share-label')
        .data(data)
        .join('text')
        .attr('class', 'share-label')
        .attr('x', (d) => x(d.balance) + 8)
        .attr('y', (d) => y(d.ltvBand)! + y.bandwidth() / 2)
        .attr('dy', '0.35em')
        .attr('fill', d3Tokens.textMuted)
        .attr('font-size', '10px')
        .attr('font-family', 'IBM Plex Mono, monospace')
        .text((d) => formatPercent(d.portfolioShare));

      // Y axis
      g.append('g')
        .call(d3.axisLeft(y).tickSize(0))
        .selectAll('text')
        .attr('fill', d3Tokens.text)
        .attr('font-size', '11px');

      g.selectAll('.domain').attr('stroke', d3Tokens.axisDomain);
    },
    [data, d3Tokens, formatCurrencyMM, formatCurrency],
  );

  return (
    <ChartContainer title="LTV Distribution" subtitle="Balance by Loan-to-Value band" empty={!data.length}>
      <svg ref={ref} width="100%" height="100%" style={{ overflow: 'visible' }} />
    </ChartContainer>
  );
}
