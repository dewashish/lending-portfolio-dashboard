'use client';

import * as d3 from 'd3';
import { useD3Chart } from '@/hooks/useD3Chart';
import { useThemeMode } from '@/lib/theme-context';
import { ChartContainer } from '@/components/charts/ChartContainer';
import { formatPercent } from '@/lib/format';

const TOOLTIP_CLASS = 'covenant-compliance-tooltip';

const STATUS_COLORS: Record<string, string> = {
  Compliant: '#4caf50',
  Breached: '#f44336',
  'Pending Extension': '#ff9800',
};

interface Props {
  data: { status: string; count: number }[];
}

export function CovenantComplianceDonut({ data }: Props) {
  const { d3Tokens } = useThemeMode();

  const pieData = data.filter(d => d.count > 0);
  const totalCount = pieData.reduce((sum, d) => sum + d.count, 0);
  const compliantCount = pieData.find(d => d.status === 'Compliant')?.count ?? 0;
  const compliancePct = totalCount > 0 ? compliantCount / totalCount : 0;

  const ref = useD3Chart(
    (svg, width, height) => {
      // Clean up any previous tooltip
      d3.selectAll(`.${TOOLTIP_CLASS}`).remove();

      const radius = Math.min(width, height) / 2 - 10;
      const innerRadius = radius * 0.55;

      const g = svg.append('g').attr('transform', `translate(${width / 2},${height / 2})`);

      const pie = d3.pie<{ status: string; count: number }>()
        .value(d => d.count)
        .sort(null);

      const arc = d3.arc<d3.PieArcDatum<{ status: string; count: number }>>()
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
        .attr('fill', d => STATUS_COLORS[d.data.status] ?? d3Tokens.textMuted)
        .attr('opacity', 0.9)
        .style('cursor', 'default')
        .on('mouseover', function (_event, d) {
          d3.select(this).attr('opacity', 1).attr('stroke', d3Tokens.text).attr('stroke-width', 2);
          const pct = totalCount > 0 ? d.data.count / totalCount : 0;
          tooltip.html(
            `<div style="font-weight:700;font-size:12px;margin-bottom:4px">${d.data.status}</div>` +
            `<div><span style="color:${mutedColor}">Count:</span> <b>${d.data.count}</b></div>` +
            `<div><span style="color:${mutedColor}">Percentage:</span> <b>${formatPercent(pct, 1)}</b></div>`
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
      const labelArc = d3.arc<d3.PieArcDatum<{ status: string; count: number }>>()
        .innerRadius(radius * 0.78)
        .outerRadius(radius * 0.78);

      arcs.filter(d => totalCount > 0 && d.data.count / totalCount > 0.10)
        .append('text')
        .attr('transform', d => `translate(${labelArc.centroid(d)})`)
        .attr('text-anchor', 'middle')
        .attr('fill', '#ffffff')
        .attr('font-size', '11px')
        .attr('font-weight', 700)
        .attr('pointer-events', 'none')
        .text(d => formatPercent(d.data.count / totalCount, 1));

      // Center text: compliance percentage
      g.append('text')
        .attr('text-anchor', 'middle')
        .attr('dy', '-0.3em')
        .attr('fill', compliancePct >= 0.85 ? '#4caf50' : compliancePct >= 0.7 ? '#ff9800' : '#f44336')
        .attr('font-size', '14px')
        .attr('font-family', 'IBM Plex Mono, monospace')
        .attr('font-weight', 700)
        .text(formatPercent(compliancePct, 1));

      g.append('text')
        .attr('text-anchor', 'middle')
        .attr('dy', '1.1em')
        .attr('fill', d3Tokens.textMuted)
        .attr('font-size', '11px')
        .text('Compliant');

      // Legend top-right
      const legend = svg.append('g').attr('transform', `translate(${width - 120},${12})`);
      pieData.forEach((d, i) => {
        const row = legend.append('g').attr('transform', `translate(0,${i * 18})`);
        row.append('rect').attr('width', 10).attr('height', 10).attr('rx', 2).attr('fill', STATUS_COLORS[d.status] ?? d3Tokens.textMuted);
        row.append('text').attr('x', 14).attr('y', 9).attr('fill', d3Tokens.textMuted).attr('font-size', '10px').text(d.status);
      });
    },
    [pieData, totalCount, compliancePct, d3Tokens],
  );

  return (
    <ChartContainer title="Compliance Status" subtitle="Covenant compliance overview" empty={totalCount === 0}>
      <svg ref={ref} width="100%" height="100%" style={{ overflow: 'visible' }} />
    </ChartContainer>
  );
}
