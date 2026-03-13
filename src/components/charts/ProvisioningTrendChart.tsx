'use client';

import { useMemo } from 'react';
import * as d3 from 'd3';
import { useD3Chart } from '@/hooks/useD3Chart';
import { useThemeMode } from '@/lib/theme-context';
import { ChartContainer } from '@/components/charts/ChartContainer';
import { sortPeriodsChronologically } from '@/lib/format';
import type { CorporateProvisioningRow } from '@/lib/types';

interface Props {
  data: CorporateProvisioningRow[];
}

const STAGE_COLORS: Record<string, string> = {
  'Stage 1': '#4caf50',
  'Stage 2': '#ff9800',
  'Stage 3': '#f44336',
  'Total CC': '#1976d2',
};

const STACK_STAGES = ['Stage 1', 'Stage 2', 'Stage 3'] as const;

const TOOLTIP_CLASS = 'provisioning-trend-tooltip';

/** Abbreviation suffix for period type labels on the X-axis. */
function periodTypeSuffix(pt: 'Actual' | 'Estimated' | 'Projected'): string {
  if (pt === 'Actual') return '(A)';
  if (pt === 'Estimated') return '(E)';
  return '(P)';
}

/** Opacity for period type bars. */
function opacityForType(pt: 'Actual' | 'Estimated' | 'Projected'): number {
  if (pt === 'Actual') return 1.0;
  if (pt === 'Estimated') return 0.75;
  return 0.55;
}

interface BarSegment {
  period: string;
  periodType: 'Actual' | 'Estimated' | 'Projected';
  stage: string;
  /** This stage's contribution to total CC: stage_provision / total_gross × 100 */
  contributionPct: number;
  /** Cumulative bottom (sum of stages below) */
  y0: number;
  /** Cumulative top (y0 + contributionPct) */
  y1: number;
}

interface PeriodSummary {
  period: string;
  periodType: 'Actual' | 'Estimated' | 'Projected';
  totalCCPct: number;
  stages: Record<string, { contributionPct: number }>;
}

export function ProvisioningTrendChart({ data }: Props) {
  const { d3Tokens } = useThemeMode();

  const { barData, periodSummaries, periods, periodTypeMap } = useMemo(() => {
    if (!data.length)
      return {
        barData: [] as BarSegment[],
        periodSummaries: [] as PeriodSummary[],
        periods: [] as string[],
        periodTypeMap: new Map<string, 'Actual' | 'Estimated' | 'Projected'>(),
      };

    const allPeriods = sortPeriodsChronologically(
      Array.from(new Set(data.map((d) => d.period))),
    );

    // Map period -> periodType
    const ptMap = new Map<string, 'Actual' | 'Estimated' | 'Projected'>();
    data.forEach((d) => {
      if (!ptMap.has(d.period)) ptMap.set(d.period, d.periodType);
    });

    const summaries: PeriodSummary[] = [];
    const segments: BarSegment[] = [];

    allPeriods.forEach((period) => {
      const periodRows = data.filter((d) => d.period === period);
      if (periodRows.length === 0) return;

      const totalProvision = d3.sum(periodRows, (d) => d.provisionAmount);
      const totalGross = d3.sum(periodRows, (d) => d.grossExposure);
      const totalCCPct = totalGross > 0 ? (totalProvision / totalGross) * 100 : 0;
      const pt = ptMap.get(period) ?? 'Actual';

      const stageInfo: Record<string, { contributionPct: number }> = {};
      let cumulative = 0;

      STACK_STAGES.forEach((stage) => {
        const stageRows = periodRows.filter((r) => r.ifrsStage === stage);
        const stageProv = d3.sum(stageRows, (r) => r.provisionAmount);

        // Credit cost = stage_provision / total_gross (contribution to total CC)
        // Stage 1 CC + Stage 2 CC + Stage 3 CC = Total CC
        const contributionPct = totalGross > 0 ? (stageProv / totalGross) * 100 : 0;

        stageInfo[stage] = { contributionPct };

        segments.push({
          period,
          periodType: pt,
          stage,
          contributionPct,
          y0: cumulative,
          y1: cumulative + contributionPct,
        });

        cumulative += contributionPct;
      });

      summaries.push({ period, periodType: pt, totalCCPct, stages: stageInfo });
    });

    return { barData: segments, periodSummaries: summaries, periods: allPeriods, periodTypeMap: ptMap };
  }, [data]);

  const ref = useD3Chart(
    (svg, width, height) => {
      // Clean up stale tooltips
      d3.selectAll(`.${TOOLTIP_CLASS}`).remove();

      const margin = { top: 36, right: 30, bottom: 60, left: 60 };
      const w = width - margin.left - margin.right;
      const h = height - margin.top - margin.bottom;
      const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

      if (!barData.length || !periods.length) return;

      // ── Scales ──────────────────────────────────────────────────────
      const x = d3.scaleBand().domain(periods).range([0, w]).padding(0.3);

      const maxTotal = d3.max(periodSummaries, (s) => s.totalCCPct) ?? 1;
      const y = d3.scaleLinear().domain([0, maxTotal * 1.25]).nice().range([h, 0]);

      // ── Grid lines ────────────────────────────────────────────────
      g.append('g')
        .call(
          d3.axisLeft(y)
            .ticks(6)
            .tickSize(-w)
            .tickFormat((d) => `${(d as number).toFixed(2)}%`),
        )
        .selectAll('text')
        .attr('fill', d3Tokens.textMuted)
        .attr('font-size', '10px')
        .attr('font-family', 'IBM Plex Mono, monospace');

      g.selectAll('.domain').remove();
      g.selectAll('.tick line').attr('stroke', d3Tokens.gridLine);

      // ── Legend (top of chart area) ──────────────────────────────────
      const legendItems = [...STACK_STAGES, 'Total CC'] as const;
      const legend = g.append('g').attr('transform', 'translate(0, -20)');
      let legendX = 0;
      legendItems.forEach((item) => {
        const color = STAGE_COLORS[item] ?? '#64b5f6';
        const isTotal = item === 'Total CC';
        const lg = legend.append('g').attr('transform', `translate(${legendX}, 0)`);

        if (isTotal) {
          // Dashed line for total CC trend
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
          .text(item);

        legendX += item.length * 7 + 32;
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

      function showTooltip(event: MouseEvent, period: string, highlightStage?: string) {
        const summary = periodSummaries.find((s) => s.period === period);
        if (!summary) return;

        const pt = summary.periodType;
        const ptBadge =
          pt === 'Estimated'
            ? '<span style="color:#ff9800;font-weight:700">(E)</span>'
            : pt === 'Projected'
              ? '<span style="color:#2196f3;font-weight:700">(P)</span>'
              : '<span style="font-weight:700">(A)</span>';

        let rows = '';
        STACK_STAGES.forEach((stage) => {
          const info = summary.stages[stage];
          if (!info) return;
          const sColor = STAGE_COLORS[stage];
          const bold = stage === highlightStage ? 'font-weight:800;' : '';
          rows += `<div style="${bold}"><span style="color:${mutedColor}">${stage}:</span> <b style="color:${sColor}">${info.contributionPct.toFixed(2)}%</b></div>`;
        });
        rows += `<div style="border-top:1px solid ${d3Tokens.tooltipBorder};margin-top:4px;padding-top:4px;font-weight:700"><span style="color:${mutedColor}">Total CC:</span> <b style="color:${STAGE_COLORS['Total CC']}">${summary.totalCCPct.toFixed(2)}%</b></div>`;

        tooltip.html(
          `<div style="font-weight:700;font-size:12px;margin-bottom:4px">${period} ${ptBadge}</div>` +
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
        const opacity = opacityForType(seg.periodType);
        const color = STAGE_COLORS[seg.stage] ?? '#64b5f6';

        g.append('rect')
          .attr('x', xPos)
          .attr('y', y(seg.y1))
          .attr('width', barWidth)
          .attr('height', Math.max(0, y(seg.y0) - y(seg.y1)))
          .attr('fill', color)
          .attr('opacity', opacity)
          .attr('rx', seg.stage === 'Stage 3' ? 3 : 0) // round top corners on top segment
          .style('cursor', 'pointer')
          .on('mouseover', function (event) {
            d3.select(this).attr('opacity', Math.min(1, opacity + 0.15));
            showTooltip(event as unknown as MouseEvent, seg.period, seg.stage);
          })
          .on('mousemove', function (event) {
            positionTooltip(event as unknown as MouseEvent);
          })
          .on('mouseout', function () {
            d3.select(this).attr('opacity', opacity);
            tooltip.style('opacity', '0');
          });
      });

      // ── Period type indicator stripe below bars ─────────────────────
      const TYPE_STRIPE_COLORS: Record<string, string> = {
        Actual: '#9e9e9e',
        Estimated: '#ff9800',
        Projected: '#2196f3',
      };

      periods.forEach((period) => {
        const xPos = x(period);
        if (xPos == null) return;
        const pt = periodTypeMap.get(period) ?? 'Actual';
        g.append('rect')
          .attr('x', xPos)
          .attr('y', h + 2)
          .attr('width', barWidth)
          .attr('height', 3)
          .attr('rx', 1.5)
          .attr('fill', TYPE_STRIPE_COLORS[pt] ?? '#9e9e9e')
          .attr('opacity', 0.6);
      });

      // ── Total CC trend line overlay ──────────────────────────────
      const lineGen = d3
        .line<PeriodSummary>()
        .x((d) => (x(d.period) ?? 0) + barWidth / 2)
        .y((d) => y(d.totalCCPct))
        .curve(d3.curveMonotoneX);

      g.append('path')
        .datum(periodSummaries)
        .attr('fill', 'none')
        .attr('stroke', STAGE_COLORS['Total CC'])
        .attr('stroke-width', 2.5)
        .attr('stroke-dasharray', '6,3')
        .attr('d', lineGen);

      // Total CC dots
      g.selectAll('.dot-total-cc')
        .data(periodSummaries)
        .join('circle')
        .attr('class', 'dot-total-cc')
        .attr('cx', (d) => (x(d.period) ?? 0) + barWidth / 2)
        .attr('cy', (d) => y(d.totalCCPct))
        .attr('r', 4)
        .attr('fill', STAGE_COLORS['Total CC'])
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

      // ── Total CC value labels above bars ─────────────────────────
      periodSummaries.forEach((s) => {
        const xPos = x(s.period);
        if (xPos == null) return;
        g.append('text')
          .attr('x', xPos + barWidth / 2)
          .attr('y', y(s.totalCCPct) - 8)
          .attr('text-anchor', 'middle')
          .attr('fill', STAGE_COLORS['Total CC'])
          .attr('font-size', '9px')
          .attr('font-weight', 700)
          .attr('font-family', 'IBM Plex Mono, monospace')
          .text(`${s.totalCCPct.toFixed(2)}%`);
      });

      // ── X-axis ──────────────────────────────────────────────────
      g.append('g')
        .attr('transform', `translate(0,${h})`)
        .call(
          d3.axisBottom(x)
            .tickSize(0)
            .tickFormat((p) => {
              const pt = periodTypeMap.get(p);
              const suffix = pt ? ` ${periodTypeSuffix(pt)}` : '';
              return `${p}${suffix}`;
            }),
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
    [barData, periodSummaries, periods, periodTypeMap, d3Tokens],
  );

  return (
    <ChartContainer
      title="Credit Cost Trend"
      subtitle="Stacked credit cost by IFRS stage (Actual \u2192 Estimated \u2192 Projected)"
      empty={!data.length}
    >
      <svg ref={ref} width="100%" height="100%" style={{ overflow: 'visible', minHeight: 360 }} />
    </ChartContainer>
  );
}
