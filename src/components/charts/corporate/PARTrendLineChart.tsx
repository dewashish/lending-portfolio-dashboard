'use client';

import { useRef, useEffect } from 'react';
import * as d3 from 'd3';
import { useD3Chart } from '@/hooks/useD3Chart';
import { useThemeMode } from '@/lib/theme-context';
import { ChartContainer } from '@/components/charts/ChartContainer';
import { sortPeriodsChronologically } from '@/lib/format';
import type { CorporatePARTrendRow } from '@/lib/types';

interface Props {
  data: CorporatePARTrendRow[];
}

const BUCKET_ORDER = ['X+', '30+', '60+', '90+'];

const PAR_COLORS: Record<string, string> = {
  'X+': '#42a5f5',
  '30+': '#ff9800',
  '60+': '#f44336',
  '90+': '#b71c1c',
};

export function PARTrendLineChart({ data }: Props) {
  const { d3Tokens } = useThemeMode();
  const tooltipIdRef = useRef(
    `par-trend-tooltip-${Math.random().toString(36).slice(2, 8)}`,
  );

  // Cleanup body-appended tooltip on unmount
  useEffect(() => {
    const id = tooltipIdRef.current;
    return () => {
      d3.select(`#${id}`).remove();
    };
  }, []);

  const ref = useD3Chart(
    (svg, width, height) => {
      // Remove any lingering tooltip from previous render
      d3.select(`#${tooltipIdRef.current}`).remove();
      const margin = { top: 20, right: 100, bottom: 50, left: 55 };
      const w = width - margin.left - margin.right;
      const h = height - margin.top - margin.bottom;
      const g = svg
        .append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);

      const buckets = BUCKET_ORDER.filter((b) =>
        data.some((d) => d.dpdBucket === b),
      );
      const periods = sortPeriodsChronologically(
        Array.from(new Set(data.map((d) => d.period))),
      );

      const x = d3.scalePoint().domain(periods).range([0, w]).padding(0.5);

      const allRates = data.map((d) => d.parRate * 100);
      const maxRate = d3.max(allRates) ?? 10;
      const y = d3
        .scaleLinear()
        .domain([0, maxRate * 1.15])
        .nice()
        .range([h, 0]);

      // ── Grid lines ─────────────────────────────────────────────────
      g.append('g')
        .call(
          d3
            .axisLeft(y)
            .ticks(5)
            .tickSize(-w)
            .tickFormat((d) => `${(d as number).toFixed(1)}%`),
        )
        .selectAll('text')
        .attr('fill', d3Tokens.textMuted)
        .attr('font-size', '10px');
      g.selectAll('.domain').remove();
      g.selectAll('.tick line').attr('stroke', d3Tokens.gridLine);

      // ── Lines & dots ───────────────────────────────────────────────
      const line = d3
        .line<CorporatePARTrendRow>()
        .x((d) => x(d.period)!)
        .y((d) => y(d.parRate * 100))
        .curve(d3.curveMonotoneX);

      buckets.forEach((bucket) => {
        const bucketData = data
          .filter((d) => d.dpdBucket === bucket)
          .sort(
            (a, b) =>
              periods.indexOf(a.period) - periods.indexOf(b.period),
          );
        if (bucketData.length === 0) return;
        const color = PAR_COLORS[bucket] ?? '#64b5f6';

        // Line path
        g.append('path')
          .datum(bucketData)
          .attr('fill', 'none')
          .attr('stroke', color)
          .attr('stroke-width', 2.5)
          .attr('d', line);

        // Dots
        g.selectAll(`.dot-${bucket.replace(/[+]/g, 'p')}`)
          .data(bucketData)
          .join('circle')
          .attr('cx', (d) => x(d.period)!)
          .attr('cy', (d) => y(d.parRate * 100))
          .attr('r', 4)
          .attr('fill', color)
          .attr('stroke', d3Tokens.bg)
          .attr('stroke-width', 2);

        // Value labels on each dot
        g.selectAll(`.label-${bucket.replace(/[+]/g, 'p')}`)
          .data(bucketData)
          .join('text')
          .attr('x', (d) => x(d.period)!)
          .attr('y', (d) => {
            // Stagger vertically by bucket index to avoid overlap
            const idx = buckets.indexOf(bucket);
            const base = y(d.parRate * 100);
            // Alternate above/below: even index above, odd index below
            return idx % 2 === 0 ? base - 10 : base + 16;
          })
          .attr('text-anchor', 'middle')
          .attr('fill', d3Tokens.text)
          .attr('font-size', '10px')
          .attr('font-family', 'IBM Plex Mono, monospace')
          .text((d) => `${(d.parRate * 100).toFixed(1)}%`);
      });

      // ── X-axis ─────────────────────────────────────────────────────
      g.append('g')
        .attr('transform', `translate(0,${h})`)
        .call(d3.axisBottom(x).tickSize(0))
        .selectAll('text')
        .attr('fill', d3Tokens.text)
        .attr('font-size', '10px')
        .attr('text-anchor', 'end')
        .attr('transform', 'rotate(-35)')
        .attr('dx', '-0.5em')
        .attr('dy', '0.5em');
      g.selectAll('.domain').attr('stroke', d3Tokens.axisDomain);

      // ── Legend (top-right) ─────────────────────────────────────────
      const legend = g.append('g');
      let legendTotalWidth = 0;
      buckets.forEach((bucket) => {
        legendTotalWidth += bucket.length * 7 + 35;
      });
      let legendX = w - legendTotalWidth;
      buckets.forEach((bucket) => {
        const color = PAR_COLORS[bucket] ?? '#64b5f6';
        const lg = legend
          .append('g')
          .attr('transform', `translate(${legendX}, -8)`);
        lg.append('line')
          .attr('x1', 0)
          .attr('y1', 5)
          .attr('x2', 16)
          .attr('y2', 5)
          .attr('stroke', color)
          .attr('stroke-width', 2.5);
        lg.append('circle')
          .attr('cx', 8)
          .attr('cy', 5)
          .attr('r', 3)
          .attr('fill', color);
        lg.append('text')
          .attr('x', 20)
          .attr('y', 9)
          .attr('fill', d3Tokens.textMuted)
          .attr('font-size', '10px')
          .text(bucket);
        legendX += bucket.length * 7 + 35;
      });

      // ── Tooltip crosshair ──────────────────────────────────────────
      const crosshair = g
        .append('line')
        .attr('y1', 0)
        .attr('y2', h)
        .attr('stroke', d3Tokens.textMuted)
        .attr('stroke-width', 1)
        .attr('stroke-dasharray', '4 3')
        .style('opacity', 0)
        .style('pointer-events', 'none');

      const tooltipId = tooltipIdRef.current;

      // Build period lookup for tooltip data
      const periodMap = new Map<string, CorporatePARTrendRow[]>();
      data.forEach((d) => {
        if (!periodMap.has(d.period)) periodMap.set(d.period, []);
        periodMap.get(d.period)!.push(d);
      });

      // Overlay rects for each period
      const bandWidth = periods.length > 1 ? w / (periods.length - 1) : w;
      g.selectAll('.overlay-rect')
        .data(periods)
        .join('rect')
        .attr('class', 'overlay-rect')
        .attr('x', (p) => (x(p) ?? 0) - bandWidth / 2)
        .attr('y', 0)
        .attr('width', bandWidth)
        .attr('height', h)
        .attr('fill', 'transparent')
        .attr('cursor', 'crosshair')
        .on('mouseenter', function (_event, p) {
          const px = x(p)!;
          crosshair.attr('x1', px).attr('x2', px).style('opacity', 1);

          // Remove any existing tooltip
          d3.select(`#${tooltipId}`).remove();

          const rows = periodMap.get(p) ?? [];
          // Sort rows by BUCKET_ORDER
          rows.sort(
            (a, b) =>
              BUCKET_ORDER.indexOf(a.dpdBucket) -
              BUCKET_ORDER.indexOf(b.dpdBucket),
          );

          const tableRows = rows
            .map(
              (r) =>
                `<div style="display:flex;justify-content:space-between;gap:12px;">` +
                `<span style="color:${PAR_COLORS[r.dpdBucket] ?? d3Tokens.tooltipText}">${r.dpdBucket}</span>` +
                `<span style="font-family:'IBM Plex Mono',monospace">${(r.parRate * 100).toFixed(1)}%</span>` +
                `</div>`,
            )
            .join('');

          const tooltip = d3
            .select('body')
            .append('div')
            .attr('id', tooltipId)
            .style('position', 'absolute')
            .style('pointer-events', 'none')
            .style('background', d3Tokens.tooltipBg)
            .style('border', `1px solid ${d3Tokens.tooltipBorder}`)
            .style('border-radius', '6px')
            .style('padding', '8px 12px')
            .style('font-size', '11px')
            .style('color', d3Tokens.tooltipText)
            .style('box-shadow', '0 4px 12px rgba(0,0,0,0.25)')
            .style('z-index', '9999')
            .style('white-space', 'nowrap')
            .html(
              `<div style="font-weight:600;margin-bottom:4px">${p}</div>` +
              `<div style="border-top:1px solid ${d3Tokens.tooltipBorder};margin-bottom:4px"></div>` +
              tableRows,
            );

          // Position the tooltip
          const svgRect = svg.node()!.getBoundingClientRect();
          const tx = svgRect.left + margin.left + px + 14;
          const ty = svgRect.top + margin.top + 20;
          tooltip.style('left', `${tx}px`).style('top', `${ty}px`);
        })
        .on('mousemove', function (event, p) {
          const tooltip = d3.select(`#${tooltipId}`);
          if (!tooltip.empty()) {
            const svgRect = svg.node()!.getBoundingClientRect();
            const px = x(p)!;
            let tx = svgRect.left + margin.left + px + 14;
            const ty = svgRect.top + margin.top + 20;
            // Flip tooltip to the left if too close to right edge
            const tooltipNode = tooltip.node() as HTMLElement;
            if (tooltipNode && tx + tooltipNode.offsetWidth > window.innerWidth - 20) {
              tx = svgRect.left + margin.left + px - tooltipNode.offsetWidth - 14;
            }
            tooltip.style('left', `${tx}px`).style('top', `${ty}px`);
          }
        })
        .on('mouseleave', function () {
          crosshair.style('opacity', 0);
          d3.select(`#${tooltipId}`).remove();
        });

    },
    [data, d3Tokens],
  );

  return (
    <ChartContainer
      title="Portfolio at Risk (PAR) Trend"
      subtitle="DPD rates by bucket over time"
      empty={!data.length}
    >
      <svg ref={ref} width="100%" height="100%" style={{ overflow: 'visible' }} />
    </ChartContainer>
  );
}
