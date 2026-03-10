'use client';

import * as d3 from 'd3';
import { useD3Chart } from '@/hooks/useD3Chart';
import { useThemeMode } from '@/lib/theme-context';
import { ChartContainer } from '@/components/charts/ChartContainer';
import { useCurrencyFormat } from '@/lib/currency-context';
import { formatPercent } from '@/lib/format';

const TOOLTIP_CLASS = 'biz-donut-tooltip';

const SEGMENT_COLORS: Record<string, string> = {
  Consumer: '#00897b',
  Trade: '#42a5f5',
  Corporate: '#ff6f00',
};

interface Props {
  consumer: number;
  trade: number;
  corporate: number;
  onSegmentClick?: (segment: 'consumer' | 'trade' | 'corporate') => void;
}

export function BusinessLineDonut({ consumer, trade, corporate, onSegmentClick }: Props) {
  const { d3Tokens } = useThemeMode();
  const { formatCurrency } = useCurrencyFormat();

  const pieData = [
    { label: 'Consumer', value: consumer, key: 'consumer' as const },
    { label: 'Trade', value: trade, key: 'trade' as const },
    { label: 'Corporate', value: corporate, key: 'corporate' as const },
  ].filter(d => d.value > 0);

  const total = consumer + trade + corporate;

  const ref = useD3Chart(
    (svg, width, height) => {
      // Clean up any previous tooltip
      d3.selectAll(`.${TOOLTIP_CLASS}`).remove();

      const radius = Math.min(width, height) / 2 - 10;
      const innerRadius = radius * 0.55;

      const g = svg.append('g').attr('transform', `translate(${width / 2},${height / 2})`);

      const pie = d3.pie<{ label: string; value: number; key: 'consumer' | 'trade' | 'corporate' }>()
        .value(d => d.value)
        .sort(null);

      const arc = d3.arc<d3.PieArcDatum<{ label: string; value: number; key: 'consumer' | 'trade' | 'corporate' }>>()
        .innerRadius(innerRadius)
        .outerRadius(radius)
        .cornerRadius(3)
        .padAngle(0.02);

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

      const arcs = g.selectAll('.arc')
        .data(pie(pieData))
        .join('g')
        .attr('class', 'arc');

      arcs.append('path')
        .attr('d', arc)
        .attr('fill', d => SEGMENT_COLORS[d.data.label])
        .attr('opacity', 0.9)
        .style('cursor', onSegmentClick ? 'pointer' : 'default')
        .on('click', (_, d) => {
          tooltip.style('opacity', '0');
          d3.selectAll(`.${TOOLTIP_CLASS}`).remove();
          onSegmentClick?.(d.data.key);
        })
        .on('mouseover', function (_event, d) {
          d3.select(this).attr('opacity', 1).attr('stroke', d3Tokens.text).attr('stroke-width', 2);
          const share = total > 0 ? d.data.value / total : 0;
          tooltip.html(
            `<div style="font-weight:700;font-size:12px;margin-bottom:4px">${d.data.label}</div>` +
            `<div><span style="color:${mutedColor}">AUM:</span> <b>${formatCurrency(d.data.value)}</b></div>` +
            `<div><span style="color:${mutedColor}">Share:</span> <b>${formatPercent(share, 1)}</b></div>`
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

      // Percentage labels on slices > 10%
      const labelArc = d3.arc<d3.PieArcDatum<{ label: string; value: number; key: 'consumer' | 'trade' | 'corporate' }>>()
        .innerRadius(radius * 0.78)
        .outerRadius(radius * 0.78);

      arcs.filter(d => total > 0 && d.data.value / total > 0.10)
        .append('text')
        .attr('transform', d => `translate(${labelArc.centroid(d)})`)
        .attr('text-anchor', 'middle')
        .attr('fill', '#ffffff')
        .attr('font-size', '11px')
        .attr('font-weight', 700)
        .attr('pointer-events', 'none')
        .text(d => formatPercent(d.data.value / total, 1));

      // Center text
      g.append('text')
        .attr('text-anchor', 'middle')
        .attr('dy', '-0.3em')
        .attr('fill', d3Tokens.text)
        .attr('font-size', '12px')
        .attr('font-weight', 700)
        .text('Group AUM');

      g.append('text')
        .attr('text-anchor', 'middle')
        .attr('dy', '1.1em')
        .attr('fill', d3Tokens.textMuted)
        .attr('font-size', '14px')
        .attr('font-family', 'IBM Plex Mono, monospace')
        .text(formatCurrency(total));

      // Legend
      const legend = svg.append('g').attr('transform', `translate(${width - 95},${12})`);
      pieData.forEach((d, i) => {
        const row = legend.append('g').attr('transform', `translate(0,${i * 18})`);
        row.append('rect').attr('width', 10).attr('height', 10).attr('rx', 2).attr('fill', SEGMENT_COLORS[d.label]);
        row.append('text').attr('x', 14).attr('y', 9).attr('fill', d3Tokens.textMuted).attr('font-size', '10px').text(d.label);
      });
    },
    [pieData, total, d3Tokens, onSegmentClick, formatCurrency],
  );

  return (
    <ChartContainer title="Business Line Split" subtitle="AUM by portfolio type" empty={total === 0}>
      <svg ref={ref} width="100%" height="100%" style={{ overflow: 'visible' }} />
    </ChartContainer>
  );
}
