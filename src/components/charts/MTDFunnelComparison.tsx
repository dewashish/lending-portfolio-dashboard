'use client';

import { useMemo } from 'react';
import * as d3 from 'd3';
import { useD3Chart } from '@/hooks/useD3Chart';
import { useThemeMode } from '@/lib/theme-context';
import { ChartContainer } from '@/components/charts/ChartContainer';
import { formatNumber, formatPercent } from '@/lib/format';
import { useCurrencyFormat } from '@/lib/currency-context';
import { useRiskAppetite } from '@/hooks/useRiskAppetite';
import type { LOSComparisonMetric } from '@/lib/types';

interface Props {
  data: LOSComparisonMetric[];
}

const TEAL = '#00897b';
const GRAY = '#94a3b8';

/** Funnel metrics in natural conversion order (top → bottom) */
const FUNNEL_ORDER = [
  'Applications Received',
  'Login Count',
  'Sanctions Count',
  'Sanctions Amount',
  'Disbursements Count',
  'Disbursements Amount',
];

/** Non-funnel operational metrics */
const ANNOTATION_METRICS = ['Rejections', 'Avg Ticket Size', 'TAT (days)'];

export function MTDFunnelComparison({ data }: Props) {
  const { d3Tokens } = useThemeMode();
  const { formatCurrency } = useCurrencyFormat();
  const { getColor } = useRiskAppetite();

  const { funnelMetrics, annotationMetrics } = useMemo(() => {
    // Filter to "All Products" only
    const allProducts = data.filter((d) =>
      d.product.toLowerCase().includes('all'),
    );
    const source = allProducts.length > 0 ? allProducts : data;

    // Order funnel metrics
    const funnel = FUNNEL_ORDER
      .map((name) => source.find((m) => m.metric === name))
      .filter(Boolean) as LOSComparisonMetric[];

    // Annotation metrics
    const annotations = ANNOTATION_METRICS
      .map((name) => source.find((m) => m.metric === name))
      .filter(Boolean) as LOSComparisonMetric[];

    return { funnelMetrics: funnel, annotationMetrics: annotations };
  }, [data]);

  const ref = useD3Chart(
    (svg, width, height) => {
      d3.selectAll('.mtd-funnel-tooltip').remove();

      const margin = { top: 10, right: 16, bottom: 40, left: 16 };
      const w = width - margin.left - margin.right;
      const funnelCount = funnelMetrics.length;
      const annotCount = annotationMetrics.length;

      // Reserve space for annotations below funnel
      const annotH = annotCount > 0 ? 60 : 0;
      const legendH = 30;
      const availH = height - margin.top - margin.bottom - annotH - legendH;
      const stepH = availH / Math.max(funnelCount, 1);

      // Center gap for labels
      const centerGap = 120;
      const funnelW = (w - centerGap) / 2;

      const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

      // Scales: width proportional to value within each funnel's own max
      const mtdMax = d3.max(funnelMetrics, (m) => m.mtd) ?? 1;
      const lmtdMax = d3.max(funnelMetrics, (m) => m.lmtd) ?? 1;

      // Width scale for each funnel (min 20% width so smallest step is visible)
      const mtdScale = (v: number) => Math.max(funnelW * 0.15, (v / mtdMax) * funnelW);
      const lmtdScale = (v: number) => Math.max(funnelW * 0.15, (v / lmtdMax) * funnelW);

      // MTD funnel center-x (left half, right-aligned to center gap)
      const mtdCenterX = funnelW / 2;
      // LMTD funnel center-x (right half, left-aligned from center gap)
      const lmtdCenterX = funnelW + centerGap + funnelW / 2;

      // Format value based on metric name
      const fmtValue = (metric: string, value: number) => {
        if (metric.toLowerCase().includes('amount') || metric.toLowerCase().includes('ticket')) {
          return formatCurrency(value);
        }
        if (metric.toLowerCase().includes('tat')) {
          return formatNumber(value, 1);
        }
        return formatNumber(value, 0);
      };

      // Tooltip
      const tooltip = d3
        .select('body')
        .append('div')
        .attr('class', 'mtd-funnel-tooltip')
        .style('position', 'absolute')
        .style('pointer-events', 'none')
        .style('opacity', '0')
        .style('background', d3Tokens.tooltipBg)
        .style('border', `1px solid ${d3Tokens.tooltipBorder}`)
        .style('border-radius', '8px')
        .style('padding', '12px 16px')
        .style('font-size', '12px')
        .style('color', d3Tokens.tooltipText)
        .style('box-shadow', '0 4px 12px rgba(0,0,0,0.3)')
        .style('z-index', '9999')
        .style('max-width', '280px')
        .style('line-height', '1.6');

      // Draw funnel steps
      funnelMetrics.forEach((metric, i) => {
        const y = i * stepH;
        const nextI = Math.min(i + 1, funnelCount - 1);
        const nextMetric = funnelMetrics[nextI];

        const mtdW = mtdScale(metric.mtd);
        const lmtdW = lmtdScale(metric.lmtd);
        const nextMtdW = i < funnelCount - 1 ? mtdScale(nextMetric.mtd) : mtdW * 0.85;
        const nextLmtdW = i < funnelCount - 1 ? lmtdScale(nextMetric.lmtd) : lmtdW * 0.85;

        const trapGap = 2; // Small gap between trapezoids

        // ── MTD trapezoid (left side, right-aligned toward center) ──
        const mtdPoints = [
          [mtdCenterX - mtdW / 2, y + trapGap],                     // top-left
          [mtdCenterX + mtdW / 2, y + trapGap],                     // top-right
          [mtdCenterX + nextMtdW / 2, y + stepH - trapGap],         // bottom-right
          [mtdCenterX - nextMtdW / 2, y + stepH - trapGap],         // bottom-left
        ];
        g.append('polygon')
          .attr('points', mtdPoints.map((p) => p.join(',')).join(' '))
          .attr('fill', TEAL)
          .attr('opacity', 0.85)
          .attr('stroke', d3Tokens.bg)
          .attr('stroke-width', 1);

        // MTD value inside trapezoid
        g.append('text')
          .attr('x', mtdCenterX)
          .attr('y', y + stepH / 2)
          .attr('dy', '0.35em')
          .attr('text-anchor', 'middle')
          .attr('fill', '#fff')
          .attr('font-size', '10px')
          .attr('font-weight', 600)
          .attr('font-family', 'IBM Plex Mono, monospace')
          .text(fmtValue(metric.metric, metric.mtd));

        // ── LMTD trapezoid (right side, left-aligned from center) ──
        const lmtdPoints = [
          [lmtdCenterX - lmtdW / 2, y + trapGap],
          [lmtdCenterX + lmtdW / 2, y + trapGap],
          [lmtdCenterX + nextLmtdW / 2, y + stepH - trapGap],
          [lmtdCenterX - nextLmtdW / 2, y + stepH - trapGap],
        ];
        g.append('polygon')
          .attr('points', lmtdPoints.map((p) => p.join(',')).join(' '))
          .attr('fill', GRAY)
          .attr('opacity', 0.85)
          .attr('stroke', d3Tokens.bg)
          .attr('stroke-width', 1);

        // LMTD value inside trapezoid
        g.append('text')
          .attr('x', lmtdCenterX)
          .attr('y', y + stepH / 2)
          .attr('dy', '0.35em')
          .attr('text-anchor', 'middle')
          .attr('fill', '#fff')
          .attr('font-size', '10px')
          .attr('font-weight', 600)
          .attr('font-family', 'IBM Plex Mono, monospace')
          .text(fmtValue(metric.metric, metric.lmtd));

        // ── Center label ──
        const labelX = funnelW + centerGap / 2;
        g.append('text')
          .attr('x', labelX)
          .attr('y', y + stepH / 2 - 6)
          .attr('dy', '0.35em')
          .attr('text-anchor', 'middle')
          .attr('fill', d3Tokens.text)
          .attr('font-size', '10px')
          .attr('font-weight', 600)
          .text(metric.metric.length > 18 ? metric.metric.slice(0, 18) + '…' : metric.metric);

        // MoM change below label
        const delta = metric.momChange;
        if (delta != null && !isNaN(delta)) {
          const sign = delta >= 0 ? '+' : '';
          const color = delta >= 0 ? '#4caf50' : '#f44336';
          g.append('text')
            .attr('x', labelX)
            .attr('y', y + stepH / 2 + 8)
            .attr('dy', '0.35em')
            .attr('text-anchor', 'middle')
            .attr('fill', color)
            .attr('font-size', '9px')
            .attr('font-family', 'IBM Plex Mono, monospace')
            .text(`${sign}${formatPercent(delta, 1)}`);
        }

        // Achievement traffic light
        const ach = metric.achievement;
        if (ach != null) {
          const achColor = getColor('los_achievement', ach);
          g.append('circle')
            .attr('cx', w - 8)
            .attr('cy', y + stepH / 2)
            .attr('r', 5)
            .attr('fill', achColor)
            .attr('opacity', 0.9);
        }

        // ── Hover overlay ──
        g.append('rect')
          .attr('x', 0)
          .attr('y', y)
          .attr('width', w)
          .attr('height', stepH)
          .attr('fill', 'transparent')
          .attr('cursor', 'pointer')
          .on('mouseenter', (event: MouseEvent) => {
            let html = `<div style="font-weight:600;margin-bottom:4px">${metric.metric}</div>`;
            html += `<table style="border-collapse:collapse;width:100%">`;
            html += `<tr><td style="padding:2px 8px 2px 0"><span style="display:inline-block;width:8px;height:8px;border-radius:2px;background:${TEAL};margin-right:6px;vertical-align:middle"></span>MTD</td>`;
            html += `<td style="text-align:right;font-family:monospace;font-size:11px">${fmtValue(metric.metric, metric.mtd)}</td></tr>`;
            html += `<tr><td style="padding:2px 8px 2px 0"><span style="display:inline-block;width:8px;height:8px;border-radius:2px;background:${GRAY};margin-right:6px;vertical-align:middle"></span>LMTD</td>`;
            html += `<td style="text-align:right;font-family:monospace;font-size:11px">${fmtValue(metric.metric, metric.lmtd)}</td></tr>`;
            if (delta != null && !isNaN(delta)) {
              const sign = delta >= 0 ? '+' : '';
              const color = delta >= 0 ? '#4caf50' : '#f44336';
              html += `<tr style="border-top:1px solid ${d3Tokens.tooltipBorder}"><td style="padding:4px 8px 0 0">MoM</td>`;
              html += `<td style="text-align:right;font-family:monospace;font-size:11px;color:${color}">${sign}${formatPercent(delta, 1)}</td></tr>`;
            }
            if (ach != null) {
              html += `<tr><td style="padding:2px 8px 2px 0">Achievement</td>`;
              html += `<td style="text-align:right;font-family:monospace;font-size:11px">${formatPercent(ach)}</td></tr>`;
            }
            html += `</table>`;
            tooltip.html(html).style('opacity', '1');
            const ttNode = tooltip.node() as HTMLDivElement;
            let left = event.pageX + 16;
            let top = event.pageY - (ttNode.offsetHeight / 2);
            if (left + ttNode.offsetWidth > window.innerWidth - 8) left = event.pageX - ttNode.offsetWidth - 16;
            if (top < 8) top = 8;
            tooltip.style('left', `${left}px`).style('top', `${top}px`);
          })
          .on('mousemove', (event: MouseEvent) => {
            const ttNode = tooltip.node() as HTMLDivElement;
            let left = event.pageX + 16;
            let top = event.pageY - (ttNode.offsetHeight / 2);
            if (left + ttNode.offsetWidth > window.innerWidth - 8) left = event.pageX - ttNode.offsetWidth - 16;
            if (top < 8) top = 8;
            tooltip.style('left', `${left}px`).style('top', `${top}px`);
          })
          .on('mouseleave', () => {
            tooltip.style('opacity', '0');
          });
      });

      // ── Annotation metrics below funnel ──
      if (annotationMetrics.length > 0) {
        const annotY = funnelCount * stepH + 16;
        const annotG = g.append('g').attr('transform', `translate(0,${annotY})`);

        // Separator
        annotG.append('line')
          .attr('x1', 0).attr('x2', w)
          .attr('y1', 0).attr('y2', 0)
          .attr('stroke', d3Tokens.gridStroke)
          .attr('stroke-dasharray', '4,3');

        const annotRowH = 20;
        annotationMetrics.forEach((metric, i) => {
          const rowY = 12 + i * annotRowH;

          // Label
          annotG.append('text')
            .attr('x', w / 2)
            .attr('y', rowY)
            .attr('dy', '0.35em')
            .attr('text-anchor', 'middle')
            .attr('fill', d3Tokens.textMuted)
            .attr('font-size', '10px')
            .text(`${metric.metric}:  `);

          // MTD value
          annotG.append('text')
            .attr('x', w / 2 - 60)
            .attr('y', rowY)
            .attr('dy', '0.35em')
            .attr('text-anchor', 'end')
            .attr('fill', TEAL)
            .attr('font-size', '10px')
            .attr('font-weight', 600)
            .attr('font-family', 'IBM Plex Mono, monospace')
            .text(fmtValue(metric.metric, metric.mtd));

          // LMTD value
          annotG.append('text')
            .attr('x', w / 2 + 60)
            .attr('y', rowY)
            .attr('dy', '0.35em')
            .attr('text-anchor', 'start')
            .attr('fill', GRAY)
            .attr('font-size', '10px')
            .attr('font-weight', 600)
            .attr('font-family', 'IBM Plex Mono, monospace')
            .text(fmtValue(metric.metric, metric.lmtd));

          // Achievement dot
          if (metric.achievement != null) {
            annotG.append('circle')
              .attr('cx', w - 8)
              .attr('cy', rowY)
              .attr('r', 4)
              .attr('fill', getColor('los_achievement', metric.achievement))
              .attr('opacity', 0.9);
          }
        });
      }

      // ── Legend ──
      const legendG = svg.append('g').attr('transform', `translate(${margin.left},${height - legendH})`);
      let lx = 0;
      [
        { key: 'MTD', color: TEAL },
        { key: 'LMTD', color: GRAY },
      ].forEach(({ key, color }) => {
        legendG.append('rect')
          .attr('x', lx).attr('y', 0).attr('width', 10).attr('height', 10)
          .attr('fill', color).attr('rx', 2);
        const label = legendG.append('text')
          .attr('x', lx + 14).attr('y', 9)
          .attr('fill', d3Tokens.textMuted).attr('font-size', '10px')
          .text(key);
        lx += (label.node()?.getComputedTextLength() ?? 30) + 24;
      });
      legendG.append('circle')
        .attr('cx', lx + 6).attr('cy', 5).attr('r', 5).attr('fill', '#4caf50');
      legendG.append('text')
        .attr('x', lx + 16).attr('y', 9)
        .attr('fill', d3Tokens.textMuted).attr('font-size', '10px')
        .text('Achievement');
    },
    [funnelMetrics, annotationMetrics, d3Tokens, formatCurrency, getColor],
  );

  return (
    <ChartContainer
      title="MTD vs LMTD Funnel"
      subtitle="Origination flow — Applications to Disbursements"
      height={480}
      empty={!funnelMetrics.length}
    >
      <svg ref={ref} width="100%" height={480} style={{ overflow: 'visible' }} />
    </ChartContainer>
  );
}
