'use client';

import * as d3 from 'd3';
import { useD3Chart } from '@/hooks/useD3Chart';
import { useThemeMode } from '@/lib/theme-context';
import { ChartContainer } from '../ChartContainer';
import { useCurrencyFormat } from '@/lib/currency-context';

const TOOLTIP_CLASS = 'watchlist-status-tooltip';

const STATUS_COLORS: Record<string, string> = {
  'Active Watch': '#ff9800',
  'Escalated': '#f44336',
  'Monitoring': '#42a5f5',
  'Review Pending': '#78909c',
};

interface Props {
  data: { status: string; count: number; exposure: number }[];
  onBarClick?: (status: string) => void;
}

export function WatchlistStatusBar({ data, onBarClick }: Props) {
  const { d3Tokens } = useThemeMode();
  const { formatCurrency } = useCurrencyFormat();
  const sorted = [...data].sort((a, b) => b.count - a.count);

  const ref = useD3Chart((svg, width, height) => {
    // Clean up any previous tooltip
    d3.selectAll(`.${TOOLTIP_CLASS}`).remove();

    const margin = { top: 10, right: 60, bottom: 20, left: 120 };
    const w = width - margin.left - margin.right;
    const h = height - margin.top - margin.bottom;
    const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

    const y = d3.scaleBand()
      .domain(sorted.map(d => d.status))
      .range([0, h])
      .padding(0.3);

    const x = d3.scaleLinear()
      .domain([0, d3.max(sorted, d => d.count) ?? 0])
      .range([0, w]);

    // -- Tooltip --------------------------------------------------------
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
      .style('box-shadow', '0 4px 12px rgba(0,0,0,0.3)')
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

    // Bars
    g.selectAll('.bar')
      .data(sorted)
      .join('rect')
      .attr('class', 'bar')
      .attr('y', d => y(d.status)!)
      .attr('height', y.bandwidth())
      .attr('x', 0)
      .attr('width', d => x(d.count))
      .attr('fill', d => `${STATUS_COLORS[d.status] ?? '#90a4ae'}40`)
      .attr('stroke', d => STATUS_COLORS[d.status] ?? '#90a4ae')
      .attr('stroke-width', 1.5)
      .attr('rx', 4)
      .style('cursor', onBarClick ? 'pointer' : 'default')
      .on('click', (_, d) => {
        tooltip.style('opacity', '0');
        d3.selectAll(`.${TOOLTIP_CLASS}`).remove();
        onBarClick?.(d.status);
      })
      .on('mouseover', function (_event, d) {
        d3.select(this).attr('opacity', 0.8);
        tooltip.html(
          `<div style="font-weight:700;font-size:12px;margin-bottom:4px">${d.status}</div>` +
          `<div><span style="color:${mutedColor}">Count:</span> <b>${d.count}</b></div>` +
          `<div><span style="color:${mutedColor}">Total Exposure:</span> <b>${formatCurrency(d.exposure)}</b></div>`
        ).style('opacity', '1');
        positionTooltip(_event as unknown as MouseEvent);
      })
      .on('mousemove', function (_event) {
        positionTooltip(_event as unknown as MouseEvent);
      })
      .on('mouseout', function () {
        d3.select(this).attr('opacity', 1);
        tooltip.style('opacity', '0');
      });

    // Value labels
    g.selectAll('.val')
      .data(sorted)
      .join('text')
      .attr('x', d => x(d.count) + 6)
      .attr('y', d => y(d.status)! + y.bandwidth() / 2)
      .attr('dy', '0.35em')
      .attr('fill', d3Tokens.textMuted)
      .attr('font-size', '11px')
      .attr('font-family', 'IBM Plex Mono, monospace')
      .text(d => d.count);

    // Y axis
    g.append('g')
      .call(d3.axisLeft(y).tickSize(0))
      .selectAll('text')
      .attr('fill', d3Tokens.text)
      .attr('font-size', '11px')
      .attr('font-weight', 600);

    g.selectAll('.domain, .tick line').remove();
  }, [sorted, d3Tokens, onBarClick, formatCurrency]);

  return (
    <ChartContainer title="Status Distribution" subtitle="Borrower count by watchlist status" empty={!sorted.length}>
      <svg ref={ref} width="100%" height="100%" style={{ overflow: 'visible' }} />
    </ChartContainer>
  );
}
