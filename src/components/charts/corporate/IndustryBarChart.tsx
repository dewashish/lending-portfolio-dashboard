'use client';

import * as d3 from 'd3';
import { useD3Chart } from '@/hooks/useD3Chart';
import { useThemeMode } from '@/lib/theme-context';
import { ChartContainer } from '../ChartContainer';
import { useCurrencyFormat } from '@/lib/currency-context';
import { formatPercent } from '@/lib/format';

const TOOLTIP_CLASS = 'industry-bar-tooltip';

interface Props {
  data: { sector: string; disbursement: number; pos: number; share: number; irr: number | null }[];
  onBarClick?: (sector: string) => void;
}

export function IndustryBarChart({ data, onBarClick }: Props) {
  const { d3Tokens } = useThemeMode();
  const { formatCurrency } = useCurrencyFormat();
  const sorted = [...data].sort((a, b) => b.disbursement - a.disbursement);

  const ref = useD3Chart((svg, width, height) => {
    // Clean up any previous tooltip
    d3.selectAll(`.${TOOLTIP_CLASS}`).remove();

    const margin = { top: 10, right: 80, bottom: 20, left: 140 };
    const w = width - margin.left - margin.right;
    const h = height - margin.top - margin.bottom;
    const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

    const y = d3.scaleBand()
      .domain(sorted.map(d => d.sector))
      .range([0, h])
      .padding(0.3);

    const x = d3.scaleLinear()
      .domain([0, d3.max(sorted, d => d.disbursement) ?? 0])
      .nice()
      .range([0, w]);

    const color = d3.scaleOrdinal(d3.schemeTableau10);

    // ── Grid lines on X-axis ─────────────────────────────────────────
    g.append('g')
      .call(
        d3.axisBottom(x)
          .ticks(5)
          .tickSize(h)
          .tickFormat(() => ''),
      )
      .selectAll('.tick line')
      .attr('stroke', d3Tokens.gridLine);
    g.selectAll('.domain').remove();

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

    // ── Bars ─────────────────────────────────────────────────────────
    g.selectAll('.bar')
      .data(sorted)
      .join('rect')
      .attr('class', 'bar')
      .attr('y', d => y(d.sector)!)
      .attr('height', y.bandwidth())
      .attr('x', 0)
      .attr('width', d => x(d.disbursement))
      .attr('fill', (_, i) => color(String(i)))
      .attr('opacity', 0.9)
      .attr('rx', 4)
      .style('cursor', onBarClick ? 'pointer' : 'default')
      .on('click', (_, d) => {
        tooltip.style('opacity', '0');
        d3.selectAll(`.${TOOLTIP_CLASS}`).remove();
        onBarClick?.(d.sector);
      })
      .on('mouseover', function (_event, d) {
        d3.select(this).attr('opacity', 0.7);
        tooltip.html(
          `<div style="font-weight:700;font-size:12px;margin-bottom:4px">${d.sector}</div>` +
          `<div><span style="color:${mutedColor}">Disbursement:</span> <b>${formatCurrency(d.disbursement)}</b></div>` +
          `<div><span style="color:${mutedColor}">POS:</span> <b>${formatCurrency(d.pos)}</b></div>` +
          `<div><span style="color:${mutedColor}">Share:</span> <b>${formatPercent(d.share)}</b></div>` +
          `<div><span style="color:${mutedColor}">IRR:</span> <b>${d.irr != null ? formatPercent(d.irr) : '—'}</b></div>`
        ).style('opacity', '1');
        positionTooltip(_event as unknown as MouseEvent);
      })
      .on('mousemove', function (_event) {
        positionTooltip(_event as unknown as MouseEvent);
      })
      .on('mouseout', function () {
        d3.select(this).attr('opacity', 0.9);
        tooltip.style('opacity', '0');
      });

    // ── Share % labels at end of each bar ────────────────────────────
    g.selectAll('.share-label')
      .data(sorted)
      .join('text')
      .attr('class', 'share-label')
      .attr('x', d => x(d.disbursement) + 6)
      .attr('y', d => y(d.sector)! + y.bandwidth() / 2)
      .attr('dy', '0.35em')
      .attr('fill', d3Tokens.textMuted)
      .attr('font-size', '10px')
      .attr('font-family', 'IBM Plex Mono, monospace')
      .text(d => formatPercent(d.share));

    // ── Y axis (sector names) ────────────────────────────────────────
    g.append('g')
      .call(d3.axisLeft(y).tickSize(0))
      .selectAll('text')
      .attr('fill', d3Tokens.text)
      .attr('font-size', '11px')
      .attr('font-weight', 700);

    g.selectAll('.domain, .tick line').remove();

    // ── X axis ───────────────────────────────────────────────────────
    g.append('g')
      .attr('transform', `translate(0,${h})`)
      .call(d3.axisBottom(x).ticks(5).tickFormat(d => formatCurrency(d as number)))
      .selectAll('text')
      .attr('fill', d3Tokens.textMuted)
      .attr('font-size', '10px');

    g.selectAll('.domain').attr('stroke', d3Tokens.axisDomain);
  }, [sorted, d3Tokens, onBarClick, formatCurrency]);

  return (
    <ChartContainer title="Industry Concentration" subtitle="Disbursement by sector" empty={!sorted.length}>
      <svg ref={ref} width="100%" height="100%" style={{ overflow: 'visible' }} />
    </ChartContainer>
  );
}
