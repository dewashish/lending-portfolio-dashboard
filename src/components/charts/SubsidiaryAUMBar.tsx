'use client';

import * as d3 from 'd3';
import { useD3Chart } from '@/hooks/useD3Chart';
import { useThemeMode } from '@/lib/theme-context';
import { ChartContainer } from './ChartContainer';
import { useCurrencyFormat, useCurrency } from '@/lib/currency-context';
import type { RAGStatus } from '@/lib/types';

const TOOLTIP_CLASS = 'aum-bar-tooltip';

const RAG_BAR_COLORS: Record<RAGStatus, string> = {
  Green: '#4caf50',
  Amber: '#ff9800',
  Red: '#f44336',
};

export interface SubsidiaryAUM {
  name: string;
  shortCode: string;
  subsidiaryId: number;
  aum: number;
  rag: RAGStatus;
}

interface Props {
  data: SubsidiaryAUM[];
  onBarClick?: (subsidiaryId: number) => void;
}

export function SubsidiaryAUMBar({ data, onBarClick }: Props) {
  const { d3Tokens } = useThemeMode();
  const { currency } = useCurrency();
  const { formatCurrency } = useCurrencyFormat();
  const sorted = [...data].sort((a, b) => b.aum - a.aum);

  const ref = useD3Chart((svg, width, height) => {
    // Clean up any previous tooltip
    d3.selectAll(`.${TOOLTIP_CLASS}`).remove();

    const margin = { top: 10, right: 110, bottom: 20, left: 120 };
    const w = width - margin.left - margin.right;
    const h = height - margin.top - margin.bottom;
    const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

    const y = d3.scaleBand()
      .domain(sorted.map(d => d.name))
      .range([0, h])
      .padding(0.3);

    const x = d3.scaleLinear()
      .domain([0, d3.max(sorted, d => d.aum) ?? 0])
      .range([0, w]);

    // ── Tooltip ──────────────────────────────────────────────────────
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
      .attr('y', d => y(d.name)!)
      .attr('height', y.bandwidth())
      .attr('x', 0)
      .attr('width', d => x(d.aum))
      .attr('fill', d => `${RAG_BAR_COLORS[d.rag]}40`)
      .attr('stroke', d => RAG_BAR_COLORS[d.rag])
      .attr('stroke-width', 1.5)
      .attr('rx', 4)
      .style('cursor', onBarClick ? 'pointer' : 'default')
      .on('click', (_, d) => {
        tooltip.style('opacity', '0');
        d3.selectAll(`.${TOOLTIP_CLASS}`).remove();
        onBarClick?.(d.subsidiaryId);
      })
      .on('mouseover', function (_event, d) {
        d3.select(this).attr('opacity', 0.8);
        const ragColor = RAG_BAR_COLORS[d.rag];
        tooltip.html(
          `<div style="font-weight:700;font-size:12px;margin-bottom:4px">${d.name}</div>` +
          `<div><span style="color:${mutedColor}">AUM:</span> <b>${formatCurrency(d.aum)}</b></div>` +
          `<div><span style="color:${mutedColor}">RAG Status:</span> <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${ragColor};margin-right:4px;vertical-align:middle"></span><b>${d.rag}</b></div>`
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
      .attr('x', d => x(d.aum) + 6)
      .attr('y', d => y(d.name)! + y.bandwidth() / 2)
      .attr('dy', '0.35em')
      .attr('fill', d3Tokens.textMuted)
      .attr('font-size', '11px')
      .attr('font-family', 'IBM Plex Mono, monospace')
      .text(d => formatCurrency(d.aum));

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
    <ChartContainer title="Subsidiary AUM" subtitle={`Consumer + Trade + Corporate (${currency})`} empty={!sorted.length}>
      <svg ref={ref} width="100%" height="100%" style={{ overflow: 'visible' }} />
    </ChartContainer>
  );
}
