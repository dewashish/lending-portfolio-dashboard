'use client';

import * as d3 from 'd3';
import { useD3Chart } from '@/hooks/useD3Chart';
import { useThemeMode } from '@/lib/theme-context';
import { ChartContainer } from '@/components/charts/ChartContainer';
import { useCurrencyFormat } from '@/lib/currency-context';
import { formatPercent } from '@/lib/format';

const TOOLTIP_CLASS = 'delinquency-bucket-tooltip';

const DPD_COLORS: Record<string, string> = {
  'Current': '#4caf50',
  '1-30 DPD': '#ff9800',
  '31-60 DPD': '#f44336',
  '61-90 DPD': '#d32f2f',
  '90+ DPD': '#b71c1c',
};

interface Props {
  data: { bucket: string; exposure: number; count: number }[];
  onSliceClick?: (bucket: string) => void;
}

export function DelinquencyBucketDonut({ data, onSliceClick }: Props) {
  const { d3Tokens } = useThemeMode();
  const { formatCurrency } = useCurrencyFormat();

  const pieData = data.filter(d => d.exposure > 0);
  const totalExposure = pieData.reduce((sum, d) => sum + d.exposure, 0);
  const totalCount = pieData.reduce((sum, d) => sum + d.count, 0);

  const ref = useD3Chart(
    (svg, width, height) => {
      // Clean up any previous tooltip
      d3.selectAll(`.${TOOLTIP_CLASS}`).remove();

      const margin = { top: 10, right: 140, bottom: 10, left: 10 };
      const w = width - margin.left - margin.right;
      const h = height - margin.top - margin.bottom;
      const outerRadius = Math.min(w, h) / 2 - 10;
      const innerRadius = outerRadius * 0.55;

      const g = svg.append('g').attr('transform', `translate(${margin.left + w / 2},${margin.top + h / 2})`);

      const pie = d3.pie<{ bucket: string; exposure: number; count: number }>()
        .value(d => d.exposure)
        .sort(null);

      const arc = d3.arc<d3.PieArcDatum<{ bucket: string; exposure: number; count: number }>>()
        .innerRadius(innerRadius)
        .outerRadius(outerRadius)
        .cornerRadius(3)
        .padAngle(0.02);

      // -- Tooltip -------------------------------------------------------
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
        .attr('fill', d => DPD_COLORS[d.data.bucket] ?? d3Tokens.textMuted)
        .attr('opacity', 0.9)
        .style('cursor', onSliceClick ? 'pointer' : 'default')
        .on('click', (_, d) => {
          tooltip.style('opacity', '0');
          d3.selectAll(`.${TOOLTIP_CLASS}`).remove();
          onSliceClick?.(d.data.bucket);
        })
        .on('mouseover', function (_event, d) {
          d3.select(this).attr('opacity', 1).attr('stroke', d3Tokens.text).attr('stroke-width', 2);
          const share = totalExposure > 0 ? d.data.exposure / totalExposure : 0;
          tooltip.html(
            `<div style="font-weight:700;font-size:12px;margin-bottom:4px">${d.data.bucket}</div>` +
            `<div><span style="color:${mutedColor}">Exposure:</span> <b>${formatCurrency(d.data.exposure)}</b></div>` +
            `<div><span style="color:${mutedColor}">Count:</span> <b>${d.data.count} borrower${d.data.count !== 1 ? 's' : ''}</b></div>` +
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
      const labelArc = d3.arc<d3.PieArcDatum<{ bucket: string; exposure: number; count: number }>>()
        .innerRadius(outerRadius * 0.78)
        .outerRadius(outerRadius * 0.78);

      arcs.filter(d => totalExposure > 0 && d.data.exposure / totalExposure > 0.10)
        .append('text')
        .attr('transform', d => `translate(${labelArc.centroid(d)})`)
        .attr('text-anchor', 'middle')
        .attr('fill', '#ffffff')
        .attr('font-size', '11px')
        .attr('font-weight', 700)
        .attr('pointer-events', 'none')
        .text(d => formatPercent(d.data.exposure / totalExposure, 1));

      // Center text
      g.append('text')
        .attr('text-anchor', 'middle')
        .attr('dy', '-0.3em')
        .attr('fill', d3Tokens.text)
        .attr('font-size', '12px')
        .attr('font-weight', 700)
        .text('Delinquent');

      g.append('text')
        .attr('text-anchor', 'middle')
        .attr('dy', '1.1em')
        .attr('fill', d3Tokens.textMuted)
        .attr('font-size', '14px')
        .attr('font-family', 'IBM Plex Mono, monospace')
        .text(String(totalCount));

      // Legend (right side)
      const legendX = width - margin.right + 14;
      const legendY = margin.top + 12;
      const legend = svg.append('g').attr('transform', `translate(${legendX},${legendY})`);

      pieData.forEach((d, i) => {
        const row = legend.append('g').attr('transform', `translate(0,${i * 22})`);
        row.append('rect')
          .attr('width', 10)
          .attr('height', 10)
          .attr('rx', 2)
          .attr('fill', DPD_COLORS[d.bucket] ?? d3Tokens.textMuted);
        row.append('text')
          .attr('x', 14)
          .attr('y', 9)
          .attr('fill', d3Tokens.text)
          .attr('font-size', '10px')
          .attr('font-weight', 600)
          .text(d.bucket);
        row.append('text')
          .attr('x', 14)
          .attr('y', 21)
          .attr('fill', d3Tokens.textMuted)
          .attr('font-size', '9px')
          .text(`${d.count} | ${formatCurrency(d.exposure)}`);
      });
    },
    [pieData, totalExposure, totalCount, d3Tokens, onSliceClick, formatCurrency],
  );

  return (
    <ChartContainer title="DPD Bucket Distribution" subtitle="Current exposure by delinquency bucket" empty={totalExposure === 0}>
      <svg ref={ref} width="100%" height="100%" style={{ overflow: 'visible' }} />
    </ChartContainer>
  );
}
