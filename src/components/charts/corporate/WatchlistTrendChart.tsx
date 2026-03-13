'use client';

import { useMemo } from 'react';
import * as d3 from 'd3';
import { useD3Chart } from '@/hooks/useD3Chart';
import { useThemeMode } from '@/lib/theme-context';
import { ChartContainer } from '@/components/charts/ChartContainer';
import { sortPeriodsChronologically } from '@/lib/format';
import type { WatchlistTrendRow } from '@/lib/types';

interface Props {
  data: WatchlistTrendRow[];
}

const STATUS_KEYS = ['activeCount', 'escalatedCount', 'monitoringCount', 'reviewPendingCount'] as const;
const STATUS_LABELS: Record<string, string> = {
  activeCount: 'Active Watch',
  escalatedCount: 'Escalated',
  monitoringCount: 'Monitoring',
  reviewPendingCount: 'Review Pending',
};
const STATUS_COLORS: Record<string, string> = {
  activeCount: '#ff9800',
  escalatedCount: '#f44336',
  monitoringCount: '#42a5f5',
  reviewPendingCount: '#78909c',
};

const TOTAL_COLOR = '#1976d2';

const TOOLTIP_CLASS = 'watchlist-trend-tooltip';

interface BarSegment {
  period: string;
  statusKey: (typeof STATUS_KEYS)[number];
  count: number;
  /** Cumulative bottom (sum of statuses below) */
  y0: number;
  /** Cumulative top (y0 + count) */
  y1: number;
}

interface PeriodSummary {
  period: string;
  totalCount: number;
  statuses: Record<string, number>;
}

export function WatchlistTrendChart({ data }: Props) {
  const { d3Tokens } = useThemeMode();

  const { barData, periodSummaries, periods } = useMemo(() => {
    if (!data.length)
      return {
        barData: [] as BarSegment[],
        periodSummaries: [] as PeriodSummary[],
        periods: [] as string[],
      };

    const allPeriods = sortPeriodsChronologically(
      Array.from(new Set(data.map((d) => d.period))),
    );

    const summaries: PeriodSummary[] = [];
    const segments: BarSegment[] = [];

    allPeriods.forEach((period) => {
      const row = data.find((d) => d.period === period);
      if (!row) return;

      const statuses: Record<string, number> = {};
      let cumulative = 0;

      STATUS_KEYS.forEach((key) => {
        const count = row[key];
        statuses[key] = count;

        segments.push({
          period,
          statusKey: key,
          count,
          y0: cumulative,
          y1: cumulative + count,
        });

        cumulative += count;
      });

      summaries.push({ period, totalCount: row.totalCount, statuses });
    });

    return { barData: segments, periodSummaries: summaries, periods: allPeriods };
  }, [data]);

  const ref = useD3Chart(
    (svg, width, height) => {
      // Clean up stale tooltips
      d3.selectAll(`.${TOOLTIP_CLASS}`).remove();

      const margin = { top: 36, right: 30, bottom: 60, left: 50 };
      const w = width - margin.left - margin.right;
      const h = height - margin.top - margin.bottom;
      const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

      if (!barData.length || !periods.length) return;

      // ── Scales ──────────────────────────────────────────────────────
      const x = d3.scaleBand().domain(periods).range([0, w]).padding(0.3);

      const maxTotal = d3.max(periodSummaries, (s) => s.totalCount) ?? 1;
      const y = d3.scaleLinear().domain([0, maxTotal * 1.25]).nice().range([h, 0]);

      // ── Grid lines ────────────────────────────────────────────────
      g.append('g')
        .call(
          d3.axisLeft(y)
            .ticks(6)
            .tickSize(-w)
            .tickFormat((d) => `${Math.round(d as number)}`),
        )
        .selectAll('text')
        .attr('fill', d3Tokens.textMuted)
        .attr('font-size', '10px')
        .attr('font-family', 'IBM Plex Mono, monospace');

      g.selectAll('.domain').remove();
      g.selectAll('.tick line').attr('stroke', d3Tokens.gridLine);

      // ── Legend (top of chart area) ──────────────────────────────────
      const legendItems = [...STATUS_KEYS, 'Total'] as const;
      const legend = g.append('g').attr('transform', 'translate(0, -20)');
      let legendX = 0;
      legendItems.forEach((item) => {
        const isTotal = item === 'Total';
        const color = isTotal ? TOTAL_COLOR : STATUS_COLORS[item] ?? '#64b5f6';
        const label = isTotal ? 'Total' : STATUS_LABELS[item] ?? item;
        const lg = legend.append('g').attr('transform', `translate(${legendX}, 0)`);

        if (isTotal) {
          // Dashed line for total trend
          lg.append('line')
            .attr('x1', 0).attr('y1', 5).attr('x2', 16).attr('y2', 5)
            .attr('stroke', color)
            .attr('stroke-width', 2.5)
            .attr('stroke-dasharray', '4,2');
          lg.append('circle')
            .attr('cx', 8).attr('cy', 5).attr('r', 3)
            .attr('fill', color);
        } else {
          // Colored rectangle for bar
          lg.append('rect')
            .attr('x', 0).attr('y', 0).attr('width', 14).attr('height', 10)
            .attr('rx', 2)
            .attr('fill', color)
            .attr('opacity', 0.85);
        }

        lg.append('text')
          .attr('x', isTotal ? 20 : 18)
          .attr('y', 9)
          .attr('fill', d3Tokens.textMuted)
          .attr('font-size', '10px')
          .text(label);

        legendX += label.length * 7 + 32;
      });

      // ── Tooltip (body-appended) ──────────────────────────────────
      const tooltip = d3.select('body').append('div')
        .attr('class', TOOLTIP_CLASS)
        .style('position', 'absolute')
        .style('pointer-events', 'none')
        .style('opacity', '0')
        .style('background', d3Tokens.tooltipBg)
        .style('border', `1px solid ${d3Tokens.tooltipBorder}`)
        .style('border-radius', '6px')
        .style('padding', '8px 12px')
        .style('font-size', '12px')
        .style('color', d3Tokens.tooltipText)
        .style('box-shadow', '0 2px 8px rgba(0,0,0,0.15)')
        .style('z-index', '9999')
        .style('white-space', 'nowrap')
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

      function showTooltip(event: MouseEvent, period: string, highlightKey?: string) {
        const summary = periodSummaries.find((s) => s.period === period);
        if (!summary) return;

        let rows = '';
        STATUS_KEYS.forEach((key) => {
          const count = summary.statuses[key] ?? 0;
          const sColor = STATUS_COLORS[key];
          const label = STATUS_LABELS[key];
          const bold = key === highlightKey ? 'font-weight:800;' : '';
          rows += `<div style="${bold}"><span style="color:${mutedColor}">${label}:</span> <b style="color:${sColor}">${count}</b></div>`;
        });
        rows += `<div style="border-top:1px solid ${d3Tokens.tooltipBorder};margin-top:4px;padding-top:4px;font-weight:700"><span style="color:${mutedColor}">Total:</span> <b style="color:${TOTAL_COLOR}">${summary.totalCount}</b></div>`;

        tooltip.html(
          `<div style="font-weight:700;font-size:12px;margin-bottom:4px">${period}</div>` +
          `<div style="border-top:1px solid ${d3Tokens.tooltipBorder};margin-bottom:4px"></div>` +
          rows,
        ).style('opacity', '1');

        positionTooltip(event);
      }

      // ── Draw stacked bars ─────────────────────────────────────────
      const barWidth = x.bandwidth();

      barData.forEach((seg) => {
        const xPos = x(seg.period);
        if (xPos == null) return;
        const color = STATUS_COLORS[seg.statusKey] ?? '#64b5f6';

        // Round top corners only on the topmost segment (reviewPendingCount)
        const isTopSegment = seg.statusKey === 'reviewPendingCount';

        g.append('rect')
          .attr('x', xPos)
          .attr('y', y(seg.y1))
          .attr('width', barWidth)
          .attr('height', Math.max(0, y(seg.y0) - y(seg.y1)))
          .attr('fill', color)
          .attr('opacity', 0.85)
          .attr('rx', isTopSegment ? 3 : 0)
          .style('cursor', 'pointer')
          .on('mouseover', function (event) {
            d3.select(this).attr('opacity', 1);
            showTooltip(event as unknown as MouseEvent, seg.period, seg.statusKey);
          })
          .on('mousemove', function (event) {
            positionTooltip(event as unknown as MouseEvent);
          })
          .on('mouseout', function () {
            d3.select(this).attr('opacity', 0.85);
            tooltip.style('opacity', '0');
          });
      });

      // ── Total count trend line overlay ──────────────────────────────
      const lineGen = d3
        .line<PeriodSummary>()
        .x((d) => (x(d.period) ?? 0) + barWidth / 2)
        .y((d) => y(d.totalCount))
        .curve(d3.curveMonotoneX);

      g.append('path')
        .datum(periodSummaries)
        .attr('fill', 'none')
        .attr('stroke', TOTAL_COLOR)
        .attr('stroke-width', 2.5)
        .attr('stroke-dasharray', '6,3')
        .attr('d', lineGen);

      // Total count dots
      g.selectAll('.dot-total-count')
        .data(periodSummaries)
        .join('circle')
        .attr('class', 'dot-total-count')
        .attr('cx', (d) => (x(d.period) ?? 0) + barWidth / 2)
        .attr('cy', (d) => y(d.totalCount))
        .attr('r', 4)
        .attr('fill', TOTAL_COLOR)
        .attr('stroke', d3Tokens.bg)
        .attr('stroke-width', 2)
        .style('cursor', 'pointer')
        .style('transition', 'r 150ms ease')
        .on('mouseover', function (event, d) {
          d3.select(this).attr('r', 6);
          showTooltip(event as unknown as MouseEvent, d.period);
        })
        .on('mousemove', function (event) {
          positionTooltip(event as unknown as MouseEvent);
        })
        .on('mouseout', function () {
          d3.select(this).attr('r', 4);
          tooltip.style('opacity', '0');
        });

      // ── Total count value labels above bars ─────────────────────────
      periodSummaries.forEach((s) => {
        const xPos = x(s.period);
        if (xPos == null) return;
        g.append('text')
          .attr('x', xPos + barWidth / 2)
          .attr('y', y(s.totalCount) - 8)
          .attr('text-anchor', 'middle')
          .attr('fill', TOTAL_COLOR)
          .attr('font-size', '9px')
          .attr('font-weight', 700)
          .attr('font-family', 'IBM Plex Mono, monospace')
          .text(s.totalCount);
      });

      // ── X-axis ──────────────────────────────────────────────────
      g.append('g')
        .attr('transform', `translate(0,${h})`)
        .call(
          d3.axisBottom(x)
            .tickSize(0)
            .tickFormat((p) => p),
        )
        .selectAll('text')
        .attr('fill', d3Tokens.text)
        .attr('font-size', '10px')
        .attr('text-anchor', 'end')
        .attr('transform', 'rotate(-35)')
        .attr('dx', '-0.5em')
        .attr('dy', '0.5em');

      g.selectAll('.domain').attr('stroke', d3Tokens.axisDomain);
    },
    [barData, periodSummaries, periods, d3Tokens],
  );

  return (
    <ChartContainer
      title="Watchlist Trend"
      subtitle="Monthly watchlist count by status (last 6 months)"
      empty={!data.length}
    >
      <svg ref={ref} width="100%" height="100%" style={{ overflow: 'visible', minHeight: 360 }} />
    </ChartContainer>
  );
}
