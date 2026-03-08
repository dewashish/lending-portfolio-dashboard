'use client';

import { useMemo } from 'react';
import * as d3 from 'd3';
import { useD3Chart } from '@/hooks/useD3Chart';
import { useThemeMode } from '@/lib/theme-context';
import { ChartContainer } from '@/components/charts/ChartContainer';
import { formatNumber, formatPercent } from '@/lib/format';
import type { LOSFunnelStep } from '@/lib/types';

interface Props {
  data: LOSFunnelStep[];
}

const TEAL = '#00897b';
const GRAY = '#94a3b8';

export function MTDFunnelComparison({ data }: Props) {
  const { d3Tokens } = useThemeMode();

  const stages = useMemo(() => {
    if (!data.length) return [];
    // Filter to "All Products"
    const products = Array.from(new Set(data.map((d) => d.product)));
    const selectedProduct =
      products.find((p) => p.toLowerCase().includes('all')) ?? products[0] ?? '';
    return data.filter((d) => d.product === selectedProduct);
  }, [data]);

  const ref = useD3Chart(
    (svg, width, height) => {
      d3.selectAll('.mtd-funnel-tooltip').remove();

      const margin = { top: 10, right: 16, bottom: 36, left: 16 };
      const w = width - margin.left - margin.right;
      const stageCount = stages.length;
      const legendH = 28;
      const availH = height - margin.top - margin.bottom - legendH;
      const stepH = availH / Math.max(stageCount, 1);

      // Center gap for labels
      const centerGap = Math.min(140, w * 0.22);
      const funnelW = (w - centerGap) / 2;

      const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

      // Scale: width proportional to value (top stage = widest)
      const mtdMax = d3.max(stages, (s) => s.mtd) ?? 1;
      const lmtdMax = d3.max(stages, (s) => s.lmtd) ?? 1;

      const mtdScale = (v: number) => Math.max(funnelW * 0.12, (v / mtdMax) * funnelW);
      const lmtdScale = (v: number) => Math.max(funnelW * 0.12, (v / lmtdMax) * funnelW);

      const mtdCenterX = funnelW / 2;
      const lmtdCenterX = funnelW + centerGap + funnelW / 2;

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
      stages.forEach((stage, i) => {
        const y = i * stepH;
        const nextStage = i < stageCount - 1 ? stages[i + 1] : null;

        const mtdW = mtdScale(stage.mtd);
        const lmtdW = lmtdScale(stage.lmtd);
        const nextMtdW = nextStage ? mtdScale(nextStage.mtd) : mtdW * 0.85;
        const nextLmtdW = nextStage ? lmtdScale(nextStage.lmtd) : lmtdW * 0.85;

        const gap = 2;

        // ── MTD trapezoid ──
        const mtdPts = [
          [mtdCenterX - mtdW / 2, y + gap],
          [mtdCenterX + mtdW / 2, y + gap],
          [mtdCenterX + nextMtdW / 2, y + stepH - gap],
          [mtdCenterX - nextMtdW / 2, y + stepH - gap],
        ];
        g.append('polygon')
          .attr('points', mtdPts.map((p) => p.join(',')).join(' '))
          .attr('fill', TEAL)
          .attr('opacity', 0.85)
          .attr('stroke', d3Tokens.bg)
          .attr('stroke-width', 1);

        // MTD value
        g.append('text')
          .attr('x', mtdCenterX)
          .attr('y', y + stepH / 2)
          .attr('dy', '0.35em')
          .attr('text-anchor', 'middle')
          .attr('fill', '#fff')
          .attr('font-size', stepH > 40 ? '11px' : '9px')
          .attr('font-weight', 600)
          .attr('font-family', 'IBM Plex Mono, monospace')
          .text(formatNumber(stage.mtd, 0));

        // ── LMTD trapezoid ──
        const lmtdPts = [
          [lmtdCenterX - lmtdW / 2, y + gap],
          [lmtdCenterX + lmtdW / 2, y + gap],
          [lmtdCenterX + nextLmtdW / 2, y + stepH - gap],
          [lmtdCenterX - nextLmtdW / 2, y + stepH - gap],
        ];
        g.append('polygon')
          .attr('points', lmtdPts.map((p) => p.join(',')).join(' '))
          .attr('fill', GRAY)
          .attr('opacity', 0.85)
          .attr('stroke', d3Tokens.bg)
          .attr('stroke-width', 1);

        // LMTD value
        g.append('text')
          .attr('x', lmtdCenterX)
          .attr('y', y + stepH / 2)
          .attr('dy', '0.35em')
          .attr('text-anchor', 'middle')
          .attr('fill', '#fff')
          .attr('font-size', stepH > 40 ? '11px' : '9px')
          .attr('font-weight', 600)
          .attr('font-family', 'IBM Plex Mono, monospace')
          .text(formatNumber(stage.lmtd, 0));

        // ── Center label ──
        const labelX = funnelW + centerGap / 2;
        const shortName = stage.stage.length > 16 ? stage.stage.slice(0, 16) + '…' : stage.stage;
        g.append('text')
          .attr('x', labelX)
          .attr('y', y + stepH / 2 - 6)
          .attr('dy', '0.35em')
          .attr('text-anchor', 'middle')
          .attr('fill', d3Tokens.text)
          .attr('font-size', '9px')
          .attr('font-weight', 600)
          .text(shortName);

        // Conversion rate below label
        if (stage.conversionRate < 1) {
          g.append('text')
            .attr('x', labelX)
            .attr('y', y + stepH / 2 + 7)
            .attr('dy', '0.35em')
            .attr('text-anchor', 'middle')
            .attr('fill', d3Tokens.textMuted)
            .attr('font-size', '8px')
            .attr('font-family', 'IBM Plex Mono, monospace')
            .text(`↓ ${formatPercent(stage.conversionRate, 1)}`);
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
            // Compute MoM change for this stage
            const momPct = stage.lmtd > 0 ? (stage.mtd - stage.lmtd) / stage.lmtd : 0;
            const momSign = momPct >= 0 ? '+' : '';
            const momColor = momPct >= 0 ? '#4caf50' : '#f44336';

            let html = `<div style="font-weight:600;margin-bottom:4px">${stage.stage}</div>`;
            html += `<table style="border-collapse:collapse;width:100%">`;
            html += `<tr><td style="padding:2px 8px 2px 0"><span style="display:inline-block;width:8px;height:8px;border-radius:2px;background:${TEAL};margin-right:6px;vertical-align:middle"></span>MTD</td>`;
            html += `<td style="text-align:right;font-family:monospace;font-size:11px">${formatNumber(stage.mtd, 0)}</td></tr>`;
            html += `<tr><td style="padding:2px 8px 2px 0"><span style="display:inline-block;width:8px;height:8px;border-radius:2px;background:${GRAY};margin-right:6px;vertical-align:middle"></span>LMTD</td>`;
            html += `<td style="text-align:right;font-family:monospace;font-size:11px">${formatNumber(stage.lmtd, 0)}</td></tr>`;
            html += `<tr style="border-top:1px solid ${d3Tokens.tooltipBorder}"><td style="padding:4px 8px 0 0">MoM</td>`;
            html += `<td style="text-align:right;font-family:monospace;font-size:11px;color:${momColor}">${momSign}${formatPercent(momPct, 1)}</td></tr>`;
            if (stage.conversionRate < 1) {
              html += `<tr><td style="padding:2px 8px 2px 0">Conv. Rate</td>`;
              html += `<td style="text-align:right;font-family:monospace;font-size:11px">${formatPercent(stage.conversionRate, 1)}</td></tr>`;
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
    },
    [stages, d3Tokens],
  );

  const chartHeight = Math.max(400, stages.length * 56 + 80);

  return (
    <ChartContainer
      title="MTD vs LMTD Funnel"
      subtitle="Origination flow — Clicks to Disbursement"
      height={chartHeight}
      empty={!stages.length}
    >
      <svg ref={ref} width="100%" height={chartHeight} style={{ overflow: 'visible' }} />
    </ChartContainer>
  );
}
